import { esFechaISO, finMes, hoyCO, inicioMes, sumarMeses, fecha } from "./fechas";

export type Periodo = { clave: string; desde: string; hasta: string; etiqueta: string };

export const OPCIONES_PERIODO = [
  { clave: "mes", texto: "Este mes" },
  { clave: "mes-anterior", texto: "Mes anterior" },
  { clave: "anio", texto: "Año en curso" },
  { clave: "12m", texto: "Últimos 12 meses" },
  { clave: "todo", texto: "Todo" },
];

/** Interpreta el filtro de periodo de la URL. Por defecto: año en curso (ejercicio anual, art. 46). */
export function resolverPeriodo(sp: Record<string, string | undefined>): Periodo {
  const hoy = hoyCO();
  const p = sp.p || (sp.desde || sp.hasta ? "rango" : "anio");
  if (p === "rango" && esFechaISO(sp.desde) && esFechaISO(sp.hasta) && sp.desde <= sp.hasta) {
    return { clave: "rango", desde: sp.desde, hasta: sp.hasta, etiqueta: `${fecha(sp.desde)} a ${fecha(sp.hasta)}` };
  }
  switch (p) {
    case "mes":
      return { clave: p, desde: inicioMes(hoy), hasta: hoy, etiqueta: "Este mes" };
    case "mes-anterior": {
      const ini = sumarMeses(inicioMes(hoy), -1);
      return { clave: p, desde: ini, hasta: finMes(ini), etiqueta: "Mes anterior" };
    }
    case "12m":
      return { clave: p, desde: sumarMeses(inicioMes(hoy), -11), hasta: hoy, etiqueta: "Últimos 12 meses" };
    case "todo":
      return { clave: p, desde: "2000-01-01", hasta: hoy, etiqueta: "Todo el historial" };
    default:
      return { clave: "anio", desde: `${hoy.slice(0, 4)}-01-01`, hasta: hoy, etiqueta: `Año ${hoy.slice(0, 4)}` };
  }
}
