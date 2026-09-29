import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import type { Prisma } from "@/generated/prisma/client";
import { toggleProductActive } from "./actions";

export default async function AdminProductsPage(props: PageProps<"/admin/productos">) {
  const sp = await props.searchParams;
  const q = typeof sp.q === "string" ? sp.q.trim() : "";
  const categoryId = typeof sp.categoria === "string" ? sp.categoria : "";
  const lowStock = sp.stock === "bajo";

  const where: Prisma.ProductWhereInput = {};
  if (q) {
    where.OR = [
      { name: { contains: q, mode: "insensitive" } },
      { sku: { contains: q, mode: "insensitive" } },
      { variants: { some: { sku: { contains: q, mode: "insensitive" } } } },
    ];
  }
  if (categoryId) where.categoryId = categoryId;
  if (lowStock) {
    where.active = true;
    where.AND = [
      { OR: [{ variants: { none: {} }, stock: { lte: 3 } }, { variants: { some: { active: true, stock: { lte: 3 } } } }] },
    ];
  }

  const [products, categories] = await Promise.all([
    db.product.findMany({
      where,
      orderBy: { updatedAt: "desc" },
      take: 200,
      include: {
        category: { select: { name: true } },
        brand: { select: { name: true } },
        variants: { where: { active: true }, select: { stock: true } },
      },
    }),
    db.category.findMany({ orderBy: { name: "asc" }, select: { id: true, name: true } }),
  ]);

  return (
    <>
      <PageHeader title="Productos" action={<Link href="/admin/productos/nuevo" className="btn-primary">+ Nuevo producto</Link>} />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Nombre o SKU..." className="input max-w-xs" />
        <select name="categoria" defaultValue={categoryId} className="input w-auto">
          <option value="">Todas las categorías</option>
          {categories.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
        </select>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="stock" value="bajo" defaultChecked={lowStock} /> Stock bajo
        </label>
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 uppercase">
            <tr>
              <th className="p-3">Producto</th>
              <th className="p-3">Categoría</th>
              <th className="p-3 text-right">Precio</th>
              <th className="p-3 text-right">Stock</th>
              <th className="p-3">Estado</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {products.map((p) => {
              const stock = p.variants.length ? p.variants.reduce((n, v) => n + v.stock, 0) : p.stock;
              return (
                <tr key={p.id} className="hover:bg-zinc-50">
                  <td className="p-3">
                    <Link href={`/admin/productos/${p.id}`} className="flex items-center gap-3">
                      <span className="size-12 shrink-0 rounded border border-zinc-100 bg-white">
                        {p.images[0] && (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.images[0]} alt="" className="size-full object-contain" />
                        )}
                      </span>
                      <span>
                        <span className="font-medium text-brand">{p.name}</span>
                        <span className="block text-xs text-zinc-500">
                          {p.brand?.name} {p.variants.length > 0 && `· ${p.variants.length} variantes`} {p.featured && "· ★ Destacado"}
                        </span>
                      </span>
                    </Link>
                  </td>
                  <td className="p-3 text-zinc-600">{p.category.name}</td>
                  <td className="p-3 text-right whitespace-nowrap">{formatPrice(p.price)}</td>
                  <td className={`p-3 text-right font-medium ${stock <= 3 ? "text-red-600" : ""}`}>{stock}</td>
                  <td className="p-3">
                    <form action={toggleProductActive.bind(null, p.id)}>
                      <button className={`badge ${p.active ? "bg-emerald-100 text-emerald-800" : "bg-zinc-200 text-zinc-600"}`}>
                        {p.active ? "Visible" : "Oculto"}
                      </button>
                    </form>
                  </td>
                </tr>
              );
            })}
            {products.length === 0 && (
              <tr><td colSpan={5} className="p-8 text-center text-zinc-500">No hay productos.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </>
  );
}
