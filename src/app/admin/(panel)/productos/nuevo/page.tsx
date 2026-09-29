import Link from "next/link";
import { PageHeader } from "@/components/admin/ui";
import { getFormOptions } from "../data";
import { ProductForm } from "../product-form";

export default async function NewProductPage() {
  const { categories, brands } = await getFormOptions();

  return (
    <>
      <Link href="/admin/productos" className="text-sm text-zinc-500 hover:text-brand">← Productos</Link>
      <PageHeader title="Nuevo producto" />
      {categories.length === 0 ? (
        <p className="card p-6 text-sm">
          Primero crea al menos una <Link href="/admin/categorias" className="text-brand underline">categoría</Link>.
        </p>
      ) : (
        <ProductForm
          categories={categories}
          brands={brands}
          initial={{
            name: "",
            slug: "",
            description: "",
            sku: null,
            categoryId: "",
            brandId: null,
            price: 0,
            compareAtPrice: null,
            stock: 0,
            images: [],
            specs: [],
            condition: "NEW",
            featured: false,
            active: true,
            variants: [],
          }}
        />
      )}
    </>
  );
}
