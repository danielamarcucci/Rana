import { NextRequest, NextResponse } from "next/server";
import { crearCasoManual, listCasos } from "@/lib/casos";
import { registrarManualSchema } from "@/lib/validation";
import type { CasoData } from "@/lib/types";

export async function GET() {
  return NextResponse.json({ casos: listCasos() });
}

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }
  const parsed = registrarManualSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revise la información enviada.", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }
  const caso = crearCasoManual(
    parsed.data.data as CasoData,
    parsed.data.medioManual,
    parsed.data.draft ?? false
  );
  return NextResponse.json({ radicado: caso.radicado });
}
