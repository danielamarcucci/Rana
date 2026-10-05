import Link from "next/link";
import EstadoBadge from "@/components/EstadoBadge";
import Pestanas from "@/components/Pestanas";
import { diasParaDebate } from "@/lib/analisis";
import { cargarDebate } from "@/lib/cargar";
import { formatFechaLarga, nombreInstancia, textoDias } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LayoutDebate({ children, params }: { children: React.ReactNode; params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { debate, citados, preguntas, fuentes, peticiones, guion } = await cargarDebate(id);
  const evaluadas = preguntas.filter((p) => p.evaluacion !== "pendiente").length;
  const minutos = guion.reduce((s, x) => s + Number(x.minutos), 0);

  return (
    <div>
      <Link href="/" className="no-imprimir text-sm font-semibold text-marca-700">‹ Debates</Link>
      <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold leading-tight text-neutral-900">{debate.titulo}</h1>
          <p className="mt-1 text-sm text-neutral-500">
            {nombreInstancia(debate)}
            {debate.municipio && ` · ${debate.municipio}`}
            {debate.fecha_debate && ` · ${formatFechaLarga(debate.fecha_debate)} (${textoDias(diasParaDebate(debate.fecha_debate)).toLowerCase()})`}
          </p>
        </div>
        <EstadoBadge estado={debate.estado} />
      </div>
      <div className="mb-6 mt-4 border-b border-neutral-200">
        <Pestanas
          base={`/debates/${debate.id}`}
          pestanas={[
            { ruta: "", etiqueta: "Resumen" },
            { ruta: "/cuestionario", etiqueta: "Cuestionario", contador: `${citados.length}·${preguntas.length}` },
            { ruta: "/pruebas", etiqueta: "Pruebas y peticiones", contador: String(fuentes.length + peticiones.length) },
            { ruta: "/respuestas", etiqueta: "Respuestas", contador: preguntas.length ? `${evaluadas}/${preguntas.length}` : undefined },
            { ruta: "/guion", etiqueta: "Guion", contador: minutos ? `${minutos}′` : undefined },
            { ruta: "/en-vivo", etiqueta: "Modo debate" },
            { ruta: "/documentos", etiqueta: "Documentos" },
          ]}
        />
      </div>
      {children}
    </div>
  );
}
