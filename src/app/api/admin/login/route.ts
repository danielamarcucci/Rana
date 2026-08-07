import { NextRequest, NextResponse } from "next/server";
import { loginSchema } from "@/lib/validation";
import { verificarCredenciales, crearSesion } from "@/lib/auth";
import { permitirIntento } from "@/lib/rateLimit";

export async function POST(req: NextRequest) {
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  if (!permitirIntento(ip)) {
    return NextResponse.json(
      { error: "Demasiados intentos. Espere unos minutos e intente de nuevo." },
      { status: 429 }
    );
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Solicitud inválida." }, { status: 400 });
  }

  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Ingrese usuario y clave." }, { status: 400 });
  }

  const ok = await verificarCredenciales(parsed.data.usuario, parsed.data.clave);
  if (!ok) {
    return NextResponse.json({ error: "Usuario o clave incorrectos." }, { status: 401 });
  }

  await crearSesion(parsed.data.usuario);
  return NextResponse.json({ ok: true });
}
