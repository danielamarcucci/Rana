import type { EstadoPago } from "@/lib/types";

export default function EstadoBadge({ estado, tamano = "md" }: { estado: EstadoPago; tamano?: "sm" | "md" | "lg" }) {
  const pagado = estado === "pagado";
  const clases = {
    sm: "px-3 py-1 text-sm",
    md: "px-4 py-1.5 text-base",
    lg: "px-6 py-3 text-xl",
  }[tamano];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-bold ${clases} ${
        pagado ? "bg-pagado-100 text-pagado-800" : "bg-pendiente-100 text-pendiente-800"
      }`}
    >
      {pagado ? "✅ Pagado" : "⏳ Pendiente"}
    </span>
  );
}
