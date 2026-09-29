"use client";

import { initMercadoPago, Payment } from "@mercadopago/sdk-react";
import { loadMercadoPago } from "@mercadopago/sdk-js";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useHydrated } from "@/components/store/cart-button";
import { formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";
import { payWithMercadoPago, type PayResult } from "./actions";

type Props = {
  orderId: string;
  publicKey: string;
  amount: number; // céntimos
  payer: { email: string; firstName: string; lastName: string; docType: string; docNumber: string };
};

// Tipos de documento que entiende Mercado Pago Perú
const MP_DOC_TYPE: Record<string, string> = { DNI: "DNI", CE: "C.E", RUC: "RUC", PASAPORTE: "Otro" };

type MercadoPagoJs = { yape: (o: { otp: string; phoneNumber: string }) => { create: () => Promise<{ id: string }> } };
declare global {
  interface Window {
    MercadoPago?: new (key: string, opts?: { locale?: string }) => MercadoPagoJs;
  }
}

export function MercadoPagoCheckout(props: Props) {
  const hydrated = useHydrated();
  if (!hydrated) return <div className="card h-96 animate-pulse" />;
  return <Checkout {...props} />;
}

function Checkout({ orderId, publicKey, amount, payer }: Props) {
  const router = useRouter();
  const [tab, setTab] = useState<"card" | "yape">("card");
  const [error, setError] = useState<string | null>(null);
  const [ticketUrl, setTicketUrl] = useState<string | null>(null);
  const [brickKey, setBrickKey] = useState(0);
  const [brickReady, setBrickReady] = useState(false);
  // Mismo color de marca definido en globals.css (--brand)
  const [brandColor] = useState(() => getComputedStyle(document.documentElement).getPropertyValue("--brand").trim() || "#2563eb");

  // Debe ejecutarse antes de montar el Brick; el SDK ignora llamadas repetidas con la misma clave
  useState(() => initMercadoPago(publicKey, { locale: "es-PE" }));

  function handleResult(res: PayResult) {
    if (!res.ok) {
      setError(res.message);
      return false;
    }
    if (res.ticketUrl) {
      setTicketUrl(res.ticketUrl);
      window.open(res.ticketUrl, "_blank", "noopener");
    }
    router.refresh();
    return true;
  }

  if (ticketUrl) {
    return (
      <section className="card space-y-3 p-5 text-center">
        <p className="font-semibold">Tu código de pago fue generado</p>
        <p className="text-sm text-zinc-600">Págalo en tu banca por internet, app o agente. Confirmaremos tu pedido automáticamente.</p>
        <a href={ticketUrl} target="_blank" rel="noopener noreferrer" className="btn-primary">Ver código de pago</a>
      </section>
    );
  }

  return (
    <section className="card overflow-hidden">
      <div className="grid grid-cols-2 border-b border-zinc-200 text-sm font-semibold">
        {(
          [
            ["card", "💳 Tarjeta / PagoEfectivo"],
            ["yape", "📱 Yape"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => {
              setTab(key);
              setError(null);
            }}
            className={cn("px-4 py-3 transition", tab === key ? "border-b-2 border-brand text-brand" : "text-zinc-500 hover:bg-zinc-50")}
          >
            {label}
          </button>
        ))}
      </div>

      <div className="p-4 sm:p-5">
        {error && <p className="mb-4 rounded-lg bg-red-50 p-3 text-sm text-red-700">{error}</p>}

        {tab === "card" ? (
          <>
            {!brickReady && <div className="h-80 animate-pulse rounded-lg bg-zinc-100" />}
            <Payment
              key={brickKey}
              initialization={{
                amount: amount / 100,
                payer: {
                  email: payer.email,
                  firstName: payer.firstName,
                  lastName: payer.lastName,
                  identification: { type: MP_DOC_TYPE[payer.docType] ?? "DNI", number: payer.docNumber },
                },
              }}
              customization={{
                paymentMethods: { creditCard: "all", debitCard: "all", ticket: "all", atm: "all", maxInstallments: 12 },
                visual: { style: { customVariables: { baseColor: brandColor } } },
              }}
              onReady={() => setBrickReady(true)}
              onError={(e) => console.error("[Payment Brick]", e)}
              onSubmit={async ({ selectedPaymentMethod, formData }) => {
                setError(null);
                const isCard = selectedPaymentMethod === "creditCard" || selectedPaymentMethod === "debitCard" || selectedPaymentMethod === "prepaidCard";
                const res = await payWithMercadoPago(
                  orderId,
                  isCard
                    ? {
                        kind: "card",
                        token: formData.token,
                        paymentMethodId: formData.payment_method_id,
                        issuerId: formData.issuer_id,
                        installments: Number(formData.installments) || 1,
                        payerEmail: formData.payer?.email || payer.email,
                        identification: formData.payer?.identification,
                      }
                    : {
                        kind: "offline",
                        paymentMethodId: formData.payment_method_id,
                        payerEmail: formData.payer?.email || payer.email,
                        firstName: formData.payer?.first_name,
                        lastName: formData.payer?.last_name,
                        identification: formData.payer?.identification,
                      },
                );
                if (!handleResult(res)) {
                  // El token de tarjeta es de un solo uso: se reinicia el formulario para reintentar
                  setBrickReady(false);
                  setBrickKey((k) => k + 1);
                }
              }}
            />
          </>
        ) : (
          <YapeForm
            amount={amount}
            publicKey={publicKey}
            onPay={async (token) => handleResult(await payWithMercadoPago(orderId, { kind: "yape", token, payerEmail: payer.email }))}
            onError={setError}
          />
        )}
      </div>
    </section>
  );
}

function YapeForm({
  amount,
  publicKey,
  onPay,
  onError,
}: {
  amount: number;
  publicKey: string;
  onPay: (token: string) => Promise<boolean>;
  onError: (msg: string | null) => void;
}) {
  const [phone, setPhone] = useState("");
  const [otp, setOtp] = useState("");
  const [pending, setPending] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    onError(null);
    if (!/^9\d{8}$/.test(phone)) return onError("Ingresa tu celular de 9 dígitos (empieza con 9).");
    if (!/^\d{6}$/.test(otp)) return onError("El código de aprobación tiene 6 dígitos.");

    setPending(true);
    try {
      await loadMercadoPago();
      if (!window.MercadoPago) throw new Error("SDK no disponible");
      const mp = new window.MercadoPago(publicKey, { locale: "es-PE" });
      const token = await mp.yape({ otp, phoneNumber: phone }).create();
      const ok = await onPay(token.id);
      if (!ok) setOtp(""); // el código es de un solo uso
    } catch (err) {
      console.error("[Yape]", err);
      onError("No pudimos validar tu Yape. Revisa el celular y genera un nuevo código de aprobación.");
      setOtp("");
    } finally {
      setPending(false);
    }
  }

  return (
    <form onSubmit={submit} className="mx-auto max-w-sm space-y-4">
      <ol className="list-decimal space-y-1 rounded-lg bg-violet-50 p-4 pl-8 text-sm text-violet-900">
        <li>Abre tu app <strong>Yape</strong>.</li>
        <li>Toca el menú y entra a <strong>“Código de aprobación”</strong>.</li>
        <li>Ingresa aquí tu celular y el código de 6 dígitos.</li>
      </ol>
      <div>
        <label className="label" htmlFor="yape-phone">Celular registrado en Yape</label>
        <input
          id="yape-phone"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, "").slice(0, 9))}
          inputMode="numeric"
          autoComplete="tel-national"
          placeholder="987654321"
          className="input text-lg tracking-wider"
        />
      </div>
      <div>
        <label className="label" htmlFor="yape-otp">Código de aprobación</label>
        <input
          id="yape-otp"
          value={otp}
          onChange={(e) => setOtp(e.target.value.replace(/\D/g, "").slice(0, 6))}
          inputMode="numeric"
          autoComplete="one-time-code"
          placeholder="••••••"
          className="input text-center font-mono text-2xl tracking-[0.5em]"
        />
      </div>
      <button className="btn w-full bg-[#742284] py-3 text-base text-white hover:bg-[#5d1b6a]" disabled={pending}>
        {pending ? "Procesando..." : `Pagar ${formatPrice(amount)} con Yape`}
      </button>
      <p className="text-center text-xs text-zinc-500">Pago procesado de forma segura por Mercado Pago.</p>
    </form>
  );
}
