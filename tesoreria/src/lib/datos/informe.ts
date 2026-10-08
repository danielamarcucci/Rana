import "server-only";
import { enSerie, type Tx } from "../db";
import type { Rol } from "../sesion";
import { diaAnterior, finMes } from "../fechas";
import { disponibleEstimado } from "../calculos";
import { fondosEstado, flujos, gastosPendientes, saldosCuentas, type FondoEstado, type Flujos } from "./finanzas";
import { compromisos, esquemas, recaudo, type CompromisoFila } from "./aportes";
import { listarMovimientos, type FilaMovimiento } from "./movimientos";

export type Informe = {
  periodo: string;
  desde: string;
  hasta: string;
  saldo_inicial: number;
  saldo_final: number;
  flujos: Flujos;
  traslados: number;
  ingresos_concepto: { concepto: string; valor: number }[];
  egresos_categoria: { categoria: string; egresos: number; reembolsos: number; neto: number }[];
  cuentas: { nombre: string; inicial: number; final: number }[];
  constitucion: {
    esquema: string; estado: string; meta_gastos: number | null; meta_patrimonio: number | null; presupuesto_gastos: number | null;
    gastos: { comprometido: number; recaudado: number; pendiente: number };
    patrimonio: { comprometido: number; recaudado: number; pendiente: number };
  }[];
  sostenimiento_mes: { comprometido: number; recaudado: number; pendiente: number; compromisos: number; completos: number };
  pendientes_aportes: { tipo: string; pendiente: number; vencido: number; compromisos: number }[];
  gastos_por_pagar: number;
  gastos_por_pagar_sin_fondo: number;
  fondos: FondoEstado[];
  retenido: number;
  disponible: number;
  control: { por_verificar: number; por_verificar_valor: number; sin_soporte: number; cierres: { cuenta: string; estado: string; diferencia: number; explicacion: string | null }[] };
  detalle?: { movimientos: FilaMovimiento[]; pendientes: CompromisoFila[] };
};

function sum<T>(xs: T[], f: (x: T) => number) {
  return xs.reduce((a, x) => a + f(x), 0);
}

/**
 * Informe mensual. La versión de consulta es agregada; tesorería puede
 * pedir además el detalle individual (detalle = true).
 */
export async function informeMensual(tx: Tx, rol: Rol, periodo: string, detalle: boolean): Promise<Informe> {
  const desde = periodo;
  const hasta = finMes(periodo);
  const [antes, despues, fl, ic, ec, tr, rec, esq, gp, fds, ctrl, ci] = await enSerie([
    () => saldosCuentas(tx, diaAnterior(desde)),
    () => saldosCuentas(tx, hasta),
    () => flujos(tx, desde, hasta),
    () => tx.query(
      `SELECT concepto, sum(valor)::bigint AS valor FROM v_ingresos_concepto
        WHERE estado = 'verificado' AND NOT historico AND fecha_efectiva BETWEEN $1 AND $2 GROUP BY concepto ORDER BY valor DESC`,
      [desde, hasta],
    ),
    () => tx.query(
      `SELECT coalesce(c.nombre, 'Sin categoría') AS categoria,
              coalesce(sum(v.valor) FILTER (WHERE v.tipo = 'egreso'), 0)::bigint AS egresos,
              coalesce(sum(v.valor) FILTER (WHERE v.tipo = 'ingreso'), 0)::bigint AS reembolsos
         FROM v_movimientos_consulta v LEFT JOIN categorias c ON c.id = v.categoria_id
        WHERE v.estado = 'verificado' AND NOT v.historico AND v.fecha_efectiva BETWEEN $1 AND $2
          AND (v.tipo = 'egreso' OR v.reembolsa_a IS NOT NULL)
        GROUP BY c.nombre, c.orden ORDER BY c.orden, c.nombre`,
      [desde, hasta],
    ),
    () => tx.query(
      `SELECT coalesce(sum(valor), 0)::bigint AS v FROM v_movimientos_consulta
        WHERE tipo = 'traslado' AND estado = 'verificado' AND fecha_efectiva BETWEEN $1 AND $2`,
      [desde, hasta],
    ),
    () => recaudo(tx),
    () => esquemas(tx),
    () => gastosPendientes(tx),
    () => fondosEstado(tx, hasta),
    () => tx.query(
      `SELECT count(*) FILTER (WHERE estado = 'pendiente')::int AS por_verificar,
              coalesce(sum(valor) FILTER (WHERE estado = 'pendiente'), 0)::bigint AS por_verificar_valor,
              count(*) FILTER (WHERE estado = 'verificado' AND NOT tiene_soporte)::int AS sin_soporte
         FROM v_movimientos_consulta WHERE fecha_efectiva BETWEEN $1 AND $2`,
      [desde, hasta],
    ),
    () => tx.query(
      `SELECT c.nombre AS cuenta, x.estado, x.diferencia, x.explicacion FROM cierres x JOIN cuentas c ON c.id = x.cuenta_id
        WHERE x.periodo = $1 ORDER BY c.nombre`,
      [periodo],
    ),
  ]);

  const caja = sum(despues, (c) => c.saldo);
  const fondosVis = fds.filter((f) => f.activo || f.saldo !== 0 || f.pendiente !== 0);
  const { retenido, disponible } = disponibleEstimado(
    caja,
    fondosVis.map((f) => ({ fondo_id: f.id, saldo: f.saldo, pendiente: f.pendiente })),
    gp.gastos_pendientes_sin_fondo,
  );

  const aprobados = rec.filter((r) => esq.find((e) => e.id === r.esquema_id)?.estado !== "propuesta");
  const constitucion = esq
    .filter((e) => e.tipo === "constitucion" && e.estado !== "propuesta")
    .map((e) => {
      const f = aprobados.filter((r) => r.esquema_id === e.id);
      const parte = (destino: string) => {
        const g = f.filter((r) => r.destino === destino);
        return { comprometido: sum(g, (r) => r.comprometido), recaudado: sum(g, (r) => r.recaudado), pendiente: sum(g, (r) => r.pendiente) };
      };
      return {
        esquema: e.nombre, estado: e.estado, meta_gastos: e.meta_gastos, meta_patrimonio: e.meta_patrimonio, presupuesto_gastos: e.presupuesto_gastos,
        gastos: parte("gastos_constitucion"), patrimonio: parte("patrimonio_inicial"),
      };
    });
  const mesS = aprobados.filter((r) => r.periodo === periodo);
  const hastaPeriodo = aprobados.filter((r) => !r.periodo || r.periodo <= periodo);
  const pendientes_aportes = (["constitucion", "mensual"] as const).map((t) => {
    const g = hastaPeriodo.filter((r) => (t === "mensual") === Boolean(r.periodo));
    return { tipo: t, pendiente: sum(g, (r) => r.pendiente), vencido: sum(g, (r) => r.pendiente_vencido ?? 0), compromisos: sum(g, (r) => r.compromisos) };
  });

  const inf: Informe = {
    periodo, desde, hasta,
    saldo_inicial: sum(antes, (c) => c.saldo),
    saldo_final: caja,
    flujos: fl,
    traslados: tr.rows[0].v,
    ingresos_concepto: ic.rows,
    egresos_categoria: ec.rows.map((r) => ({ ...r, neto: r.egresos - r.reembolsos })),
    cuentas: despues.filter((c) => c.activa || c.saldo !== 0).map((c) => ({ nombre: c.nombre, inicial: antes.find((a) => a.cuenta_id === c.cuenta_id)?.saldo ?? 0, final: c.saldo })),
    constitucion,
    sostenimiento_mes: {
      comprometido: sum(mesS, (r) => r.comprometido), recaudado: sum(mesS, (r) => r.recaudado), pendiente: sum(mesS, (r) => r.pendiente),
      compromisos: sum(mesS, (r) => r.compromisos), completos: sum(mesS, (r) => r.n_completos),
    },
    pendientes_aportes,
    gastos_por_pagar: gp.gastos_pendientes,
    gastos_por_pagar_sin_fondo: gp.gastos_pendientes_sin_fondo,
    fondos: fondosVis,
    retenido,
    disponible,
    control: { ...ctrl.rows[0], cierres: ci.rows },
  };
  if (detalle && rol === "tesoreria") {
    const comps = await compromisos(tx);
    inf.detalle = {
      movimientos: await listarMovimientos(tx, rol, { desde, hasta, limite: 1000, estado: "activos" }),
      pendientes: comps.filter((c) => c.saldo > 0 && (!c.periodo || c.periodo <= periodo)),
    };
  }
  return inf;
}

/** Datos para el cierre mensual de cada cuenta (solo tesorería). */
export async function datosCierre(tx: Tx, periodo: string) {
  const hasta = finMes(periodo);
  const saldos = await saldosCuentas(tx, hasta);
  const { rows: existentes } = await tx.query(
    `SELECT x.*, u.nombre AS cerrado_por_nombre FROM cierres x LEFT JOIN usuarios u ON u.id = x.cerrado_por WHERE x.periodo = $1`,
    [periodo],
  );
  const { rows: revisar } = await tx.query(
    `SELECT v.id, v.fecha_efectiva, v.tipo, v.concepto, v.valor, v.estado, v.tiene_soporte, v.cuenta_id, v.cuenta_destino_id
       FROM v_movimientos_consulta v
      WHERE v.fecha_efectiva BETWEEN $1 AND $2 AND (v.estado = 'pendiente' OR (v.estado = 'verificado' AND NOT v.tiene_soporte))
      ORDER BY v.fecha_efectiva, v.id`,
    [periodo, hasta],
  );
  return { saldos, existentes, revisar };
}
