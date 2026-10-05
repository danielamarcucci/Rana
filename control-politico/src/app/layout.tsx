import type { Metadata } from "next";
import Link from "next/link";
import "./globals.css";
import { cerrarSesionAccion } from "./actions";
import { claveConfigurada } from "@/lib/sesion";

export const metadata: Metadata = {
  title: "Control Político",
  description: "Preparación de debates de control político en el concejo municipal",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  const conClave = !!claveConfigurada();
  return (
    <html lang="es">
      <body className="font-sans antialiased">
        <header className="no-imprimir border-b border-neutral-200 bg-white">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Link href="/" className="flex items-center gap-2">
              <span className="grid h-8 w-8 place-items-center rounded-lg bg-marca-700 text-sm font-black text-white">CP</span>
              <span className="text-base font-bold text-neutral-900">Control Político</span>
            </Link>
            <nav className="flex items-center gap-1 text-sm font-medium">
              <Link href="/" className="rounded-md px-3 py-1.5 text-neutral-700 hover:bg-neutral-100">
                Debates
              </Link>
              <Link href="/configuracion" className="rounded-md px-3 py-1.5 text-neutral-700 hover:bg-neutral-100">
                Configuración
              </Link>
              {conClave && (
                <form action={cerrarSesionAccion}>
                  <button className="rounded-md px-3 py-1.5 text-neutral-500 hover:bg-neutral-100">Salir</button>
                </form>
              )}
            </nav>
          </div>
        </header>
        <div className="mx-auto max-w-6xl px-4 py-6">{children}</div>
      </body>
    </html>
  );
}
