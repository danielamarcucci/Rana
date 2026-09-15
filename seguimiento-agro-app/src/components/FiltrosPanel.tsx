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

function GrupoFiltro({
  titulo,
  acento = "azul",
  children,
}: {
  titulo: string;
  acento?: "azul" | "naranja";
  children: React.ReactNode;
}) {
  return (
    <div
      className={`rounded-lg border bg-white p-3 ${
        acento === "naranja" ? "border-naranja-100" : "border-azul-100"
      }`}
    >
      <p
        className={`mb-2 border-l-2 pl-2 text-xs font-bold uppercase tracking-wide ${
          acento === "naranja" ? "border-naranja-400 text-naranja-700" : "border-azul-400 text-azul-800"
        }`}
      >
        {titulo}
      </p>
      {children}
    </div>
  );
}

export default function FiltrosPanel({ dependencias, value, onChange, mostrarDepartamento = true }: Props) {
  const opciones = opcionesDependencia(dependencias);
  const gruposOpciones = [...new Set(opciones.map((o) => o.grupo))];

  const hayFiltrosActivos =
    value.tipo.length > 0 ||
    value.estado.length > 0 ||
    value.dependenciaId.length > 0 ||
    Boolean(value.departamento) ||
    Boolean(value.q) ||
    Boolean(value.avanceMin) ||
    Boolean(value.avanceMax);

  function toggle(campo: "tipo" | "estado" | "dependenciaId", valor: string) {
    const actual = value[campo];
    const nuevo = actual.includes(valor) ? actual.filter((v) => v !== valor) : [...actual, valor];
    onChange({ ...value, [campo]: nuevo });
  }

  return (
    <div className="rounded-xl border border-azul-200 bg-azul-50/40 shadow-card">
      <div className="flex items-center justify-between border-b border-azul-100 px-4 py-2.5">
        <p className="flex items-center gap-1.5 text-sm font-bold text-azul-900">
          <span aria-hidden>🔎</span> Filtros
        </p>
        {hayFiltrosActivos && (
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
            className="rounded-lg border border-azul-300 bg-white px-3 py-1 text-xs font-semibold text-azul-700 hover:bg-azul-100"
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 lg:grid-cols-4">
        <GrupoFiltro titulo="Tipo">
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
        </GrupoFiltro>

        <GrupoFiltro titulo="Estado" acento="naranja">
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
        </GrupoFiltro>

        <GrupoFiltro titulo="Dependencia / entidad">
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
        </GrupoFiltro>

        <GrupoFiltro titulo={mostrarDepartamento ? "Departamento y búsqueda" : "Buscar por nombre"}>
          <div className="flex flex-col gap-2">
            {mostrarDepartamento && (
              <select
                value={value.departamento}
                onChange={(e) => onChange({ ...value, departamento: e.target.value, municipio: "" })}
                className="w-full rounded-lg border border-azul-200 bg-white px-2 py-1.5 text-sm"
              >
                <option value="">Todos los departamentos</option>
                {colombia.map((d) => (
                  <option key={d.departamento} value={d.departamento}>
                    {d.departamento}
                  </option>
                ))}
              </select>
            )}
            <input
              value={value.q}
              onChange={(e) => onChange({ ...value, q: e.target.value })}
              placeholder="Nombre, descripción, contraparte…"
              className="w-full rounded-lg border border-azul-200 px-2 py-1.5 text-sm"
            />
          </div>
        </GrupoFiltro>
      </div>

      <div className="px-4 pb-4">
        <GrupoFiltro titulo="Nivel de avance (%)">
          <div className="flex items-center gap-2">
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
          </div>
        </GrupoFiltro>
      </div>
    </div>
  );
}
