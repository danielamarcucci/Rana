import { createClient, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { SERVICIOS_SEMILLA } from "./seed-data";

// En Vercel el directorio del proyecto es de solo lectura; solo /tmp admite
// escritura (y es efímero). Si se despliega sin conectar Turso todavía,
// usamos /tmp para que el sitio funcione igual (sin persistencia real) en
// lugar de fallar con un error 500.
const DATA_DIR =
  process.env.SERVICIOS_DATA_DIR ||
  (process.env.VERCEL ? "/tmp/servicios-data" : path.join(process.cwd(), "data"));

function urlLocal() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  return `file:${path.join(DATA_DIR, "servicios.db")}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __serviciosLibsql: ReturnType<typeof createClient> | undefined;
}

function crearClient() {
  const url = process.env.TURSO_DATABASE_URL || urlLocal();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

const cliente = global.__serviciosLibsql ?? crearClient();
if (process.env.NODE_ENV !== "production") global.__serviciosLibsql = cliente;

let listo: Promise<void> | null = null;

async function migrar() {
  await cliente.batch(
    [
      `CREATE TABLE IF NOT EXISTS servicios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        concepto TEXT NOT NULL,
        detalle TEXT NOT NULL,
        inmueble TEXT NOT NULL DEFAULT '',
        tipo_cuenta TEXT,
        numero_cuenta TEXT,
        link_pago TEXT,
        orden INTEGER NOT NULL DEFAULT 0,
        activo INTEGER NOT NULL DEFAULT 1
      )`,
      `CREATE TABLE IF NOT EXISTS pagos (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        servicio_id INTEGER NOT NULL REFERENCES servicios(id) ON DELETE CASCADE,
        anio INTEGER NOT NULL,
        mes INTEGER NOT NULL,
        estado TEXT NOT NULL DEFAULT 'pendiente',
        fecha_pago TEXT,
        monto REAL,
        updated_at TEXT NOT NULL,
        UNIQUE(servicio_id, anio, mes)
      )`,
      `CREATE INDEX IF NOT EXISTS idx_pagos_servicio ON pagos(servicio_id)`,
      `CREATE INDEX IF NOT EXISTS idx_pagos_anio_mes ON pagos(anio, mes)`,
    ],
    "write"
  );
  await sembrarSiVacio();
}

// Deja lista la base con los servicios del Excel la primera vez que alguien
// abre la app, para que no dependa de correr un script aparte.
async function sembrarSiVacio() {
  const existentes = await cliente.execute("SELECT id FROM servicios LIMIT 1");
  if (existentes.rows.length > 0) return;

  await cliente.batch(
    SERVICIOS_SEMILLA.map((s, i) => ({
      sql: `INSERT INTO servicios (concepto, detalle, inmueble, tipo_cuenta, numero_cuenta, link_pago, orden, activo)
            VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      args: [s.concepto, s.detalle, s.inmueble, s.tipo_cuenta, s.numero_cuenta, s.link_pago, i] as InValue[],
    })),
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
