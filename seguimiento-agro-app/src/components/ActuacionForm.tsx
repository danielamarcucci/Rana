"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import UbicacionesPicker from "./UbicacionesPicker";
import { opcionesDependencia } from "../lib/client/dependencias";
import { ETIQUETA_ESTADO, ETIQUETA_TIPO_ACTUACION } from "../lib/types";
import type { Actuacion, ActuacionInput, Dependencia, EstadoActuacion, TipoActuacion, Ubicacion } from "../lib/types";

const TIPOS = Object.entries(ETIQUETA_TIPO_ACTUACION) as [TipoActuacion, string][];
const ESTADOS = Object.entries(ETIQUETA_ESTADO) as [EstadoActuacion, string][];

function valoresIniciales(actuacion?: Actuacion, dependenciaFijaId?: number): ActuacionInput {
  if (actuacion) {
    return {
      tipo: actuacion.tipo,
      nombre: actuacion.nombre,
      dependenciaId: actuacion.dependenciaId,
      entidadEjecutora: actuacion.entidadEjecutora,
      descripcion: actuacion.descripcion,
      fechaInicio: actuacion.fechaInicio,
      fechaFin: actuacion.fechaFin,
      estado: actuacion.estado,
      nivelAvance: actuacion.nivelAvance,
      fuenteFinanciacion: actuacion.fuenteFinanciacion,
      recursosDestinados: actuacion.recursosDestinados,
      recursosEjecutados: actuacion.recursosEjecutados,
      beneficiariosTotal: actuacion.beneficiariosTotal,
      beneficiariosMujeres: actuacion.beneficiariosMujeres,
      beneficiariosJovenes: actuacion.beneficiariosJovenes,
      comentarios: actuacion.comentarios,
      ubicaciones: actuacion.ubicaciones,
    };
  }
  return {
    tipo: "programa",
    nombre: "",
    dependenciaId: dependenciaFijaId ?? 0,
    entidadEjecutora: "",
    descripcion: "",
    fechaInicio: null,
    fechaFin: null,
    estado: "formulacion",
    nivelAvance: 0,
    fuenteFinanciacion: "",
    recursosDestinados: 0,
    recursosEjecutados: 0,
    beneficiariosTotal: 0,
    beneficiariosMujeres: 0,
    beneficiariosJovenes: 0,
    comentarios: "",
    ubicaciones: [],
  };
}

function Campo({ etiqueta, children }: { etiqueta: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-azul-900">{etiqueta}</span>
      {children}
    </label>
  );
}

const claseInput =
  "w-full rounded-lg border border-azul-200 px-3 py-2 text-sm outline-none focus:border-azul-500 focus:ring-2 focus:ring-azul-100";

export default function ActuacionForm({
  actuacion,
  modoRapido = false,
  dependenciaFijaId,
  onGuardado,
}: {
  actuacion?: Actuacion;
  /** En vez de navegar al guardar (crear o actualizar), se queda en la
   * página y limpia/recarga el formulario para seguir trabajando ahí mismo. */
  modoRapido?: boolean;
  /** Fija y bloquea la dependencia/entidad (para cuentas de dependencia:
   * no pueden cargar a nombre de otra). */
  dependenciaFijaId?: number;
  /** Se llama tras guardar con éxito en modoRapido, para refrescar listas externas. */
  onGuardado?: () => void;
}) {
  const router = useRouter();
  const [dependencias, setDependencias] = useState<Dependencia[]>([]);
  const [datos, setDatos] = useState<ActuacionInput>(valoresIniciales(actuacion, dependenciaFijaId));
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");
  const [mensajeExito, setMensajeExito] = useState("");

  useEffect(() => {
    fetch("/api/dependencias")
      .then((r) => r.json())
      .then((d) => setDependencias(d.dependencias ?? []));
  }, []);

  function set<K extends keyof ActuacionInput>(campo: K, valor: ActuacionInput[K]) {
    setDatos((prev) => ({ ...prev, [campo]: valor }));
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMensajeExito("");
    if (!datos.nombre.trim()) return setError("El nombre es obligatorio.");
    if (!datos.dependenciaId) return setError("Seleccione la dependencia o entidad responsable.");
    if (datos.ubicaciones.length === 0) return setError("Agregue al menos un departamento.");

    setGuardando(true);
    try {
      const url = actuacion ? `/api/actuaciones/${actuacion.id}` : "/api/actuaciones";
      const method = actuacion ? "PUT" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(datos),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "No se pudo guardar la actuación");
        return;
      }
      if (modoRapido) {
        if (!actuacion) setDatos(valoresIniciales(undefined, dependenciaFijaId));
        setMensajeExito(
          actuacion
            ? `"${datos.nombre}" quedó actualizada.`
            : `"${datos.nombre}" quedó registrada. Puede cargar la siguiente.`
        );
        window.scrollTo({ top: 0, behavior: "smooth" });
        onGuardado?.();
        return;
      }
      router.push(`/actuaciones/${actuacion ? actuacion.id : data.id}`);
      router.refresh();
    } finally {
      setGuardando(false);
    }
  }

  const opciones = opcionesDependencia(dependencias);
  const grupos = [...new Set(opciones.map((o) => o.grupo))];
  const dependenciaFija = dependenciaFijaId ? dependencias.find((d) => d.id === dependenciaFijaId) : undefined;

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      {mensajeExito && (
        <p className="rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-700">
          ✔ {mensajeExito}
        </p>
      )}
      {error && <p className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p>}

      <section className="grid gap-4 md:grid-cols-2">
        <Campo etiqueta="Tipo *">
          <select
            value={datos.tipo}
            onChange={(e) => set("tipo", e.target.value as TipoActuacion)}
            className={claseInput}
          >
            {TIPOS.map(([clave, etiqueta]) => (
              <option key={clave} value={clave}>
                {etiqueta}
              </option>
            ))}
          </select>
        </Campo>

        <Campo etiqueta="Estado *">
          <select
            value={datos.estado}
            onChange={(e) => set("estado", e.target.value as EstadoActuacion)}
            className={claseInput}
          >
            {ESTADOS.map(([clave, etiqueta]) => (
              <option key={clave} value={clave}>
                {etiqueta}
              </option>
            ))}
          </select>
        </Campo>

        <div className="md:col-span-2">
          <Campo etiqueta="Nombre *">
            <input
              value={datos.nombre}
              onChange={(e) => set("nombre", e.target.value)}
              className={claseInput}
              placeholder="Ej: Programa de sustitución de cultivos ilícitos por cadena de cacao"
            />
          </Campo>
        </div>

        <div className="md:col-span-2">
          <Campo etiqueta="Dependencia / entidad responsable *">
            {dependenciaFijaId ? (
              <div className={`${claseInput} bg-azul-50 text-azul-900`}>
                {dependenciaFija?.nombre ?? "Cargando…"}
              </div>
            ) : (
              <select
                value={datos.dependenciaId || ""}
                onChange={(e) => set("dependenciaId", Number(e.target.value))}
                className={claseInput}
              >
                <option value="">Seleccione…</option>
                {grupos.map((grupo) => (
                  <optgroup key={grupo} label={grupo}>
                    {opciones
                      .filter((o) => o.grupo === grupo)
                      .map((o) => (
                        <option key={o.id} value={o.id}>
                          {o.etiqueta}
                        </option>
                      ))}
                  </optgroup>
                ))}
              </select>
            )}
          </Campo>
        </div>

        <Campo etiqueta="Entidad ejecutora / contraparte (convenio)">
          <input
            value={datos.entidadEjecutora}
            onChange={(e) => set("entidadEjecutora", e.target.value)}
            className={claseInput}
            placeholder="Ej: Gobernación del Cauca, FAO, alcaldía…"
          />
        </Campo>

        <Campo etiqueta="Fuente de financiación">
          <input
            value={datos.fuenteFinanciacion}
            onChange={(e) => set("fuenteFinanciacion", e.target.value)}
            className={claseInput}
            placeholder="Ej: Presupuesto General de la Nación, SGR, cooperación internacional…"
          />
        </Campo>

        <Campo etiqueta="Fecha de inicio">
          <input
            type="date"
            value={datos.fechaInicio ?? ""}
            onChange={(e) => set("fechaInicio", e.target.value || null)}
            className={claseInput}
          />
        </Campo>

        <Campo etiqueta="Fecha de finalización">
          <input
            type="date"
            value={datos.fechaFin ?? ""}
            onChange={(e) => set("fechaFin", e.target.value || null)}
            className={claseInput}
          />
        </Campo>

        <div className="md:col-span-2">
          <Campo etiqueta="Descripción / objetivo">
            <textarea
              value={datos.descripcion}
              onChange={(e) => set("descripcion", e.target.value)}
              className={claseInput}
              rows={3}
            />
          </Campo>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-azul-800">
          Cobertura geográfica
        </h2>
        <UbicacionesPicker value={datos.ubicaciones} onChange={(u: Ubicacion[]) => set("ubicaciones", u)} />
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-azul-800">Avance y recursos</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo etiqueta={`Nivel de avance: ${datos.nivelAvance}%`}>
            <input
              type="range"
              min={0}
              max={100}
              value={datos.nivelAvance}
              onChange={(e) => set("nivelAvance", Number(e.target.value))}
              className="w-full"
            />
          </Campo>
          <Campo etiqueta="Recursos destinados (COP)">
            <input
              type="number"
              min={0}
              value={datos.recursosDestinados}
              onChange={(e) => set("recursosDestinados", Number(e.target.value))}
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Recursos ejecutados (COP)">
            <input
              type="number"
              min={0}
              value={datos.recursosEjecutados}
              onChange={(e) => set("recursosEjecutados", Number(e.target.value))}
              className={claseInput}
            />
          </Campo>
        </div>
      </section>

      <section>
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-azul-800">Beneficiarios</h2>
        <div className="grid gap-4 md:grid-cols-3">
          <Campo etiqueta="Total de beneficiarios">
            <input
              type="number"
              min={0}
              value={datos.beneficiariosTotal}
              onChange={(e) => set("beneficiariosTotal", Number(e.target.value))}
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Mujeres beneficiarias">
            <input
              type="number"
              min={0}
              value={datos.beneficiariosMujeres}
              onChange={(e) => set("beneficiariosMujeres", Number(e.target.value))}
              className={claseInput}
            />
          </Campo>
          <Campo etiqueta="Jóvenes beneficiarios">
            <input
              type="number"
              min={0}
              value={datos.beneficiariosJovenes}
              onChange={(e) => set("beneficiariosJovenes", Number(e.target.value))}
              className={claseInput}
            />
          </Campo>
        </div>
      </section>

      <section>
        <Campo etiqueta="Comentarios y seguimiento">
          <textarea
            value={datos.comentarios}
            onChange={(e) => set("comentarios", e.target.value)}
            className={claseInput}
            rows={4}
            placeholder="Hitos, alertas, próximos pasos…"
          />
        </Campo>
      </section>

      <div className="flex justify-end gap-3">
        {!modoRapido && (
          <button
            type="button"
            onClick={() => router.back()}
            className="rounded-lg border border-azul-200 px-4 py-2 text-sm font-medium text-azul-700 hover:bg-azul-50"
          >
            Cancelar
          </button>
        )}
        <button
          type="submit"
          disabled={guardando}
          className="rounded-lg bg-azul-700 px-5 py-2 text-sm font-semibold text-white hover:bg-azul-800 disabled:opacity-60"
        >
          {guardando
            ? "Guardando…"
            : actuacion
              ? modoRapido
                ? "Actualizar y guardar"
                : "Guardar cambios"
              : modoRapido
                ? "Guardar y cargar otra"
                : "Crear actuación"}
        </button>
      </div>
    </form>
  );
}
