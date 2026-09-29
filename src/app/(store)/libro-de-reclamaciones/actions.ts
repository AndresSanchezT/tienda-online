"use server";

import { z } from "zod";
import { db } from "@/lib/db";
import { toCents } from "@/lib/money";
import { fieldErrors } from "@/lib/validators";

const schema = z.object({
  type: z.enum(["RECLAMO", "QUEJA"]),
  customerName: z.string().trim().min(3, "Obligatorio").max(120),
  documentType: z.enum(["DNI", "CE", "RUC", "PASAPORTE"]),
  documentNumber: z.string().trim().min(6, "Documento inválido").max(20),
  address: z.string().trim().min(5, "Obligatorio").max(250),
  phone: z.string().trim().min(6, "Obligatorio").max(20),
  email: z.email("Correo inválido").trim().max(160),
  guardianName: z.string().trim().max(120).optional(),
  itemType: z.enum(["PRODUCTO", "SERVICIO"]),
  itemDescription: z.string().trim().min(3, "Obligatorio").max(300),
  amount: z.string().trim().max(20).optional(),
  orderNumber: z.coerce.number().int().positive().optional(),
  detail: z.string().trim().min(10, "Describe el detalle").max(3000),
  request: z.string().trim().min(5, "Indica tu pedido").max(2000),
  accept: z.literal("on", "Debes confirmar la declaración"),
});

export type ComplaintState = { errors?: Record<string, string>; number?: number };

export async function submitComplaint(_prev: ComplaintState, formData: FormData): Promise<ComplaintState> {
  const raw = Object.fromEntries([...formData.entries()].filter(([, v]) => v !== ""));
  const parsed = schema.safeParse(raw);
  if (!parsed.success) return { errors: fieldErrors(parsed.error) };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { accept, amount, ...data } = parsed.data;
  const cents = amount ? toCents(amount) : NaN;
  const complaint = await db.complaint.create({
    data: { ...data, amount: Number.isFinite(cents) ? cents : null },
  });
  return { number: complaint.number };
}
