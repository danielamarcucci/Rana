import { NextRequest, NextResponse } from "next/server";
import path from "node:path";
import fs from "node:fs/promises";
import { getCaso } from "@/lib/casos";
import { getInfografia } from "@/lib/infografias";
import { renderizarInfografiaPng } from "@/lib/infografiaRender";
import { pngAPdf } from "@/lib/infografiaPdf";
import { uploadsDir } from "@/lib/db";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ radicado: string }> }
) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const infografia = getInfografia(radicado);
  if (!infografia) return NextResponse.json({ error: "Aún no se ha generado la ficha gráfica." }, { status: 404 });

  let fotoBuffer: Buffer | null = null;
  if (infografia.fotoPath) {
    try {
      fotoBuffer = await fs.readFile(path.join(uploadsDir(), "infografias", infografia.fotoPath));
    } catch {
      fotoBuffer = null;
    }
  }

  const png = await renderizarInfografiaPng(infografia.contenido, radicado, fotoBuffer);

  const formato = req.nextUrl.searchParams.get("formato") === "pdf" ? "pdf" : "png";
  const nombreBase = `${radicado.replace("#", "_#")}_ficha-grafica`;

  if (formato === "pdf") {
    const pdf = await pngAPdf(png, 1080, 1350);
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${nombreBase}.pdf"`,
      },
    });
  }

  return new NextResponse(new Uint8Array(png), {
    headers: {
      "Content-Type": "image/png",
      "Content-Disposition": `inline; filename="${nombreBase}.png"`,
    },
  });
}
