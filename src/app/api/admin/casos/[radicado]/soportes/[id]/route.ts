import { NextRequest, NextResponse } from "next/server";
import { getCaso } from "@/lib/casos";
import { obtenerArchivo } from "@/lib/storage";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string; id: string }> }
) {
  const { radicado: raw, id } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = await getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const soporte = caso.soportes.find((s) => s.id === id);
  if (!soporte) return NextResponse.json({ error: "Soporte no encontrado." }, { status: 404 });

  const buffer = await obtenerArchivo(soporte.archivo);
  if (!buffer) return NextResponse.json({ error: "Archivo no disponible." }, { status: 404 });

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": soporte.tipo || "application/octet-stream",
      "Content-Disposition": `inline; filename="${soporte.nombreOriginal.replace(/["]/g, "")}"`,
    },
  });
}
