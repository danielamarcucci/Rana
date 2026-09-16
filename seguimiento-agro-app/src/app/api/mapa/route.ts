import { NextRequest, NextResponse } from "next/server";
import { agregarPorUbicacion } from "../../../lib/actuaciones";
import { parseFiltros } from "../../../lib/filtros";

export async function GET(req: NextRequest) {
  const filtros = parseFiltros(req.nextUrl.searchParams);
  const departamento = req.nextUrl.searchParams.get("departamento");

  // El mapa completo (porDepartamento) nunca debe filtrarse por
  // departamento/municipio: si se filtrara por el departamento seleccionado,
  // el resto de departamentos se quedarían sin datos (mapa "en blanco")
  // apenas se elige uno. Esos dos campos solo aplican a la ubicación
  // seleccionada, no a los filtros generales (tipo, estado, dependencia...).
  const { departamento: _dep, municipio: _mun, ...filtrosGenerales } = filtros;
  const porDepartamento = await agregarPorUbicacion(filtrosGenerales, false);

  let porMunicipio: Awaited<ReturnType<typeof agregarPorUbicacion>> = [];
  if (departamento) {
    // El desglose por municipio tampoco se filtra por el municipio elegido:
    // debe seguir mostrando todos los municipios del departamento para
    // poder cambiar de uno a otro sin perder el resto de la lista.
    porMunicipio = await agregarPorUbicacion({ ...filtrosGenerales, departamento }, true);
  }

  return NextResponse.json({ porDepartamento, porMunicipio });
}
