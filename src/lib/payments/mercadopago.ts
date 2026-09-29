import "server-only";
import { randomUUID } from "node:crypto";
import { MercadoPagoConfig, Payment, Preference } from "mercadopago";
import type { PaymentResponse } from "mercadopago/dist/clients/payment/commonTypes";
import { db } from "@/lib/db";
import { markOrderPaid } from "@/lib/orders";
import { appUrl } from "@/lib/utils";
import type { PaymentStatus } from "@/generated/prisma/enums";

// Dos formas de cobrar con Mercado Pago Perú:
//  • EMBEDDED (Checkout API / Bricks): el formulario de tarjeta, Yape y PagoEfectivo se muestra dentro de la tienda.
//    El navegador tokeniza la tarjeta (nunca llega a nuestro servidor) y aquí creamos el pago con ese token.
//  • REDIRECT (Checkout Pro): el cliente paga en la página de Mercado Pago y vuelve.

function client() {
  const accessToken = process.env.MP_ACCESS_TOKEN;
  if (!accessToken) throw new Error("MP_ACCESS_TOKEN no está configurado");
  return new MercadoPagoConfig({ accessToken, options: { timeout: 15_000 } });
}

function loadOrder(orderId: string) {
  return db.order.findUnique({ where: { id: orderId }, include: { items: true } });
}
type OrderWithItems = NonNullable<Awaited<ReturnType<typeof loadOrder>>>;

// Mercado Pago no acepta URLs localhost para notificaciones; en local el estado se consulta al volver.
const isPublicUrl = () => appUrl().startsWith("https://");

function describeOrder(order: OrderWithItems, storeName: string) {
  const first = order.items[0]?.name ?? "Compra";
  const more = order.items.length > 1 ? ` y ${order.items.length - 1} más` : "";
  return `${storeName} - Pedido #${order.number}: ${first}${more}`.slice(0, 250);
}

function additionalInfo(order: OrderWithItems) {
  // Enviar el detalle de la compra mejora la tasa de aprobación (antifraude de MP)
  const [firstName, ...rest] = order.customerName.split(" ");
  return {
    items: order.items.map((i) => ({
      id: i.sku ?? i.id,
      title: i.variantName ? `${i.name} (${i.variantName})` : i.name,
      quantity: i.quantity,
      unit_price: i.unitPrice / 100,
      ...(i.image?.startsWith("http") ? { picture_url: i.image } : {}),
    })),
    payer: {
      first_name: firstName,
      last_name: rest.join(" ") || firstName,
      phone: { number: order.customerPhone },
    },
    ...(order.address
      ? { shipments: { receiver_address: { street_name: order.address, city_name: order.district ?? undefined, state_name: order.department ?? undefined } } }
      : {}),
  };
}

// ───────────────────────── Cobro directo (formulario integrado) ─────────────────────────

export type DirectPaymentInput =
  | {
      kind: "card"; // tarjeta de crédito / débito tokenizada por el Payment Brick
      token: string;
      paymentMethodId: string;
      issuerId?: string;
      installments: number;
      payerEmail: string;
      identification?: { type: string; number: string };
    }
  | {
      kind: "yape"; // token generado con mp.yape({ phoneNumber, otp })
      token: string;
      payerEmail: string;
    }
  | {
      kind: "offline"; // PagoEfectivo / agentes: genera un código para pagar después
      paymentMethodId: string;
      payerEmail: string;
      firstName?: string;
      lastName?: string;
      identification?: { type: string; number: string };
    };

export type DirectPaymentResult = {
  status: PaymentStatus;
  mpStatus: string;
  statusDetail: string;
  ticketUrl?: string;
};

export async function createDirectPayment(orderId: string, input: DirectPaymentInput, storeName: string): Promise<DirectPaymentResult> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error("Pedido no encontrado");

  const base = {
    // El monto SIEMPRE sale del pedido guardado en la BD, nunca del navegador
    transaction_amount: order.total / 100,
    description: describeOrder(order, storeName),
    external_reference: order.id,
    statement_descriptor: storeName.slice(0, 22),
    metadata: { order_number: order.number },
    additional_info: additionalInfo(order),
    ...(isPublicUrl() ? { notification_url: appUrl("/api/webhooks/mercadopago") } : {}),
  };

  const body =
    input.kind === "card"
      ? {
          ...base,
          token: input.token,
          payment_method_id: input.paymentMethodId,
          issuer_id: input.issuerId ? Number(input.issuerId) : undefined,
          installments: input.installments,
          payer: { email: input.payerEmail, identification: input.identification },
        }
      : input.kind === "yape"
        ? {
            ...base,
            token: input.token,
            payment_method_id: "yape",
            installments: 1,
            payer: { email: input.payerEmail },
          }
        : {
            ...base,
            payment_method_id: input.paymentMethodId,
            payer: {
              email: input.payerEmail,
              first_name: input.firstName,
              last_name: input.lastName,
              identification: input.identification,
            },
          };

  const mp = await new Payment(client()).create({
    body,
    requestOptions: { idempotencyKey: randomUUID() },
  });

  const status = await applyMercadoPagoPayment(mp);
  return {
    status: status ?? "PENDING",
    mpStatus: mp.status ?? "unknown",
    statusDetail: mp.status_detail ?? "",
    ticketUrl: ticketUrlOf(mp),
  };
}

function ticketUrlOf(mp: PaymentResponse) {
  return mp.transaction_details?.external_resource_url ?? mp.point_of_interaction?.transaction_data?.ticket_url ?? undefined;
}

// ───────────────────────── Checkout Pro (redirección) ─────────────────────────

/** Crea la preferencia de pago y devuelve la URL a la que se redirige al cliente. */
export async function createCheckoutUrl(orderId: string, storeName: string): Promise<string> {
  const order = await loadOrder(orderId);
  if (!order) throw new Error("Pedido no encontrado");

  const orderUrl = appUrl(`/pedido/${order.id}`);
  const items = order.items.map((i) => ({
    id: i.sku ?? i.id,
    title: i.variantName ? `${i.name} (${i.variantName})` : i.name,
    quantity: i.quantity,
    unit_price: i.unitPrice / 100,
    currency_id: "PEN",
    ...(i.image?.startsWith("http") ? { picture_url: i.image } : {}),
  }));
  if (order.shippingCost > 0) {
    items.push({ id: "envio", title: "Costo de envío", quantity: 1, unit_price: order.shippingCost / 100, currency_id: "PEN" });
  }

  const preference = await new Preference(client()).create({
    body: {
      items,
      payer: {
        name: order.customerName,
        email: order.customerEmail,
        identification: {
          type: order.documentType === "PASAPORTE" ? "Otro" : order.documentType,
          number: order.documentNumber,
        },
      },
      external_reference: order.id,
      back_urls: { success: orderUrl, pending: orderUrl, failure: orderUrl },
      ...(isPublicUrl() ? { auto_return: "approved", notification_url: appUrl("/api/webhooks/mercadopago") } : {}),
      statement_descriptor: storeName.slice(0, 22),
      metadata: { order_number: order.number },
    },
    requestOptions: { idempotencyKey: randomUUID() },
  });

  if (!preference.init_point) throw new Error("Mercado Pago no devolvió la URL de pago");
  return preference.init_point;
}

// ───────────────────────── Sincronización de estado ─────────────────────────

function mapStatus(mpStatus: string | undefined): PaymentStatus {
  switch (mpStatus) {
    case "approved":
      return "APPROVED";
    case "rejected":
    case "cancelled":
      return "REJECTED";
    case "refunded":
    case "charged_back":
      return "REFUNDED";
    default: // pending, in_process, authorized, in_mediation
      return "PENDING";
  }
}

/**
 * Consulta el pago DIRECTAMENTE a la API de Mercado Pago (nunca se confía en los query params)
 * y actualiza el pedido. Lo usan el webhook y la página del pedido al volver de Checkout Pro.
 */
export async function syncMercadoPagoPayment(paymentId: string) {
  const mp = await new Payment(client()).get({ id: paymentId });
  const status = await applyMercadoPagoPayment(mp);
  return status ? { orderId: mp.external_reference, status } : null;
}

/** Guarda el pago y actualiza el pedido. Idempotente: el mismo pago puede llegar varias veces. */
async function applyMercadoPagoPayment(mp: PaymentResponse): Promise<PaymentStatus | null> {
  const orderId = mp.external_reference;
  if (!orderId || !mp.id) return null;

  const order = await db.order.findUnique({ where: { id: orderId } });
  if (!order) return null;

  let status = mapStatus(mp.status);
  const paidCents = Math.round((mp.transaction_amount ?? 0) * 100);
  let note: string | null = null;

  if (status === "APPROVED" && (mp.currency_id !== "PEN" || paidCents < order.total)) {
    // Monto o moneda no coinciden: no se marca como pagado, queda para revisión manual.
    status = "AWAITING_VERIFICATION";
    note = `⚠ Pago MP ${mp.id} aprobado por ${mp.currency_id} ${mp.transaction_amount}, pero el pedido es S/ ${order.total / 100}. Revisar.`;
  }

  const data = {
    status,
    amount: paidCents,
    providerMethod: mp.payment_method_id ?? mp.payment_type_id ?? null,
    raw: {
      id: mp.id,
      status: mp.status ?? null,
      status_detail: mp.status_detail ?? null,
      payment_type_id: mp.payment_type_id ?? null,
      installments: mp.installments ?? null,
      ticket_url: ticketUrlOf(mp) ?? null,
    },
  };

  await db.$transaction(async (tx) => {
    await tx.payment.upsert({
      where: { providerPaymentId: String(mp.id) },
      update: data,
      create: { ...data, orderId, method: "MERCADOPAGO", providerPaymentId: String(mp.id) },
    });

    if (status === "APPROVED") {
      if (order.status === "CANCELLED") {
        note = `⚠ Pago MP ${mp.id} aprobado en un pedido CANCELADO. Reembolsar o reactivar.`;
      } else {
        await markOrderPaid(orderId, tx);
      }
    } else if (order.paymentStatus !== "APPROVED") {
      // Rechazado / pendiente / reembolsado: se refleja en el pedido, que sigue abierto para reintentar.
      await tx.order.update({ where: { id: orderId }, data: { paymentStatus: status } });
    }

    if (note) {
      await tx.order.update({
        where: { id: orderId },
        data: { adminNotes: [order.adminNotes, note].filter(Boolean).join("\n") },
      });
    }
  });

  return status;
}

/** Mensaje entendible para el cliente según el status_detail de Mercado Pago. */
export function rejectionMessage(detail: string): string {
  const messages: Record<string, string> = {
    cc_rejected_bad_filled_card_number: "Revisa el número de la tarjeta.",
    cc_rejected_bad_filled_date: "Revisa la fecha de vencimiento.",
    cc_rejected_bad_filled_security_code: "Revisa el código de seguridad (CVV).",
    cc_rejected_bad_filled_other: "Revisa los datos de la tarjeta.",
    cc_rejected_blacklist: "No pudimos procesar tu pago. Usa otro medio de pago.",
    cc_rejected_call_for_authorize: "Debes autorizar el pago con tu banco o app de Yape e intentar de nuevo.",
    cc_rejected_card_disabled: "Tu tarjeta está inactiva. Llama a tu banco para activarla.",
    cc_rejected_duplicated_payment: "Ya hiciste un pago por este monto. Si necesitas volver a pagar, usa otro medio.",
    cc_rejected_high_risk: "Tu pago fue rechazado por seguridad. Usa otro medio de pago.",
    cc_rejected_insufficient_amount: "Fondos insuficientes.",
    cc_rejected_max_attempts: "Llegaste al límite de intentos. Usa otro medio de pago.",
    cc_rejected_card_type_not_allowed: "Este tipo de tarjeta o cuenta no está permitido. Usa otro medio.",
    cc_amount_rate_limit_exceeded: "Superaste el límite de monto de tu Yape. Usa otro medio de pago.",
    cc_unsupported_unsupported: "Tu Yape no admite este pago. Usa otro medio.",
    cc_rejected_form_error: "Hubo un error en los datos. Inténtalo de nuevo.",
    cc_rejected_other_reason: "Tu banco rechazó el pago. Usa otra tarjeta o medio de pago.",
  };
  return messages[detail] ?? "El pago fue rechazado. Inténtalo de nuevo o usa otro medio de pago.";
}
