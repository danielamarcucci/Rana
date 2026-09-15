import { NextRequest, NextResponse } from "next/server";
import { crearSesion, verificarCredenciales } from "../../../lib/auth";

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const usuario = typeof body?.usuario === "string" ? body.usuario : "";
  const clave = typeof body?.clave === "string" ? body.clave : "";

  if (!usuario || !clave) {
    return NextResponse.json({ error: "Usuario y clave son obligatorios" }, { status: 400 });
  }

  const sesion = await verificarCredenciales(usuario, clave);
  if (!sesion) {
    return NextResponse.json({ error: "Usuario o clave incorrectos" }, { status: 401 });
  }

  await crearSesion(sesion);
  return NextResponse.json({ ok: true, usuario: sesion });
}
