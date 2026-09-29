"use client";

import { useActionState } from "react";
import { login } from "./actions";

export default function LoginPage() {
  const [state, action, pending] = useActionState(login, {});

  return (
    <main className="grid flex-1 place-items-center p-4">
      <form action={action} className="card w-full max-w-sm space-y-4 p-6">
        <h1 className="text-xl font-bold">Panel de administración</h1>
        <div>
          <label className="label" htmlFor="email">Correo</label>
          <input id="email" name="email" type="email" className="input" autoComplete="username" required />
        </div>
        <div>
          <label className="label" htmlFor="password">Contraseña</label>
          <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
        </div>
        {state.error && <p className="text-sm text-red-600">{state.error}</p>}
        <button className="btn-primary w-full" disabled={pending}>
          {pending ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </main>
  );
}
