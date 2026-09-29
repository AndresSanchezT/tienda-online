import "server-only";
import { db } from "@/lib/db";
import { shippingCostFor, type Settings } from "@/lib/settings";
import type { CheckoutInput } from "@/lib/validators";
import type { Prisma } from "@/generated/prisma/client";

export class OrderError extends Error {}

type Tx = Prisma.TransactionClient;

/**
 * Crea el pedido recalculando TODOS los precios desde la BD (nunca se confía en el precio del navegador)
 * y descuenta el stock de forma atómica: si dos clientes compran la última unidad a la vez, solo uno gana.
 */
export async function createOrder(input: CheckoutInput, settings: Settings) {
  return db.$transaction(async (tx) => {
    const productIds = [...new Set(input.items.map((i) => i.productId))];
    const products = await tx.product.findMany({
      where: { id: { in: productIds }, active: true },
      include: { variants: { where: { active: true } } },
    });

    const lines: Prisma.OrderItemCreateWithoutOrderInput[] = [];
    let subtotal = 0;

    for (const item of input.items) {
      const product = products.find((p) => p.id === item.productId);
      if (!product) throw new OrderError("Uno de los productos ya no está disponible.");

      const hasVariants = product.variants.length > 0;
      const variant = item.variantId ? product.variants.find((v) => v.id === item.variantId) : undefined;
      if (hasVariants && !variant) throw new OrderError(`Elige una opción válida para "${product.name}".`);

      const unitPrice = variant?.price ?? product.price;
      const title = variant ? `${product.name} (${variant.name})` : product.name;

      await decrementStock(tx, product.id, variant?.id, item.quantity, title);

      subtotal += unitPrice * item.quantity;
      lines.push({
        product: { connect: { id: product.id } },
        ...(variant ? { variant: { connect: { id: variant.id } } } : {}),
        name: product.name,
        variantName: variant?.name,
        sku: variant?.sku ?? product.sku,
        image: variant?.image ?? product.images[0],
        unitPrice,
        quantity: item.quantity,
        total: unitPrice * item.quantity,
      });
    }

    const shippingCost = shippingCostFor(settings, subtotal, input.deliveryMethod);
    const isShipping = input.deliveryMethod === "SHIPPING";

    return tx.order.create({
      data: {
        paymentMethod: input.paymentMethod,
        deliveryMethod: input.deliveryMethod,
        customerName: input.customerName,
        customerEmail: input.customerEmail.toLowerCase(),
        customerPhone: input.customerPhone,
        documentType: input.documentType,
        documentNumber: input.documentNumber,
        businessName: input.documentType === "RUC" ? input.businessName : null,
        department: isShipping ? input.department : null,
        province: isShipping ? input.province : null,
        district: isShipping ? input.district : null,
        address: isShipping ? input.address : null,
        reference: isShipping ? input.reference : null,
        notes: input.notes,
        subtotal,
        shippingCost,
        total: subtotal + shippingCost,
        items: { create: lines },
      },
    });
  });
}

async function decrementStock(tx: Tx, productId: string, variantId: string | undefined, qty: number, title: string) {
  const { count } = variantId
    ? await tx.productVariant.updateMany({
        where: { id: variantId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      })
    : await tx.product.updateMany({
        where: { id: productId, stock: { gte: qty } },
        data: { stock: { decrement: qty } },
      });
  if (count === 0) throw new OrderError(`No hay stock suficiente de "${title}".`);
}

/** Cancela el pedido y devuelve el stock. Idempotente. */
export async function cancelOrder(orderId: string) {
  await db.$transaction(async (tx) => {
    const order = await tx.order.findUnique({ where: { id: orderId }, include: { items: true } });
    if (!order || order.status === "CANCELLED") return;

    for (const item of order.items) {
      if (item.variantId) {
        await tx.productVariant.updateMany({
          where: { id: item.variantId },
          data: { stock: { increment: item.quantity } },
        });
      } else if (item.productId) {
        await tx.product.updateMany({
          where: { id: item.productId },
          data: { stock: { increment: item.quantity } },
        });
      }
    }
    await tx.order.update({ where: { id: orderId }, data: { status: "CANCELLED" } });
  });
}

/**
 * Registra el pago aprobado. El estado avanza a PAID solo si estaba pendiente
 * (un contra entrega puede estar ya en preparación o enviado cuando se cobra).
 */
export async function markOrderPaid(orderId: string, tx: Tx | typeof db = db) {
  await tx.order.updateMany({
    where: { id: orderId, paymentStatus: { not: "APPROVED" } },
    data: { paymentStatus: "APPROVED", paidAt: new Date() },
  });
  await tx.order.updateMany({ where: { id: orderId, status: "PENDING" }, data: { status: "PAID" } });
}

export function getOrderWithDetails(id: string) {
  return db.order.findUnique({
    where: { id },
    include: { items: true, payments: { orderBy: { createdAt: "desc" } } },
  });
}
