import {
  eliminarFuenteAccion,
  eliminarPeticionAccion,
  guardarFuenteAccion,
  guardarPeticionAccion,
} from "@/app/actions";
import BotonConfirmar from "@/components/BotonConfirmar";
import BotonEnviar from "@/components/BotonEnviar";
import { cronograma, estadoPeticion } from "@/lib/analisis";
import { cargarDebate } from "@/lib/cargar";
import { formatFecha, textoDias } from "@/lib/format";
import { hoyIso } from "@/lib/plazos";
import { ESTADOS_PETICION, TIPOS_FUENTE, TIPOS_PETICION, type Fuente, type Peticion } from "@/lib/types";

export default async function Pruebas({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const d = await cargarDebate(id);
  const { debate, fuentes, peticiones } = d;
  const limiteCuestionario = cronograma(d, d.cfg).find((h) => h.clave === "cuestionario")?.fecha ?? null;

  return (
    <div className="grid gap-6 xl:grid-cols-2">
      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Pruebas y fuentes</h2>
          <p className="text-sm text-neutral-500">Documentos, datos y testimonios que sostienen cada afirmación del debate.</p>
        </div>
        {fuentes.map((f) => (
          <div key={f.id} className="tarjeta">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-neutral-400">
                  {TIPOS_FUENTE.find((t) => t.valor === f.tipo)?.etiqueta}
                </p>
                <p className="font-semibold">{f.titulo}</p>
              </div>
              <span className={`whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${f.verificada ? "bg-emerald-100 text-emerald-800" : "bg-amber-100 text-amber-800"}`}>
                {f.verificada ? "Verificada" : "Por verificar"}
              </span>
            </div>
            {f.descripcion && <p className="mt-1 whitespace-pre-line text-sm text-neutral-600">{f.descripcion}</p>}
            {f.hallazgo && <p className="mt-2 rounded bg-neutral-50 p-2 text-sm"><b>Hallazgo:</b> {f.hallazgo}</p>}
            {f.url && (
              <a href={f.url} target="_blank" rel="noopener noreferrer" className="mt-2 inline-block break-all text-sm text-marca-700 hover:underline">
                {f.url}
              </a>
            )}
            <details className="mt-2">
              <summary className="btn-mini inline-block cursor-pointer list-none">Editar</summary>
              <FormFuente debateId={debate.id} fuente={f} />
            </details>
            <form action={eliminarFuenteAccion} className="text-right">
              <input type="hidden" name="debateId" value={debate.id} />
              <input type="hidden" name="id" value={f.id} />
              <BotonConfirmar />
            </form>
          </div>
        ))}
        <details className="tarjeta border-dashed" open={fuentes.length === 0}>
          <summary className="cursor-pointer font-semibold">+ Agregar prueba</summary>
          <FormFuente debateId={debate.id} />
        </details>
      </section>

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">Derechos de petición</h2>
          <p className="text-sm text-neutral-500">
            Solicitudes previas de información (Ley 1755 de 2015). El vencimiento se calcula en días hábiles, sin festivos.
          </p>
        </div>
        {peticiones.map((p) => {
          const e = estadoPeticion(p, hoyIso());
          const tarde = limiteCuestionario && e.vence > limiteCuestionario && p.estado === "enviada";
          return (
            <div key={p.id} className="tarjeta">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-semibold">{p.entidad}</p>
                  {p.asunto && <p className="text-sm text-neutral-600">{p.asunto}</p>}
                </div>
                <span className="whitespace-nowrap rounded-full bg-neutral-100 px-2 py-0.5 text-xs font-semibold text-neutral-700">
                  {ESTADOS_PETICION.find((x) => x.valor === p.estado)?.etiqueta}
                </span>
              </div>
              <dl className="mt-2 grid grid-cols-2 gap-1 text-sm">
                <dt className="text-neutral-500">Enviada</dt>
                <dd>{formatFecha(p.fecha_envio)}{p.radicado && ` · Rad. ${p.radicado}`}</dd>
                <dt className="text-neutral-500">Vence</dt>
                <dd className={p.estado === "enviada" && e.vencida ? "font-semibold text-red-700" : ""}>
                  {formatFecha(e.vence)}
                  {p.estado === "enviada" && ` · ${textoDias(e.restantes)}`}
                </dd>
              </dl>
              {p.estado === "enviada" && e.vencida && (
                <p className="mt-2 text-xs text-red-700">Venció sin respuesta: puede insistir, acudir a la Personería o anunciarlo en el debate.</p>
              )}
              {tarde && (
                <p className="mt-2 text-xs text-amber-700">
                  Vence después del límite para enviar el cuestionario ({formatFecha(limiteCuestionario)}): la información podría no llegar a tiempo.
                </p>
              )}
              {p.notas && <p className="mt-2 whitespace-pre-line text-sm text-neutral-600">{p.notas}</p>}
              <details className="mt-2">
                <summary className="btn-mini inline-block cursor-pointer list-none">Editar / actualizar estado</summary>
                <FormPeticion debateId={debate.id} peticion={p} />
              </details>
              <form action={eliminarPeticionAccion} className="text-right">
                <input type="hidden" name="debateId" value={debate.id} />
                <input type="hidden" name="id" value={p.id} />
                <BotonConfirmar />
              </form>
            </div>
          );
        })}
        <details className="tarjeta border-dashed" open={peticiones.length === 0}>
          <summary className="cursor-pointer font-semibold">+ Registrar derecho de petición</summary>
          <FormPeticion debateId={debate.id} />
        </details>
      </section>
    </div>
  );
}

function FormFuente({ debateId, fuente }: { debateId: number; fuente?: Fuente }) {
  return (
    <form action={guardarFuenteAccion} className="mt-3 space-y-2">
      <input type="hidden" name="debateId" value={debateId} />
      {fuente && <input type="hidden" name="id" value={fuente.id} />}
      <div className="grid gap-2 sm:grid-cols-[180px_1fr]">
        <select name="tipo" className="campo" defaultValue={fuente?.tipo ?? "documento"}>
          {TIPOS_FUENTE.map((t) => (
            <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
          ))}
        </select>
        <input name="titulo" required className="campo" placeholder="Título *" defaultValue={fuente?.titulo} />
      </div>
      <textarea name="descripcion" rows={2} className="campo" placeholder="Descripción / dónde se obtuvo" defaultValue={fuente?.descripcion} />
      <textarea name="hallazgo" rows={2} className="campo" placeholder="¿Qué demuestra? (el dato o hallazgo concreto)" defaultValue={fuente?.hallazgo} />
      <input name="url" type="url" className="campo" placeholder="Enlace (https://…)" defaultValue={fuente?.url} />
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" name="verificada" defaultChecked={!!fuente?.verificada} /> Verificada (contrastada con fuente oficial)
      </label>
      <div className="flex justify-end">
        <BotonEnviar>{fuente ? "Guardar" : "Agregar"}</BotonEnviar>
      </div>
    </form>
  );
}

function FormPeticion({ debateId, peticion }: { debateId: number; peticion?: Peticion }) {
  return (
    <form action={guardarPeticionAccion} className="mt-3 space-y-2">
      <input type="hidden" name="debateId" value={debateId} />
      {peticion && <input type="hidden" name="id" value={peticion.id} />}
      <input name="entidad" required className="campo" placeholder="Entidad *" defaultValue={peticion?.entidad} />
      <input name="asunto" className="campo" placeholder="Asunto / información solicitada" defaultValue={peticion?.asunto} />
      <div className="grid gap-2 sm:grid-cols-2">
        <select name="tipo" className="campo" defaultValue={peticion?.tipo ?? "informacion"}>
          {TIPOS_PETICION.map((t) => (
            <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
          ))}
        </select>
        <input name="fecha_envio" type="date" required className="campo" defaultValue={peticion?.fecha_envio ?? hoyIso()} />
        <input name="radicado" className="campo" placeholder="Número de radicado" defaultValue={peticion?.radicado} />
        <select name="estado" className="campo" defaultValue={peticion?.estado ?? "enviada"}>
          {ESTADOS_PETICION.map((t) => (
            <option key={t.valor} value={t.valor}>{t.etiqueta}</option>
          ))}
        </select>
      </div>
      <textarea name="notas" rows={2} className="campo" placeholder="Notas (qué respondieron, qué faltó)" defaultValue={peticion?.notas} />
      <div className="flex justify-end">
        <BotonEnviar>{peticion ? "Guardar" : "Registrar"}</BotonEnviar>
      </div>
    </form>
  );
}
