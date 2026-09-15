import type { Metadata, Viewport } from "next";
import { Playfair_Display, Manrope } from "next/font/google";
import "./globals.css";

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  weight: ["500", "600", "700"],
  style: ["normal", "italic"],
});

const sans = Manrope({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
});

export const metadata: Metadata = {
  metadataBase: new URL("https://conversacionespendientes.net"),
  title: "Carolina Melo Arévalo — Método Conversemos",
  description:
    "Facilitadora de conversaciones pendientes. Acompaño a equipos y organizaciones a comprender lo que está ocurriendo, poner sobre la mesa lo que importa y construir nuevas formas de avanzar juntos.",
  openGraph: {
    title: "Carolina Melo Arévalo — Método Conversemos",
    description: "Cuando cambian las conversaciones, cambian las organizaciones.",
    url: "https://conversacionespendientes.net",
    locale: "es_CO",
    type: "website",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#1a5c45",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className={`${display.variable} ${sans.variable}`}>
      <body className="font-sans antialiased selection:bg-rosa-200">{children}</body>
    </html>
  );
}
