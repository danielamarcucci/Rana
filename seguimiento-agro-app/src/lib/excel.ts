import ExcelJS from "exceljs";
import type { Actuacion } from "./types";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ACTUACION } from "./types";

const AZUL = "FF1C4A91";
const NARANJA = "FFF0740F";
const BLANCO = "FFFFFFFF";

function estilarEncabezado(row: ExcelJS.Row, color: string) {
  row.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: BLANCO } };
    cell.fill = { type: "pattern", pattern: "solid", fgColor: { argb: color } };
    cell.alignment = { vertical: "middle", wrapText: true };
    cell.border = { bottom: { style: "thin", color: { argb: "FFCCCCCC" } } };
  });
  row.height = 26;
}

function textoUbicaciones(actuacion: Actuacion): { departamentos: string; municipios: string } {
  const porDepartamento = new Map<string, string[]>();
  for (const u of actuacion.ubicaciones) {
    const lista = porDepartamento.get(u.departamento) ?? [];
    if (u.municipio) lista.push(u.municipio);
    porDepartamento.set(u.departamento, lista);
  }
  const departamentos = [...porDepartamento.keys()].join(", ");
  const municipios = [...porDepartamento.entries()]
    .map(([dep, munis]) => (munis.length ? `${dep}: ${munis.join(", ")}` : `${dep}: todo el departamento`))
    .join(" | ");
  return { departamentos, municipios };
}

export async function generarExcelActuaciones(actuaciones: Actuacion[]): Promise<ExcelJS.Buffer> {
  const wb = new ExcelJS.Workbook();
  wb.creator = "Unidad de Información Estratégica del Despacho - MinAgricultura";
  wb.created = new Date();

  const hoja = wb.addWorksheet("Actuaciones", {
    views: [{ state: "frozen", ySplit: 1 }],
  });

  hoja.columns = [
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Nombre", key: "nombre", width: 42 },
    { header: "Dependencia / entidad", key: "dependencia", width: 34 },
    { header: "Tipo de dependencia", key: "tipoDependencia", width: 18 },
    { header: "Entidad ejecutora / contraparte", key: "entidadEjecutora", width: 26 },
    { header: "Departamentos", key: "departamentos", width: 30 },
    { header: "Municipios", key: "municipios", width: 40 },
    { header: "Fecha inicio", key: "fechaInicio", width: 13 },
    { header: "Fecha fin", key: "fechaFin", width: 13 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Avance (%)", key: "avance", width: 11 },
    { header: "Fuente de financiación", key: "fuente", width: 24 },
    { header: "Recursos destinados (COP)", key: "recursosDestinados", width: 20 },
    { header: "Recursos ejecutados (COP)", key: "recursosEjecutados", width: 20 },
    { header: "Ejecución presupuestal (%)", key: "ejecucion", width: 14 },
    { header: "Beneficiarios totales", key: "benTotal", width: 16 },
    { header: "Beneficiarias mujeres", key: "benMujeres", width: 16 },
    { header: "Beneficiarios jóvenes", key: "benJovenes", width: 16 },
    { header: "Comentarios / seguimiento", key: "comentarios", width: 46 },
    { header: "Creado por", key: "creadoPor", width: 20 },
    { header: "Última actualización por", key: "actualizadoPor", width: 20 },
    { header: "Creado el", key: "creadoEl", width: 18 },
    { header: "Actualizado el", key: "actualizadoEl", width: 18 },
  ];
  estilarEncabezado(hoja.getRow(1), AZUL);

  for (const a of actuaciones) {
    const { departamentos, municipios } = textoUbicaciones(a);
    const ejecucion = a.recursosDestinados > 0 ? (a.recursosEjecutados / a.recursosDestinados) * 100 : 0;
    hoja.addRow({
      tipo: ETIQUETA_TIPO_ACTUACION[a.tipo],
      nombre: a.nombre,
      dependencia: a.dependenciaNombre,
      tipoDependencia: a.dependenciaTipo,
      entidadEjecutora: a.entidadEjecutora,
      departamentos,
      municipios,
      fechaInicio: a.fechaInicio ?? "",
      fechaFin: a.fechaFin ?? "",
      estado: ETIQUETA_ESTADO[a.estado],
      avance: a.nivelAvance,
      fuente: a.fuenteFinanciacion,
      recursosDestinados: a.recursosDestinados,
      recursosEjecutados: a.recursosEjecutados,
      ejecucion: Math.round(ejecucion * 10) / 10,
      benTotal: a.beneficiariosTotal,
      benMujeres: a.beneficiariosMujeres,
      benJovenes: a.beneficiariosJovenes,
      comentarios: a.comentarios,
      creadoPor: a.creadoPor,
      actualizadoPor: a.actualizadoPor,
      creadoEl: a.createdAt.slice(0, 10),
      actualizadoEl: a.updatedAt.slice(0, 10),
    });
  }
  hoja.getColumn("recursosDestinados").numFmt = "#,##0";
  hoja.getColumn("recursosEjecutados").numFmt = "#,##0";
  hoja.autoFilter = { from: "A1", to: "W1" };

  const hojaUbicaciones = wb.addWorksheet("Ubicaciones (detalle)", {
    views: [{ state: "frozen", ySplit: 1 }],
  });
  hojaUbicaciones.columns = [
    { header: "ID", key: "id", width: 8 },
    { header: "Nombre actuación", key: "nombre", width: 42 },
    { header: "Tipo", key: "tipo", width: 14 },
    { header: "Dependencia / entidad", key: "dependencia", width: 34 },
    { header: "Departamento", key: "departamento", width: 24 },
    { header: "Municipio", key: "municipio", width: 24 },
    { header: "Estado", key: "estado", width: 14 },
    { header: "Avance (%)", key: "avance", width: 11 },
    { header: "Recursos destinados (COP)", key: "recursosDestinados", width: 20 },
    { header: "Recursos ejecutados (COP)", key: "recursosEjecutados", width: 20 },
    { header: "Beneficiarios totales", key: "benTotal", width: 16 },
    { header: "Beneficiarias mujeres", key: "benMujeres", width: 16 },
    { header: "Beneficiarios jóvenes", key: "benJovenes", width: 16 },
  ];
  estilarEncabezado(hojaUbicaciones.getRow(1), NARANJA);

  for (const a of actuaciones) {
    const ubicaciones = a.ubicaciones.length ? a.ubicaciones : [{ departamento: "(sin ubicación)", municipio: null }];
    for (const u of ubicaciones) {
      hojaUbicaciones.addRow({
        id: a.id,
        nombre: a.nombre,
        tipo: ETIQUETA_TIPO_ACTUACION[a.tipo],
        dependencia: a.dependenciaNombre,
        departamento: u.departamento,
        municipio: u.municipio ?? "(todo el departamento)",
        estado: ETIQUETA_ESTADO[a.estado],
        avance: a.nivelAvance,
        recursosDestinados: a.recursosDestinados,
        recursosEjecutados: a.recursosEjecutados,
        benTotal: a.beneficiariosTotal,
        benMujeres: a.beneficiariosMujeres,
        benJovenes: a.beneficiariosJovenes,
      });
    }
  }
  hojaUbicaciones.getColumn("recursosDestinados").numFmt = "#,##0";
  hojaUbicaciones.getColumn("recursosEjecutados").numFmt = "#,##0";
  hojaUbicaciones.autoFilter = { from: "A1", to: "M1" };

  return wb.xlsx.writeBuffer();
}
