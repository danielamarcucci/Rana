import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";

const DATA_DIR = process.env.RANA_DATA_DIR || path.join(process.cwd(), "data");
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
const UPLOADS_DIR = path.join(DATA_DIR, "uploads");
if (!fs.existsSync(UPLOADS_DIR)) fs.mkdirSync(UPLOADS_DIR, { recursive: true });

const DB_PATH = path.join(DATA_DIR, "rana.db");

declare global {
  // eslint-disable-next-line no-var
  var __ranaDb: Database.Database | undefined;
}

function createDb() {
  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.pragma("foreign_keys = ON");

  db.exec(`
    CREATE TABLE IF NOT EXISTS casos (
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
    );

    CREATE TABLE IF NOT EXISTS radicado_counters (
      dia TEXT PRIMARY KEY,
      seq INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS anexos (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      radicado TEXT NOT NULL REFERENCES casos(radicado) ON DELETE CASCADE,
      tipo TEXT NOT NULL,
      estado TEXT NOT NULL DEFAULT 'borrador',
      overrides TEXT NOT NULL DEFAULT '{}',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      finalized_at TEXT
    );

    CREATE TABLE IF NOT EXISTS anexo_versiones (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      anexo_id INTEGER NOT NULL REFERENCES anexos(id) ON DELETE CASCADE,
      overrides TEXT NOT NULL,
      etiqueta TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS infografias (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      radicado TEXT NOT NULL REFERENCES casos(radicado) ON DELETE CASCADE,
      anexo_id INTEGER REFERENCES anexos(id) ON DELETE SET NULL,
      contenido TEXT NOT NULL DEFAULT '{}',
      foto_path TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE INDEX IF NOT EXISTS idx_casos_access_token ON casos(access_token);
    CREATE INDEX IF NOT EXISTS idx_casos_estado ON casos(estado);
    CREATE INDEX IF NOT EXISTS idx_casos_created ON casos(created_at);
    CREATE INDEX IF NOT EXISTS idx_anexos_radicado ON anexos(radicado);
    CREATE INDEX IF NOT EXISTS idx_infografias_radicado ON infografias(radicado);
  `);

  return db;
}

export const db = global.__ranaDb ?? createDb();
if (process.env.NODE_ENV !== "production") global.__ranaDb = db;

export function uploadsDir() {
  return UPLOADS_DIR;
}

export function nowIso() {
  return new Date().toISOString();
}
