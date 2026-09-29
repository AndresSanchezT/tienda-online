import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { db } from "@/lib/db";
import { SESSION_COOKIE, SESSION_DURATION_SECONDS, signSession, verifySession } from "@/lib/session";

export async function createSession(userId: string, role: "ADMIN" | "STAFF") {
  const token = await signSession({ userId, role });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_DURATION_SECONDS,
  });
}

export async function destroySession() {
  (await cookies()).delete(SESSION_COOKIE);
}

/** Usuario del panel actual, o null. Verifica también que siga activo en la BD. */
export const getCurrentUser = cache(async () => {
  const session = await verifySession((await cookies()).get(SESSION_COOKIE)?.value);
  if (!session) return null;
  const user = await db.user.findUnique({
    where: { id: session.userId },
    select: { id: true, name: true, email: true, role: true, active: true },
  });
  return user?.active ? user : null;
});

/** Usar al inicio de toda página y acción del panel. */
export async function requireAdmin() {
  const user = await getCurrentUser();
  if (!user) redirect("/admin/login");
  return user;
}
