"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";

export type FormState = { error?: string; ok?: boolean };

function done(): FormState {
  revalidatePath("/admin/categorias");
  revalidatePath("/", "layout");
  return { ok: true };
}

export async function saveCategory(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 2) return { error: "Nombre muy corto" };
  const slug = slugify(String(fd.get("slug") ?? "") || name);
  const parentId = String(fd.get("parentId") ?? "") || null;
  if (parentId && parentId === id) return { error: "Una categoría no puede ser su propia madre" };

  const data = {
    name,
    slug,
    parentId,
    description: String(fd.get("description") ?? "").trim() || null,
    image: String(fd.get("image") ?? "").trim() || null,
    sortOrder: Number(fd.get("sortOrder")) || 0,
    active: fd.get("active") === "on",
  };

  const clash = await db.category.findFirst({ where: { slug, id: id ? { not: id } : undefined } });
  if (clash) return { error: `Ya existe una categoría con la URL "${slug}"` };

  if (id) await db.category.update({ where: { id }, data });
  else await db.category.create({ data });
  return done();
}

export async function deleteCategory(id: string) {
  await requireAdmin();
  const count = await db.product.count({ where: { categoryId: id } });
  if (count > 0) {
    await db.category.update({ where: { id }, data: { active: false } });
  } else {
    await db.category.delete({ where: { id } });
  }
  done();
}

export async function saveBrand(id: string | null, _prev: FormState, fd: FormData): Promise<FormState> {
  await requireAdmin();
  const name = String(fd.get("name") ?? "").trim();
  if (name.length < 1) return { error: "Nombre obligatorio" };
  const slug = slugify(name);
  const clash = await db.brand.findFirst({ where: { slug, id: id ? { not: id } : undefined } });
  if (clash) return { error: "Esa marca ya existe" };
  const data = { name, slug, logo: String(fd.get("logo") ?? "").trim() || null };
  if (id) await db.brand.update({ where: { id }, data });
  else await db.brand.create({ data });
  return done();
}

export async function deleteBrand(id: string) {
  await requireAdmin();
  await db.brand.delete({ where: { id } }); // los productos quedan "sin marca" (onDelete: SetNull)
  done();
}
