import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Red Nacional de Defensa por la Reforma Agraria",
  description:
    "Sistema de recepción y atención de denuncias de la Red Nacional de Defensa por la Reforma Agraria.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="min-h-screen text-tierra-900 antialiased">{children}</body>
    </html>
  );
}
