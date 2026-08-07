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

export async function getInfografia(radicado: string): Promise<Infografia | null> {
  const row = await db.get<Row>(
    "SELECT * FROM infografias WHERE radicado = ? ORDER BY created_at DESC LIMIT 1",
    [radicado]
  );
  return row ? rowTo(row) : null;
}

export async function getOrCreateInfografia(
  radicado: string,
  contenidoInicial: ContenidoInfografia
): Promise<Infografia> {
  const existente = await getInfografia(radicado);
  if (existente) return existente;
  const ts = nowIso();
  const insertado = await db.get<{ id: number }>(
    `INSERT INTO infografias (radicado, contenido, created_at, updated_at)
     VALUES (?, ?, ?, ?) RETURNING id`,
    [radicado, JSON.stringify(contenidoInicial), ts, ts]
  );
  return (await getInfografiaPorId(Number(insertado!.id)))!;
}

export async function getInfografiaPorId(id: number): Promise<Infografia | null> {
  const row = await db.get<Row>("SELECT * FROM infografias WHERE id = ?", [id]);
  return row ? rowTo(row) : null;
}

export async function actualizarContenidoInfografia(
  id: number,
  contenido: ContenidoInfografia
): Promise<Infografia | null> {
  await db.run("UPDATE infografias SET contenido = ?, updated_at = ? WHERE id = ?", [
    JSON.stringify(contenido),
    nowIso(),
    id,
  ]);
  return getInfografiaPorId(id);
}

export async function actualizarFotoInfografia(
  id: number,
  fotoPath: string | null
): Promise<Infografia | null> {
  await db.run("UPDATE infografias SET foto_path = ?, updated_at = ? WHERE id = ?", [
    fotoPath,
    nowIso(),
    id,
  ]);
  return getInfografiaPorId(id);
}
