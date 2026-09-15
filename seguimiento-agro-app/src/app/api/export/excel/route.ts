import { NextRequest, NextResponse } from "next/server";
import { listarActuaciones } from "@/lib/actuaciones";
import { parseFiltros } from "@/lib/filtros";
import { generarExcelActuaciones } from "@/lib/excel";

export async function GET(req: NextRequest) {
  const filtros = parseFiltros(req.nextUrl.searchParams);
  const actuaciones = await listarActuaciones(filtros);
  const buffer = await generarExcelActuaciones(actuaciones);

  const fecha = new Date().toISOString().slice(0, 10);
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="seguimiento-agro-${fecha}.xlsx"`,
    },
  });
}
