"use client";

import { useState } from "react";
import ActuacionForm from "../../components/ActuacionForm";
import CargasRecientes from "../../components/CargasRecientes";
import MisActuacionesDependencia from "../../components/MisActuacionesDependencia";
import type { RolUsuario } from "../../lib/auth";
import type { Actuacion } from "../../lib/types";

export default function CargarClient({
  nombreVisible,
  rol,
  dependenciaId,
}: {
  nombreVisible: string;
  rol: RolUsuario;
  dependenciaId: number | null;
}) {
  const [refreshKey, setRefreshKey] = useState(0);
  const [editando, setEditando] = useState<Actuacion | null>(null);

  if (rol === "dependencia" && dependenciaId) {
    return (
      <div className="space-y-5">
        <div className="rounded-xl border border-azul-100 bg-white p-6 shadow-card">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm font-bold text-azul-900">
              {editando ? `Actualizando: ${editando.nombre}` : "Nueva actuación"}
            </p>
            {editando && (
              <button
                onClick={() => setEditando(null)}
                className="rounded-lg border border-azul-200 px-3 py-1.5 text-xs font-semibold text-azul-700 hover:bg-azul-50"
              >
                + Añadir nueva actuación
              </button>
            )}
          </div>
          <ActuacionForm
            key={editando?.id ?? "nueva"}
            actuacion={editando ?? undefined}
            modoRapido
            dependenciaFijaId={dependenciaId}
            onGuardado={() => {
              setEditando(null);
              setRefreshKey((k) => k + 1);
            }}
          />
        </div>
        <MisActuacionesDependencia
          dependenciaId={dependenciaId}
          refreshKey={refreshKey}
          editandoId={editando?.id}
          onEditar={setEditando}
        />
      </div>
    );
  }

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-azul-100 bg-white p-6 shadow-card">
        <ActuacionForm modoRapido onGuardado={() => setRefreshKey((k) => k + 1)} />
      </div>
      <CargasRecientes nombreVisible={nombreVisible} refreshKey={refreshKey} />
    </div>
  );
}
