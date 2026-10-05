"use client";

import { useActionState } from "react";
import { iniciarSesionAccion } from "@/app/actions";

export default function Login() {
  const [error, accion, pendiente] = useActionState(iniciarSesionAccion, null);
  return (
    <main className="mx-auto mt-16 max-w-sm">
      <form action={accion} className="tarjeta space-y-4">
        <h1 className="text-xl font-bold">Ingresar</h1>
        <div>
          <label className="etiqueta" htmlFor="clave">Clave</label>
          <input id="clave" name="clave" type="password" required autoFocus className="campo" />
        </div>
        {error && <p className="text-sm font-medium text-red-700">{error}</p>}
        <button className="btn-primario w-full" disabled={pendiente}>
          {pendiente ? "Verificando…" : "Entrar"}
        </button>
      </form>
    </main>
  );
}
