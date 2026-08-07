import { nanoid } from "nanoid";
import { db, nowIso } from "./db";
import { generarRadicado } from "./radicado";
import type { Caso, CasoData, CanalRecepcion, EstadoCaso, Soporte } from "./types";

type CasoRow = {
  radicado: string;
  access_token: string | null;
  created_at: string;
  updated_at: string;
  canal_recepcion: string;
  medio_manual: string | null;
  estado: string;
  is_manual: number;
  draft: number;
  ampliado_completo: number;
  ampliado_submitted_at: string | null;
  data: string;
  soportes: string;
};

function rowToCaso(row: CasoRow): Caso {
  return {
    radicado: row.radicado,
    accessToken: row.access_token,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    canalRecepcion: row.canal_recepcion as CanalRecepcion,
    medioManual: row.medio_manual,
    estado: row.estado as EstadoCaso,
    isManual: !!row.is_manual,
    draft: !!row.draft,
    ampliadoCompleto: !!row.ampliado_completo,
    ampliadoSubmittedAt: row.ampliado_submitted_at,
    data: JSON.parse(row.data || "{}"),
    soportes: JSON.parse(row.soportes || "[]"),
  };
}

export async function crearCasoPublico(
  data: CasoData,
  canalRecepcion: CanalRecepcion
): Promise<Caso> {
  const radicado = await generarRadicado();
  const token = nanoid(32);
  const ts = nowIso();
  await db.run(
    `INSERT INTO casos (radicado, access_token, created_at, updated_at, canal_recepcion, estado, is_manual, draft, data, soportes)
     VALUES (?, ?, ?, ?, ?, 'recibido', 0, 0, ?, '[]')`,
    [radicado, token, ts, ts, canalRecepcion, JSON.stringify(data)]
  );
  return (await getCaso(radicado))!;
}

export async function crearCasoManual(
  data: CasoData,
  medioManual: string,
  draft: boolean
): Promise<Caso> {
  const radicado = await generarRadicado();
  const token = nanoid(32);
  const ts = nowIso();
  await db.run(
    `INSERT INTO casos (radicado, access_token, created_at, updated_at, canal_recepcion, medio_manual, estado, is_manual, draft, ampliado_completo, ampliado_submitted_at, data, soportes)
     VALUES (?, ?, ?, ?, 'RED', ?, 'recibido', 1, ?, ?, ?, ?, '[]')`,
    [
      radicado,
      token,
      ts,
      ts,
      medioManual,
      draft ? 1 : 0,
      draft ? 0 : 1,
      draft ? null : ts,
      JSON.stringify(data),
    ]
  );
  return (await getCaso(radicado))!;
}

export async function getCaso(radicado: string): Promise<Caso | null> {
  const row = await db.get<CasoRow>("SELECT * FROM casos WHERE radicado = ?", [radicado]);
  return row ? rowToCaso(row) : null;
}

export async function getCasoPorToken(token: string): Promise<Caso | null> {
  const row = await db.get<CasoRow>("SELECT * FROM casos WHERE access_token = ?", [token]);
  return row ? rowToCaso(row) : null;
}

export async function listCasos(): Promise<Caso[]> {
  const rows = await db.all<CasoRow>("SELECT * FROM casos ORDER BY created_at DESC");
  return rows.map(rowToCaso);
}

export async function actualizarDatosCaso(
  radicado: string,
  data: CasoData,
  opts: { marcarAmpliadoCompleto?: boolean; draft?: boolean } = {}
): Promise<Caso | null> {
  const existing = await getCaso(radicado);
  if (!existing) return null;
  const ts = nowIso();
  const merged = { ...existing.data, ...data };
  const setAmpliado = opts.marcarAmpliadoCompleto ?? existing.ampliadoCompleto;
  await db.run(
    `UPDATE casos SET data = ?, updated_at = ?, ampliado_completo = ?,
       ampliado_submitted_at = CASE WHEN ? = 1 AND ampliado_submitted_at IS NULL THEN ? ELSE ampliado_submitted_at END,
       draft = ?
     WHERE radicado = ?`,
    [
      JSON.stringify(merged),
      ts,
      setAmpliado ? 1 : 0,
      setAmpliado ? 1 : 0,
      ts,
      opts.draft === undefined ? (existing.draft ? 1 : 0) : opts.draft ? 1 : 0,
      radicado,
    ]
  );
  return getCaso(radicado);
}

export async function actualizarEstado(
  radicado: string,
  estado: EstadoCaso
): Promise<Caso | null> {
  await db.run("UPDATE casos SET estado = ?, updated_at = ? WHERE radicado = ?", [
    estado,
    nowIso(),
    radicado,
  ]);
  return getCaso(radicado);
}

export async function agregarSoportes(
  radicado: string,
  nuevos: Soporte[]
): Promise<Caso | null> {
  const existing = await getCaso(radicado);
  if (!existing) return null;
  const soportes = [...existing.soportes, ...nuevos];
  await db.run("UPDATE casos SET soportes = ?, updated_at = ? WHERE radicado = ?", [
    JSON.stringify(soportes),
    nowIso(),
    radicado,
  ]);
  return getCaso(radicado);
}
