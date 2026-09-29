"use server";

import bcrypt from "bcryptjs";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { createSession, destroySession } from "@/lib/auth";
import { db } from "@/lib/db";

// Límite simple anti fuerza bruta: 5 intentos fallidos por IP cada 15 minutos (en memoria del proceso).
const attempts = new Map<string, { count: number; until: number }>();
const WINDOW_MS = 15 * 60 * 1000;

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const ip = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
  const now = Date.now();
  const entry = attempts.get(ip);
  if (entry && entry.until > now && entry.count >= 5) {
    return { error: "Demasiados intentos. Espera unos minutos." };
  }

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const password = String(formData.get("password") ?? "");
  const user = await db.user.findUnique({ where: { email } });
  const valid = user?.active && (await bcrypt.compare(password, user.passwordHash));

  if (!user || !valid) {
    const count = entry && entry.until > now ? entry.count + 1 : 1;
    attempts.set(ip, { count, until: now + WINDOW_MS });
    return { error: "Correo o contraseña incorrectos." };
  }

  attempts.delete(ip);
  await createSession(user.id, user.role);
  redirect("/admin");
}

export async function logout() {
  await destroySession();
  redirect("/admin/login");
}
