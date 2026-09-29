"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";

// El carrito vive en el navegador (localStorage). Los precios guardados aquí son solo para mostrar:
// al pagar, el servidor recalcula todo desde la base de datos.

export type CartLine = {
  key: string; // productId:variantId
  productId: string;
  variantId?: string;
  slug: string;
  name: string;
  variantName?: string;
  image?: string;
  price: number; // céntimos
  maxStock: number;
  quantity: number;
};

type CartState = {
  lines: CartLine[];
  add: (line: Omit<CartLine, "key" | "quantity">, quantity?: number) => void;
  setQuantity: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
};

export const lineKey = (productId: string, variantId?: string) => `${productId}:${variantId ?? ""}`;

export const useCart = create<CartState>()(
  persist(
    (set) => ({
      lines: [],
      add: (line, quantity = 1) =>
        set((s) => {
          const key = lineKey(line.productId, line.variantId);
          const existing = s.lines.find((l) => l.key === key);
          if (existing) {
            return {
              lines: s.lines.map((l) =>
                l.key === key ? { ...l, ...line, quantity: Math.min(l.quantity + quantity, line.maxStock) } : l,
              ),
            };
          }
          return { lines: [...s.lines, { ...line, key, quantity: Math.min(quantity, line.maxStock) }] };
        }),
      setQuantity: (key, quantity) =>
        set((s) => ({
          lines: s.lines.map((l) => (l.key === key ? { ...l, quantity: Math.max(1, Math.min(quantity, l.maxStock)) } : l)),
        })),
      remove: (key) => set((s) => ({ lines: s.lines.filter((l) => l.key !== key) })),
      clear: () => set({ lines: [] }),
    }),
    { name: "tienda-cart", version: 1 },
  ),
);

export const cartCount = (lines: CartLine[]) => lines.reduce((n, l) => n + l.quantity, 0);
export const cartSubtotal = (lines: CartLine[]) => lines.reduce((n, l) => n + l.price * l.quantity, 0);
