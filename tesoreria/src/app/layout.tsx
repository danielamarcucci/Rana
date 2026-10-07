import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import "./globals.css";

const texto = localFont({
  src: [
    { path: "./fuentes/OpenSans-Regular.woff2", weight: "400", style: "normal" },
    { path: "./fuentes/OpenSans-SemiBold.woff2", weight: "600", style: "normal" },
  ],
  variable: "--fuente-texto",
  display: "swap",
});

const titular = localFont({
  src: [{ path: "./fuentes/OpenSansCondensed-ExtraBold.woff2", weight: "800", style: "normal" }],
  variable: "--fuente-titular",
  display: "swap",
});

export const metadata: Metadata = {
  title: { default: "Tesorería de la Red", template: "%s · Tesorería de la Red" },
  description: "Administración y consulta de las finanzas de la Red Nacional por la Defensa de la Reforma Agraria.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#ffffff",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es-CO" className={`${texto.variable} ${titular.variable}`}>
      <body>{children}</body>
    </html>
  );
}
