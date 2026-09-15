import { createClient, type InValue } from "@libsql/client";
import fs from "node:fs";
import path from "node:path";
import { DEPENDENCIAS_SEED } from "../data/dependencias-seed";

// En Vercel el directorio del proyecto es de solo lectura; solo /tmp admite
// escritura (y es efímero). Si se despliega sin conectar Turso todavía,
// usamos /tmp para que el sitio funcione igual (sin persistencia real) en
// lugar de fallar con un error 500. Ver README para activar Turso.
const DATA_DIR =
  process.env.AGRO_DATA_DIR ||
  (process.env.VERCEL ? "/tmp/agro-data" : path.join(process.cwd(), "data"));

function urlLocal() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
  return `file:${path.join(DATA_DIR, "agro.db")}`;
}

declare global {
  // eslint-disable-next-line no-var
  var __agroLibsql: ReturnType<typeof createClient> | undefined;
}

function crearClient() {
  const url = process.env.TURSO_DATABASE_URL || urlLocal();
  const authToken = process.env.TURSO_AUTH_TOKEN;
  return createClient(authToken ? { url, authToken } : { url });
}

const cliente = global.__agroLibsql ?? crearClient();
if (process.env.NODE_ENV !== "production") global.__agroLibsql = cliente;

let listo: Promise<void> | null = null;

async function migrar() {
  await cliente.batch(
    [
      `CREATE TABLE IF NOT EXISTS usuarios (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        usuario TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        nombre_visible TEXT NOT NULL,
        rol TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS dependencias (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        clave TEXT NOT NULL UNIQUE,
        nombre TEXT NOT NULL,
        tipo TEXT NOT NULL,
        padre_id INTEGER REFERENCES dependencias(id) ON DELETE SET NULL
      )`,
      `CREATE TABLE IF NOT EXISTS actuaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        tipo TEXT NOT NULL,
        nombre TEXT NOT NULL,
        dependencia_id INTEGER NOT NULL REFERENCES dependencias(id) ON DELETE RESTRICT,
        entidad_ejecutora TEXT NOT NULL DEFAULT '',
        descripcion TEXT NOT NULL DEFAULT '',
        fecha_inicio TEXT,
        fecha_fin TEXT,
        estado TEXT NOT NULL DEFAULT 'formulacion',
        nivel_avance INTEGER NOT NULL DEFAULT 0,
        fuente_financiacion TEXT NOT NULL DEFAULT '',
        recursos_destinados REAL NOT NULL DEFAULT 0,
        recursos_ejecutados REAL NOT NULL DEFAULT 0,
        beneficiarios_total INTEGER NOT NULL DEFAULT 0,
        beneficiarios_mujeres INTEGER NOT NULL DEFAULT 0,
        beneficiarios_jovenes INTEGER NOT NULL DEFAULT 0,
        comentarios TEXT NOT NULL DEFAULT '',
        creado_por TEXT NOT NULL DEFAULT '',
        actualizado_por TEXT NOT NULL DEFAULT '',
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      )`,
      `CREATE TABLE IF NOT EXISTS actuacion_ubicaciones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actuacion_id INTEGER NOT NULL REFERENCES actuaciones(id) ON DELETE CASCADE,
        departamento TEXT NOT NULL,
        municipio TEXT
      )`,
      `CREATE TABLE IF NOT EXISTS actuacion_versiones (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        actuacion_id INTEGER NOT NULL REFERENCES actuaciones(id) ON DELETE CASCADE,
        snapshot TEXT NOT NULL,
        usuario TEXT NOT NULL,
        created_at TEXT NOT NULL
      )`,
      `CREATE INDEX IF NOT EXISTS idx_actuaciones_dependencia ON actuaciones(dependencia_id)`,
      `CREATE INDEX IF NOT EXISTS idx_actuaciones_tipo ON actuaciones(tipo)`,
      `CREATE INDEX IF NOT EXISTS idx_actuaciones_estado ON actuaciones(estado)`,
      `CREATE INDEX IF NOT EXISTS idx_ubicaciones_actuacion ON actuacion_ubicaciones(actuacion_id)`,
      `CREATE INDEX IF NOT EXISTS idx_ubicaciones_departamento ON actuacion_ubicaciones(departamento)`,
      `CREATE INDEX IF NOT EXISTS idx_versiones_actuacion ON actuacion_versiones(actuacion_id)`,
    ],
    "write"
  );
  await sembrarSiVacio();
}

async function sembrarSiVacio() {
  const dependenciasExistentes = await cliente.execute("SELECT id FROM dependencias LIMIT 1");
  if (dependenciasExistentes.rows.length === 0) {
    const idPorClave = new Map<string, number>();
    for (const dep of DEPENDENCIAS_SEED) {
      const padreId = dep.padre ? idPorClave.get(dep.padre) ?? null : null;
      const res = await cliente.execute({
        sql: `INSERT INTO dependencias (clave, nombre, tipo, padre_id) VALUES (?, ?, ?, ?)`,
        args: [dep.clave, dep.nombre, dep.tipo, padreId],
      });
      idPorClave.set(dep.clave, Number(res.lastInsertRowid));
    }
  }

  // INSERT OR IGNORE para que agregar un usuario nuevo (p.ej. en una futura
  // actualización) funcione también sobre una base de datos que ya tenía
  // usuarios sembrados, sin duplicar ni sobreescribir los existentes.
  const USUARIOS_SEMILLA: { usuario: string; hash: string; nombreVisible: string; rol: string }[] = [
    {
      usuario: "UnidadInformación",
      hash: "$2a$12$hRzZPPI4cihEwE/8CrR/UOwnYgNEEhUOLSA08X8wna22utq573zP.",
      nombreVisible: "Unidad de Información Estratégica",
      rol: "gestor",
    },
    {
      usuario: "Despacho",
      hash: "$2a$12$c46dcwVHMykYeJf3mb8cvOM5.UDHl9fRZOVvcrhU/2WO3QmDggMEu",
      nombreVisible: "Despacho del Ministro",
      rol: "gestor",
    },
    {
      usuario: "Equipo",
      hash: "$2a$12$IMKyBCoJ25zX/ZTdjng6Ye7zpLD5mnpSMYKXKQ5mvXDhhoEgv3rJm",
      nombreVisible: "Equipo de carga de información",
      rol: "captura",
    },
  ];
  await cliente.batch(
    USUARIOS_SEMILLA.map((u) => ({
      sql: `INSERT OR IGNORE INTO usuarios (usuario, password_hash, nombre_visible, rol) VALUES (?, ?, ?, ?)`,
      args: [u.usuario, u.hash, u.nombreVisible, u.rol] as InValue[],
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
  async batch(statements: { sql: string; args?: InValue[] }[]) {
    await asegurarListo();
    return cliente.batch(
      statements.map((s) => ({ sql: s.sql, args: s.args ?? [] })),
      "write"
    );
  },
};

export function nowIso() {
  return new Date().toISOString();
}
