import { NextResponse } from "next/server";
import { obtenerConfiguracion } from "@/lib/configuracion";
import { obtenerDebateCompleto } from "@/lib/debates";
import { DOCUMENTOS, generarDocumento } from "@/lib/documentos";

export const dynamic = "force-dynamic";

function nombreArchivo(titulo: string, tipo: string) {
  const base = titulo
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 60)
    .toLowerCase();
  return `${tipo}-${base || "debate"}.docx`;
}

export async function GET(_req: Request, { params }: { params: Promise<{ id: string; tipo: string }> }) {
  const { id, tipo } = await params;
  const doc = DOCUMENTOS.find((d) => d.tipo === tipo);
  const d = await obtenerDebateCompleto(Number(id));
  if (!doc || !d) return NextResponse.json({ error: "No encontrado" }, { status: 404 });

  const buffer = await generarDocumento(doc.tipo, d, await obtenerConfiguracion());
  return new NextResponse(new Uint8Array(buffer), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${nombreArchivo(d.debate.titulo, doc.tipo)}"`,
    },
  });
}
