import { NextRequest, NextResponse } from "next/server";
import { actualizarActuacion, eliminarActuacion, obtenerActuacion } from "@/lib/actuaciones";
import { actuacionInputSchema } from "@/lib/validation";
import { usuarioActual } from "@/lib/auth";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actuacion = await obtenerActuacion(Number(id));
  if (!actuacion) return NextResponse.json({ error: "No encontrada" }, { status: 404 });
  return NextResponse.json({ actuacion });
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  const existente = await obtenerActuacion(Number(id));
  if (!existente) return NextResponse.json({ error: "No encontrada" }, { status: 404 });

  const body = await req.json().catch(() => null);
  const parsed = actuacionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten() }, { status: 400 });
  }

  await actualizarActuacion(Number(id), parsed.data, sesion.nombreVisible);
  return NextResponse.json({ ok: true });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const { id } = await params;
  await eliminarActuacion(Number(id));
  return NextResponse.json({ ok: true });
}
