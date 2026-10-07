import "server-only";
import { enSerie, type Tx } from "../db";
import { disponibleEstimado } from "../calculos";
import { diaAnterior } from "../fechas";

// Todas las consultas de este módulo usan solo vistas y tablas que también
// puede leer el rol de consulta (información agregada, sin personas).

export type SaldoCuenta = {
  cuenta_id: number;
  nombre: string;
  tipo: string;
  activa: boolean;
  fecha_corte: string | null;
  saldo_inicial: number;
  saldo: number;
};

/**
 * Saldo de cada cuenta al final del día `hasta`:
 * saldo inicial confirmado (si su corte es igual o anterior a `hasta`) +
 * efectos de movimientos VERIFICADOS posteriores al corte y hasta esa fecha.
 * Los movimientos con fecha en o antes del corte ya están en el saldo inicial.
 */
export async function saldosCuentas(tx: Tx, hasta: string): Promise<SaldoCuenta[]> {
  const { rows } = await tx.query(
    `SELECT c.id AS cuenta_id, c.nombre, c.tipo, c.activa, k.fecha_corte,
            CASE WHEN k.fecha_corte <= $1 THEN k.saldo_inicial ELSE 0 END AS saldo_inicial,
            (CASE WHEN k.fecha_corte <= $1 THEN k.saldo_inicial ELSE 0 END
              + coalesce((SELECT sum(e.valor) FROM v_efectos e
                           WHERE e.cuenta_id = c.id AND e.estado = 'verificado' AND NOT e.historico
                             AND e.fecha_efectiva <= $1), 0))::bigint AS saldo
       FROM cuentas c JOIN v_cortes k ON k.cuenta_id = c.id
      ORDER BY c.activa DESC, c.nombre`,
    [hasta],
  );
  return rows;
}

export async function cajaTotal(tx: Tx, hasta: string): Promise<number> {
  const s = await saldosCuentas(tx, hasta);
  return s.reduce((a, c) => a + c.saldo, 0);
}

export type Flujos = {
  ingresos: number; // verificados, sin reembolsos ni traslados
  egresos: number; // verificados, brutos
  reembolsos: number; // reembolsos verificados (disminuyen egresos)
  egresos_netos: number;
  saldos_iniciales_en_periodo: number;
};

export async function flujos(tx: Tx, desde: string, hasta: string): Promise<Flujos> {
  const { rows } = await tx.query(
    `SELECT
       coalesce(sum(valor) FILTER (WHERE tipo = 'ingreso' AND reembolsa_a IS NULL), 0)::bigint AS ingresos,
       coalesce(sum(valor) FILTER (WHERE tipo = 'egreso'), 0)::bigint AS egresos,
       coalesce(sum(valor) FILTER (WHERE tipo = 'ingreso' AND reembolsa_a IS NOT NULL), 0)::bigint AS reembolsos
     FROM v_movimientos_consulta
     WHERE estado = 'verificado' AND NOT historico AND fecha_efectiva BETWEEN $1 AND $2`,
    [desde, hasta],
  );
  const { rows: si } = await tx.query(
    `SELECT coalesce(sum(saldo_inicial), 0)::bigint AS v FROM v_cortes WHERE fecha_corte BETWEEN $1 AND $2`,
    [desde, hasta],
  );
  const r = rows[0];
  return { ...r, egresos_netos: r.egresos - r.reembolsos, saldos_iniciales_en_periodo: si[0].v };
}

export type FondoEstado = {
  id: number;
  nombre: string;
  tipo: "reserva" | "proyecto";
  activo: boolean;
  referencia_acuerdo: string | null;
  asignado: number;
  ingresos: number;
  egresos: number;
  saldo: number;
  pendiente: number;
};

/** Saldo de reservas y fondos con destinación específica, y lo pendiente con cargo a cada uno. */
export async function fondosEstado(tx: Tx, hasta: string): Promise<FondoEstado[]> {
  const { rows } = await tx.query(
    `SELECT f.id, f.nombre, f.tipo, f.activo, f.referencia_acuerdo,
            coalesce(a.asignado, 0)::bigint AS asignado,
            coalesce(x.ingresos, 0)::bigint AS ingresos,
            coalesce(x.egresos, 0)::bigint AS egresos,
            (coalesce(a.asignado, 0) + coalesce(x.ingresos, 0) - coalesce(x.egresos, 0))::bigint AS saldo,
            coalesce(o.pendiente, 0)::bigint AS pendiente
       FROM fondos f
       LEFT JOIN (SELECT fondo_id, sum(valor) AS asignado FROM fondo_asignaciones WHERE fecha <= $1 GROUP BY fondo_id) a
              ON a.fondo_id = f.id
       LEFT JOIN (SELECT fondo_id, sum(ingreso) AS ingresos, sum(egreso) - sum(reembolso) AS egresos
                    FROM v_fondo_flujos WHERE fecha_efectiva <= $1 GROUP BY fondo_id) x ON x.fondo_id = f.id
       LEFT JOIN (SELECT fondo_id, sum(saldo) AS pendiente FROM v_obligaciones_estado
                   WHERE estado = 'vigente' AND fondo_id IS NOT NULL GROUP BY fondo_id) o ON o.fondo_id = f.id
      ORDER BY f.activo DESC, f.nombre`,
    [hasta],
  );
  return rows;
}

export type Pendientes = {
  gastos_pendientes: number; // saldo por pagar de gastos comprometidos vigentes
  gastos_pendientes_sin_fondo: number;
  n_gastos_pendientes: number;
  gastos_vencidos: number;
};

export async function gastosPendientes(tx: Tx): Promise<Pendientes> {
  const { rows } = await tx.query(
    `SELECT coalesce(sum(saldo), 0)::bigint AS gastos_pendientes,
            coalesce(sum(saldo) FILTER (WHERE fondo_id IS NULL), 0)::bigint AS gastos_pendientes_sin_fondo,
            count(*) FILTER (WHERE saldo > 0)::int AS n_gastos_pendientes,
            coalesce(sum(saldo) FILTER (WHERE fecha_vencimiento < hoy_co()), 0)::bigint AS gastos_vencidos
       FROM v_obligaciones_estado WHERE estado = 'vigente'`,
  );
  return rows[0];
}

export type PorVerificar = { n: number; ingresos: number; egresos: number; traslados: number };

export async function porVerificar(tx: Tx): Promise<PorVerificar> {
  const { rows } = await tx.query(
    `SELECT count(*)::int AS n,
            coalesce(sum(valor) FILTER (WHERE tipo = 'ingreso'), 0)::bigint AS ingresos,
            coalesce(sum(valor) FILTER (WHERE tipo = 'egreso'), 0)::bigint AS egresos,
            coalesce(sum(valor) FILTER (WHERE tipo = 'traslado'), 0)::bigint AS traslados
       FROM v_movimientos_consulta WHERE estado = 'pendiente'`,
  );
  return rows[0];
}

export type Recaudo = {
  tipo: "constitucion" | "mensual";
  comprometido: number;
  recaudado: number;
  por_verificar: number;
  pendiente: number;
  pendiente_vencido: number;
};

/** Compromisos de aportes (solo esquemas aprobados), agregados por tipo. */
export async function recaudoPorTipo(tx: Tx, hastaPeriodo?: string): Promise<Recaudo[]> {
  const { rows } = await tx.query(
    `SELECT tipo,
            coalesce(sum(comprometido), 0)::bigint AS comprometido,
            coalesce(sum(recaudado), 0)::bigint AS recaudado,
            coalesce(sum(por_verificar), 0)::bigint AS por_verificar,
            coalesce(sum(pendiente), 0)::bigint AS pendiente,
            coalesce(sum(pendiente_vencido), 0)::bigint AS pendiente_vencido
       FROM v_recaudo_agregado
      WHERE esquema_estado <> 'propuesta' AND ($1::date IS NULL OR periodo IS NULL OR periodo <= $1::date)
      GROUP BY tipo`,
    [hastaPeriodo ?? null],
  );
  return rows;
}

export type ResumenFinanciero = {
  desde: string;
  hasta: string;
  saldo_inicial_confirmado: number;
  cortes: { cuenta: string; fecha_corte: string | null; valor: number }[];
  cuentas_sin_saldo_inicial: string[];
  flujos: Flujos;
  caja: number;
  cuentas: SaldoCuenta[];
  pendientes: Pendientes;
  fondos: FondoEstado[];
  reservado: number;
  retenido: number;
  disponible: number;
  por_verificar: PorVerificar;
  recaudo: { constitucion?: Recaudo; mensual?: Recaudo };
};

export async function resumenFinanciero(tx: Tx, desde: string, hasta: string): Promise<ResumenFinanciero> {
  const [cuentasS, fl, pend, fds, pv, rec, cortes] = await enSerie([
    () => saldosCuentas(tx, hasta),
    () => flujos(tx, desde, hasta),
    () => gastosPendientes(tx),
    () => fondosEstado(tx, hasta),
    () => porVerificar(tx),
    () => recaudoPorTipo(tx),
    () => tx.query(
      `SELECT c.nombre AS cuenta, c.activa, k.fecha_corte, k.saldo_inicial AS valor
         FROM cuentas c JOIN v_cortes k ON k.cuenta_id = c.id ORDER BY c.nombre`,
    ),
  ]);
  const caja = cuentasS.reduce((a, c) => a + c.saldo, 0);
  const fondosActivos = fds.filter((f) => f.activo || f.saldo !== 0 || f.pendiente !== 0);
  const { retenido, disponible } = disponibleEstimado(
    caja,
    fondosActivos.map((f) => ({ fondo_id: f.id, saldo: f.saldo, pendiente: f.pendiente })),
    pend.gastos_pendientes_sin_fondo,
  );
  const conCorte = cortes.rows.filter((r) => r.fecha_corte);
  return {
    desde,
    hasta,
    saldo_inicial_confirmado: conCorte.reduce((a, r) => a + r.valor, 0),
    cortes: conCorte,
    cuentas_sin_saldo_inicial: cortes.rows.filter((r) => !r.fecha_corte && r.activa).map((r) => r.cuenta),
    flujos: fl,
    caja,
    cuentas: cuentasS,
    pendientes: pend,
    fondos: fondosActivos,
    reservado: fondosActivos.reduce((a, f) => a + Math.max(f.saldo, 0), 0),
    retenido,
    disponible,
    por_verificar: pv,
    recaudo: Object.fromEntries(rec.map((r) => [r.tipo, r])),
  };
}

export type PuntoMensual = { periodo: string; ingresos: number; egresos: number };

/** Ingresos y egresos netos verificados por mes, para el gráfico. */
export async function serieMensual(tx: Tx, desde: string, hasta: string): Promise<PuntoMensual[]> {
  const { rows } = await tx.query(
    `WITH meses AS (
       SELECT generate_series(date_trunc('month', $1::date), date_trunc('month', $2::date), interval '1 month')::date AS periodo
     )
     SELECT to_char(m.periodo, 'YYYY-MM-DD') AS periodo,
            coalesce(sum(v.valor) FILTER (WHERE v.tipo = 'ingreso' AND v.reembolsa_a IS NULL), 0)::bigint AS ingresos,
            (coalesce(sum(v.valor) FILTER (WHERE v.tipo = 'egreso'), 0)
             - coalesce(sum(v.valor) FILTER (WHERE v.tipo = 'ingreso' AND v.reembolsa_a IS NOT NULL), 0))::bigint AS egresos
       FROM meses m
       LEFT JOIN v_movimientos_consulta v
         ON date_trunc('month', v.fecha_efectiva) = m.periodo
        AND v.estado = 'verificado' AND NOT v.historico
        AND v.fecha_efectiva BETWEEN $1 AND $2
      GROUP BY m.periodo ORDER BY m.periodo`,
    [desde, hasta],
  );
  return rows;
}

export type MovimientoBreve = {
  id: number;
  fecha_efectiva: string;
  tipo: "ingreso" | "egreso" | "traslado";
  concepto: string;
  tercero: string | null;
  categoria: string | null;
  cuenta: string;
  cuenta_destino: string | null;
  valor: number;
  estado: "pendiente" | "verificado" | "anulado";
  historico: boolean;
  reembolsa_a: number | null;
  tiene_soporte: boolean;
};

export async function ultimosMovimientos(tx: Tx, desde: string, hasta: string, limite = 8): Promise<MovimientoBreve[]> {
  const { rows } = await tx.query(
    `SELECT v.id, v.fecha_efectiva, v.tipo, v.concepto, v.tercero, cat.nombre AS categoria,
            c.nombre AS cuenta, cd.nombre AS cuenta_destino, v.valor, v.estado, v.historico, v.reembolsa_a, v.tiene_soporte
       FROM v_movimientos_consulta v
       JOIN cuentas c ON c.id = v.cuenta_id
       LEFT JOIN cuentas cd ON cd.id = v.cuenta_destino_id
       LEFT JOIN categorias cat ON cat.id = v.categoria_id
      WHERE v.fecha_efectiva BETWEEN $1 AND $2 AND v.estado <> 'anulado'
      ORDER BY v.fecha_efectiva DESC, v.id DESC LIMIT $3`,
    [desde, hasta, limite],
  );
  return rows;
}

/** Saldo de caja al cierre del día anterior a `desde` (saldo inicial de un periodo). */
export async function cajaAntesDe(tx: Tx, desde: string): Promise<number> {
  return cajaTotal(tx, diaAnterior(desde));
}
