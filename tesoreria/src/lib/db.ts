import "server-only";
import { Pool, type PoolClient, types } from "pg";

// Valores monetarios: BIGINT en centavos. Se convierten a Number solo si son
// enteros seguros (|n| < 2^53), lo que cubre cualquier monto realista sin
// errores de redondeo.
function entero(v: string): number {
  const n = Number(v);
  if (!Number.isSafeInteger(n)) throw new Error(`Valor fuera de rango o no entero: ${v}`);
  return n;
}
types.setTypeParser(20, entero); // int8 / bigint
types.setTypeParser(1700, entero); // numeric (sum de bigint)
types.setTypeParser(1082, (v: string) => v); // date → 'AAAA-MM-DD' sin zona horaria

const globalPool = globalThis as unknown as { __tesPool?: Pool };

function pool(): Pool {
  if (!globalPool.__tesPool) {
    const connectionString = process.env.DATABASE_URL;
    if (!connectionString) throw new Error("Falta la variable DATABASE_URL.");
    globalPool.__tesPool = new Pool({
      connectionString,
      max: Number(process.env.DB_POOL_MAX || 5),
      idleTimeoutMillis: 10_000,
    });
  }
  return globalPool.__tesPool;
}

export type RolDB = "auth" | "consulta" | "tesoreria";
const ROLES: Record<RolDB, string> = {
  auth: "tes_auth",
  consulta: "tes_consulta",
  tesoreria: "tes_tesoreria",
};

export type Tx = PoolClient;

/**
 * Ejecuta `fn` dentro de una transacción con los privilegios del rol indicado
 * (SET LOCAL ROLE). La base de datos aplica los permisos aunque la capa web
 * fallara: el rol de consulta no tiene privilegios de escritura.
 */
export async function conRol<T>(
  rol: RolDB,
  ctx: { usuarioId?: number; sesionId?: number },
  fn: (tx: Tx) => Promise<T>,
): Promise<T> {
  const client = await pool().connect();
  try {
    await client.query("BEGIN");
    await client.query(`SET LOCAL ROLE ${ROLES[rol]}`);
    await client.query("SET LOCAL statement_timeout = '20s'");
    await client.query(
      "SELECT set_config('app.usuario_id', $1, true), set_config('app.sesion_id', $2, true)",
      [ctx.usuarioId ? String(ctx.usuarioId) : "", ctx.sesionId ? String(ctx.sesionId) : ""],
    );
    const r = await fn(client);
    await client.query("COMMIT");
    return r;
  } catch (e) {
    await client.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/** Error con mensaje apto para mostrar a la persona usuaria. */
export class ErrorUsuario extends Error {}

/** Traduce errores de PostgreSQL a mensajes comprensibles. */
export function mensajeError(e: unknown): string {
  if (e instanceof ErrorUsuario) return e.message;
  const err = e as { code?: string; message?: string; constraint?: string };
  switch (err?.code) {
    case "P0001":
      return err.message ?? "Operación no permitida.";
    case "42501":
      return "No tiene permisos para realizar esta acción.";
    case "23505":
      return "Ya existe un registro con esos datos (se evitó un duplicado).";
    case "23514":
      return "Algún valor no cumple las reglas (revise montos, fechas y campos obligatorios).";
    case "23503":
      return "El registro está relacionado con otros datos y no se puede completar la operación.";
    case "22003":
      return "Un valor está fuera del rango permitido.";
  }
  console.error(e);
  return "Ocurrió un error inesperado. Intente de nuevo.";
}

/**
 * Ejecuta consultas una tras otra sobre la misma conexión (una transacción
 * no admite consultas simultáneas) y devuelve sus resultados como tupla.
 */
export async function enSerie<T extends readonly (() => Promise<unknown>)[]>(
  fns: [...T],
): Promise<{ [K in keyof T]: Awaited<ReturnType<T[K]>> }> {
  const out: unknown[] = [];
  for (const f of fns) out.push(await f());
  return out as { [K in keyof T]: Awaited<ReturnType<T[K]>> };
}
