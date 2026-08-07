import { createClient, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// En Vercel el directorio del proyecto es de solo lectura; solo /tmp admite
// escritura (y es efímero). Si alguien despliega sin conectar Turso todavía,
// usamos /tmp para que el sitio funcione igual (sin persistencia real) en
// lugar de fallar con un error 500.
const DATA_DIR =
  process.env.RANA_DATA_DIR ||
  (process.env.VERCEL ? "/tmp/rana-data" : path.join(process.cwd(), "data"));

function urlLocal() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  return `file:${path.join(DATA_DIR, "rana.db")}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __ranaLibsql: ReturnType<typeof createClient> | undefined;
}

function crearClient() {
  const url = process.env.TURSO_DATABASE_URL || urlLocal();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

const cliente = global.__ranaLibsql ?? crearClient();
if (process.env.NODE_ENV !== "production") global.__ranaLibsql = cliente;

let listo: Promise<void> | null = null;

async function migrar() {
  await cliente.batch(
    [
      `CREATE TABLE IF NOT EXISTS casos (
        radicado TEXT PRIMARY KEY,
        access_token TEXT UNIQUE,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        canal_recepcion TEXT NOT NULL,
        medio_manual TEXT,
        estado TEXT NOT NULL DEFAULT 'recibido',
        is_manual INTEGER NOT NULL DEFAULT 0,
        draft INTEGER NOT NULL DEFAULT 0,
        ampliado_completo INTEGER NOT NULL DEFAULT 0,
        ampliado_submitted_at TEXT,
        data TEXT NOT NULL DEFAULT '{}',
        soportes TEXT NOT NULL DEFAULT '[]'
      )`,
      `CREATE TABLE IF NOT EXISTS radicado_counters (
        dia TEXT PRIMARY KEY,
        seq INTEGER NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS anexos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        radicado TEXT NOT NULL REFERENCES casos(radicado) ON DELETE CASCADE,
        tipo TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'borrador',
        overrides TEXT NOT NULL DEFAULT '{}',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        finalized_at TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS anexo_versiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        anexo_id INTEGER NOT NULL REFERENCES anexos(id) ON DELETE CASCADE,
        overrides TEXT NOT NULL,
        etiqueta TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS infografias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        radicado TEXT NOT NULL REFERENCES casos(radicado) ON DELETE CASCADE,
        anexo_id INTEGER REFERENCES anexos(id) ON DELETE SET NULL,
        contenido TEXT NOT NULL DEFAULT '{}',
        foto_path TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_casos_access_token ON casos(access_token)`,
      `CREATE INDEX IF NOT EXISTS idx_casos_estado ON casos(estado)`,
      `CREATE INDEX IF NOT EXISTS idx_casos_created ON casos(created_at)`,
      `CREATE INDEX IF NOT EXISTS idx_anexos_radicado ON anexos(radicado)`,
      `CREATE INDEX IF NOT EXISTS idx_infografias_radicado ON infografias(radicado)`,
    ],
    "write"
  );
}

async function asegurarListo() {
  if (!listo) listo = migrar();
  await listo;
}

export const db = {
  async run(sql: string, args: InValue[] = []) {
    await asegurarListo();
    return cliente.execute({ sql, args });
  },
  async get<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T | undefined> {
    await asegurarListo();
    const res = await cliente.execute({ sql, args });
    return (res.rows[0] as unknown as T) ?? undefined;
  },
  async all<T = Record<string, unknown>>(sql: string, args: InValue[] = []): Promise<T[]> {
    await asegurarListo();
    const res = await cliente.execute({ sql, args });
    return res.rows as unknown as T[];
  },
};

export function nowIso() {
  return new Date().toISOString();
}
