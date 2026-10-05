import { ESTADOS_DEBATE, type EstadoDebate } from "@/lib/types";

const COLORES: Record<EstadoDebate, string> = {
  borrador: "bg-neutral-100 text-neutral-700",
  proposicion_radicada: "bg-sky-100 text-sky-800",
  aprobada: "bg-indigo-100 text-indigo-800",
  cuestionario_enviado: "bg-violet-100 text-violet-800",
  respuestas_recibidas: "bg-amber-100 text-amber-800",
  realizado: "bg-emerald-100 text-emerald-800",
  archivado: "bg-neutral-200 text-neutral-500",
};

export default function EstadoBadge({ estado }: { estado: EstadoDebate }) {
  const etiqueta = ESTADOS_DEBATE.find((e) => e.valor === estado)?.etiqueta ?? estado;
  return (
    <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-0.5 text-xs font-semibold ${COLORES[estado]}`}>
      {etiqueta}
    </span>
  );
}
