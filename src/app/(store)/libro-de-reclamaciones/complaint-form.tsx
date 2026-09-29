"use client";

import { useActionState } from "react";
import { submitComplaint, type ComplaintState } from "./actions";

export function ComplaintForm() {
  const [state, action, pending] = useActionState<ComplaintState, FormData>(submitComplaint, {});

  if (state.number) {
    return (
      <div className="card p-6 text-center">
        <p className="text-lg font-semibold">Hoja de reclamación Nº {String(state.number).padStart(6, "0")} registrada</p>
        <p className="mt-2 text-sm text-zinc-600">
          Responderemos a tu correo en un plazo máximo de 15 días hábiles, según el Código de Protección y Defensa del Consumidor.
        </p>
      </div>
    );
  }

  const e = (k: string) => state.errors?.[k] && <p className="mt-1 text-xs text-red-600">{state.errors[k]}</p>;

  return (
    <form action={action} className="card space-y-6 p-5">
      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">1. Identificación del consumidor</legend>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="customerName">Nombre completo</label>
          <input id="customerName" name="customerName" className="input" required />
          {e("customerName")}
        </div>
        <div>
          <label className="label" htmlFor="documentType">Tipo de documento</label>
          <select id="documentType" name="documentType" className="input">
            <option value="DNI">DNI</option>
            <option value="CE">Carné de extranjería</option>
            <option value="PASAPORTE">Pasaporte</option>
            <option value="RUC">RUC</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="documentNumber">Número</label>
          <input id="documentNumber" name="documentNumber" className="input" required />
          {e("documentNumber")}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="address">Domicilio</label>
          <input id="address" name="address" className="input" required />
          {e("address")}
        </div>
        <div>
          <label className="label" htmlFor="phone">Teléfono</label>
          <input id="phone" name="phone" className="input" required />
          {e("phone")}
        </div>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" className="input" required />
          {e("email")}
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="guardianName">Padre, madre o apoderado (solo si eres menor de edad)</label>
          <input id="guardianName" name="guardianName" className="input" />
        </div>
      </fieldset>

      <fieldset className="grid gap-4 sm:grid-cols-2">
        <legend className="mb-2 font-semibold">2. Identificación del bien contratado</legend>
        <div>
          <label className="label" htmlFor="itemType">Tipo</label>
          <select id="itemType" name="itemType" className="input">
            <option value="PRODUCTO">Producto</option>
            <option value="SERVICIO">Servicio</option>
          </select>
        </div>
        <div>
          <label className="label" htmlFor="amount">Monto reclamado (S/)</label>
          <input id="amount" name="amount" inputMode="decimal" className="input" />
        </div>
        <div>
          <label className="label" htmlFor="orderNumber">Nº de pedido (si aplica)</label>
          <input id="orderNumber" name="orderNumber" inputMode="numeric" className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label" htmlFor="itemDescription">Descripción</label>
          <input id="itemDescription" name="itemDescription" className="input" required />
          {e("itemDescription")}
        </div>
      </fieldset>

      <fieldset className="space-y-4">
        <legend className="mb-2 font-semibold">3. Detalle de la reclamación</legend>
        <div className="flex gap-6 text-sm">
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="RECLAMO" defaultChecked /> Reclamo
            <span className="text-xs text-zinc-500">(disconformidad con el producto/servicio)</span>
          </label>
          <label className="flex items-center gap-2">
            <input type="radio" name="type" value="QUEJA" /> Queja
            <span className="text-xs text-zinc-500">(malestar con la atención)</span>
          </label>
        </div>
        <div>
          <label className="label" htmlFor="detail">Detalle</label>
          <textarea id="detail" name="detail" rows={4} className="input" required />
          {e("detail")}
        </div>
        <div>
          <label className="label" htmlFor="request">Pedido del consumidor</label>
          <textarea id="request" name="request" rows={2} className="input" required />
          {e("request")}
        </div>
      </fieldset>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" name="accept" className="mt-1" />
        Declaro que los datos consignados son verdaderos.
      </label>
      {e("accept")}

      <button className="btn-primary w-full" disabled={pending}>
        {pending ? "Enviando..." : "Enviar hoja de reclamación"}
      </button>
    </form>
  );
}
