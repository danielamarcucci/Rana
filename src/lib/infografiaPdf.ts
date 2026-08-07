import { PDFDocument } from "pdf-lib";

export async function pngAPdf(pngBuffer: Buffer, ancho: number, alto: number): Promise<Buffer> {
  const pdf = await PDFDocument.create();
  const imagen = await pdf.embedPng(pngBuffer);
  const pagina = pdf.addPage([ancho, alto]);
  pagina.drawImage(imagen, { x: 0, y: 0, width: ancho, height: alto });
  const bytes = await pdf.save();
  return Buffer.from(bytes);
}
