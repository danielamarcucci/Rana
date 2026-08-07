import { NextRequest, NextResponse } from "next/server";
import { getCaso } from "@/lib/casos";
import { getOrCreateAnexo, marcarVersionFinal } from "@/lib/anexos";
import type { AnexoTipo } from "@/lib/types";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string; tipo: string }> }
) {
  const { radicado: raw, tipo } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const anexo = getOrCreateAnexo(radicado, tipo as AnexoTipo);
  const actualizado = marcarVersionFinal(anexo.id);
  return NextResponse.json({ anexo: actualizado });
}
