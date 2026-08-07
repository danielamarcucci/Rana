import { NextRequest, NextResponse } from "next/server";
import { formularioInicialSchema } from "@/lib/validation";
import { crearCasoPublico } from "@/lib/casos";
import type { CanalRecepcion } from "@/lib/types";

const CANALES_VALIDOS: CanalRecepcion[] = ["pagina_web", "instagram", "whatsapp"];

export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo de la solicitud inválido." }, { status: 400 });
  }

  const parsed = formularioInicialSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Revise la información enviada.", detalles: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { accedioPor, ...data } = parsed.data;
  const canal: CanalRecepcion = CANALES_VALIDOS.includes(accedioPor as CanalRecepcion)
    ? (accedioPor as CanalRecepcion)
    : "pagina_web";

  const caso = crearCasoPublico({ ...data, accedioPor }, canal);

  return NextResponse.json({
    radicado: caso.radicado,
    token: caso.accessToken,
  });
}
