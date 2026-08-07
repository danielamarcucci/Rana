import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import path from "node:path";
import { getCaso, agregarSoportes } from "@/lib/casos";
import { guardarArchivo } from "@/lib/storage";
import { nowIso } from "@/lib/db";
import type { Soporte } from "@/lib/types";

const MAX_TAMANO = 25 * 1024 * 1024; // 25 MB por archivo
const TIPOS_PERMITIDOS = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/heic",
  "video/mp4",
  "video/quicktime",
  "audio/mpeg",
  "audio/mp4",
  "audio/wav",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

function extensionSegura(nombre: string) {
  const ext = path.extname(nombre).toLowerCase();
  return /^\.[a-z0-9]{1,6}$/.test(ext) ? ext : "";
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ radicado: string }> }) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = await getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const formData = await req.formData();
  const archivos = formData.getAll("archivos").filter((f): f is File => f instanceof File);
  if (archivos.length === 0) {
    return NextResponse.json({ error: "No se recibieron archivos." }, { status: 400 });
  }

  const carpeta = `soportes/${radicado.replace("#", "_")}`;

  const nuevos: Soporte[] = [];
  for (const archivo of archivos) {
    if (archivo.size > MAX_TAMANO) {
      return NextResponse.json(
        { error: `El archivo ${archivo.name} supera el tamaño máximo permitido (25 MB).` },
        { status: 400 }
      );
    }
    if (TIPOS_PERMITIDOS.length && archivo.type && !TIPOS_PERMITIDOS.includes(archivo.type)) {
      return NextResponse.json(
        { error: `Tipo de archivo no permitido: ${archivo.name}` },
        { status: 400 }
      );
    }
    const id = randomUUID();
    const nombreDisco = `${id}${extensionSegura(archivo.name)}`;
    const bytes = Buffer.from(await archivo.arrayBuffer());
    const ref = await guardarArchivo(carpeta, nombreDisco, bytes, archivo.type || "application/octet-stream");
    nuevos.push({
      id,
      nombreOriginal: archivo.name,
      archivo: ref,
      tipo: archivo.type || "application/octet-stream",
      tamano: archivo.size,
      subidoEn: nowIso(),
    });
  }

  const actualizado = await agregarSoportes(radicado, nuevos);
  return NextResponse.json({ soportes: actualizado?.soportes ?? [] });
}
