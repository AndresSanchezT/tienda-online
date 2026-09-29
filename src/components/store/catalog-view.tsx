import Link from "next/link";
import { getBrands, searchProducts, type ProductFilters } from "@/lib/catalog";
import { toCents } from "@/lib/money";
import { ProductGrid } from "./product-card";

type SearchParams = Record<string, string | string[] | undefined>;

const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v) || undefined;

export function parseFilters(sp: SearchParams, category?: string): ProductFilters {
  const min = one(sp.min) ? toCents(one(sp.min)!) : undefined;
  const max = one(sp.max) ? toCents(one(sp.max)!) : undefined;
  const condition = one(sp.estado);
  const sort = one(sp.orden);
  return {
    q: one(sp.q)?.slice(0, 100),
    category: category ?? one(sp.categoria),
    brand: one(sp.marca),
    condition: condition === "NEW" || condition === "USED" || condition === "REFURBISHED" ? condition : undefined,
    min: Number.isFinite(min) ? min : undefined,
    max: Number.isFinite(max) ? max : undefined,
    sort: sort === "price_asc" || sort === "price_desc" || sort === "name" ? sort : "recent",
    page: Number(one(sp.page)) || 1,
  };
}

/** Listado con filtros reutilizado en /productos y /categoria/[slug]. Filtros vía GET (compartibles y SEO-friendly). */
export async function CatalogView({
  searchParams,
  basePath,
  category,
}: {
  searchParams: SearchParams;
  basePath: string;
  category?: string;
}) {
  const filters = parseFilters(searchParams, category);
  const [{ items, total, page, pages }, brands] = await Promise.all([searchProducts(filters), getBrands()]);

  const pageHref = (p: number) => {
    const params = new URLSearchParams();
    for (const [k, v] of Object.entries(searchParams)) if (typeof v === "string" && v && k !== "page") params.set(k, v);
    params.set("page", String(p));
    return `${basePath}?${params}`;
  };

  return (
    <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
      <aside>
        <form action={basePath} className="card space-y-4 p-4 text-sm">
          {filters.q && <input type="hidden" name="q" value={filters.q} />}
          <div>
            <label className="label" htmlFor="marca">Marca</label>
            <select id="marca" name="marca" defaultValue={filters.brand ?? ""} className="input">
              <option value="">Todas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.slug}>{b.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="estado">Condición</label>
            <select id="estado" name="estado" defaultValue={filters.condition ?? ""} className="input">
              <option value="">Todas</option>
              <option value="NEW">Nuevo</option>
              <option value="USED">Seminuevo</option>
              <option value="REFURBISHED">Reacondicionado</option>
            </select>
          </div>
          <div>
            <span className="label">Precio (S/)</span>
            <div className="flex gap-2">
              <input name="min" inputMode="decimal" placeholder="Mín" defaultValue={one(searchParams.min)} className="input" />
              <input name="max" inputMode="decimal" placeholder="Máx" defaultValue={one(searchParams.max)} className="input" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="orden">Ordenar por</label>
            <select id="orden" name="orden" defaultValue={filters.sort} className="input">
              <option value="recent">Más recientes</option>
              <option value="price_asc">Menor precio</option>
              <option value="price_desc">Mayor precio</option>
              <option value="name">Nombre</option>
            </select>
          </div>
          <div className="flex gap-2">
            <button className="btn-primary flex-1">Filtrar</button>
            <Link href={basePath} className="btn-secondary">Limpiar</Link>
          </div>
        </form>
      </aside>

      <section>
        <p className="mb-3 text-sm text-zinc-500">
          {total} producto{total === 1 ? "" : "s"}
          {filters.q && <> para “{filters.q}”</>}
        </p>
        <ProductGrid products={items} />
        {pages > 1 && (
          <nav className="mt-6 flex justify-center gap-1" aria-label="Paginación">
            {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
              <Link
                key={p}
                href={pageHref(p)}
                className={p === page ? "btn-primary px-3 py-1.5" : "btn-secondary px-3 py-1.5"}
                aria-current={p === page ? "page" : undefined}
              >
                {p}
              </Link>
            ))}
          </nav>
        )}
      </section>
    </div>
  );
}
