// Fechas en el calendario de Colombia (America/Bogota, UTC-5 sin horario de verano).
// Las fechas efectivas se manejan como texto 'AAAA-MM-DD' para no depender de zonas horarias.

export const ZONA = "America/Bogota";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];

/** Fecha de hoy en Colombia, 'AAAA-MM-DD'. */
export function hoyCO(): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: ZONA, year: "numeric", month: "2-digit", day: "2-digit" }).format(new Date());
}

export function esFechaISO(s: string | null | undefined): s is string {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const [a, m, d] = s.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d));
  return f.getUTCFullYear() === a && f.getUTCMonth() === m - 1 && f.getUTCDate() === d;
}

/** 'AAAA-MM-DD' → '06/10/2026' */
export function fecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-");
  return `${d}/${m}/${a}`;
}

/** Marca de tiempo → '06/10/2026 3:45 p. m.' en hora de Colombia. */
export function fechaHora(ts: string | Date | null | undefined): string {
  if (!ts) return "—";
  return new Intl.DateTimeFormat("es-CO", {
    timeZone: ZONA, day: "2-digit", month: "2-digit", year: "numeric", hour: "numeric", minute: "2-digit",
  }).format(new Date(ts));
}

/** 'AAAA-MM' o 'AAAA-MM-01' → 'septiembre de 2026' */
export function mes(periodo: string | null | undefined): string {
  if (!periodo) return "—";
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES[m - 1]} de ${a}`;
}

export function mesCorto(periodo: string): string {
  const [a, m] = periodo.split("-").map(Number);
  return `${MESES[m - 1].slice(0, 3)} ${String(a).slice(2)}`;
}

export function nombreMes(m: number): string {
  return MESES[m - 1];
}

/** Primer día del mes de una fecha: '2026-09-17' → '2026-09-01' */
export function inicioMes(iso: string): string {
  return iso.slice(0, 7) + "-01";
}

/** Último día del mes: '2026-02-10' → '2026-02-28' */
export function finMes(iso: string): string {
  const [a, m] = iso.split("-").map(Number);
  const d = new Date(Date.UTC(a, m, 0)).getUTCDate();
  return `${iso.slice(0, 7)}-${String(d).padStart(2, "0")}`;
}

/** Suma meses a un periodo 'AAAA-MM-01'. */
export function sumarMeses(periodo: string, n: number): string {
  const [a, m] = periodo.split("-").map(Number);
  const t = a * 12 + (m - 1) + n;
  return `${Math.floor(t / 12)}-${String((t % 12) + 1).padStart(2, "0")}-01`;
}

/** Lista de periodos entre dos meses (incluidos). */
export function periodosEntre(desde: string, hasta: string): string[] {
  const out: string[] = [];
  let p = inicioMes(desde);
  const fin = inicioMes(hasta);
  while (p <= fin && out.length < 240) {
    out.push(p);
    p = sumarMeses(p, 1);
  }
  return out;
}

/** Fecha con un día del mes, sin pasarse del último día. */
export function diaDelMes(periodo: string, dia: number): string {
  const ultimo = Number(finMes(periodo).slice(8));
  return `${periodo.slice(0, 8)}${String(Math.min(dia, ultimo)).padStart(2, "0")}`;
}

/** Día anterior: '2026-03-01' → '2026-02-28' */
export function diaAnterior(iso: string): string {
  const [a, m, d] = iso.split("-").map(Number);
  const f = new Date(Date.UTC(a, m - 1, d - 1));
  return f.toISOString().slice(0, 10);
}
