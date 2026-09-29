"use client";

import { useState, useTransition } from "react";
import { ImageListInput } from "@/components/admin/image-uploader";
import { centsToInput, toCents } from "@/lib/money";
import { saveProduct, type ProductPayload } from "./actions";

type Option = { id: string; name: string };

export type ProductFormInitial = {
  id?: string;
  name: string;
  slug: string;
  description: string;
  sku: string | null;
  categoryId: string;
  brandId: string | null;
  price: number;
  compareAtPrice: number | null;
  stock: number;
  images: string[];
  specs: [string, string][];
  condition: "NEW" | "USED" | "REFURBISHED";
  featured: boolean;
  active: boolean;
  variants: {
    id?: string;
    options: Record<string, string>;
    sku: string | null;
    price: number | null;
    stock: number;
    image: string | null;
    active: boolean;
  }[];
};

type VariantRow = {
  id?: string;
  values: Record<string, string>;
  sku: string;
  price: string;
  stock: string;
  image: string;
  active: boolean;
};

// Plantillas de ficha técnica por rubro (el admin puede editarlas libremente)
const SPEC_TEMPLATES: Record<string, string[]> = {
  Celular: ["Pantalla", "Procesador", "RAM", "Almacenamiento", "Cámara principal", "Batería", "Sistema operativo", "Garantía"],
  "Laptop / PC": ["Procesador", "RAM", "Almacenamiento", "Pantalla", "Tarjeta de video", "Sistema operativo", "Garantía"],
  Auto: ["Año", "Kilometraje", "Motor", "Transmisión", "Combustible", "Color", "Placa", "Tracción"],
  Ropa: ["Material", "Género", "Temporada", "Cuidado"],
  Juguete: ["Edad recomendada", "Material", "Dimensiones", "Requiere pilas"],
};

const VARIANT_TEMPLATES: Record<string, string> = {
  Celular: "Color, Almacenamiento",
  "Laptop / PC": "RAM, Almacenamiento",
  Ropa: "Talla, Color",
  Auto: "Versión, Color",
};

export function ProductForm({
  initial,
  categories,
  brands,
}: {
  initial: ProductFormInitial;
  categories: Option[];
  brands: Option[];
}) {
  const [pending, startTransition] = useTransition();
  const [errors, setErrors] = useState<Record<string, string>>({});

  const [images, setImages] = useState(initial.images);
  const [specs, setSpecs] = useState<[string, string][]>(initial.specs.length ? initial.specs : [["", ""]]);
  const [optionNames, setOptionNames] = useState(() => {
    const keys = new Set<string>();
    initial.variants.forEach((v) => Object.keys(v.options).forEach((k) => keys.add(k)));
    return [...keys].join(", ");
  });
  const [variants, setVariants] = useState<VariantRow[]>(
    initial.variants.map((v) => ({
      id: v.id,
      values: v.options,
      sku: v.sku ?? "",
      price: centsToInput(v.price),
      stock: String(v.stock),
      image: v.image ?? "",
      active: v.active,
    })),
  );

  const options = optionNames.split(",").map((s) => s.trim()).filter(Boolean);
  const hasVariants = variants.length > 0;

  const updateVariant = (i: number, patch: Partial<VariantRow>) =>
    setVariants((vs) => vs.map((v, j) => (j === i ? { ...v, ...patch } : v)));

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const s = (k: string) => String(fd.get(k) ?? "").trim();
    const money = (v: string) => (v ? toCents(v) : null);

    const payload: ProductPayload = {
      name: s("name"),
      slug: s("slug"),
      description: String(fd.get("description") ?? ""),
      sku: s("sku") || null,
      categoryId: s("categoryId"),
      brandId: s("brandId") || null,
      price: toCents(s("price")) || 0,
      compareAtPrice: money(s("compareAtPrice")),
      stock: hasVariants ? 0 : Number(s("stock")) || 0,
      images,
      specs: specs.filter(([k, v]) => k.trim() && v.trim()),
      condition: s("condition") as ProductPayload["condition"],
      featured: fd.get("featured") === "on",
      active: fd.get("active") === "on",
      variants: variants.map((v) => ({
        id: v.id,
        options: Object.fromEntries(options.map((o) => [o, v.values[o] ?? ""])),
        sku: v.sku || null,
        price: money(v.price),
        stock: Number(v.stock) || 0,
        image: v.image || null,
        active: v.active,
      })),
    };

    startTransition(async () => {
      const res = await saveProduct(initial.id ?? null, payload);
      if (res?.errors) {
        setErrors(res.errors);
        window.scrollTo({ top: 0, behavior: "smooth" });
      }
    });
  }

  const err = (k: string) => errors[k] && <p className="mt-1 text-xs text-red-600">{errors[k]}</p>;

  return (
    <form onSubmit={onSubmit} className="grid gap-6 xl:grid-cols-[1fr_320px]">
      <div className="space-y-6">
        {Object.keys(errors).length > 0 && (
          <div className="rounded-lg bg-red-50 p-3 text-sm text-red-700">
            Revisa el formulario:
            <ul className="list-disc pl-5">
              {Object.entries(errors).map(([k, v]) => (
                <li key={k}>{v}</li>
              ))}
            </ul>
          </div>
        )}

        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="name">Nombre</label>
            <input id="name" name="name" defaultValue={initial.name} className="input" required placeholder="iPhone 16 Pro Max" />
            {err("name")}
          </div>
          <div>
            <label className="label" htmlFor="slug">URL (slug)</label>
            <input id="slug" name="slug" defaultValue={initial.slug} className="input" placeholder="Se genera desde el nombre" />
            {err("slug")}
          </div>
          <div>
            <label className="label" htmlFor="description">Descripción</label>
            <textarea id="description" name="description" defaultValue={initial.description} rows={6} className="input" />
          </div>
        </section>

        <section className="card space-y-3 p-5">
          <h2 className="font-semibold">Imágenes</h2>
          <ImageListInput value={images} onChange={setImages} />
        </section>

        <section className="card space-y-3 p-5">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-semibold">Ficha técnica</h2>
            <div className="flex flex-wrap gap-1 text-xs">
              {Object.entries(SPEC_TEMPLATES).map(([name, keys]) => (
                <button
                  key={name}
                  type="button"
                  className="rounded border border-zinc-300 px-2 py-1 hover:border-brand"
                  onClick={() => {
                    const existing = new Set(specs.map(([k]) => k));
                    setSpecs([...specs.filter(([k, v]) => k || v), ...keys.filter((k) => !existing.has(k)).map((k) => [k, ""] as [string, string])]);
                  }}
                >
                  + {name}
                </button>
              ))}
            </div>
          </div>
          {specs.map(([k, v], i) => (
            <div key={i} className="flex gap-2">
              <input value={k} onChange={(e) => setSpecs(specs.map((s, j) => (j === i ? [e.target.value, s[1]] : s)))} placeholder="Característica" className="input w-2/5" />
              <input value={v} onChange={(e) => setSpecs(specs.map((s, j) => (j === i ? [s[0], e.target.value] : s)))} placeholder="Valor" className="input" />
              <button type="button" onClick={() => setSpecs(specs.filter((_, j) => j !== i))} className="px-2 text-red-600" aria-label="Quitar">✕</button>
            </div>
          ))}
          <button type="button" onClick={() => setSpecs([...specs, ["", ""]])} className="btn-secondary py-1.5">+ Característica</button>
        </section>

        <section className="card space-y-4 p-5">
          <div>
            <h2 className="font-semibold">Variantes</h2>
            <p className="text-sm text-zinc-500">
              Úsalas si el producto se vende en varias opciones con precio o stock propios (colores, capacidades, tallas...).
            </p>
          </div>
          <div>
            <label className="label" htmlFor="optionNames">Tipos de opción (separados por coma)</label>
            <div className="flex flex-wrap gap-2">
              <input id="optionNames" value={optionNames} onChange={(e) => setOptionNames(e.target.value)} placeholder="Color, Almacenamiento" className="input max-w-md" />
              {Object.entries(VARIANT_TEMPLATES).map(([name, value]) => (
                <button key={name} type="button" onClick={() => setOptionNames(value)} className="rounded border border-zinc-300 px-2 text-xs hover:border-brand">
                  {name}
                </button>
              ))}
            </div>
          </div>

          {hasVariants && (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="text-left text-xs text-zinc-500">
                  <tr>
                    {options.map((o) => <th key={o} className="p-1">{o}</th>)}
                    <th className="p-1">Precio (S/)</th>
                    <th className="p-1">Stock</th>
                    <th className="p-1">SKU</th>
                    <th className="p-1">Activa</th>
                    <th />
                  </tr>
                </thead>
                <tbody>
                  {variants.map((v, i) => (
                    <tr key={v.id ?? i}>
                      {options.map((o) => (
                        <td key={o} className="p-1">
                          <input value={v.values[o] ?? ""} onChange={(e) => updateVariant(i, { values: { ...v.values, [o]: e.target.value } })} className="input min-w-24" />
                        </td>
                      ))}
                      <td className="p-1"><input value={v.price} onChange={(e) => updateVariant(i, { price: e.target.value })} inputMode="decimal" placeholder="= base" className="input w-28" /></td>
                      <td className="p-1"><input value={v.stock} onChange={(e) => updateVariant(i, { stock: e.target.value })} inputMode="numeric" className="input w-20" /></td>
                      <td className="p-1"><input value={v.sku} onChange={(e) => updateVariant(i, { sku: e.target.value })} className="input w-28" /></td>
                      <td className="p-1 text-center"><input type="checkbox" checked={v.active} onChange={(e) => updateVariant(i, { active: e.target.checked })} /></td>
                      <td className="p-1">
                        <button type="button" onClick={() => setVariants(variants.filter((_, j) => j !== i))} className="px-2 text-red-600" aria-label="Quitar">✕</button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {err("variants")}
          <button
            type="button"
            className="btn-secondary py-1.5"
            disabled={options.length === 0}
            onClick={() => setVariants([...variants, { values: {}, sku: "", price: "", stock: "0", image: "", active: true }])}
          >
            + Agregar variante
          </button>
        </section>
      </div>

      <aside className="space-y-6">
        <section className="card space-y-4 p-5">
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="active" defaultChecked={initial.active} /> Visible en la tienda
          </label>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" name="featured" defaultChecked={initial.featured} /> Destacado en portada
          </label>
          <button className="btn-primary w-full" disabled={pending}>{pending ? "Guardando..." : "Guardar producto"}</button>
        </section>

        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="price">Precio (S/){hasVariants && " base"}</label>
            <input id="price" name="price" defaultValue={centsToInput(initial.price)} inputMode="decimal" className="input" required />
            {err("price")}
          </div>
          <div>
            <label className="label" htmlFor="compareAtPrice">Precio anterior (tachado)</label>
            <input id="compareAtPrice" name="compareAtPrice" defaultValue={centsToInput(initial.compareAtPrice)} inputMode="decimal" className="input" />
          </div>
          {!hasVariants && (
            <div>
              <label className="label" htmlFor="stock">Stock</label>
              <input id="stock" name="stock" defaultValue={initial.stock} inputMode="numeric" className="input" />
            </div>
          )}
          <div>
            <label className="label" htmlFor="sku">SKU / código</label>
            <input id="sku" name="sku" defaultValue={initial.sku ?? ""} className="input" />
            {err("sku")}
          </div>
        </section>

        <section className="card space-y-4 p-5">
          <div>
            <label className="label" htmlFor="categoryId">Categoría</label>
            <select id="categoryId" name="categoryId" defaultValue={initial.categoryId} className="input" required>
              <option value="">Elegir...</option>
              {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            {err("categoryId")}
          </div>
          <div>
            <label className="label" htmlFor="brandId">Marca</label>
            <select id="brandId" name="brandId" defaultValue={initial.brandId ?? ""} className="input">
              <option value="">Sin marca</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="condition">Condición</label>
            <select id="condition" name="condition" defaultValue={initial.condition} className="input">
              <option value="NEW">Nuevo</option>
              <option value="USED">Seminuevo / usado</option>
              <option value="REFURBISHED">Reacondicionado</option>
            </select>
          </div>
        </section>
      </aside>
    </form>
  );
}
