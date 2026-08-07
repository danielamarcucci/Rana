import { db, nowIso } from "./db";

export type ContenidoInfografia = {
  tipoHecho: string;
  fecha: string;
  territorio: string;
  poblacionAfectada: string;
  descripcionBreve: string;
  solicitudes: string;
};

export type Infografia = {
  id: number;
  radicado: string;
  anexoId: number | null;
  contenido: ContenidoInfografia;
  fotoPath: string | null;
  createdAt: string;
  updatedAt: string;
};

type Row = {
  id: number;
  radicado: string;
  anexo_id: number | null;
  contenido: string;
  foto_path: string | null;
  created_at: string;
  updated_at: string;
};

function rowTo(row: Row): Infografia {
  return {
    id: row.id,
    radicado: row.radicado,
    anexoId: row.anexo_id,
    contenido: JSON.parse(row.contenido || "{}"),
    fotoPath: row.foto_path,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function getInfografia(radicado: string): Infografia | null {
  const row = db
    .prepare("SELECT * FROM infografias WHERE radicado = ? ORDER BY created_at DESC LIMIT 1")
    .get(radicado) as Row | undefined;
  return row ? rowTo(row) : null;
}

export function getOrCreateInfografia(
  radicado: string,
  contenidoInicial: ContenidoInfografia
): Infografia {
  const existente = getInfografia(radicado);
  if (existente) return existente;
  const ts = nowIso();
  const info = db
    .prepare(
      `INSERT INTO infografias (radicado, contenido, created_at, updated_at) VALUES (?, ?, ?, ?)`
    )
    .run(radicado, JSON.stringify(contenidoInicial), ts, ts);
  return getInfografiaPorId(Number(info.lastInsertRowid))!;
}

export function getInfografiaPorId(id: number): Infografia | null {
  const row = db.prepare("SELECT * FROM infografias WHERE id = ?").get(id) as Row | undefined;
  return row ? rowTo(row) : null;
}

export function actualizarContenidoInfografia(
  id: number,
  contenido: ContenidoInfografia
): Infografia | null {
  db.prepare("UPDATE infografias SET contenido = ?, updated_at = ? WHERE id = ?").run(
    JSON.stringify(contenido),
    nowIso(),
    id
  );
  return getInfografiaPorId(id);
}

export function actualizarFotoInfografia(id: number, fotoPath: string | null): Infografia | null {
  db.prepare("UPDATE infografias SET foto_path = ?, updated_at = ? WHERE id = ?").run(
    fotoPath,
    nowIso(),
    id
  );
  return getInfografiaPorId(id);
}
