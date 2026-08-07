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

export async function listAnexos(radicado: string): Promise<Anexo[]> {
  const rows = await db.all<AnexoRow>(
    "SELECT * FROM anexos WHERE radicado = ? ORDER BY created_at ASC",
    [radicado]
  );
  return rows.map(rowToAnexo);
}

export async function getAnexo(id: number): Promise<Anexo | null> {
  const row = await db.get<AnexoRow>("SELECT * FROM anexos WHERE id = ?", [id]);
  return row ? rowToAnexo(row) : null;
}

export async function getOrCreateAnexo(radicado: string, tipo: AnexoTipo): Promise<Anexo> {
  const row = await db.get<AnexoRow>(
    "SELECT * FROM anexos WHERE radicado = ? AND tipo = ?",
    [radicado, tipo]
  );
  if (row) return rowToAnexo(row);
  const ts = nowIso();
  const insertado = await db.get<{ id: number }>(
    `INSERT INTO anexos (radicado, tipo, estado, overrides, created_at, updated_at)
     VALUES (?, ?, 'borrador', '{}', ?, ?)
     RETURNING id`,
    [radicado, tipo, ts, ts]
  );
  return (await getAnexo(Number(insertado!.id)))!;
}

export async function actualizarOverrides(
  id: number,
  overrides: Record<string, string>
): Promise<Anexo | null> {
  await db.run("UPDATE anexos SET overrides = ?, updated_at = ? WHERE id = ?", [
    JSON.stringify(overrides),
    nowIso(),
    id,
  ]);
  return getAnexo(id);
}

export async function marcarVersionFinal(id: number): Promise<Anexo | null> {
  const anexo = await getAnexo(id);
  if (!anexo) return null;
  const ts = nowIso();
  await db.run(
    `INSERT INTO anexo_versiones (anexo_id, overrides, etiqueta, created_at)
     VALUES (?, ?, 'Versión final', ?)`,
    [id, JSON.stringify(anexo.overrides), ts]
  );
  await db.run(
    "UPDATE anexos SET estado = 'version_final', finalized_at = ?, updated_at = ? WHERE id = ?",
    [ts, ts, id]
  );
  return getAnexo(id);
}

export async function listVersiones(anexoId: number) {
  return db.all<{ id: number; overrides: string; etiqueta: string; created_at: string }>(
    "SELECT id, overrides, etiqueta, created_at FROM anexo_versiones WHERE anexo_id = ? ORDER BY created_at DESC",
    [anexoId]
  );
}
