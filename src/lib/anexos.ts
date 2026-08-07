import { db, nowIso } from "./db";
import type { Anexo, AnexoTipo } from "./types";

type AnexoRow = {
  id: number;
  radicado: string;
  tipo: string;
  estado: string;
  overrides: string;
  created_at: string;
  updated_at: string;
  finalized_at: string | null;
};

function rowToAnexo(row: AnexoRow): Anexo {
  return {
    id: row.id,
    radicado: row.radicado,
    tipo: row.tipo as AnexoTipo,
    estado: row.estado as Anexo["estado"],
    overrides: JSON.parse(row.overrides || "{}"),
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    finalizedAt: row.finalized_at,
  };
}

export function listAnexos(radicado: string): Anexo[] {
  const rows = db
    .prepare("SELECT * FROM anexos WHERE radicado = ? ORDER BY created_at ASC")
    .all(radicado) as AnexoRow[];
  return rows.map(rowToAnexo);
}

export function getAnexo(id: number): Anexo | null {
  const row = db.prepare("SELECT * FROM anexos WHERE id = ?").get(id) as
    | AnexoRow
    | undefined;
  return row ? rowToAnexo(row) : null;
}

export function getOrCreateAnexo(radicado: string, tipo: AnexoTipo): Anexo {
  const row = db
    .prepare("SELECT * FROM anexos WHERE radicado = ? AND tipo = ?")
    .get(radicado, tipo) as AnexoRow | undefined;
  if (row) return rowToAnexo(row);
  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO anexos (radicado, tipo, estado, overrides, created_at, updated_at)
       VALUES (?, ?, 'borrador', '{}', ?, ?)`
    )
    .run(radicado, tipo, ts, ts);
  return getAnexo(Number(info.lastInsertRowid))!;
}

export function actualizarOverrides(
  id: number,
  overrides: Record<string, string>
): Anexo | null {
  db.prepare("UPDATE anexos SET overrides = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(overrides),
    nowIso(),
    id
  );
  return getAnexo(id);
}

export function marcarVersionFinal(id: number): Anexo | null {
  const anexo = getAnexo(id);
  if (!anexo) return null;
  const ts = nowIso();
  db.prepare(
    `INSERT INTO anexo_versiones (anexo_id, overrides, etiqueta, created_at)
     VALUES (?, ?, 'Versión final', ?)`
  ).run(id, JSON.stringify(anexo.overrides), ts);
  db.prepare(
    "UPDATE anexos SET estado = 'version_final', finalized_at = ?, updated_at = ? WHERE id = ?"
  ).run(ts, ts, id);
  return getAnexo(id);
}

export function listVersiones(anexoId: number) {
  return db
    .prepare(
      "SELECT id, overrides, etiqueta, created_at FROM anexo_versiones WHERE anexo_id = ? ORDER BY created_at DESC"
    )
    .all(anexoId) as { id: number; overrides: string; etiqueta: string; created_at: string }[];
}
