"use client";

import { useActionState, type ReactNode } from "react";
import { SingleImageInput } from "@/components/admin/image-uploader";
import { centsToInput } from "@/lib/money";
import type { Settings } from "@/lib/settings";
import { saveSettings } from "./actions";

function Field({ label, name, defaultValue, placeholder, hint }: { label: string; name: string; defaultValue?: string | null; placeholder?: string; hint?: string }) {
  return (
    <div>
      <label className="label" htmlFor={name}>{label}</label>
      <input id={name} name={name} defaultValue={defaultValue ?? ""} placeholder={placeholder} className="input" />
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}

function Toggle({ name, label, defaultChecked }: { name: string; label: string; defaultChecked: boolean }) {
  return (
    <label className="flex items-center gap-2 font-semibold">
      <input type="checkbox" name={name} defaultChecked={defaultChecked} className="size-4" /> {label}
    </label>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="card space-y-4 p-5">
      <h2 className="font-semibold">{title}</h2>
      {children}
    </section>
  );
}

type MpStatus = { accessToken: boolean; publicKey: boolean; testMode: boolean };

export function SettingsForm({ settings, mp }: { settings: Settings; mp: MpStatus }) {
  const [state, action, pending] = useActionState(saveSettings, {});

  return (
    <form action={action} className="max-w-3xl space-y-6">
      <Section title="Datos de la tienda">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Nombre de la tienda" name="storeName" defaultValue={settings.storeName} />
          <Field label="Eslogan" name="tagline" defaultValue={settings.tagline} />
          <Field label="Razón social" name="legalName" defaultValue={settings.legalName} hint="Aparece en el Libro de Reclamaciones" />
          <Field label="RUC" name="ruc" defaultValue={settings.ruc} />
          <Field label="Correo de contacto" name="contactEmail" defaultValue={settings.contactEmail} />
          <Field label="Teléfono" name="contactPhone" defaultValue={settings.contactPhone} />
          <Field label="WhatsApp" name="whatsapp" defaultValue={settings.whatsapp} placeholder="51987654321" hint="Con código de país (51), sin +" />
          <Field label="Dirección" name="address" defaultValue={settings.address} />
        </div>
        <div>
          <span className="label">Logo</span>
          <SingleImageInput name="logo" defaultValue={settings.logo} />
        </div>
      </Section>

      <Section title="Envíos">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Costo de envío (S/)" name="shippingFlatRate" defaultValue={centsToInput(settings.shippingFlatRate)} />
          <Field label="Envío gratis desde (S/)" name="freeShippingFrom" defaultValue={centsToInput(settings.freeShippingFrom)} hint="Vacío = nunca gratis" />
        </div>
        <Toggle name="pickupEnabled" label="Permitir recojo en tienda" defaultChecked={settings.pickupEnabled} />
        <Field label="Dirección de recojo" name="pickupAddress" defaultValue={settings.pickupAddress} />
      </Section>

      <Section title="Medios de pago">
        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <Toggle name="mercadoPagoEnabled" label="Mercado Pago (tarjetas, Yape, PagoEfectivo)" defaultChecked={settings.mercadoPagoEnabled} />
          <div>
            <label className="label" htmlFor="mercadoPagoMode">Forma de cobro</label>
            <select id="mercadoPagoMode" name="mercadoPagoMode" defaultValue={settings.mercadoPagoMode} className="input">
              <option value="EMBEDDED">Formulario integrado en la tienda (tarjeta, Yape y PagoEfectivo sin salir del sitio)</option>
              <option value="REDIRECT">Redirigir a la página de Mercado Pago (Checkout Pro)</option>
            </select>
          </div>
          <ul className="space-y-0.5 text-sm">
            <li className={mp.accessToken ? "text-emerald-700" : "text-amber-700"}>
              {mp.accessToken ? "✓" : "⚠"} MP_ACCESS_TOKEN {mp.accessToken ? "configurado" : "falta en el .env del servidor"}
            </li>
            <li className={mp.publicKey ? "text-emerald-700" : "text-amber-700"}>
              {mp.publicKey ? "✓" : "⚠"} MP_PUBLIC_KEY {mp.publicKey ? "configurada" : "falta (necesaria para el formulario integrado)"}
            </li>
            {mp.accessToken && mp.testMode && (
              <li className="text-sky-700">ℹ Credenciales de PRUEBA: ningún cobro es real.</li>
            )}
          </ul>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <Toggle name="yapeEnabled" label="Yape directo (validación manual)" defaultChecked={settings.yapeEnabled} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Número Yape" name="yapePhone" defaultValue={settings.yapePhone} />
            <Field label="Titular" name="yapeHolder" defaultValue={settings.yapeHolder} />
          </div>
          <div>
            <span className="label">QR de Yape</span>
            <SingleImageInput name="yapeQr" defaultValue={settings.yapeQr} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <Toggle name="plinEnabled" label="Plin (validación manual)" defaultChecked={settings.plinEnabled} />
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Número Plin" name="plinPhone" defaultValue={settings.plinPhone} />
            <Field label="Titular" name="plinHolder" defaultValue={settings.plinHolder} />
          </div>
          <div>
            <span className="label">QR de Plin</span>
            <SingleImageInput name="plinQr" defaultValue={settings.plinQr} />
          </div>
        </div>

        <div className="space-y-3 rounded-lg border border-zinc-200 p-4">
          <Toggle name="bankTransferEnabled" label="Transferencia / depósito bancario" defaultChecked={settings.bankTransferEnabled} />
          <div>
            <label className="label" htmlFor="bankAccounts">Cuentas bancarias</label>
            <textarea
              id="bankAccounts"
              name="bankAccounts"
              rows={4}
              defaultValue={settings.bankAccounts ?? ""}
              className="input font-mono"
              placeholder={"BCP Soles: 191-1234567-0-12\nCCI: 002-191-001234567012-55\nInterbank Soles: 200-3001234567\nTitular: Mi Empresa SAC"}
            />
          </div>
        </div>

        <div className="rounded-lg border border-zinc-200 p-4">
          <Toggle name="cashOnDeliveryEnabled" label="Pago contra entrega" defaultChecked={settings.cashOnDeliveryEnabled} />
        </div>
      </Section>

      <div className="sticky bottom-0 flex items-center gap-3 bg-zinc-50/95 py-3">
        <button className="btn-primary" disabled={pending}>{pending ? "Guardando..." : "Guardar configuración"}</button>
        {state.ok && <span className="text-sm text-emerald-700">✓ Guardado</span>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
      </div>
    </form>
  );
}
