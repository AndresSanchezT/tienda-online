"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { toCents } from "@/lib/money";

export type SettingsState = { ok?: boolean; error?: string };

export async function saveSettings(_prev: SettingsState, fd: FormData): Promise<SettingsState> {
  await requireAdmin();
  const s = (k: string) => String(fd.get(k) ?? "").trim() || null;
  const b = (k: string) => fd.get(k) === "on";
  const money = (k: string) => {
    const v = s(k);
    if (v == null) return null;
    const c = toCents(v);
    return Number.isFinite(c) ? c : null;
  };

  const storeName = s("storeName");
  if (!storeName) return { error: "El nombre de la tienda es obligatorio" };

  const data = {
    storeName,
    tagline: s("tagline") ?? "",
    legalName: s("legalName"),
    ruc: s("ruc"),
    logo: s("logo"),
    contactEmail: s("contactEmail"),
    contactPhone: s("contactPhone"),
    whatsapp: s("whatsapp")?.replace(/\D/g, "") || null,
    address: s("address"),
    shippingFlatRate: money("shippingFlatRate") ?? 0,
    freeShippingFrom: money("freeShippingFrom"),
    pickupEnabled: b("pickupEnabled"),
    pickupAddress: s("pickupAddress"),
    mercadoPagoEnabled: b("mercadoPagoEnabled"),
    mercadoPagoMode: s("mercadoPagoMode") === "REDIRECT" ? ("REDIRECT" as const) : ("EMBEDDED" as const),
    yapeEnabled: b("yapeEnabled"),
    yapePhone: s("yapePhone"),
    yapeHolder: s("yapeHolder"),
    yapeQr: s("yapeQr"),
    plinEnabled: b("plinEnabled"),
    plinPhone: s("plinPhone"),
    plinHolder: s("plinHolder"),
    plinQr: s("plinQr"),
    bankTransferEnabled: b("bankTransferEnabled"),
    bankAccounts: s("bankAccounts"),
    cashOnDeliveryEnabled: b("cashOnDeliveryEnabled"),
  };

  await db.storeSettings.upsert({ where: { id: "default" }, update: data, create: { id: "default", ...data } });
  revalidatePath("/", "layout");
  return { ok: true };
}
