import Link from "next/link";
import { Badge, PageHeader } from "@/components/admin/ui";
import { db } from "@/lib/db";
import {
  orderStatusColor,
  orderStatusLabel,
  paymentMethodShort,
  paymentStatusColor,
  paymentStatusLabel,
} from "@/lib/labels";
import { formatPrice } from "@/lib/money";
import { formatDate } from "@/lib/utils";
import { OrderStatus, PaymentStatus, type Prisma } from "@/generated/prisma/client";

const PER_PAGE = 30;

export default async function OrdersPage(props: PageProps<"/admin/pedidos">) {
  const sp = await props.searchParams;
  const str = (k: string) => (typeof sp[k] === "string" ? (sp[k] as string) : "");
  const estado = str("estado");
  const pago = str("pago");
  const q = str("q").trim();
  const page = Math.max(1, Number(str("page")) || 1);

  const where: Prisma.OrderWhereInput = {};
  if (estado in OrderStatus) where.status = estado as OrderStatus;
  if (pago in PaymentStatus) where.paymentStatus = pago as PaymentStatus;
  if (q) {
    const n = Number(q.replace("#", ""));
    where.OR = [
      ...(Number.isInteger(n) && n > 0 ? [{ number: n }] : []),
      { customerName: { contains: q, mode: "insensitive" } },
      { customerEmail: { contains: q, mode: "insensitive" } },
      { customerPhone: { contains: q } },
      { documentNumber: { contains: q } },
    ];
  }

  const [orders, total] = await Promise.all([
    db.order.findMany({ where, orderBy: { createdAt: "desc" }, take: PER_PAGE, skip: (page - 1) * PER_PAGE }),
    db.order.count({ where }),
  ]);
  const pages = Math.ceil(total / PER_PAGE);

  return (
    <>
      <PageHeader title="Pedidos" />
      <form className="mb-4 flex flex-wrap gap-2">
        <input name="q" defaultValue={q} placeholder="Nº, cliente, correo, DNI..." className="input max-w-xs" />
        <select name="estado" defaultValue={estado} className="input w-auto">
          <option value="">Todos los estados</option>
          {Object.entries(orderStatusLabel).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <select name="pago" defaultValue={pago} className="input w-auto">
          <option value="">Todos los pagos</option>
          {Object.entries(paymentStatusLabel).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
        <button className="btn-primary">Filtrar</button>
      </form>

      <div className="card overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-zinc-200 bg-zinc-50 text-xs text-zinc-500 uppercase">
            <tr>
              <th className="p-3">Pedido</th>
              <th className="p-3">Cliente</th>
              <th className="p-3">Fecha</th>
              <th className="p-3">Medio</th>
              <th className="p-3">Estado</th>
              <th className="p-3">Pago</th>
              <th className="p-3 text-right">Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-100">
            {orders.map((o) => (
              <tr key={o.id} className="hover:bg-zinc-50">
                <td className="p-3">
                  <Link href={`/admin/pedidos/${o.id}`} className="font-semibold text-brand">#{o.number}</Link>
                </td>
                <td className="p-3">
                  {o.customerName}
                  <span className="block text-xs text-zinc-500">{o.customerPhone}</span>
                </td>
                <td className="p-3 whitespace-nowrap text-zinc-500">{formatDate(o.createdAt)}</td>
                <td className="p-3 text-xs">{paymentMethodShort[o.paymentMethod]}</td>
                <td className="p-3"><Badge className={orderStatusColor[o.status]}>{orderStatusLabel[o.status]}</Badge></td>
                <td className="p-3"><Badge className={paymentStatusColor[o.paymentStatus]}>{paymentStatusLabel[o.paymentStatus]}</Badge></td>
                <td className="p-3 text-right font-semibold whitespace-nowrap">{formatPrice(o.total)}</td>
              </tr>
            ))}
            {orders.length === 0 && (
              <tr><td colSpan={7} className="p-8 text-center text-zinc-500">No hay pedidos.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {pages > 1 && (
        <div className="mt-4 flex gap-1">
          {Array.from({ length: pages }, (_, i) => i + 1).map((p) => (
            <Link
              key={p}
              href={`/admin/pedidos?${new URLSearchParams({ q, estado, pago, page: String(p) })}`}
              className={p === page ? "btn-primary px-3 py-1" : "btn-secondary px-3 py-1"}
            >
              {p}
            </Link>
          ))}
        </div>
      )}
    </>
  );
}
