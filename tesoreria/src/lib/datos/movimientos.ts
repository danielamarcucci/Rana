import "server-only";
import type { Tx } from "../db";
import type { Rol } from "../sesion";

export type FiltroMovimientos = {
  desde?: string;
  hasta?: string;
  tipo?: string;
  estado?: string;
  cuenta?: number;
  categoria?: number;
  miembro?: number;
  q?: string;
  sinSoporte?: boolean;
  limite?: number;
};

export type FilaMovimiento = {
  id: number;
  fecha_efectiva: string;
  tipo: "ingreso" | "egreso" | "traslado";
  cuenta: string;
  cuenta_destino: string | null;
  categoria: string | null;
  concepto: string;
  tercero: string | null;
  miembro: string | null;
  miembro_id: number | null;
  valor: number;
  estado: "pendiente" | "verificado" | "anulado";
  historico: boolean;
  tiene_soporte: boolean;
  reembolsa_a: number | null;
  obligacion_id: number | null;
  fondo: string | null;
  corrige_a: number | null;
};

/**
 * Lista de movimientos. Tesorería ve el detalle completo; consulta lee la
 * vista sin nombres de aportantes (la base de datos no le permite leer la
 * tabla de movimientos directamente).
 */
export async function listarMovimientos(tx: Tx, rol: Rol, f: FiltroMovimientos): Promise<FilaMovimiento[]> {
  const cond: string[] = [];
  const p: unknown[] = [];
  const add = (sql: string, v: unknown) => {
    p.push(v);
    cond.push(sql.replaceAll("?", `$${p.length}`));
  };
  if (f.desde) add("v.fecha_efectiva >= ?", f.desde);
  if (f.hasta) add("v.fecha_efectiva <= ?", f.hasta);
  if (f.tipo === "reembolso") cond.push("v.reembolsa_a IS NOT NULL");
  else if (f.tipo) add("v.tipo = ?", f.tipo);
  if (f.estado === "activos") cond.push("v.estado <> 'anulado'");
  else if (f.estado) add("v.estado = ?", f.estado);
  if (f.cuenta) add("(v.cuenta_id = ? OR v.cuenta_destino_id = ?)", f.cuenta);
  if (f.categoria) add("v.categoria_id = ?", f.categoria);
  if (f.sinSoporte) cond.push("NOT v.tiene_soporte");
  const tes = rol === "tesoreria";
  if (tes && f.miembro) add("m.miembro_id = ?", f.miembro);
  if (f.q) {
    const campo = tes ? "(m.concepto || ' ' || coalesce(m.tercero, '') || ' ' || coalesce(mi.nombre, ''))" : "(v.concepto || ' ' || coalesce(v.tercero, ''))";
    add(`${campo} ILIKE ?`, `%${f.q.replace(/[%_\\]/g, "\\$&")}%`);
  }
  p.push(Math.min(f.limite ?? 300, 1000));
  const where = cond.length ? "WHERE " + cond.join(" AND ") : "";
  const sql = tes
    ? `SELECT v.id, v.fecha_efectiva, v.tipo, c.nombre AS cuenta, cd.nombre AS cuenta_destino, cat.nombre AS categoria,
              m.concepto, m.tercero, mi.nombre AS miembro, m.miembro_id, v.valor, v.estado, v.historico, v.tiene_soporte,
              v.reembolsa_a, v.obligacion_id, fo.nombre AS fondo, v.corrige_a
         FROM v_movimientos_consulta v
         JOIN movimientos m ON m.id = v.id
         LEFT JOIN miembros mi ON mi.id = m.miembro_id
         JOIN cuentas c ON c.id = v.cuenta_id
         LEFT JOIN cuentas cd ON cd.id = v.cuenta_destino_id
         LEFT JOIN categorias cat ON cat.id = v.categoria_id
         LEFT JOIN fondos fo ON fo.id = v.fondo_id
         ${where}
        ORDER BY v.fecha_efectiva DESC, v.id DESC LIMIT $${p.length}`
    : `SELECT v.id, v.fecha_efectiva, v.tipo, c.nombre AS cuenta, cd.nombre AS cuenta_destino, cat.nombre AS categoria,
              v.concepto, v.tercero, NULL AS miembro, NULL::int AS miembro_id, v.valor, v.estado, v.historico, v.tiene_soporte,
              v.reembolsa_a, v.obligacion_id, fo.nombre AS fondo, v.corrige_a
         FROM v_movimientos_consulta v
         JOIN cuentas c ON c.id = v.cuenta_id
         LEFT JOIN cuentas cd ON cd.id = v.cuenta_destino_id
         LEFT JOIN categorias cat ON cat.id = v.categoria_id
         LEFT JOIN fondos fo ON fo.id = v.fondo_id
         ${where}
        ORDER BY v.fecha_efectiva DESC, v.id DESC LIMIT $${p.length}`;
  const { rows } = await tx.query(sql, p);
  return rows;
}

export type DetalleMovimiento = FilaMovimiento & {
  cuenta_id: number;
  cuenta_destino_id: number | null;
  categoria_id: number | null;
  fondo_id: number | null;
  medio_pago: string | null;
  referencia_autorizacion: string | null;
  excedente_destino: string | null;
  observaciones: string | null;
  registrado_en: string;
  registrado_por_nombre: string | null;
  verificado_en: string | null;
  verificado_por_nombre: string | null;
  anulado_en: string | null;
  anulado_por_nombre: string | null;
  motivo_anulacion: string | null;
  obligacion: string | null;
  de_miembro: boolean;
};

export async function detalleMovimiento(tx: Tx, rol: Rol, id: number): Promise<DetalleMovimiento | null> {
  const tes = rol === "tesoreria";
  const { rows } = await tx.query(
    `SELECT v.id, v.fecha_efectiva, v.tipo, v.cuenta_id, v.cuenta_destino_id, v.categoria_id, v.fondo_id,
            c.nombre AS cuenta, cd.nombre AS cuenta_destino, cat.nombre AS categoria, fo.nombre AS fondo,
            ${tes ? "m.concepto, m.tercero, mi.nombre AS miembro, m.miembro_id, m.observaciones," : "v.concepto, v.tercero, NULL AS miembro, NULL::int AS miembro_id, NULL AS observaciones,"}
            v.valor, v.estado, v.historico, v.tiene_soporte, v.reembolsa_a, v.obligacion_id, v.corrige_a,
            v.medio_pago, v.referencia_autorizacion, v.excedente_destino, v.de_miembro,
            v.registrado_en, v.verificado_en, v.anulado_en, v.motivo_anulacion,
            ob.descripcion AS obligacion,
            ${tes ? "ur.nombre AS registrado_por_nombre, uv.nombre AS verificado_por_nombre, ua.nombre AS anulado_por_nombre" : "NULL AS registrado_por_nombre, NULL AS verificado_por_nombre, NULL AS anulado_por_nombre"}
       FROM v_movimientos_consulta v
       ${tes ? "JOIN movimientos m ON m.id = v.id LEFT JOIN miembros mi ON mi.id = m.miembro_id LEFT JOIN usuarios ur ON ur.id = m.registrado_por LEFT JOIN usuarios uv ON uv.id = m.verificado_por LEFT JOIN usuarios ua ON ua.id = m.anulado_por" : ""}
       JOIN cuentas c ON c.id = v.cuenta_id
       LEFT JOIN cuentas cd ON cd.id = v.cuenta_destino_id
       LEFT JOIN categorias cat ON cat.id = v.categoria_id
       LEFT JOIN fondos fo ON fo.id = v.fondo_id
       LEFT JOIN obligaciones ob ON ob.id = v.obligacion_id
      WHERE v.id = $1`,
    [id],
  );
  return rows[0] ?? null;
}

export type AplicacionDetalle = {
  id: number;
  compromiso_id: number;
  valor: number;
  tipo: string;
  destino: string;
  periodo: string | null;
  esquema: string;
  miembro: string;
};

export async function aplicacionesDe(tx: Tx, movimientoId: number): Promise<AplicacionDetalle[]> {
  const { rows } = await tx.query(
    `SELECT a.id, a.compromiso_id, a.valor, c.tipo, c.destino, c.periodo, e.nombre AS esquema, mi.nombre AS miembro
       FROM aplicaciones a JOIN compromisos c ON c.id = a.compromiso_id
       JOIN esquemas_aporte e ON e.id = c.esquema_id JOIN miembros mi ON mi.id = c.miembro_id
      WHERE a.movimiento_id = $1 ORDER BY c.fecha_acordada`,
    [movimientoId],
  );
  return rows;
}

export type CompromisoAbierto = {
  id: number;
  miembro_id: number;
  tipo: "constitucion" | "mensual";
  destino: string;
  periodo: string | null;
  esquema: string;
  fecha_acordada: string;
  monto: number;
  disponible: number; // monto − abonos no anulados (verificados o por verificar)
};

/** Compromisos con saldo por abonar, ordenados por fecha acordada (solo tesorería). */
export async function compromisosAbiertos(tx: Tx, miembroId?: number): Promise<CompromisoAbierto[]> {
  const { rows } = await tx.query(
    `SELECT c.id, c.miembro_id, c.tipo, c.destino, c.periodo, e.nombre AS esquema, c.fecha_acordada, c.monto,
            (c.monto - coalesce((SELECT sum(a.valor) FROM aplicaciones a JOIN movimientos m ON m.id = a.movimiento_id
                                  WHERE a.compromiso_id = c.id AND m.estado <> 'anulado'), 0))::bigint AS disponible
       FROM compromisos c JOIN esquemas_aporte e ON e.id = c.esquema_id
      WHERE c.estado = 'vigente' AND ($1::int IS NULL OR c.miembro_id = $1)
        AND c.monto > coalesce((SELECT sum(a.valor) FROM aplicaciones a JOIN movimientos m ON m.id = a.movimiento_id
                                 WHERE a.compromiso_id = c.id AND m.estado <> 'anulado'), 0)
      ORDER BY c.fecha_acordada, c.id`,
    [miembroId ?? null],
  );
  return rows;
}

export async function historialDe(tx: Tx, tabla: string, registroId: string | number) {
  const { rows } = await tx.query(
    `SELECT h.id, h.accion, h.antes, h.despues, h.en, u.nombre AS usuario
       FROM historial h LEFT JOIN usuarios u ON u.id = h.usuario_id
      WHERE h.tabla = $1 AND h.registro_id = $2 ORDER BY h.en, h.id`,
    [tabla, String(registroId)],
  );
  return rows as { id: number; accion: string; antes: Record<string, unknown> | null; despues: Record<string, unknown> | null; en: string; usuario: string | null }[];
}

export const MEDIOS_PAGO = ["Transferencia", "Consignación", "Efectivo", "Cheque", "Nequi / Daviplata", "Débito automático", "Otro"];

export const ETIQUETA_DESTINO: Record<string, string> = {
  gastos_constitucion: "Constitución: gastos de constitución",
  patrimonio_inicial: "Constitución: patrimonio inicial",
  sostenimiento: "Mensual de sostenimiento",
};
