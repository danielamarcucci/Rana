import Link from "next/link";
import { actualizarDebateAccion, eliminarDebateAccion } from "@/app/actions";
import BotonEnviar from "@/components/BotonEnviar";
import FormularioDebate from "@/components/FormularioDebate";
import { cronograma, listaVerificacion } from "@/lib/analisis";
import { cargarDebate } from "@/lib/cargar";
import { formatFecha, textoDias } from "@/lib/format";
import { diasHabilesHasta, hoyIso } from "@/lib/plazos";

export default async function Resumen({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await cargarDebate(id);
  const hitos = cronograma(d, d.cfg);
  const checks = listaVerificacion(d);
  const listos = checks.filter((c) => c.ok).length;
  const hoy = hoyIso();
  const base = `/debates/${d.debate.id}`;

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_360px]">
      <section className="tarjeta">
        <h2 className="mb-4 text-lg font-semibold">Datos del debate</h2>
        <FormularioDebate accion={actualizarDebateAccion} debate={d.debate} textoBoton="Guardar cambios" />
      </section>

      <aside className="space-y-6">
        <section className="tarjeta">
          <h2 className="mb-1 text-lg font-semibold">Cronograma</h2>
          {!d.debate.fecha_debate && (
            <p className="mb-3 text-sm text-amber-700">Defina la fecha del debate para calcular los plazos.</p>
          )}
          <ol className="relative mt-3 space-y-4 border-l border-neutral-200 pl-5">
            {hitos.map((h) => {
              const dias = h.fecha ? diasHabilesHasta(hoy, h.fecha) : null;
              const atrasado = !h.cumplido && dias !== null && dias < 0;
              return (
                <li key={h.clave} className="relative">
                  <span
                    className={`absolute -left-[27px] top-1 h-3 w-3 rounded-full border-2 border-white ${
                      h.cumplido ? "bg-emerald-500" : atrasado ? "bg-red-500" : "bg-neutral-300"
                    }`}
                  />
                  <p className="text-sm font-semibold text-neutral-900">{h.etiqueta}</p>
                  <p className={`text-sm ${atrasado ? "font-semibold text-red-700" : "text-neutral-600"}`}>
                    {formatFecha(h.fecha)}
                    {h.fecha && !h.cumplido && ` · ${textoDias(dias)}`}
                  </p>
                  <p className="mt-0.5 text-xs text-neutral-500">{h.detalle}</p>
                </li>
              );
            })}
          </ol>
        </section>

        <section className="tarjeta">
          <div className="mb-3 flex items-baseline justify-between">
            <h2 className="text-lg font-semibold">Preparación</h2>
            <span className="text-sm font-semibold text-neutral-500">{listos}/{checks.length}</span>
          </div>
          <div className="mb-4 h-2 overflow-hidden rounded-full bg-neutral-100">
            <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(listos / checks.length) * 100}%` }} />
          </div>
          <ul className="space-y-2">
            {checks.map((c) => (
              <li key={c.etiqueta} className="flex gap-2 text-sm">
                <span className={c.ok ? "text-emerald-600" : "text-neutral-300"}>{c.ok ? "✔" : "○"}</span>
                <div>
                  {c.href && !c.ok ? (
                    <Link href={base + c.href} className="font-medium text-marca-700 hover:underline">{c.etiqueta}</Link>
                  ) : (
                    <span className={c.ok ? "text-neutral-700" : "font-medium text-neutral-900"}>{c.etiqueta}</span>
                  )}
                  {c.ayuda && <p className="text-xs text-neutral-500">{c.ayuda}</p>}
                </div>
              </li>
            ))}
          </ul>
        </section>

        <details className="tarjeta">
          <summary className="cursor-pointer text-sm font-semibold text-red-700">Eliminar debate</summary>
          <form action={eliminarDebateAccion} className="mt-3 space-y-2">
            <input type="hidden" name="debateId" value={d.debate.id} />
            <p className="text-xs text-neutral-500">Se borran también citados, preguntas, pruebas, peticiones y guion. Escriba ELIMINAR para confirmar.</p>
            <input name="confirmacion" className="campo" placeholder="ELIMINAR" required pattern="[Ee][Ll][Ii][Mm][Ii][Nn][Aa][Rr]" />
            <BotonEnviar className="btn-peligro w-full" pendiente="Eliminando…">Eliminar definitivamente</BotonEnviar>
          </form>
        </details>
      </aside>
    </div>
  );
}
