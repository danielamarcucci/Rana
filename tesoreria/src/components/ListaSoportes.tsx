import type { Soporte } from "@/lib/comprobantes";
import { fechaHora } from "@/lib/fechas";

export function ListaSoportes({ soportes, vacio = "Sin soportes." }: { soportes: Soporte[]; vacio?: string }) {
  if (!soportes.length) return <p className="text-sm text-gris">{vacio}</p>;
  return (
    <ul className="space-y-1.5 text-sm">
      {soportes.map((s) => (
        <li key={s.id} className="flex flex-wrap items-baseline gap-x-2">
          <a href={`/api/comprobantes/${s.id}`} target="_blank" rel="noopener" className="font-semibold">
            {s.nombre_archivo}
          </a>
          <span className="text-xs text-gris">
            {s.tipo_mime === "application/pdf" ? "PDF" : s.tipo_mime === "image/png" ? "PNG" : "JPG"} ·{" "}
            {Math.ceil(s.tamano / 1024)} KB · {fechaHora(s.subido_en)}
            {s.datos_personales ? " · con datos personales (solo tesorería)" : " · visible para consulta"}
          </span>
        </li>
      ))}
    </ul>
  );
}
