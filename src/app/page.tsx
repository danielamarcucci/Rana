import Link from "next/link";
import { Marca } from "@/components/Logo";

export default function HomePage() {
  return (
    <main className="min-h-screen bg-gradient-to-b from-hoja-50 via-tierra-50 to-cielo-50 flex flex-col items-center justify-center px-4 py-16 text-center gap-8">
      <Marca />
      <div className="max-w-xl space-y-4">
        <h1 className="text-3xl sm:text-4xl font-extrabold text-hoja-800">
          Sistema de denuncias de la Red
        </h1>
        <p className="text-tierra-600">
          Un espacio para que personas y comunidades beneficiarias de la Reforma Agraria
          reporten amenazas, agresiones o hechos de violencia, y reciban orientación y
          acompañamiento.
        </p>
      </div>
      <Link href="/denuncia" className="btn-primary text-base px-8 py-3">
        📢 Reportar un hecho
      </Link>
      <Link href="/admin/login" className="text-xs text-tierra-400 hover:text-tierra-600 underline">
        Acceso equipo de la Red
      </Link>
    </main>
  );
}
