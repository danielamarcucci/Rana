import { Paragraph, TextRun } from "docx";
import type { Caso } from "../types";
import { nuevoDocumento, documentoABuffer, parrafo, marcador } from "./common";

function p(valor: string | undefined, marcadorTexto: string, opts: { bold?: boolean } = {}) {
  if (valor && valor.trim()) return parrafo(valor, opts);
  return new Paragraph({ spacing: { after: 120 }, children: [marcador(marcadorTexto)] });
}

export async function generarDerechoPeticionDocx(caso: Caso, v: Record<string, string>): Promise<Buffer> {
  const children: Paragraph[] = [
    new Paragraph({
      spacing: { after: 200 },
      children: [
        new TextRun({ text: `${v.ciudad || "[CIUDAD]"}, ${v.fecha || "[FECHA]"}` }),
      ],
    }),
    parrafo("Señor(a)"),
    p(v.funcionarioDestinatario, "NOMBRE DEL FUNCIONARIO DESTINATARIO", { bold: true }),
    p(v.cargoFuncionario, "CARGO"),
    p(v.entidadDestinataria, "ENTIDAD DESTINATARIA"),
    p(v.correoEntidad, "CORREO ELECTRÓNICO DE NOTIFICACIONES DE LA ENTIDAD"),
    parrafo("(Repita el bloque anterior si la petición se dirige a más de un(a) funcionario(a) o entidad)", { italics: true }),

    new Paragraph({
      spacing: { before: 160, after: 120 },
      children: [
        new TextRun({ text: "Asunto: ", bold: true }),
        v.asunto && v.asunto.trim() ? new TextRun({ text: v.asunto }) : marcador("DESCRIPCIÓN CLARA Y ESPECÍFICA DE LA SOLICITUD"),
      ],
    }),

    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: v.peticionarioNombre || "[NOMBRE DEL PETICIONARIO O PETICIONARIOS]", bold: true }),
        new TextRun({
          text: `, identificado(a) con cédula de ciudadanía No. ${v.numeroCedula || "[NÚMERO DE CÉDULA]"}, actuando en nombre propio${v.organizacion ? ` y/o en representación de ${v.organizacion}` : ""}, en calidad de ${v.vinculoPredio || "[VÍNCULO CON EL PREDIO]"}, respetuosamente presento(amos) la siguiente petición, con fundamento en el artículo 23 de la Constitución Política, la Ley 1755 de 2015 y demás normas aplicables al caso.`,
        }),
      ],
    }),

    new Paragraph({ spacing: { before: 120, after: 80 }, children: [new TextRun({ text: "I. Hechos", bold: true })] }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "1. Identificación del predio y vínculo jurídico. ", bold: true }),
        new TextRun({
          text: `${v.predioIdentificacion || "[IDENTIFICACIÓN DEL PREDIO]"} Se encuentra actualmente ${v.estadoProcesoAgrario || "[ESTADO DEL PROCESO AGRARIO]"}, bajo el expediente o trámite No. ${v.numeroExpediente || "[NÚMERO DE EXPEDIENTE O TRÁMITE]"}.`,
        }),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: "2. Antecedentes del trámite ante la entidad. ", bold: true })],
    }),
    p(v.antecedentesTramite, "RELACIÓN CRONOLÓGICA DE LAS ACTUACIONES PREVIAS DE LA ENTIDAD"),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: "3. Situación actual. ", bold: true })],
    }),
    p(v.situacionActual, "DESCRIPCIÓN DEL HECHO O PROBLEMA QUE MOTIVA LA PETICIÓN"),
    new Paragraph({
      spacing: { after: 120 },
      children: [new TextRun({ text: "4. Consecuencias. ", bold: true })],
    }),
    p(v.consecuencias, "EFECTOS CONCRETOS DE LA SITUACIÓN SOBRE EL PROYECTO PRODUCTIVO Y LA FAMILIA O COMUNIDAD"),

    new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: "II. Consideraciones jurídicas", bold: true })] }),
    p(v.consideracionesJuridicas, "FUNDAMENTO NORMATIVO Y JURISPRUDENCIAL APLICABLE — requiere revisión de una persona con formación jurídica"),

    new Paragraph({ spacing: { before: 160, after: 80 }, children: [new TextRun({ text: "III. Solicitudes", bold: true })] }),
    parrafo(`Respetuosamente solicitamos a ${v.entidadDestinataria || "[ENTIDAD DESTINATARIA]"}:`),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Primero. ", bold: true }),
        v.solicitudPrimero && v.solicitudPrimero.trim() ? new TextRun({ text: v.solicitudPrimero }) : marcador("SOLICITUD PRINCIPAL"),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Segundo. ", bold: true }),
        v.solicitudSegundo && v.solicitudSegundo.trim() ? new TextRun({ text: v.solicitudSegundo }) : marcador("SOLICITUD SUBSIDIARIA O COMPLEMENTARIA"),
      ],
    }),
    new Paragraph({
      spacing: { after: 120 },
      children: [
        new TextRun({ text: "Tercero. ", bold: true }),
        v.solicitudTercero && v.solicitudTercero.trim() ? new TextRun({ text: v.solicitudTercero }) : marcador("SOLICITUD DE INFORMACIÓN SOBRE EL ESTADO DEL EXPEDIENTE"),
      ],
    }),
    ...(v.solicitudCuarto && v.solicitudCuarto.trim()
      ? [
          new Paragraph({
            spacing: { after: 120 },
            children: [new TextRun({ text: "Cuarto. ", bold: true }), new TextRun({ text: v.solicitudCuarto })],
          }),
        ]
      : []),

    parrafo(
      `Solicito que la presente petición sea resuelta dentro de los términos establecidos en la Ley 1755 de 2015 y se me(nos) notifique a través del teléfono ${v.telefonoContacto || "[TELÉFONO DE CONTACTO]"} y del correo electrónico ${v.correoContacto || "[CORREO ELECTRÓNICO DE CONTACTO]"}.`
    ),

    new Paragraph({ spacing: { before: 200, after: 40 }, children: [new TextRun({ text: "Atentamente," })] }),
    new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: v.peticionarioNombre || "[NOMBRE DEL PETICIONARIO]", bold: true })] }),
    parrafo(`Cédula No. ${v.numeroCedula || "[NÚMERO]"}`),
    parrafo("(Repita el bloque de firma si hay más de un(a) peticionario(a))", { italics: true }),
  ];

  return documentoABuffer(nuevoDocumento(children, `Derecho de petición ${caso.radicado}`));
}
