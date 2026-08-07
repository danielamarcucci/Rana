import { NextRequest, NextResponse } from "next/server";
import { getCaso } from "@/lib/casos";
import { listAnexos } from "@/lib/anexos";
import { valoresResueltos } from "@/lib/docGenerators/anexo";
import { sugeridosInfografia } from "@/lib/docGenerators/sugeridosInfografia";
import { getOrCreateInfografia, actualizarContenidoInfografia } from "@/lib/infografias";
import type { ContenidoInfografia } from "@/lib/infografias";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ radicado: string }> }
) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = await getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  const anexos = await listAnexos(radicado);
  const anexoFinal = anexos.find((a) => a.estado === "version_final") ?? null;
  const habilitado = anexoFinal !== null;

  const valoresAnexo = anexoFinal ? valoresResueltos(anexoFinal.tipo, caso, anexoFinal.overrides) : null;
  const sugerido = sugeridosInfografia(caso, valoresAnexo);
  const infografia = await getOrCreateInfografia(radicado, sugerido);

  return NextResponse.json({ infografia, habilitado });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ radicado: string }> }
) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const caso = await getCaso(radicado);
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const contenido = (body as { contenido?: ContenidoInfografia })?.contenido;
  if (!contenido) return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });

  const actual = await getOrCreateInfografia(radicado, contenido);
  const actualizada = await actualizarContenidoInfografia(actual.id, contenido);
  return NextResponse.json({ infografia: actualizada });
}
