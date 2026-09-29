"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { cancelOrder, markOrderPaid } from "@/lib/orders";
import type { OrderStatus } from "@/generated/prisma/enums";

function refresh(orderId: string) {
  revalidatePath(`/admin/pedidos/${orderId}`);
  revalidatePath("/admin/pedidos");
  revalidatePath(`/pedido/${orderId}`);
}

/** Aprueba un pago manual (Yape/Plin/transferencia/contra entrega) y marca el pedido como pagado. */
export async function approvePayment(orderId: string, paymentId: string | null) {
  await requireAdmin();
  const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
  if (order.status === "CANCELLED") throw new Error("El pedido está cancelado");

  await db.$transaction(async (tx) => {
    if (paymentId) {
      await tx.payment.update({ where: { id: paymentId, orderId }, data: { status: "APPROVED" } });
    } else {
      await tx.payment.create({ data: { orderId, method: order.paymentMethod, status: "APPROVED", amount: order.total } });
    }
    await markOrderPaid(orderId, tx);
  });
  refresh(orderId);
}

/** Rechaza un reporte de pago: el cliente podrá volver a reportarlo. */
export async function rejectPayment(orderId: string, paymentId: string) {
  await requireAdmin();
  await db.$transaction([
    db.payment.update({ where: { id: paymentId, orderId }, data: { status: "REJECTED" } }),
    db.order.updateMany({ where: { id: orderId, paymentStatus: { not: "APPROVED" } }, data: { paymentStatus: "PENDING" } }),
  ]);
  refresh(orderId);
}

const FLOW: OrderStatus[] = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"];

export async function setOrderStatus(orderId: string, status: OrderStatus) {
  await requireAdmin();
  if (status === "CANCELLED") {
    await cancelOrder(orderId);
  } else if (FLOW.includes(status)) {
    const order = await db.order.findUniqueOrThrow({ where: { id: orderId } });
    // Contra entrega puede despacharse sin pago previo; el resto exige pago aprobado.
    if (order.paymentStatus !== "APPROVED" && order.paymentMethod !== "CASH_ON_DELIVERY") {
      throw new Error("Primero aprueba el pago");
    }
    await db.order.update({ where: { id: orderId }, data: { status } });
  }
  refresh(orderId);
}

export async function saveAdminNotes(orderId: string, formData: FormData) {
  await requireAdmin();
  await db.order.update({
    where: { id: orderId },
    data: { adminNotes: String(formData.get("adminNotes") ?? "").slice(0, 5000) || null },
  });
  refresh(orderId);
}
