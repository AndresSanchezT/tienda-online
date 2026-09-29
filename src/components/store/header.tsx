import Link from "next/link";
import { getNavCategories } from "@/lib/catalog";
import type { Settings } from "@/lib/settings";
import { CartButton } from "./cart-button";

export async function Header({ settings }: { settings: Settings }) {
  const categories = await getNavCategories();

  return (
    <header className="sticky top-0 z-30 border-b border-zinc-200 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-7xl items-center gap-4 px-4 py-3">
        <Link href="/" className="flex shrink-0 items-center gap-2 text-lg font-bold">
          {settings.logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={settings.logo} alt={settings.storeName} className="h-9 w-auto" />
          ) : (
            <span className="grid size-9 place-items-center rounded-lg bg-brand text-brand-foreground">
              {settings.storeName.charAt(0)}
            </span>
          )}
          <span className="hidden sm:inline">{settings.storeName}</span>
        </Link>

        <form action="/productos" className="flex flex-1">
          <input
            name="q"
            type="search"
            placeholder="Buscar productos, marcas..."
            className="input rounded-r-none"
            aria-label="Buscar"
          />
          <button className="btn-primary rounded-l-none px-3" aria-label="Buscar">
            <svg className="size-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 21-5.2-5.2M17 10.5a6.5 6.5 0 1 1-13 0 6.5 6.5 0 0 1 13 0Z" />
            </svg>
          </button>
        </form>

        <CartButton />
      </div>

      {categories.length > 0 && (
        <nav className="border-t border-zinc-100">
          <ul className="mx-auto flex max-w-7xl gap-1 overflow-x-auto px-4 text-sm">
            <li>
              <Link href="/productos" className="block px-3 py-2 whitespace-nowrap text-zinc-600 hover:text-brand">
                Todo
              </Link>
            </li>
            {categories.map((c) => (
              <li key={c.id}>
                <Link
                  href={`/categoria/${c.slug}`}
                  className="block px-3 py-2 whitespace-nowrap text-zinc-600 hover:text-brand"
                >
                  {c.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}
    </header>
  );
}
