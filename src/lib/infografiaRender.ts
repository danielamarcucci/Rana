import { createCanvas, loadImage, type SKRSContext2D } from "@napi-rs/canvas";
import type { ContenidoInfografia } from "./infografias";

const ANCHO = 1080;
const ALTO = 1350;
const VERDE = "#2e5f22";
const VERDE_OSCURO = "#1e3b18";
const TIERRA = "#4d341c";
const CREMA = "#fbf7ee";
const DORADO = "#c69c4e";

function envolverTexto(
  ctx: SKRSContext2D,
  texto: string,
  x: number,
  y: number,
  maxWidth: number,
  lineHeight: number,
  maxLineas = 999
) {
  const palabras = (texto || "").split(/\s+/).filter(Boolean);
  let linea = "";
  let cy = y;
  let lineas = 0;
  for (const palabra of palabras) {
    const prueba = linea ? `${linea} ${palabra}` : palabra;
    if (ctx.measureText(prueba).width > maxWidth && linea) {
      ctx.fillText(linea, x, cy);
      linea = palabra;
      cy += lineHeight;
      lineas += 1;
      if (lineas >= maxLineas) {
        ctx.fillText(linea + "…", x, cy);
        return cy + lineHeight;
      }
    } else {
      linea = prueba;
    }
  }
  if (linea) {
    ctx.fillText(linea, x, cy);
    cy += lineHeight;
  }
  return cy;
}

function dibujarLogo(ctx: SKRSContext2D, cx: number, cy: number, r: number) {
  ctx.save();
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fillStyle = "#ffffff";
  ctx.globalAlpha = 0.15;
  ctx.fill();
  ctx.globalAlpha = 1;
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, r * 0.08);
  ctx.stroke();

  // Espiga estilizada (dibujada con vectores, sin depender de fuentes emoji)
  ctx.strokeStyle = "#ffffff";
  ctx.fillStyle = "#ffffff";
  ctx.lineWidth = Math.max(2, r * 0.09);
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(cx, cy + r * 0.55);
  ctx.lineTo(cx, cy - r * 0.55);
  ctx.stroke();
  const pares = 3;
  for (let i = 0; i < pares; i++) {
    const t = i / pares;
    const y0 = cy + r * 0.35 - t * r * 0.75;
    const y1 = y0 - r * 0.22;
    const dx = r * 0.42;
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.quadraticCurveTo(cx + dx, y0 - r * 0.05, cx + dx * 0.55, y1);
    ctx.quadraticCurveTo(cx + dx * 0.15, y0 - r * 0.05, cx, y0 + r * 0.05);
    ctx.fill();
    ctx.beginPath();
    ctx.moveTo(cx, y0);
    ctx.quadraticCurveTo(cx - dx, y0 - r * 0.05, cx - dx * 0.55, y1);
    ctx.quadraticCurveTo(cx - dx * 0.15, y0 - r * 0.05, cx, y0 + r * 0.05);
    ctx.fill();
  }
  ctx.restore();
}

function dibujarFilaDato(ctx: SKRSContext2D, x: number, y: number, etiqueta: string, valor: string, colorBullet: string) {
  ctx.save();
  ctx.fillStyle = colorBullet;
  ctx.beginPath();
  ctx.arc(x + 7, y - 8, 7, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.textAlign = "left";
  ctx.fillStyle = "#8f6425";
  ctx.font = "bold 15px sans-serif";
  ctx.fillText(etiqueta.toUpperCase(), x + 26, y - 13);
  ctx.fillStyle = TIERRA;
  ctx.font = "600 23px sans-serif";
  ctx.fillText(valor, x + 26, y + 12);
}

export async function renderizarInfografiaPng(
  contenido: ContenidoInfografia,
  radicado: string,
  fotoBuffer?: Buffer | null
): Promise<Buffer> {
  const canvas = createCanvas(ANCHO, ALTO);
  const ctx = canvas.getContext("2d");

  // Fondo general
  ctx.fillStyle = CREMA;
  ctx.fillRect(0, 0, ANCHO, ALTO);

  // Margen izquierdo para foto (según corrección: campo libre de imagen)
  const anchoFoto = 340;
  if (fotoBuffer) {
    try {
      const img = await loadImage(fotoBuffer);
      const escala = Math.max(anchoFoto / img.width, ALTO / img.height);
      const w = img.width * escala;
      const h = img.height * escala;
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, anchoFoto, ALTO);
      ctx.clip();
      ctx.drawImage(img, (anchoFoto - w) / 2, (ALTO - h) / 2, w, h);
      ctx.restore();
      ctx.fillStyle = "rgba(30, 59, 24, 0.35)";
      ctx.fillRect(0, 0, anchoFoto, ALTO);
    } catch {
      ctx.fillStyle = VERDE_OSCURO;
      ctx.fillRect(0, 0, anchoFoto, ALTO);
    }
  } else {
    const grad = ctx.createLinearGradient(0, 0, 0, ALTO);
    grad.addColorStop(0, VERDE_OSCURO);
    grad.addColorStop(1, VERDE);
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, anchoFoto, ALTO);
    ctx.fillStyle = "rgba(255,255,255,0.5)";
    ctx.font = "600 26px sans-serif";
    ctx.textAlign = "center";
    ctx.save();
    ctx.translate(anchoFoto / 2, ALTO / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText("ESPACIO PARA FOTOGRAFÍA", 0, 0);
    ctx.restore();
  }

  const xContenido = anchoFoto + 56;
  const anchoContenido = ANCHO - xContenido - 56;

  // Encabezado
  ctx.fillStyle = VERDE;
  ctx.fillRect(anchoFoto, 0, ANCHO - anchoFoto, 170);
  dibujarLogo(ctx, xContenido + 40, 85, 40);
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "bold 30px sans-serif";
  ctx.fillText("RED NACIONAL DE DEFENSA", xContenido + 100, 68);
  ctx.fillText("POR LA REFORMA AGRARIA", xContenido + 100, 104);
  ctx.font = "600 20px sans-serif";
  ctx.fillStyle = "#dcf0d6";
  ctx.fillText(`Radicado ${radicado}`, xContenido + 100, 138);

  let y = 230;

  // Badge tipo de hecho
  ctx.font = "bold 26px sans-serif";
  const tipoHecho = contenido.tipoHecho || "Hecho reportado";
  const badgeAncho = Math.min(anchoContenido, ctx.measureText(tipoHecho.toUpperCase()).width + 56);
  ctx.fillStyle = "#cf3f2c";
  ctx.beginPath();
  ctx.roundRect(xContenido, y, badgeAncho, 52, 26);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textBaseline = "middle";
  ctx.fillText(tipoHecho.toUpperCase(), xContenido + 28, y + 27);
  ctx.textBaseline = "alphabetic";
  y += 100;

  // Fecha, territorio y población afectada
  y += 10;
  dibujarFilaDato(ctx, xContenido, y, "Fecha", contenido.fecha || "Por confirmar", "#cf3f2c");
  y += 54;
  dibujarFilaDato(ctx, xContenido, y, "Territorio", contenido.territorio || "Por confirmar", VERDE);
  y += 54;
  if (contenido.poblacionAfectada) {
    dibujarFilaDato(ctx, xContenido, y, "Población afectada", contenido.poblacionAfectada, "#2f83a8");
    y += 54;
  }

  y += 12;
  ctx.strokeStyle = DORADO;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(xContenido, y);
  ctx.lineTo(xContenido + anchoContenido, y);
  ctx.stroke();
  y += 46;

  // Descripción breve
  ctx.fillStyle = VERDE_OSCURO;
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("¿Qué pasó?", xContenido, y);
  y += 38;
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#332318";
  y = envolverTexto(
    ctx,
    contenido.descripcionBreve || "Descripción pendiente de completar.",
    xContenido,
    y,
    anchoContenido,
    32,
    9
  );

  y += 30;
  ctx.fillStyle = VERDE_OSCURO;
  ctx.font = "bold 24px sans-serif";
  ctx.fillText("Exigimos / solicitamos", xContenido, y);
  y += 38;
  ctx.font = "22px sans-serif";
  ctx.fillStyle = "#332318";
  envolverTexto(
    ctx,
    contenido.solicitudes || "Solicitudes institucionales pendientes de completar.",
    xContenido,
    y,
    anchoContenido,
    32,
    7
  );

  // Pie
  ctx.fillStyle = VERDE;
  ctx.fillRect(anchoFoto, ALTO - 90, ANCHO - anchoFoto, 90);
  ctx.fillStyle = "#ffffff";
  ctx.font = "italic bold 24px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("¡Ni una hectárea atrás, ni un derecho atrás!", anchoFoto + (ANCHO - anchoFoto) / 2, ALTO - 40);

  return canvas.toBuffer("image/png");
}
