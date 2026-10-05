import {
  actualizarPreguntaAccion,
  crearPreguntaAccion,
  eliminarCitadoAccion,
  eliminarPreguntaAccion,
  guardarCitadoAccion,
  moverPreguntaAccion,
} from "@/app/actions";
import BotonConfirmar from "@/components/BotonConfirmar";
import BotonEnviar from "@/components/BotonEnviar";
import { observacionesPregunta } from "@/lib/analisis";
import { cargarDebate } from "@/lib/cargar";
import type { Citado, Pregunta } from "@/lib/types";

export default async function Cuestionario({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { debate, citados, preguntas } = await cargarDebate(id);
  const ejes = Array.from(new Set(preguntas.map((p) => p.eje).filter(Boolean)));
  const grupos = [
    ...citados.map((c) => ({ citado: c as Citado | null, preguntas: preguntas.filter((p) => p.citado_id === c.id) })),
    { citado: null, preguntas: preguntas.filter((p) => !p.citado_id) },
  ].filter((g) => g.citado || g.preguntas.length);
  let numero = 0;

  return (
    <div className="grid gap-6 lg:grid-cols-[320px_1fr]">
      <aside className="space-y-4">
        <section className="tarjeta">
          <h2 className="mb-3 text-lg font-semibold">Citados e invitados</h2>
          <ul className="mb-4 space-y-2">
            {citados.length === 0 && <li className="text-sm text-neutral-500">Aún no hay funcionarios citados.</li>}
            {citados.map((c) => (
              <li key={c.id} className="rounded-lg border border-neutral-200 p-3">
                <details>
                  <summary className="cursor-pointer list-none">
                    <p className="text-sm font-semibold text-neutral-900">{c.cargo}</p>
                    <p className="text-xs text-neutral-500">
                      {[c.nombre, c.entidad].filter(Boolean).join(" · ")}
                      {c.tipo === "invitado" && <span className="ml-1 rounded bg-neutral-100 px-1.5 py-0.5 font-semibold">Invitado</span>}
                    </p>
                  </summary>
                  <FormCitado debateId={debate.id} citado={c} />
                  <form action={eliminarCitadoAccion} className="mt-1 text-right">
                    <input type="hidden" name="debateId" value={debate.id} />
                    <input type="hidden" name="id" value={c.id} />
                    <BotonConfirmar mensaje="¿Eliminar este citado? Sus preguntas quedarán sin destinatario." />
                  </form>
                </details>
              </li>
            ))}
          </ul>
          <details open={citados.length === 0}>
            <summary className="btn-secundario w-full cursor-pointer list-none">+ Agregar citado</summary>
            <FormCitado debateId={debate.id} />
          </details>
        </section>
        <p className="rounded-lg bg-amber-50 p-3 text-xs text-amber-900">
          El debate no puede extenderse a asuntos ajenos al cuestionario (Constitución, art. 313 num. 11): todo lo que quiera
          discutir en el recinto debe quedar preguntado aquí.
        </p>
        <p className="rounded-lg bg-sky-50 p-3 text-xs text-sky-900">
          Según la Ley 136 de 1994 (art. 38) se cita a secretarios de despacho, jefes de departamento administrativo, representantes legales de entidades descentralizadas,
          personero y contralor. Al alcalde y a particulares se les invita.
        </p>
      </aside>

      <section className="space-y-5">
        {grupos.map((g) => (
          <div key={g.citado?.id ?? "sin"} className="tarjeta">
            <h3 className="mb-3 font-semibold">
              {g.citado ? `Para: ${g.citado.cargo}` : "Sin destinatario"}
              <span className="ml-2 text-sm font-normal text-neutral-500">{g.preguntas.length} pregunta(s)</span>
            </h3>
            {g.preguntas.length === 0 && <p className="text-sm text-neutral-500">Sin preguntas todavía.</p>}
            <ol className="space-y-3">
              {g.preguntas.map((p) => {
                numero++;
                const obs = observacionesPregunta(p);
                return (
                  <li key={p.id} className="rounded-lg border border-neutral-200 p-3">
                    <div className="flex gap-3">
                      <span className="mt-0.5 text-sm font-bold text-marca-700">{numero}.</span>
                      <div className="min-w-0 flex-1">
                        {p.eje && <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">{p.eje}</p>}
                        <p className="whitespace-pre-line text-sm text-neutral-900">{p.texto}</p>
                        {p.proposito && <p className="mt-1 text-xs italic text-neutral-500">Propósito: {p.proposito}</p>}
                        {obs.length > 0 && (
                          <ul className="mt-2 space-y-0.5">
                            {obs.map((o) => (
                              <li key={o} className="text-xs text-amber-700">⚠ {o}</li>
                            ))}
                          </ul>
                        )}
                        <details className="mt-2">
                          <summary className="btn-mini inline-block cursor-pointer list-none">Editar</summary>
                          <FormPregunta debateId={debate.id} citados={citados} ejes={ejes} pregunta={p} />
                        </details>
                      </div>
                      <div className="flex flex-col items-end gap-0.5">
                        <MoverPregunta debateId={debate.id} id={p.id} direccion="arriba" />
                        <MoverPregunta debateId={debate.id} id={p.id} direccion="abajo" />
                        <form action={eliminarPreguntaAccion}>
                          <input type="hidden" name="debateId" value={debate.id} />
                          <input type="hidden" name="id" value={p.id} />
                          <BotonConfirmar mensaje="¿Eliminar esta pregunta?">✕</BotonConfirmar>
                        </form>
                      </div>
                    </div>
                  </li>
                );
              })}
            </ol>
          </div>
        ))}

        <div className="tarjeta border-dashed">
          <h3 className="mb-3 font-semibold">Nueva pregunta</h3>
          <FormPregunta debateId={debate.id} citados={citados} ejes={ejes} />
        </div>
      </section>
    </div>
  );
}

function FormCitado({ debateId, citado }: { debateId: number; citado?: Citado }) {
  return (
    <form action={guardarCitadoAccion} className="mt-3 space-y-2">
      <input type="hidden" name="debateId" value={debateId} />
      {citado && <input type="hidden" name="id" value={citado.id} />}
      <input name="cargo" required className="campo" placeholder="Cargo * (ej. Secretario de Salud)" defaultValue={citado?.cargo} />
      <input name="nombre" className="campo" placeholder="Nombre" defaultValue={citado?.nombre} />
      <input name="entidad" className="campo" placeholder="Entidad" defaultValue={citado?.entidad} />
      <select name="tipo" className="campo" defaultValue={citado?.tipo ?? "citado"}>
        <option value="citado">Citado (obligado a asistir)</option>
        <option value="invitado">Invitado</option>
      </select>
      <BotonEnviar className="btn-primario w-full">{citado ? "Guardar" : "Agregar"}</BotonEnviar>
    </form>
  );
}

function FormPregunta({ debateId, citados, ejes, pregunta }: { debateId: number; citados: Citado[]; ejes: string[]; pregunta?: Pregunta }) {
  const lista = `ejes-${pregunta?.id ?? "nueva"}`;
  return (
    <form action={pregunta ? actualizarPreguntaAccion : crearPreguntaAccion} className="mt-2 space-y-2">
      <input type="hidden" name="debateId" value={debateId} />
      {pregunta && <input type="hidden" name="id" value={pregunta.id} />}
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="citado_id" className="campo" defaultValue={pregunta?.citado_id ?? citados[0]?.id ?? ""}>
          <option value="">— Sin destinatario —</option>
          {citados.map((c) => (
            <option key={c.id} value={c.id}>{c.cargo}</option>
          ))}
        </select>
        <input name="eje" list={lista} className="campo" placeholder="Eje temático (ej. Contratación)" defaultValue={pregunta?.eje} />
        <datalist id={lista}>
          {ejes.map((e) => (
            <option key={e} value={e} />
          ))}
        </datalist>
      </div>
      <textarea
        name="texto"
        required
        rows={3}
        className="campo"
        placeholder="Pregunta. Mejor si pide cifras, fechas, contratos o documentos: “Relacione…”, “Indique…”, “¿Cuántos…?”"
        defaultValue={pregunta?.texto}
      />
      <input name="proposito" className="campo" placeholder="Propósito (solo para usted, no va en el cuestionario)" defaultValue={pregunta?.proposito} />
      <div className="flex justify-end">
        <BotonEnviar>{pregunta ? "Guardar" : "Agregar pregunta"}</BotonEnviar>
      </div>
    </form>
  );
}

function MoverPregunta({ debateId, id, direccion }: { debateId: number; id: number; direccion: "arriba" | "abajo" }) {
  return (
    <form action={moverPreguntaAccion}>
      <input type="hidden" name="debateId" value={debateId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direccion" value={direccion} />
      <button className="btn-mini" title={direccion === "arriba" ? "Subir" : "Bajar"}>{direccion === "arriba" ? "↑" : "↓"}</button>
    </form>
  );
}
