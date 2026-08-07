"use client";

import { useRef, useState } from "react";
import type { Soporte } from "@/lib/types";

function tamanoLegible(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function SoportesUploader({
  radicado,
  soportesIniciales,
}: {
  radicado: string;
  soportesIniciales: Soporte[];
}) {
  const [soportes, setSoportes] = useState(soportesIniciales);
  const [subiendo, setSubiendo] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  async function subir(files: FileList | null) {
    if (!files || files.length === 0) return;
    setSubiendo(true);
    setError(null);
    const fd = new FormData();
    Array.from(files).forEach((f) => fd.append("archivos", f));
    try {
      const res = await fetch(`/api/admin/casos/${encodeURIComponent(radicado)}/soportes`, {
        method: "POST",
        body: fd,
      });
      const json = await res.json();
      if (!res.ok) {
        setError(json.error || "No se pudo subir el archivo.");
        return;
      }
      setSoportes(json.soportes);
    } finally {
      setSubiendo(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div className="space-y-3">
      {error && <p className="field-error">{error}</p>}
      <div className="flex items-center gap-3">
        <input
          ref={inputRef}
          type="file"
          multiple
          className="text-sm"
          onChange={(e) => subir(e.target.files)}
          disabled={subiendo}
        />
        {subiendo && <span className="text-xs text-tierra-500">Subiendo…</span>}
      </div>
      {soportes.length > 0 ? (
        <ul className="space-y-1.5">
          {soportes.map((s) => (
            <li key={s.id} className="flex items-center justify-between text-sm bg-tierra-50 rounded-lg px-3 py-2">
              <a
                href={`/api/admin/casos/${encodeURIComponent(radicado)}/soportes/${s.id}`}
                target="_blank"
                rel="noreferrer"
                className="text-hoja-700 hover:underline truncate max-w-[70%]"
              >
                📎 {s.nombreOriginal}
              </a>
              <span className="text-xs text-tierra-400">{tamanoLegible(s.tamano)}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-xs text-tierra-400">Sin soportes cargados todavía.</p>
      )}
    </div>
  );
}
