import "server-only";
import type { Tx } from "../db";
import type { Situacion } from "../calculos";

export type Esquema = {
  id: number;
  tipo: "constitucion" | "mensual";
  nombre: string;
  estado: "propuesta" | "aprobado" | "cerrado";
  organo: "asamblea" | "junta" | "otro" | null;
  referencia_acuerdo: string | null;
  fecha_acuerdo: string | null;
  presupuesto_gastos: number | null;
  meta_gastos: number | null;
  meta_patrimonio: number | null;
  dia_pago: number | null;
  monto_sugerido: number | null;
  observaciones: string | null;
  registrado_en: string;
  aprobacion_registrada_en: string | null;
  aprobacion_registrada_por_nombre: string | null;
};

export const ORGANO: Record<string, string> = { asamblea: "Asamblea General", junta: "Junta Directiva", otro: "Otro órgano o acuerdo" };

export async function esquemas(tx: Tx, tipo?: "constitucion" | "mensual"): Promise<Esquema[]> {
  const { rows } = await tx.query(
    `SELECT e.*, u.nombre AS aprobacion_registrada_por_nombre
       FROM esquemas_aporte e LEFT JOIN usuarios u ON u.id = e.aprobacion_registrada_por
      WHERE ($1::text IS NULL OR e.tipo = $1) ORDER BY e.estado = 'cerrado', e.registrado_en DESC`,
    [tipo ?? null],
  );
  return rows;
}

export type RecaudoFila = {
  esquema_id: number;
  destino: string;
  periodo: string | null;
  compromisos: number;
  comprometido: number;
  recaudado: number;
  por_verificar: number;
  pendiente: number;
  pendiente_vencido: number | null;
  n_completos: number;
  n_parciales: number;
  n_pendientes: number;
  n_vencidos: number;
};

/** Recaudo agregado (sin personas): disponible para ambos roles. */
export async function recaudo(tx: Tx, esquemaId?: number): Promise<RecaudoFila[]> {
  const { rows } = await tx.query(
    `SELECT esquema_id, destino, periodo, compromisos::int, comprometido, recaudado, por_verificar, pendiente,
            coalesce(pendiente_vencido, 0)::bigint AS pendiente_vencido, n_completos::int, n_parciales::int, n_pendientes::int, n_vencidos::int
       FROM v_recaudo_agregado WHERE ($1::int IS NULL OR esquema_id = $1) ORDER BY periodo NULLS FIRST, destino`,
    [esquemaId ?? null],
  );
  return rows;
}

export type CompromisoFila = {
  id: number;
  esquema_id: number;
  esquema: string;
  miembro_id: number;
  miembro: string;
  codigo: string;
  tipo: string;
  destino: string;
  periodo: string | null;
  monto: number;
  fecha_acordada: string;
  abonado: number;
  por_verificar: number;
  saldo: number;
  situacion: Situacion;
  estado: string;
  n_soportes: number;
};

/** Detalle individual de compromisos (solo tesorería: la vista no se concede a consulta). */
export async function compromisos(tx: Tx, f: { esquemaId?: number; miembroId?: number; tipo?: string; periodo?: string; incluirAnulados?: boolean } = {}): Promise<CompromisoFila[]> {
  const { rows } = await tx.query(
    `SELECT c.id, c.esquema_id, e.nombre AS esquema, c.miembro_id, mi.nombre AS miembro, mi.codigo, c.tipo, c.destino, c.periodo,
            c.monto, c.fecha_acordada, c.abonado, c.por_verificar, c.saldo, c.situacion, c.estado,
            (SELECT count(*) FROM soportes s WHERE s.compromiso_id = c.id)::int AS n_soportes
       FROM v_compromisos_estado c JOIN esquemas_aporte e ON e.id = c.esquema_id JOIN miembros mi ON mi.id = c.miembro_id
      WHERE ($1::int IS NULL OR c.esquema_id = $1) AND ($2::int IS NULL OR c.miembro_id = $2)
        AND ($3::text IS NULL OR c.tipo = $3) AND ($4::date IS NULL OR c.periodo = $4)
        AND ($5 OR c.estado = 'vigente')
      ORDER BY c.periodo NULLS FIRST, mi.nombre, c.destino`,
    [f.esquemaId ?? null, f.miembroId ?? null, f.tipo ?? null, f.periodo ?? null, f.incluirAnulados ?? false],
  );
  return rows;
}

export type Adhesion = {
  id: number;
  esquema_id: number;
  esquema: string;
  miembro_id: number;
  miembro: string;
  miembro_estado: string;
  monto: number;
  mes_inicio: string;
  mes_fin: string | null;
  dia_pago: number | null;
  referencia_aceptacion: string;
  fecha_aceptacion: string;
};

export async function adhesiones(tx: Tx, f: { esquemaId?: number; miembroId?: number } = {}): Promise<Adhesion[]> {
  const { rows } = await tx.query(
    `SELECT a.id, a.esquema_id, e.nombre AS esquema, a.miembro_id, mi.nombre AS miembro, mi.estado AS miembro_estado,
            a.monto, a.mes_inicio, a.mes_fin, a.dia_pago, a.referencia_aceptacion, a.fecha_aceptacion
       FROM adhesiones a JOIN esquemas_aporte e ON e.id = a.esquema_id JOIN miembros mi ON mi.id = a.miembro_id
      WHERE ($1::int IS NULL OR a.esquema_id = $1) AND ($2::int IS NULL OR a.miembro_id = $2)
      ORDER BY mi.nombre, a.mes_inicio`,
    [f.esquemaId ?? null, f.miembroId ?? null],
  );
  return rows;
}

/**
 * Genera los compromisos mensuales de un esquema APROBADO para los meses
 * indicados, solo para aportantes con aceptación vigente en cada mes y sin
 * duplicar los que ya existen (índice único por persona, esquema y periodo).
 */
export async function generarMensuales(tx: Tx, esquemaId: number, desde: string, hasta: string): Promise<number> {
  const { rows } = await tx.query(
    `WITH meses AS (
       SELECT generate_series($2::date, $3::date, interval '1 month')::date AS periodo
     ), base AS (
       SELECT a.id AS adhesion_id, a.miembro_id, a.esquema_id, a.monto, m.periodo,
              coalesce(a.dia_pago, e.dia_pago, (SELECT dia_pago_mensual FROM configuracion)) AS dia
         FROM adhesiones a
         JOIN esquemas_aporte e ON e.id = a.esquema_id
         JOIN miembros mi ON mi.id = a.miembro_id
         JOIN meses m ON m.periodo >= a.mes_inicio AND (a.mes_fin IS NULL OR m.periodo <= a.mes_fin)
        WHERE a.esquema_id = $1 AND e.estado = 'aprobado' AND e.tipo = 'mensual'
          AND (mi.estado = 'activo' OR (mi.fecha_retiro IS NOT NULL AND m.periodo <= mi.fecha_retiro))
     )
     INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, periodo, adhesion_id, monto, fecha_acordada)
     SELECT esquema_id, miembro_id, 'mensual', 'sostenimiento', periodo, adhesion_id, monto,
            least(periodo + (dia - 1), (date_trunc('month', periodo) + interval '1 month - 1 day')::date)
       FROM base
     ON CONFLICT (miembro_id, esquema_id, periodo) WHERE tipo = 'mensual' AND estado = 'vigente' DO NOTHING
     RETURNING id`,
    [esquemaId, desde, hasta],
  );
  return rows.length;
}
