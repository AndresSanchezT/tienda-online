import type {
  DeliveryMethod,
  DocumentType,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductCondition,
} from "@/generated/prisma/enums";

export const orderStatusLabel: Record<OrderStatus, string> = {
  PENDING: "Pendiente de pago",
  PAID: "Pagado",
  PROCESSING: "En preparación",
  SHIPPED: "Enviado",
  DELIVERED: "Entregado",
  CANCELLED: "Cancelado",
};

export const orderStatusColor: Record<OrderStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  PAID: "bg-emerald-100 text-emerald-800",
  PROCESSING: "bg-sky-100 text-sky-800",
  SHIPPED: "bg-indigo-100 text-indigo-800",
  DELIVERED: "bg-green-100 text-green-800",
  CANCELLED: "bg-zinc-200 text-zinc-700",
};

export const paymentStatusLabel: Record<PaymentStatus, string> = {
  PENDING: "Pendiente",
  AWAITING_VERIFICATION: "Por verificar",
  APPROVED: "Aprobado",
  REJECTED: "Rechazado",
  REFUNDED: "Reembolsado",
};

export const paymentStatusColor: Record<PaymentStatus, string> = {
  PENDING: "bg-amber-100 text-amber-800",
  AWAITING_VERIFICATION: "bg-orange-100 text-orange-800",
  APPROVED: "bg-emerald-100 text-emerald-800",
  REJECTED: "bg-red-100 text-red-800",
  REFUNDED: "bg-zinc-200 text-zinc-700",
};

export const paymentMethodLabel: Record<PaymentMethod, string> = {
  MERCADOPAGO: "Tarjeta de crédito/débito, Yape o PagoEfectivo",
  YAPE: "Yape",
  PLIN: "Plin",
  BANK_TRANSFER: "Transferencia bancaria",
  CASH_ON_DELIVERY: "Pago contra entrega",
};

export const paymentMethodShort: Record<PaymentMethod, string> = {
  MERCADOPAGO: "Mercado Pago",
  YAPE: "Yape directo",
  PLIN: "Plin",
  BANK_TRANSFER: "Transferencia",
  CASH_ON_DELIVERY: "Contra entrega",
};

export const deliveryMethodLabel: Record<DeliveryMethod, string> = {
  SHIPPING: "Envío a domicilio",
  PICKUP: "Recojo en tienda",
};

export const documentTypeLabel: Record<DocumentType, string> = {
  DNI: "DNI",
  CE: "Carné de extranjería",
  RUC: "RUC (factura)",
  PASAPORTE: "Pasaporte",
};

export const conditionLabel: Record<ProductCondition, string> = {
  NEW: "Nuevo",
  USED: "Seminuevo",
  REFURBISHED: "Reacondicionado",
};
