"use client";

import { useMemo, useState } from "react";
import mapaData from "@/data/departamentos-mapa.json";
import { CODIGO_DANE_POR_DEPARTAMENTO } from "@/data/departamentos-dane";

const CODIGO_A_DEPARTAMENTO = Object.fromEntries(
  Object.entries(CODIGO_DANE_POR_DEPARTAMENTO).map(([nombre, codigo]) => [codigo, nombre])
);

export interface ValorMapa {
  valor: number;
  total: number;
}

interface Props {
  valores: Record<string, ValorMapa>;
  seleccionado: string | null;
  onSeleccionar: (departamento: string | null) => void;
  formatoValor: (v: number) => string;
}

function interpolarColor(t: number): string {
  // De azul claro (sin datos) a azul institucional oscuro (muchos datos)
  const clamped = Math.max(0, Math.min(1, t));
  const c0 = [214, 227, 245];
  const c1 = [15, 37, 71];
  const r = Math.round(c0[0] + (c1[0] - c0[0]) * clamped);
  const g = Math.round(c0[1] + (c1[1] - c0[1]) * clamped);
  const b = Math.round(c0[2] + (c1[2] - c0[2]) * clamped);
  return `rgb(${r},${g},${b})`;
}

export default function MapaColombia({ valores, seleccionado, onSeleccionar, formatoValor }: Props) {
  const [hover, setHover] = useState<{ nombre: string; x: number; y: number } | null>(null);

  const max = useMemo(() => {
    const nums = Object.values(valores).map((v) => v.valor);
    return nums.length ? Math.max(...nums, 1) : 1;
  }, [valores]);

  return (
    <div className="relative">
      <svg viewBox={mapaData.viewBox} className="h-auto w-full" role="img" aria-label="Mapa de Colombia por departamento">
        {mapaData.departamentos.map((d) => {
          const nombre = CODIGO_A_DEPARTAMENTO[d.dpto];
          const dato = nombre ? valores[nombre] : undefined;
          const color = dato ? interpolarColor(dato.valor / max) : "#eef1f6";
          const activo = seleccionado === nombre;
          return (
            <path
              key={d.dpto}
              d={d.path}
              fill={color}
              stroke={activo ? "#f0740f" : "#7fabe0"}
              strokeWidth={activo ? 2.5 : 0.6}
              className="cursor-pointer transition-colors"
              onClick={() => onSeleccionar(activo ? null : nombre ?? null)}
              onMouseEnter={() => nombre && setHover({ nombre, x: d.cx, y: d.cy })}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {nombre ?? d.nombreDpt}
                {dato ? ` — ${dato.total} actuación(es)` : " — sin actuaciones registradas"}
              </title>
            </path>
          );
        })}
      </svg>
      {hover && valores[hover.nombre] && (
        <div
          className="pointer-events-none absolute rounded-lg bg-azul-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{
            left: `${(hover.x / parseFloat(mapaData.viewBox.split(" ")[2])) * 100}%`,
            top: `${(hover.y / parseFloat(mapaData.viewBox.split(" ")[3])) * 100}%`,
            transform: "translate(-50%, -110%)",
          }}
        >
          <p className="font-semibold">{hover.nombre}</p>
          <p>{formatoValor(valores[hover.nombre].valor)}</p>
        </div>
      )}
    </div>
  );
}
