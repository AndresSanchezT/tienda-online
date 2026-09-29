import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/session";

// Chequeo rápido (optimista) para el panel. La verificación real se hace en cada página/acción con requireAdmin().
export async function proxy(req: NextRequest) {
  const session = await verifySession(req.cookies.get(SESSION_COOKIE)?.value);
  const isLogin = req.nextUrl.pathname === "/admin/login";

  if (!session && !isLogin) return NextResponse.redirect(new URL("/admin/login", req.url));
  if (session && isLogin) return NextResponse.redirect(new URL("/admin", req.url));
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
