"use client";

import { useState } from "react";
import ActuacionForm from "../../components/ActuacionForm";
import CargasRecientes from "../../components/CargasRecientes";

export default function CargarClient({ nombreVisible }: { nombreVisible: string }) {
  const [refreshKey, setRefreshKey] = useState(0);

  return (
    <div className="space-y-5">
      <div className="rounded-xl border border-azul-100 bg-white p-6 shadow-card">
        <ActuacionForm modoRapido onGuardado={() => setRefreshKey((k) => k + 1)} />
      </div>
      <CargasRecientes nombreVisible={nombreVisible} refreshKey={refreshKey} />
    </div>
  );
}
