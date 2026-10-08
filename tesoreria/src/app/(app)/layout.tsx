import Link from "next/link";
import { Marca } from "@/components/Marca";
import { Navegacion } from "@/components/Navegacion";
import { exigirSesion } from "@/lib/sesion";
import { accionSalir } from "@/app/acciones/acceso";

export const dynamic = "force-dynamic";

export default async function LayoutApp({ children }: { children: React.ReactNode }) {
  const s = await exigirSesion();
  const demo = process.env.MODO_DEMO === "1";
  return (
    <div className="flex min-h-screen flex-col">
      {demo && (
        <div className="bg-aviso-fondo px-4 py-1.5 text-center text-xs font-semibold text-aviso">
          MODO DE DEMOSTRACIÓN · Los datos de esta instalación son ficticios
        </div>
      )}
      <header className="border-b border-linea bg-white">
        <div className="mx-auto max-w-contenido px-4 sm:px-6">
          <div className="flex items-center justify-between gap-4 py-3">
            <Link href="/" className="no-underline" aria-label="Ir al resumen">
              <Marca />
            </Link>
            <div className="flex items-center gap-3 text-right text-xs sm:text-sm">
              <div className="hidden leading-tight sm:block">
                <p className="font-semibold text-tinta">{s.nombre}</p>
                <p className="text-gris">{s.rol === "tesoreria" ? "Tesorería" : "Consulta"}</p>
              </div>
              <details className="relative">
                <summary className="btn-secundario cursor-pointer list-none px-3 py-1.5 text-xs">Cuenta</summary>
                <div className="absolute right-0 z-20 mt-2 w-56 rounded-md border border-linea bg-white p-2 text-left shadow-lg">
                  <p className="px-2 py-1 text-xs text-gris sm:hidden">
                    {s.nombre} · {s.rol === "tesoreria" ? "Tesorería" : "Consulta"}
                  </p>
                  <Link href="/cuenta" className="block rounded px-2 py-1.5 text-sm text-tinta no-underline hover:bg-suave">
                    Cambiar contraseña
                  </Link>
                  <form action={accionSalir}>
                    <button className="w-full rounded px-2 py-1.5 text-left text-sm text-tinta hover:bg-suave">Cerrar sesión</button>
                  </form>
                </div>
              </details>
            </div>
          </div>
          <Navegacion tesoreria={s.rol === "tesoreria"} />
        </div>
      </header>
      <main className="mx-auto w-full max-w-contenido flex-1 px-4 py-7 sm:px-6 sm:py-9">{children}</main>
      <footer className="border-t border-linea bg-white">
        <div className="mx-auto max-w-contenido px-4 py-4 text-xs text-gris sm:px-6">
          Corporación por la Defensa de la Reforma Agraria · Valores en pesos colombianos · Fechas en hora de Colombia
        </div>
      </footer>
    </div>
  );
}
