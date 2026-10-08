import { Marca } from "@/components/Marca";

export default function LayoutAcceso({ children }: { children: React.ReactNode }) {
  return (
    <main className="min-h-screen bg-fondo px-4 py-10 sm:py-16">
      <div className="mx-auto w-full max-w-md">
        <div className="mb-8 flex justify-center">
          <Marca grande />
        </div>
        <div className="panel p-6 sm:p-8">{children}</div>
        <p className="mt-6 text-center text-xs text-gris">
          Corporación por la Defensa de la Reforma Agraria · Uso exclusivo de la Junta Directiva y personas autorizadas
        </p>
      </div>
    </main>
  );
}
