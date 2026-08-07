"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Marca } from "@/components/Logo";
import { FieldShell, TextField, TextAreaField, RadioGroupField, CheckboxGroupField } from "@/components/form/fields";
import { SelectDepartamento, SelectMunicipio } from "@/components/form/DepartamentoMunicipio";
import {
  CANAL_RECEPCION,
  SEXO,
  RURAL_URBANO,
  ES_PREDIO_REFORMA_AGRARIA,
  ACTOR_RESPONSABLE,
  ESTADO_SITUACION,
  SI_NO,
} from "@/lib/catalogos";

type FormState = {
  accedioPor: string;
  nombre: string;
  apellido: string;
  sexo: string;
  quePasoNarracion: string;
  cuandoAnio: string;
  cuandoMes: string;
  cuandoDia: string;
  comoNarracion: string;
  departamento: string;
  municipio: string;
  ruralUrbano: string;
  esPredioReformaAgraria: string;
  actores: string[];
  actoresOtroDetalle: string;
  estadoSituacion: string;
  razonHechoTexto: string;
  consentimientoHabeasData: string;
};

const CANAL_PUBLICO = CANAL_RECEPCION.filter((c) => c.value !== "RED");

const INITIAL: FormState = {
  accedioPor: "",
  nombre: "",
  apellido: "",
  sexo: "",
  quePasoNarracion: "",
  cuandoAnio: "",
  cuandoMes: "",
  cuandoDia: "",
  comoNarracion: "",
  departamento: "",
  municipio: "",
  ruralUrbano: "",
  esPredioReformaAgraria: "",
  actores: [],
  actoresOtroDetalle: "",
  estadoSituacion: "",
  razonHechoTexto: "",
  consentimientoHabeasData: "",
};

const MESES = [
  "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
  "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

export default function DenunciaPage() {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(INITIAL);
  const [enviando, setEnviando] = useState(false);
  const [errores, setErrores] = useState<Record<string, string> | null>(null);
  const [errorGeneral, setErrorGeneral] = useState<string | null>(null);

  function set<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((f) => ({ ...f, [key]: value }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setEnviando(true);
    setErrorGeneral(null);
    setErrores(null);
    try {
      const res = await fetch("/api/denuncias", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const json = await res.json();
      if (!res.ok) {
        if (json.detalles?.fieldErrors) {
          const fe: Record<string, string> = {};
          for (const [k, v] of Object.entries(json.detalles.fieldErrors)) {
            if (Array.isArray(v) && v[0]) fe[k] = v[0] as string;
          }
          setErrores(fe);
        }
        setErrorGeneral(json.error || "No pudimos enviar la denuncia. Intente de nuevo.");
        window.scrollTo({ top: 0, behavior: "smooth" });
        return;
      }
      router.push(`/denuncia/confirmacion/${json.token}`);
    } catch {
      setErrorGeneral("No pudimos conectar con el servidor. Intente de nuevo en unos minutos.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-hoja-50 via-tierra-50 to-cielo-50">
      <header className="bg-white/80 backdrop-blur border-b border-tierra-100 sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3">
          <Marca subtitulo="Formulario público de denuncia" />
        </div>
      </header>

      <div className="max-w-3xl mx-auto px-4 py-8 space-y-6">
        <div className="card bg-hoja-700 text-white">
          <h1 className="text-2xl sm:text-3xl font-extrabold">¿Qué le pasó?</h1>
          <p className="mt-2 text-hoja-50">
            Cuéntenos lo que ocurrió. Este espacio es para cualquier persona o comunidad
            beneficiaria de la Reforma Agraria que quiera reportar una amenaza, agresión
            o hecho de violencia. Solo le pediremos la información necesaria para poder
            ayudarle; el resto lo completa después nuestro equipo.
          </p>
        </div>

        {errorGeneral && (
          <div className="card border-alerta-300 bg-alerta-50 text-alerta-800 font-medium">
            {errorGeneral}
          </div>
        )}

        <form onSubmit={onSubmit} className="space-y-6">
          <section className="card space-y-4">
            <h2 className="section-title">📍 ¿Por dónde nos contactó?</h2>
            <FieldShell label="Canal" required error={errores?.accedioPor}>
              <RadioGroupField
                name="accedioPor"
                value={form.accedioPor}
                onChange={(v) => set("accedioPor", v)}
                options={CANAL_PUBLICO}
              />
            </FieldShell>
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">🧑‍🌾 Datos de quien denuncia</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldShell label="Nombre" required error={errores?.nombre}>
                <TextField value={form.nombre} onChange={(v) => set("nombre", v)} placeholder="Su nombre" />
              </FieldShell>
              <FieldShell label="Apellido" required error={errores?.apellido}>
                <TextField value={form.apellido} onChange={(v) => set("apellido", v)} placeholder="Su apellido" />
              </FieldShell>
            </div>
            <FieldShell label="Sexo" required error={errores?.sexo}>
              <RadioGroupField name="sexo" value={form.sexo} onChange={(v) => set("sexo", v)} options={SEXO} />
            </FieldShell>
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">😟 ¿Qué le pasó?</h2>
            <FieldShell label="Narre el tipo de agresión" required error={errores?.quePasoNarracion}>
              <TextAreaField
                value={form.quePasoNarracion}
                onChange={(v) => set("quePasoNarracion", v)}
                placeholder="Describa con sus palabras lo que sucedió"
              />
            </FieldShell>
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">📅 ¿Cuándo le pasó?</h2>
            <div className="grid sm:grid-cols-3 gap-4">
              <FieldShell label="Día" required error={errores?.cuandoDia}>
                <TextField type="number" min={1} max={31} value={form.cuandoDia} onChange={(v) => set("cuandoDia", v)} />
              </FieldShell>
              <FieldShell label="Mes" required error={errores?.cuandoMes}>
                <select className="select" value={form.cuandoMes} onChange={(e) => set("cuandoMes", e.target.value)}>
                  <option value="">Seleccione…</option>
                  {MESES.map((m) => (
                    <option key={m} value={m}>{m}</option>
                  ))}
                </select>
              </FieldShell>
              <FieldShell label="Año" required error={errores?.cuandoAnio}>
                <TextField type="number" min={2000} max={2100} value={form.cuandoAnio} onChange={(v) => set("cuandoAnio", v)} />
              </FieldShell>
            </div>
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">🗣️ ¿Cómo?</h2>
            <FieldShell label="Narre los hechos y los medios utilizados" required error={errores?.comoNarracion}>
              <TextAreaField value={form.comoNarracion} onChange={(v) => set("comoNarracion", v)} />
            </FieldShell>
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">🗺️ ¿Dónde sucedió?</h2>
            <div className="grid sm:grid-cols-2 gap-4">
              <FieldShell label="Departamento" required error={errores?.departamento}>
                <SelectDepartamento
                  value={form.departamento}
                  onChange={(v) => setForm((f) => ({ ...f, departamento: v, municipio: "" }))}
                />
              </FieldShell>
              <FieldShell label="Municipio" required error={errores?.municipio}>
                <SelectMunicipio
                  departamento={form.departamento}
                  value={form.municipio}
                  onChange={(v) => set("municipio", v)}
                />
              </FieldShell>
            </div>
            <FieldShell label="¿Rural o urbano?" required error={errores?.ruralUrbano}>
              <RadioGroupField name="ruralUrbano" value={form.ruralUrbano} onChange={(v) => set("ruralUrbano", v)} options={RURAL_URBANO} />
            </FieldShell>
            <FieldShell label="¿Es predio de Reforma Agraria?" required error={errores?.esPredioReformaAgraria}>
              <RadioGroupField
                name="esPredioRA"
                value={form.esPredioReformaAgraria}
                onChange={(v) => set("esPredioReformaAgraria", v)}
                options={ES_PREDIO_REFORMA_AGRARIA}
              />
            </FieldShell>
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">🎯 ¿Por quién(es)?</h2>
            <FieldShell label="Seleccione una o varias opciones" required error={errores?.actores}>
              <CheckboxGroupField value={form.actores} onChange={(v) => set("actores", v)} options={ACTOR_RESPONSABLE} />
            </FieldShell>
            {form.actores.includes("otros") && (
              <FieldShell label="¿Cuál?">
                <TextField value={form.actoresOtroDetalle} onChange={(v) => set("actoresOtroDetalle", v)} />
              </FieldShell>
            )}
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">⏳ ¿Qué está pasando con esta situación?</h2>
            <FieldShell label="Seleccione una opción" required error={errores?.estadoSituacion}>
              <RadioGroupField
                name="estadoSituacion"
                value={form.estadoSituacion}
                onChange={(v) => set("estadoSituacion", v)}
                options={ESTADO_SITUACION}
              />
            </FieldShell>
          </section>

          <section className="card space-y-4">
            <h2 className="section-title">❓ ¿Cuál es la razón del hecho?</h2>
            <FieldShell
              label="Interés sobre la tierra, retaliación por liderazgo o denuncia previa, disputa por linderos, economías ilegales, u otro"
              required
              error={errores?.razonHechoTexto}
            >
              <TextAreaField value={form.razonHechoTexto} onChange={(v) => set("razonHechoTexto", v)} rows={3} />
            </FieldShell>
          </section>

          <section className="card space-y-4 border-2 border-cielo-200">
            <h2 className="section-title">🔒 Consentimiento informado</h2>
            <p className="text-sm text-tierra-600">
              ¿Autoriza el tratamiento de sus datos personales conforme a la Ley 1581 de 2012
              (Habeas Data)?
            </p>
            <FieldShell label="" error={errores?.consentimientoHabeasData}>
              <RadioGroupField
                name="consentimiento"
                value={form.consentimientoHabeasData}
                onChange={(v) => set("consentimientoHabeasData", v)}
                options={SI_NO}
              />
            </FieldShell>
          </section>

          <div className="sticky bottom-0 bg-gradient-to-t from-hoja-50 via-hoja-50/95 to-transparent pt-6 pb-4">
            <button type="submit" disabled={enviando} className="btn-primary w-full text-base py-3">
              {enviando ? "Enviando…" : "Enviar denuncia"}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
