"use client";

import { useActionState, useState } from "react";
import { SingleImageInput } from "@/components/admin/image-uploader";
import { saveBrand, saveCategory, type FormState } from "./actions";

type Category = {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  image: string | null;
  parentId: string | null;
  sortOrder: number;
  active: boolean;
};

export function CategoryForm({ category, parents }: { category?: Category; parents: { id: string; name: string }[] }) {
  const [open, setOpen] = useState(!category);
  const [state, action, pending] = useActionState<FormState, FormData>(saveCategory.bind(null, category?.id ?? null), {});

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="text-sm text-brand hover:underline">
        Editar
      </button>
    );
  }

  return (
    <form action={action} className="grid gap-3 rounded-lg bg-zinc-50 p-4 sm:grid-cols-2">
      <div>
        <label className="label">Nombre</label>
        <input name="name" defaultValue={category?.name} className="input" required placeholder="Celulares" />
      </div>
      <div>
        <label className="label">URL (slug)</label>
        <input name="slug" defaultValue={category?.slug} className="input" placeholder="automático" />
      </div>
      <div>
        <label className="label">Categoría madre</label>
        <select name="parentId" defaultValue={category?.parentId ?? ""} className="input">
          <option value="">— Ninguna (principal) —</option>
          {parents.filter((p) => p.id !== category?.id).map((p) => (
            <option key={p.id} value={p.id}>{p.name}</option>
          ))}
        </select>
      </div>
      <div>
        <label className="label">Orden</label>
        <input name="sortOrder" type="number" defaultValue={category?.sortOrder ?? 0} className="input" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">Descripción</label>
        <input name="description" defaultValue={category?.description ?? ""} className="input" />
      </div>
      <div>
        <label className="label">Imagen</label>
        <SingleImageInput name="image" defaultValue={category?.image} />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="active" defaultChecked={category?.active ?? true} /> Visible
      </label>
      <div className="flex items-center gap-3 sm:col-span-2">
        <button className="btn-primary" disabled={pending}>{category ? "Guardar" : "Crear categoría"}</button>
        {category && <button type="button" className="text-sm text-zinc-500" onClick={() => setOpen(false)}>Cerrar</button>}
        {state.error && <span className="text-sm text-red-600">{state.error}</span>}
        {state.ok && <span className="text-sm text-emerald-700">✓ Guardado</span>}
      </div>
    </form>
  );
}

export function BrandForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(saveBrand.bind(null, null), {});
  return (
    <form action={action} className="flex flex-wrap items-center gap-2">
      <input name="name" className="input max-w-xs" placeholder="Nueva marca (Apple, Samsung, Toyota...)" required />
      <button className="btn-primary" disabled={pending}>Agregar</button>
      {state.error && <span className="text-sm text-red-600">{state.error}</span>}
    </form>
  );
}
