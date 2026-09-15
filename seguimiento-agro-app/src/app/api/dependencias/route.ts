import { NextRequest, NextResponse } from "next/server";
import { crearDependencia, listarDependencias } from "../../../lib/dependencias";
import { usuarioActual } from "../../../lib/auth";

export async function GET() {
  const dependencias = await listarDependencias();
  return NextResponse.json({ dependencias });
}

const TIPOS_VALIDOS = ["viceministerio", "direccion", "oficina", "entidad_adscrita", "entidad_vinculada"];

export async function POST(req: NextRequest) {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const nombre = typeof body?.nombre === "string" ? body.nombre.trim() : "";
  const tipo = typeof body?.tipo === "string" ? body.tipo : "";
  const padreId = typeof body?.padreId === "number" ? body.padreId : null;

  if (!nombre || !TIPOS_VALIDOS.includes(tipo)) {
    return NextResponse.json({ error: "Nombre y tipo válidos son obligatorios" }, { status: 400 });
  }

  const id = await crearDependencia(nombre, tipo, padreId);
  return NextResponse.json({ id });
}
