"use client";

import { useRouter } from "next/navigation";
import { useMemo, useState } from "react";
import { useCart } from "@/lib/cart-store";
import { discountPercent, formatPrice } from "@/lib/money";
import { cn } from "@/lib/utils";

export type VariantOption = {
  id: string;
  name: string;
  options: Record<string, string>;
  price: number;
  stock: number;
  image: string | null;
};

type Props = {
  product: { id: string; slug: string; name: string; price: number; compareAtPrice: number | null; stock: number; image?: string };
  variants: VariantOption[];
};

export function AddToCart({ product, variants }: Props) {
  const router = useRouter();
  const add = useCart((s) => s.add);
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);

  // Grupos de opciones: { Color: ["Negro","Blanco"], Almacenamiento: ["128 GB","256 GB"] }
  const groups = useMemo(() => {
    const map = new Map<string, string[]>();
    for (const v of variants)
      for (const [k, val] of Object.entries(v.options)) {
        const list = map.get(k) ?? [];
        if (!list.includes(val)) list.push(val);
        map.set(k, list);
      }
    return [...map.entries()];
  }, [variants]);

  const firstAvailable = variants.find((v) => v.stock > 0) ?? variants[0];
  const [selected, setSelected] = useState<Record<string, string>>(firstAvailable?.options ?? {});
  const [selectedId, setSelectedId] = useState(firstAvailable?.id);

  const variant =
    groups.length > 0
      ? variants.find((v) => groups.every(([k]) => v.options[k] === selected[k]))
      : variants.find((v) => v.id === selectedId);

  const hasVariants = variants.length > 0;
  const price = variant?.price ?? product.price;
  const stock = hasVariants ? (variant?.stock ?? 0) : product.stock;
  const discount = discountPercent(price, product.compareAtPrice);

  function pick(key: string, value: string) {
    const next = { ...selected, [key]: value };
    // Si la combinación no existe, salta a la primera variante que tenga ese valor
    const exact = variants.find((v) => groups.every(([k]) => v.options[k] === next[k]));
    setSelected(exact ? next : (variants.find((v) => v.options[key] === value)?.options ?? next));
  }

  function isAvailable(key: string, value: string) {
    return variants.some(
      (v) => v.options[key] === value && v.stock > 0 && groups.every(([k]) => k === key || v.options[k] === selected[k]),
    );
  }

  function handleAdd(goToCart: boolean) {
    if (stock <= 0 || (hasVariants && !variant)) return;
    add(
      {
        productId: product.id,
        variantId: variant?.id,
        slug: product.slug,
        name: product.name,
        variantName: variant?.name,
        image: variant?.image ?? product.image,
        price,
        maxStock: stock,
      },
      quantity,
    );
    if (goToCart) router.push("/carrito");
    else {
      setAdded(true);
      setTimeout(() => setAdded(false), 2000);
    }
  }

  return (
    <div className="space-y-5">
      <div>
        {product.compareAtPrice && discount && (
          <p className="text-sm text-zinc-400">
            <span className="line-through">{formatPrice(product.compareAtPrice)}</span>
            <span className="ml-2 badge bg-red-600 text-white">-{discount}%</span>
          </p>
        )}
        <p className="text-3xl font-bold">{formatPrice(price)}</p>
      </div>

      {groups.map(([key, values]) => (
        <div key={key}>
          <p className="label">
            {key}: <span className="font-normal text-zinc-500">{selected[key]}</span>
          </p>
          <div className="flex flex-wrap gap-2">
            {values.map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => pick(key, value)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm transition",
                  selected[key] === value ? "border-brand bg-brand/5 font-semibold text-brand" : "border-zinc-300 hover:border-zinc-500",
                  !isAvailable(key, value) && "text-zinc-400 line-through",
                )}
              >
                {value}
              </button>
            ))}
          </div>
        </div>
      ))}

      {hasVariants && groups.length === 0 && (
        <div>
          <p className="label">Opción</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedId(v.id)}
                className={cn(
                  "rounded-lg border px-3 py-1.5 text-sm",
                  selectedId === v.id ? "border-brand bg-brand/5 font-semibold text-brand" : "border-zinc-300",
                  v.stock <= 0 && "text-zinc-400 line-through",
                )}
              >
                {v.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <p className={cn("text-sm font-medium", stock > 0 ? "text-emerald-700" : "text-red-600")}>
        {hasVariants && !variant
          ? "Combinación no disponible"
          : stock > 0
            ? stock <= 5
              ? `¡Solo quedan ${stock}!`
              : "En stock"
            : "Agotado"}
      </p>

      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center rounded-lg border border-zinc-300 bg-white">
          <button type="button" className="px-3 py-2" onClick={() => setQuantity((q) => Math.max(1, q - 1))} aria-label="Menos">
            −
          </button>
          <span className="w-8 text-center text-sm font-semibold">{quantity}</span>
          <button
            type="button"
            className="px-3 py-2"
            onClick={() => setQuantity((q) => Math.min(Math.max(stock, 1), q + 1))}
            aria-label="Más"
          >
            +
          </button>
        </div>
        <button type="button" className="btn-secondary flex-1" disabled={stock <= 0} onClick={() => handleAdd(false)}>
          {added ? "✓ Agregado" : "Agregar al carrito"}
        </button>
        <button type="button" className="btn-primary w-full" disabled={stock <= 0} onClick={() => handleAdd(true)}>
          Comprar ahora
        </button>
      </div>
    </div>
  );
}
