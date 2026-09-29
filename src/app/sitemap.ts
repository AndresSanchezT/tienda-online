import type { MetadataRoute } from "next";
import { connection } from "next/server";
import { db } from "@/lib/db";
import { appUrl } from "@/lib/utils";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  await connection();
  const [products, categories] = await Promise.all([
    db.product.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
    db.category.findMany({ where: { active: true }, select: { slug: true, updatedAt: true } }),
  ]);

  return [
    { url: appUrl("/"), changeFrequency: "daily", priority: 1 },
    { url: appUrl("/productos"), changeFrequency: "daily", priority: 0.8 },
    ...categories.map((c) => ({ url: appUrl(`/categoria/${c.slug}`), lastModified: c.updatedAt, priority: 0.7 })),
    ...products.map((p) => ({ url: appUrl(`/producto/${p.slug}`), lastModified: p.updatedAt, priority: 0.6 })),
  ];
}
