import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaso } from "@/lib/casos";
import { getOrCreateAnexo } from "@/lib/anexos";
import { valoresResueltos } from "@/lib/docGenerators/anexo";
import { AnexoEditor } from "@/components/admin/AnexoEditor";
import type { AnexoTipo } from "@/lib/types";

const TIPOS_VALIDOS: AnexoTipo[] = ["derecho_peticion", "denuncia_publica", "alerta_agraria"];

export default async function AnexoTipoPage({
  params,
}: {
  params: Promise<{ radicado: string; tipo: string }>;
}) {
  const { radicado: raw, tipo } = await params;
  const radicado = decodeURIComponent(raw);
  if (!TIPOS_VALIDOS.includes(tipo as AnexoTipo)) notFound();
  const caso = getCaso(radicado);
  if (!caso) notFound();

  const anexo = getOrCreateAnexo(radicado, tipo as AnexoTipo);
  const valores = valoresResueltos(tipo as AnexoTipo, caso, anexo.overrides);

  return (
    <div className="space-y-4">
      <Link href={`/admin/casos/${encodeURIComponent(radicado)}/anexos`} className="text-sm text-hoja-700 hover:underline">
        ← Volver a anexos
      </Link>
      <AnexoEditor radicado={radicado} tipo={tipo as AnexoTipo} anexoInicial={anexo} valoresIniciales={valores} />
    </div>
  );
}
