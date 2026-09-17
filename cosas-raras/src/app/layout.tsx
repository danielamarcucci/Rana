import type { Metadata } from "next";
import { Unbounded, Work_Sans } from "next/font/google";
import "./globals.css";
import CustomCursor from "@/components/CustomCursor";
import Grain from "@/components/Grain";

const display = Unbounded({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800", "900"],
  variable: "--font-display",
  display: "swap",
});

const body = Work_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-body",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("https://cosas-raras.vercel.app"),
  title: "Cosas Raras — Lámparas hechas a mano por Lau",
  description:
    "Lámparas escultóricas hechas a mano, diseñadas por una arquitecta que trabaja la luz como escenografía sensorial. Aura y Frida, a pedido y a tu medida.",
  openGraph: {
    title: "Cosas Raras — Lámparas hechas a mano",
    description:
      "Objetos diseñados para que tu casa tenga mucho color, vida, estilo y personalidad.",
    images: ["/images/hero-main-wide.webp"],
    locale: "es_CO",
    type: "website",
  },
  icons: {
    icon: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className={`${display.variable} ${body.variable} bg-cream`}>
        <CustomCursor />
        <Grain />
        {children}
      </body>
    </html>
  );
}
