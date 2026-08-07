import { notFound } from "next/navigation";
import { getCasoPorToken } from "@/lib/casos";
import { Marca } from "@/components/Logo";

export default async function ConfirmacionPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const caso = getCasoPorToken(token);
  if (!caso) notFound();

  return (
    <main className="min-h-screen bg-gradient-to-b from-hoja-50 via-tierra-50 to-cielo-50 flex items-center justify-center px-4 py-10">
      <div className="max-w-lg w-full space-y-6">
        <div className="flex justify-center">
          <Marca />
        </div>
        <div className="card text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-hoja-100 flex items-center justify-center text-3xl">
            ✅
          </div>
          <h1 className="text-xl font-extrabold text-hoja-800">Hemos recibido su denuncia</h1>
          <p className="text-tierra-600">
            La Red Nacional por la Defensa de la Reforma Agraria recibió la información
            enviada.
          </p>
          <div className="rounded-xl bg-hoja-50 border border-hoja-200 py-4">
            <p className="text-xs uppercase tracking-wide text-hoja-600 font-semibold">
              Su número de denuncia es
            </p>
            <p className="text-2xl font-extrabold text-hoja-800 mt-1">{caso.radicado}</p>
          </div>
          <p className="text-sm text-tierra-600">
            Guarde este número. Cuando una persona de nuestro equipo se comunique con usted,
            deberá informárselo para identificar su denuncia.
          </p>
          <p className="text-sm text-tierra-600">
            En breve nos comunicaremos para conocer mejor la situación y, si corresponde,
            brindarle orientación y acompañamiento.
          </p>
          <a
            href={`/denuncia/descargar/${token}`}
            className="btn-primary w-full justify-center"
          >
            ⬇️ Descargar formulario en Word
          </a>
        </div>
      </div>
    </main>
  );
}
