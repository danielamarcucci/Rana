import { NextRequest, NextResponse } from "next/server";
import { crearActuacion, listarActuaciones } from "../../../lib/actuaciones";
import { parseFiltros } from "../../../lib/filtros";
import { actuacionInputSchema } from "../../../lib/validation";
import { usuarioActual } from "../../../lib/auth";

export async function GET(req: NextRequest) {
  const sesion = await usuarioActual();
  const filtros = parseFiltros(req.nextUrl.searchParams);

  // Una cuenta de dependencia solo puede listar las actuaciones de su
  // propia dependencia — sin importar qué dependenciaId venga en la URL.
  if (sesion?.rol === "dependencia") {
    if (!sesion.dependenciaId) return NextResponse.json({ actuaciones: [] });
    filtros.dependenciaIds = [sesion.dependenciaId];
  }

  const actuaciones = await listarActuaciones(filtros);
  return NextResponse.json({ actuaciones });
}

export async function POST(req: NextRequest) {
  const sesion = await usuarioActual();
  if (!sesion) return NextResponse.json({ error: "No autenticado" }, { status: 401 });

  const body = await req.json().catch(() => null);
  const parsed = actuacionInputSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Datos inválidos", detalles: parsed.error.flatten() }, { status: 400 });
  }

  // Una cuenta de dependencia solo puede crear actuaciones para su propia
  // dependencia, sin importar qué dependenciaId venga en el formulario.
  if (sesion.rol === "dependencia") {
    if (!sesion.dependenciaId) {
      return NextResponse.json({ error: "Esta cuenta no tiene una dependencia asignada" }, { status: 403 });
    }
    parsed.data.dependenciaId = sesion.dependenciaId;
  }

  const id = await crearActuacion(parsed.data, sesion.nombreVisible);
  return NextResponse.json({ id }, { status: 201 });
}
