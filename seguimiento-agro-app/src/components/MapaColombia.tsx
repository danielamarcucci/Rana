"use client";

import { useMemo, useState } from "react";
import mapaData from "../data/departamentos-mapa.json";
import { CODIGO_DANE_POR_DEPARTAMENTO } from "../data/departamentos-dane";
import { cajaDePath } from "../lib/geometria-mapa";

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

const VB_PARTES = mapaData.viewBox.split(" ").map(Number);
const VB_W = VB_PARTES[2];
const VB_H = VB_PARTES[3];
const IDENTIDAD = { escala: 1, tx: 0, ty: 0 };

export default function MapaColombia({ valores, seleccionado, onSeleccionar, formatoValor }: Props) {
  const [hover, setHover] = useState<{ nombre: string; x: number; y: number } | null>(null);

  const max = useMemo(() => {
    const nums = Object.values(valores).map((v) => v.valor);
    return nums.length ? Math.max(...nums, 1) : 1;
  }, [valores]);

  // Al seleccionar un departamento, "hacer zoom" es aplicar una escala y un
  // desplazamiento a todo el grupo de formas (no recalcular el viewBox), así
  // el cambio se puede animar con una transición CSS normal sobre
  // `transform`. La caja de referencia es la del propio path del
  // departamento (ver src/lib/geometria-mapa.ts).
  const zoom = useMemo(() => {
    if (!seleccionado) return IDENTIDAD;
    const dep = mapaData.departamentos.find((d) => CODIGO_A_DEPARTAMENTO[d.dpto] === seleccionado);
    if (!dep) return IDENTIDAD;
    const { minX, minY, maxX, maxY } = cajaDePath(dep.path);
    const w = maxX - minX;
    const h = maxY - minY;
    if (!(w > 0) || !(h > 0)) return IDENTIDAD;
    const MARGEN = 1.4; // deja aire alrededor del departamento seleccionado
    const escalaCruda = Math.min(VB_W / (w * MARGEN), VB_H / (h * MARGEN));
    const escala = Math.min(Math.max(escalaCruda, 1), 7);
    const cx = minX + w / 2;
    const cy = minY + h / 2;
    return { escala, tx: VB_W / 2 - escala * cx, ty: VB_H / 2 - escala * cy };
  }, [seleccionado]);

  return (
    <div className="relative overflow-hidden">
      <svg viewBox={mapaData.viewBox} className="h-auto w-full" role="img" aria-label="Mapa de Colombia por departamento">
        <g
          transform={`translate(${zoom.tx} ${zoom.ty}) scale(${zoom.escala})`}
          style={{ transition: "transform 0.6s cubic-bezier(0.4, 0, 0.2, 1)" }}
        >
        {mapaData.insetSanAndres && (
          <g>
            <rect
              x={mapaData.insetSanAndres.cajaSanAndres.x}
              y={mapaData.insetSanAndres.cajaSanAndres.y}
              width={mapaData.insetSanAndres.cajaSanAndres.width}
              height={mapaData.insetSanAndres.cajaSanAndres.height}
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeDasharray="4 3"
              strokeWidth={1}
              rx={4}
            />
            <rect
              x={mapaData.insetSanAndres.cajaProvidencia.x}
              y={mapaData.insetSanAndres.cajaProvidencia.y}
              width={mapaData.insetSanAndres.cajaProvidencia.width}
              height={mapaData.insetSanAndres.cajaProvidencia.height}
              fill="#f8fafc"
              stroke="#94a3b8"
              strokeDasharray="4 3"
              strokeWidth={1}
              rx={4}
            />
            <text
              x={mapaData.insetSanAndres.cajaSanAndres.x + mapaData.insetSanAndres.cajaSanAndres.width / 2}
              y={mapaData.insetSanAndres.etiquetaY}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              San Andrés
            </text>
            <text
              x={mapaData.insetSanAndres.cajaProvidencia.x + mapaData.insetSanAndres.cajaProvidencia.width / 2}
              y={mapaData.insetSanAndres.etiquetaY}
              textAnchor="middle"
              fontSize={9}
              fill="#94a3b8"
            >
              Providencia
            </text>
            <text
              x={mapaData.insetSanAndres.captionX}
              y={mapaData.insetSanAndres.captionY}
              textAnchor="middle"
              fontSize={11}
              fontWeight={600}
              fill="#64748b"
            >
              Archipiélago de San Andrés y Providencia
            </text>
            <text
              x={mapaData.insetSanAndres.captionX}
              y={mapaData.insetSanAndres.captionY + 13}
              textAnchor="middle"
              fontSize={9.5}
              fill="#94a3b8"
            >
              (fuera de escala)
            </text>
          </g>
        )}
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
              vectorEffect="non-scaling-stroke"
              className="cursor-pointer transition-colors"
              onClick={() => onSeleccionar(activo ? null : nombre ?? null)}
              onMouseEnter={() => nombre && setHover({ nombre, x: d.cx, y: d.cy })}
              onMouseLeave={() => setHover(null)}
            >
              <title>
                {`${nombre ?? d.nombreDpt}${dato ? ` — ${dato.total} actuación(es)` : " — sin actuaciones registradas"}`}
              </title>
            </path>
          );
        })}
        </g>
      </svg>
      {hover && valores[hover.nombre] && (
        <div
          className="pointer-events-none absolute rounded-lg bg-azul-900 px-2.5 py-1.5 text-xs text-white shadow-lg"
          style={{
            // La posición del tooltip debe seguir el mismo zoom aplicado al
            // grupo de formas: el punto (cx, cy) del departamento se dibuja
            // en (escala*cx + tx, escala*cy + ty) dentro del viewBox.
            left: `${((zoom.escala * hover.x + zoom.tx) / VB_W) * 100}%`,
            top: `${((zoom.escala * hover.y + zoom.ty) / VB_H) * 100}%`,
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
