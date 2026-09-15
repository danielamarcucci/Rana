"use client";

import { useState } from "react";
import colombia from "../data/colombia.json";
import type { Ubicacion } from "../lib/types";

function agrupar(ubicaciones: Ubicacion[]): Record<string, string[]> {
  const grupos: Record<string, string[]> = {};
  for (const u of ubicaciones) {
    if (!grupos[u.departamento]) grupos[u.departamento] = [];
    if (u.municipio) grupos[u.departamento].push(u.municipio);
  }
  return grupos;
}

export default function UbicacionesPicker({
  value,
  onChange,
}: {
  value: Ubicacion[];
  onChange: (u: Ubicacion[]) => void;
}) {
  const grupos = agrupar(value);
  const departamentosAgregados = Object.keys(grupos);
  const [seleccionNueva, setSeleccionNueva] = useState("");

  function emitir(nuevosGrupos: Record<string, string[]>) {
    const ubicaciones: Ubicacion[] = [];
    for (const [departamento, municipios] of Object.entries(nuevosGrupos)) {
      if (municipios.length === 0) {
        ubicaciones.push({ departamento, municipio: null });
      } else {
        for (const municipio of municipios) ubicaciones.push({ departamento, municipio });
      }
    }
    onChange(ubicaciones);
  }

  function agregarDepartamento() {
    if (!seleccionNueva || grupos[seleccionNueva]) return;
    emitir({ ...grupos, [seleccionNueva]: [] });
    setSeleccionNueva("");
  }

  function quitarDepartamento(dep: string) {
    const copia = { ...grupos };
    delete copia[dep];
    emitir(copia);
  }

  function toggleMunicipio(dep: string, municipio: string) {
    const actuales = grupos[dep] ?? [];
    const nuevos = actuales.includes(municipio)
      ? actuales.filter((m) => m !== municipio)
      : [...actuales, municipio];
    emitir({ ...grupos, [dep]: nuevos });
  }

  const disponibles = colombia.filter((d) => !departamentosAgregados.includes(d.departamento));

  return (
    <div className="space-y-3">
      <div className="flex gap-2">
        <select
          value={seleccionNueva}
          onChange={(e) => setSeleccionNueva(e.target.value)}
          className="flex-1 rounded-lg border border-azul-200 px-2 py-1.5 text-sm"
        >
          <option value="">Seleccione un departamento para agregar…</option>
          {disponibles.map((d) => (
            <option key={d.departamento} value={d.departamento}>
              {d.departamento}
            </option>
          ))}
        </select>
        <button
          type="button"
          onClick={agregarDepartamento}
          disabled={!seleccionNueva}
          className="rounded-lg bg-azul-600 px-3 py-1.5 text-sm font-medium text-white hover:bg-azul-700 disabled:opacity-50"
        >
          + Agregar
        </button>
      </div>

      {departamentosAgregados.length === 0 && (
        <p className="text-sm text-slate-400">Aún no ha agregado departamentos.</p>
      )}

      <div className="space-y-2">
        {departamentosAgregados.map((dep) => {
          const info = colombia.find((c) => c.departamento === dep);
          const seleccionados = grupos[dep];
          return (
            <div key={dep} className="rounded-lg border border-azul-100 bg-azul-50/40 p-3">
              <div className="mb-2 flex items-center justify-between">
                <p className="font-semibold text-azul-900">
                  {dep}{" "}
                  <span className="ml-1 text-xs font-normal text-slate-500">
                    {seleccionados.length === 0
                      ? "· todo el departamento"
                      : `· ${seleccionados.length} municipio(s) seleccionado(s)`}
                  </span>
                </p>
                <button
                  type="button"
                  onClick={() => quitarDepartamento(dep)}
                  className="text-xs font-medium text-red-600 hover:underline"
                >
                  Quitar
                </button>
              </div>
              <details>
                <summary className="cursor-pointer text-xs font-medium text-azul-700">
                  Elegir municipios específicos (opcional — si no elige ninguno, aplica a todo el departamento)
                </summary>
                <div className="mt-2 flex max-h-40 flex-wrap gap-1.5 overflow-y-auto scrollbar-fina">
                  {info?.municipios.map((m) => (
                    <button
                      key={m}
                      type="button"
                      onClick={() => toggleMunicipio(dep, m)}
                      className={`rounded-full border px-2 py-0.5 text-xs transition ${
                        seleccionados.includes(m)
                          ? "border-azul-600 bg-azul-600 text-white"
                          : "border-azul-200 bg-white text-azul-700 hover:bg-azul-50"
                      }`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </details>
            </div>
          );
        })}
      </div>
    </div>
  );
}
