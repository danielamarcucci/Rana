import { NextRequest, NextResponse } from "next/server";
import { randomUUID } from "node:crypto";
import { getCaso } from "@/lib/casos";
import { getOrCreateInfografia, actualizarFotoInfografia } from "@/lib/infografias";
import { sugeridosInfografia } from "@/lib/docGenerators/sugeridosInfografia";
import { guardarArchivo, eliminarArchivo } from "@/lib/storage";

const TIPOS_PERMITIDOS = ["image/jpeg", "image/png", "image/webp"];
const MAX_TAMANO = 10 * 1024 * 1024;

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ radicado: string }> }
) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = await getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const formData = await req.formData();
  const archivo = formData.get("foto");
  if (!(archivo instanceof File)) {
    return NextResponse.json({ error: "No se recibió ninguna imagen." }, { status: 400 });
  }
  if (!TIPOS_PERMITIDOS.includes(archivo.type)) {
    return NextResponse.json({ error: "Formato no permitido. Use JPG, PNG o WEBP." }, { status: 400 });
  }
  if (archivo.size > MAX_TAMANO) {
    return NextResponse.json({ error: "La imagen supera el tamaño máximo (10 MB)." }, { status: 400 });
  }

  const infografia = await getOrCreateInfografia(radicado, sugeridosInfografia(caso, null));
  const ext = archivo.type === "image/png" ? ".png" : archivo.type === "image/webp" ? ".webp" : ".jpg";
  const nombreDisco = `${radicado.replace("#", "_")}_${randomUUID()}${ext}`;
  const bytes = Buffer.from(await archivo.arrayBuffer());
  const ref = await guardarArchivo("infografias", nombreDisco, bytes, archivo.type);

  if (infografia.fotoPath) await eliminarArchivo(infografia.fotoPath);

  const actualizada = await actualizarFotoInfografia(infografia.id, ref);
  return NextResponse.json({ infografia: actualizada });
}
