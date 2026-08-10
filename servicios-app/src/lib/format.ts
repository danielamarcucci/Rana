export const MESES = [
  "Enero",
  "Febrero",
  "Marzo",
  "Abril",
  "Mayo",
  "Junio",
  "Julio",
  "Agosto",
  "Septiembre",
  "Octubre",
  "Noviembre",
  "Diciembre",
] as const;

export const MESES_CORTOS = [
  "Ene",
  "Feb",
  "Mar",
  "Abr",
  "May",
  "Jun",
  "Jul",
  "Ago",
  "Sep",
  "Oct",
  "Nov",
  "Dic",
] as const;

export function nombreMes(mes: number) {
  return MESES[mes - 1] ?? "";
}

export function nombreMesCorto(mes: number) {
  return MESES_CORTOS[mes - 1] ?? "";
}

export function fechaHoy() {
  const ahora = new Date();
  return { anio: ahora.getFullYear(), mes: ahora.getMonth() + 1 };
}

export function formatCOP(valor: number | null | undefined) {
  if (valor === null || valor === undefined) return "";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatFecha(iso: string | null | undefined) {
  if (!iso) return "";
  const d = new Date(iso);
  return d.toLocaleDateString("es-CO", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

const ICONOS_CONCEPTO: Record<string, string> = {
  Administración: "🏢",
  "Luz ENEL": "💡",
  Acueducto: "💧",
  "Gas Vanti": "🔥",
  "Gas Alcanos": "🔥",
};

export function iconoConcepto(concepto: string) {
  return ICONOS_CONCEPTO[concepto] ?? "📄";
}
