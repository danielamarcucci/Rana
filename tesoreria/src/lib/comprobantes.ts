import "server-only";
import { createHash } from "node:crypto";
import type { Tx } from "./db";
import { ErrorUsuario } from "./db";

const MAX_MB = Number(process.env.COMPROBANTE_MAX_MB || 8);
export const MAX_BYTES = Math.min(MAX_MB, 10) * 1024 * 1024;

const FIRMAS: { mime: string; ext: string[]; firma: number[] }[] = [
  { mime: "application/pdf", ext: ["pdf"], firma: [0x25, 0x50, 0x44, 0x46, 0x2d] }, // %PDF-
  { mime: "image/png", ext: ["png"], firma: [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a] },
  { mime: "image/jpeg", ext: ["jpg", "jpeg"], firma: [0xff, 0xd8, 0xff] },
];

/** Detecta el tipo real por su contenido (no por el nombre ni por lo que declara el navegador). */
export function detectarTipo(buf: Buffer): string | null {
  for (const f of FIRMAS) {
    if (buf.length >= f.firma.length && f.firma.every((b, i) => buf[i] === b)) return f.mime;
  }
  return null;
}

function nombreSeguro(nombre: string, mime: string): string {
  const ext = FIRMAS.find((f) => f.mime === mime)!.ext[0];
  const base = nombre.replace(/\.[^.]*$/, "").normalize("NFC").replace(/[^\p{L}\p{N} ._-]+/gu, "_").trim().slice(0, 80) || "comprobante";
  return `${base}.${ext}`;
}

export function archivosDe(datos: FormData, campo = "comprobante"): File[] {
  return datos.getAll(campo).filter((f): f is File => typeof f === "object" && f !== null && "arrayBuffer" in f && (f as File).size > 0);
}

/** Valida y guarda un comprobante de forma privada (en la base de datos). Devuelve su id. */
export async function guardarComprobante(
  tx: Tx,
  archivo: File,
  opciones: { datosPersonales?: boolean; descripcion?: string } = {},
): Promise<string> {
  if (archivo.size > MAX_BYTES) throw new ErrorUsuario(`El archivo "${archivo.name}" supera el tamaño máximo (${MAX_MB} MB).`);
  const buf = Buffer.from(await archivo.arrayBuffer());
  const mime = detectarTipo(buf);
  if (!mime) throw new ErrorUsuario(`"${archivo.name}" no es un PDF, JPG o PNG válido.`);
  const ext = archivo.name.split(".").pop()?.toLowerCase() ?? "";
  if (!FIRMAS.find((f) => f.mime === mime)!.ext.includes(ext))
    throw new ErrorUsuario(`La extensión de "${archivo.name}" no coincide con su contenido.`);
  const sha = createHash("sha256").update(buf).digest("hex");
  const { rows } = await tx.query(
    `INSERT INTO comprobantes (nombre_archivo, tipo_mime, tamano, sha256, contenido, datos_personales, descripcion, subido_por)
     VALUES ($1, $2, $3, $4, $5, $6, $7, usuario_actual()) RETURNING id`,
    [nombreSeguro(archivo.name, mime), mime, buf.length, sha, buf, opciones.datosPersonales ?? true, opciones.descripcion ?? null],
  );
  return rows[0].id;
}

export type Soporte = {
  id: string;
  nombre_archivo: string;
  tipo_mime: string;
  tamano: number;
  datos_personales: boolean;
  subido_en: string;
};

export async function soportesDe(
  tx: Tx,
  campo: "movimiento_id" | "compromiso_id" | "obligacion_id" | "esquema_id",
  id: number,
): Promise<Soporte[]> {
  // Con el rol de consulta, la seguridad por filas oculta los comprobantes con datos personales.
  const { rows } = await tx.query(
    `SELECT c.id, c.nombre_archivo, c.tipo_mime, c.tamano, c.datos_personales, c.subido_en
       FROM soportes s JOIN comprobantes c ON c.id = s.comprobante_id
      WHERE s.${campo} = $1 ORDER BY c.subido_en`,
    [id],
  );
  return rows;
}
