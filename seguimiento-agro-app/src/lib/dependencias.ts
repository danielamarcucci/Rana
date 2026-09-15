import { db } from "./db";
import type { Dependencia } from "./types";

interface FilaDependencia {
  id: number;
  clave: string;
  nombre: string;
  tipo: string;
  padre_id: number | null;
}

function mapear(fila: FilaDependencia): Dependencia {
  return {
    id: fila.id,
    clave: fila.clave,
    nombre: fila.nombre,
    tipo: fila.tipo,
    padreId: fila.padre_id,
  };
}

export async function listarDependencias(): Promise<Dependencia[]> {
  const filas = await db.all<FilaDependencia>(
    `SELECT id, clave, nombre, tipo, padre_id FROM dependencias ORDER BY tipo, nombre`
  );
  return filas.map(mapear);
}

export async function crearDependencia(nombre: string, tipo: string, padreId: number | null) {
  const clave = nombre
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 60);
  const res = await db.run(
    `INSERT INTO dependencias (clave, nombre, tipo, padre_id) VALUES (?, ?, ?, ?)`,
    [`${clave}-${Date.now().toString(36)}`, nombre, tipo, padreId]
  );
  return Number(res.lastInsertRowid);
}
