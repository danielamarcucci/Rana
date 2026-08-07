import Link from "next/link";
import { LogoMark } from "@/components/Logo";
import { usuarioActual } from "@/lib/auth";
import { CerrarSesionBoton } from "./CerrarSesionBoton";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const usuario = await usuarioActual();

  return (
    <div className="min-h-screen bg-tierra-50">
      <header className="bg-hoja-800 text-white">
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4">
          <Link href="/admin" className="flex items-center gap-2">
            <LogoMark className="h-8 w-8" />
            <span className="font-bold leading-tight text-sm sm:text-base">
              Panel de la Red
              <span className="block text-[11px] font-normal text-hoja-200">
                Reforma Agraria · uso interno
              </span>
            </span>
          </Link>
          <nav className="flex items-center gap-4 text-sm font-medium">
            <Link href="/admin" className="hover:text-hoja-200">
              Casos
            </Link>
            <Link href="/admin/casos/nuevo" className="hover:text-hoja-200">
              + Registrar manualmente
            </Link>
            {usuario && (
              <span className="hidden sm:inline text-hoja-300 text-xs">{usuario}</span>
            )}
            <CerrarSesionBoton />
          </nav>
        </div>
      </header>
      <div className="max-w-6xl mx-auto px-4 py-6">{children}</div>
    </div>
  );
}
