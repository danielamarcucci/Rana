import Link from "next/link";
import { OPCIONES_PERIODO, type Periodo } from "@/lib/periodo";

export function FiltroPeriodo({ periodo, ruta = "/" }: { periodo: Periodo; ruta?: string }) {
  return (
    <div className="mb-7 flex flex-wrap items-center gap-2 border-b border-linea pb-4">
      <span className="etiqueta mr-1">Periodo</span>
      {OPCIONES_PERIODO.map((o) => (
        <Link
          key={o.clave}
          href={`${ruta}?p=${o.clave}`}
          className={`rounded-full border px-3 py-1 text-[13px] font-semibold no-underline ${
            periodo.clave === o.clave ? "border-olivo bg-olivo text-white" : "border-linea text-gris hover:border-olivo hover:text-olivo"
          }`}
        >
          {o.texto}
        </Link>
      ))}
      <form action={ruta} className="flex flex-wrap items-center gap-2 text-[13px]">
        <input type="hidden" name="p" value="rango" />
        <input type="date" name="desde" defaultValue={periodo.desde} className="entrada w-auto py-1 text-[13px]" aria-label="Desde" />
        <span className="text-gris">a</span>
        <input type="date" name="hasta" defaultValue={periodo.hasta} className="entrada w-auto py-1 text-[13px]" aria-label="Hasta" />
        <button className="btn-secundario px-3 py-1 text-[13px]">Aplicar</button>
      </form>
    </div>
  );
}
