import "server-only";
import type { Tx } from "../db";

export type PresupuestoAnual = { anio: number; estado: "borrador" | "aprobado"; referencia_acta: string | null; fecha_aprobacion: string | null } | null;

export async function presupuestoAnual(tx: Tx, anio: number): Promise<PresupuestoAnual> {
  const { rows } = await tx.query("SELECT anio, estado, referencia_acta, fecha_aprobacion FROM presupuesto_anual WHERE anio = $1", [anio]);
  return rows[0] ?? null;
}

export type CeldaPresupuesto = { categoria_id: number; mes: number; presupuesto: number; ejecutado: number };

/**
 * Presupuesto y ejecución por categoría y mes. Ejecutado = egresos verificados
 * (posteriores al saldo inicial) menos reembolsos verificados de esa categoría.
 */
export async function ejecucion(tx: Tx, anio: number): Promise<CeldaPresupuesto[]> {
  const { rows } = await tx.query(
    `WITH ej AS (
       SELECT categoria_id, extract(month FROM fecha_efectiva)::int AS mes,
              sum(CASE WHEN tipo = 'egreso' THEN valor ELSE -valor END) AS ejecutado
         FROM v_movimientos_consulta
        WHERE estado = 'verificado' AND NOT historico AND categoria_id IS NOT NULL
          AND (tipo = 'egreso' OR (tipo = 'ingreso' AND reembolsa_a IS NOT NULL))
          AND fecha_efectiva BETWEEN make_date($1, 1, 1) AND make_date($1, 12, 31)
        GROUP BY 1, 2
     )
     SELECT coalesce(p.categoria_id, ej.categoria_id) AS categoria_id, coalesce(p.mes, ej.mes) AS mes,
            coalesce(p.monto, 0)::bigint AS presupuesto, coalesce(ej.ejecutado, 0)::bigint AS ejecutado
       FROM (SELECT categoria_id, mes, monto FROM presupuesto WHERE anio = $1) p
       FULL JOIN ej ON ej.categoria_id = p.categoria_id AND ej.mes = p.mes`,
    [anio],
  );
  return rows;
}

export type Obligacion = {
  id: number; descripcion: string; tercero: string | null; categoria: string; categoria_id: number; fondo: string | null; fondo_id: number | null;
  monto: number; pagado: number; pago_por_verificar: number; saldo: number; fecha_compromiso: string; fecha_vencimiento: string | null;
  referencia_autorizacion: string | null; estado: string; motivo_anulacion: string | null;
};

export async function obligaciones(tx: Tx, incluirCerradas = false): Promise<Obligacion[]> {
  const { rows } = await tx.query(
    `SELECT o.id, o.descripcion, o.tercero, c.nombre AS categoria, o.categoria_id, f.nombre AS fondo, o.fondo_id, o.monto, o.pagado,
            o.pago_por_verificar, o.saldo, o.fecha_compromiso, o.fecha_vencimiento, o.referencia_autorizacion, o.estado, o.motivo_anulacion
       FROM v_obligaciones_estado o JOIN categorias c ON c.id = o.categoria_id LEFT JOIN fondos f ON f.id = o.fondo_id
      WHERE $1 OR (o.estado = 'vigente' AND o.saldo > 0)
      ORDER BY o.estado, o.saldo = 0, o.fecha_vencimiento NULLS LAST, o.fecha_compromiso`,
    [incluirCerradas],
  );
  return rows;
}

export async function asignaciones(tx: Tx) {
  const { rows } = await tx.query(
    `SELECT a.id, a.fondo_id, f.nombre AS fondo, a.fecha, a.valor, a.motivo, a.referencia, a.registrado_en
       FROM fondo_asignaciones a JOIN fondos f ON f.id = a.fondo_id ORDER BY a.fecha DESC, a.id DESC LIMIT 100`,
  );
  return rows as { id: number; fondo_id: number; fondo: string; fecha: string; valor: number; motivo: string; referencia: string | null }[];
}
