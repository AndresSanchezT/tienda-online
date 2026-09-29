import type { Metadata } from "next";
import { getSettings } from "@/lib/settings";
import { ComplaintForm } from "./complaint-form";

export const metadata: Metadata = { title: "Libro de Reclamaciones" };

export default async function ComplaintsPage() {
  const settings = await getSettings();

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <h1 className="text-2xl font-bold">Libro de Reclamaciones</h1>
      <div className="card p-4 text-sm text-zinc-600">
        <p className="font-semibold text-zinc-800">{settings.legalName ?? settings.storeName}</p>
        {settings.ruc && <p>RUC: {settings.ruc}</p>}
        {settings.address && <p>{settings.address}</p>}
        <p className="mt-2">
          Conforme a lo establecido en el Código de Protección y Defensa del Consumidor, esta institución cuenta con un
          Libro de Reclamaciones a tu disposición. La formulación del reclamo no impide acudir a otras vías de solución
          de controversias ni es requisito previo para interponer una denuncia ante el INDECOPI.
        </p>
      </div>
      <ComplaintForm />
    </div>
  );
}
