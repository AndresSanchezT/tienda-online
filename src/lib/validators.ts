import { z } from "zod";

const text = (max: number) => z.string().trim().max(max);
const required = (label: string, max = 200) => text(max).min(1, `${label} es obligatorio`);

export const cartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().min(1).optional(),
  quantity: z.number().int().min(1).max(99),
});

export const checkoutSchema = z
  .object({
    items: z.array(cartItemSchema).min(1, "Tu carrito está vacío").max(50),
    customerName: required("El nombre", 120),
    customerEmail: z.email("Correo inválido").trim().max(160),
    customerPhone: text(20).regex(/^\+?\d[\d\s-]{6,}$/, "Celular inválido"),
    documentType: z.enum(["DNI", "CE", "RUC", "PASAPORTE"]),
    documentNumber: required("El número de documento", 20),
    businessName: text(200).optional(),
    deliveryMethod: z.enum(["SHIPPING", "PICKUP"]),
    department: text(60).optional(),
    province: text(60).optional(),
    district: text(60).optional(),
    address: text(250).optional(),
    reference: text(250).optional(),
    notes: text(500).optional(),
    paymentMethod: z.enum(["MERCADOPAGO", "YAPE", "PLIN", "BANK_TRANSFER", "CASH_ON_DELIVERY"]),
    acceptTerms: z.literal(true, "Debes aceptar los términos y condiciones"),
  })
  .superRefine((d, ctx) => {
    const doc = d.documentNumber;
    if (d.documentType === "DNI" && !/^\d{8}$/.test(doc))
      ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "El DNI debe tener 8 dígitos" });
    if (d.documentType === "RUC") {
      if (!/^(10|15|17|20)\d{9}$/.test(doc))
        ctx.addIssue({ code: "custom", path: ["documentNumber"], message: "RUC inválido (11 dígitos)" });
      if (!d.businessName)
        ctx.addIssue({ code: "custom", path: ["businessName"], message: "La razón social es obligatoria" });
    }
    if (d.deliveryMethod === "SHIPPING") {
      for (const f of ["department", "province", "district", "address"] as const) {
        if (!d[f]) ctx.addIssue({ code: "custom", path: [f], message: "Campo obligatorio para el envío" });
      }
    }
    if (d.paymentMethod === "CASH_ON_DELIVERY" && d.deliveryMethod !== "SHIPPING")
      ctx.addIssue({
        code: "custom",
        path: ["paymentMethod"],
        message: "El pago contra entrega solo aplica a envíos",
      });
  });

export type CheckoutInput = z.infer<typeof checkoutSchema>;

/** Errores de zod => { campo: "mensaje" } para mostrarlos en el formulario */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}
