import "server-only";
import type { Tx } from "../db";

export type Cuenta = { id: number; nombre: string; tipo: string; entidad: string | null; detalle: string | null; activa: boolean };
export type Categoria = { id: number; nombre: string; tipo: "ingreso" | "egreso"; activa: boolean; orden: number };
export type Fondo = { id: number; nombre: string; tipo: "reserva" | "proyecto"; descripcion: string | null; referencia_acuerdo: string | null; activo: boolean };

export async function cuentas(tx: Tx, soloActivas = false): Promise<Cuenta[]> {
  const { rows } = await tx.query(
    `SELECT id, nombre, tipo, entidad, detalle, activa FROM cuentas ${soloActivas ? "WHERE activa" : ""} ORDER BY activa DESC, nombre`,
  );
  return rows;
}

export async function categorias(tx: Tx, tipo?: "ingreso" | "egreso", soloActivas = false): Promise<Categoria[]> {
  const cond: string[] = [];
  const params: unknown[] = [];
  if (tipo) {
    params.push(tipo);
    cond.push(`tipo = $${params.length}`);
  }
  if (soloActivas) cond.push("activa");
  const { rows } = await tx.query(
    `SELECT id, nombre, tipo, activa, orden FROM categorias ${cond.length ? "WHERE " + cond.join(" AND ") : ""} ORDER BY tipo DESC, orden, nombre`,
    params,
  );
  return rows;
}

export async function fondos(tx: Tx, soloActivos = false): Promise<Fondo[]> {
  const { rows } = await tx.query(
    `SELECT id, nombre, tipo, descripcion, referencia_acuerdo, activo FROM fondos ${soloActivos ? "WHERE activo" : ""} ORDER BY activo DESC, nombre`,
  );
  return rows;
}

export type Configuracion = {
  dia_pago_mensual: number;
  smmlv: number | null;
  smmlv_anio: number | null;
  umbral_smmlv_junta: number;
  patrimonio_declarado: number;
  patrimonio_estado: "por_confirmar" | "confirmado";
  patrimonio_nota: string | null;
};

export async function configuracion(tx: Tx): Promise<Configuracion> {
  const { rows } = await tx.query("SELECT * FROM configuracion");
  return rows[0];
}

/** Umbral del art. 30 c (en centavos), o null si no se ha configurado el SMMLV. */
export function umbralJunta(c: Configuracion): number | null {
  return c.smmlv ? c.smmlv * c.umbral_smmlv_junta : null;
}
