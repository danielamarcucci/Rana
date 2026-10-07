// Dinero en centavos (enteros). Nunca se opera con decimales de punto flotante.

const fmt0 = new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", minimumFractionDigits: 0, maximumFractionDigits: 0 });

/** 123456 centavos → "$ 1.234,56"; si no hay centavos, sin decimales. */
export function pesos(centavos: number | null | undefined): string {
  const c = Number(centavos ?? 0);
  const abs = Math.abs(c);
  // Parte entera y centavos por separado: no se introducen decimales flotantes.
  const entero = fmt0.format(Math.trunc(abs / 100));
  const dec = abs % 100 ? "," + String(abs % 100).padStart(2, "0") : "";
  return (c < 0 ? "-" : "") + entero + dec;
}

/** Valor para un campo de formulario: 123456 → "1.234,56"; 100000 → "1.000". */
export function pesosCampo(centavos: number | null | undefined): string {
  if (centavos === null || centavos === undefined) return "";
  const abs = Math.abs(centavos);
  const entero = Math.trunc(abs / 100).toLocaleString("es-CO");
  const dec = abs % 100 ? "," + String(abs % 100).padStart(2, "0") : "";
  return (centavos < 0 ? "-" : "") + entero + dec;
}

/**
 * Interpreta un valor escrito en formato colombiano y lo devuelve en centavos.
 * "1.234.567" → 123456700 · "1.234.567,5" → 123456750 · "$ 20.000" → 2000000.
 * El punto es separador de miles y la coma separa decimales (máximo 2).
 * Devuelve null si el texto no es un valor válido.
 */
export function leerPesos(texto: string | null | undefined, { permitirNegativo = false } = {}): number | null {
  if (texto === null || texto === undefined) return null;
  let t = String(texto).replace(/\s|\$|COP/gi, "");
  if (!t) return null;
  let negativo = false;
  if (t.startsWith("-")) {
    negativo = true;
    t = t.slice(1);
  }
  if (!/^\d{1,3}(\.\d{3})*(,\d{1,2})?$|^\d+(,\d{1,2})?$/.test(t)) return null;
  const [ent, dec = ""] = t.split(",");
  const digitos = ent.replace(/\./g, "") + dec.padEnd(2, "0");
  if (digitos.length > 15) return null;
  const n = Number(digitos);
  if (!Number.isSafeInteger(n)) return null;
  if (negativo && !permitirNegativo) return null;
  return negativo ? -n : n;
}

/** Suma exacta de centavos. */
export function sumar(valores: Array<number | null | undefined>): number {
  return valores.reduce<number>((a, v) => a + Number(v ?? 0), 0);
}

/** Porcentaje entero (0-100+) sin errores de redondeo relevantes. */
export function porcentaje(parte: number, total: number): number {
  if (!total) return 0;
  return Math.floor((parte * 100) / total);
}
