import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { getCaso } from "@/lib/casos";
import { uploadsDir } from "@/lib/db";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string; id: string }> }
) {
  const { radicado: raw, id } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const soporte = caso.soportes.find((s) => s.id === id);
  if (!soporte) return NextResponse.json({ error: "Soporte no encontrado." }, { status: 404 });

  const ruta = path.join(uploadsDir(), radicado.replace("#", "_"), soporte.archivo);
  try {
    const buffer = await fs.readFile(ruta);
    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": soporte.tipo || "application/octet-stream",
        "Content-Disposition": `inline; filename="${soporte.nombreOriginal.replace(/["]/g, "")}"`,
      },
    });
  } catch {
    return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });
  }
}
