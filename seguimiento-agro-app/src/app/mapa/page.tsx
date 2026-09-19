"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { toPng } from "html-to-image";
import FiltrosPanel from "../../components/FiltrosPanel";
import MapaColombia, { type ValorMapa } from "../../components/MapaColombia";
import { BadgeTipo } from "../../components/Badge";
import { construirQuery, FILTROS_VACIOS, type FiltrosUI } from "../../lib/client/query";
import { formatoCOPCorto, formatoNumero } from "../../lib/format";
import {
  ETIQUETA_ESTADO,
  ETIQUETA_TIPO_ACTUACION,
  type Actuacion,
  type Dependencia,
  type TipoActuacion,
} from "../../lib/types";
import type { AgregadoUbicacion } from "../../lib/actuaciones";

// Plural de cada tipo, para armar frases como "6 líneas de acción" en vez
// de mostrar el conteo bajo la palabra genérica "actuaciones" (que a
// usuarios sin perfil técnico les resultaba confusa).
const ETIQUETA_TIPO_PLURAL: Record<TipoActuacion, string> = {
  plan: "planes",
  programa: "programas",
  convenio: "convenios",
  linea: "líneas de acción",
};

function resumenPorTipo(lista: Actuacion[]): string {
  if (lista.length === 0) return "Sin registros";
  const conteo = new Map<TipoActuacion, number>();
  for (const a of lista) conteo.set(a.tipo, (conteo.get(a.tipo) ?? 0) + 1);
  return Array.from(conteo.entries())
    .sort((a, b) => b[1] - a[1])
    .map(([tipo, n]) =>
      n === 1 ? `1 ${ETIQUETA_TIPO_ACTUACION[tipo].toLowerCase()}` : `${n} ${ETIQUETA_TIPO_PLURAL[tipo]}`
    )
    .join(" · ");
}

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
  const [actuacionesLista, setActuacionesLista] = useState<Actuacion[]>([]);
  const [metrica, setMetrica] = useState<(typeof METRICAS)[number]["clave"]>("totalActuaciones");
  const [cargando, setCargando] = useState(true);
  const [descargando, setDescargando] = useState(false);
  const fichaRef = useRef<HTMLDivElement>(null);

  // El departamento y el municipio seleccionados viven dentro de `filtros`
  // (no en estado aparte), así el mismo valor alimenta el mapa, el filtro
  // del panel de arriba y las fichas de municipio: se puede elegir un
  // departamento haciendo clic en el mapa o desde el filtro, y ambos
  // quedan sincronizados.
  const departamento = filtros.departamento || null;
  const municipio = filtros.municipio || null;

  function seleccionarDepartamento(dep: string | null) {
    setFiltros((f) => ({ ...f, departamento: dep ?? "", municipio: "" }));
  }

  function seleccionarMunicipio(m: string | null) {
    setFiltros((f) => ({ ...f, municipio: m ?? "" }));
  }

  function normalizarNombreArchivo(texto: string): string {
    const sinTildes = texto.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return sinTildes.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  }

  async function descargarFicha() {
    if (!fichaRef.current || !departamento) return;
    setDescargando(true);
    try {
      const dataUrl = await toPng(fichaRef.current, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (nodo) => !(nodo instanceof HTMLElement && nodo.dataset.fichaIgnorar === "true"),
      });
      const nombreArchivo = normalizarNombreArchivo(
        `ficha-${departamento}${municipio ? "-" + municipio : ""}`
      );
      const link = document.createElement("a");
      link.download = `${nombreArchivo}.png`;
      link.href = dataUrl;
      link.click();
    } catch (error) {
      console.error("No se pudo generar la ficha para descargar", error);
    } finally {
      setDescargando(false);
    }
  }

  useEffect(() => {
    fetch("/api/dependencias")
      .then((r) => r.json())
      .then((d) => setDependencias(d.dependencias ?? []));
  }, []);

  useEffect(() => {
    setCargando(true);
    const params = new URLSearchParams(construirQuery(filtros));
    fetch(`/api/mapa?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => {
        setPorDepartamento(d.porDepartamento ?? []);
        setPorMunicipio(d.porMunicipio ?? []);
      })
      .finally(() => setCargando(false));
  }, [filtros]);

  useEffect(() => {
    if (!departamento) {
      setActuacionesLista([]);
      return;
    }
    const params = new URLSearchParams(construirQuery(filtros));
    fetch(`/api/actuaciones?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setActuacionesLista(d.actuaciones ?? []));
  }, [filtros, departamento]);

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

      <FiltrosPanel dependencias={dependencias} value={filtros} onChange={setFiltros} />

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

      <div ref={fichaRef} className="grid items-start gap-3 lg:grid-cols-[1.4fr_1fr]">
        <div className="rounded-xl border border-azul-100 bg-white p-3 shadow-card">
          <MapaColombia
            valores={valoresMapa}
            seleccionado={departamento}
            onSeleccionar={seleccionarDepartamento}
            formatoValor={metricaInfo.formato}
          />
          <p className="mt-2 text-center text-xs text-slate-400">
            Clic en un departamento para ver su detalle. Vuelva a hacer clic para deseleccionar.
          </p>
        </div>

        <div className="space-y-3">
          {!departamento && (
            <div className="rounded-xl border border-azul-100 bg-white p-6 text-center text-sm text-slate-400 shadow-card">
              Seleccione un departamento en el mapa (o en el filtro de arriba) para ver su información detallada.
            </div>
          )}

          {departamento && (
            <div className="overflow-hidden rounded-xl border border-azul-200 bg-white shadow-card">
              <div className="flex items-center justify-between gap-2 bg-azul-900 px-4 py-2.5">
                <div className="leading-tight">
                  <h2 className="text-base font-bold text-white">{departamento}</h2>
                  {municipio && <p className="text-xs text-azul-200">{municipio}</p>}
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={descargarFicha}
                    disabled={descargando}
                    data-ficha-ignorar="true"
                    title="Descargar ficha"
                    className="rounded-md border border-azul-700 bg-azul-800 px-2 py-0.5 text-xs text-white hover:bg-azul-700 disabled:opacity-60"
                  >
                    {descargando ? "Generando…" : "⬇"}
                  </button>
                  <button
                    onClick={() => seleccionarDepartamento(null)}
                    data-ficha-ignorar="true"
                    title="Cerrar"
                    className="rounded-md border border-azul-700 px-2 py-0.5 text-xs text-azul-100 hover:bg-azul-800"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="p-3">
              {resumenDepartamento ? (
                <div className="divide-y divide-azul-100 text-sm">
                  <FilaFicha etiqueta="Actuaciones" valor={resumenPorTipo(actuacionesLista)} destacado />
                  <FilaFicha etiqueta="Avance promedio" valor={`${resumenDepartamento.avancePromedio}%`} />
                  <FilaFicha
                    etiqueta="Destinado / ejecutado"
                    valor={`${formatoCOPCorto(resumenDepartamento.recursosDestinados)} / ${formatoCOPCorto(resumenDepartamento.recursosEjecutados)}`}
                  />
                  <FilaFicha
                    etiqueta="Beneficiarios"
                    valor={`${formatoNumero(resumenDepartamento.beneficiariosTotal)} (${formatoNumero(resumenDepartamento.beneficiariosMujeres)} mujeres · ${formatoNumero(resumenDepartamento.beneficiariosJovenes)} jóvenes)`}
                  />
                </div>
              ) : (
                <p className="text-sm text-slate-400">Sin actuaciones registradas con estos filtros.</p>
              )}

              {actuacionesLista.length > 0 && (
                <div className="mt-2.5 max-h-72 divide-y divide-azul-50 overflow-y-auto border-t border-azul-100">
                  {actuacionesLista.map((a) => (
                    <Link
                      key={a.id}
                      href={`/actuaciones/${a.id}`}
                      className="-mx-1 flex items-center gap-2 rounded px-1 py-1.5 hover:bg-azul-50/60"
                    >
                      <BadgeTipo tipo={a.tipo} etiqueta={ETIQUETA_TIPO_ACTUACION[a.tipo]} />
                      <span className="flex-1 truncate text-xs font-medium text-azul-900">{a.nombre}</span>
                      <span className="shrink-0 text-[11px] text-slate-500">{a.nivelAvance}%</span>
                    </Link>
                  ))}
                </div>
              )}

              {porMunicipio.length > 0 && (
                <div className="mt-2.5 rounded-lg border border-azul-100 bg-azul-50/40 p-2.5">
                  <p className="mb-1.5 border-l-2 border-azul-400 pl-2 text-[11px] font-bold uppercase tracking-wide text-azul-800">
                    Municipios
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    <button
                      onClick={() => seleccionarMunicipio(null)}
                      className={`rounded-full border px-2.5 py-1 text-xs ${!municipio ? "border-naranja-500 bg-naranja-500 text-white" : "border-azul-200 text-azul-700"}`}
                    >
                      Todos
                    </button>
                    {porMunicipio
                      .filter((m) => m.municipio)
                      .map((m) => (
                        <button
                          key={m.municipio}
                          onClick={() => seleccionarMunicipio(m.municipio)}
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
        </div>
      </div>
    </div>
  );
}

function FilaFicha({
  etiqueta,
  valor,
  destacado = false,
}: {
  etiqueta: string;
  valor: string;
  destacado?: boolean;
}) {
  return (
    <div className="flex items-baseline justify-between gap-3 py-1.5 first:pt-0 last:pb-0">
      <p className="shrink-0 text-[11px] uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p
        className={`text-right ${
          destacado ? "text-[15px] font-bold text-azul-900" : "text-sm font-semibold text-azul-800"
        }`}
      >
        {valor}
      </p>
    </div>
  );
}
