import { NextRequest, NextResponse } from "next/server";
import { getCaso } from "@/lib/casos";
import { generarFormularioAmpliadoDocx } from "@/lib/docGenerators/formulario";
import { nombreArchivoCaso } from "@/lib/radicado";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ radicado: string }> }) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = await getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
  const buffer = await generarFormularioAmpliadoDocx(caso);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivoCaso(caso.radicado)}"`,
    },
  });
}
