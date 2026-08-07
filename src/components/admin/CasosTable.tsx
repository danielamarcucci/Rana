"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import type { Caso } from "@/lib/types";
import { CANAL_RECEPCION, ESTADO_CASO, MEDIO_MANUAL, labelDe } from "@/lib/catalogos";

const ESTADO_COLOR: Record<string, string> = {
  recibido: "bg-cielo-100 text-cielo-800",
  en_verificacion: "bg-tierra-200 text-tierra-800",
  corroborado: "bg-hoja-100 text-hoja-800",
  en_ruta_juridica: "bg-alerta-100 text-alerta-800",
  cerrado: "bg-tierra-100 text-tierra-500",
};

function fechaCorta(iso: string) {
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "short", day: "2-digit" });
}

function resumenCuando(c: Caso) {
  const d = c.data;
  if (!d.cuandoDia && !d.cuandoMes && !d.cuandoAnio) return "—";
  return `${d.cuandoDia ?? "?"} ${d.cuandoMes ?? ""} ${d.cuandoAnio ?? ""}`.trim();
}

export function CasosTable({ casosIniciales }: { casosIniciales: Caso[] }) {
  const [casos, setCasos] = useState(casosIniciales);
  const [busqueda, setBusqueda] = useState("");
  const [filtroEstado, setFiltroEstado] = useState("");
  const [filtroCanal, setFiltroCanal] = useState("");
  const [guardando, setGuardando] = useState<string | null>(null);

  const filtrados = useMemo(() => {
    const q = busqueda.trim().toLowerCase();
    return casos.filter((c) => {
      if (filtroEstado && c.estado !== filtroEstado) return false;
      if (filtroCanal && c.canalRecepcion !== filtroCanal) return false;
      if (!q) return true;
      const texto = `${c.radicado} ${c.data.nombre ?? ""} ${c.data.apellido ?? ""} ${c.data.departamento ?? ""} ${c.data.municipio ?? ""} ${c.data.quePasoNarracion ?? ""}`.toLowerCase();
      return texto.includes(q);
    });
  }, [casos, busqueda, filtroEstado, filtroCanal]);

  async function cambiarEstado(radicado: string, estado: string) {
    setGuardando(radicado);
    setCasos((prev) => prev.map((c) => (c.radicado === radicado ? { ...c, estado: estado as Caso["estado"] } : c)));
    try {
      await fetch(`/api/admin/casos/${encodeURIComponent(radicado)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ estado }),
      });
    } finally {
      setGuardando(null);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-end">
        <div className="flex-1 min-w-[200px]">
          <label className="field-label">Buscar</label>
          <input
            className="input"
            placeholder="Radicado, nombre, municipio, hechos…"
            value={busqueda}
            onChange={(e) => setBusqueda(e.target.value)}
          />
        </div>
        <div>
          <label className="field-label">Estado</label>
          <select className="select" value={filtroEstado} onChange={(e) => setFiltroEstado(e.target.value)}>
            <option value="">Todos</option>
            {ESTADO_CASO.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="field-label">Canal</label>
          <select className="select" value={filtroCanal} onChange={(e) => setFiltroCanal(e.target.value)}>
            <option value="">Todos</option>
            {CANAL_RECEPCION.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </div>
        <p className="text-sm text-tierra-500 pb-2">{filtrados.length} de {casos.length} casos</p>
      </div>

      <div className="card !p-0 overflow-x-auto">
        <table className="min-w-full text-sm">
          <thead>
            <tr className="bg-hoja-50 text-hoja-800 text-xs uppercase tracking-wide">
              <th className="px-3 py-2.5 text-left"># radicado</th>
              <th className="px-3 py-2.5 text-left">Fecha diligenciamiento</th>
              <th className="px-3 py-2.5 text-left">Canal de recepción</th>
              <th className="px-3 py-2.5 text-left">Lugar</th>
              <th className="px-3 py-2.5 text-left">Cuándo</th>
              <th className="px-3 py-2.5 text-left">Qué pasó</th>
              <th className="px-3 py-2.5 text-left">Formulario completo</th>
              <th className="px-3 py-2.5 text-left">Estado del caso</th>
              <th className="px-3 py-2.5 text-left">Acompañamiento</th>
              <th className="px-3 py-2.5 text-left">Infografía</th>
              <th className="px-3 py-2.5 text-left">Soportes</th>
            </tr>
          </thead>
          <tbody>
            {filtrados.map((c) => (
              <tr key={c.radicado} className="border-t border-tierra-100 hover:bg-tierra-50/60 align-top">
                <td className="px-3 py-2.5 font-mono font-semibold text-hoja-800 whitespace-nowrap">
                  {c.radicado}
                  {c.draft && <span className="badge bg-tierra-200 text-tierra-700 ml-1">Borrador</span>}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{fechaCorta(c.createdAt)}</td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {labelDe(CANAL_RECEPCION, c.canalRecepcion)}
                  {c.medioManual ? ` (${labelDe(MEDIO_MANUAL, c.medioManual)})` : ""}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {[c.data.municipio, c.data.departamento].filter(Boolean).join(", ") || "—"}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">{resumenCuando(c)}</td>
                <td className="px-3 py-2.5 max-w-[220px] truncate" title={c.data.quePasoNarracion}>
                  {c.data.quePasoNarracion || "—"}
                </td>
                <td className="px-3 py-2.5">
                  <Link href={`/admin/casos/${encodeURIComponent(c.radicado)}`} className="text-hoja-700 font-semibold hover:underline whitespace-nowrap">
                    Ver / completar →
                  </Link>
                </td>
                <td className="px-3 py-2.5">
                  <select
                    className={`select !py-1.5 !text-xs font-semibold rounded-full ${ESTADO_COLOR[c.estado]}`}
                    value={c.estado}
                    disabled={guardando === c.radicado}
                    onChange={(e) => cambiarEstado(c.radicado, e.target.value)}
                  >
                    {ESTADO_CASO.map((o) => (
                      <option key={o.value} value={o.value}>{o.label}</option>
                    ))}
                  </select>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {c.estado === "en_ruta_juridica" ? (
                    <Link href={`/admin/casos/${encodeURIComponent(c.radicado)}/anexos`} className="text-hoja-700 font-semibold hover:underline">
                      Ver anexos →
                    </Link>
                  ) : (
                    <span className="text-tierra-400 text-xs">Disponible en ruta jurídica</span>
                  )}
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  <Link href={`/admin/casos/${encodeURIComponent(c.radicado)}/infografia`} className="text-hoja-700 font-semibold hover:underline">
                    Infografía →
                  </Link>
                </td>
                <td className="px-3 py-2.5 whitespace-nowrap">
                  {c.soportes.length > 0 ? (
                    <Link href={`/admin/casos/${encodeURIComponent(c.radicado)}`} className="text-hoja-700 font-semibold hover:underline">
                      📎 {c.soportes.length}
                    </Link>
                  ) : (
                    <span className="text-tierra-300">—</span>
                  )}
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={10} className="px-3 py-8 text-center text-tierra-400">
                  No hay casos que coincidan con el filtro.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
