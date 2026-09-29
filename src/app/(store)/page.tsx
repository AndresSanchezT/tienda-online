import Link from "next/link";
import { ProductGrid } from "@/components/store/product-card";
import { getFeaturedProducts, getLatestProducts, getNavCategories } from "@/lib/catalog";
import { getSettings } from "@/lib/settings";
import { formatPrice } from "@/lib/money";

export default async function HomePage() {
  const [settings, categories, featured, latest] = await Promise.all([
    getSettings(),
    getNavCategories(),
    getFeaturedProducts(8),
    getLatestProducts(8),
  ]);

  return (
    <div className="space-y-12">
      <section className="overflow-hidden rounded-2xl bg-gradient-to-br from-brand to-brand-dark px-6 py-12 text-brand-foreground sm:px-12 sm:py-16">
        <h1 className="max-w-2xl text-3xl font-bold tracking-tight sm:text-5xl">{settings.storeName}</h1>
        <p className="mt-3 max-w-xl text-lg opacity-90">{settings.tagline}</p>
        <div className="mt-6 flex flex-wrap gap-3 text-sm">
          <Link href="/productos" className="btn bg-white text-zinc-900 hover:bg-zinc-100">
            Ver catálogo
          </Link>
        </div>
        <ul className="mt-8 flex flex-wrap gap-x-6 gap-y-2 text-sm opacity-90">
          <li>✓ Paga con tarjeta, Yape o PagoEfectivo</li>
          <li>✓ Envíos a todo el Perú</li>
          {settings.freeShippingFrom != null && <li>✓ Envío gratis desde {formatPrice(settings.freeShippingFrom)}</li>}
        </ul>
      </section>

      {categories.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Categorías</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {categories.map((c) => (
              <Link
                key={c.id}
                href={`/categoria/${c.slug}`}
                className="card flex flex-col items-center gap-2 p-4 text-center text-sm font-medium transition hover:border-brand hover:text-brand"
              >
                {c.image ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={c.image} alt="" className="size-16 object-contain" loading="lazy" />
                ) : (
                  <span className="grid size-16 place-items-center rounded-full bg-zinc-100 text-2xl font-bold text-zinc-400">
                    {c.name.charAt(0)}
                  </span>
                )}
                {c.name}
              </Link>
            ))}
          </div>
        </section>
      )}

      {featured.length > 0 && (
        <section>
          <h2 className="mb-4 text-xl font-bold">Destacados</h2>
          <ProductGrid products={featured} />
        </section>
      )}

      <section>
        <div className="mb-4 flex items-end justify-between">
          <h2 className="text-xl font-bold">Novedades</h2>
          <Link href="/productos" className="text-sm font-medium text-brand hover:underline">
            Ver todo →
          </Link>
        </div>
        <ProductGrid products={latest} />
      </section>
    </div>
  );
}
