"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { createOrder, OrderError } from "@/lib/orders";
import { createCheckoutUrl } from "@/lib/payments/mercadopago";
import { enabledPaymentMethods, getSettings, shippingCostFor } from "@/lib/settings";
import { cartItemSchema, checkoutSchema, fieldErrors } from "@/lib/validators";

export type QuoteLine = {
  key: string;
  price: number;
  stock: number;
  available: boolean;
};

/** Precios y stock actuales para lo que hay en el carrito (el carrito del navegador puede estar desactualizado). */
export async function quoteCart(rawItems: unknown, delivery: "SHIPPING" | "PICKUP") {
  const items = z.array(cartItemSchema).max(50).safeParse(rawItems);
  if (!items.success) return { lines: [], subtotal: 0, shipping: 0, total: 0 };

  const products = await db.product.findMany({
    where: { id: { in: items.data.map((i) => i.productId) } },
    include: { variants: true },
  });

  let subtotal = 0;
  const lines: QuoteLine[] = items.data.map((item) => {
    const p = products.find((x) => x.id === item.productId);
    const v = item.variantId ? p?.variants.find((x) => x.id === item.variantId) : undefined;
    const needsVariant = (p?.variants.filter((x) => x.active).length ?? 0) > 0;
    const available = Boolean(p?.active && (!needsVariant || v?.active));
    const price = v?.price ?? p?.price ?? 0;
    const stock = available ? (v ? v.stock : (p?.stock ?? 0)) : 0;
    if (available) subtotal += price * Math.min(item.quantity, stock);
    return { key: `${item.productId}:${item.variantId ?? ""}`, price, stock, available };
  });

  const settings = await getSettings();
  const shipping = subtotal > 0 ? shippingCostFor(settings, subtotal, delivery) : 0;
  return { lines, subtotal, shipping, total: subtotal + shipping };
}

export type PlaceOrderResult =
  | { ok: true; orderId: string; redirectUrl: string }
  | { ok: false; errors: Record<string, string> };

export async function placeOrder(raw: unknown): Promise<PlaceOrderResult> {
  const parsed = checkoutSchema.safeParse(raw);
  if (!parsed.success) return { ok: false, errors: fieldErrors(parsed.error) };
  const input = parsed.data;

  const settings = await getSettings();
  if (!enabledPaymentMethods(settings).includes(input.paymentMethod)) {
    return { ok: false, errors: { paymentMethod: "Este medio de pago no está disponible" } };
  }
  if (input.deliveryMethod === "PICKUP" && !settings.pickupEnabled) {
    return { ok: false, errors: { deliveryMethod: "El recojo en tienda no está disponible" } };
  }

  let order;
  try {
    order = await createOrder(input, settings);
  } catch (err) {
    if (err instanceof OrderError) return { ok: false, errors: { form: err.message } };
    console.error("[checkout] error creando pedido", err);
    return { ok: false, errors: { form: "No pudimos registrar tu pedido. Inténtalo nuevamente." } };
  }

  // Modo integrado: el formulario de tarjeta/Yape se muestra en la página del pedido
  if (input.paymentMethod === "MERCADOPAGO" && settings.mercadoPagoMode === "REDIRECT") {
    try {
      const url = await createCheckoutUrl(order.id, settings.storeName);
      return { ok: true, orderId: order.id, redirectUrl: url };
    } catch (err) {
      console.error("[checkout] error creando preferencia MP", err);
      // El pedido ya existe: el cliente puede reintentar el pago desde la página del pedido.
      return { ok: true, orderId: order.id, redirectUrl: `/pedido/${order.id}?mp_error=1` };
    }
  }

  return { ok: true, orderId: order.id, redirectUrl: `/pedido/${order.id}` };
}
