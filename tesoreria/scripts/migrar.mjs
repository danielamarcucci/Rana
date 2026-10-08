#!/usr/bin/env node
// Aplica las migraciones de db/migraciones en orden, una sola vez cada una.
// Usa DATABASE_URL_UNPOOLED (si existe) o DATABASE_URL, con el usuario
// propietario de la base de datos.
//
//   node scripts/migrar.mjs                 → falla si no hay base de datos
//   node scripts/migrar.mjs --si-hay-base   → no hace nada si no hay base (build local)
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import pg from "pg";

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), "..", "db", "migraciones");
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;

if (!url) {
  // En Vercel la base de datos es obligatoria: sin ella la aplicación no puede funcionar.
  if (process.env.VERCEL) {
    console.error("migrar: falta DATABASE_URL. Conecte la base de datos Neon al proyecto (Storage) y vuelva a desplegar.");
    process.exit(1);
  }
  if (process.argv.includes("--si-hay-base")) {
    console.log("migrar: sin DATABASE_URL, no se aplican migraciones.");
    process.exit(0);
  }
  console.error("Falta DATABASE_URL.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: url });
await client.connect();
try {
  await client.query("BEGIN");
  await client.query("SELECT pg_advisory_xact_lock(4242000)");
  await client.query(`CREATE TABLE IF NOT EXISTS _migraciones (
    nombre text PRIMARY KEY, aplicada_en timestamptz NOT NULL DEFAULT now())`);
  await client.query("REVOKE ALL ON _migraciones FROM PUBLIC");
  const { rows } = await client.query("SELECT nombre FROM _migraciones");
  const hechas = new Set(rows.map((r) => r.nombre));
  const archivos = (await readdir(dir)).filter((f) => f.endsWith(".sql")).sort();
  let n = 0;
  for (const f of archivos) {
    if (hechas.has(f)) continue;
    const sql = await readFile(path.join(dir, f), "utf8");
    console.log(`migrar: aplicando ${f}`);
    await client.query(sql);
    await client.query("INSERT INTO _migraciones (nombre) VALUES ($1)", [f]);
    n++;
  }
  await client.query("COMMIT");
  console.log(n ? `migrar: ${n} migración(es) aplicada(s).` : "migrar: la base de datos está al día.");
} catch (e) {
  await client.query("ROLLBACK").catch(() => {});
  console.error("migrar: error —", e.message);
  process.exitCode = 1;
} finally {
  await client.end();
}
