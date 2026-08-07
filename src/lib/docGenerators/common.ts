import {
  Document,
  Packer,
  Paragraph,
  TextRun,
  HeadingLevel,
  AlignmentType,
  BorderStyle,
  Header,
  Footer,
  PageNumber,
} from "docx";

export const VERDE = "397A29";
export const TIERRA = "6D4A20";

export function titulo(texto: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_1,
    spacing: { after: 200 },
    children: [new TextRun({ text: texto, color: VERDE, bold: true })],
  });
}

export function subtitulo(texto: string) {
  return new Paragraph({
    heading: HeadingLevel.HEADING_2,
    spacing: { before: 200, after: 120 },
    children: [new TextRun({ text: texto, color: TIERRA, bold: true })],
  });
}

export function parrafo(
  texto: string,
  opts: { bold?: boolean; italics?: boolean; color?: string } = {}
) {
  return new Paragraph({
    spacing: { after: 120 },
    children: [
      new TextRun({
        text: texto || "—",
        bold: opts.bold,
        italics: opts.italics,
        color: opts.color,
      }),
    ],
  });
}

export function campo(etiqueta: string, valor?: string | null) {
  return new Paragraph({
    spacing: { after: 80 },
    children: [
      new TextRun({ text: `${etiqueta}: `, bold: true }),
      new TextRun({ text: valor && valor.trim() ? valor : "No registrado" }),
    ],
  });
}

export function marcador(texto: string) {
  return new TextRun({ text: `[COMPLETAR: ${texto}]`, color: "AC3020", italics: true, bold: true });
}

export function parrafoMarcador(texto: string) {
  return new Paragraph({ spacing: { after: 120 }, children: [marcador(texto)] });
}

export function lineaDivisoria() {
  return new Paragraph({
    spacing: { before: 100, after: 100 },
    border: {
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "D6B877" },
    },
    children: [],
  });
}

export function encabezadoDocumento() {
  return new Header({
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        children: [
          new TextRun({
            text: "Red Nacional de Defensa por la Reforma Agraria",
            size: 16,
            color: VERDE,
            bold: true,
          }),
        ],
      }),
    ],
  });
}

export function piePagina() {
  return new Footer({
    children: [
      new Paragraph({
        alignment: AlignmentType.CENTER,
        children: [
          new TextRun({ text: "Página ", size: 16, color: "8F6425" }),
          new TextRun({ children: [PageNumber.CURRENT], size: 16, color: "8F6425" }),
          new TextRun({ text: " de ", size: 16, color: "8F6425" }),
          new TextRun({ children: [PageNumber.TOTAL_PAGES], size: 16, color: "8F6425" }),
          new TextRun({ text: "  ·  Documento de uso interno, generado automáticamente", size: 16, color: "8F6425" }),
        ],
      }),
    ],
  });
}

export async function documentoABuffer(doc: Document): Promise<Buffer> {
  return Packer.toBuffer(doc);
}

export function nuevoDocumento(children: Paragraph[], titulo?: string) {
  return new Document({
    title: titulo,
    creator: "Red Nacional de Defensa por la Reforma Agraria",
    sections: [
      {
        headers: { default: encabezadoDocumento() },
        footers: { default: piePagina() },
        properties: {},
        children,
      },
    ],
  });
}
