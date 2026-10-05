import { registrarRespuestaAccion } from "@/app/actions";
import BotonEnviar from "@/components/BotonEnviar";
import { cargarDebate } from "@/lib/cargar";
import { EVALUACIONES } from "@/lib/types";

export default async function Respuestas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { debate, citados, preguntas } = await cargarDebate(id);
  const conteo = EVALUACIONES.map((e) => ({ ...e, n: preguntas.filter((p) => p.evaluacion === e.valor).length }));
  const cargo = (cid: number | null) => citados.find((c) => c.id === cid)?.cargo ?? "Sin destinatario";

  if (preguntas.length === 0) {
    return <p className="tarjeta text-sm text-neutral-500">Primero arme el cuestionario en la pestaña Cuestionario.</p>;
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {conteo.map((e) => (
          <span key={e.valor} className={`rounded-full px-3 py-1 text-sm font-semibold ${e.color}`}>
            {e.etiqueta}: {e.n}
          </span>
        ))}
      </div>
      <p className="text-sm text-neutral-500">
        Transcriba o resuma lo que respondió la administración, evalúe la respuesta y prepare la repregunta para el recinto. Las
        repreguntas aparecen en el Modo debate y en el guion descargable.
      </p>
      {preguntas.map((p, i) => {
        const ev = EVALUACIONES.find((e) => e.valor === p.evaluacion)!;
        return (
          <form key={p.id} action={registrarRespuestaAccion} className="tarjeta space-y-3">
            <input type="hidden" name="debateId" value={debate.id} />
            <input type="hidden" name="id" value={p.id} />
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {i + 1}. {cargo(p.citado_id)}
                  {p.eje && ` · ${p.eje}`}
                </p>
                <p className="whitespace-pre-line text-sm font-medium text-neutral-900">{p.texto}</p>
              </div>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${ev.color}`}>{ev.etiqueta}</span>
            </div>
            <div className="grid gap-3 md:grid-cols-[1fr_200px]">
              <textarea name="respuesta" rows={3} className="campo" placeholder="Respuesta de la administración" defaultValue={p.respuesta} />
              <select name="evaluacion" className="campo h-fit" defaultValue={p.evaluacion}>
                {EVALUACIONES.map((e) => (
                  <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
                ))}
              </select>
            </div>
            <textarea name="repregunta" rows={2} className="campo" placeholder="Repregunta para el recinto (si la respuesta fue parcial, evasiva o contradice las pruebas)" defaultValue={p.repregunta} />
            <div className="flex justify-end">
              <BotonEnviar className="btn-secundario">Guardar</BotonEnviar>
            </div>
          </form>
        );
      })}
    </div>
  );
}
