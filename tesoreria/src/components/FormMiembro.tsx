import { Formulario } from "./Formulario";
import { accionGuardarMiembro } from "@/app/acciones/miembros";

type Miembro = {
  id?: number; nombre?: string; tipo_persona?: string; vinculo?: string; clase_asociado?: string | null; estado?: string;
  fecha_vinculacion?: string | null; fecha_retiro?: string | null; observaciones?: string | null;
  telefono?: string | null; correo?: string | null; direccion?: string | null; otro?: string | null;
};

export function FormMiembro({ m = {} }: { m?: Miembro }) {
  return (
    <Formulario accion={accionGuardarMiembro} boton={m.id ? "Guardar cambios" : "Registrar"} className="space-y-6">
      {m.id && <input type="hidden" name="id" value={m.id} />}
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="campo sm:col-span-2"><span>Nombre de la persona u organización</span>
          <input name="nombre" className="entrada" defaultValue={m.nombre} required maxLength={200} /></label>
        <label className="campo"><span>Tipo</span>
          <select name="tipo_persona" className="entrada" defaultValue={m.tipo_persona ?? "natural"}>
            <option value="natural">Persona natural</option><option value="organizacion">Organización</option>
          </select></label>
        <label className="campo"><span>Vínculo</span>
          <select name="vinculo" className="entrada" defaultValue={m.vinculo ?? ""} required>
            <option value="">Seleccione…</option>
            <option value="asociado">Asociado de la Corporación</option>
            <option value="aportante">Aportante de la Red</option>
            <option value="otro">Otro</option>
          </select>
          <span className="ayuda">No todas las personas de la Red son asociadas de la Corporación ni tienen obligación de aportar.</span></label>
        <label className="campo"><span>Clase de asociado (si aplica)</span>
          <select name="clase_asociado" className="entrada" defaultValue={m.clase_asociado ?? ""}>
            <option value="">—</option><option value="activo">Activo (art. 8)</option><option value="honorario">Honorario (art. 9)</option>
          </select></label>
        <label className="campo"><span>Fecha de vinculación</span>
          <input type="date" name="fecha_vinculacion" className="entrada" defaultValue={m.fecha_vinculacion ?? ""} /></label>
        <label className="campo"><span>Estado</span>
          <select name="estado" className="entrada" defaultValue={m.estado ?? "activo"}>
            <option value="activo">Activo</option><option value="retirado">Retirado</option>
          </select></label>
        <label className="campo"><span>Fecha de retiro (si aplica)</span>
          <input type="date" name="fecha_retiro" className="entrada" defaultValue={m.fecha_retiro ?? ""} /></label>
        <label className="campo sm:col-span-2"><span>Observaciones</span>
          <textarea name="observaciones" className="entrada min-h-[5rem]" defaultValue={m.observaciones ?? ""} maxLength={1000} /></label>
      </div>
      <fieldset className="grid gap-5 rounded-md border border-linea p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-olivo">Contacto (opcional · solo visible para tesorería)</legend>
        <label className="campo"><span>Teléfono</span><input name="telefono" className="entrada" defaultValue={m.telefono ?? ""} maxLength={60} /></label>
        <label className="campo"><span>Correo</span><input type="email" name="correo" className="entrada" defaultValue={m.correo ?? ""} maxLength={120} /></label>
        <label className="campo"><span>Dirección o municipio</span><input name="direccion" className="entrada" defaultValue={m.direccion ?? ""} maxLength={200} /></label>
        <label className="campo"><span>Otro</span><input name="otro_contacto" className="entrada" defaultValue={m.otro ?? ""} maxLength={300} /></label>
      </fieldset>
    </Formulario>
  );
}
