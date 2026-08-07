"use client";

import { useState } from "react";
import type { AnexoTipo, Anexo } from "@/lib/types";
import { camposPara, NOMBRE_TIPO } from "@/lib/docGenerators/anexoCampos";

export function AnexoEditor({
  radicado,
  tipo,
  anexoInicial,
  valoresIniciales,
}: {
  radicado: string;
  tipo: AnexoTipo;
  anexoInicial: Anexo;
  valoresIniciales: Record<string, string>;
}) {
  const [valores, setValores] = useState(valoresIniciales);
  const [anexo, setAnexo] = useState(anexoInicial);
  const [guardando, setGuardando] = useState(false);
  const [finalizando, setFinalizando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);
  const campos = camposPara(tipo);
  const base = `/api/admin/casos/${encodeURIComponent(radicado)}/anexos/${tipo}`;

  function set(key: string, value: string) {
    setValores((v) => ({ ...v, [key]: value }));
  }

  async function guardar() {
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(base, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: valores }),
      });
      const json = await res.json();
      if (res.ok) {
        setAnexo(json.anexo);
        setMensaje("Cambios guardados.");
      } else {
        setMensaje("No se pudo guardar.");
      }
    } finally {
      setGuardando(false);
    }
  }

  async function enviarVersionFinal() {
    if (!confirm("¿Confirma que desea enviar esta versión como versión final? Quedará identificada como aprobada y disponible para descarga.")) {
      return;
    }
    setFinalizando(true);
    setMensaje(null);
    try {
      await guardar();
      const res = await fetch(`${base}/version-final`, { method: "POST" });
      const json = await res.json();
      if (res.ok) {
        setAnexo(json.anexo);
        setMensaje("Versión final guardada. Las versiones anteriores quedan disponibles para consulta.");
      } else {
        setMensaje("No se pudo marcar como versión final.");
      }
    } finally {
      setFinalizando(false);
    }
  }

  const camposFaltantes = campos.filter((c) => !c.opcional && !(valores[c.key] || "").trim());

  return (
    <div className="space-y-6 pb-24">
      <div className="card flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-extrabold text-hoja-800">{NOMBRE_TIPO[tipo]}</h1>
          <p className="text-xs text-tierra-500 font-mono">{radicado}</p>
        </div>
        <span className={`badge ${anexo.estado === "version_final" ? "bg-hoja-100 text-hoja-800" : "bg-tierra-100 text-tierra-600"}`}>
          {anexo.estado === "version_final" ? "✅ Versión final" : "📝 Borrador"}
        </span>
      </div>

      {mensaje && <div className="card border-hoja-300 bg-hoja-50 text-hoja-800 text-sm font-medium">{mensaje}</div>}

      {camposFaltantes.length > 0 && (
        <div className="card border-alerta-200 bg-alerta-50 text-alerta-800 text-sm">
          <p className="font-semibold mb-1">Información pendiente de completar antes de aprobar:</p>
          <ul className="list-disc list-inside space-y-0.5">
            {camposFaltantes.map((c) => (
              <li key={c.key}>{c.label}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="card space-y-5">
        {campos.map((campo) => (
          <div key={campo.key}>
            <label className="field-label">
              {campo.label}
              {campo.opcional && <span className="text-tierra-400 font-normal"> (opcional)</span>}
            </label>
            {campo.ayuda && <p className="field-help mb-1">{campo.ayuda}</p>}
            {campo.multiline ? (
              <textarea
                className="textarea"
                rows={3}
                value={valores[campo.key] ?? ""}
                onChange={(e) => set(campo.key, e.target.value)}
              />
            ) : (
              <input
                className="input"
                value={valores[campo.key] ?? ""}
                onChange={(e) => set(campo.key, e.target.value)}
              />
            )}
          </div>
        ))}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-tierra-200 py-3 z-20">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-end gap-3">
          <a href={`${base}/descargar`} className="btn-secondary">⬇️ Descargar</a>
          <button onClick={guardar} disabled={guardando} className="btn-secondary">
            {guardando ? "Guardando…" : "Guardar cambios"}
          </button>
          <button onClick={enviarVersionFinal} disabled={finalizando} className="btn-primary">
            {finalizando ? "Enviando…" : "Enviar versión final"}
          </button>
        </div>
      </div>
    </div>
  );
}
