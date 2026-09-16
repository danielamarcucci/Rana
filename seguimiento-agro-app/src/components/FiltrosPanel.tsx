"use client";

import { useState } from "react";
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
      className={`flex h-full flex-col rounded-lg border bg-white p-2.5 ${
        acento === "naranja" ? "border-naranja-100" : "border-azul-100"
      }`}
    >
      <p
        className={`mb-1.5 border-l-2 pl-1.5 text-[11px] font-bold uppercase tracking-wide ${
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
  const [buscarDependencia, setBuscarDependencia] = useState("");
  const opciones = opcionesDependencia(dependencias);
  const opcionesFiltradas = buscarDependencia
    ? opciones.filter((o) => o.etiqueta.toLowerCase().includes(buscarDependencia.toLowerCase()))
    : opciones;
  const gruposOpciones = [...new Set(opcionesFiltradas.map((o) => o.grupo))];

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
      <div className="flex items-center justify-between border-b border-azul-100 px-3 py-1.5">
        <p className="flex items-center gap-1.5 text-xs font-bold text-azul-900">
          <span aria-hidden>🔎</span> Filtros
        </p>
        {hayFiltrosActivos && (
          <button
            onClick={() => {
              setBuscarDependencia("");
              onChange({
                tipo: [],
                estado: [],
                dependenciaId: [],
                departamento: mostrarDepartamento ? "" : value.departamento,
                municipio: "",
                q: "",
                avanceMin: "",
                avanceMax: "",
              });
            }}
            className="rounded-md border border-azul-300 bg-white px-2 py-0.5 text-[11px] font-semibold text-azul-700 hover:bg-azul-100"
          >
            ✕ Limpiar filtros
          </button>
        )}
      </div>

      <div className="grid gap-2 p-2.5 md:grid-cols-2 lg:grid-cols-5">
        <GrupoFiltro titulo="Tipo">
          <div className="flex flex-wrap gap-1">
            {TIPOS_ACTUACION.map(([clave, etiqueta]) => (
              <button
                key={clave}
                onClick={() => toggle("tipo", clave)}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
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
          <div className="flex flex-wrap gap-1">
            {ESTADOS.map(([clave, etiqueta]) => (
              <button
                key={clave}
                onClick={() => toggle("estado", clave)}
                className={`rounded-full border px-2 py-0.5 text-[11px] font-medium transition ${
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
          <input
            value={buscarDependencia}
            onChange={(e) => setBuscarDependencia(e.target.value)}
            placeholder="Buscar…"
            className="mb-1 w-full rounded-md border border-azul-200 px-2 py-1 text-xs"
          />
          <select
            multiple
            value={value.dependenciaId}
            onChange={(e) =>
              onChange({ ...value, dependenciaId: Array.from(e.target.selectedOptions).map((o) => o.value) })
            }
            className="h-[4.5rem] w-full flex-1 rounded-md border border-azul-200 bg-white p-1 text-xs"
          >
            {gruposOpciones.map((grupo) => (
              <optgroup key={grupo} label={grupo}>
                {opcionesFiltradas
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
          <div className="flex flex-1 flex-col gap-1.5">
            {mostrarDepartamento && (
              <select
                value={value.departamento}
                onChange={(e) => onChange({ ...value, departamento: e.target.value, municipio: "" })}
                className="w-full rounded-md border border-azul-200 bg-white px-2 py-1 text-xs"
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
              className="w-full rounded-md border border-azul-200 px-2 py-1 text-xs"
            />
          </div>
        </GrupoFiltro>

        <GrupoFiltro titulo="Nivel de avance (%)">
          <div className="flex flex-1 items-center gap-1.5">
            <input
              type="number"
              min={0}
              max={100}
              placeholder="mín"
              value={value.avanceMin}
              onChange={(e) => onChange({ ...value, avanceMin: e.target.value })}
              className="w-full min-w-0 rounded-md border border-azul-200 px-2 py-1 text-xs"
            />
            <span className="text-azul-400">—</span>
            <input
              type="number"
              min={0}
              max={100}
              placeholder="máx"
              value={value.avanceMax}
              onChange={(e) => onChange({ ...value, avanceMax: e.target.value })}
              className="w-full min-w-0 rounded-md border border-azul-200 px-2 py-1 text-xs"
            />
          </div>
        </GrupoFiltro>
      </div>
    </div>
  );
}
