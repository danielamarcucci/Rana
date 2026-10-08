import { fechaHora } from "@/lib/fechas";

type Entrada = { id: number; accion: string; antes: Record<string, unknown> | null; despues: Record<string, unknown> | null; en: string; usuario: string | null; tabla?: string; registro_id?: string };

const OMITIR = new Set(["actualizado_en", "registrado_en", "ultimo_acceso"]);
const ACCION: Record<string, string> = { insert: "Creación", update: "Modificación", delete: "Eliminación", enlace_restablecimiento: "Enlace de restablecimiento" };

function valor(v: unknown): string {
  if (v === null || v === undefined || v === "") return "—";
  if (typeof v === "boolean") return v ? "sí" : "no";
  return String(v).slice(0, 120);
}

export function cambios(e: Entrada): [string, string, string][] {
  if (e.accion === "insert" && e.despues)
    return Object.entries(e.despues).filter(([k, v]) => !OMITIR.has(k) && v !== null).map(([k, v]) => [k, "", valor(v)]);
  if (e.accion === "delete" && e.antes)
    return Object.entries(e.antes).filter(([k, v]) => !OMITIR.has(k) && v !== null).map(([k, v]) => [k, valor(v), ""]);
  const out: [string, string, string][] = [];
  for (const k of new Set([...Object.keys(e.antes ?? {}), ...Object.keys(e.despues ?? {})])) {
    if (OMITIR.has(k)) continue;
    const a = e.antes?.[k], d = e.despues?.[k];
    if (JSON.stringify(a) !== JSON.stringify(d)) out.push([k, valor(a), valor(d)]);
  }
  return out;
}

export function Historial({ entradas, mostrarTabla = false }: { entradas: Entrada[]; mostrarTabla?: boolean }) {
  if (!entradas.length) return <p className="text-sm text-gris">Sin cambios registrados.</p>;
  return (
    <ol className="space-y-3">
      {entradas.map((e) => {
        const c = cambios(e);
        return (
          <li key={e.id} className="border-l-2 border-linea pl-3 text-sm">
            <p>
              <strong>{ACCION[e.accion] ?? e.accion}</strong>
              {mostrarTabla && e.tabla ? <span className="text-gris"> · {e.tabla} #{e.registro_id}</span> : null}
              <span className="text-gris"> · {fechaHora(e.en)} · {e.usuario ?? "sistema"}</span>
            </p>
            {c.length > 0 && (
              <details className="mt-1">
                <summary className="cursor-pointer text-xs text-ocre-texto">{c.length} campo(s)</summary>
                <table className="mt-1 text-xs">
                  <tbody>
                    {c.map(([k, a, d]) => (
                      <tr key={k}>
                        <td className="pr-3 align-top font-semibold text-gris">{k}</td>
                        <td className="pr-3 align-top">{e.accion === "update" ? <><span className="text-gris line-through">{a}</span> → {d}</> : a || d}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            )}
          </li>
        );
      })}
    </ol>
  );
}
