// CSV para Excel en español: UTF-8 con BOM, separador ";" y coma decimal.

export function celdaPesos(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  const neg = centavos < 0 ? "-" : "";
  const a = Math.abs(centavos);
  const dec = a % 100;
  return `${neg}${Math.trunc(a / 100)}${dec ? "," + String(dec).padStart(2, "0") : ""}`;
}

function celda(v: unknown): string {
  if (v === null || v === undefined) return "";
  let s = typeof v === "boolean" ? (v ? "sí" : "no") : String(v);
  // Evita la inyección de fórmulas al abrir el archivo en una hoja de cálculo.
  if (/^[=+\-@\t\r]/.test(s) && !/^-?\d+(,\d+)?$/.test(s)) s = "'" + s;
  return /[;"\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
}

export function csv(encabezados: string[], filas: unknown[][]): string {
  return "﻿" + [encabezados, ...filas].map((f) => f.map(celda).join(";")).join("\r\n") + "\r\n";
}

export function respuestaCsv(nombre: string, contenido: string): Response {
  return new Response(contenido, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${nombre}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
