import { notFound } from "next/navigation";
import Link from "next/link";
import { getCaso } from "@/lib/casos";
import { listAnexos } from "@/lib/anexos";
import { NOMBRE_TIPO } from "@/lib/docGenerators/anexoCampos";
import type { AnexoTipo } from "@/lib/types";

const TIPOS: AnexoTipo[] = ["derecho_peticion", "denuncia_publica", "alerta_agraria"];

export default async function AnexosCasoPage({ params }: { params: Promise<{ radicado: string }> }) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = getCaso(radicado);
  if (!caso) notFound();

  const anexos = listAnexos(radicado);
  const rutaJuridica = caso.data.rutaJuridica ?? [];
  const mapaRuta: Record<AnexoTipo, string> = {
    derecho_peticion: "derecho_peticion",
    denuncia_publica: "denuncia_publica",
    alerta_agraria: "alerta",
  };

  return (
    <div className="space-y-4">
      <div>
        <Link href={`/admin/casos/${encodeURIComponent(radicado)}`} className="text-sm text-hoja-700 hover:underline">
          ← Volver al caso
        </Link>
        <h1 className="text-2xl font-extrabold text-hoja-800 font-mono">{radicado}</h1>
        <p className="text-tierra-500 text-sm">Anexos de ruta jurídica y de derechos humanos</p>
      </div>

      {rutaJuridica.length === 0 && (
        <div className="card border-tierra-200 bg-tierra-50 text-tierra-600 text-sm">
          Este caso todavía no tiene marcada ninguna ruta jurídica en el numeral 12 del
          formulario ampliado. Puede generar los anexos de todas formas, pero se recomienda
          primero indicar cuál(es) ruta(s) aplica(n).
        </div>
      )}

      <div className="grid sm:grid-cols-3 gap-4">
        {TIPOS.map((tipo) => {
          const anexo = anexos.find((a) => a.tipo === tipo);
          const habilitado = rutaJuridica.includes(mapaRuta[tipo]);
          return (
            <div key={tipo} className={`card space-y-3 ${habilitado ? "border-hoja-300" : ""}`}>
              <h2 className="font-bold text-hoja-800">{NOMBRE_TIPO[tipo]}</h2>
              {habilitado ? (
                <span className="badge bg-hoja-100 text-hoja-700">Ruta marcada en el caso</span>
              ) : (
                <span className="badge bg-tierra-100 text-tierra-500">No marcada, disponible igual</span>
              )}
              {anexo && (
                <p className="text-xs text-tierra-500">
                  Estado: {anexo.estado === "version_final" ? "✅ Versión final" : "📝 Borrador"}
                </p>
              )}
              <div className="flex flex-col gap-2">
                <Link href={`/admin/casos/${encodeURIComponent(radicado)}/anexos/${tipo}`} className="btn-primary text-xs">
                  Revisar y editar
                </Link>
                <a href={`/api/admin/casos/${encodeURIComponent(radicado)}/anexos/${tipo}/descargar`} className="btn-secondary text-xs">
                  ⬇️ Descargar
                </a>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
