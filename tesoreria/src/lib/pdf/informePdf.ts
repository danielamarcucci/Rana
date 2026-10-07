import "server-only";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { PDFDocument, rgb, type PDFFont, type PDFPage, type PDFImage } from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import type { Informe } from "../datos/informe";
import { pesos } from "../dinero";
import { fecha, fechaHora, mes } from "../fechas";
import { ETIQUETA_DESTINO } from "../datos/movimientos";

const DIR = path.join(process.cwd(), "src", "lib", "pdf");
const OLIVO = rgb(0x46 / 255, 0x55 / 255, 0x1f / 255);
const TIERRA = rgb(0x8c / 255, 0x44 / 255, 0x15 / 255);
const TINTA = rgb(0x1c / 255, 0x21 / 255, 0x13 / 255);
const GRIS = rgb(0x5f / 255, 0x67 / 255, 0x52 / 255);
const LINEA = rgb(0xdb / 255, 0xe1 / 255, 0xce / 255);
const TENUE = rgb(0xf6 / 255, 0xf8 / 255, 0xf1 / 255);

const A4 = { w: 595.28, h: 841.89 };
const M = 48;

type Col = { titulo: string; ancho: number; der?: boolean };

class Lienzo {
  page!: PDFPage;
  y = 0;
  n = 0;
  constructor(
    private doc: PDFDocument,
    private f: { r: PDFFont; b: PDFFont; t: PDFFont },
    private logo: PDFImage,
    private pie: string,
  ) {
    this.nueva();
  }
  nueva() {
    this.page = this.doc.addPage([A4.w, A4.h]);
    this.n++;
    this.y = A4.h - M;
    if (this.n > 1) {
      this.page.drawText("Tesorería de la Red", { x: M, y: A4.h - 30, size: 8, font: this.f.b, color: GRIS });
      this.y = A4.h - M - 6;
    }
    this.page.drawText(`${this.pie} · página ${this.n}`, { x: M, y: 26, size: 7.5, font: this.f.r, color: GRIS });
  }
  espacio(h: number) {
    if (this.y - h < M + 10) this.nueva();
  }
  partir(texto: string, font: PDFFont, size: number, ancho: number): string[] {
    const out: string[] = [];
    for (const parrafo of texto.split("\n")) {
      let linea = "";
      for (const palabra of parrafo.split(/\s+/)) {
        const prueba = linea ? `${linea} ${palabra}` : palabra;
        if (font.widthOfTextAtSize(prueba, size) > ancho && linea) {
          out.push(linea);
          linea = palabra;
        } else linea = prueba;
      }
      out.push(linea);
    }
    return out;
  }
  texto(t: string, o: { size?: number; bold?: boolean; color?: ReturnType<typeof rgb>; despues?: number; ancho?: number } = {}) {
    const size = o.size ?? 9.5;
    const font = o.bold ? this.f.b : this.f.r;
    for (const l of this.partir(t, font, size, o.ancho ?? A4.w - 2 * M)) {
      this.espacio(size + 4);
      this.page.drawText(l, { x: M, y: this.y - size, size, font, color: o.color ?? TINTA });
      this.y -= size + 3.5;
    }
    this.y -= o.despues ?? 2;
  }
  encabezado(titulo: string, subtitulo: string) {
    const h = 46;
    const w = (this.logo.width / this.logo.height) * h;
    this.page.drawImage(this.logo, { x: M, y: this.y - h, width: w, height: h });
    this.page.drawText("TESORERÍA DE LA RED", { x: M + w + 16, y: this.y - 20, size: 15, font: this.f.t, color: OLIVO });
    this.page.drawText("Corporación por la Defensa de la Reforma Agraria", { x: M + w + 16, y: this.y - 34, size: 8.5, font: this.f.r, color: GRIS });
    this.y -= h + 22;
    this.page.drawText(titulo.toUpperCase(), { x: M, y: this.y - 20, size: 20, font: this.f.t, color: OLIVO });
    this.y -= 28;
    this.texto(subtitulo, { size: 9, color: GRIS, despues: 6 });
    this.page.drawLine({ start: { x: M, y: this.y }, end: { x: A4.w - M, y: this.y }, thickness: 1, color: LINEA });
    this.y -= 14;
  }
  seccion(t: string) {
    this.espacio(46);
    this.y -= 8;
    this.page.drawText(t.toUpperCase(), { x: M, y: this.y - 11, size: 11.5, font: this.f.t, color: TIERRA });
    this.y -= 19;
  }
  tabla(cols: Col[], filas: string[][], o: { total?: string[]; size?: number } = {}) {
    const size = o.size ?? 8.8;
    const ancho = A4.w - 2 * M;
    const xs: number[] = [];
    let acc = M;
    for (const c of cols) {
      xs.push(acc);
      acc += c.ancho * ancho;
    }
    const fila = (celdas: string[], estilo: "cab" | "normal" | "total") => {
      const font = estilo === "normal" ? this.f.r : this.f.b;
      const s = estilo === "cab" ? size - 1 : size;
      const lineas = celdas.map((c, i) => this.partir(c ?? "", font, s, cols[i].ancho * ancho - 8));
      const alto = Math.max(...lineas.map((l) => l.length)) * (s + 2.5) + 6;
      this.espacio(alto);
      if (estilo !== "normal") this.page.drawRectangle({ x: M, y: this.y - alto, width: ancho, height: alto, color: TENUE });
      lineas.forEach((ls, i) => {
        ls.forEach((l, j) => {
          const w = font.widthOfTextAtSize(l, s);
          const x = cols[i].der ? xs[i] + cols[i].ancho * ancho - 4 - w : xs[i] + 4;
          this.page.drawText(l, { x, y: this.y - 4 - s - j * (s + 2.5) + 1, size: s, font, color: estilo === "cab" ? GRIS : TINTA });
        });
      });
      this.y -= alto;
      this.page.drawLine({ start: { x: M, y: this.y }, end: { x: M + ancho, y: this.y }, thickness: 0.5, color: LINEA });
    };
    this.espacio(size * 2 + 30); // el encabezado nunca queda solo al final de una página
    fila(cols.map((c) => c.titulo), "cab");
    for (const f of filas) fila(f, "normal");
    if (o.total) fila(o.total, "total");
    this.y -= 6;
  }
}

async function fuente(doc: PDFDocument, archivo: string) {
  return doc.embedFont(await readFile(path.join(DIR, "fuentes", archivo)), { subset: true });
}

export async function informePdf(inf: Informe, o: { generadoPor: string; detalle: boolean }): Promise<Uint8Array> {
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const f = {
    r: await fuente(doc, "OpenSans-Regular.ttf"),
    b: await fuente(doc, "OpenSans-SemiBold.ttf"),
    t: await fuente(doc, "OpenSansCondensed-ExtraBold.ttf"),
  };
  const logo = await doc.embedPng(await readFile(path.join(DIR, "logo-red.png")));
  const titulo = `Informe de tesorería · ${mes(inf.periodo)}`;
  doc.setTitle(titulo);
  doc.setAuthor("Tesorería de la Red");
  doc.setCreator("Tesorería de la Red");
  doc.setLanguage("es-CO");
  const generado = fechaHora(new Date());
  const L = new Lienzo(doc, f, logo, `${titulo} · generado el ${generado} por ${o.generadoPor}${o.detalle ? " · CON DETALLE INDIVIDUAL: uso reservado" : ""}`);

  L.encabezado(
    `Informe mensual · ${mes(inf.periodo)}`,
    `Periodo del ${fecha(inf.desde)} al ${fecha(inf.hasta)}. Valores en pesos colombianos. Solo movimientos verificados. ` +
      (o.detalle ? "Incluye detalle individual (exclusivo de tesorería)." : "Versión agregada."),
  );

  L.seccion("Estado de caja");
  const caja: string[][] = [
    [`Saldo inicial (al ${fecha(inf.desde)})`, pesos(inf.saldo_inicial)],
    ...(inf.flujos.saldos_iniciales_en_periodo ? [["+ Saldos iniciales confirmados con corte en el mes", pesos(inf.flujos.saldos_iniciales_en_periodo)]] : []),
    ["+ Ingresos verificados", pesos(inf.flujos.ingresos)],
    ["− Egresos verificados", pesos(inf.flujos.egresos)],
    ...(inf.flujos.reembolsos ? [["+ Reembolsos de egresos", pesos(inf.flujos.reembolsos)]] : []),
  ];
  L.tabla([{ titulo: "Concepto", ancho: 0.7 }, { titulo: "Valor", ancho: 0.3, der: true }], caja, { total: [`Saldo final (al ${fecha(inf.hasta)})`, pesos(inf.saldo_final)] });
  if (inf.traslados) L.texto(`Traslados entre cuentas propias por ${pesos(inf.traslados)}: no se cuentan como ingresos ni egresos.`, { size: 8, color: GRIS });
  if (inf.cuentas.length) {
    L.tabla([{ titulo: "Cuenta", ancho: 0.5 }, { titulo: "Saldo inicial", ancho: 0.25, der: true }, { titulo: "Saldo final", ancho: 0.25, der: true }],
      inf.cuentas.map((c) => [c.nombre, pesos(c.inicial), pesos(c.final)]));
  }

  L.seccion("Ingresos del periodo por concepto");
  if (inf.ingresos_concepto.length) {
    L.tabla([{ titulo: "Concepto", ancho: 0.7 }, { titulo: "Valor", ancho: 0.3, der: true }],
      inf.ingresos_concepto.map((r) => [r.concepto, pesos(r.valor)]), { total: ["Total", pesos(inf.flujos.ingresos)] });
  } else L.texto("Sin ingresos verificados en el periodo.", { color: GRIS });

  L.seccion("Egresos del periodo por categoría");
  if (inf.egresos_categoria.length) {
    L.tabla([{ titulo: "Categoría", ancho: 0.4 }, { titulo: "Egresos", ancho: 0.2, der: true }, { titulo: "Reembolsos", ancho: 0.2, der: true }, { titulo: "Neto", ancho: 0.2, der: true }],
      inf.egresos_categoria.map((r) => [r.categoria, pesos(r.egresos), r.reembolsos ? pesos(r.reembolsos) : "—", pesos(r.neto)]),
      { total: ["Total", pesos(inf.flujos.egresos), pesos(inf.flujos.reembolsos), pesos(inf.flujos.egresos_netos)] });
  } else L.texto("Sin egresos verificados en el periodo.", { color: GRIS });

  L.seccion("Avance del recaudo");
  L.texto("Recaudado = abonos verificados. Lo comprometido aún no es dinero recibido.", { size: 8, color: GRIS });
  for (const c of inf.constitucion) {
    const meta = (x: number | null) => (x === null ? "Por definir" : pesos(x));
    L.texto(`Constitución · ${c.esquema}`, { bold: true });
    L.tabla(
      [{ titulo: "Destino", ancho: 0.28 }, { titulo: "Meta", ancho: 0.18, der: true }, { titulo: "Comprometido", ancho: 0.18, der: true }, { titulo: "Recaudado", ancho: 0.18, der: true }, { titulo: "Pendiente", ancho: 0.18, der: true }],
      [
        ["Gastos de constitución", meta(c.meta_gastos), pesos(c.gastos.comprometido), pesos(c.gastos.recaudado), pesos(c.gastos.pendiente)],
        ["Patrimonio inicial", meta(c.meta_patrimonio), pesos(c.patrimonio.comprometido), pesos(c.patrimonio.recaudado), pesos(c.patrimonio.pendiente)],
      ],
    );
  }
  L.texto(`Sostenimiento · ${mes(inf.periodo)}`, { bold: true });
  L.tabla([{ titulo: "Concepto", ancho: 0.7 }, { titulo: "Valor", ancho: 0.3, der: true }], [
    [`Comprometido del mes (${inf.sostenimiento_mes.compromisos} compromisos)`, pesos(inf.sostenimiento_mes.comprometido)],
    [`Recaudado del mes (${inf.sostenimiento_mes.completos} completos)`, pesos(inf.sostenimiento_mes.recaudado)],
    ["Pendiente del mes", pesos(inf.sostenimiento_mes.pendiente)],
  ]);

  L.seccion("Compromisos de aportes pendientes (agregado)");
  L.tabla([{ titulo: "Aporte", ancho: 0.5 }, { titulo: "Pendiente", ancho: 0.25, der: true }, { titulo: "Con fecha vencida", ancho: 0.25, der: true }],
    inf.pendientes_aportes.map((x) => [x.tipo === "constitucion" ? "Constitución" : "Mensual de sostenimiento", pesos(x.pendiente), pesos(x.vencido)]));

  L.seccion("Gastos por pagar y disponibilidad estimada");
  L.tabla([{ titulo: "Concepto", ancho: 0.7 }, { titulo: "Valor", ancho: 0.3, der: true }], [
    ["Saldo final de caja y bancos", pesos(inf.saldo_final)],
    ["− Reservas y fondos con destinación específica (incluye sus gastos pendientes)", pesos(inf.retenido)],
    ["− Gastos por pagar sin fondo asignado", pesos(inf.gastos_por_pagar_sin_fondo)],
  ], { total: ["Disponible estimado", pesos(inf.disponible)] });
  L.texto(`Total de gastos comprometidos por pagar a la fecha de generación: ${pesos(inf.gastos_por_pagar)}. Cada obligación cubierta por una reserva se descuenta una sola vez.`, { size: 8, color: GRIS });
  if (inf.fondos.length) {
    L.tabla([{ titulo: "Reserva o fondo", ancho: 0.5 }, { titulo: "Saldo", ancho: 0.25, der: true }, { titulo: "Pendiente", ancho: 0.25, der: true }],
      inf.fondos.map((x) => [x.nombre, pesos(x.saldo), pesos(x.pendiente)]));
  }

  L.seccion("Control");
  L.texto(`Movimientos del mes por verificar: ${inf.control.por_verificar}${inf.control.por_verificar ? ` (${pesos(inf.control.por_verificar_valor)})` : ""}.`);
  L.texto(`Movimientos verificados sin soporte: ${inf.control.sin_soporte}.`);
  L.texto(`Cierre del mes: ${inf.control.cierres.length ? inf.control.cierres.map((c) => `${c.cuenta}: ${c.estado}${c.diferencia ? ` (diferencia ${pesos(c.diferencia)}: ${c.explicacion})` : ""}`).join("; ") : "sin cerrar"}.`);

  if (o.detalle && inf.detalle) {
    L.seccion("Anexo · Movimientos del mes (detalle individual)");
    L.tabla(
      [{ titulo: "Fecha", ancho: 0.11 }, { titulo: "N.º", ancho: 0.12 }, { titulo: "Concepto", ancho: 0.33 }, { titulo: "Persona", ancho: 0.2 }, { titulo: "Estado", ancho: 0.1 }, { titulo: "Valor", ancho: 0.14, der: true }],
      inf.detalle.movimientos.map((m) => [fecha(m.fecha_efectiva), `MOV-${String(m.id).padStart(5, "0")}`, `${m.concepto} (${m.tipo})`, m.miembro ?? m.tercero ?? "—", m.estado, (m.tipo === "egreso" ? "−" : "") + pesos(m.valor)]),
      { size: 7.8 },
    );
    L.seccion("Anexo · Compromisos pendientes (detalle individual)");
    L.tabla(
      [{ titulo: "Aportante", ancho: 0.32 }, { titulo: "Compromiso", ancho: 0.38 }, { titulo: "Fecha acordada", ancho: 0.14 }, { titulo: "Saldo", ancho: 0.16, der: true }],
      inf.detalle.pendientes.map((c) => [c.miembro, `${ETIQUETA_DESTINO[c.destino]}${c.periodo ? ` · ${mes(c.periodo)}` : ""}`, fecha(c.fecha_acordada), pesos(c.saldo)]),
      { size: 7.8 },
    );
  }

  L.y -= 10;
  L.texto("Informe generado por la herramienta de tesorería. Registrado por tesorería; las referencias de autorización no constituyen aprobaciones digitales de presidencia ni de otros órganos.", { size: 7.5, color: GRIS });
  return doc.save();
}
