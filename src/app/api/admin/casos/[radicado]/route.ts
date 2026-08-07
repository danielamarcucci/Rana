import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCaso, actualizarDatosCaso, actualizarEstado } from "@/lib/casos";
import { ESTADO_CASO } from "@/lib/catalogos";
import type { CasoData, EstadoCaso } from "@/lib/types";

const ESTADOS_VALIDOS = ESTADO_CASO.map((e) => e.value);

const updateSchema = z.object({
  estado: z.enum(ESTADOS_VALIDOS as [string, ...string[]]).optional(),
  data: z.record(z.string(), z.unknown()).optional(),
  draft: z.boolean().optional(),
  marcarAmpliadoCompleto: z.boolean().optional(),
});

export async function GET(_req: NextRequest, { params }: { params: Promise<{ radicado: string }> }) {
  const { radicado } = await params;
  const caso = await getCaso(decodeURIComponent(radicado));
  if (!caso) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });
  return NextResponse.json({ caso });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ radicado: string }> }) {
  const { radicado: raw } = await params;
  const radicado = decodeURIComponent(raw);
  const existing = await getCaso(radicado);
  if (!existing) return NextResponse.json({ error: "Caso no encontrado." }, { status: 404 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const parsed = updateSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos." }, { status: 400 });
  }

  if (parsed.data.estado) {
    await actualizarEstado(radicado, parsed.data.estado as EstadoCaso);
  }
  if (parsed.data.data) {
    await actualizarDatosCaso(radicado, parsed.data.data as CasoData, {
      marcarAmpliadoCompleto: parsed.data.marcarAmpliadoCompleto,
      draft: parsed.data.draft,
    });
  }

  return NextResponse.json({ caso: await getCaso(radicado) });
}
