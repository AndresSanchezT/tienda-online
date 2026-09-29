import { getCurrentUser } from "@/lib/auth";
import { saveImage, UploadError } from "@/lib/uploads";

export async function POST(req: Request) {
  if (!(await getCurrentUser())) return Response.json({ error: "No autorizado" }, { status: 401 });

  const form = await req.formData();
  const files = form.getAll("file").filter((f): f is File => f instanceof File && f.size > 0);
  const folder = form.get("folder") === "store" ? "store" : "products";
  if (files.length === 0) return Response.json({ error: "No se envió ninguna imagen" }, { status: 400 });

  try {
    const urls = await Promise.all(files.slice(0, 10).map((f) => saveImage(f, folder)));
    return Response.json({ urls });
  } catch (e) {
    return Response.json({ error: e instanceof UploadError ? e.message : "Error al subir" }, { status: 400 });
  }
}
