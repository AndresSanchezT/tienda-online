import Link from "next/link";
import type { Settings } from "@/lib/settings";
import { enabledPaymentMethods } from "@/lib/settings";

const methodBadges: Record<string, string[]> = {
  MERCADOPAGO: ["Visa", "Mastercard", "Amex", "Diners", "Yape", "PagoEfectivo"],
  YAPE: ["Yape"],
  PLIN: ["Plin"],
  BANK_TRANSFER: ["Transferencia"],
  CASH_ON_DELIVERY: ["Contra entrega"],
};

export function Footer({ settings }: { settings: Settings }) {
  const badges = [...new Set(enabledPaymentMethods(settings).flatMap((m) => methodBadges[m]))];

  return (
    <footer className="mt-16 border-t border-zinc-200 bg-white">
      <div className="mx-auto grid max-w-7xl gap-8 px-4 py-10 text-sm sm:grid-cols-3">
        <div>
          <p className="text-base font-bold">{settings.storeName}</p>
          <p className="mt-1 text-zinc-600">{settings.tagline}</p>
          {settings.address && <p className="mt-3 text-zinc-600">{settings.address}</p>}
        </div>
        <div className="space-y-1.5">
          <p className="font-semibold">Atención al cliente</p>
          {settings.contactPhone && <p className="text-zinc-600">Tel: {settings.contactPhone}</p>}
          {settings.contactEmail && <p className="text-zinc-600">{settings.contactEmail}</p>}
          <Link href="/terminos" className="block text-zinc-600 hover:text-brand">
            Términos y condiciones
          </Link>
          <Link href="/libro-de-reclamaciones" className="block text-zinc-600 hover:text-brand">
            Libro de Reclamaciones
          </Link>
        </div>
        <div>
          <p className="font-semibold">Medios de pago</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {badges.map((b) => (
              <span key={b} className="rounded border border-zinc-200 px-2 py-1 text-xs text-zinc-600">
                {b}
              </span>
            ))}
          </div>
        </div>
      </div>
      <p className="border-t border-zinc-100 py-4 text-center text-xs text-zinc-500">
        © {new Date().getFullYear()} {settings.storeName}. Precios en soles (PEN), incluyen IGV.
      </p>
    </footer>
  );
}
