import { NextRequest, NextResponse } from "next/server";
import { agregarPorUbicacion } from "@/lib/actuaciones";
import { parseFiltros } from "@/lib/filtros";

export async function GET(req: NextRequest) {
  const filtros = parseFiltros(req.nextUrl.searchParams);
  const departamento = req.nextUrl.searchParams.get("departamento");

  const porDepartamento = await agregarPorUbicacion(filtros, false);

  let porMunicipio: Awaited<ReturnType<typeof agregarPorUbicacion>> = [];
  if (departamento) {
    porMunicipio = await agregarPorUbicacion({ ...filtros, departamento }, true);
  }

  return NextResponse.json({ porDepartamento, porMunicipio });
}
