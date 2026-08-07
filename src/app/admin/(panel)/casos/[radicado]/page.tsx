import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaso } from "@/lib/casos";
import { FormularioAmpliado } from "@/components/admin/FormularioAmpliado";

export default async function CasoPage({ params }: { params: Promise<{ radicado: string }> }) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = getCaso(radicado);
  if (!caso) notFound();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <Link href="/admin" className="text-sm text-hoja-700 hover:underline">← Volver a la matriz</Link>
          <h1 className="text-2xl font-extrabold text-hoja-800 font-mono">{caso.radicado}</h1>
          <p className="text-tierra-500 text-sm">Formulario ampliado — revise y complemente la información</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/admin/casos/${encodeURIComponent(caso.radicado)}/anexos`} className="btn-secondary text-xs">
            📄 Anexos jurídicos
          </Link>
          <Link href={`/admin/casos/${encodeURIComponent(caso.radicado)}/infografia`} className="btn-secondary text-xs">
            🖼️ Infografía
          </Link>
        </div>
      </div>
      <FormularioAmpliado caso={caso} />
    </div>
  );
}
