"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { SesionUsuario } from "../lib/auth";

const ENLACES_GESTOR = [
  { href: "/", label: "Tablero" },
  { href: "/mapa", label: "Mapa" },
  { href: "/cargar", label: "+ Cargar información" },
];

const ENLACES_CAPTURA = [{ href: "/cargar", label: "Cargar información" }];

export default function Nav({ usuario }: { usuario: SesionUsuario }) {
  const pathname = usePathname();
  const router = useRouter();
  const enlaces = usuario.rol === "captura" ? ENLACES_CAPTURA : ENLACES_GESTOR;

  async function cerrarSesion() {
    await fetch("/api/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <header className="sticky top-0 z-40 border-b border-azul-900/40 bg-[#16305e] text-white shadow-card">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-3 px-4 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src="/sello-campo-milagro.png" alt="El Campo Milagro" className="h-11 w-auto sm:h-12" />

        <span className="hidden h-8 w-px bg-white/25 sm:block" aria-hidden />

        <div className="leading-tight">
          <p className="text-sm font-semibold">Seguimiento sectorial agro</p>
          <p className="text-[11px] text-azul-200">Unidad de Información Estratégica · Despacho</p>
        </div>

        <nav className="ml-1 flex flex-1 flex-wrap items-center gap-1">
          {enlaces.map((enlace) => {
            const activo = pathname === enlace.href;
            return (
              <Link
                key={enlace.href}
                href={enlace.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium transition ${
                  activo ? "bg-naranja-500 text-white" : "text-azul-100 hover:bg-azul-800/60"
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
            className="rounded-md border border-white/20 bg-white/10 px-3 py-1.5 font-medium text-white hover:bg-white/20"
          >
            Cerrar sesión
          </button>
        </div>

        <span className="hidden h-8 w-px bg-white/25 sm:block" aria-hidden />

        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-agricultura.png"
          alt="Ministerio de Agricultura y Desarrollo Rural"
          className="h-8 w-auto sm:h-9"
        />
      </div>
    </header>
  );
}
