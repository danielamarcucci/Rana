"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import ActuacionForm from "../../../components/ActuacionForm";
import ProgressBar from "../../../components/ProgressBar";
import { BadgeEstado, BadgeTipo } from "../../../components/Badge";
import { formatoCOP, formatoFecha, formatoNumero } from "../../../lib/format";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ACTUACION, type Actuacion } from "../../../lib/types";
import type { VersionActuacion } from "../../../lib/actuaciones";

export default function ActuacionDetalle({
  actuacion,
  historial,
}: {
  actuacion: Actuacion;
  historial: VersionActuacion[];
}) {
  const router = useRouter();
  const [modo, setModo] = useState<"ver" | "editar" | "historial">("ver");
  const [eliminando, setEliminando] = useState(false);

  async function eliminar() {
    if (!confirm(`¿Eliminar definitivamente "${actuacion.nombre}"? Esta acción no se puede deshacer.`)) return;
    setEliminando(true);
    const res = await fetch(`/api/actuaciones/${actuacion.id}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/");
      router.refresh();
    } else {
      setEliminando(false);
    }
  }

  return (
    <div className="mx-auto max-w-4xl space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="mb-1 flex items-center gap-2">
            <BadgeTipo tipo={actuacion.tipo} etiqueta={ETIQUETA_TIPO_ACTUACION[actuacion.tipo]} />
            <BadgeEstado estado={actuacion.estado} etiqueta={ETIQUETA_ESTADO[actuacion.estado]} />
          </div>
          <h1 className="text-2xl font-bold text-azul-900">{actuacion.nombre}</h1>
          <p className="text-sm text-slate-600">{actuacion.dependenciaNombre}</p>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setModo("ver")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${modo === "ver" ? "bg-azul-700 text-white" : "border border-azul-200 text-azul-700"}`}
          >
            Ver
          </button>
          <button
            onClick={() => setModo("editar")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${modo === "editar" ? "bg-azul-700 text-white" : "border border-azul-200 text-azul-700"}`}
          >
            Editar
          </button>
          <button
            onClick={() => setModo("historial")}
            className={`rounded-lg px-3 py-1.5 text-sm font-medium ${modo === "historial" ? "bg-azul-700 text-white" : "border border-azul-200 text-azul-700"}`}
          >
            Historial ({historial.length})
          </button>
          <button
            onClick={eliminar}
            disabled={eliminando}
            className="rounded-lg border border-red-200 px-3 py-1.5 text-sm font-medium text-red-600 hover:bg-red-50"
          >
            Eliminar
          </button>
        </div>
      </div>

      {modo === "ver" && (
        <div className="space-y-5">
          <div className="rounded-xl border border-azul-100 bg-white p-5 shadow-card">
            <p className="mb-2 text-sm font-semibold text-azul-800">Nivel de avance</p>
            <ProgressBar valor={actuacion.nivelAvance} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <Info etiqueta="Entidad ejecutora / contraparte" valor={actuacion.entidadEjecutora || "—"} />
            <Info etiqueta="Fuente de financiación" valor={actuacion.fuenteFinanciacion || "—"} />
            <Info etiqueta="Fecha de inicio" valor={formatoFecha(actuacion.fechaInicio)} />
            <Info etiqueta="Fecha de finalización" valor={formatoFecha(actuacion.fechaFin)} />
            <Info etiqueta="Recursos destinados" valor={formatoCOP(actuacion.recursosDestinados)} />
            <Info etiqueta="Recursos ejecutados" valor={formatoCOP(actuacion.recursosEjecutados)} />
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            <Info etiqueta="Beneficiarios totales" valor={formatoNumero(actuacion.beneficiariosTotal)} />
            <Info etiqueta="Mujeres beneficiarias" valor={formatoNumero(actuacion.beneficiariosMujeres)} />
            <Info etiqueta="Jóvenes beneficiarios" valor={formatoNumero(actuacion.beneficiariosJovenes)} />
          </div>

          {actuacion.descripcion && (
            <div className="rounded-xl border border-azul-100 bg-white p-5 shadow-card">
              <p className="mb-1 text-sm font-semibold text-azul-800">Descripción / objetivo</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{actuacion.descripcion}</p>
            </div>
          )}

          <div className="rounded-xl border border-azul-100 bg-white p-5 shadow-card">
            <p className="mb-2 text-sm font-semibold text-azul-800">Cobertura geográfica</p>
            <div className="flex flex-wrap gap-2">
              {actuacion.ubicaciones.map((u, i) => (
                <span
                  key={i}
                  className="rounded-full bg-azul-50 px-3 py-1 text-xs font-medium text-azul-800"
                >
                  {u.departamento}
                  {u.municipio ? ` · ${u.municipio}` : " · todo el departamento"}
                </span>
              ))}
              {actuacion.ubicaciones.length === 0 && <p className="text-sm text-slate-400">Sin ubicación registrada.</p>}
            </div>
          </div>

          {actuacion.comentarios && (
            <div className="rounded-xl border border-naranja-100 bg-naranja-50/40 p-5 shadow-card">
              <p className="mb-1 text-sm font-semibold text-naranja-700">Comentarios y seguimiento</p>
              <p className="whitespace-pre-wrap text-sm text-slate-700">{actuacion.comentarios}</p>
            </div>
          )}

          <p className="text-xs text-slate-400">
            Creado por {actuacion.creadoPor} el {formatoFecha(actuacion.createdAt)} · Última actualización por{" "}
            {actuacion.actualizadoPor} el {formatoFecha(actuacion.updatedAt)}
          </p>
        </div>
      )}

      {modo === "editar" && (
        <div className="rounded-xl border border-azul-100 bg-white p-6 shadow-card">
          <ActuacionForm actuacion={actuacion} />
        </div>
      )}

      {modo === "historial" && (
        <div className="space-y-3">
          {historial.length === 0 && (
            <p className="rounded-xl border border-azul-100 bg-white p-5 text-sm text-slate-400 shadow-card">
              Todavía no hay cambios registrados sobre esta actuación.
            </p>
          )}
          {historial.map((v) => (
            <div key={v.id} className="rounded-xl border border-azul-100 bg-white p-4 shadow-card">
              <p className="text-xs text-slate-500">
                Versión anterior guardada el {formatoFecha(v.createdAt)} por <b>{v.usuario}</b>
              </p>
              <div className="mt-2 grid gap-2 text-sm sm:grid-cols-3">
                <p>
                  <span className="text-slate-500">Nombre:</span> {v.snapshot.nombre}
                </p>
                <p>
                  <span className="text-slate-500">Avance:</span> {v.snapshot.nivelAvance}%
                </p>
                <p>
                  <span className="text-slate-500">Recursos ejecutados:</span>{" "}
                  {formatoCOP(v.snapshot.recursosEjecutados)}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Info({ etiqueta, valor }: { etiqueta: string; valor: string }) {
  return (
    <div className="rounded-xl border border-azul-100 bg-white p-4 shadow-card">
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className="mt-0.5 text-sm font-medium text-azul-900">{valor}</p>
    </div>
  );
}
