import type { Metadata } from "next";
import Link from "next/link";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { logout } from "../login/actions";

export const metadata: Metadata = { title: "Admin", robots: { index: false } };

const nav = [
  { href: "/admin", label: "Resumen" },
  { href: "/admin/pedidos", label: "Pedidos" },
  { href: "/admin/productos", label: "Productos" },
  { href: "/admin/categorias", label: "Categorías y marcas" },
  { href: "/admin/reclamos", label: "Reclamaciones" },
  { href: "/admin/configuracion", label: "Configuración" },
];

export default async function AdminLayout({ children }: LayoutProps<"/admin">) {
  const user = await requireAdmin();
  const [toVerify, openComplaints] = await Promise.all([
    db.order.count({ where: { paymentStatus: "AWAITING_VERIFICATION", status: { not: "CANCELLED" } } }),
    db.complaint.count({ where: { status: "OPEN" } }),
  ]);
  const badges: Record<string, number> = { "/admin/pedidos": toVerify, "/admin/reclamos": openComplaints };

  return (
    <div className="flex min-h-screen flex-col bg-zinc-50 md:flex-row">
      <aside className="border-b border-zinc-200 bg-white md:w-60 md:shrink-0 md:border-r md:border-b-0">
        <div className="flex items-center justify-between p-4 md:block">
          <Link href="/admin" className="text-lg font-bold">Panel</Link>
          <Link href="/" target="_blank" className="text-sm text-brand md:mt-1 md:block">Ver tienda ↗</Link>
        </div>
        <nav className="flex gap-1 overflow-x-auto px-2 pb-2 text-sm md:flex-col md:px-3">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="flex items-center justify-between rounded-lg px-3 py-2 whitespace-nowrap text-zinc-700 hover:bg-zinc-100"
            >
              {item.label}
              {badges[item.href] > 0 && (
                <span className="ml-2 rounded-full bg-orange-500 px-1.5 text-xs font-bold text-white">{badges[item.href]}</span>
              )}
            </Link>
          ))}
        </nav>
        <div className="hidden border-t border-zinc-100 p-4 text-sm md:block">
          <p className="font-medium">{user.name}</p>
          <p className="text-xs text-zinc-500">{user.email}</p>
          <form action={logout} className="mt-2">
            <button className="text-red-600 hover:underline">Cerrar sesión</button>
          </form>
        </div>
      </aside>
      <main className="min-w-0 flex-1 p-4 md:p-8">{children}</main>
    </div>
  );
}
