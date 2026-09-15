"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FiltrosPanel from "../components/FiltrosPanel";
import StatCard from "../components/StatCard";
import ProgressBar from "../components/ProgressBar";
import { BadgeEstado, BadgeTipo } from "../components/Badge";
import { construirQuery, FILTROS_VACIOS, type FiltrosUI } from "../lib/client/query";
import { formatoCOPCorto, formatoNumero } from "../lib/format";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ACTUACION, type Actuacion, type Dependencia } from "../lib/types";

export default function TableroPage() {
  const [filtros, setFiltros] = useState<FiltrosUI>(FILTROS_VACIOS);
  const [actuaciones, setActuaciones] = useState<Actuacion[]>([]);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/dependencias")
      .then((r) => r.json())
      .then((d) => setDependencias(d.dependencias ?? []));
  }, []);

  useEffect(() => {
    setCargando(true);
    const query = construirQuery(filtros);
    fetch(`/api/actuaciones${query ? `?${query}` : ""}`)
      .then((r) => r.json())
      .then((d) => setActuaciones(d.actuaciones ?? []))
      .finally(() => setCargando(false));
  }, [filtros]);

  const kpis = useMemo(() => {
    const total = actuaciones.length;
    const recursosDestinados = actuaciones.reduce((s, a) => s + a.recursosDestinados, 0);
    const recursosEjecutados = actuaciones.reduce((s, a) => s + a.recursosEjecutados, 0);
    const beneficiariosTotal = actuaciones.reduce((s, a) => s + a.beneficiariosTotal, 0);
    const beneficiariasMujeres = actuaciones.reduce((s, a) => s + a.beneficiariosMujeres, 0);
    const beneficiariosJovenes = actuaciones.reduce((s, a) => s + a.beneficiariosJovenes, 0);
    const avancePromedio = total ? Math.round(actuaciones.reduce((s, a) => s + a.nivelAvance, 0) / total) : 0;
    const ejecucionPct = recursosDestinados > 0 ? Math.round((recursosEjecutados / recursosDestinados) * 1000) / 10 : 0;
    return {
      total,
      recursosDestinados,
      recursosEjecutados,
      beneficiariosTotal,
      beneficiariasMujeres,
      beneficiariosJovenes,
      avancePromedio,
      ejecucionPct,
    };
  }, [actuaciones]);

  const query = construirQuery(filtros);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-azul-900">Tablero de control</h1>
          <p className="text-sm text-slate-600">
            Planes, programas, convenios y líneas de acción del sector agricultura — avances y metas.
          </p>
        </div>
        <a
          href={`/api/export/excel${query ? `?${query}` : ""}`}
          className="rounded-lg bg-naranja-500 px-4 py-2 text-sm font-semibold text-white shadow-card hover:bg-naranja-600"
        >
          ⬇ Descargar Excel
        </a>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 lg:grid-cols-7">
        <StatCard etiqueta="Actuaciones" valor={formatoNumero(kpis.total)} />
        <StatCard etiqueta="Avance promedio" valor={`${kpis.avancePromedio}%`} acento="naranja" />
        <StatCard etiqueta="Recursos destinados" valor={formatoCOPCorto(kpis.recursosDestinados)} />
        <StatCard
          etiqueta="Recursos ejecutados"
          valor={formatoCOPCorto(kpis.recursosEjecutados)}
          detalle={`${kpis.ejecucionPct}% de lo destinado`}
          acento="naranja"
        />
        <StatCard etiqueta="Beneficiarios totales" valor={formatoNumero(kpis.beneficiariosTotal)} />
        <StatCard etiqueta="Mujeres beneficiarias" valor={formatoNumero(kpis.beneficiariasMujeres)} />
        <StatCard etiqueta="Jóvenes beneficiarios" valor={formatoNumero(kpis.beneficiariosJovenes)} />
      </div>

      <FiltrosPanel dependencias={dependencias} value={filtros} onChange={setFiltros} />

      <div className="overflow-hidden rounded-xl border border-azul-100 bg-white shadow-card">
        <div className="scrollbar-fina overflow-x-auto">
          <table className="w-full min-w-[1100px] text-sm">
            <thead className="bg-azul-50 text-left text-xs font-semibold uppercase tracking-wide text-azul-800">
              <tr>
                <th className="px-3 py-2">Nombre</th>
                <th className="px-3 py-2">Tipo</th>
                <th className="px-3 py-2">Dependencia / entidad</th>
                <th className="px-3 py-2">Ubicación</th>
                <th className="px-3 py-2">Estado</th>
                <th className="px-3 py-2">Avance</th>
                <th className="px-3 py-2 text-right">Destinado</th>
                <th className="px-3 py-2 text-right">Ejecutado</th>
                <th className="px-3 py-2 text-right">Beneficiarios</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-azul-50">
              {cargando && (
                <tr>
                  <td colSpan={9} className="px-3 py-6 text-center text-slate-400">
                    Cargando…
                  </td>
                </tr>
              )}
              {!cargando && actuaciones.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-3 py-8 text-center text-slate-400">
                    No hay actuaciones que coincidan con los filtros.
                  </td>
                </tr>
              )}
              {actuaciones.map((a) => (
                <tr key={a.id} className="hover:bg-azul-50/50">
                  <td className="px-3 py-2.5">
                    <Link href={`/actuaciones/${a.id}`} className="font-medium text-azul-800 hover:underline">
                      {a.nombre}
                    </Link>
                  </td>
                  <td className="px-3 py-2.5">
                    <BadgeTipo tipo={a.tipo} etiqueta={ETIQUETA_TIPO_ACTUACION[a.tipo]} />
                  </td>
                  <td className="px-3 py-2.5 text-slate-700">{a.dependenciaNombre}</td>
                  <td className="px-3 py-2.5 text-slate-700">
                    {[...new Set(a.ubicaciones.map((u) => u.departamento))].join(", ") || "—"}
                  </td>
                  <td className="px-3 py-2.5">
                    <BadgeEstado estado={a.estado} etiqueta={ETIQUETA_ESTADO[a.estado]} />
                  </td>
                  <td className="w-40 px-3 py-2.5">
                    <ProgressBar valor={a.nivelAvance} tamano="sm" />
                  </td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{formatoCOPCorto(a.recursosDestinados)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">{formatoCOPCorto(a.recursosEjecutados)}</td>
                  <td className="px-3 py-2.5 text-right text-slate-700">
                    {formatoNumero(a.beneficiariosTotal)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
