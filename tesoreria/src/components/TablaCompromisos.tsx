import Link from "next/link";
import { Formulario } from "./Formulario";
import { SituacionCompromiso } from "./ui";
import { accionAnularCompromiso, accionGuardarCompromiso } from "@/app/acciones/aportes";
import { pesos, pesosCampo } from "@/lib/dinero";
import { fecha, mes } from "@/lib/fechas";
import { ETIQUETA_DESTINO } from "@/lib/datos/movimientos";
import type { CompromisoFila } from "@/lib/datos/aportes";

/** Detalle individual de compromisos (solo se usa en páginas de tesorería). */
export function TablaCompromisos({ filas, mostrarMiembro = true, editable = true }: { filas: CompromisoFila[]; mostrarMiembro?: boolean; editable?: boolean }) {
  const tot = filas.filter((f) => f.estado === "vigente").reduce(
    (a, f) => ({ monto: a.monto + f.monto, abonado: a.abonado + f.abonado, saldo: a.saldo + f.saldo }),
    { monto: 0, abonado: 0, saldo: 0 },
  );
  return (
    <div className="panel overflow-x-auto">
      <table className="tabla">
        <thead>
          <tr>
            {mostrarMiembro && <th>Aportante</th>}
            <th>Compromiso</th><th>Fecha acordada</th><th className="der">Acordado</th><th className="der">Abonado</th>
            <th className="der">Saldo</th><th>Estado</th>{editable && <th></th>}
          </tr>
        </thead>
        <tbody>
          {filas.map((c) => (
            <tr key={c.id} className={c.estado === "anulado" ? "text-gris" : ""}>
              {mostrarMiembro && <td><Link href={`/miembros/${c.miembro_id}`}>{c.miembro}</Link></td>}
              <td>
                {ETIQUETA_DESTINO[c.destino]}{c.periodo ? ` · ${mes(c.periodo)}` : ""}
                <span className="block text-xs text-gris">{c.esquema}{c.n_soportes ? ` · ${c.n_soportes} soporte(s)` : ""}</span>
              </td>
              <td className="num whitespace-nowrap">{fecha(c.fecha_acordada)}</td>
              <td className="der">{pesos(c.monto)}</td>
              <td className="der">
                {pesos(c.abonado)}
                {c.por_verificar > 0 && <span className="block text-xs text-aviso">+{pesos(c.por_verificar)} por verificar</span>}
              </td>
              <td className="der">{pesos(c.saldo)}</td>
              <td><SituacionCompromiso s={c.situacion} /></td>
              {editable && (
                <td className="min-w-[7rem]">
                  {c.estado === "vigente" && (
                    <details>
                      <summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Modificar</summary>
                      <div className="mt-2 w-64 space-y-4">
                        <Formulario accion={accionGuardarCompromiso} boton="Guardar" claseBoton="btn-secundario px-3 py-1 text-xs">
                          <input type="hidden" name="id" value={c.id} />
                          <label className="campo"><span className="!text-xs">Monto acordado</span><input name="monto" className="entrada num py-1 text-sm" defaultValue={pesosCampo(c.monto)} /></label>
                          <label className="campo mt-2"><span className="!text-xs">Fecha acordada</span><input type="date" name="fecha_acordada" className="entrada py-1 text-sm" defaultValue={c.fecha_acordada} /></label>
                          <label className="campo mt-2"><span className="!text-xs">Soporte (opcional)</span><input type="file" name="comprobante" accept="application/pdf,image/jpeg,image/png" className="text-xs" /></label>
                        </Formulario>
                        {c.abonado + c.por_verificar === 0 && (
                          <Formulario accion={accionAnularCompromiso} boton="Anular compromiso" claseBoton="btn-enlace text-alerta" confirmar="¿Anular este compromiso?">
                            <input type="hidden" name="id" value={c.id} />
                            <label className="campo"><span className="!text-xs">Motivo</span><input name="motivo" className="entrada py-1 text-sm" required minLength={5} /></label>
                          </Formulario>
                        )}
                      </div>
                    </details>
                  )}
                </td>
              )}
            </tr>
          ))}
        </tbody>
        {filas.length > 1 && (
          <tfoot>
            <tr>
              <td colSpan={mostrarMiembro ? 3 : 2}>Total vigente</td>
              <td className="der">{pesos(tot.monto)}</td><td className="der">{pesos(tot.abonado)}</td><td className="der">{pesos(tot.saldo)}</td>
              <td colSpan={editable ? 2 : 1}></td>
            </tr>
          </tfoot>
        )}
      </table>
    </div>
  );
}
