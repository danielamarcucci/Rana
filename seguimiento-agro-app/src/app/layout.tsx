import type { Metadata, Viewport } from "next";
import "./globals.css";
import Nav from "../components/Nav";
import { usuarioActual } from "../lib/auth";

export const metadata: Metadata = {
  title: "Seguimiento sectorial agro",
  description:
    "Tablero de control de planes, programas, convenios y líneas de acción del sector agricultura.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1c4a91",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const sesion = await usuarioActual();

  return (
    <html lang="es">
      <body className={`min-h-screen font-sans antialiased ${sesion ? "fondo-campo" : ""}`}>
        {sesion && <Nav usuario={sesion} />}
        <main className="mx-auto max-w-7xl px-4 py-5">{children}</main>
      </body>
    </html>
  );
}
