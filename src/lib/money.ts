// Los montos viajan y se guardan en céntimos (Int). Solo se convierten a soles para mostrarlos.

const formatter = new Intl.NumberFormat("es-PE", {
  style: "currency",
  currency: "PEN",
  minimumFractionDigits: 2,
});

/** 129990 => "S/ 1,299.90" */
export function formatPrice(cents: number): string {
  return formatter.format(cents / 100);
}

/** "1299.90" | "1,299.9" => 129990. Devuelve NaN si no es un número válido. */
export function toCents(value: string | number): number {
  const n = typeof value === "number" ? value : Number(String(value).replace(/[^\d.]/g, ""));
  return Number.isFinite(n) ? Math.round(n * 100) : NaN;
}

/** 129990 => "1299.90" (para inputs de formularios) */
export function centsToInput(cents: number | null | undefined): string {
  return cents == null ? "" : (cents / 100).toFixed(2);
}

export function discountPercent(price: number, compareAt: number | null | undefined): number | null {
  if (!compareAt || compareAt <= price) return null;
  return Math.round((1 - price / compareAt) * 100);
}
