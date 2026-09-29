import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { CatalogView } from "@/components/store/catalog-view";
import { getCategoryBySlug } from "@/lib/catalog";

export async function generateMetadata(props: PageProps<"/categoria/[slug]">): Promise<Metadata> {
  const { slug } = await props.params;
  const category = await getCategoryBySlug(slug);
  if (!category) return {};
  return { title: category.name, description: category.description ?? undefined };
}

export default async function CategoryPage(props: PageProps<"/categoria/[slug]">) {
  const [{ slug }, searchParams] = await Promise.all([props.params, props.searchParams]);
  const category = await getCategoryBySlug(slug);
  if (!category) notFound();

  return (
    <>
      <nav className="mb-2 text-sm text-zinc-500">
        <Link href="/" className="hover:text-brand">Inicio</Link>
        {category.parent && (
          <>
            {" / "}
            <Link href={`/categoria/${category.parent.slug}`} className="hover:text-brand">{category.parent.name}</Link>
          </>
        )}
      </nav>
      <h1 className="text-2xl font-bold">{category.name}</h1>
      {category.description && <p className="mt-1 text-zinc-600">{category.description}</p>}
      {category.children.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {category.children.map((c) => (
            <Link key={c.id} href={`/categoria/${c.slug}`} className="btn-secondary py-1.5">
              {c.name}
            </Link>
          ))}
        </div>
      )}
      <div className="mt-5">
        <CatalogView searchParams={searchParams} basePath={`/categoria/${slug}`} category={slug} />
      </div>
    </>
  );
}
