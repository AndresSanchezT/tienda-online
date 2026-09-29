import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { getOrderWithDetails } from "@/lib/orders";
import { syncMercadoPagoPayment } from "@/lib/payments/mercadopago";
import { getSettings, mercadoPagoConfigured, mercadoPagoPublicKey, type Settings } from "@/lib/settings";
import {
  deliveryMethodLabel,
  orderStatusColor,
  orderStatusLabel,
  paymentMethodLabel,
  paymentStatusColor,
  paymentStatusLabel,
} from "@/lib/labels";
import { formatPrice } from "@/lib/money";
import { formatDate, whatsappLink } from "@/lib/utils";
import { retryMercadoPago } from "./actions";
import { MercadoPagoCheckout } from "./mercadopago-checkout";
import { ReportPaymentForm } from "./report-payment-form";

export const metadata: Metadata = { title: "Tu pedido", robots: { index: false } };

export default async function OrderPage(props: PageProps<"/pedido/[id]">) {
  const [{ id }, sp] = await Promise.all([props.params, props.searchParams]);

  // Al volver de Mercado Pago llega ?payment_id=... Consultamos el estado real a la API de MP
  // (útil en local, donde el webhook no puede llegar; en producción el webhook también lo hace).
  const paymentId = typeof sp.payment_id === "string" && /^\d+$/.test(sp.payment_id) ? sp.payment_id : null;
  if (paymentId && sp.external_reference === id) {
    await syncMercadoPagoPayment(paymentId).catch((e) => console.error("[pedido] sync MP", e));
  }

  const [order, settings] = await Promise.all([getOrderWithDetails(id), getSettings()]);
  if (!order) notFound();

  const isPaid = order.paymentStatus === "APPROVED";
  const isOpen = order.status === "PENDING";

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div className="card p-6 text-center">
        <p className="text-sm text-zinc-500">Pedido #{order.number}</p>
        <h1 className="mt-1 text-2xl font-bold">
          {order.status === "CANCELLED"
            ? "Pedido cancelado"
            : isPaid
              ? "¡Gracias por tu compra! 🎉"
              : order.paymentStatus === "AWAITING_VERIFICATION"
                ? "Estamos verificando tu pago"
                : order.paymentMethod === "CASH_ON_DELIVERY"
                  ? "¡Pedido registrado!"
                  : "Completa tu pago"}
        </h1>
        <div className="mt-3 flex justify-center gap-2">
          <span className={`badge ${orderStatusColor[order.status]}`}>{orderStatusLabel[order.status]}</span>
          <span className={`badge ${paymentStatusColor[order.paymentStatus]}`}>
            Pago: {paymentStatusLabel[order.paymentStatus]}
          </span>
        </div>
        <p className="mt-3 text-sm text-zinc-500">
          Guarda esta página para ver el estado de tu pedido. Te contactaremos al {order.customerPhone}.
        </p>
      </div>

      {sp.mp_error && isOpen && !isPaid && (
        <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
          No pudimos conectar con Mercado Pago. Tu pedido está guardado; intenta pagar nuevamente.
        </p>
      )}

      {isOpen && !isPaid && <PaymentInstructions order={order} settings={settings} />}

      <section className="card p-5">
        <h2 className="mb-3 font-semibold">Detalle</h2>
        <ul className="divide-y divide-zinc-100 text-sm">
          {order.items.map((i) => (
            <li key={i.id} className="flex justify-between gap-3 py-2">
              <span>
                {i.quantity} × {i.name}
                {i.variantName && <span className="block text-xs text-zinc-500">{i.variantName}</span>}
              </span>
              <span className="font-medium">{formatPrice(i.total)}</span>
            </li>
          ))}
        </ul>
        <dl className="mt-3 space-y-1 border-t border-zinc-100 pt-3 text-sm">
          <div className="flex justify-between"><dt>Subtotal</dt><dd>{formatPrice(order.subtotal)}</dd></div>
          <div className="flex justify-between"><dt>Envío</dt><dd>{order.shippingCost ? formatPrice(order.shippingCost) : "Gratis"}</dd></div>
          <div className="flex justify-between text-base font-bold"><dt>Total</dt><dd>{formatPrice(order.total)}</dd></div>
        </dl>
      </section>

      <section className="card grid gap-4 p-5 text-sm sm:grid-cols-2">
        <div>
          <h2 className="mb-1 font-semibold">{deliveryMethodLabel[order.deliveryMethod]}</h2>
          {order.deliveryMethod === "SHIPPING" ? (
            <p className="text-zinc-600">
              {order.address}
              <br />
              {order.district}, {order.province}, {order.department}
              {order.reference && <><br />Ref: {order.reference}</>}
            </p>
          ) : (
            <p className="text-zinc-600">{settings.pickupAddress}</p>
          )}
        </div>
        <div>
          <h2 className="mb-1 font-semibold">Pago</h2>
          <p className="text-zinc-600">{paymentMethodLabel[order.paymentMethod]}</p>
          <p className="text-zinc-500">{formatDate(order.createdAt)}</p>
        </div>
      </section>

      {settings.whatsapp && (
        <a
          href={whatsappLink(settings.whatsapp, `Hola, consulto por mi pedido #${order.number}`)}
          target="_blank"
          rel="noopener noreferrer"
          className="btn-secondary w-full"
        >
          ¿Dudas? Escríbenos por WhatsApp
        </a>
      )}
    </div>
  );
}

type OrderDetail = NonNullable<Awaited<ReturnType<typeof getOrderWithDetails>>>;

function PaymentInstructions({ order, settings }: { order: OrderDetail; settings: Settings }) {
  const amount = formatPrice(order.total);

  if (order.paymentMethod === "MERCADOPAGO" && settings.mercadoPagoMode === "EMBEDDED" && mercadoPagoConfigured("EMBEDDED")) {
    // Código de PagoEfectivo ya generado y pendiente de pago
    const pendingTicket = order.payments
      .filter((p) => p.method === "MERCADOPAGO" && p.status === "PENDING")
      .map((p) => (p.raw as { ticket_url?: string } | null)?.ticket_url)
      .find(Boolean);
    const [firstName, ...rest] = order.customerName.split(" ");

    return (
      <div className="space-y-3">
        {order.paymentStatus === "REJECTED" && (
          <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">Tu último intento de pago fue rechazado. Inténtalo con otro medio.</p>
        )}
        {pendingTicket && (
          <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-800">
            Tienes un código de pago pendiente.{" "}
            <a href={pendingTicket} target="_blank" rel="noopener noreferrer" className="font-semibold underline">Ver código</a>
            {" "}· También puedes pagar con otro medio aquí abajo.
          </p>
        )}
        <MercadoPagoCheckout
          orderId={order.id}
          publicKey={mercadoPagoPublicKey()}
          amount={order.total}
          payer={{
            email: order.customerEmail,
            firstName,
            lastName: rest.join(" "),
            docType: order.documentType,
            docNumber: order.documentNumber,
          }}
        />
      </div>
    );
  }

  if (order.paymentMethod === "MERCADOPAGO") {
    return (
      <section className="card space-y-3 p-5 text-center">
        <p className="text-sm text-zinc-600">
          {order.paymentStatus === "REJECTED"
            ? "Tu pago fue rechazado. Puedes intentarlo nuevamente con otra tarjeta o medio de pago."
            : "Paga de forma segura con tarjeta, Yape o PagoEfectivo a través de Mercado Pago."}
        </p>
        <form action={retryMercadoPago.bind(null, order.id)}>
          <button className="btn-primary w-full py-3">Pagar {amount} con Mercado Pago</button>
        </form>
      </section>
    );
  }

  if (order.paymentMethod === "CASH_ON_DELIVERY") {
    return (
      <section className="card p-5 text-sm text-zinc-700">
        Pagarás <strong>{amount}</strong> al recibir tu pedido. Te contactaremos para coordinar la entrega.
      </section>
    );
  }

  const wallet =
    order.paymentMethod === "YAPE"
      ? { name: "Yape", phone: settings.yapePhone, holder: settings.yapeHolder, qr: settings.yapeQr }
      : order.paymentMethod === "PLIN"
        ? { name: "Plin", phone: settings.plinPhone, holder: settings.plinHolder, qr: settings.plinQr }
        : null;

  return (
    <section className="card grid gap-6 p-5 sm:grid-cols-2">
      <div className="space-y-3 text-sm">
        <h2 className="text-base font-semibold">
          {wallet ? `Paga con ${wallet.name}` : "Transferencia bancaria"}
        </h2>
        <p>
          Monto a pagar: <strong className="text-lg">{amount}</strong>
        </p>
        {wallet ? (
          <>
            {wallet.qr && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={wallet.qr} alt={`QR ${wallet.name}`} className="size-48 rounded-lg border border-zinc-200" />
            )}
            <p>
              Número: <strong className="font-mono text-base">{wallet.phone}</strong>
              {wallet.holder && <><br />A nombre de: {wallet.holder}</>}
            </p>
          </>
        ) : (
          <pre className="rounded-lg bg-zinc-50 p-3 font-sans whitespace-pre-wrap">{settings.bankAccounts}</pre>
        )}
        <p className="text-zinc-500">
          En el mensaje/concepto escribe: <strong>Pedido {order.number}</strong>
        </p>
      </div>
      <div>
        {order.paymentStatus === "AWAITING_VERIFICATION" ? (
          <p className="rounded-lg bg-orange-50 p-3 text-sm text-orange-800">
            Recibimos tu reporte de pago. Lo estamos verificando.
          </p>
        ) : (
          <ReportPaymentForm orderId={order.id} />
        )}
      </div>
    </section>
  );
}
