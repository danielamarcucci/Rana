import { NextRequest, NextResponse } from "next/server";
import { getCaso } from "@/lib/casos";
import { getOrCreateAnexo, actualizarOverrides } from "@/lib/anexos";
import { valoresResueltos } from "@/lib/docGenerators/anexo";
import type { AnexoTipo } from "@/lib/types";

const TIPOS_VALIDOS: AnexoTipo[] = ["derecho_peticion", "denuncia_publica", "alerta_agraria"];

function esTipoValido(t: string): t is AnexoTipo {
  return TIPOS_VALIDOS.includes(t as AnexoTipo);
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string; tipo: string }> }
) {
  const { radicado: raw, tipo } = await params;
  const radicado = decodeURIComponent(raw);
  if (!esTipoValido(tipo)) return NextResponse.json({ error: "Tipo de anexo inválido." }, { status: 400 });
  const caso = getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const anexo = getOrCreateAnexo(radicado, tipo);
  const valores = valoresResueltos(tipo, caso, anexo.overrides);
  return NextResponse.json({ anexo, valores });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ radicado: string; tipo: string }> }
) {
  const { radicado: raw, tipo } = await params;
  const radicado = decodeURIComponent(raw);
  if (!esTipoValido(tipo)) return NextResponse.json({ error: "Tipo de anexo inválido." }, { status: 400 });
  const caso = getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const overrides = (body as { overrides?: Record<string, string> })?.overrides;
  if (!overrides || typeof overrides !== "object") {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  const anexo = getOrCreateAnexo(radicado, tipo);
  const actualizado = actualizarOverrides(anexo.id, overrides);
  const valores = valoresResueltos(tipo, caso, actualizado?.overrides ?? {});
  return NextResponse.json({ anexo: actualizado, valores });
}
