"use client";

import { useState } from "react";
import type { ContenidoInfografia, Infografia } from "@/lib/infografias";

export function InfografiaEditor({
  radicado,
  infografiaInicial,
  habilitado,
}: {
  radicado: string;
  infografiaInicial: Infografia;
  habilitado: boolean;
}) {
  const [contenido, setContenido] = useState<ContenidoInfografia>(infografiaInicial.contenido);
  const [infografia, setInfografia] = useState(infografiaInicial);
  const [guardando, setGuardando] = useState(false);
  const [subiendoFoto, setSubiendoFoto] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const [previewKey, setPreviewKey] = useState(0);
  const base = `/api/admin/casos/${encodeURIComponent(radicado)}/infografia`;

  function set<K extends keyof ContenidoInfografia>(key: K, value: ContenidoInfografia[K]) {
    setContenido((c) => ({ ...c, [key]: value }));
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(base, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contenido }),
      });
      if (res.ok) {
        setMensaje("Cambios guardados. Actualizando vista previa…");
        setPreviewKey((k) => k + 1);
      } else {
        setMensaje("No se pudo guardar.");
      }
    } finally {
      setGuardando(false);
    }
  }

  async function subirFoto(file: File | null) {
    if (!file) return;
    setSubiendoFoto(true);
    setMensaje(null);
    const fd = new FormData();
    fd.append("foto", file);
    try {
      const res = await fetch(`${base}/foto`, { method: "POST", body: fd });
      const json = await res.json();
      if (res.ok) {
        setInfografia(json.infografia);
        setPreviewKey((k) => k + 1);
        setMensaje("Fotografía cargada.");
      } else {
        setMensaje(json.error || "No se pudo subir la imagen.");
      }
    } finally {
      setSubiendoFoto(false);
    }
  }

  if (!habilitado) {
    return (
      <div className="card border-tierra-200 bg-tierra-50 text-tierra-600 text-sm">
        La ficha gráfica solo puede generarse cuando el caso tiene al menos un anexo
        (derecho de petición, denuncia pública o alerta agraria) marcado como{" "}
        <strong>versión final</strong>. Vaya a la sección de anexos y apruebe una versión
        final primero.
      </div>
    );
  }

  return (
    <div className="grid lg:grid-cols-2 gap-6 pb-10">
      <div className="space-y-5">
        {mensaje && <div className="card border-hoja-300 bg-hoja-50 text-hoja-800 text-sm font-medium">{mensaje}</div>}

        <div className="card space-y-4">
          <h2 className="font-bold text-hoja-800">Fotografía (margen izquierda)</h2>
          <input type="file" accept="image/png,image/jpeg,image/webp" onChange={(e) => subirFoto(e.target.files?.[0] ?? null)} disabled={subiendoFoto} />
          {infografia.fotoPath && <p className="text-xs text-hoja-600">Fotografía cargada ✓</p>}
        </div>

        <div className="card space-y-4">
          <h2 className="font-bold text-hoja-800">Contenido de la ficha</h2>
          <p className="text-xs text-alerta-700 bg-alerta-50 border border-alerta-100 rounded-lg px-3 py-2">
            Revise que el texto no contenga nombres propios, números de identificación,
            matrícula/catastro, coordenadas ni medidas de autoprotección antes de generar la
            pieza definitiva.
          </p>
          <div>
            <label className="field-label">Tipo de hecho</label>
            <input className="input" value={contenido.tipoHecho} onChange={(e) => set("tipoHecho", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Fecha</label>
            <input className="input" value={contenido.fecha} onChange={(e) => set("fecha", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Territorio</label>
            <input className="input" value={contenido.territorio} onChange={(e) => set("territorio", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Población afectada</label>
            <input className="input" value={contenido.poblacionAfectada} onChange={(e) => set("poblacionAfectada", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Descripción breve</label>
            <textarea className="textarea" rows={4} value={contenido.descripcionBreve} onChange={(e) => set("descripcionBreve", e.target.value)} />
          </div>
          <div>
            <label className="field-label">Solicitudes o llamados institucionales</label>
            <textarea className="textarea" rows={4} value={contenido.solicitudes} onChange={(e) => set("solicitudes", e.target.value)} />
          </div>
          <button onClick={guardar} disabled={guardando} className="btn-primary w-full">
            {guardando ? "Guardando…" : "Guardar y actualizar vista previa"}
          </button>
        </div>
      </div>

      <div className="space-y-3">
        <h2 className="font-bold text-hoja-800">Vista previa</h2>
        <div className="card !p-2 sticky top-20">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={previewKey}
            src={`${base}/render?formato=png&v=${previewKey}`}
            alt="Vista previa de la ficha gráfica"
            className="w-full rounded-xl border border-tierra-100"
          />
        </div>
        <div className="flex gap-2">
          <a href={`${base}/render?formato=png`} className="btn-secondary flex-1 justify-center">⬇️ PNG</a>
          <a href={`${base}/render?formato=pdf`} className="btn-secondary flex-1 justify-center">⬇️ PDF</a>
        </div>
      </div>
    </div>
  );
}
