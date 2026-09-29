import Link from "next/link";
import { Badge, PageHeader, StatCard } from "@/components/admin/ui";
import { db } from "@/lib/db";
import { orderStatusColor, orderStatusLabel, paymentStatusColor, paymentStatusLabel } from "@/lib/labels";
import { formatPrice } from "@/lib/money";
import { getSettings, mercadoPagoConfigured } from "@/lib/settings";
import { formatDate } from "@/lib/utils";

const PAID = ["PAID", "PROCESSING", "SHIPPED", "DELIVERED"] as const;

export default async function DashboardPage() {
  const now = new Date();
  // Inicio del día y del mes en hora de Lima (UTC-5)
  const lima = new Date(now.getTime() - 5 * 3600_000);
  const startOfDay = new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), lima.getUTCDate(), 5));
  const startOfMonth = new Date(Date.UTC(lima.getUTCFullYear(), lima.getUTCMonth(), 1, 5));

  const [settings, today, month, pending, toVerify, lowStockProducts, lowStockVariants, recent] = await Promise.all([
    getSettings(),
    db.order.aggregate({ where: { status: { in: [...PAID] }, paidAt: { gte: startOfDay } }, _sum: { total: true }, _count: true }),
    db.order.aggregate({ where: { status: { in: [...PAID] }, paidAt: { gte: startOfMonth } }, _sum: { total: true }, _count: true }),
    db.order.count({ where: { status: { in: ["PAID", "PROCESSING"] } } }),
    db.order.count({ where: { paymentStatus: "AWAITING_VERIFICATION", status: { not: "CANCELLED" } } }),
    db.product.count({ where: { active: true, stock: { lte: 3 }, variants: { none: {} } } }),
    db.productVariant.count({ where: { active: true, stock: { lte: 3 }, product: { active: true } } }),
    db.order.findMany({ orderBy: { createdAt: "desc" }, take: 10 }),
  ]);

  return (
    <>
      <PageHeader title="Resumen" />

      {settings.mercadoPagoEnabled && !mercadoPagoConfigured(settings.mercadoPagoMode) && (
        <p className="mb-4 rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          Mercado Pago no está configurado, por eso no aparece en el checkout. Agrega <code>MP_ACCESS_TOKEN</code>
          {settings.mercadoPagoMode === "EMBEDDED" && <> y <code>MP_PUBLIC_KEY</code></>} en el archivo <code>.env</code> para
          aceptar tarjetas, Yape y PagoEfectivo.
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Ventas de hoy" value={formatPrice(today._sum.total ?? 0)} hint={`${today._count} pedidos`} />
        <StatCard label="Ventas del mes" value={formatPrice(month._sum.total ?? 0)} hint={`${month._count} pedidos`} />
        <StatCard label="Por despachar" value={pending} href="/admin/pedidos?estado=PAID" />
        <StatCard
          label="Pagos por verificar"
          value={toVerify}
          hint="Yape / Plin / transferencias"
          href="/admin/pedidos?pago=AWAITING_VERIFICATION"
        />
      </div>

      {lowStockProducts + lowStockVariants > 0 && (
        <p className="mt-4 text-sm text-orange-700">
          ⚠ {lowStockProducts + lowStockVariants} productos/variantes con stock bajo (≤ 3).{" "}
          <Link href="/admin/productos?stock=bajo" className="underline">Ver</Link>
        </p>
      )}

      <section className="card mt-8 overflow-x-auto">
        <h2 className="border-b border-zinc-100 p-4 font-semibold">Últimos pedidos</h2>
        <table className="w-full text-left text-sm">
          <tbody className="divide-y divide-zinc-100">
            {recent.map((o) => (
              <tr key={o.id} className="hover:bg-zinc-50">
                <td className="p-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="font-medium text-brand">#{o.number}</Link>
                </td>
                <td className="p-3">{o.customerName}</td>
                <td className="p-3 text-zinc-500">{formatDate(o.createdAt)}</td>
                <td className="p-3"><Badge className={orderStatusColor[o.status]}>{orderStatusLabel[o.status]}</Badge></td>
                <td className="p-3"><Badge className={paymentStatusColor[o.paymentStatus]}>{paymentStatusLabel[o.paymentStatus]}</Badge></td>
                <td className="p-3 text-right font-semibold">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr><td className="p-6 text-center text-zinc-500">Aún no hay pedidos.</td></tr>
            )}
          </tbody>
        </table>
      </section>
    </>
  );
}
