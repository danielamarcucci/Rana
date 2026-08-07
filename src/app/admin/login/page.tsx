"use client";

import { Suspense, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Marca } from "@/components/Logo";

function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  const [usuario, setUsuario] = useState("");
  const [clave, setClave] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [cargando, setCargando] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setCargando(true);
    setError(null);
    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ usuario, clave }),
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No fue posible iniciar sesión.");
        return;
      }
      router.push(params.get("next") || "/admin");
      router.refresh();
    } catch {
      setError("No pudimos conectar con el servidor.");
    } finally {
      setCargando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-tierra-100 via-tierra-50 to-hoja-50 flex items-center justify-center px-4">
      <div className="max-w-sm w-full space-y-6">
        <div className="flex justify-center">
          <Marca subtitulo="Panel privado — Solo personal autorizado" />
        </div>
        <form onSubmit={onSubmit} className="card space-y-4">
          {error && (
            <div className="rounded-lg bg-alerta-50 border border-alerta-200 text-alerta-700 text-sm font-medium px-3 py-2">
              {error}
            </div>
          )}
          <div>
            <label className="field-label">Usuario</label>
            <input
              className="input"
              value={usuario}
              onChange={(e) => setUsuario(e.target.value)}
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label className="field-label">Clave</label>
            <input
              className="input"
              type="password"
              value={clave}
              onChange={(e) => setClave(e.target.value)}
              autoComplete="current-password"
              required
            />
          </div>
          <button type="submit" disabled={cargando} className="btn-primary w-full">
            {cargando ? "Ingresando…" : "Ingresar"}
          </button>
        </form>
        <p className="text-center text-xs text-tierra-400">
          Este sitio es de uso interno y no está indexado públicamente.
        </p>
      </div>
    </main>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
