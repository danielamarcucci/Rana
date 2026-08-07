import { NextRequest, NextResponse } from "next/server";
import { getCasoPorToken } from "@/lib/casos";
import { generarFormularioInicialDocx } from "@/lib/docGenerators/formulario";
import { nombreArchivoCaso } from "@/lib/radicado";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const caso = getCasoPorToken(token);
  if (!caso) {
    return NextResponse.json({ error: "Denuncia no encontrada." }, { status: 404 });
  }
  const buffer = await generarFormularioInicialDocx(caso);
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivoCaso(caso.radicado)}"`,
    },
  });
}
