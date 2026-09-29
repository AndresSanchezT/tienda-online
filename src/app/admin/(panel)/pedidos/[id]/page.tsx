import Link from "next/link";
import { notFound } from "next/navigation";
import { Badge } from "@/components/admin/ui";
import {
  deliveryMethodLabel,
  documentTypeLabel,
  orderStatusColor,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusColor,
  paymentStatusLabel,
} from "@/lib/labels";
import { formatPrice } from "@/lib/money";
import { getOrderWithDetails } from "@/lib/orders";
import { formatDate, whatsappLink } from "@/lib/utils";
import { approvePayment, rejectPayment, saveAdminNotes, setOrderStatus } from "../actions";
import type { OrderStatus } from "@/generated/prisma/enums";

const NEXT_STEP: Partial<Record<OrderStatus, { status: OrderStatus; label: string }>> = {
  PAID: { status: "PROCESSING", label: "Marcar en preparación" },
  PROCESSING: { status: "SHIPPED", label: "Marcar como enviado" },
  SHIPPED: { status: "DELIVERED", label: "Marcar como entregado" },
};

export default async function AdminOrderPage(props: PageProps<"/admin/pedidos/[id]">) {
  const { id } = await props.params;
  const order = await getOrderWithDetails(id);
  if (!order) notFound();

  const isManual = order.paymentMethod !== "MERCADOPAGO";
  const next =
    order.status === "PENDING" && order.paymentMethod === "CASH_ON_DELIVERY"
      ? { status: "PROCESSING" as const, label: "Confirmar y preparar (contra entrega)" }
      : NEXT_STEP[order.status];

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-3">
        <Link href="/admin/pedidos" className="text-sm text-zinc-500 hover:text-brand">← Pedidos</Link>
        <h1 className="text-2xl font-bold">Pedido #{order.number}</h1>
        <Badge className={orderStatusColor[order.status]}>{orderStatusLabel[order.status]}</Badge>
        <Badge className={paymentStatusColor[order.paymentStatus]}>Pago: {paymentStatusLabel[order.paymentStatus]}</Badge>
      </div>

      {order.adminNotes?.includes("⚠") && (
        <p className="rounded-lg bg-red-50 p-3 text-sm whitespace-pre-line text-red-800">{order.adminNotes}</p>
      )}

      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        <div className="space-y-6">
          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Productos</h2>
            <ul className="divide-y divide-zinc-100 text-sm">
              {order.items.map((i) => (
                <li key={i.id} className="flex items-center gap-3 py-2">
                  {i.image && (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={i.image} alt="" className="size-12 rounded border border-zinc-100 object-contain" />
                  )}
                  <div className="flex-1">
                    <p className="font-medium">{i.name}</p>
                    <p className="text-xs text-zinc-500">
                      {i.variantName} {i.sku && `· SKU ${i.sku}`}
                    </p>
                  </div>
                  <p className="text-zinc-500">{i.quantity} × {formatPrice(i.unitPrice)}</p>
                  <p className="w-24 text-right font-semibold">{formatPrice(i.total)}</p>
                </li>
              ))}
            </ul>
            <dl className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
              <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
              <div className="flex justify-between"><dt>Envío</dt><dd>{formatPrice(order.shippingCost)}</dd></div>
              <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
            </dl>
          </section>

          <section className="card p-5">
            <h2 className="mb-3 font-semibold">Pagos — {paymentMethodLabel[order.paymentMethod]}</h2>
            {order.payments.length === 0 && <p className="text-sm text-zinc-500">Sin pagos registrados.</p>}
            <ul className="space-y-3">
              {order.payments.map((p) => (
                <li key={p.id} className="rounded-lg border border-zinc-200 p-3 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <Badge className={paymentStatusColor[p.status]}>{paymentStatusLabel[p.status]}</Badge>{" "}
                      <span className="font-semibold">{formatPrice(p.amount)}</span>
                      <span className="ml-2 text-zinc-500">{formatDate(p.createdAt)}</span>
                    </div>
                    {p.status === "AWAITING_VERIFICATION" && order.status !== "CANCELLED" && (
                      <div className="flex gap-2">
                        <form action={approvePayment.bind(null, order.id, p.id)}>
                          <button className="btn-primary px-3 py-1.5">Aprobar pago</button>
                        </form>
                        <form action={rejectPayment.bind(null, order.id, p.id)}>
                          <button className="btn-secondary px-3 py-1.5 text-red-600">Rechazar</button>
                        </form>
                      </div>
                    )}
                  </div>
                  <div className="mt-2 space-y-1 text-zinc-600">
                    {p.providerPaymentId && <p>ID Mercado Pago: <span className="font-mono">{p.providerPaymentId}</span> ({p.providerMethod})</p>}
                    {p.operationNumber && <p>Nº de operación: <span className="font-mono font-semibold">{p.operationNumber}</span></p>}
                    {p.receiptImage && (
                      <a href={p.receiptImage} target="_blank" rel="noopener noreferrer" className="inline-block">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={p.receiptImage} alt="Voucher" className="mt-1 max-h-60 rounded border border-zinc-200" />
                      </a>
                    )}
                  </div>
                </li>
              ))}
            </ul>
            {isManual && order.status !== "CANCELLED" && order.paymentStatus !== "APPROVED" && (
              <form action={approvePayment.bind(null, order.id, null)} className="mt-3">
                <button className="btn-secondary">Registrar pago recibido manualmente</button>
              </form>
            )}
          </section>

          <section className="card p-5">
            <h2 className="mb-2 font-semibold">Notas internas</h2>
            <form action={saveAdminNotes.bind(null, order.id)} className="space-y-2">
              <textarea
                name="adminNotes"
                defaultValue={order.adminNotes ?? ""}
                rows={3}
                className="input"
                placeholder="Nº de guía, courier, observaciones..."
              />
              <button className="btn-secondary">Guardar notas</button>
            </form>
          </section>
        </div>

        <aside className="space-y-6">
          <section className="card space-y-3 p-5">
            <h2 className="font-semibold">Acciones</h2>
            {next && order.status !== "CANCELLED" && (
              <form action={setOrderStatus.bind(null, order.id, next.status)}>
                <button className="btn-primary w-full">{next.label}</button>
              </form>
            )}
            {order.status !== "CANCELLED" && order.status !== "DELIVERED" && (
              <form action={setOrderStatus.bind(null, order.id, "CANCELLED")}>
                <button className="btn-secondary w-full text-red-600">Cancelar pedido (devuelve stock)</button>
              </form>
            )}
            {order.status === "CANCELLED" && order.paymentStatus === "APPROVED" && (
              <p className="text-sm text-red-700">Pedido cancelado con pago aprobado: recuerda reembolsar al cliente.</p>
            )}
          </section>

          <section className="card space-y-1 p-5 text-sm">
            <h2 className="mb-2 font-semibold">Cliente</h2>
            <p className="font-medium">{order.customerName}</p>
            <p>{order.customerEmail}</p>
            <p>{order.customerPhone}</p>
            <p>{documentTypeLabel[order.documentType]}: {order.documentNumber}</p>
            {order.businessName && <p>Razón social: {order.businessName}</p>}
            <a
              href={whatsappLink(order.customerPhone.length === 9 ? `51${order.customerPhone}` : order.customerPhone, `Hola ${order.customerName}, te escribimos por tu pedido #${order.number}`)}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 inline-block text-[#128c4b] hover:underline"
            >
              Escribir por WhatsApp ↗
            </a>
          </section>

          <section className="card space-y-1 p-5 text-sm">
            <h2 className="mb-2 font-semibold">{deliveryMethodLabel[order.deliveryMethod]}</h2>
            {order.deliveryMethod === "SHIPPING" ? (
              <>
                <p>{order.address}</p>
                <p>{order.district}, {order.province}, {order.department}</p>
                {order.reference && <p className="text-zinc-500">Ref: {order.reference}</p>}
              </>
            ) : (
              <p className="text-zinc-500">El cliente recogerá en tienda.</p>
            )}
            {order.notes && <p className="mt-2 rounded bg-zinc-50 p-2">Nota del cliente: {order.notes}</p>}
          </section>

          <p className="text-xs text-zinc-500">
            Creado: {formatDate(order.createdAt)}
            {order.paidAt && <><br />Pagado: {formatDate(order.paidAt)}</>}
          </p>
        </aside>
      </div>
    </div>
  );
}
