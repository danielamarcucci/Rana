import { Formulario } from "./Formulario";
import { accionGuardarEsquema } from "@/app/acciones/aportes";
import { pesosCampo } from "@/lib/dinero";
import type { Esquema } from "@/lib/datos/aportes";

export function FormEsquema({ tipo, e }: { tipo: "constitucion" | "mensual"; e?: Esquema }) {
  return (
    <Formulario accion={accionGuardarEsquema} boton={e ? "Guardar cambios" : "Crear esquema"} className="max-w-3xl space-y-6">
      {e && <input type="hidden" name="id" value={e.id} />}
      <input type="hidden" name="tipo" value={tipo} />
      <div className="grid gap-5 sm:grid-cols-2">
        <label className="campo sm:col-span-2"><span>Nombre</span>
          <input name="nombre" className="entrada" required maxLength={150} defaultValue={e?.nombre}
            placeholder={tipo === "constitucion" ? "Aporte de constitución 2026" : "Aporte mensual de sostenimiento 2026"} /></label>
        {tipo === "constitucion" ? (
          <>
            <label className="campo"><span>Presupuesto de gastos de constitución</span><input name="presupuesto_gastos" className="entrada num" defaultValue={pesosCampo(e?.presupuesto_gastos)} placeholder="Por definir" /></label>
            <span className="hidden sm:block" />
            <label className="campo"><span>Meta de recaudo para gastos de constitución</span><input name="meta_gastos" className="entrada num" defaultValue={pesosCampo(e?.meta_gastos)} placeholder="Por definir" /></label>
            <label className="campo"><span>Meta de recaudo para patrimonio inicial</span><input name="meta_patrimonio" className="entrada num" defaultValue={pesosCampo(e?.meta_patrimonio)} placeholder="Por definir" />
              <span className="ayuda">El art. 43 par. 2 menciona $10.000.000 ya pagados; no se carga como meta sin confirmación expresa.</span></label>
          </>
        ) : (
          <>
            <label className="campo"><span>Monto mensual de referencia (opcional)</span><input name="monto_sugerido" className="entrada num" defaultValue={pesosCampo(e?.monto_sugerido)} />
              <span className="ayuda">Cada aportante puede acordar un valor diferente.</span></label>
            <label className="campo"><span>Día de pago acordado (1-28)</span><input name="dia_pago" type="number" min={1} max={28} className="entrada" defaultValue={e?.dia_pago ?? ""} placeholder="Usa el de Configuración" /></label>
          </>
        )}
      </div>
      <fieldset className="grid gap-5 rounded-md border border-linea p-4 sm:grid-cols-2">
        <legend className="px-1 text-sm font-semibold text-olivo">Acuerdo que lo sustenta</legend>
        <label className="campo"><span>Estado</span>
          <select name="estado" className="entrada" defaultValue={e?.estado ?? "propuesta"}>
            <option value="propuesta">Propuesta (no genera obligaciones)</option>
            <option value="aprobado">Aprobado</option>
            <option value="cerrado">Cerrado</option>
          </select></label>
        <label className="campo"><span>Órgano que lo aprobó</span>
          <select name="organo" className="entrada" defaultValue={e?.organo ?? ""}>
            <option value="">—</option><option value="asamblea">Asamblea General</option><option value="junta">Junta Directiva</option><option value="otro">Otro</option>
          </select></label>
        <label className="campo"><span>Referencia del acuerdo</span><input name="referencia_acuerdo" className="entrada" defaultValue={e?.referencia_acuerdo ?? ""} placeholder="Acta n.º 2 de Asamblea" /></label>
        <label className="campo"><span>Fecha del acuerdo</span><input type="date" name="fecha_acuerdo" className="entrada" defaultValue={e?.fecha_acuerdo ?? ""} /></label>
        <label className="campo sm:col-span-2"><span>Soporte del acuerdo (acta, PDF o imagen)</span><input type="file" name="comprobante" accept="application/pdf,image/jpeg,image/png" className="text-sm" />
          <label className="mt-2 flex items-center gap-2 text-sm font-normal"><input type="checkbox" name="sin_datos_personales" value="1" /> Sin datos personales (visible para consulta)</label></label>
        <p className="text-xs text-gris sm:col-span-2">Tesorería registra la referencia del acuerdo. Esto no reemplaza el acta ni constituye una aprobación digital de presidencia u otro órgano.</p>
      </fieldset>
      <label className="campo"><span>Observaciones</span><textarea name="observaciones" className="entrada min-h-[4rem]" defaultValue={e?.observaciones ?? ""} /></label>
    </Formulario>
  );
}
