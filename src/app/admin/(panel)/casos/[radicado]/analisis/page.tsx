import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaso } from "@/lib/casos";
import { analizarCaso } from "@/lib/docGenerators/analisis";
import { AnalisisPrevio } from "@/components/admin/AnalisisPrevio";

export default async function AnalisisCasoPage({
  params,
}: {
  params: Promise<{ radicado: string }>;
}) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = await getCaso(radicado);
  if (!caso) notFound();

  const analisis = analizarCaso(caso);

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/admin/casos/${encodeURIComponent(radicado)}`} className="text-sm text-hoja-700 hover:underline">
          ← Volver al caso
        </Link>
        <h1 className="text-2xl font-extrabold text-hoja-800 font-mono">{radicado}</h1>
        <p className="text-tierra-500 text-sm">Análisis previo — ruta jurídica y de derechos humanos</p>
      </div>
      <AnalisisPrevio caso={caso} analisis={analisis} />
    </div>
  );
}
