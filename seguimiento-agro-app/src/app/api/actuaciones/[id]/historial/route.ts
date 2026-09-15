import { NextRequest, NextResponse } from "next/server";
import { historialActuacion } from "../../../../../lib/actuaciones";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const historial = await historialActuacion(Number(id));
  return NextResponse.json({ historial });
}
