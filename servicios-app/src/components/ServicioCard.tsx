import Link from "next/link";
import EstadoBadge from "./EstadoBadge";
import { iconoConcepto } from "@/lib/format";
import type { ServicioConEstado } from "@/lib/types";

export default function ServicioCard({ servicio }: { servicio: ServicioConEstado }) {
  return (
    <Link
      href={`/servicio/${servicio.id}`}
      className="flex min-h-[76px] items-center gap-4 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card active:scale-[0.99]"
    >
      <span className="text-3xl" aria-hidden>
        {iconoConcepto(servicio.concepto)}
      </span>
      <span className="flex-1">
        <span className="block text-lg font-bold text-neutral-900">{servicio.concepto}</span>
        <span className="block text-sm text-neutral-500">{servicio.detalle}</span>
      </span>
      <EstadoBadge estado={servicio.estado_mes_actual} tamano="sm" />
      <span className="text-2xl text-neutral-300" aria-hidden>
        ›
      </span>
    </Link>
  );
}
