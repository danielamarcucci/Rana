import { createClient, type InStatement, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";

// En Vercel el directorio del proyecto es de solo lectura; solo /tmp admite
// escritura (y es efímero). Si se despliega sin conectar Turso todavía,
// usamos /tmp para que el sitio funcione igual (sin persistencia real) en
// lugar de fallar con un error 500.
const DATA_DIR =
  process.env.CONTROL_DATA_DIR ||
  (process.env.VERCEL ? "/tmp/control-politico-data" : path.join(process.cwd(), "data"));

function urlLocal() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  return `file:${path.join(DATA_DIR, "control-politico.db")}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __controlLibsql: ReturnType<typeof createClient> | undefined;
}

function crearClient() {
  const url = process.env.TURSO_DATABASE_URL || urlLocal();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

const cliente = global.__controlLibsql ?? crearClient();
if (process.env.NODE_ENV !== "production") global.__controlLibsql = cliente;

let listo: Promise<void> | null = null;

async function migrar() {
  await cliente.batch(
    [
      `CREATE TABLE IF NOT EXISTS debates (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        titulo TEXT NOT NULL,
        tema TEXT NOT NULL DEFAULT '',
        municipio TEXT NOT NULL DEFAULT '',
        instancia TEXT NOT NULL DEFAULT 'plenaria',
        instancia_otra TEXT NOT NULL DEFAULT '',
        citantes TEXT NOT NULL DEFAULT '',
        bancada TEXT NOT NULL DEFAULT '',
        justificacion TEXT NOT NULL DEFAULT '',
        objetivo TEXT NOT NULL DEFAULT '',
        fecha_radicacion TEXT,
        fecha_aprobacion TEXT,
        fecha_debate TEXT,
        estado TEXT NOT NULL DEFAULT 'borrador',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS citados (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debate_id INTEGER NOT NULL,
        nombre TEXT NOT NULL DEFAULT '',
        cargo TEXT NOT NULL,
        entidad TEXT NOT NULL DEFAULT '',
        tipo TEXT NOT NULL DEFAULT 'citado',
        orden INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS preguntas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debate_id INTEGER NOT NULL,
        citado_id INTEGER,
        eje TEXT NOT NULL DEFAULT '',
        texto TEXT NOT NULL,
        proposito TEXT NOT NULL DEFAULT '',
        respuesta TEXT NOT NULL DEFAULT '',
        evaluacion TEXT NOT NULL DEFAULT 'pendiente',
        repregunta TEXT NOT NULL DEFAULT '',
        orden INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS fuentes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debate_id INTEGER NOT NULL,
        tipo TEXT NOT NULL DEFAULT 'documento',
        titulo TEXT NOT NULL,
        descripcion TEXT NOT NULL DEFAULT '',
        url TEXT NOT NULL DEFAULT '',
        hallazgo TEXT NOT NULL DEFAULT '',
        verificada INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS peticiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debate_id INTEGER NOT NULL,
        entidad TEXT NOT NULL,
        asunto TEXT NOT NULL DEFAULT '',
        radicado TEXT NOT NULL DEFAULT '',
        tipo TEXT NOT NULL DEFAULT 'informacion',
        fecha_envio TEXT NOT NULL,
        estado TEXT NOT NULL DEFAULT 'enviada',
        notas TEXT NOT NULL DEFAULT ''
      )`,
      `CREATE TABLE IF NOT EXISTS guion (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        debate_id INTEGER NOT NULL,
        titulo TEXT NOT NULL,
        contenido TEXT NOT NULL DEFAULT '',
        minutos INTEGER NOT NULL DEFAULT 5,
        orden INTEGER NOT NULL DEFAULT 0
      )`,
      `CREATE TABLE IF NOT EXISTS configuracion (
        clave TEXT PRIMARY KEY,
        valor TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_citados_debate ON citados(debate_id)`,
      `CREATE INDEX IF NOT EXISTS idx_preguntas_debate ON preguntas(debate_id)`,
      `CREATE INDEX IF NOT EXISTS idx_fuentes_debate ON fuentes(debate_id)`,
      `CREATE INDEX IF NOT EXISTS idx_peticiones_debate ON peticiones(debate_id)`,
      `CREATE INDEX IF NOT EXISTS idx_guion_debate ON guion(debate_id)`,
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
  async batch(stmts: InStatement[]) {
    await asegurarListo();
    return cliente.batch(stmts, "write");
  },
};

export function nowIso() {
  return new Date().toISOString();
}
