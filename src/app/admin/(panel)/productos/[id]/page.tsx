import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { jsonEntries } from "@/lib/utils";
import { deleteProduct } from "../actions";
import { getFormOptions } from "../data";
import { ProductForm } from "../product-form";

export default async function EditProductPage(props: PageProps<"/admin/productos/[id]">) {
  const { id } = await props.params;
  const [product, { categories, brands }] = await Promise.all([
    db.product.findUnique({ where: { id }, include: { variants: { orderBy: { sortOrder: "asc" } } } }),
    getFormOptions(),
  ]);
  if (!product) notFound();

  return (
    <>
      <Link href="/admin/productos" className="text-sm text-zinc-500 hover:text-brand">← Productos</Link>
      <PageHeader
        title={product.name}
        action={
          <div className="flex gap-2">
            <Link href={`/producto/${product.slug}`} target="_blank" className="btn-secondary">Ver en tienda ↗</Link>
            <form action={deleteProduct.bind(null, product.id)}>
              <button className="btn-secondary text-red-600">Eliminar</button>
            </form>
          </div>
        }
      />
      <ProductForm
        categories={categories}
        brands={brands}
        initial={{
          id: product.id,
          name: product.name,
          slug: product.slug,
          description: product.description,
          sku: product.sku,
          categoryId: product.categoryId,
          brandId: product.brandId,
          price: product.price,
          compareAtPrice: product.compareAtPrice,
          stock: product.stock,
          images: product.images,
          specs: jsonEntries(product.specs),
          condition: product.condition,
          featured: product.featured,
          active: product.active,
          variants: product.variants.map((v) => ({
            id: v.id,
            options: Object.fromEntries(jsonEntries(v.options)),
            sku: v.sku,
            price: v.price,
            stock: v.stock,
            image: v.image,
            active: v.active,
          })),
        }}
      />
    </>
  );
}
