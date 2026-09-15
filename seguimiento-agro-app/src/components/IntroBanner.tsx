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
    <div className="relative overflow-hidden rounded-xl border border-azul-800 bg-gradient-to-r from-azul-900 to-azul-800 p-4 text-white shadow-card sm:p-5">
      <button
        onClick={cerrar}
        aria-label="Cerrar introducción"
        className="absolute right-3 top-3 rounded-md px-2 py-0.5 text-xs text-azul-200 hover:bg-azul-700 hover:text-white"
      >
        ✕
      </button>
      <div className="flex flex-col gap-2 pr-8 sm:flex-row sm:items-center sm:gap-4">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-naranja-500 text-xl">
          🌾
        </span>
        <div>
          <p className="text-sm font-bold">Panorama estratégico del sector, en tiempo real</p>
          <p className="mt-0.5 max-w-3xl text-xs leading-relaxed text-azul-100">
            Este tablero centraliza los planes, programas, convenios y líneas de acción de todo el
            sector agricultura — viceministerios, direcciones, oficinas y entidades adscritas y
            vinculadas — para tener un panorama amplio y actualizado de la gestión, hacer
            monitoreo permanente y apoyar la identificación de rutas de acción.
          </p>
        </div>
      </div>
    </div>
  );
}
