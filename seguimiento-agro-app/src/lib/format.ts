export function formatoCOP(valor: number): string {
  if (!valor) return "$0";
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(valor);
}

export function formatoCOPCorto(valor: number): string {
  if (!valor) return "$0";
  const abs = Math.abs(valor);
  if (abs >= 1_000_000_000_000) return `$${(valor / 1_000_000_000_000).toFixed(1)} bill.`;
  if (abs >= 1_000_000_000) return `$${(valor / 1_000_000_000).toFixed(1)} mil M`;
  if (abs >= 1_000_000) return `$${(valor / 1_000_000).toFixed(1)} M`;
  return formatoCOP(valor);
}

export function formatoNumero(valor: number): string {
  return new Intl.NumberFormat("es-CO").format(valor);
}

export function formatoFecha(fecha: string | null): string {
  if (!fecha) return "—";
  const d = new Date(fecha);
  if (isNaN(d.getTime())) return fecha;
  return d.toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
}
