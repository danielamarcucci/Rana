import { ErrorUsuario } from "./db";
import { leerPesos } from "./dinero";
import { esFechaISO } from "./fechas";

export const txt = (d: FormData, k: string, max = 500): string => String(d.get(k) ?? "").trim().slice(0, max);
export const txtONull = (d: FormData, k: string, max = 500): string | null => txt(d, k, max) || null;

export function entero(d: FormData, k: string, { requerido = false, nombre = k } = {}): number | null {
  const v = txt(d, k);
  if (!v) {
    if (requerido) throw new ErrorUsuario(`Falta ${nombre}.`);
    return null;
  }
  if (!/^\d{1,9}$/.test(v)) throw new ErrorUsuario(`${nombre} no es válido.`);
  return Number(v);
}

export function fechaCampo(d: FormData, k: string, { requerido = false, nombre = k } = {}): string | null {
  const v = txt(d, k);
  if (!v) {
    if (requerido) throw new ErrorUsuario(`Falta ${nombre}.`);
    return null;
  }
  if (!esFechaISO(v)) throw new ErrorUsuario(`${nombre} no es una fecha válida.`);
  if (v < "2000-01-01" || v > "2100-12-31") throw new ErrorUsuario(`${nombre} está fuera de rango.`);
  return v;
}

/** Mes 'AAAA-MM' (de un <input type="month">) → 'AAAA-MM-01'. */
export function mesCampo(d: FormData, k: string, { requerido = false, nombre = k } = {}): string | null {
  const v = txt(d, k);
  if (!v) {
    if (requerido) throw new ErrorUsuario(`Falta ${nombre}.`);
    return null;
  }
  if (!/^\d{4}-\d{2}$/.test(v) || !esFechaISO(v + "-01")) throw new ErrorUsuario(`${nombre} no es un mes válido.`);
  return v + "-01";
}

export function dinero(
  d: FormData,
  k: string,
  { requerido = false, nombre = k, positivo = true, permitirCero = false, permitirNegativo = false } = {},
): number | null {
  const v = txt(d, k);
  if (!v) {
    if (requerido) throw new ErrorUsuario(`Falta ${nombre}.`);
    return null;
  }
  const c = leerPesos(v, { permitirNegativo });
  if (c === null) throw new ErrorUsuario(`${nombre}: escriba un valor en pesos, por ejemplo 150.000 o 150.000,50.`);
  if (positivo && !permitirNegativo && (c < 0 || (!permitirCero && c === 0)))
    throw new ErrorUsuario(`${nombre} debe ser mayor que cero.`);
  if (Math.abs(c) > 1e14) throw new ErrorUsuario(`${nombre} es demasiado grande.`);
  return c;
}

export function opcion<T extends string>(d: FormData, k: string, opciones: readonly T[], { requerido = false, nombre = k } = {}): T | null {
  const v = txt(d, k);
  if (!v) {
    if (requerido) throw new ErrorUsuario(`Falta ${nombre}.`);
    return null;
  }
  if (!(opciones as readonly string[]).includes(v)) throw new ErrorUsuario(`${nombre} no es válido.`);
  return v as T;
}
