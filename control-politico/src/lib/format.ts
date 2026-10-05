import { INSTANCIAS, type Debate } from "./types";

const MESES = [
  "enero", "febrero", "marzo", "abril", "mayo", "junio",
  "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
];
const DIAS = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];

export function formatFecha(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  return `${d} ${MESES[m - 1].slice(0, 3)} ${a}`;
}

export function formatFechaLarga(iso: string | null | undefined): string {
  if (!iso) return "—";
  const [a, m, d] = iso.slice(0, 10).split("-").map(Number);
  const dia = new Date(Date.UTC(a, m - 1, d)).getUTCDay();
  return `${DIAS[dia]} ${d} de ${MESES[m - 1]} de ${a}`;
}

export function nombreInstancia(d: Pick<Debate, "instancia" | "instancia_otra">): string {
  if (d.instancia === "otra") return d.instancia_otra || "comisión";
  return INSTANCIAS.find((i) => i.valor === d.instancia)?.etiqueta ?? d.instancia;
}

export function textoDias(n: number | null): string {
  if (n === null) return "Sin fecha";
  if (n === 0) return "Hoy";
  if (n > 0) return `En ${n} día${n === 1 ? "" : "s"} hábil${n === 1 ? "" : "es"}`;
  return `Hace ${-n} día${n === -1 ? "" : "s"} hábil${n === -1 ? "" : "es"}`;
}
