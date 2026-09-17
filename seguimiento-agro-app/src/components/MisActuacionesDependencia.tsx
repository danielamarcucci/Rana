"use client";

import { useCallback, useEffect, useState } from "react";
import { BadgeEstado, BadgeTipo } from "./Badge";
import ProgressBar from "./ProgressBar";
import { formatoFecha } from "../lib/format";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ACTUACION, type Actuacion } from "../lib/types";

export default function MisActuacionesDependencia({
  dependenciaId,
  refreshKey,
  editandoId,
  onEditar,
}: {
  dependenciaId: number;
  refreshKey: number;
  editandoId?: number;
  onEditar: (actuacion: Actuacion) => void;
}) {
  const [items, setItems] = useState<Actuacion[]>([]);
  const [cargando, setCargando] = useState(true);
  const [eliminandoId, setEliminandoId] = useState<number | null>(null);

  const cargar = useCallback(() => {
    setCargando(true);
    const params = new URLSearchParams({ dependenciaId: String(dependenciaId) });
    fetch(`/api/actuaciones?${params.toString()}`)
      .then((r) => r.json())
      .then((d) => setItems(d.actuaciones ?? []))
      .finally(() => setCargando(false));
  }, [dependenciaId]);

  useEffect(() => {
    cargar();
  }, [cargar, refreshKey]);

  async function eliminar(id: number, nombre: string) {
    if (!confirm(`¿Eliminar "${nombre}"? No se puede deshacer.`)) return;
    setEliminandoId(id);
    const res = await fetch(`/api/actuaciones/${id}`, { method: "DELETE" });
    if (res.ok) {
      setItems((prev) => prev.filter((a) => a.id !== id));
    }
    setEliminandoId(null);
  }

  return (
    <div className="overflow-hidden rounded-xl border border-azul-100 bg-white shadow-card">
      <div className="border-b border-azul-100 bg-azul-50/60 px-4 py-2.5">
        <p className="text-sm font-bold text-azul-900">Información ya cargada</p>
        <p className="text-xs text-slate-500">
          Haga clic en &ldquo;Actualizar&rdquo; para editar y volver a enviar cualquiera de estos registros.
        </p>
      </div>
      <div className="divide-y divide-azul-50">
        {cargando && <p className="px-4 py-4 text-sm text-slate-400">Cargando…</p>}
        {!cargando && items.length === 0 && (
          <p className="px-4 py-4 text-sm text-slate-400">
            Todavía no hay actuaciones cargadas para esta dependencia. Use el formulario de arriba para
            registrar la primera.
          </p>
        )}
        {!cargando &&
          items.map((a) => (
            <div
              key={a.id}
              className={`flex flex-wrap items-center gap-3 px-4 py-3 ${
                editandoId === a.id ? "bg-naranja-50" : ""
              }`}
            >
              <div className="min-w-[180px] flex-1">
                <div className="mb-1 flex flex-wrap items-center gap-1.5">
                  <BadgeTipo tipo={a.tipo} etiqueta={ETIQUETA_TIPO_ACTUACION[a.tipo]} />
                  <BadgeEstado estado={a.estado} etiqueta={ETIQUETA_ESTADO[a.estado]} />
                </div>
                <p className="text-sm font-medium text-azul-900">{a.nombre}</p>
                <p className="text-xs text-slate-400">Última actualización: {formatoFecha(a.updatedAt)}</p>
              </div>
              <div className="w-28 shrink-0">
                <ProgressBar valor={a.nivelAvance} tamano="sm" />
              </div>
              <div className="flex shrink-0 gap-2">
                <button
                  onClick={() => onEditar(a)}
                  disabled={editandoId === a.id}
                  className="rounded-lg border border-azul-300 bg-azul-50 px-3 py-1.5 text-xs font-semibold text-azul-700 hover:bg-azul-100 disabled:opacity-50"
                >
                  {editandoId === a.id ? "Editando…" : "✏️ Actualizar"}
                </button>
                <button
                  onClick={() => eliminar(a.id, a.nombre)}
                  disabled={eliminandoId === a.id}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  {eliminandoId === a.id ? "Eliminando…" : "🗑"}
                </button>
              </div>
            </div>
          ))}
      </div>
    </div>
  );
}
