"use client";

import { useState } from "react";
import Link from "next/link";
import type { Caso } from "@/lib/types";
import type { CaseAnalysis } from "@/lib/docGenerators/analisis";
import { CheckboxGroupField } from "@/components/form/fields";
import { RUTA_JURIDICA } from "@/lib/catalogos";
import { NOMBRE_TIPO } from "@/lib/docGenerators/anexoCampos";

const URGENCIA_ESTILO: Record<string, string> = {
  inmediato: "bg-alerta-100 text-alerta-800 border-alerta-300",
  prioritario: "bg-tierra-200 text-tierra-800 border-tierra-300",
  ordinario: "bg-cielo-100 text-cielo-800 border-cielo-300",
};

function Panel({ titulo, children, icono }: { titulo: string; children: React.ReactNode; icono: string }) {
  return (
    <section className="card space-y-3">
      <h2 className="section-title">
        {icono} {titulo}
      </h2>
      {children}
    </section>
  );
}

export function AnalisisPrevio({ caso, analisis }: { caso: Caso; analisis: CaseAnalysis }) {
  const [rutas, setRutas] = useState<string[]>(caso.data.rutaJuridica ?? []);
  const [guardando, setGuardando] = useState(false);
  const [mensaje, setMensaje] = useState<string | null>(null);

  async function guardarRutas(nuevas: string[]) {
    setRutas(nuevas);
    setGuardando(true);
    setMensaje(null);
    try {
      const res = await fetch(`/api/admin/casos/${encodeURIComponent(caso.radicado)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ data: { rutaJuridica: nuevas } }),
      });
      setMensaje(res.ok ? "Rutas actualizadas." : "No se pudo guardar.");
    } finally {
      setGuardando(false);
    }
  }

  return (
    <div className="space-y-4 pb-10">
      <div className="card bg-hoja-700 text-white text-sm">
        Este análisis se genera con reglas fijas a partir de la información ya registrada en el
        formulario — no usa inteligencia artificial y no inventa datos. Sirve como apoyo para que
        el equipo decida; la decisión final siempre es humana.
      </div>

      {mensaje && <div className="card border-hoja-300 bg-hoja-50 text-hoja-800 text-sm font-medium">{mensaje}</div>}

      <Panel icono="⚖️" titulo="Ruta(s) jurídica(s)">
        <p className="text-xs text-tierra-500">
          Marcadas por el equipo en el formulario ampliado (numeral 12). Puede corregirlas aquí.
        </p>
        <CheckboxGroupField value={rutas} onChange={guardarRutas} options={RUTA_JURIDICA} />
        {guardando && <p className="text-xs text-tierra-400">Guardando…</p>}
        {analisis.rutasSugeridas.length > 0 && (
          <div className="rounded-lg bg-cielo-50 border border-cielo-100 p-3 space-y-2 mt-2">
            <p className="text-xs font-bold text-cielo-800 uppercase">Rutas sugeridas adicionales</p>
            {analisis.rutasSugeridas.map((r) => (
              <p key={r.ruta} className="text-sm text-cielo-900">
                <strong>{NOMBRE_TIPO[r.ruta]}:</strong> {r.razon}
              </p>
            ))}
          </div>
        )}
      </Panel>

      <Panel icono="📋" titulo="Síntesis del caso">
        <p className="text-sm text-tierra-700">{analisis.sintesisCaso}</p>
      </Panel>

      <div className="grid sm:grid-cols-2 gap-4">
        <Panel icono="🎯" titulo="Derechos posiblemente afectados">
          {analisis.derechosAfectados.length ? (
            <ul className="list-disc list-inside text-sm text-tierra-700">
              {analisis.derechosAfectados.map((d) => <li key={d}>{d}</li>)}
            </ul>
          ) : (
            <p className="text-xs text-tierra-400">Sin tipología registrada todavía.</p>
          )}
        </Panel>

        <Panel icono={analisis.nivelUrgencia === "inmediato" ? "🚨" : analisis.nivelUrgencia === "prioritario" ? "⚠️" : "🕐"} titulo="Nivel de urgencia sugerido">
          <span className={`badge border ${URGENCIA_ESTILO[analisis.nivelUrgencia]} text-sm`}>
            {analisis.nivelUrgencia.toUpperCase()}
          </span>
          <p className="text-xs text-tierra-500 mt-2">{analisis.urgenciaRazon}</p>
          <p className="text-xs text-tierra-400 mt-1 italic">
            Es una sugerencia; no reemplaza la valoración de riesgo del equipo.
          </p>
        </Panel>
      </div>

      <Panel icono="🔍" titulo="Hechos, afirmaciones e hipótesis">
        <div className="grid sm:grid-cols-3 gap-3">
          <div>
            <p className="text-xs font-bold text-hoja-700 uppercase mb-1">✅ Corroborado por la Red</p>
            {analisis.hechosCorroborados.length ? (
              <ul className="text-xs text-tierra-600 space-y-1">{analisis.hechosCorroborados.map((h, i) => <li key={i}>{h}</li>)}</ul>
            ) : (
              <p className="text-xs text-tierra-400">Ninguno todavía (el caso no está marcado como &quot;Corroborado&quot;).</p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-cielo-700 uppercase mb-1">🗣️ Reportado por la fuente</p>
            {analisis.hechosReportados.length ? (
              <ul className="text-xs text-tierra-600 space-y-1">{analisis.hechosReportados.map((h, i) => <li key={i}>{h}</li>)}</ul>
            ) : (
              <p className="text-xs text-tierra-400">Sin datos.</p>
            )}
          </div>
          <div>
            <p className="text-xs font-bold text-tierra-700 uppercase mb-1">❓ Hipótesis / pendiente de confirmar</p>
            {analisis.hipotesis.length ? (
              <ul className="text-xs text-tierra-600 space-y-1">{analisis.hipotesis.map((h, i) => <li key={i}>{h}</li>)}</ul>
            ) : (
              <p className="text-xs text-tierra-400">Sin datos.</p>
            )}
          </div>
        </div>
      </Panel>

      <Panel icono="🌾" titulo="Vínculo con la Reforma Agraria">
        <p className="text-sm text-tierra-700">{analisis.vinculoAgrario}</p>
      </Panel>

      <Panel icono="🏛️" titulo="Autoridades o destinatarios posiblemente competentes">
        <ul className="space-y-1.5">
          {analisis.autoridadesCompetentes.map((a, i) => (
            <li key={i} className="text-sm">
              <strong className="text-tierra-800">{a.entidad}</strong>
              <span className="text-tierra-500"> — {a.razon}</span>
            </li>
          ))}
        </ul>
        <p className="text-xs text-tierra-400 italic mt-2">
          Sugerencia basada en reglas; verifique la competencia real y los datos de contacto vigentes antes de enviar.
        </p>
      </Panel>

      {analisis.pendientesCriticos.length > 0 && (
        <Panel icono="⏳" titulo="Información faltante crítica">
          <ul className="list-disc list-inside text-sm text-alerta-700 space-y-1">
            {analisis.pendientesCriticos.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </Panel>
      )}

      {analisis.alertasPrivacidad.length > 0 && (
        <Panel icono="🔒" titulo="Alertas de privacidad y seguridad">
          <ul className="list-disc list-inside text-sm text-alerta-700 space-y-1">
            {analisis.alertasPrivacidad.map((p, i) => <li key={i}>{p}</li>)}
          </ul>
        </Panel>
      )}

      <div className="flex justify-end gap-2 pt-2">
        <Link href={`/admin/casos/${encodeURIComponent(caso.radicado)}`} className="btn-secondary">
          ← Volver al formulario
        </Link>
        <Link href={`/admin/casos/${encodeURIComponent(caso.radicado)}/anexos`} className="btn-primary">
          Continuar a los anexos →
        </Link>
      </div>
    </div>
  );
}
