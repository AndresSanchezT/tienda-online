import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { deleteBrand, deleteCategory } from "./actions";
import { BrandForm, CategoryForm } from "./forms";

export default async function CategoriesPage() {
  const [categories, brands] = await Promise.all([
    db.category.findMany({
      orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
      include: { parent: { select: { name: true } }, _count: { select: { products: true } } },
    }),
    db.brand.findMany({ orderBy: { name: "asc" }, include: { _count: { select: { products: true } } } }),
  ]);
  const parents = categories.filter((c) => !c.parentId).map((c) => ({ id: c.id, name: c.name }));

  return (
    <>
      <PageHeader title="Categorías y marcas" />
      <div className="grid gap-8 xl:grid-cols-[1fr_380px]">
        <section className="space-y-4">
          <h2 className="font-semibold">Nueva categoría</h2>
          <CategoryForm parents={parents} />
          <ul className="card divide-y divide-zinc-100">
            {categories.map((c) => (
              <li key={c.id} className="space-y-2 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="font-medium">
                      {c.parent && <span className="text-zinc-400">{c.parent.name} › </span>}
                      {c.name}
                      {!c.active && <span className="ml-2 badge bg-zinc-200 text-zinc-600">Oculta</span>}
                    </p>
                    <p className="text-xs text-zinc-500">/categoria/{c.slug} · {c._count.products} productos</p>
                  </div>
                  <form action={deleteCategory.bind(null, c.id)}>
                    <button className="text-sm text-red-600 hover:underline" title="Si tiene productos solo se oculta">
                      {c._count.products > 0 ? "Ocultar" : "Eliminar"}
                    </button>
                  </form>
                </div>
                <CategoryForm category={c} parents={parents} />
              </li>
            ))}
          </ul>
        </section>

        <section className="space-y-4">
          <h2 className="font-semibold">Marcas</h2>
          <BrandForm />
          <ul className="card divide-y divide-zinc-100 text-sm">
            {brands.map((b) => (
              <li key={b.id} className="flex items-center justify-between p-3">
                <span>
                  {b.name} <span className="text-xs text-zinc-500">({b._count.products})</span>
                </span>
                <form action={deleteBrand.bind(null, b.id)}>
                  <button className="text-red-600 hover:underline">Eliminar</button>
                </form>
              </li>
            ))}
            {brands.length === 0 && <li className="p-4 text-zinc-500">Sin marcas.</li>}
          </ul>
        </section>
      </div>
    </>
  );
}
