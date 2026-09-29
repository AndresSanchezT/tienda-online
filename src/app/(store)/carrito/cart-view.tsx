"use client";

import Link from "next/link";
import { useHydrated } from "@/components/store/cart-button";
import { cartSubtotal, useCart } from "@/lib/cart-store";
import { formatPrice } from "@/lib/money";

export function CartView() {
  const { lines, setQuantity, remove } = useCart();
  const hydrated = useHydrated();

  if (!hydrated) return <div className="card h-40 animate-pulse" />;

  if (lines.length === 0) {
    return (
      <div className="card p-10 text-center">
        <p className="text-zinc-500">Tu carrito está vacío.</p>
        <Link href="/productos" className="btn-primary mt-4">Ver productos</Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
      <ul className="card divide-y divide-zinc-100">
        {lines.map((l) => (
          <li key={l.key} className="flex gap-4 p-4">
            <Link href={`/producto/${l.slug}`} className="size-20 shrink-0 rounded-lg bg-zinc-50">
              {l.image && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={l.image} alt="" className="size-full object-contain p-1" />
              )}
            </Link>
            <div className="flex flex-1 flex-col">
              <Link href={`/producto/${l.slug}`} className="font-medium hover:text-brand">{l.name}</Link>
              {l.variantName && <p className="text-sm text-zinc-500">{l.variantName}</p>}
              <p className="text-sm text-zinc-500">{formatPrice(l.price)} c/u</p>
              <div className="mt-auto flex items-center gap-3 pt-2">
                <select
                  value={l.quantity}
                  onChange={(e) => setQuantity(l.key, Number(e.target.value))}
                  className="input w-20 py-1"
                  aria-label="Cantidad"
                >
                  {Array.from({ length: Math.min(l.maxStock, 20) }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>{n}</option>
                  ))}
                </select>
                <button type="button" onClick={() => remove(l.key)} className="text-sm text-red-600 hover:underline">
                  Eliminar
                </button>
              </div>
            </div>
            <p className="font-semibold">{formatPrice(l.price * l.quantity)}</p>
          </li>
        ))}
      </ul>

      <aside className="card h-fit space-y-3 p-5">
        <div className="flex justify-between">
          <span>Subtotal</span>
          <span className="font-semibold">{formatPrice(cartSubtotal(lines))}</span>
        </div>
        <p className="text-xs text-zinc-500">El costo de envío se calcula en el siguiente paso.</p>
        <Link href="/checkout" className="btn-primary w-full">Continuar compra</Link>
        <Link href="/productos" className="btn-secondary w-full">Seguir comprando</Link>
      </aside>
    </div>
  );
}
