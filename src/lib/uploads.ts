import "server-only";
import { randomUUID } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

// Los archivos subidos se guardan fuera de /public (Next solo sirve lo que existía en /public al compilar)
// y se sirven desde la ruta /uploads/[...path]. En el droplet, Nginx puede servir esta carpeta directo.
export const UPLOAD_DIR = path.resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR ?? "uploads");

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/gif": "gif",
};

export const MAX_UPLOAD_BYTES = 5 * 1024 * 1024; // 5 MB

export class UploadError extends Error {}

/** Guarda una imagen y devuelve su URL pública (/uploads/<carpeta>/<archivo>). */
export async function saveImage(file: File, folder: "products" | "receipts" | "store"): Promise<string> {
  const ext = ALLOWED[file.type];
  if (!ext) throw new UploadError("Formato no permitido. Usa JPG, PNG, WEBP, AVIF o GIF.");
  if (file.size > MAX_UPLOAD_BYTES) throw new UploadError("La imagen supera los 5 MB.");

  const dir = path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, folder);
  await mkdir(dir, { recursive: true });
  const name = `${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
  await writeFile(path.join(dir, name), Buffer.from(await file.arrayBuffer()));
  return `/uploads/${folder}/${name}`;
}

export const UPLOAD_MIME = Object.fromEntries(Object.entries(ALLOWED).map(([mime, ext]) => [ext, mime]));
