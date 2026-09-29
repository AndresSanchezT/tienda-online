import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";

/** Configuración de la tienda (fila única). Se crea con valores por defecto si no existe. */
export const getSettings = cache(async () => {
  await connection();
  return db.storeSettings.upsert({ where: { id: "default" }, update: {}, create: { id: "default" } });
});

export type Settings = Awaited<ReturnType<typeof getSettings>>;

/** Public Key de Mercado Pago: es pública por diseño (la usa el navegador para tokenizar tarjetas y Yape). */
export function mercadoPagoPublicKey() {
  return process.env.MP_PUBLIC_KEY ?? "";
}

/** El modo integrado necesita Access Token + Public Key; la redirección (Checkout Pro) solo el Access Token. */
export function mercadoPagoConfigured(mode: "EMBEDDED" | "REDIRECT" = "EMBEDDED") {
  return Boolean(process.env.MP_ACCESS_TOKEN) && (mode === "REDIRECT" || Boolean(process.env.MP_PUBLIC_KEY));
}

export function shippingCostFor(settings: Settings, subtotal: number, delivery: "SHIPPING" | "PICKUP") {
  if (delivery === "PICKUP") return 0;
  if (settings.freeShippingFrom != null && subtotal >= settings.freeShippingFrom) return 0;
  return settings.shippingFlatRate;
}

/** Medios de pago disponibles para el checkout según la configuración. */
export function enabledPaymentMethods(settings: Settings) {
  const methods: ("MERCADOPAGO" | "YAPE" | "PLIN" | "BANK_TRANSFER" | "CASH_ON_DELIVERY")[] = [];
  if (settings.mercadoPagoEnabled && mercadoPagoConfigured(settings.mercadoPagoMode)) methods.push("MERCADOPAGO");
  if (settings.yapeEnabled && settings.yapePhone) methods.push("YAPE");
  if (settings.plinEnabled && settings.plinPhone) methods.push("PLIN");
  if (settings.bankTransferEnabled && settings.bankAccounts) methods.push("BANK_TRANSFER");
  if (settings.cashOnDeliveryEnabled) methods.push("CASH_ON_DELIVERY");
  return methods;
}
