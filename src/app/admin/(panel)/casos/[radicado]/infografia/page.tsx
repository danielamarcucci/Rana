import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaso } from "@/lib/casos";
import { listAnexos } from "@/lib/anexos";
import { valoresResueltos } from "@/lib/docGenerators/anexo";
import { sugeridosInfografia } from "@/lib/docGenerators/sugeridosInfografia";
import { getOrCreateInfografia } from "@/lib/infografias";
import { InfografiaEditor } from "@/components/admin/InfografiaEditor";

export default async function InfografiaCasoPage({
  params,
}: {
  params: Promise<{ radicado: string }>;
}) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = getCaso(radicado);
  if (!caso) notFound();

  const anexos = listAnexos(radicado);
  const anexoFinal = anexos.find((a) => a.estado === "version_final") ?? null;
  const habilitado = anexoFinal !== null;
  const valoresAnexo = anexoFinal ? valoresResueltos(anexoFinal.tipo, caso, anexoFinal.overrides) : null;
  const infografia = getOrCreateInfografia(radicado, sugeridosInfografia(caso, valoresAnexo));

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/admin/casos/${encodeURIComponent(radicado)}`} className="text-sm text-hoja-700 hover:underline">
          ← Volver al caso
        </Link>
        <h1 className="text-2xl font-extrabold text-hoja-800 font-mono">{radicado}</h1>
        <p className="text-tierra-500 text-sm">Ficha gráfica (infografía) para publicar</p>
      </div>
      <InfografiaEditor radicado={radicado} infografiaInicial={infografia} habilitado={habilitado} />
    </div>
  );
}
