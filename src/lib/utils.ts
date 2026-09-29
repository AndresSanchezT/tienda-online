export function cn(...classes: (string | false | null | undefined)[]) {
  return classes.filter(Boolean).join(" ");
}

export function slugify(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function appUrl(path = ""): string {
  const base = (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return `${base}${path}`;
}

/** Specs/opciones guardadas como JSON => lista de pares [clave, valor] */
export function jsonEntries(value: unknown): [string, string][] {
  if (!value || typeof value !== "object" || Array.isArray(value)) return [];
  return Object.entries(value as Record<string, unknown>)
    .filter(([k, v]) => k && v != null && String(v) !== "")
    .map(([k, v]) => [k, String(v)]);
}

export function whatsappLink(phone: string, text: string) {
  return `https://wa.me/${phone.replace(/\D/g, "")}?text=${encodeURIComponent(text)}`;
}

/** Suma días hábiles (lunes a viernes; no considera feriados). */
export function addBusinessDays(date: Date, days: number) {
  const d = new Date(date);
  while (days > 0) {
    d.setDate(d.getDate() + 1);
    if (d.getDay() !== 0 && d.getDay() !== 6) days--;
  }
  return d;
}

export function formatDate(date: Date) {
  return new Intl.DateTimeFormat("es-PE", {
    dateStyle: "medium",
    timeStyle: "short",
    timeZone: "America/Lima",
  }).format(date);
}
