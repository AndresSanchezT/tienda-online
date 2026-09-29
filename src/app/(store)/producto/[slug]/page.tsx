import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AddToCart } from "@/components/store/add-to-cart";
import { ProductGrid } from "@/components/store/product-card";
import { ProductGallery } from "@/components/store/product-gallery";
import { cardSummary, getProductBySlug, getRelatedProducts } from "@/lib/catalog";
import { conditionLabel } from "@/lib/labels";
import { getSettings } from "@/lib/settings";
import { appUrl, jsonEntries, whatsappLink } from "@/lib/utils";

export async function generateMetadata(props: PageProps<"/producto/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const product = await getProductBySlug(slug);
  if (!product) return {};
  const description = product.description.slice(0, 160) || product.name;
  return {
    title: product.name,
    description,
    alternates: { canonical: `/producto/${product.slug}` },
    openGraph: { title: product.name, description, images: product.images.slice(0, 1) },
  };
}

export default async function ProductPage(props: PageProps<"/producto/[slug]">) {
  const { slug } = await props.params;
  const [product, settings] = await Promise.all([getProductBySlug(slug), getSettings()]);
  if (!product) notFound();

  const related = await getRelatedProducts(product.id, product.categoryId);
  const specs = jsonEntries(product.specs);
  const summary = cardSummary(product);

  // Datos estructurados para Google (precio, stock, marca) => mejores resultados de búsqueda
  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: product.images.map((i) => (i.startsWith("http") ? i : appUrl(i))),
    sku: product.sku ?? undefined,
    brand: product.brand ? { "@type": "Brand", name: product.brand.name } : undefined,
    itemCondition: `https://schema.org/${product.condition === "NEW" ? "NewCondition" : product.condition === "USED" ? "UsedCondition" : "RefurbishedCondition"}`,
    offers: {
      "@type": "Offer",
      priceCurrency: "PEN",
      price: (summary.price / 100).toFixed(2),
      availability: `https://schema.org/${summary.inStock ? "InStock" : "OutOfStock"}`,
      url: appUrl(`/producto/${product.slug}`),
    },
  };

  return (
    <div className="space-y-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }}
      />

      <nav className="text-sm text-zinc-500">
        <Link href="/" className="hover:text-brand">Inicio</Link>
        {product.category.parent && (
          <>
            {" / "}
            <Link href={`/categoria/${product.category.parent.slug}`} className="hover:text-brand">
              {product.category.parent.name}
            </Link>
          </>
        )}
        {" / "}
        <Link href={`/categoria/${product.category.slug}`} className="hover:text-brand">{product.category.name}</Link>
      </nav>

      <div className="grid gap-8 md:grid-cols-2">
        <ProductGallery images={product.images} alt={product.name} />

        <div className="space-y-5">
          <div>
            {product.brand && <p className="text-sm font-medium text-zinc-500 uppercase">{product.brand.name}</p>}
            <h1 className="text-2xl font-bold sm:text-3xl">{product.name}</h1>
            <div className="mt-2 flex gap-2 text-xs">
              <span className="badge bg-zinc-100 text-zinc-700">{conditionLabel[product.condition]}</span>
              {product.sku && <span className="badge bg-zinc-100 text-zinc-500">SKU {product.sku}</span>}
            </div>
          </div>

          <AddToCart
            product={{
              id: product.id,
              slug: product.slug,
              name: product.name,
              price: product.price,
              compareAtPrice: product.compareAtPrice,
              stock: product.stock,
              image: product.images[0],
            }}
            variants={product.variants.map((v) => ({
              id: v.id,
              name: v.name,
              options: Object.fromEntries(jsonEntries(v.options)),
              price: v.price ?? product.price,
              stock: v.stock,
              image: v.image,
            }))}
          />

          {settings.whatsapp && (
            <a
              href={whatsappLink(settings.whatsapp, `Hola, me interesa: ${product.name} ${appUrl(`/producto/${product.slug}`)}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="btn w-full border border-[#25d366] text-[#128c4b] hover:bg-[#25d366]/10"
            >
              Consultar por WhatsApp
            </a>
          )}

          <ul className="space-y-1 rounded-xl bg-white p-4 text-sm text-zinc-600">
            <li>💳 Tarjetas, Yape, PagoEfectivo y transferencia</li>
            <li>🚚 Envíos a todo el Perú{settings.pickupEnabled && " · Recojo en tienda"}</li>
            <li>🧾 Boleta o factura electrónica</li>
          </ul>
        </div>
      </div>

      {(product.description || specs.length > 0) && (
        <div className="grid gap-8 md:grid-cols-2">
          {product.description && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Descripción</h2>
              <div className="whitespace-pre-line text-zinc-700">{product.description}</div>
            </section>
          )}
          {specs.length > 0 && (
            <section>
              <h2 className="mb-3 text-lg font-bold">Especificaciones</h2>
              <dl className="card divide-y divide-zinc-100 text-sm">
                {specs.map(([k, v]) => (
                  <div key={k} className="grid grid-cols-2 gap-4 px-4 py-2.5">
                    <dt className="text-zinc-500">{k}</dt>
                    <dd className="font-medium">{v}</dd>
                  </div>
                ))}
              </dl>
            </section>
          )}
        </div>
      )}

      {related.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-bold">También te puede interesar</h2>
          <ProductGrid products={related} />
        </section>
      )}
    </div>
  );
}
