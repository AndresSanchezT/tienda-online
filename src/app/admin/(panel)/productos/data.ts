import "server-only";
import { db } from "@/lib/db";

/** Categorías (con jerarquía "Padre › Hija") y marcas para los selects del formulario. */
export async function getFormOptions() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({ orderBy: [{ sortOrder: "asc" }, { name: "asc" }], include: { parent: { select: { name: true } } } }),
    db.brand.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);
  return {
    categories: categories
      .map((c) => ({ id: c.id, name: c.parent ? `${c.parent.name} › ${c.name}` : c.name }))
      .sort((a, b) => a.name.localeCompare(b.name)),
    brands,
  };
}
