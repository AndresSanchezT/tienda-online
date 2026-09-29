import Link from "next/link";
import { cardSummary, type ProductCard as ProductCardData } from "@/lib/catalog";
import { conditionLabel } from "@/lib/labels";
import { discountPercent, formatPrice } from "@/lib/money";

export function ProductCard({ product }: { product: ProductCardData }) {
  const { price, inStock, fromPrice } = cardSummary(product);
  const discount = discountPercent(price, product.compareAtPrice);

  return (
    <Link
      href={`/producto/${product.slug}`}
      className="group card flex flex-col overflow-hidden transition hover:-translate-y-0.5 hover:shadow-lg"
    >
      <div className="relative aspect-square bg-white">
        {product.images[0] ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={product.images[0]}
            alt={product.name}
            loading="lazy"
            className="size-full object-contain p-4 transition group-hover:scale-105"
          />
        ) : (
          <div className="grid size-full place-items-center text-zinc-300">Sin imagen</div>
        )}
        <div className="absolute top-2 left-2 flex flex-col gap-1">
          {discount && <span className="badge bg-red-600 text-white">-{discount}%</span>}
          {product.condition !== "NEW" && (
            <span className="badge bg-zinc-800 text-white">{conditionLabel[product.condition]}</span>
          )}
        </div>
      </div>
      <div className="flex flex-1 flex-col gap-1 border-t border-zinc-100 p-3">
        {product.brand && <p className="text-xs text-zinc-500 uppercase">{product.brand.name}</p>}
        <h3 className="line-clamp-2 text-sm font-medium">{product.name}</h3>
        <div className="mt-auto pt-2">
          {product.compareAtPrice && discount && (
            <p className="text-xs text-zinc-400 line-through">{formatPrice(product.compareAtPrice)}</p>
          )}
          <p className="text-lg font-bold">
            {fromPrice && <span className="text-xs font-normal text-zinc-500">Desde </span>}
            {formatPrice(price)}
          </p>
          {!inStock && <p className="text-xs font-medium text-red-600">Agotado</p>}
        </div>
      </div>
    </Link>
  );
}

export function ProductGrid({ products }: { products: ProductCardData[] }) {
  if (products.length === 0) {
    return <p className="card p-10 text-center text-zinc-500">No se encontraron productos.</p>;
  }
  return (
    <div className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 lg:grid-cols-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
