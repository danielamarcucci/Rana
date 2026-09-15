"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SesionUsuario } from "@/lib/auth";

const ENLACES = [
  { href: "/", label: "Tablero" },
  { href: "/mapa", label: "Mapa" },
  { href: "/actuaciones/nueva", label: "+ Nueva actuación" },
];

export default function Nav({ usuario }: { usuario: SesionUsuario }) {
  const pathname = usePathname();
  const router = useRouter();

  async function cerrarSesion() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-azul-800 bg-azul-900 text-white shadow-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-naranja-500 text-lg font-bold">
            🌾
          </span>
          <div className="leading-tight">
            <p className="text-sm font-semibold">Seguimiento sectorial agro</p>
            <p className="text-[11px] text-azul-200">Unidad de Información Estratégica · Despacho</p>
          </div>
        </div>

        <nav className="ml-2 flex flex-1 flex-wrap items-center gap-1">
          {ENLACES.map((enlace) => {
            const activo = pathname === enlace.href;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  activo ? "bg-naranja-500 text-white" : "text-azul-100 hover:bg-azul-800"
                }`}
              >
                {enlace.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center gap-3 text-sm">
          <span className="hidden sm:inline text-azul-100">{usuario.nombreVisible}</span>
          <button
            onClick={cerrarSesion}
            className="rounded-md border border-azul-700 bg-azul-800 px-3 py-1.5 font-medium text-white hover:bg-azul-700"
          >
            Cerrar sesión
          </button>
        </div>
      </div>
    </header>
  );
}
