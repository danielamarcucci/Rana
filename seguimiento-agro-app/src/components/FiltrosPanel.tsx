"use client";

import type { Dependencia } from "../lib/types";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ACTUACION } from "../lib/types";
import { opcionesDependencia } from "../lib/client/dependencias";
import type { FiltrosUI } from "../lib/client/query";
import colombia from "../data/colombia.json";

const TIPOS_ACTUACION = Object.entries(ETIQUETA_TIPO_ACTUACION);
const ESTADOS = Object.entries(ETIQUETA_ESTADO);

interface Props {
  dependencias: Dependencia[];
  value: FiltrosUI;
  onChange: (v: FiltrosUI) => void;
  mostrarDepartamento?: boolean;
}

export default function FiltrosPanel({ dependencias, value, onChange, mostrarDepartamento = true }: Props) {
  const opciones = opcionesDependencia(dependencias);
  const gruposOpciones = [...new Set(opciones.map((o) => o.grupo))];

  function toggle(campo: "tipo" | "estado" | "dependenciaId", valor: string) {
    const actual = value[campo];
    const nuevo = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor];
    onChange({ ...value, [campo]: nuevo });
  }

  return (
    <div className="rounded-xl border border-azul-100 bg-white p-4 shadow-card">
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-azul-700">Tipo</p>
          <div className="flex flex-wrap gap-1.5">
            {TIPOS_ACTUACION.map(([clave, etiqueta]) => (
              <button
                key={clave}
                onClick={() => toggle("tipo", clave)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  value.tipo.includes(clave)
                    ? "border-azul-600 bg-azul-600 text-white"
                    : "border-azul-200 text-azul-700 hover:bg-azul-50"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-azul-700">Estado</p>
          <div className="flex flex-wrap gap-1.5">
            {ESTADOS.map(([clave, etiqueta]) => (
              <button
                key={clave}
                onClick={() => toggle("estado", clave)}
                className={`rounded-full border px-2.5 py-1 text-xs font-medium transition ${
                  value.estado.includes(clave)
                    ? "border-naranja-500 bg-naranja-500 text-white"
                    : "border-naranja-200 text-naranja-700 hover:bg-naranja-50"
                }`}
              >
                {etiqueta}
              </button>
            ))}
          </div>
        </div>

        <div>
          <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-azul-700">
            Dependencia / entidad
          </label>
          <select
            multiple
            value={value.dependenciaId}
            onChange={(e) =>
              onChange({ ...value, dependenciaId: Array.from(e.target.selectedOptions).map((o) => o.value) })
            }
            className="h-24 w-full rounded-lg border border-azul-200 bg-white p-1 text-sm"
          >
            {gruposOpciones.map((grupo) => (
              <optgroup key={grupo} label={grupo}>
                {opciones
                  .filter((o) => o.grupo === grupo)
                  .map((o) => (
                    <option key={o.id} value={o.id}>
                      {o.etiqueta}
                    </option>
                  ))}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="flex flex-col gap-2">
          {mostrarDepartamento && (
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-azul-700">
                Departamento
              </label>
              <select
                value={value.departamento}
                onChange={(e) => onChange({ ...value, departamento: e.target.value, municipio: "" })}
                className="w-full rounded-lg border border-azul-200 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Todos</option>
                {colombia.map((d) => (
                  <option key={d.departamento} value={d.departamento}>
                    {d.departamento}
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wide text-azul-700">
              Buscar por nombre
            </label>
            <input
              value={value.q}
              onChange={(e) => onChange({ ...value, q: e.target.value })}
              placeholder="Nombre, descripción, contraparte…"
              className="w-full rounded-lg border border-azul-200 px-2 py-1.5 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-3">
        <p className="text-xs font-semibold uppercase tracking-wide text-azul-700">Avance %</p>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="mín"
          value={value.avanceMin}
          onChange={(e) => onChange({ ...value, avanceMin: e.target.value })}
          className="w-20 rounded-lg border border-azul-200 px-2 py-1 text-sm"
        />
        <span className="text-azul-400">—</span>
        <input
          type="number"
          min={0}
          max={100}
          placeholder="máx"
          value={value.avanceMax}
          onChange={(e) => onChange({ ...value, avanceMax: e.target.value })}
          className="w-20 rounded-lg border border-azul-200 px-2 py-1 text-sm"
        />
        <button
          onClick={() =>
            onChange({
              tipo: [],
              estado: [],
              dependenciaId: [],
              departamento: mostrarDepartamento ? "" : value.departamento,
              municipio: "",
              q: "",
              avanceMin: "",
              avanceMax: "",
            })
          }
          className="ml-auto rounded-lg border border-azul-200 px-3 py-1.5 text-sm font-medium text-azul-700 hover:bg-azul-50"
        >
          Limpiar filtros
        </button>
      </div>
    </div>
  );
}
