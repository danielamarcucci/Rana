import { eliminarSeccionAccion, guardarSeccionAccion, moverSeccionAccion } from "@/app/actions";
import BotonConfirmar from "@/components/BotonConfirmar";
import BotonEnviar from "@/components/BotonEnviar";
import { cargarDebate } from "@/lib/cargar";
import type { SeccionGuion } from "@/lib/types";

export default async function Guion({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { debate, guion, cfg } = await cargarDebate(id);
  const total = guion.reduce((s, x) => s + Number(x.minutos), 0);
  const excede = total > cfg.minutosIntervencion;

  return (
    <div className="space-y-4">
      <div className={`rounded-lg p-3 text-sm ${excede ? "bg-amber-50 text-amber-900" : "bg-neutral-100 text-neutral-700"}`}>
        Tiempo total: <b>{total} min</b> de {cfg.minutosIntervencion} disponibles
        {excede && " — supera el tiempo configurado; recorte o priorice secciones."}
      </div>
      {guion.map((s, i) => (
        <div key={s.id} className="tarjeta">
          <div className="flex gap-3">
            <div className="flex flex-col">
              <Mover debateId={debate.id} id={s.id} direccion="arriba" deshabilitado={i === 0} />
              <Mover debateId={debate.id} id={s.id} direccion="abajo" deshabilitado={i === guion.length - 1} />
            </div>
            <div className="flex-1">
              <FormSeccion debateId={debate.id} seccion={s} />
            </div>
          </div>
          <form action={eliminarSeccionAccion} className="text-right">
            <input type="hidden" name="debateId" value={debate.id} />
            <input type="hidden" name="id" value={s.id} />
            <BotonConfirmar mensaje="¿Eliminar esta sección del guion?" />
          </form>
        </div>
      ))}
      <details className="tarjeta border-dashed" open={guion.length === 0}>
        <summary className="cursor-pointer font-semibold">+ Agregar sección</summary>
        <FormSeccion debateId={debate.id} />
      </details>
    </div>
  );
}

function FormSeccion({ debateId, seccion }: { debateId: number; seccion?: SeccionGuion }) {
  return (
    <form action={guardarSeccionAccion} className="mt-2 space-y-2">
      <input type="hidden" name="debateId" value={debateId} />
      {seccion && <input type="hidden" name="id" value={seccion.id} />}
      <div className="grid gap-2 sm:grid-cols-[1fr_120px]">
        <input name="titulo" required className="campo font-semibold" placeholder="Título de la sección" defaultValue={seccion?.titulo} />
        <div className="flex items-center gap-1">
          <input name="minutos" type="number" min={0} max={120} className="campo" defaultValue={seccion?.minutos ?? 3} />
          <span className="text-sm text-neutral-500">min</span>
        </div>
      </div>
      <textarea name="contenido" rows={5} className="campo" placeholder="Lo que va a decir, cifras y fuentes a citar…" defaultValue={seccion?.contenido} />
      <div className="flex justify-end">
        <BotonEnviar className={seccion ? "btn-secundario" : "btn-primario"}>{seccion ? "Guardar" : "Agregar"}</BotonEnviar>
      </div>
    </form>
  );
}

function Mover({ debateId, id, direccion, deshabilitado }: { debateId: number; id: number; direccion: "arriba" | "abajo"; deshabilitado: boolean }) {
  return (
    <form action={moverSeccionAccion}>
      <input type="hidden" name="debateId" value={debateId} />
      <input type="hidden" name="id" value={id} />
      <input type="hidden" name="direccion" value={direccion} />
      <button className="btn-mini disabled:opacity-30" disabled={deshabilitado} title={direccion === "arriba" ? "Subir" : "Bajar"}>
        {direccion === "arriba" ? "↑" : "↓"}
      </button>
    </form>
  );
}
