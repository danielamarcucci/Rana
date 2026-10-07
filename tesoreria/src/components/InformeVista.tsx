import Link from "next/link";
import { pesos } from "@/lib/dinero";
import { fecha, mes } from "@/lib/fechas";
import type { Informe } from "@/lib/datos/informe";
import { ETIQUETA_DESTINO } from "@/lib/datos/movimientos";
import { Seccion } from "./ui";

function Fila({ k, v, fuerte, sangria }: { k: React.ReactNode; v: number; fuerte?: boolean; sangria?: boolean }) {
  return (
    <tr className={fuerte ? "font-semibold" : ""}>
      <td className={sangria ? "pl-6" : ""}>{k}</td>
      <td className="der">{pesos(v)}</td>
    </tr>
  );
}

export function InformeVista({ inf }: { inf: Informe }) {
  const meta = (x: number | null) => (x === null ? "por definir" : pesos(x));
  return (
    <div>
      <div className="grid gap-x-10 lg:grid-cols-2">
        <Seccion titulo="Estado de caja del periodo">
          <table className="tabla">
            <tbody>
              <Fila k={`Saldo inicial (al ${fecha(inf.desde)})`} v={inf.saldo_inicial} fuerte />
              {inf.flujos.saldos_iniciales_en_periodo > 0 && <Fila k="+ Saldos iniciales confirmados con corte en el mes" v={inf.flujos.saldos_iniciales_en_periodo} />}
              <Fila k="+ Ingresos verificados" v={inf.flujos.ingresos} />
              <Fila k="− Egresos verificados" v={inf.flujos.egresos} />
              {inf.flujos.reembolsos > 0 && <Fila k="+ Reembolsos de egresos" v={inf.flujos.reembolsos} />}
            </tbody>
            <tfoot><tr><td>Saldo final (al {fecha(inf.hasta)})</td><td className="der">{pesos(inf.saldo_final)}</td></tr></tfoot>
          </table>
          {inf.traslados > 0 && <p className="mt-2 text-xs text-gris">Traslados entre cuentas propias por {pesos(inf.traslados)}: no son ingresos ni egresos.</p>}
          {inf.cuentas.length > 0 && (
            <table className="tabla mt-4">
              <thead><tr><th>Cuenta</th><th className="der">Inicial</th><th className="der">Final</th></tr></thead>
              <tbody>{inf.cuentas.map((c) => <tr key={c.nombre}><td>{c.nombre}</td><td className="der">{pesos(c.inicial)}</td><td className="der">{pesos(c.final)}</td></tr>)}</tbody>
            </table>
          )}
        </Seccion>

        <Seccion titulo="Disponibilidad estimada" nota="Gastos por pagar a la fecha de generación del informe.">
          <table className="tabla">
            <tbody>
              <Fila k="Saldo final de caja y bancos" v={inf.saldo_final} fuerte />
              <Fila k="− Reservas y fondos con destinación específica (incluye sus gastos pendientes)" v={inf.retenido} />
              <Fila k="− Gastos por pagar sin fondo asignado" v={inf.gastos_por_pagar_sin_fondo} />
            </tbody>
            <tfoot><tr><td>Disponible estimado</td><td className="der">{pesos(inf.disponible)}</td></tr></tfoot>
          </table>
          <p className="mt-2 text-xs text-gris">Total de gastos comprometidos por pagar: {pesos(inf.gastos_por_pagar)}.</p>
          {inf.fondos.length > 0 && (
            <table className="tabla mt-4">
              <thead><tr><th>Reserva o fondo</th><th className="der">Saldo</th><th className="der">Pendiente</th></tr></thead>
              <tbody>{inf.fondos.map((f) => <tr key={f.id}><td>{f.nombre}</td><td className="der">{pesos(f.saldo)}</td><td className="der">{pesos(f.pendiente)}</td></tr>)}</tbody>
            </table>
          )}
        </Seccion>
      </div>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Seccion titulo="Ingresos del periodo por concepto">
          {inf.ingresos_concepto.length === 0 ? <p className="text-sm text-gris">Sin ingresos verificados.</p> : (
            <table className="tabla">
              <tbody>{inf.ingresos_concepto.map((r) => <Fila key={r.concepto} k={r.concepto} v={r.valor} />)}</tbody>
              <tfoot><tr><td>Total</td><td className="der">{pesos(inf.flujos.ingresos)}</td></tr></tfoot>
            </table>
          )}
        </Seccion>
        <Seccion titulo="Egresos del periodo por categoría">
          {inf.egresos_categoria.length === 0 ? <p className="text-sm text-gris">Sin egresos verificados.</p> : (
            <table className="tabla">
              <thead><tr><th>Categoría</th><th className="der">Egresos</th><th className="der">Reembolsos</th><th className="der">Neto</th></tr></thead>
              <tbody>{inf.egresos_categoria.map((r) => (
                <tr key={r.categoria}><td>{r.categoria}</td><td className="der">{pesos(r.egresos)}</td><td className="der">{r.reembolsos ? pesos(r.reembolsos) : "—"}</td><td className="der">{pesos(r.neto)}</td></tr>
              ))}</tbody>
              <tfoot><tr><td>Total</td><td className="der">{pesos(inf.flujos.egresos)}</td><td className="der">{pesos(inf.flujos.reembolsos)}</td><td className="der">{pesos(inf.flujos.egresos_netos)}</td></tr></tfoot>
            </table>
          )}
        </Seccion>
      </div>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Seccion titulo="Avance del recaudo" nota="Recaudado = abonos verificados. Lo comprometido no es dinero recibido.">
          {inf.constitucion.map((c) => (
            <div key={c.esquema} className="mb-4">
              <p className="mb-1 text-sm font-semibold">Constitución · {c.esquema}</p>
              <table className="tabla">
                <thead><tr><th>Destino</th><th className="der">Meta</th><th className="der">Comprometido</th><th className="der">Recaudado</th><th className="der">Pendiente</th></tr></thead>
                <tbody>
                  <tr><td>Gastos de constitución</td><td className="der">{meta(c.meta_gastos)}</td><td className="der">{pesos(c.gastos.comprometido)}</td><td className="der">{pesos(c.gastos.recaudado)}</td><td className="der">{pesos(c.gastos.pendiente)}</td></tr>
                  <tr><td>Patrimonio inicial</td><td className="der">{meta(c.meta_patrimonio)}</td><td className="der">{pesos(c.patrimonio.comprometido)}</td><td className="der">{pesos(c.patrimonio.recaudado)}</td><td className="der">{pesos(c.patrimonio.pendiente)}</td></tr>
                </tbody>
              </table>
            </div>
          ))}
          <p className="mb-1 text-sm font-semibold">Sostenimiento · {mes(inf.periodo)}</p>
          <table className="tabla">
            <tbody>
              <Fila k={`Comprometido del mes (${inf.sostenimiento_mes.compromisos} compromiso(s))`} v={inf.sostenimiento_mes.comprometido} />
              <Fila k={`Recaudado del mes (${inf.sostenimiento_mes.completos} completo(s))`} v={inf.sostenimiento_mes.recaudado} />
              <Fila k="Pendiente del mes" v={inf.sostenimiento_mes.pendiente} />
            </tbody>
          </table>
        </Seccion>
        <Seccion titulo="Compromisos de aportes pendientes (agregado)" nota={`Acumulado hasta ${mes(inf.periodo)}.`}>
          <table className="tabla">
            <thead><tr><th>Aporte</th><th className="der">Pendiente</th><th className="der">Con fecha vencida</th></tr></thead>
            <tbody>
              {inf.pendientes_aportes.map((p) => (
                <tr key={p.tipo}><td>{p.tipo === "constitucion" ? "Constitución" : "Mensual de sostenimiento"}</td><td className="der">{pesos(p.pendiente)}</td><td className="der">{pesos(p.vencido)}</td></tr>
              ))}
            </tbody>
          </table>
        </Seccion>
      </div>

      <Seccion titulo="Control">
        <ul className="space-y-1 text-sm">
          <li>Movimientos del mes por verificar: <strong>{inf.control.por_verificar}</strong>{inf.control.por_verificar ? ` (${pesos(inf.control.por_verificar_valor)})` : ""}</li>
          <li>Movimientos verificados sin soporte: <strong>{inf.control.sin_soporte}</strong></li>
          <li>Cierre del mes: {inf.control.cierres.length === 0 ? "sin cerrar" : inf.control.cierres.map((c) => `${c.cuenta}: ${c.estado}${c.diferencia ? ` (diferencia ${pesos(c.diferencia)}: ${c.explicacion})` : ""}`).join(" · ")}</li>
        </ul>
      </Seccion>

      {inf.detalle && (
        <>
          <Seccion titulo="Detalle de movimientos del mes (tesorería)">
            <div className="panel overflow-x-auto">
              <table className="tabla">
                <thead><tr><th>Fecha</th><th>N.º</th><th>Concepto</th><th>Persona</th><th>Estado</th><th className="der">Valor</th></tr></thead>
                <tbody>{inf.detalle.movimientos.map((m) => (
                  <tr key={m.id}><td className="num">{fecha(m.fecha_efectiva)}</td><td><Link href={`/movimientos/${m.id}`}>MOV-{String(m.id).padStart(5, "0")}</Link></td>
                    <td>{m.concepto}<span className="block text-xs text-gris">{m.tipo}{m.categoria ? ` · ${m.categoria}` : ""}</span></td>
                    <td className="text-xs">{m.miembro ?? m.tercero ?? "—"}</td><td className="text-xs">{m.estado}</td>
                    <td className="der">{m.tipo === "egreso" ? "−" : ""}{pesos(m.valor)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Seccion>
          <Seccion titulo="Detalle de compromisos pendientes (tesorería)">
            <div className="panel overflow-x-auto">
              <table className="tabla">
                <thead><tr><th>Aportante</th><th>Compromiso</th><th>Fecha acordada</th><th className="der">Saldo</th></tr></thead>
                <tbody>{inf.detalle.pendientes.map((c) => (
                  <tr key={c.id}><td>{c.miembro}</td><td>{ETIQUETA_DESTINO[c.destino]}{c.periodo ? ` · ${mes(c.periodo)}` : ""}</td><td className="num">{fecha(c.fecha_acordada)}</td><td className="der">{pesos(c.saldo)}</td></tr>
                ))}</tbody>
              </table>
            </div>
          </Seccion>
        </>
      )}
    </div>
  );
}
