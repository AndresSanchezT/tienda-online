import { readFile } from "node:fs/promises";
import path from "node:path";
import { getCurrentUser } from "@/lib/auth";
import { UPLOAD_DIR, UPLOAD_MIME } from "@/lib/uploads";

export async function GET(_req: Request, ctx: RouteContext<"/uploads/[...path]">) {
  const { path: parts } = await ctx.params;
  const filePath = path.resolve(/*turbopackIgnore: true*/ UPLOAD_DIR, ...parts);

  // Los vouchers de pago de clientes solo los ve el personal de la tienda
  if (parts[0] === "receipts" && !(await getCurrentUser())) return new Response("Not found", { status: 404 });

  // Evita salir de la carpeta de uploads (../../etc/passwd)
  if (!filePath.startsWith(UPLOAD_DIR + path.sep)) return new Response("Not found", { status: 404 });

  const mime = UPLOAD_MIME[path.extname(filePath).slice(1).toLowerCase()];
  if (!mime) return new Response("Not found", { status: 404 });

  try {
    const data = await readFile(filePath);
    return new Response(new Uint8Array(data), {
      headers: {
        "Content-Type": mime,
        "Cache-Control": parts[0] === "receipts" ? "private, no-store" : "public, max-age=31536000, immutable",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
