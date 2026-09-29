"use client";

import { useActionState } from "react";
import { reportPayment, type ReportState } from "./actions";

export function ReportPaymentForm({ orderId }: { orderId: string }) {
  const [state, action, pending] = useActionState<ReportState, FormData>(reportPayment.bind(null, orderId), {});

  if (state.ok) {
    return (
      <p className="rounded-lg bg-emerald-50 p-3 text-sm text-emerald-800">
        ¡Gracias! Recibimos tu reporte de pago. Lo verificaremos y te confirmaremos a la brevedad.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-3">
      <p className="text-sm font-semibold">¿Ya pagaste? Repórtalo aquí:</p>
      <div>
        <label className="label" htmlFor="operationNumber">Número de operación</label>
        <input id="operationNumber" name="operationNumber" className="input" required placeholder="Ej: 12345678" />
      </div>
      <div>
        <label className="label" htmlFor="receipt">Captura del pago (opcional)</label>
        <input id="receipt" name="receipt" type="file" accept="image/*" className="input" />
      </div>
      {state.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Enviando..." : "Reportar pago"}
      </button>
    </form>
  );
}
