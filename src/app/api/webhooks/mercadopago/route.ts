import { InvalidWebhookSignatureError, WebhookSignatureValidator } from "mercadopago";
import { syncMercadoPagoPayment } from "@/lib/payments/mercadopago";

// Configura esta URL en Mercado Pago > Tus integraciones > Webhooks (evento "Pagos"):
//   https://TU-DOMINIO/api/webhooks/mercadopago
// y copia la "clave secreta" en MP_WEBHOOK_SECRET.

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = (await req.json().catch(() => ({}))) as {
    type?: string;
    topic?: string;
    data?: { id?: string | number };
  };

  const type = body.type ?? body.topic ?? url.searchParams.get("type") ?? url.searchParams.get("topic");
  const dataId = url.searchParams.get("data.id") ?? url.searchParams.get("id") ?? body.data?.id?.toString();

  if (type !== "payment" || !dataId) return Response.json({ ignored: true });

  const secret = process.env.MP_WEBHOOK_SECRET;
  if (secret) {
    try {
      WebhookSignatureValidator.validate({
        xSignature: req.headers.get("x-signature"),
        xRequestId: req.headers.get("x-request-id"),
        dataId,
        secret,
        toleranceSeconds: 600,
      });
    } catch (err) {
      if (err instanceof InvalidWebhookSignatureError) {
        console.warn("[MP webhook] firma inválida:", err.reason, err.requestId);
        return Response.json({ error: "invalid signature" }, { status: 401 });
      }
      throw err;
    }
  } else if (process.env.NODE_ENV === "production") {
    console.warn("[MP webhook] MP_WEBHOOK_SECRET no configurado: no se valida la firma");
  }

  try {
    const result = await syncMercadoPagoPayment(dataId);
    return Response.json({ ok: true, result });
  } catch (err) {
    console.error("[MP webhook] error sincronizando pago", dataId, err);
    // 500 => Mercado Pago reintentará la notificación más tarde
    return Response.json({ error: "sync failed" }, { status: 500 });
  }
}
