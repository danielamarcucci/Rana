import { NextRequest, NextResponse } from "next/server";
import { getOrCreateAnexo, listVersiones } from "@/lib/anexos";
import type { AnexoTipo } from "@/lib/types";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string; tipo: string }> }
) {
  const { radicado: raw, tipo } = await params;
  const radicado = decodeURIComponent(raw);
  const anexo = await getOrCreateAnexo(radicado, tipo as AnexoTipo);
  const versiones = await listVersiones(anexo.id);
  return NextResponse.json({
    versiones: versiones.map((v) => ({
      id: v.id,
      etiqueta: v.etiqueta,
      createdAt: v.created_at,
      overrides: JSON.parse(v.overrides || "{}"),
    })),
  });
}
