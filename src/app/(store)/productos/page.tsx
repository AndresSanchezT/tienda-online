import type { Metadata } from "next";
import { CatalogView } from "@/components/store/catalog-view";

export const metadata: Metadata = { title: "Catálogo" };

export default async function ProductsPage(props: PageProps<"/productos">) {
  const searchParams = await props.searchParams;
  const q = typeof searchParams.q === "string" ? searchParams.q : "";

  return (
    <>
      <h1 className="mb-4 text-2xl font-bold">{q ? `Resultados para “${q}”` : "Todos los productos"}</h1>
      <CatalogView searchParams={searchParams} basePath="/productos" />
    </>
  );
}
