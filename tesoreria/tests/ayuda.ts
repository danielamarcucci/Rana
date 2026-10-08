import { execFileSync } from "node:child_process";
import path from "node:path";
import pg from "pg";
import "../src/lib/db"; // registra los conversores de tipos (bigint → number exacto)

export const URL_PRUEBAS = process.env.TEST_DATABASE_URL;

/** Base de datos de pruebas desechable: se borra y se migra desde cero. */
export async function prepararBase(): Promise<pg.Pool> {
  if (!URL_PRUEBAS) throw new Error("Defina TEST_DATABASE_URL (una base de datos desechable).");
  const admin = new pg.Client({ connectionString: URL_PRUEBAS });
  await admin.connect();
  await admin.query("DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;");
  await admin.end();
  execFileSync("node", [path.join(__dirname, "..", "scripts", "migrar.mjs")], { env: { ...process.env, DATABASE_URL: URL_PRUEBAS, DATABASE_URL_UNPOOLED: "" }, stdio: "pipe" });
  return new pg.Pool({ connectionString: URL_PRUEBAS, max: 3 });
}

export type Rol = "tes_auth" | "tes_consulta" | "tes_tesoreria";

/** Ejecuta como lo hace la aplicación: transacción con SET LOCAL ROLE y el usuario en sesión. */
export async function como<T>(pool: pg.Pool, rol: Rol, usuarioId: number | null, fn: (c: pg.PoolClient) => Promise<T>): Promise<T> {
  const c = await pool.connect();
  try {
    await c.query("BEGIN");
    await c.query(`SET LOCAL ROLE ${rol}`);
    await c.query("SELECT set_config('app.usuario_id', $1, true)", [usuarioId ? String(usuarioId) : ""]);
    const r = await fn(c);
    await c.query("COMMIT");
    return r;
  } catch (e) {
    await c.query("ROLLBACK").catch(() => {});
    throw e;
  } finally {
    c.release();
  }
}

/** Espera que la operación falle con el código de PostgreSQL indicado. */
export async function falla(p: Promise<unknown>, codigo: string): Promise<string> {
  try {
    await p;
  } catch (e) {
    const err = e as { code?: string; message: string };
    if (err.code !== codigo) throw new Error(`Se esperaba ${codigo} y llegó ${err.code}: ${err.message}`);
    return err.message;
  }
  throw new Error(`Se esperaba un error ${codigo}, pero la operación se completó.`);
}
