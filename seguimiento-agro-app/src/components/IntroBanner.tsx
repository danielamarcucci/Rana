"use client";

import { useEffect, useState } from "react";

const CLAVE_LOCAL_STORAGE = "agro-intro-cerrada";

export default function IntroBanner() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    try {
      setVisible(localStorage.getItem(CLAVE_LOCAL_STORAGE) !== "1");
    } catch {
      setVisible(true);
    }
  }, []);

  function cerrar() {
    setVisible(false);
    try {
      localStorage.setItem(CLAVE_LOCAL_STORAGE, "1");
    } catch {
      // si el navegador bloquea localStorage, simplemente no se recuerda la próxima vez
    }
  }

  if (!visible) return null;

  return (
    <div className="relative overflow-hidden rounded-lg border border-azul-800 bg-gradient-to-r from-azul-900 to-azul-800 px-3 py-2 text-white shadow-card">
      <button
        onClick={cerrar}
        aria-label="Cerrar introducción"
        className="absolute right-2 top-2 rounded-md px-1.5 text-xs text-azul-200 hover:bg-azul-700 hover:text-white"
      >
        ✕
      </button>
      <div className="flex items-center gap-3 pr-6">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-naranja-500 text-sm">
          🌾
        </span>
        <p className="text-xs leading-snug text-azul-100">
          <b className="text-white">Panorama estratégico del sector, en tiempo real —</b> centraliza planes,
          programas, convenios y líneas de acción de todo el sector agricultura para monitoreo permanente y
          apoyo a la identificación de rutas de acción.
        </p>
      </div>
    </div>
  );
}
