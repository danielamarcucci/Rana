"use client";

import type { ReactNode } from "react";

export function RepeatableSection<T>({
  items,
  onChange,
  nuevo,
  render,
  etiquetaAgregar,
  etiquetaVacio,
}: {
  items: T[];
  onChange: (items: T[]) => void;
  nuevo: () => T;
  render: (item: T, index: number, update: (patch: Partial<T>) => void) => ReactNode;
  etiquetaAgregar: string;
  etiquetaVacio?: string;
}) {
  function update(index: number, patch: Partial<T>) {
    const copy = items.slice();
    copy[index] = { ...copy[index], ...patch };
    onChange(copy);
  }
  function remove(index: number) {
    onChange(items.filter((_, i) => i !== index));
  }
  return (
    <div className="space-y-4">
      {items.length === 0 && etiquetaVacio && (
        <p className="text-xs text-tierra-400">{etiquetaVacio}</p>
      )}
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-tierra-200 p-4 space-y-3 relative bg-white">
          <button
            type="button"
            onClick={() => remove(i)}
            className="absolute top-3 right-3 text-xs text-alerta-600 hover:text-alerta-800 font-semibold"
          >
            ✕ Quitar
          </button>
          {render(item, i, (patch) => update(i, patch))}
        </div>
      ))}
      <button type="button" onClick={() => onChange([...items, nuevo()])} className="btn-secondary text-xs">
        + {etiquetaAgregar}
      </button>
    </div>
  );
}
