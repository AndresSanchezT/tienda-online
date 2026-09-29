"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/lib/db";
import { createCheckoutUrl, createDirectPayment, rejectionMessage } from "@/lib/payments/mercadopago";
import { getSettings } from "@/lib/settings";
import { saveImage, UploadError } from "@/lib/uploads";
import { MercadoPagoError } from "mercadopago";

const identification = z.object({ type: z.string().max(20), number: z.string().max(30) }).optional();

const directPaymentSchema = z.discriminatedUnion("kind", [
  z.object({
    kind: z.literal("card"),
    token: z.string().min(8).max(200),
    paymentMethodId: z.string().min(2).max(40),
    issuerId: z.union([z.string(), z.number()]).optional().transform((v) => (v == null ? undefined : String(v))),
    installments: z.number().int().min(1).max(36),
    payerEmail: z.email(),
    identification,
  }),
  z.object({
    kind: z.literal("yape"),
    token: z.string().min(8).max(200),
    payerEmail: z.email(),
  }),
  z.object({
    kind: z.literal("offline"),
    paymentMethodId: z.string().min(2).max(40),
    payerEmail: z.email(),
    firstName: z.string().max(80).optional(),
    lastName: z.string().max(80).optional(),
    identification,
  }),
]);

export type PayResult =
  | { ok: true; status: "APPROVED" | "PENDING" | "AWAITING_VERIFICATION"; ticketUrl?: string }
  | { ok: false; message: string };

/** Cobra el pedido con el token que generó el formulario integrado de Mercado Pago (tarjeta, Yape o PagoEfectivo). */
export async function payWithMercadoPago(orderId: string, raw: unknown): Promise<PayResult> {
  const parsed = directPaymentSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, message: "Datos de pago incompletos. Revisa el formulario." };

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.paymentMethod !== "MERCADOPAGO") return { ok: false, message: "Pedido no válido." };
  if (order.paymentStatus === "APPROVED") return { ok: true, status: "APPROVED" };
  if (order.status !== "PENDING") return { ok: false, message: "Este pedido ya no admite pagos." };

  const settings = await getSettings();
  try {
    const result = await createDirectPayment(orderId, parsed.data, settings.storeName);
    revalidatePath(`/pedido/${orderId}`);
    if (result.status === "REJECTED") return { ok: false, message: rejectionMessage(result.statusDetail) };
    if (result.status === "REFUNDED") return { ok: false, message: "El pago no pudo completarse." };
    return { ok: true, status: result.status, ticketUrl: result.ticketUrl };
  } catch (err) {
    console.error("[pago MP]", orderId, parsed.data.kind, err instanceof MercadoPagoError ? err.message : err);
    return {
      ok: false,
      message:
        parsed.data.kind === "yape"
          ? "No pudimos cobrar con Yape en este momento. Genera un nuevo código o paga con tarjeta u otro medio."
          : "No pudimos procesar el pago en este momento. Inténtalo nuevamente.",
    };
  }
}

const MANUAL_METHODS = ["YAPE", "PLIN", "BANK_TRANSFER"] as const;

export type ReportState = { error?: string; ok?: boolean };

/** El cliente reporta su pago manual (Yape / Plin / transferencia) con Nº de operación y voucher. */
export async function reportPayment(orderId: string, _prev: ReportState, formData: FormData): Promise<ReportState> {
  const operationNumber = String(formData.get("operationNumber") ?? "").trim().slice(0, 40);
  const receipt = formData.get("receipt");

  if (!/^[\w-]{4,40}$/.test(operationNumber)) return { error: "Ingresa un número de operación válido." };

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING") return { error: "Este pedido ya no admite reportes de pago." };
  if (!(MANUAL_METHODS as readonly string[]).includes(order.paymentMethod)) return { error: "Medio de pago no válido." };
  if (order.paymentStatus === "APPROVED") return { error: "Este pedido ya está pagado." };

  let receiptImage: string | undefined;
  if (receipt instanceof File && receipt.size > 0) {
    try {
      receiptImage = await saveImage(receipt, "receipts");
    } catch (e) {
      return { error: e instanceof UploadError ? e.message : "No se pudo subir la imagen." };
    }
  }

  await db.$transaction([
    db.payment.create({
      data: {
        orderId,
        method: order.paymentMethod,
        status: "AWAITING_VERIFICATION",
        amount: order.total,
        operationNumber,
        receiptImage,
      },
    }),
    db.order.update({ where: { id: orderId }, data: { paymentStatus: "AWAITING_VERIFICATION" } }),
  ]);

  revalidatePath(`/pedido/${orderId}`);
  return { ok: true };
}

/** Genera una nueva preferencia de Mercado Pago para un pedido pendiente (reintento de pago). */
export async function retryMercadoPago(orderId: string) {
  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order || order.status !== "PENDING" || order.paymentMethod !== "MERCADOPAGO" || order.paymentStatus === "APPROVED") {
    redirect(`/pedido/${orderId}`);
  }
  const settings = await getSettings();
  let url: string;
  try {
    url = await createCheckoutUrl(orderId, settings.storeName);
  } catch (err) {
    console.error("[pedido] error reintentando MP", err);
    redirect(`/pedido/${orderId}?mp_error=1`);
  }
  redirect(url);
}
