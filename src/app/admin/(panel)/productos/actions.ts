"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { fieldErrors } from "@/lib/validators";
import { Prisma } from "@/generated/prisma/client";

const cents = z.number().int().min(0).max(1_000_000_000);
const optionalText = z.string().trim().max(120).nullable().optional().transform((v) => v || null);

const productSchema = z.object({
  name: z.string().trim().min(2, "Nombre obligatorio").max(200),
  slug: z.string().trim().max(200).optional(),
  description: z.string().max(20_000).default(""),
  sku: optionalText,
  categoryId: z.string().min(1, "Elige una categoría"),
  brandId: z.string().nullable().optional().transform((v) => v || null),
  price: cents.refine((v) => v > 0, "El precio debe ser mayor a 0"),
  compareAtPrice: cents.nullable(),
  stock: z.number().int().min(0).max(1_000_000),
  images: z.array(z.string().max(1000)).max(20),
  specs: z.array(z.tuple([z.string().trim().max(80), z.string().trim().max(500)])).max(100),
  condition: z.enum(["NEW", "USED", "REFURBISHED"]),
  featured: z.boolean(),
  active: z.boolean(),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        options: z.record(z.string(), z.string().trim().max(80)),
        sku: optionalText,
        price: cents.nullable(),
        stock: z.number().int().min(0).max(1_000_000),
        image: z.string().max(1000).nullable().optional(),
        active: z.boolean(),
      }),
    )
    .max(200),
});

export type ProductPayload = z.input<typeof productSchema>;
export type SaveProductState = { errors?: Record<string, string> };

export async function saveProduct(productId: string | null, payload: ProductPayload): Promise<SaveProductState> {
  await requireAdmin();
  const parsed = productSchema.safeParse(payload);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };
  const { variants, specs, slug: rawSlug, ...data } = parsed.data;

  const slug = slugify(rawSlug || data.name);
  if (!slug) return { errors: { slug: "Slug inválido" } };

  const productData = {
    ...data,
    slug,
    specs: Object.fromEntries(specs.filter(([k, v]) => k && v)),
  };

  try {
    const id = await db.$transaction(async (tx) => {
      const product = productId
        ? await tx.product.update({ where: { id: productId }, data: productData })
        : await tx.product.create({ data: productData });

      // Sincroniza variantes: actualiza las existentes, crea nuevas y elimina las quitadas
      const existing = await tx.productVariant.findMany({
        where: { productId: product.id },
        select: { id: true, _count: { select: { orderItems: true } } },
      });
      const keep = new Set(variants.map((v) => v.id).filter(Boolean));
      for (const old of existing.filter((e) => !keep.has(e.id))) {
        // Si ya se vendió, se desactiva para no romper el historial de pedidos
        if (old._count.orderItems > 0) await tx.productVariant.update({ where: { id: old.id }, data: { active: false } });
        else await tx.productVariant.delete({ where: { id: old.id } });
      }
      for (const [i, v] of variants.entries()) {
        const options = Object.fromEntries(Object.entries(v.options).filter(([k, val]) => k && val));
        const vData = {
          name: Object.values(options).join(" / ") || `Opción ${i + 1}`,
          options,
          sku: v.sku,
          price: v.price,
          stock: v.stock,
          image: v.image || null,
          active: v.active,
          sortOrder: i,
        };
        if (v.id && existing.some((e) => e.id === v.id)) {
          await tx.productVariant.update({ where: { id: v.id }, data: vData });
        } else {
          await tx.productVariant.create({ data: { ...vData, productId: product.id } });
        }
      }
      return product.id;
    });

    revalidatePath("/admin/productos");
    revalidatePath(`/admin/productos/${id}`);
  } catch (e) {
    if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002") {
      const target = String(e.meta?.target ?? e.message);
      return { errors: { [target.includes("slug") ? "slug" : "sku"]: "Ya existe otro producto/variante con ese valor" } };
    }
    throw e;
  }
  redirect("/admin/productos");
}

export async function toggleProductActive(id: string) {
  await requireAdmin();
  const p = await db.product.findUniqueOrThrow({ where: { id }, select: { active: true } });
  await db.product.update({ where: { id }, data: { active: !p.active } });
  revalidatePath("/admin/productos");
}

export async function deleteProduct(id: string) {
  await requireAdmin();
  const sold = await db.orderItem.count({ where: { productId: id } });
  if (sold > 0) {
    // Con ventas: solo se oculta para conservar el historial
    await db.product.update({ where: { id }, data: { active: false } });
  } else {
    await db.product.delete({ where: { id } });
  }
  revalidatePath("/admin/productos");
  redirect("/admin/productos");
}
