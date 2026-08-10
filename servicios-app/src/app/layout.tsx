import type { Metadata, Viewport } from "next";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

export const metadata: Metadata = {
  title: "Mis Servicios",
  description: "Seguimiento de pagos de servicios públicos",
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "Mis Servicios",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  themeColor: "#158b4b",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="font-sans text-lg antialiased">
        <div className="mx-auto min-h-screen max-w-2xl pb-28">{children}</div>
        <BottomNav />
      </body>
    </html>
  );
}
