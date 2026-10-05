import type { InValue } from "@libsql/client";
import { db, nowIso } from "./db";
import type { Citado, Debate, Fuente, Peticion, Pregunta, SeccionGuion } from "./types";

export type DebateCompleto = {
  debate: Debate;
  citados: Citado[];
  preguntas: Pregunta[];
  fuentes: Fuente[];
  peticiones: Peticion[];
  guion: SeccionGuion[];
};

export type DebateResumen = Debate & {
  total_citados: number;
  total_preguntas: number;
  preguntas_respondidas: number;
};

// --- Debates ---------------------------------------------------------------

export async function listarDebates(): Promise<DebateResumen[]> {
  return db.all<DebateResumen>(
    `SELECT d.*,
       (SELECT COUNT(*) FROM citados c WHERE c.debate_id = d.id) AS total_citados,
       (SELECT COUNT(*) FROM preguntas p WHERE p.debate_id = d.id) AS total_preguntas,
       (SELECT COUNT(*) FROM preguntas p WHERE p.debate_id = d.id AND p.evaluacion <> 'pendiente') AS preguntas_respondidas
     FROM debates d
     ORDER BY d.estado = 'archivado', COALESCE(d.fecha_debate, '9999-12-31'), d.updated_at DESC`
  );
}

export async function obtenerDebate(id: number): Promise<Debate | undefined> {
  return db.get<Debate>("SELECT * FROM debates WHERE id = ?", [id]);
}

export async function obtenerDebateCompleto(id: number): Promise<DebateCompleto | undefined> {
  const debate = await obtenerDebate(id);
  if (!debate) return undefined;
  const [citados, preguntas, fuentes, peticiones, guion] = await Promise.all([
    db.all<Citado>("SELECT * FROM citados WHERE debate_id = ? ORDER BY orden, id", [id]),
    db.all<Pregunta>("SELECT * FROM preguntas WHERE debate_id = ? ORDER BY orden, id", [id]),
    db.all<Fuente>("SELECT * FROM fuentes WHERE debate_id = ? ORDER BY id", [id]),
    db.all<Peticion>("SELECT * FROM peticiones WHERE debate_id = ? ORDER BY fecha_envio, id", [id]),
    db.all<SeccionGuion>("SELECT * FROM guion WHERE debate_id = ? ORDER BY orden, id", [id]),
  ]);
  return { debate, citados, preguntas, fuentes, peticiones, guion };
}

export type DatosDebate = Omit<Debate, "id" | "created_at" | "updated_at">;

const CAMPOS_DEBATE: (keyof DatosDebate)[] = [
  "titulo",
  "tema",
  "municipio",
  "instancia",
  "instancia_otra",
  "citantes",
  "bancada",
  "justificacion",
  "objetivo",
  "fecha_radicacion",
  "fecha_aprobacion",
  "fecha_debate",
  "estado",
];

export async function crearDebate(datos: DatosDebate): Promise<number> {
  const ahora = nowIso();
  const res = await db.run(
    `INSERT INTO debates (${CAMPOS_DEBATE.join(", ")}, created_at, updated_at)
     VALUES (${CAMPOS_DEBATE.map(() => "?").join(", ")}, ?, ?)`,
    [...CAMPOS_DEBATE.map((c) => datos[c] as InValue), ahora, ahora]
  );
  const id = Number(res.lastInsertRowid);
  await db.batch(
    GUION_BASE.map((s, i) => ({
      sql: "INSERT INTO guion (debate_id, titulo, contenido, minutos, orden) VALUES (?, ?, ?, ?, ?)",
      args: [id, s.titulo, s.contenido, s.minutos, i],
    }))
  );
  return id;
}

export async function actualizarDebate(id: number, datos: DatosDebate) {
  await db.run(
    `UPDATE debates SET ${CAMPOS_DEBATE.map((c) => `${c} = ?`).join(", ")}, updated_at = ? WHERE id = ?`,
    [...CAMPOS_DEBATE.map((c) => datos[c] as InValue), nowIso(), id]
  );
}

export async function cambiarEstado(id: number, estado: Debate["estado"]) {
  await db.run("UPDATE debates SET estado = ?, updated_at = ? WHERE id = ?", [estado, nowIso(), id]);
}

export async function tocarDebate(id: number) {
  await db.run("UPDATE debates SET updated_at = ? WHERE id = ?", [nowIso(), id]);
}

export async function eliminarDebate(id: number) {
  await db.batch(
    ["citados", "preguntas", "fuentes", "peticiones", "guion"].map((t) => ({
      sql: `DELETE FROM ${t} WHERE debate_id = ?`,
      args: [id],
    })).concat([{ sql: "DELETE FROM debates WHERE id = ?", args: [id] }])
  );
}

// --- Citados -----------------------------------------------------------------

export async function guardarCitado(debateId: number, c: Omit<Citado, "id" | "debate_id" | "orden">, id?: number) {
  if (id) {
    await db.run("UPDATE citados SET nombre = ?, cargo = ?, entidad = ?, tipo = ? WHERE id = ? AND debate_id = ?", [
      c.nombre, c.cargo, c.entidad, c.tipo, id, debateId,
    ]);
  } else {
    await db.run(
      `INSERT INTO citados (debate_id, nombre, cargo, entidad, tipo, orden)
       VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(orden), -1) + 1 FROM citados WHERE debate_id = ?))`,
      [debateId, c.nombre, c.cargo, c.entidad, c.tipo, debateId]
    );
  }
  await tocarDebate(debateId);
}

export async function eliminarCitado(debateId: number, id: number) {
  await db.batch([
    { sql: "UPDATE preguntas SET citado_id = NULL WHERE citado_id = ? AND debate_id = ?", args: [id, debateId] },
    { sql: "DELETE FROM citados WHERE id = ? AND debate_id = ?", args: [id, debateId] },
  ]);
  await tocarDebate(debateId);
}

// --- Preguntas -----------------------------------------------------------------

export async function crearPregunta(
  debateId: number,
  p: Pick<Pregunta, "citado_id" | "eje" | "texto" | "proposito">
) {
  await db.run(
    `INSERT INTO preguntas (debate_id, citado_id, eje, texto, proposito, orden)
     VALUES (?, ?, ?, ?, ?, (SELECT COALESCE(MAX(orden), -1) + 1 FROM preguntas WHERE debate_id = ?))`,
    [debateId, p.citado_id, p.eje, p.texto, p.proposito, debateId]
  );
  await tocarDebate(debateId);
}

export async function actualizarPregunta(
  debateId: number,
  id: number,
  p: Pick<Pregunta, "citado_id" | "eje" | "texto" | "proposito">
) {
  await db.run(
    "UPDATE preguntas SET citado_id = ?, eje = ?, texto = ?, proposito = ? WHERE id = ? AND debate_id = ?",
    [p.citado_id, p.eje, p.texto, p.proposito, id, debateId]
  );
  await tocarDebate(debateId);
}

export async function registrarRespuesta(
  debateId: number,
  id: number,
  r: Pick<Pregunta, "respuesta" | "evaluacion" | "repregunta">
) {
  await db.run(
    "UPDATE preguntas SET respuesta = ?, evaluacion = ?, repregunta = ? WHERE id = ? AND debate_id = ?",
    [r.respuesta, r.evaluacion, r.repregunta, id, debateId]
  );
  await tocarDebate(debateId);
}

export async function moverPregunta(debateId: number, id: number, direccion: "arriba" | "abajo") {
  await moverEnLista("preguntas", debateId, id, direccion);
}

export async function eliminarPregunta(debateId: number, id: number) {
  await db.run("DELETE FROM preguntas WHERE id = ? AND debate_id = ?", [id, debateId]);
  await tocarDebate(debateId);
}

// --- Fuentes y peticiones -------------------------------------------------

export async function guardarFuente(debateId: number, f: Omit<Fuente, "id" | "debate_id">, id?: number) {
  const args = [f.tipo, f.titulo, f.descripcion, f.url, f.hallazgo, f.verificada];
  if (id) {
    await db.run(
      "UPDATE fuentes SET tipo = ?, titulo = ?, descripcion = ?, url = ?, hallazgo = ?, verificada = ? WHERE id = ? AND debate_id = ?",
      [...args, id, debateId]
    );
  } else {
    await db.run(
      "INSERT INTO fuentes (tipo, titulo, descripcion, url, hallazgo, verificada, debate_id) VALUES (?, ?, ?, ?, ?, ?, ?)",
      [...args, debateId]
    );
  }
  await tocarDebate(debateId);
}

export async function eliminarFuente(debateId: number, id: number) {
  await db.run("DELETE FROM fuentes WHERE id = ? AND debate_id = ?", [id, debateId]);
  await tocarDebate(debateId);
}

export async function guardarPeticion(debateId: number, p: Omit<Peticion, "id" | "debate_id">, id?: number) {
  const args = [p.entidad, p.asunto, p.radicado, p.tipo, p.fecha_envio, p.estado, p.notas];
  if (id) {
    await db.run(
      "UPDATE peticiones SET entidad = ?, asunto = ?, radicado = ?, tipo = ?, fecha_envio = ?, estado = ?, notas = ? WHERE id = ? AND debate_id = ?",
      [...args, id, debateId]
    );
  } else {
    await db.run(
      "INSERT INTO peticiones (entidad, asunto, radicado, tipo, fecha_envio, estado, notas, debate_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
      [...args, debateId]
    );
  }
  await tocarDebate(debateId);
}

export async function eliminarPeticion(debateId: number, id: number) {
  await db.run("DELETE FROM peticiones WHERE id = ? AND debate_id = ?", [id, debateId]);
  await tocarDebate(debateId);
}

// --- Guion -------------------------------------------------------------------

export async function guardarSeccion(
  debateId: number,
  s: Pick<SeccionGuion, "titulo" | "contenido" | "minutos">,
  id?: number
) {
  if (id) {
    await db.run("UPDATE guion SET titulo = ?, contenido = ?, minutos = ? WHERE id = ? AND debate_id = ?", [
      s.titulo, s.contenido, s.minutos, id, debateId,
    ]);
  } else {
    await db.run(
      `INSERT INTO guion (debate_id, titulo, contenido, minutos, orden)
       VALUES (?, ?, ?, ?, (SELECT COALESCE(MAX(orden), -1) + 1 FROM guion WHERE debate_id = ?))`,
      [debateId, s.titulo, s.contenido, s.minutos, debateId]
    );
  }
  await tocarDebate(debateId);
}

export async function moverSeccion(debateId: number, id: number, direccion: "arriba" | "abajo") {
  await moverEnLista("guion", debateId, id, direccion);
}

export async function eliminarSeccion(debateId: number, id: number) {
  await db.run("DELETE FROM guion WHERE id = ? AND debate_id = ?", [id, debateId]);
  await tocarDebate(debateId);
}

async function moverEnLista(tabla: "preguntas" | "guion", debateId: number, id: number, direccion: "arriba" | "abajo") {
  const filas = await db.all<{ id: number }>(`SELECT id FROM ${tabla} WHERE debate_id = ? ORDER BY orden, id`, [debateId]);
  const ids = filas.map((f) => Number(f.id));
  const i = ids.indexOf(id);
  const j = direccion === "arriba" ? i - 1 : i + 1;
  if (i < 0 || j < 0 || j >= ids.length) return;
  [ids[i], ids[j]] = [ids[j], ids[i]];
  await db.batch(ids.map((pid, orden) => ({ sql: `UPDATE ${tabla} SET orden = ? WHERE id = ?`, args: [orden, pid] })));
  await tocarDebate(debateId);
}

// Estructura sugerida para la intervención del citante. Se crea con cada
// debate nuevo y se puede editar o borrar libremente.
const GUION_BASE = [
  {
    titulo: "Apertura",
    minutos: 2,
    contenido: "Saludo protocolario. Por qué este debate importa a la ciudadanía en una frase. Qué se le preguntó a la administración y cuándo.",
  },
  {
    titulo: "Contexto y cifras clave",
    minutos: 5,
    contenido: "Los 3 datos más contundentes, cada uno con su fuente (ver pestaña Pruebas).",
  },
  {
    titulo: "Hallazgos",
    minutos: 8,
    contenido: "Contrastar lo que dice la administración (respuestas al cuestionario) con lo que muestran los documentos y los datos.",
  },
  {
    titulo: "Preguntas para el citado en el recinto",
    minutos: 3,
    contenido: "Repreguntas sobre las respuestas evasivas o incompletas (se arman en la pestaña Respuestas).",
  },
  {
    titulo: "Conclusiones y exigencias",
    minutos: 2,
    contenido: "Compromisos concretos que se piden a la administración, con plazo. Anunciar el seguimiento.",
  },
];
