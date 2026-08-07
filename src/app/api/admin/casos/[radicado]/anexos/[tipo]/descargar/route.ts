import { NextRequest, NextResponse } from "next/server";
import { getCaso } from "@/lib/casos";
import { getOrCreateAnexo } from "@/lib/anexos";
import { generarAnexoDocx } from "@/lib/docGenerators/anexo";
import { NOMBRE_TIPO } from "@/lib/docGenerators/anexoCampos";
import type { AnexoTipo } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string; tipo: string }> }
) {
  const { radicado: raw, tipo } = await params;
  const radicado = decodeURIComponent(raw);
  const t = tipo as AnexoTipo;
  const caso = await getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const anexo = await getOrCreateAnexo(radicado, t);
  const buffer = await generarAnexoDocx(t, caso, anexo.overrides);
  const nombre = `${radicado.replace("#", "_#")}_${NOMBRE_TIPO[t].replace(/\s+/g, "_")}.docx`;

  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombre}"`,
    },
  });
}
