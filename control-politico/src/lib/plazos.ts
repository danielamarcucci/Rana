// Cálculo de plazos en días hábiles (lunes a viernes, excluyendo festivos de
// Colombia). Los festivos se calculan con la Ley 51 de 1983 ("Ley Emiliani")
// y la fecha de Pascua, así que funcionan para cualquier año sin mantener
// listas a mano. Todas las fechas se manejan como texto "AAAA-MM-DD" para
// evitar desfases de zona horaria.

function aFecha(iso: string): Date {
  const [a, m, d] = iso.split("-").map(Number);
  return new Date(Date.UTC(a, m - 1, d));
}

function aIso(f: Date): string {
  return f.toISOString().slice(0, 10);
}

function sumarDias(f: Date, n: number): Date {
  const r = new Date(f);
  r.setUTCDate(r.getUTCDate() + n);
  return r;
}

// Algoritmo anónimo gregoriano (Meeus/Jones/Butcher).
export function domingoDePascua(anio: number): Date {
  const a = anio % 19;
  const b = Math.floor(anio / 100);
  const c = anio % 100;
  const d = Math.floor(b / 4);
  const e = b % 4;
  const f = Math.floor((b + 8) / 25);
  const g = Math.floor((b - f + 1) / 3);
  const h = (19 * a + b - d - g + 15) % 30;
  const i = Math.floor(c / 4);
  const k = c % 4;
  const l = (32 + 2 * e + 2 * i - h - k) % 7;
  const m = Math.floor((a + 11 * h + 22 * l) / 451);
  const mes = Math.floor((h + l - 7 * m + 114) / 31);
  const dia = ((h + l - 7 * m + 114) % 31) + 1;
  return new Date(Date.UTC(anio, mes - 1, dia));
}

function siguienteLunes(f: Date): Date {
  const dia = f.getUTCDay();
  if (dia === 1) return f;
  return sumarDias(f, (8 - dia) % 7);
}

const cacheFestivos = new Map<number, Set<string>>();

export function festivosDe(anio: number): Set<string> {
  const enCache = cacheFestivos.get(anio);
  if (enCache) return enCache;

  const fijo = (m: number, d: number) => new Date(Date.UTC(anio, m - 1, d));
  const pascua = domingoDePascua(anio);

  const fechas: Date[] = [
    fijo(1, 1), // Año Nuevo
    fijo(5, 1), // Día del Trabajo
    fijo(7, 20), // Independencia
    fijo(8, 7), // Batalla de Boyacá
    fijo(12, 8), // Inmaculada Concepción
    fijo(12, 25), // Navidad
    // Trasladables al lunes siguiente (Ley Emiliani)
    siguienteLunes(fijo(1, 6)), // Reyes Magos
    siguienteLunes(fijo(3, 19)), // San José
    siguienteLunes(fijo(6, 29)), // San Pedro y San Pablo
    siguienteLunes(fijo(8, 15)), // Asunción de la Virgen
    siguienteLunes(fijo(10, 12)), // Día de la Raza
    siguienteLunes(fijo(11, 1)), // Todos los Santos
    siguienteLunes(fijo(11, 11)), // Independencia de Cartagena
    // Según la Pascua
    sumarDias(pascua, -3), // Jueves Santo
    sumarDias(pascua, -2), // Viernes Santo
    sumarDias(pascua, 43), // Ascensión del Señor (lunes)
    sumarDias(pascua, 64), // Corpus Christi (lunes)
    sumarDias(pascua, 71), // Sagrado Corazón (lunes)
  ];

  const set = new Set(fechas.map(aIso));
  cacheFestivos.set(anio, set);
  return set;
}

export function esDiaHabil(iso: string): boolean {
  const f = aFecha(iso);
  const dia = f.getUTCDay();
  if (dia === 0 || dia === 6) return false;
  return !festivosDe(f.getUTCFullYear()).has(iso);
}

/** Fecha que resulta de contar `n` días hábiles después de `iso` (sin contar el día inicial). */
export function sumarDiasHabiles(iso: string, n: number): string {
  let f = aFecha(iso);
  let contados = 0;
  while (contados < n) {
    f = sumarDias(f, 1);
    if (esDiaHabil(aIso(f))) contados++;
  }
  return aIso(f);
}

/** Último día hábil que deja al menos `n` días hábiles completos antes de `iso`. */
export function restarDiasHabiles(iso: string, n: number): string {
  let f = aFecha(iso);
  let contados = 0;
  while (contados < n) {
    f = sumarDias(f, -1);
    if (esDiaHabil(aIso(f))) contados++;
  }
  return aIso(f);
}

/** Días hábiles entre hoy (excluido) y `iso` (incluido). Negativo si ya pasó. */
export function diasHabilesHasta(desde: string, hasta: string): number {
  if (desde === hasta) return 0;
  const signo = desde < hasta ? 1 : -1;
  let f = aFecha(desde);
  const fin = aFecha(hasta).getTime();
  let n = 0;
  while (f.getTime() !== fin) {
    f = sumarDias(f, signo);
    if (esDiaHabil(aIso(f))) n += signo;
  }
  return n;
}

export function hoyIso(): string {
  // Fecha de hoy en hora de Colombia (UTC-5, sin horario de verano).
  return aIso(new Date(Date.now() - 5 * 60 * 60 * 1000));
}
