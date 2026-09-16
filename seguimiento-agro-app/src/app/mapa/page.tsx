"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import FiltrosPanel from "../../components/FiltrosPanel";
import MapaColombia, { type ValorMapa } from "../../components/MapaColombia";
import ProgressBar from "../../components/ProgressBar";
import { BadgeEstado, BadgeTipo } from "../../components/Badge";
import { construirQuery, FILTROS_VACIOS, type FiltrosUI } from "../../lib/client/query";
import { formatoCOPCorto, formatoNumero } from "../../lib/format";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ACTUACION, type Actuacion, type Dependencia } from "../../lib/types";
import type { AgregadoUbicacion } from "../../lib/actuaciones";

const METRICAS = [
  { clave: "totalActuaciones", etiqueta: "N.º de actuaciones", formato: (v: number) => `${v} actuación(es)` },
  { clave: "avancePromedio", etiqueta: "Avance promedio (%)", formato: (v: number) => `${v}% de avance` },
  {
    clave: "recursosEjecutados",
    etiqueta: "Recursos ejecutados",
    formato: (v: number) => formatoCOPCorto(v),
  },
] as const;

export default function MapaPage() {
  const [filtros, setFiltros] = useState<FiltrosUI>(FILTROS_VACIOS);
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [porDepartamento, setPorDepartamento] = useState<AgregadoUbicacion[]>([]);
  const [porMunicipio, setPorMunicipio] = useState<AgregadoUbicacion[]>([]);
  const [departamento, setDepartamento] = useState<string | null>(null);
  const [municipio, setMunicipio] = useState<string | null>(null);
  const [actuacionesLista, setActuacionesLista] = useState<Actuacion[]>([]);
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]["clave"]>("totalActuaciones");
  const [cargando, setCargando] = useState(true);

  useEffect(() => {
    fetch("/api/dependencias")
      .then((r) => r.json())
      .then((d) => setDependencias(d.dependencias ?? []));
  }, []);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams(construirQuery(filtros));
    if (departamento) params.set("departamento", departamento);
    fetch(`/api/mapa?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setPorDepartamento(d.porDepartamento ?? []);
        setPorMunicipio(d.porMunicipio ?? []);
      })
      .finally(() => setCargando(false));
  }, [filtros, departamento]);

  useEffect(() => {
    if (!departamento) {
      setActuacionesLista([]);
      return;
    }
    const params = new URLSearchParams(construirQuery(filtros));
    params.set("departamento", departamento);
    if (municipio) params.set("municipio", municipio);
    fetch(`/api/actuaciones?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setActuacionesLista(d.actuaciones ?? []));
  }, [filtros, departamento, municipio]);

  useEffect(() => setMunicipio(null), [departamento]);

  const valoresMapa = useMemo(() => {
    const mapa: Record<string, ValorMapa> = {};
    for (const item of porDepartamento) {
      mapa[item.departamento] = { valor: item[metrica], total: item.totalActuaciones };
    }
    return mapa;
  }, [porDepartamento, metrica]);

  const metricaInfo = METRICAS.find((m) => m.clave === metrica)!;
  const resumenDepartamento = porDepartamento.find((d) => d.departamento === departamento);

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold text-azul-900">Mapa por departamento</h1>
        <p className="text-xs text-slate-600">
          Seleccione un departamento para ver el detalle de actuaciones, municipios y beneficiarios.
        </p>
      </div>

      <FiltrosPanel dependencias={dependencias} value={filtros} onChange={setFiltros} mostrarDepartamento={false} />

      <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-azul-100 bg-white px-3 py-1.5 shadow-card">
        <p className="border-l-2 border-azul-400 pl-2 text-[11px] font-bold uppercase tracking-wide text-azul-800">
          Colorear mapa por
        </p>
        {METRICAS.map((m) => (
          <button
            key={m.clave}
            onClick={() => setMetrica(m.clave)}
            className={`rounded-full border px-2.5 py-0.5 text-[11px] font-medium transition ${
              metrica === m.clave
                ? "border-azul-600 bg-azul-600 text-white"
                : "border-azul-200 text-azul-700 hover:bg-azul-50"
            }`}
          >
            {m.etiqueta}
          </button>
        ))}
        {cargando && <span className="ml-auto text-xs text-slate-400">Actualizando…</span>}
      </div>

      <div className="grid gap-3 lg:grid-cols-[1.3fr_1fr]">
        <div className="rounded-xl border border-azul-100 bg-white p-3 shadow-card">
          <MapaColombia
            valores={valoresMapa}
            seleccionado={departamento}
            onSeleccionar={setDepartamento}
            formatoValor={metricaInfo.formato}
          />
          <p className="mt-2 text-center text-xs text-slate-400">
            Clic en un departamento para ver su detalle. Vuelva a hacer clic para deseleccionar.
          </p>
        </div>

        <div className="space-y-3">
          {!departamento && (
            <div className="rounded-xl border border-azul-100 bg-white p-6 text-center text-sm text-slate-400 shadow-card">
              Seleccione un departamento en el mapa para ver su información detallada.
            </div>
          )}

          {departamento && (
            <div className="overflow-hidden rounded-xl border border-azul-200 bg-white shadow-card">
              <div className="flex items-center justify-between bg-azul-900 px-4 py-2.5">
                <h2 className="text-lg font-bold text-white">{departamento}</h2>
                <button
                  onClick={() => setDepartamento(null)}
                  className="rounded-md border border-azul-700 px-2 py-0.5 text-xs text-azul-100 hover:bg-azul-800"
                >
                  ✕ cerrar
                </button>
              </div>
              <div className="p-4">
              {resumenDepartamento ? (
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <Resumen etiqueta="Actuaciones" valor={formatoNumero(resumenDepartamento.totalActuaciones)} />
                  <Resumen etiqueta="Avance promedio" valor={`${resumenDepartamento.avancePromedio}%`} />
                  <Resumen etiqueta="Destinado" valor={formatoCOPCorto(resumenDepartamento.recursosDestinados)} />
                  <Resumen etiqueta="Ejecutado" valor={formatoCOPCorto(resumenDepartamento.recursosEjecutados)} />
                  <Resumen etiqueta="Beneficiarios" valor={formatoNumero(resumenDepartamento.beneficiariosTotal)} />
                  <Resumen etiqueta="Mujeres / jóvenes" valor={`${formatoNumero(resumenDepartamento.beneficiariosMujeres)} / ${formatoNumero(resumenDepartamento.beneficiariosJovenes)}`} />
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin actuaciones registradas con estos filtros.</p>
              )}

              {porMunicipio.length > 0 && (
                <div className="mt-3 rounded-lg border border-azul-100 bg-azul-50/40 p-3">
                  <p className="mb-1.5 border-l-2 border-azul-400 pl-2 text-xs font-bold uppercase tracking-wide text-azul-800">
                    Municipios con actuaciones
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => setMunicipio(null)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${!municipio ? "border-naranja-500 bg-naranja-500 text-white" : "border-azul-200 text-azul-700"}`}
                    >
                      Todos
                    </button>
                    {porMunicipio
                      .filter((m) => m.municipio)
                      .map((m) => (
                        <button
                          key={m.municipio}
                          onClick={() => setMunicipio(m.municipio)}
                          className={`rounded-full border px-2.5 py-1 text-xs ${
                            municipio === m.municipio
                              ? "border-naranja-500 bg-naranja-500 text-white"
                              : "border-azul-200 text-azul-700"
                          }`}
                        >
                          {m.municipio} ({m.totalActuaciones})
                        </button>
                      ))}
                  </div>
                </div>
              )}
              </div>
            </div>
          )}

          {departamento && actuacionesLista.length > 0 && (
            <div className="max-h-[520px] space-y-2 overflow-y-auto scrollbar-fina">
              {actuacionesLista.map((a) => (
                <Link
                  key={a.id}
                  href={`/actuaciones/${a.id}`}
                  className="block rounded-xl border border-azul-100 bg-white p-3 shadow-card hover:border-azul-300"
                >
                  <div className="mb-1 flex items-center gap-2">
                    <BadgeTipo tipo={a.tipo} etiqueta={ETIQUETA_TIPO_ACTUACION[a.tipo]} />
                    <BadgeEstado estado={a.estado} etiqueta={ETIQUETA_ESTADO[a.estado]} />
                  </div>
                  <p className="text-sm font-medium text-azul-900">{a.nombre}</p>
                  <p className="mb-1 text-xs text-slate-500">{a.dependenciaNombre}</p>
                  <ProgressBar valor={a.nivelAvance} tamano="sm" />
                </Link>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function Resumen({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-lg bg-azul-50 px-2.5 py-1.5">
      <p className="text-[10px] uppercase tracking-wide text-azul-600">{etiqueta}</p>
      <p className="font-semibold text-azul-900">{valor}</p>
    </div>
  );
}
