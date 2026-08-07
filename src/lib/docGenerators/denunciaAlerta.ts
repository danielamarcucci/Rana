import { Paragraph, TextRun } from "docx";
import type { Caso } from "../types";
import {
  nuevoDocumento,
  documentoABuffer,
  parrafo,
  marcador,
  lineaDivisoria,
} from "./common";

function p(valor: string | undefined, marcadorTexto: string, opts: { bold?: boolean; italics?: boolean } = {}) {
  if (valor && valor.trim()) return parrafo(valor, opts);
  return new Paragraph({ spacing: { after: 120 }, children: [marcador(marcadorTexto)] });
}

function frase(prefijoBold: string, valor: string | undefined, marcadorTexto: string) {
  const runs: TextRun[] = [new TextRun({ text: prefijoBold, bold: true })];
  if (valor && valor.trim()) runs.push(new TextRun({ text: valor }));
  else runs.push(marcador(marcadorTexto));
  return new Paragraph({ spacing: { after: 120 }, children: runs });
}

const NOTA_USO_INTERNO =
  "Nota de uso interno (no incluir en la versión publicada): este documento excluye por diseño la matrícula inmobiliaria, el código catastral, las medidas de autoprotección vigentes y demás datos reservados del formulario ampliado. Esa información se conserva únicamente en el expediente interno del caso.";

const DESTINATARIOS: { nombre: string; cargo: string; direccion: string; correo: string }[] = [
  { nombre: "[NOMBRE]", cargo: "Presidente de la República", direccion: "Carrera 8 No. 7 -26 Palacio de Nariño, Bogotá", correo: "[correo institucional actualizado]" },
  { nombre: "[NOMBRE]", cargo: "Ministro(a) de Defensa", direccion: "Avenida El Dorado con carrera 52, CAN, Bogotá D.C.", correo: "[correo institucional actualizado]" },
  { nombre: "[NOMBRE]", cargo: "Ministro(a) del Interior", direccion: "Carrera 9a. No. 14-10, Bogotá, D.C.", correo: "[correo institucional actualizado]" },
  { nombre: "[NOMBRE]", cargo: "Ministro(a) de Justicia y del Derecho", direccion: "Calle 53 No. 13 – 27, Bogotá D.C.", correo: "[correo institucional actualizado]" },
  { nombre: "[NOMBRE]", cargo: "Fiscal General de la Nación", direccion: "Diagonal 22B No. 52-01, Bogotá, D.C.", correo: "contacto@fiscalia.gov.co, denuncie@fiscalia.gov.co" },
  { nombre: "[NOMBRE]", cargo: "Defensor(a) del Pueblo", direccion: "Calle 55 # 10-32, Bogotá", correo: "defensoria@defensoria.org.co" },
  { nombre: "[NOMBRE]", cargo: "Procurador(a) General de la Nación", direccion: "Cra. 5 No. 15 – 80F, Bogotá D.C.", correo: "[correo institucional actualizado]" },
];

function bloqueInstituciones(v: Record<string, string>): Paragraph[] {
  const out: Paragraph[] = [
    new Paragraph({ spacing: { before: 200, after: 100 }, children: [new TextRun({ text: "INSTITUCIONES A DONDE SE DEBEN DIRIGIR", bold: true })] }),
  ];
  for (const d of DESTINATARIOS) {
    out.push(new Paragraph({ children: [new TextRun({ text: d.nombre, bold: true })] }));
    out.push(parrafo(d.cargo));
    out.push(parrafo(d.direccion));
    out.push(parrafo(`E-mail: ${d.correo}`));
  }
  out.push(new Paragraph({ children: [new TextRun({ text: "Oficina en Colombia del Alto Comisionado de Naciones Unidas para los Derechos Humanos", bold: true })] }));
  out.push(parrafo("Calle 114 No. 9-45 Torre B Oficina 1101, Edificio Teleport Business Park, Bogotá"));
  out.push(parrafo("Teléfono PBX (57-1) 629 3636"));
  out.push(parrafo("E-mail: oacnudh@hchr.org.co"));
  out.push(
    new Paragraph({
      children: [new TextRun({ text: "Autoridad local o regional pertinente según el caso", bold: true })],
    })
  );
  out.push(p(v.autoridadLocalNombre, "AUTORIDAD LOCAL O REGIONAL PERTINENTE"));
  out.push(p(v.autoridadLocalCargo, "CARGO"));
  out.push(p(v.autoridadLocalDireccion, "DIRECCIÓN"));
  out.push(parrafo(`E-mail: ${v.autoridadLocalCorreo && v.autoridadLocalCorreo.trim() ? v.autoridadLocalCorreo : "[correo]"}`));
  out.push(lineaDivisoria());
  out.push(
    frase("FAVOR REMITIR CORREO ELECTRÓNICO ", v.correoContactoRed, "CORREO ELECTRÓNICO DE CONTACTO DE LA RED")
  );
  out.push(new Paragraph({ children: [new TextRun({ text: "LOS OFICIOS, GESTIONES E INFORME DE LAS ACCIONES QUE ADELANTEN CON BASE EN ESTA INFORMACIÓN", bold: true })] }));
  out.push(new Paragraph({ spacing: { before: 200 }, children: [new TextRun({ text: "¡Ni una hectárea atrás, ni un derecho atrás!", italics: true })] }));
  return out;
}

function encabezadoYHechos(titulo: string, v: Record<string, string>, caso: Caso) {
  const d = caso.data;
  const lugar = [d.municipio, d.departamento].filter(Boolean).join(", ");
  return [
    new Paragraph({ heading: undefined, spacing: { after: 80 }, children: [new TextRun({ text: titulo, bold: true, size: 32, color: "397A29" })] }),
    ...(v.tituloCaso && v.tituloCaso.trim()
      ? [new Paragraph({ children: [new TextRun({ text: v.tituloCaso, italics: true })] })]
      : []),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: "A LA COMUNIDAD NACIONAL E INTERNACIONAL", bold: true })] }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "RED POR LA DEFENSA DE LA REFORMA AGRARIA", bold: true })] }),
    p(v.resumenHecho, "RESUMEN DEL HECHO EN 1-2 LÍNEAS", { italics: true }),
    new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "HECHOS", bold: true })] }),
    parrafo(
      `${lugar || "[MUNICIPIO, DEPARTAMENTO]"}${v.veredaLugar ? " – " + v.veredaLugar : ""} – Predio ${d.predios?.[0]?.nombrePredio || "[NOMBRE DEL PREDIO]"}`
    ),
    frase("Vínculo con la Reforma Agraria. ", v.sujetosAfectados, "SUJETOS AFECTADOS"),
    p(v.explicacionVinculo, "EXPLICACIÓN BREVE DEL VÍNCULO ENTRE EL HECHO Y EL PROCESO DE REFORMA AGRARIA"),
    frase(`${v.fechaHoraHecho || "[FECHA Y HORA DEL HECHO]"}. `, v.relatoHechos, "RELATO DE LOS HECHOS"),
    frase("Causa del hecho. ", v.causaHecho, "RAZÓN O HIPÓTESIS SEÑALADA POR LA FUENTE"),
    ...(v.antecedentes && v.antecedentes.trim()
      ? [frase("Antecedentes. ", v.antecedentes, "")]
      : []),
    ...(v.contextoAdicional && v.contextoAdicional.trim() ? [parrafo(v.contextoAdicional)] : []),
    new Paragraph({
      spacing: { before: 120, after: 80 },
      children: [
        new TextRun({
          text: `EN RECHAZO A LOS HECHOS DE ${v.calificacionHechos || "[CALIFICACIÓN DE LOS HECHOS]"} CONTRA ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} EN ${lugar || "[LUGAR]"}`,
          bold: true,
        }),
      ],
    }),
    new Paragraph({ spacing: { after: 80 }, children: [new TextRun({ text: "RESPONSABILIZAMOS", bold: true })] }),
    p(v.responsabilizamos, "A quién se responsabiliza por las violaciones al DIDH cometidas en el presente caso"),
    new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "EXIGIMOS", bold: true })] }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({
          text: `QUE SE ADELANTEN LAS MEDIDAS NECESARIAS Y CONDUCENTES PARA GARANTIZAR ${v.derechosEnRiesgo || "[DERECHO(S) EN RIESGO]"} DE ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} EN ${lugar || "[PREDIO/MUNICIPIO]"}`,
          bold: true,
        }),
      ],
    }),
    p(v.descripcionAmenaza, "DESCRIPCIÓN BREVE DE LA AMENAZA"),
  ];
}

export async function generarDenunciaPublicaDocx(caso: Caso, v: Record<string, string>): Promise<Buffer> {
  const d = caso.data;
  const lugar = [d.municipio, d.departamento].filter(Boolean).join(", ");
  const children: Paragraph[] = [
    ...encabezadoYHechos("DENUNCIA PÚBLICA", v, caso),
    new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "AL ESTADO COLOMBIANO", bold: true })] }),
    parrafo(
      `Desarrollar las acciones legales necesarias para determinar las responsabilidades colectivas e individuales por los hechos de ${v.calificacionHechos || "[TIPIFICACIÓN DEL HECHO]"} cometidos en contra de ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} en ${lugar || "[LUGAR]"}, por parte de los presuntos responsables identificados, consagrados en los hechos de esta Denuncia Pública.`
    ),
    parrafo(`Adelantar las acciones y adoptar las medidas idóneas para garantizar ${v.derechosEnRiesgo || "[DERECHOS EN RIESGO]"} de ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} en ${lugar || "[LUGAR]"}.`),
    parrafo(
      "El inmediato cumplimiento de las reiteradas recomendaciones que sobre el respeto y acatamiento del Derecho Internacional de los Derechos Humanos ha formulado la Comisión de Derechos Humanos de las Naciones Unidas, la Comisión Interamericana de Derechos Humanos de la OEA y demás organismos internacionales."
    ),
    new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "A LA DEFENSORÍA DEL PUEBLO", bold: true })] }),
    parrafo(
      `Desarrollar las acciones legales necesarias para que las autoridades competentes determinen, en el marco de sus competencias, las responsabilidades colectivas e individuales por los hechos de ${v.calificacionHechos || "[TIPIFICACIÓN DEL HECHO]"} cometidos en contra de ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} en ${lugar || "[LUGAR]"}, consagrados en los hechos de esta Denuncia Pública.`
    ),
    parrafo(`Cumplir con su papel institucional de velar por la garantía y el respeto a los derechos constitucionales de ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} en ${lugar || "[LUGAR]"}.`),
    new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "SOLICITAMOS", bold: true })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "A LA OFICINA DEL ALTO COMISIONADO DE LAS NACIONES UNIDAS PARA LOS DERECHOS HUMANOS (OACNUDH)", bold: true })] }),
    parrafo(
      "En el marco del cumplimiento de su mandato, vigilar de manera especial la situación de Derechos Humanos de las comunidades y personas beneficiarias de la política de Reforma Agraria y prestar toda su gestión para que las actuaciones del Estado Colombiano se apeguen a las normas internas y tratados internacionales que se ha comprometido a respetar y que se inicien las investigaciones a que haya lugar por el desconocimiento de las mismas."
    ),
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({
          text: "INSTAMOS A LOS ORGANISMOS DE DERECHOS HUMANOS Y ORGANIZACIONES POPULARES A MANTENERSE ATENTOS Y ALERTA ANTE LA SITUACIÓN DE DERECHOS HUMANOS QUE AFRONTAN LAS COMUNIDADES BENEFICIARIAS DE LA REFORMA AGRARIA EN COLOMBIA",
          bold: true,
        }),
      ],
    }),
    p(v.fechaPublicacion, "FECHA DE PUBLICACIÓN", { bold: true }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "¡Ni una hectárea atrás, ni un derecho atrás!", italics: true })] }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: NOTA_USO_INTERNO, italics: true, size: 16, color: "6D4A20" })] }),
    ...bloqueInstituciones(v),
  ];
  return documentoABuffer(nuevoDocumento(children, `Denuncia pública ${caso.radicado}`));
}

export async function generarAlertaAgrariaDocx(caso: Caso, v: Record<string, string>): Promise<Buffer> {
  const d = caso.data;
  const lugar = [d.municipio, d.departamento].filter(Boolean).join(", ");
  const children: Paragraph[] = [
    ...encabezadoYHechos("ALERTA AGRARIA", v, caso),
    new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "AL ESTADO COLOMBIANO", bold: true })] }),
    parrafo(`Adelantar las acciones y adoptar las medidas idóneas para garantizar ${v.derechosEnRiesgo || "[DERECHOS EN RIESGO]"} de ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} en ${lugar || "[LUGAR]"}.`),
    ...(v.accionAdicionalEstado && v.accionAdicionalEstado.trim()
      ? [parrafo(v.accionAdicionalEstado)]
      : []),
    new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "A LA DEFENSORÍA DEL PUEBLO", bold: true })] }),
    parrafo(`Cumplir con su papel institucional de velar por la garantía y el respeto a los derechos constitucionales de ${v.sujetosAfectados || "[SUJETOS AFECTADOS]"} en ${lugar || "[LUGAR]"}.`),
    new Paragraph({ spacing: { before: 160, after: 60 }, children: [new TextRun({ text: "SOLICITAMOS", bold: true })] }),
    new Paragraph({ spacing: { after: 60 }, children: [new TextRun({ text: "A LA OFICINA DEL ALTO COMISIONADO DE LAS NACIONES UNIDAS PARA LOS DERECHOS HUMANOS (OACNUDH)", bold: true })] }),
    parrafo(
      "En el marco del cumplimiento de su mandato, vigilar de manera especial la situación de Derechos Humanos de las comunidades y personas beneficiarias de la política de Reforma Agraria y prestar toda su gestión para que las actuaciones del Estado Colombiano se apeguen a las normas internas y tratados internacionales que se ha comprometido a respetar y que se inicien las investigaciones a que haya lugar por el desconocimiento de las mismas."
    ),
    new Paragraph({
      spacing: { before: 100, after: 100 },
      children: [
        new TextRun({
          text: "INSTAMOS A LOS ORGANISMOS DE DERECHOS HUMANOS Y ORGANIZACIONES POPULARES A MANTENERSE ATENTOS Y ALERTA ANTE LA SITUACIÓN DE DERECHOS HUMANOS QUE AFRONTAN LAS COMUNIDADES BENEFICIARIAS DE LA REFORMA AGRARIA EN COLOMBIA",
          bold: true,
        }),
      ],
    }),
    p(v.fechaPublicacion, "FECHA DE PUBLICACIÓN", { bold: true }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: "¡Ni una hectárea atrás, ni un derecho atrás!", italics: true })] }),
    new Paragraph({ spacing: { after: 160 }, children: [new TextRun({ text: NOTA_USO_INTERNO, italics: true, size: 16, color: "6D4A20" })] }),
    ...bloqueInstituciones(v),
  ];
  return documentoABuffer(nuevoDocumento(children, `Alerta agraria ${caso.radicado}`));
}
