import { revalidatePath } from "next/cache";
import { PageHeader } from "@/components/admin/ui";
import { requireAdmin } from "@/lib/auth";
import { db } from "@/lib/db";
import { formatPrice } from "@/lib/money";
import { addBusinessDays, formatDate } from "@/lib/utils";

async function answerComplaint(id: string, formData: FormData) {
  "use server";
  await requireAdmin();
  const response = String(formData.get("response") ?? "").trim();
  if (!response) return;
  await db.complaint.update({ where: { id }, data: { response, status: "ANSWERED", respondedAt: new Date() } });
  revalidatePath("/admin/reclamos");
}

export default async function ComplaintsAdminPage() {
  const complaints = await db.complaint.findMany({ orderBy: [{ status: "asc" }, { createdAt: "desc" }], take: 200 });

  return (
    <>
      <PageHeader title="Libro de Reclamaciones" />
      <p className="mb-4 text-sm text-zinc-500">
        Por ley debes responder cada reclamo en un plazo máximo de 15 días hábiles. Envía la respuesta al correo del
        consumidor y regístrala aquí.
      </p>
      <ul className="space-y-4">
        {complaints.map((c) => {
          const deadline = addBusinessDays(c.createdAt, 15);
          return (
            <li key={c.id} className="card space-y-3 p-5 text-sm">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">
                  Nº {String(c.number).padStart(6, "0")} · {c.type === "RECLAMO" ? "Reclamo" : "Queja"} · {c.customerName}
                </p>
                <span className={`badge ${c.status === "OPEN" ? "bg-orange-100 text-orange-800" : "bg-emerald-100 text-emerald-800"}`}>
                  {c.status === "OPEN" ? `Pendiente · responder antes del ${formatDate(deadline)}` : "Respondido"}
                </span>
              </div>
              <p className="text-zinc-500">
                {formatDate(c.createdAt)} · {c.documentType} {c.documentNumber} · {c.email} · {c.phone}
                {c.orderNumber && ` · Pedido #${c.orderNumber}`}
              </p>
              <p>
                <strong>{c.itemType === "PRODUCTO" ? "Producto" : "Servicio"}:</strong> {c.itemDescription}
                {c.amount != null && ` (${formatPrice(c.amount)})`}
              </p>
              <p><strong>Detalle:</strong> {c.detail}</p>
              <p><strong>Pedido del consumidor:</strong> {c.request}</p>
              {c.status === "ANSWERED" ? (
                <p className="rounded bg-zinc-50 p-3"><strong>Respuesta ({c.respondedAt && formatDate(c.respondedAt)}):</strong> {c.response}</p>
              ) : (
                <form action={answerComplaint.bind(null, c.id)} className="space-y-2">
                  <textarea name="response" rows={3} className="input" placeholder="Respuesta enviada al consumidor..." required />
                  <button className="btn-primary">Registrar respuesta</button>
                </form>
              )}
            </li>
          );
        })}
        {complaints.length === 0 && <li className="card p-8 text-center text-zinc-500">No hay reclamaciones.</li>}
      </ul>
    </>
  );
}
