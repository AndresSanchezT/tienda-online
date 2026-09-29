import "server-only";
import { cache } from "react";
import { connection } from "next/server";
import { db } from "@/lib/db";
import type { Prisma } from "@/generated/prisma/client";

export const PAGE_SIZE = 24;

const cardSelect = {
  id: true,
  name: true,
  slug: true,
  price: true,
  compareAtPrice: true,
  images: true,
  condition: true,
  stock: true,
  brand: { select: { name: true } },
  variants: { where: { active: true }, select: { price: true, stock: true } },
} satisfies Prisma.ProductSelect;

export type ProductCard = Prisma.ProductGetPayload<{ select: typeof cardSelect }>;

export const getNavCategories = cache(async () => {
  await connection();
  return db.category.findMany({
    where: { active: true, parentId: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    select: { id: true, name: true, slug: true, image: true, children: { where: { active: true }, select: { name: true, slug: true } } },
  });
});

export async function getFeaturedProducts(limit = 8) {
  await connection();
  return db.product.findMany({
    where: { active: true, featured: true },
    orderBy: { updatedAt: "desc" },
    take: limit,
    select: cardSelect,
  });
}

export async function getLatestProducts(limit = 8) {
  await connection();
  return db.product.findMany({ where: { active: true }, orderBy: { createdAt: "desc" }, take: limit, select: cardSelect });
}

export type ProductFilters = {
  q?: string;
  category?: string; // slug (incluye subcategorías)
  brand?: string; // slug
  condition?: "NEW" | "USED" | "REFURBISHED";
  min?: number; // céntimos
  max?: number;
  sort?: "recent" | "price_asc" | "price_desc" | "name";
  page?: number;
};

export async function searchProducts(f: ProductFilters) {
  await connection();
  const where: Prisma.ProductWhereInput = { active: true };

  if (f.q) {
    where.OR = [
      { name: { contains: f.q, mode: "insensitive" } },
      { description: { contains: f.q, mode: "insensitive" } },
      { brand: { name: { contains: f.q, mode: "insensitive" } } },
      { sku: { equals: f.q, mode: "insensitive" } },
    ];
  }
  if (f.category) {
    where.category = { OR: [{ slug: f.category }, { parent: { slug: f.category } }] };
  }
  if (f.brand) where.brand = { slug: f.brand };
  if (f.condition) where.condition = f.condition;
  if (f.min != null || f.max != null) where.price = { gte: f.min, lte: f.max };

  const orderBy: Prisma.ProductOrderByWithRelationInput =
    f.sort === "price_asc"
      ? { price: "asc" }
      : f.sort === "price_desc"
        ? { price: "desc" }
        : f.sort === "name"
          ? { name: "asc" }
          : { createdAt: "desc" };

  const page = Math.max(1, f.page ?? 1);
  const [items, total] = await Promise.all([
    db.product.findMany({ where, orderBy, take: PAGE_SIZE, skip: (page - 1) * PAGE_SIZE, select: cardSelect }),
    db.product.count({ where }),
  ]);
  return { items, total, page, pages: Math.max(1, Math.ceil(total / PAGE_SIZE)) };
}

export const getCategoryBySlug = cache(async (slug: string) => {
  await connection();
  return db.category.findFirst({
    where: { slug, active: true },
    include: { parent: { select: { name: true, slug: true } }, children: { where: { active: true } } },
  });
});

export async function getBrands() {
  await connection();
  return db.brand.findMany({ orderBy: { name: "asc" }, where: { products: { some: { active: true } } } });
}

export const getProductBySlug = cache(async (slug: string) => {
  await connection();
  return db.product.findFirst({
    where: { slug, active: true },
    include: {
      brand: true,
      category: { include: { parent: { select: { name: true, slug: true } } } },
      variants: { where: { active: true }, orderBy: [{ sortOrder: "asc" }, { name: "asc" }] },
    },
  });
});

export async function getRelatedProducts(productId: string, categoryId: string, limit = 4) {
  await connection();
  return db.product.findMany({
    where: { active: true, categoryId, id: { not: productId } },
    take: limit,
    orderBy: { featured: "desc" },
    select: cardSelect,
  });
}

/** Precio mínimo y stock total considerando variantes */
export function cardSummary(p: Pick<ProductCard, "price" | "stock" | "variants">) {
  if (p.variants.length === 0) return { price: p.price, inStock: p.stock > 0, fromPrice: false };
  const prices = p.variants.map((v) => v.price ?? p.price);
  const min = Math.min(...prices);
  return {
    price: min,
    inStock: p.variants.some((v) => v.stock > 0),
    fromPrice: prices.some((x) => x !== min),
  };
}
