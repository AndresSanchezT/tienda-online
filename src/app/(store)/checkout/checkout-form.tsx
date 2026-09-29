"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState, useTransition } from "react";
import { useHydrated } from "@/components/store/cart-button";
import { useCart } from "@/lib/cart-store";
import { paymentMethodLabel } from "@/lib/labels";
import { formatPrice } from "@/lib/money";
import { DEPARTMENTS } from "@/lib/peru";
import { cn } from "@/lib/utils";
import type { PaymentMethod } from "@/generated/prisma/enums";
import { placeOrder, quoteCart } from "./actions";

type Quote = Awaited<ReturnType<typeof quoteCart>>;

const methodHint: Record<PaymentMethod, string> = {
  MERCADOPAGO: "Visa, Mastercard, Amex, Diners, Yape o PagoEfectivo. Pago seguro procesado por Mercado Pago.",
  YAPE: "Yapea al número de la tienda y reporta tu número de operación.",
  PLIN: "Paga con Plin y reporta tu número de operación.",
  BANK_TRANSFER: "Transfiere o deposita a nuestras cuentas y reporta la operación.",
  CASH_ON_DELIVERY: "Pagas en efectivo o Yape al recibir tu pedido.",
};

export function CheckoutForm({
  methods,
  pickupEnabled,
  pickupAddress,
}: {
  methods: PaymentMethod[];
  pickupEnabled: boolean;
  pickupAddress: string | null;
}) {
  const router = useRouter();
  const hydrated = useHydrated();
  const { lines, clear, setQuantity, remove } = useCart();
  const [delivery, setDelivery] = useState<"SHIPPING" | "PICKUP">("SHIPPING");
  const [payment, setPayment] = useState<PaymentMethod>(methods[0]);
  const [docType, setDocType] = useState("DNI");
  const [quote, setQuote] = useState<Quote | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [pending, startTransition] = useTransition();

  const itemsKey = lines.map((l) => `${l.key}x${l.quantity}`).join(",");

  useEffect(() => {
    if (!hydrated || lines.length === 0) return;
    let cancelled = false;
    quoteCart(
      lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
      delivery,
    ).then((q) => {
      if (cancelled) return;
      setQuote(q);
      // Ajusta el carrito si cambió stock o el producto ya no existe
      for (const ql of q.lines) {
        const line = lines.find((l) => l.key === ql.key);
        if (!line) continue;
        if (!ql.available || ql.stock <= 0) remove(line.key);
        else if (line.quantity > ql.stock) setQuantity(line.key, ql.stock);
      }
    });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrated, itemsKey, delivery]);

  if (!hydrated) return <div className="card h-60 animate-pulse" />;
  if (lines.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-500">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn-primary mt-4">Ver productos</Link>
      </div>
    );
  }

  const priceOf = (key: string, fallback: number) => quote?.lines.find((l) => l.key === key)?.price ?? fallback;

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const get = (k: string) => (fd.get(k) as string | null)?.trim() || undefined;

    const payload = {
      items: lines.map((l) => ({ productId: l.productId, variantId: l.variantId, quantity: l.quantity })),
      customerName: get("customerName"),
      customerEmail: get("customerEmail"),
      customerPhone: get("customerPhone"),
      documentType: docType,
      documentNumber: get("documentNumber"),
      businessName: get("businessName"),
      deliveryMethod: delivery,
      department: get("department"),
      province: get("province"),
      district: get("district"),
      address: get("address"),
      reference: get("reference"),
      notes: get("notes"),
      paymentMethod: payment,
      acceptTerms: fd.get("acceptTerms") === "on",
    };

    startTransition(async () => {
      const res = await placeOrder(payload);
      if (!res.ok) {
        setErrors(res.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      clear();
      if (res.redirectUrl.startsWith("http")) window.location.href = res.redirectUrl;
      else router.push(res.redirectUrl);
    });
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-6 lg:grid-cols-[1fr_380px]" noValidate>
      <div className="space-y-6">
        {errors.form && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{errors.form}</p>}
        {Object.keys(errors).length > 0 && !errors.form && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Revisa los campos marcados.</p>
        )}

        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-lg font-semibold">1. Tus datos</legend>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className="label" htmlFor="customerName">Nombres y apellidos</label>
              <input id="customerName" name="customerName" className="input" autoComplete="name" required />
              {err("customerName")}
            </div>
            <div>
              <label className="label" htmlFor="customerEmail">Correo</label>
              <input id="customerEmail" name="customerEmail" type="email" className="input" autoComplete="email" required />
              {err("customerEmail")}
            </div>
            <div>
              <label className="label" htmlFor="customerPhone">Celular</label>
              <input id="customerPhone" name="customerPhone" type="tel" className="input" autoComplete="tel" placeholder="987654321" required />
              {err("customerPhone")}
            </div>
            <div>
              <label className="label" htmlFor="documentType">Comprobante / documento</label>
              <select id="documentType" value={docType} onChange={(e) => setDocType(e.target.value)} className="input">
                <option value="DNI">Boleta - DNI</option>
                <option value="CE">Boleta - Carné de extranjería</option>
                <option value="PASAPORTE">Boleta - Pasaporte</option>
                <option value="RUC">Factura - RUC</option>
              </select>
            </div>
            <div>
              <label className="label" htmlFor="documentNumber">Número de {docType === "RUC" ? "RUC" : "documento"}</label>
              <input id="documentNumber" name="documentNumber" inputMode="numeric" className="input" required />
              {err("documentNumber")}
            </div>
            {docType === "RUC" && (
              <div className="sm:col-span-2">
                <label className="label" htmlFor="businessName">Razón social</label>
                <input id="businessName" name="businessName" className="input" />
                {err("businessName")}
              </div>
            )}
          </div>
        </fieldset>

        <fieldset className="card space-y-4 p-5">
          <legend className="px-1 text-lg font-semibold">2. Entrega</legend>
          <div className="grid gap-3 sm:grid-cols-2">
            <OptionCard checked={delivery === "SHIPPING"} onClick={() => setDelivery("SHIPPING")} title="Envío a domicilio" hint="A todo el Perú" />
            {pickupEnabled && (
              <OptionCard
                checked={delivery === "PICKUP"}
                onClick={() => {
                  setDelivery("PICKUP");
                  if (payment === "CASH_ON_DELIVERY") setPayment(methods.find((m) => m !== "CASH_ON_DELIVERY") ?? methods[0]);
                }}
                title="Recojo en tienda"
                hint={pickupAddress ?? "Gratis"}
              />
            )}
          </div>
          {delivery === "SHIPPING" && (
            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="label" htmlFor="department">Departamento</label>
                <select id="department" name="department" className="input" defaultValue="Lima">
                  {DEPARTMENTS.map((d) => (
                    <option key={d}>{d}</option>
                  ))}
                </select>
                {err("department")}
              </div>
              <div>
                <label className="label" htmlFor="province">Provincia</label>
                <input id="province" name="province" className="input" />
                {err("province")}
              </div>
              <div>
                <label className="label" htmlFor="district">Distrito</label>
                <input id="district" name="district" className="input" />
                {err("district")}
              </div>
              <div className="sm:col-span-3">
                <label className="label" htmlFor="address">Dirección</label>
                <input id="address" name="address" className="input" autoComplete="street-address" placeholder="Av. / Calle / Jr., número, dpto." />
                {err("address")}
              </div>
              <div className="sm:col-span-3">
                <label className="label" htmlFor="reference">Referencia (opcional)</label>
                <input id="reference" name="reference" className="input" />
              </div>
            </div>
          )}
          <div>
            <label className="label" htmlFor="notes">Notas del pedido (opcional)</label>
            <textarea id="notes" name="notes" rows={2} className="input" />
          </div>
        </fieldset>

        <fieldset className="card space-y-3 p-5">
          <legend className="px-1 text-lg font-semibold">3. Medio de pago</legend>
          {methods
            .filter((m) => m !== "CASH_ON_DELIVERY" || delivery === "SHIPPING")
            .map((m) => (
              <OptionCard key={m} checked={payment === m} onClick={() => setPayment(m)} title={paymentMethodLabel[m]} hint={methodHint[m]} />
            ))}
          {err("paymentMethod")}
        </fieldset>
      </div>

      <aside className="card h-fit space-y-4 p-5 lg:sticky lg:top-32">
        <h2 className="text-lg font-semibold">Resumen</h2>
        <ul className="space-y-3 text-sm">
          {lines.map((l) => (
            <li key={l.key} className="flex justify-between gap-3">
              <span>
                {l.quantity} × {l.name}
                {l.variantName && <span className="block text-xs text-zinc-500">{l.variantName}</span>}
              </span>
              <span className="font-medium whitespace-nowrap">{formatPrice(priceOf(l.key, l.price) * l.quantity)}</span>
            </li>
          ))}
        </ul>
        <dl className="space-y-1 border-t border-zinc-100 pt-3 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{quote ? formatPrice(quote.subtotal) : "…"}</dd>
          </div>
          <div className="flex justify-between">
            <dt>Envío</dt>
            <dd>{quote ? (quote.shipping === 0 ? "Gratis" : formatPrice(quote.shipping)) : "…"}</dd>
          </div>
          <div className="flex justify-between border-t border-zinc-100 pt-2 text-lg font-bold">
            <dt>Total</dt>
            <dd>{quote ? formatPrice(quote.total) : "…"}</dd>
          </div>
        </dl>
        <label className="flex items-start gap-2 text-sm">
          <input type="checkbox" name="acceptTerms" className="mt-1" />
          <span>
            Acepto los <Link href="/terminos" target="_blank" className="text-brand underline">términos y condiciones</Link>
          </span>
        </label>
        {err("acceptTerms")}
        <button className="btn-primary w-full py-3 text-base" disabled={pending || !quote}>
          {pending ? "Procesando..." : payment === "MERCADOPAGO" ? "Ir a pagar" : "Confirmar pedido"}
        </button>
      </aside>
    </form>
  );
}

function OptionCard({ checked, onClick, title, hint }: { checked: boolean; onClick: () => void; title: string; hint?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={checked}
      className={cn(
        "flex w-full items-start gap-3 rounded-lg border p-3 text-left transition",
        checked ? "border-brand bg-brand/5 ring-1 ring-brand" : "border-zinc-300 hover:border-zinc-400",
      )}
    >
      <span className={cn("mt-0.5 size-4 shrink-0 rounded-full border-2", checked ? "border-brand bg-brand" : "border-zinc-400")} />
      <span>
        <span className="block text-sm font-semibold">{title}</span>
        {hint && <span className="block text-xs text-zinc-500">{hint}</span>}
      </span>
    </button>
  );
}
