import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = { title: "Términos y condiciones" };

// Texto base: revísalo y adáptalo a tu negocio (idealmente con un asesor legal).
export default async function TermsPage() {
  const s = await getSettings();
  const name = s.legalName ?? s.storeName;

  return (
    <article className="card mx-auto max-w-3xl space-y-4 p-6 text-sm leading-relaxed text-zinc-700 [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-zinc-900">
      <h1 className="text-2xl font-bold text-zinc-900">Términos y condiciones</h1>
      <p>
        Al comprar en {s.storeName} aceptas estos términos. El proveedor es {name}
        {s.ruc && <>, con RUC {s.ruc}</>}.
      </p>
      <h2>Precios y pagos</h2>
      <p>
        Los precios están expresados en soles (S/) e incluyen IGV. Aceptamos pagos con tarjetas de crédito y débito,
        Yape y PagoEfectivo a través de Mercado Pago, así como los demás medios indicados en el checkout. Los pedidos con
        pago manual (Yape, Plin o transferencia) se confirman una vez verificado el abono.
      </p>
      <h2>Stock</h2>
      <p>Todos los pedidos están sujetos a disponibilidad de stock. Si un producto no estuviera disponible, te contactaremos para ofrecerte alternativas o la devolución total de tu dinero.</p>
      <h2>Envíos</h2>
      <p>Realizamos envíos a todo el Perú. Los plazos de entrega dependen del destino y se informan al confirmar el pedido.</p>
      <h2>Cambios y devoluciones</h2>
      <p>Puedes solicitar cambios o devoluciones dentro de los plazos establecidos por ley, siempre que el producto se encuentre sin uso, en su empaque original y con todos sus accesorios.</p>
      <h2>Comprobantes</h2>
      <p>Emitimos boleta o factura electrónica según los datos ingresados en tu compra.</p>
      <h2>Protección de datos personales</h2>
      <p>Tus datos se usan únicamente para procesar tu pedido y conforme a la Ley N° 29733, Ley de Protección de Datos Personales.</p>
      <h2>Reclamos</h2>
      <p>Tienes a tu disposición nuestro Libro de Reclamaciones virtual.</p>
    </article>
  );
}
