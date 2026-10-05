import BotonEnviar from "./BotonEnviar";
import { ESTADOS_DEBATE, INSTANCIAS, type Debate } from "@/lib/types";

type Props = {
  accion: (fd: FormData) => Promise<void>;
  debate?: Partial<Debate>;
  municipioPorDefecto?: string;
  citantesPorDefecto?: string;
  textoBoton: string;
};

export default function FormularioDebate({ accion, debate = {}, municipioPorDefecto, citantesPorDefecto, textoBoton }: Props) {
  return (
    <form action={accion} className="space-y-5">
      {debate.id && <input type="hidden" name="debateId" value={debate.id} />}
      <div>
        <label className="etiqueta" htmlFor="titulo">Título del debate *</label>
        <input id="titulo" name="titulo" required className="campo text-base font-semibold" defaultValue={debate.titulo} placeholder="Ej. Crisis en la prestación del servicio de aseo" />
      </div>
      <div>
        <label className="etiqueta" htmlFor="tema">Tema (completa la frase “…absuelvan el cuestionario sobre…”)</label>
        <input id="tema" name="tema" className="campo" defaultValue={debate.tema} placeholder="la prestación del servicio de aseo y el cumplimiento del contrato de concesión" />
      </div>
      <div className="grid gap-4 sm:grid-cols-3">
        <div>
          <label className="etiqueta" htmlFor="municipio">Municipio</label>
          <input id="municipio" name="municipio" className="campo" defaultValue={debate.municipio ?? municipioPorDefecto} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="instancia">Instancia</label>
          <select id="instancia" name="instancia" className="campo" defaultValue={debate.instancia ?? "plenaria"}>
            {INSTANCIAS.map((i) => (
              <option key={i.valor} value={i.valor}>{i.etiqueta}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="etiqueta" htmlFor="instancia_otra">Nombre si es otra comisión</label>
          <input id="instancia_otra" name="instancia_otra" className="campo" defaultValue={debate.instancia_otra} />
        </div>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="etiqueta" htmlFor="citantes">Concejales citantes (uno por línea)</label>
          <textarea id="citantes" name="citantes" rows={3} className="campo" defaultValue={debate.citantes ?? citantesPorDefecto} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="bancada">Bancada / partido</label>
          <input id="bancada" name="bancada" className="campo" defaultValue={debate.bancada} />
        </div>
      </div>
      <div>
        <label className="etiqueta" htmlFor="objetivo">Objetivo: ¿qué debe quedar demostrado al terminar el debate?</label>
        <textarea id="objetivo" name="objetivo" rows={3} className="campo" defaultValue={debate.objetivo} />
      </div>
      <div>
        <label className="etiqueta" htmlFor="justificacion">Justificación (va en la proposición)</label>
        <textarea id="justificacion" name="justificacion" rows={6} className="campo" defaultValue={debate.justificacion} />
      </div>
      <div className="grid gap-4 sm:grid-cols-4">
        <div>
          <label className="etiqueta" htmlFor="fecha_radicacion">Radicación</label>
          <input id="fecha_radicacion" type="date" name="fecha_radicacion" className="campo" defaultValue={debate.fecha_radicacion ?? ""} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="fecha_aprobacion">Aprobación</label>
          <input id="fecha_aprobacion" type="date" name="fecha_aprobacion" className="campo" defaultValue={debate.fecha_aprobacion ?? ""} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="fecha_debate">Fecha del debate</label>
          <input id="fecha_debate" type="date" name="fecha_debate" className="campo" defaultValue={debate.fecha_debate ?? ""} />
        </div>
        <div>
          <label className="etiqueta" htmlFor="estado">Estado</label>
          <select id="estado" name="estado" className="campo" defaultValue={debate.estado ?? "borrador"}>
            {ESTADOS_DEBATE.map((e) => (
              <option key={e.valor} value={e.valor}>{e.etiqueta}</option>
            ))}
          </select>
        </div>
      </div>
      <div className="flex justify-end">
        <BotonEnviar>{textoBoton}</BotonEnviar>
      </div>
    </form>
  );
}
