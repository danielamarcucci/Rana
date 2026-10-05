import { guardarConfiguracionAccion } from "@/app/actions";
import BotonEnviar from "@/components/BotonEnviar";
import { obtenerConfiguracion } from "@/lib/configuracion";

export const dynamic = "force-dynamic";

export default async function Configuracion() {
  const cfg = await obtenerConfiguracion();
  return (
    <main className="mx-auto max-w-2xl">
      <h1 className="mb-1 text-2xl font-bold">Configuración</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Datos que se usan por defecto en los debates nuevos y en los documentos, y los plazos del reglamento interno de su concejo.
      </p>
      <form action={guardarConfiguracionAccion} className="tarjeta space-y-5">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="etiqueta" htmlFor="concejo">Nombre de la corporación</label>
            <input id="concejo" name="concejo" className="campo" defaultValue={cfg.concejo} />
          </div>
          <div>
            <label className="etiqueta" htmlFor="municipio">Municipio</label>
            <input id="municipio" name="municipio" className="campo" defaultValue={cfg.municipio} />
          </div>
        </div>
        <div>
          <label className="etiqueta" htmlFor="concejal">Concejal(es) citante(s) por defecto (uno por línea)</label>
          <textarea id="concejal" name="concejal" rows={2} className="campo" defaultValue={cfg.concejal} />
        </div>
        <fieldset className="space-y-4 rounded-lg border border-neutral-200 p-4">
          <legend className="px-1 text-sm font-semibold">Plazos (días hábiles)</legend>
          <div className="grid gap-4 sm:grid-cols-3">
            <div>
              <label className="etiqueta" htmlFor="diasAnticipacionCitacion">Anticipación de la citación</label>
              <input id="diasAnticipacionCitacion" name="diasAnticipacionCitacion" type="number" min={1} max={30} className="campo" defaultValue={cfg.diasAnticipacionCitacion} />
            </div>
            <div>
              <label className="etiqueta" htmlFor="diasRespuestaAntesDebate">Respuesta antes del debate</label>
              <input id="diasRespuestaAntesDebate" name="diasRespuestaAntesDebate" type="number" min={0} max={30} className="campo" defaultValue={cfg.diasRespuestaAntesDebate} />
            </div>
            <div>
              <label className="etiqueta" htmlFor="minutosIntervencion">Minutos de intervención</label>
              <input id="minutosIntervencion" name="minutosIntervencion" type="number" min={1} max={180} className="campo" defaultValue={cfg.minutosIntervencion} />
            </div>
          </div>
          <p className="text-xs text-neutral-500">
            La Constitución (art. 313 num. 11) exige citar con anticipación no menor de 5 días y por cuestionario escrito. El plazo de
            respuesta escrita y el tiempo de intervención dependen del reglamento interno de cada concejo: verifíquelos.
          </p>
        </fieldset>
        <div className="flex justify-end">
          <BotonEnviar>Guardar</BotonEnviar>
        </div>
      </form>
    </main>
  );
}
