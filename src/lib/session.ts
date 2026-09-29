// Firma/verificación del token de sesión. Sin dependencias de servidor para poder usarse en proxy.ts.
import { jwtVerify, SignJWT } from "jose";

export const SESSION_COOKIE = "admin_session";
export const SESSION_DURATION_SECONDS = 60 * 60 * 24 * 7; // 7 días

export type SessionPayload = { userId: string; role: "ADMIN" | "STAFF" };

function secretKey() {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error("AUTH_SECRET debe estar definido en .env y tener al menos 32 caracteres");
  }
  return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload) {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DURATION_SECONDS}s`)
    .sign(secretKey());
}

export async function verifySession(token: string | undefined): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secretKey(), { algorithms: ["HS256"] });
    return { userId: String(payload.userId), role: payload.role === "STAFF" ? "STAFF" : "ADMIN" };
  } catch {
    return null;
  }
}
