import { db, nowIso } from "./db";
import type {
  Actuacion,
  ActuacionInput,
  EstadoActuacion,
  TipoActuacion,
  Ubicacion,
} from "./types";

export interface FiltrosActuaciones {
  tipo?: TipoActuacion[];
  estado?: EstadoActuacion[];
  dependenciaIds?: number[];
  departamento?: string;
  municipio?: string;
  q?: string;
  avanceMin?: number;
  avanceMax?: number;
}

interface FilaActuacion {
  id: number;
  tipo: TipoActuacion;
  nombre: string;
  dependencia_id: number;
  dependencia_nombre: string;
  dependencia_tipo: string;
  entidad_ejecutora: string;
  descripcion: string;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: EstadoActuacion;
  nivel_avance: number;
  fuente_financiacion: string;
  recursos_destinados: number;
  recursos_ejecutados: number;
  beneficiarios_total: number;
  beneficiarios_mujeres: number;
  beneficiarios_jovenes: number;
  comentarios: string;
  creado_por: string;
  actualizado_por: string;
  created_at: string;
  updated_at: string;
}

function mapearFila(f: FilaActuacion): Omit<Actuacion, "ubicaciones"> {
  return {
    id: f.id,
    tipo: f.tipo,
    nombre: f.nombre,
    dependenciaId: f.dependencia_id,
    dependenciaNombre: f.dependencia_nombre,
    dependenciaTipo: f.dependencia_tipo,
    entidadEjecutora: f.entidad_ejecutora,
    descripcion: f.descripcion,
    fechaInicio: f.fecha_inicio,
    fechaFin: f.fecha_fin,
    estado: f.estado,
    nivelAvance: f.nivel_avance,
    fuenteFinanciacion: f.fuente_financiacion,
    recursosDestinados: f.recursos_destinados,
    recursosEjecutados: f.recursos_ejecutados,
    beneficiariosTotal: f.beneficiarios_total,
    beneficiariosMujeres: f.beneficiarios_mujeres,
    beneficiariosJovenes: f.beneficiarios_jovenes,
    comentarios: f.comentarios,
    creadoPor: f.creado_por,
    actualizadoPor: f.actualizado_por,
    createdAt: f.created_at,
    updatedAt: f.updated_at,
  };
}

function construirFiltros(filtros: FiltrosActuaciones) {
  const condiciones: string[] = [];
  const args: (string | number)[] = [];

  if (filtros.tipo?.length) {
    condiciones.push(`a.tipo IN (${filtros.tipo.map(() => "?").join(",")})`);
    args.push(...filtros.tipo);
  }
  if (filtros.estado?.length) {
    condiciones.push(`a.estado IN (${filtros.estado.map(() => "?").join(",")})`);
    args.push(...filtros.estado);
  }
  if (filtros.dependenciaIds?.length) {
    condiciones.push(`a.dependencia_id IN (${filtros.dependenciaIds.map(() => "?").join(",")})`);
    args.push(...filtros.dependenciaIds);
  }
  if (filtros.q) {
    condiciones.push(`(a.nombre LIKE ? OR a.descripcion LIKE ? OR a.entidad_ejecutora LIKE ?)`);
    const like = `%${filtros.q}%`;
    args.push(like, like, like);
  }
  if (typeof filtros.avanceMin === "number") {
    condiciones.push(`a.nivel_avance >= ?`);
    args.push(filtros.avanceMin);
  }
  if (typeof filtros.avanceMax === "number") {
    condiciones.push(`a.nivel_avance <= ?`);
    args.push(filtros.avanceMax);
  }
  if (filtros.departamento) {
    condiciones.push(
      `EXISTS (SELECT 1 FROM actuacion_ubicaciones u WHERE u.actuacion_id = a.id AND u.departamento = ?${
        filtros.municipio ? " AND u.municipio = ?" : ""
      })`
    );
    args.push(filtros.departamento);
    if (filtros.municipio) args.push(filtros.municipio);
  }

  return { where: condiciones.length ? `WHERE ${condiciones.join(" AND ")}` : "", args };
}

export async function listarActuaciones(filtros: FiltrosActuaciones = {}): Promise<Actuacion[]> {
  const { where, args } = construirFiltros(filtros);
  const filas = await db.all<FilaActuacion>(
    `SELECT a.*, d.nombre AS dependencia_nombre, d.tipo AS dependencia_tipo
     FROM actuaciones a
     JOIN dependencias d ON d.id = a.dependencia_id
     ${where}
     ORDER BY a.updated_at DESC`,
    args
  );
  if (filas.length === 0) return [];

  const ids = filas.map((f) => f.id);
  const ubicaciones = await db.all<{ actuacion_id: number; departamento: string; municipio: string | null }>(
    `SELECT actuacion_id, departamento, municipio FROM actuacion_ubicaciones WHERE actuacion_id IN (${ids
      .map(() => "?")
      .join(",")})`,
    ids
  );
  const ubicacionesPorActuacion = new Map<number, Ubicacion[]>();
  for (const u of ubicaciones) {
    const lista = ubicacionesPorActuacion.get(u.actuacion_id) ?? [];
    lista.push({ departamento: u.departamento, municipio: u.municipio });
    ubicacionesPorActuacion.set(u.actuacion_id, lista);
  }

  return filas.map((f) => ({
    ...mapearFila(f),
    ubicaciones: ubicacionesPorActuacion.get(f.id) ?? [],
  }));
}

export async function obtenerActuacion(id: number): Promise<Actuacion | null> {
  const fila = await db.get<FilaActuacion>(
    `SELECT a.*, d.nombre AS dependencia_nombre, d.tipo AS dependencia_tipo
     FROM actuaciones a JOIN dependencias d ON d.id = a.dependencia_id
     WHERE a.id = ?`,
    [id]
  );
  if (!fila) return null;
  const ubicaciones = await db.all<{ departamento: string; municipio: string | null }>(
    `SELECT departamento, municipio FROM actuacion_ubicaciones WHERE actuacion_id = ?`,
    [id]
  );
  return { ...mapearFila(fila), ubicaciones };
}

async function reemplazarUbicaciones(actuacionId: number, ubicaciones: Ubicacion[]) {
  await db.run(`DELETE FROM actuacion_ubicaciones WHERE actuacion_id = ?`, [actuacionId]);
  for (const u of ubicaciones) {
    await db.run(
      `INSERT INTO actuacion_ubicaciones (actuacion_id, departamento, municipio) VALUES (?, ?, ?)`,
      [actuacionId, u.departamento, u.municipio]
    );
  }
}

export async function crearActuacion(input: ActuacionInput, usuario: string): Promise<number> {
  const ahora = nowIso();
  const res = await db.run(
    `INSERT INTO actuaciones (
      tipo, nombre, dependencia_id, entidad_ejecutora, descripcion, fecha_inicio, fecha_fin,
      estado, nivel_avance, fuente_financiacion, recursos_destinados, recursos_ejecutados,
      beneficiarios_total, beneficiarios_mujeres, beneficiarios_jovenes, comentarios,
      creado_por, actualizado_por, created_at, updated_at
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
    [
      input.tipo,
      input.nombre,
      input.dependenciaId,
      input.entidadEjecutora,
      input.descripcion,
      input.fechaInicio,
      input.fechaFin,
      input.estado,
      input.nivelAvance,
      input.fuenteFinanciacion,
      input.recursosDestinados,
      input.recursosEjecutados,
      input.beneficiariosTotal,
      input.beneficiariosMujeres,
      input.beneficiariosJovenes,
      input.comentarios,
      usuario,
      usuario,
      ahora,
      ahora,
    ]
  );
  const id = Number(res.lastInsertRowid);
  await reemplazarUbicaciones(id, input.ubicaciones);
  return id;
}

export async function actualizarActuacion(
  id: number,
  input: ActuacionInput,
  usuario: string
): Promise<void> {
  const anterior = await obtenerActuacion(id);
  if (!anterior) throw new Error("No existe la actuación");

  await db.run(`INSERT INTO actuacion_versiones (actuacion_id, snapshot, usuario, created_at) VALUES (?,?,?,?)`, [
    id,
    JSON.stringify(anterior),
    usuario,
    nowIso(),
  ]);

  await db.run(
    `UPDATE actuaciones SET
      tipo=?, nombre=?, dependencia_id=?, entidad_ejecutora=?, descripcion=?, fecha_inicio=?, fecha_fin=?,
      estado=?, nivel_avance=?, fuente_financiacion=?, recursos_destinados=?, recursos_ejecutados=?,
      beneficiarios_total=?, beneficiarios_mujeres=?, beneficiarios_jovenes=?, comentarios=?,
      actualizado_por=?, updated_at=?
     WHERE id=?`,
    [
      input.tipo,
      input.nombre,
      input.dependenciaId,
      input.entidadEjecutora,
      input.descripcion,
      input.fechaInicio,
      input.fechaFin,
      input.estado,
      input.nivelAvance,
      input.fuenteFinanciacion,
      input.recursosDestinados,
      input.recursosEjecutados,
      input.beneficiariosTotal,
      input.beneficiariosMujeres,
      input.beneficiariosJovenes,
      input.comentarios,
      usuario,
      nowIso(),
      id,
    ]
  );
  await reemplazarUbicaciones(id, input.ubicaciones);
}

export async function eliminarActuacion(id: number): Promise<void> {
  await db.run(`DELETE FROM actuaciones WHERE id = ?`, [id]);
}

export interface VersionActuacion {
  id: number;
  usuario: string;
  createdAt: string;
  snapshot: Actuacion;
}

export async function historialActuacion(id: number): Promise<VersionActuacion[]> {
  const filas = await db.all<{ id: number; snapshot: string; usuario: string; created_at: string }>(
    `SELECT id, snapshot, usuario, created_at FROM actuacion_versiones WHERE actuacion_id = ? ORDER BY created_at DESC`,
    [id]
  );
  return filas.map((f) => ({
    id: f.id,
    usuario: f.usuario,
    createdAt: f.created_at,
    snapshot: JSON.parse(f.snapshot) as Actuacion,
  }));
}

export interface AgregadoUbicacion {
  clave: string; // departamento, o "departamento||municipio"
  departamento: string;
  municipio: string | null;
  totalActuaciones: number;
  recursosDestinados: number;
  recursosEjecutados: number;
  beneficiariosTotal: number;
  beneficiariosMujeres: number;
  beneficiariosJovenes: number;
  avancePromedio: number;
}

/** Agrega, por departamento (y opcionalmente por municipio), las actuaciones que cumplen los filtros. */
export async function agregarPorUbicacion(
  filtros: FiltrosActuaciones,
  porMunicipio: boolean
): Promise<AgregadoUbicacion[]> {
  const { where, args } = construirFiltros(filtros);
  // Una misma actuación puede tener varios municipios dentro del mismo departamento
  // (o varios departamentos): se deduplica por (actuación, departamento[, municipio])
  // antes de sumar, para no contar sus recursos/beneficiarios más de una vez por grupo.
  const campoMunicipioSub = porMunicipio ? "u.municipio" : "NULL";
  const filas = await db.all<{
    departamento: string;
    municipio: string | null;
    total: number;
    recursos_destinados: number;
    recursos_ejecutados: number;
    beneficiarios_total: number;
    beneficiarios_mujeres: number;
    beneficiarios_jovenes: number;
    avance_promedio: number;
  }>(
    `SELECT
        sub.departamento AS departamento,
        sub.municipio AS municipio,
        COUNT(*) AS total,
        SUM(a.recursos_destinados) AS recursos_destinados,
        SUM(a.recursos_ejecutados) AS recursos_ejecutados,
        SUM(a.beneficiarios_total) AS beneficiarios_total,
        SUM(a.beneficiarios_mujeres) AS beneficiarios_mujeres,
        SUM(a.beneficiarios_jovenes) AS beneficiarios_jovenes,
        AVG(a.nivel_avance) AS avance_promedio
     FROM (
        SELECT DISTINCT a.id AS actuacion_id, u.departamento AS departamento, ${campoMunicipioSub} AS municipio
        FROM actuaciones a
        JOIN actuacion_ubicaciones u ON u.actuacion_id = a.id
        ${where}
     ) sub
     JOIN actuaciones a ON a.id = sub.actuacion_id
     GROUP BY sub.departamento, sub.municipio
     ORDER BY sub.departamento`,
    args
  );

  return filas.map((f) => ({
    clave: f.municipio ? `${f.departamento}||${f.municipio}` : f.departamento,
    departamento: f.departamento,
    municipio: f.municipio,
    totalActuaciones: f.total,
    recursosDestinados: f.recursos_destinados ?? 0,
    recursosEjecutados: f.recursos_ejecutados ?? 0,
    beneficiariosTotal: f.beneficiarios_total ?? 0,
    beneficiariosMujeres: f.beneficiarios_mujeres ?? 0,
    beneficiariosJovenes: f.beneficiarios_jovenes ?? 0,
    avancePromedio: Math.round(f.avance_promedio ?? 0),
  }));
}
