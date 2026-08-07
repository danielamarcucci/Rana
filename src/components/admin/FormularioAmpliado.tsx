"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { Caso, CasoData, Predio, Antecedente, Autor } from "@/lib/types";
import {
  FieldShell,
  TextField,
  TextAreaField,
  SelectField,
  RadioGroupField,
  CheckboxGroupField,
} from "@/components/form/fields";
import { SelectDepartamento, SelectMunicipio } from "@/components/form/DepartamentoMunicipio";
import { RepeatableSection } from "@/components/form/Repeatable";
import { SoportesUploader } from "@/components/admin/SoportesUploader";
import {
  SEXO,
  IDENTIFICACION,
  ROL_LIDERAZGO,
  RURAL_URBANO,
  ES_PREDIO_REFORMA_AGRARIA,
  ACTOR_RESPONSABLE,
  ESTADO_SITUACION,
  SI_NO,
  SI_NO_NOSABE,
  TIPOLOGIA_HECHO,
  MEDIOS_UTILIZADOS,
  VESTIMENTA,
  MOVILIZACION,
  TIPO_AMENAZA,
  SOPORTES_DISPONIBLES,
  VINCULO_PREDIO,
  ESTADO_PROCESO_AGRARIO,
  RELACION_HECHO_RA,
  CRUCE_BASE_PREDIOS,
  RESOLUCION_ANT,
  SE_CONOCE_NO,
  MEDIDAS_AUTOPROTECCION,
  ENTIDAD_PROTECCION,
  TIPO_MEDIDA_PROTECCION,
  ESTADO_SOLICITUD_PROTECCION,
  TIPO_PRESUNTO_RESPONSABLE,
  INSTITUCION_FUERZA_PUBLICA,
  RANGO_CARGO,
  ROL_GRUPO_ARMADO,
  COMO_ESTABLECIO_PERTENENCIA,
  INTERES_SOBRE_PREDIO,
  CAUSAS_HECHO,
  RUTA_JURIDICA,
} from "@/lib/catalogos";

const FUERZA_PUBLICA_VALORES = ["fuerza_militar", "policia_nacional", "otro_organismo_estatal"];
const GRUPO_ARMADO_VALORES = ["grupo_armado_ilegal", "paramilitar"];
const PARTICULAR_VALORES = ["particular", "empresa_privada", "otro"];

export function FormularioAmpliado({ caso }: { caso: Caso }) {
  const router = useRouter();
  const [data, setData] = useState<CasoData>(caso.data);
  const [guardando, setGuardando] = useState<"borrador" | "final" | null>(null);
  const [mensaje, setMensaje] = useState<string | null>(null);

  function set<K extends keyof CasoData>(key: K, value: CasoData[K]) {
    setData((d) => ({ ...d, [key]: value }));
  }

  async function guardar(marcarCompleto: boolean) {
    setGuardando(marcarCompleto ? "final" : "borrador");
    setMensaje(null);
    try {
      const res = await fetch(`/api/admin/casos/${encodeURIComponent(caso.radicado)}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          data,
          marcarAmpliadoCompleto: marcarCompleto || undefined,
          draft: marcarCompleto ? false : undefined,
        }),
      });
      if (!res.ok) {
        setMensaje("No se pudo guardar. Intente de nuevo.");
        return;
      }
      setMensaje(
        marcarCompleto
          ? "Información guardada correctamente y asociada al radicado."
          : "Borrador guardado."
      );
      router.refresh();
    } finally {
      setGuardando(null);
    }
  }

  const primeraVez = data.primeraVezPersona === "no" || data.primeraVezOrganizacion === "no";

  return (
    <div className="space-y-6 pb-24">
      {mensaje && (
        <div className="card border-hoja-300 bg-hoja-50 text-hoja-800 font-medium sticky top-16 z-10">
          {mensaje}
        </div>
      )}

      <section className="card space-y-4">
        <h2 className="section-title">🧑‍🌾 1. Datos de quien denuncia</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldShell label="Nombre" required>
            <TextField value={data.nombre ?? ""} onChange={(v) => set("nombre", v)} />
          </FieldShell>
          <FieldShell label="Apellido" required>
            <TextField value={data.apellido ?? ""} onChange={(v) => set("apellido", v)} />
          </FieldShell>
        </div>
        <FieldShell label="Sexo" required>
          <RadioGroupField name="sexo" value={data.sexo ?? ""} onChange={(v) => set("sexo", v)} options={SEXO} />
        </FieldShell>
        <FieldShell label="Edad" rojo>
          <TextField value={data.edad ?? ""} onChange={(v) => set("edad", v)} type="number" />
        </FieldShell>
        <FieldShell label="Identificación (puede marcar más de una)" rojo>
          <CheckboxGroupField value={data.identificacion ?? []} onChange={(v) => set("identificacion", v)} options={IDENTIFICACION} />
        </FieldShell>
        <FieldShell label="Rol o liderazgo específico" rojo>
          <SelectField value={data.rolLiderazgo ?? ""} onChange={(v) => set("rolLiderazgo", v)} options={ROL_LIDERAZGO} />
        </FieldShell>
        {data.rolLiderazgo === "otro" && (
          <FieldShell label="¿Cuál?" rojo>
            <TextField value={data.rolLiderazgoOtro ?? ""} onChange={(v) => set("rolLiderazgoOtro", v)} />
          </FieldShell>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">🌾 Vínculo del hecho con la Reforma Agraria</h2>
        <p className="text-xs text-tierra-500">
          Identifica el predio relacionado con el hecho y cruza la información con la base de
          predios de la Red. Los números de matrícula, catastro y demás datos de ubicación
          exacta son de uso interno y no se publican en alertas o comunicados.
        </p>
        <RepeatableSection<Predio>
          items={data.predios ?? []}
          onChange={(v) => set("predios", v)}
          nuevo={() => ({})}
          etiquetaAgregar="Agregar otro predio"
          etiquetaVacio="No se han registrado predios."
          render={(p, _i, update) => (
            <div className="space-y-3">
              <div className="grid sm:grid-cols-2 gap-3">
                <FieldShell label="Nombre del predio"><TextField value={p.nombrePredio ?? ""} onChange={(v) => update({ nombrePredio: v })} /></FieldShell>
                <FieldShell label="Vereda"><TextField value={p.vereda ?? ""} onChange={(v) => update({ vereda: v })} /></FieldShell>
                <FieldShell label="Departamento"><SelectDepartamento value={p.departamento ?? ""} onChange={(v) => update({ departamento: v, municipio: "" })} /></FieldShell>
                <FieldShell label="Municipio"><SelectMunicipio departamento={p.departamento ?? ""} value={p.municipio ?? ""} onChange={(v) => update({ municipio: v })} /></FieldShell>
              </div>
              <div className="grid sm:grid-cols-3 gap-3">
                <FieldShell label="Número de resolución de adjudicación ANT"><SelectField value={p.resolucionAnt ?? ""} onChange={(v) => update({ resolucionAnt: v })} options={RESOLUCION_ANT} /></FieldShell>
                <FieldShell label="Matrícula inmobiliaria"><SelectField value={p.matriculaInmobiliaria ?? ""} onChange={(v) => update({ matriculaInmobiliaria: v })} options={SE_CONOCE_NO} /></FieldShell>
                <FieldShell label="Código o número predial catastral"><SelectField value={p.codigoCatastral ?? ""} onChange={(v) => update({ codigoCatastral: v })} options={SE_CONOCE_NO} /></FieldShell>
              </div>
              <FieldShell label="Vínculo de la persona u organización con el predio">
                <CheckboxGroupField value={p.vinculoPredio ?? []} onChange={(v) => update({ vinculoPredio: v })} options={VINCULO_PREDIO} />
              </FieldShell>
              <FieldShell label="Nombre de la organización o asociación relacionada, si aplica">
                <TextField value={p.organizacionNombre ?? ""} onChange={(v) => update({ organizacionNombre: v })} />
              </FieldShell>
              <div className="grid sm:grid-cols-2 gap-3">
                <FieldShell label="Estado del proceso agrario"><SelectField value={p.estadoProceso ?? ""} onChange={(v) => update({ estadoProceso: v })} options={ESTADO_PROCESO_AGRARIO} /></FieldShell>
                <FieldShell label="Número de expediente o trámite, si se conoce"><TextField value={p.numeroExpediente ?? ""} onChange={(v) => update({ numeroExpediente: v })} /></FieldShell>
              </div>
              <FieldShell label="¿Por qué se considera que el hecho está relacionado con el predio o el proceso de Reforma Agraria?">
                <CheckboxGroupField value={p.relacionHecho ?? []} onChange={(v) => update({ relacionHecho: v })} options={RELACION_HECHO_RA} />
              </FieldShell>
              <FieldShell label="Explique brevemente el vínculo identificado">
                <TextAreaField value={p.relacionExplicacion ?? ""} onChange={(v) => update({ relacionExplicacion: v })} rows={2} />
              </FieldShell>
              <div className="grid sm:grid-cols-2 gap-3">
                <FieldShell label="Cruce con la base de predios de la Red"><SelectField value={p.cruceBase ?? ""} onChange={(v) => update({ cruceBase: v })} options={CRUCE_BASE_PREDIOS} /></FieldShell>
                <FieldShell label="Código interno del predio en la base de la Red"><TextField value={p.codigoInternoPredio ?? ""} onChange={(v) => update({ codigoInternoPredio: v })} /></FieldShell>
              </div>
            </div>
          )}
        />
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">😟 2. ¿Qué le pasó?</h2>
        <FieldShell label="Narre el tipo de agresión" required>
          <TextAreaField value={data.quePasoNarracion ?? ""} onChange={(v) => set("quePasoNarracion", v)} />
        </FieldShell>
        <FieldShell label="Tipología del hecho — seleccione uno o varios, agrupados por derecho afectado" rojo>
          <div className="space-y-4">
            {TIPOLOGIA_HECHO.map((grupo) => (
              <div key={grupo.derecho}>
                <p className="text-xs font-bold text-hoja-700 uppercase tracking-wide mb-1.5">{grupo.derecho}</p>
                <CheckboxGroupField
                  value={data.tipologiaHecho ?? []}
                  onChange={(v) => set("tipologiaHecho", v)}
                  options={grupo.items}
                />
              </div>
            ))}
          </div>
        </FieldShell>
        {(data.tipologiaHecho ?? []).includes("otro_hecho") && (
          <FieldShell label="Especifique la tipología y su descripción" rojo>
            <TextAreaField value={data.tipologiaOtroDetalle ?? ""} onChange={(v) => set("tipologiaOtroDetalle", v)} rows={2} />
          </FieldShell>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">🛡️ Antecedentes y medidas de protección</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldShell label="¿Es la primera vez que la persona es amenazada o agredida?" rojo>
            <RadioGroupField name="primeraVezPersona" value={data.primeraVezPersona ?? ""} onChange={(v) => set("primeraVezPersona", v)} options={SI_NO_NOSABE} />
          </FieldShell>
          <FieldShell label="¿Es la primera vez que la organización o comunidad enfrenta hechos similares?" rojo>
            <RadioGroupField name="primeraVezOrganizacion" value={data.primeraVezOrganizacion ?? ""} onChange={(v) => set("primeraVezOrganizacion", v)} options={SI_NO_NOSABE} />
          </FieldShell>
        </div>
        {primeraVez && (
          <FieldShell label={'Antecedentes (si la respuesta anterior fue "No")'} rojo>
            <RepeatableSection<Antecedente>
              items={data.antecedentes ?? []}
              onChange={(v) => set("antecedentes", v)}
              nuevo={() => ({})}
              etiquetaAgregar="Agregar otro antecedente"
              render={(a, _i, update) => (
                <div className="grid sm:grid-cols-2 gap-3">
                  <FieldShell label="Fecha aproximada del hecho anterior"><TextField value={a.fecha ?? ""} onChange={(v) => update({ fecha: v })} /></FieldShell>
                  <FieldShell label="Tipo de hecho"><TextField value={a.tipoHecho ?? ""} onChange={(v) => update({ tipoHecho: v })} /></FieldShell>
                  <FieldShell label="Persona u organización afectada"><TextField value={a.personaOrganizacion ?? ""} onChange={(v) => update({ personaOrganizacion: v })} /></FieldShell>
                  <FieldShell label="Relación con el hecho actual"><TextField value={a.relacionHechoActual ?? ""} onChange={(v) => update({ relacionHechoActual: v })} /></FieldShell>
                  <FieldShell label="Autoridad o entidad ante la cual se denunció"><TextField value={a.autoridadDenuncia ?? ""} onChange={(v) => update({ autoridadDenuncia: v })} /></FieldShell>
                  <FieldShell label="Número de radicado, si existe"><TextField value={a.numeroRadicado ?? ""} onChange={(v) => update({ numeroRadicado: v })} /></FieldShell>
                  <FieldShell label="Estado actual del caso"><TextField value={a.estadoActual ?? ""} onChange={(v) => update({ estadoActual: v })} /></FieldShell>
                  <FieldShell label="Otro dato relevante"><TextField value={a.otroDato ?? ""} onChange={(v) => update({ otroDato: v })} /></FieldShell>
                </div>
              )}
            />
          </FieldShell>
        )}

        <FieldShell label="¿La víctima, organización o comunidad ha adoptado medidas de autoprotección?" rojo>
          <RadioGroupField name="autoproteccionAdoptada" value={data.autoproteccionAdoptada ?? ""} onChange={(v) => set("autoproteccionAdoptada", v)} options={SI_NO_NOSABE} />
        </FieldShell>
        {data.autoproteccionAdoptada === "si" && (
          <>
            <FieldShell label="Seleccione las medidas adoptadas" rojo>
              <CheckboxGroupField value={data.autoproteccionMedidas ?? []} onChange={(v) => set("autoproteccionMedidas", v)} options={MEDIDAS_AUTOPROTECCION} />
            </FieldShell>
            <FieldShell label="Observaciones (no incluir rutas, horarios ni ubicaciones que aumenten el riesgo)" rojo>
              <TextAreaField value={data.autoproteccionObservaciones ?? ""} onChange={(v) => set("autoproteccionObservaciones", v)} rows={2} />
            </FieldShell>
          </>
        )}

        <FieldShell label="¿Se han solicitado medidas de protección ante una entidad estatal?" rojo>
          <RadioGroupField name="proteccionSolicitada" value={data.proteccionSolicitada ?? ""} onChange={(v) => set("proteccionSolicitada", v)} options={SI_NO_NOSABE} />
        </FieldShell>
        {data.proteccionSolicitada === "si" && (
          <>
            <FieldShell label="Entidad ante la cual se solicitaron" rojo>
              <CheckboxGroupField value={data.proteccionEntidades ?? []} onChange={(v) => set("proteccionEntidades", v)} options={ENTIDAD_PROTECCION} />
            </FieldShell>
            <FieldShell label="Tipo de medida" rojo>
              <CheckboxGroupField value={data.proteccionTipoMedida ?? []} onChange={(v) => set("proteccionTipoMedida", v)} options={TIPO_MEDIDA_PROTECCION} />
            </FieldShell>
            <FieldShell label="Estado actual de la solicitud o medida" rojo>
              <SelectField value={data.proteccionEstadoSolicitud ?? ""} onChange={(v) => set("proteccionEstadoSolicitud", v)} options={ESTADO_SOLICITUD_PROTECCION} />
            </FieldShell>
            <div className="grid sm:grid-cols-2 gap-3">
              <FieldShell label="Número de radicado o acto administrativo, si existe" rojo><TextField value={data.proteccionNumeroRadicado ?? ""} onChange={(v) => set("proteccionNumeroRadicado", v)} /></FieldShell>
              <FieldShell label="Fecha de la solicitud o última actuación" rojo><TextField value={data.proteccionFecha ?? ""} onChange={(v) => set("proteccionFecha", v)} /></FieldShell>
            </div>
            <FieldShell label="Observaciones sobre la protección" rojo>
              <TextAreaField value={data.proteccionObservaciones ?? ""} onChange={(v) => set("proteccionObservaciones", v)} rows={2} />
            </FieldShell>
          </>
        )}
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">📅 3. ¿Cuándo le pasó?</h2>
        <div className="grid sm:grid-cols-4 gap-3">
          <FieldShell label="Día" required><TextField value={data.cuandoDia ?? ""} onChange={(v) => set("cuandoDia", v)} /></FieldShell>
          <FieldShell label="Mes" required><TextField value={data.cuandoMes ?? ""} onChange={(v) => set("cuandoMes", v)} /></FieldShell>
          <FieldShell label="Año" required><TextField value={data.cuandoAnio ?? ""} onChange={(v) => set("cuandoAnio", v)} /></FieldShell>
          <FieldShell label="Hora" rojo><TextField value={data.cuandoHora ?? ""} onChange={(v) => set("cuandoHora", v)} type="time" /></FieldShell>
        </div>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">🗣️ 4. ¿Cómo?</h2>
        <FieldShell label="Narre los hechos y medios" required>
          <TextAreaField value={data.comoNarracion ?? ""} onChange={(v) => set("comoNarracion", v)} />
        </FieldShell>

        <FieldShell label="1. Medios utilizados — amplíe únicamente la información conocida" rojo>
          <CheckboxGroupField value={data.mediosUtilizados ?? []} onChange={(v) => set("mediosUtilizados", v)} options={MEDIOS_UTILIZADOS} />
        </FieldShell>
        <FieldShell label="Detalle: cantidad, tipo, color, marcas u otras características" rojo>
          <TextAreaField value={data.mediosDetalle ?? ""} onChange={(v) => set("mediosDetalle", v)} rows={2} />
        </FieldShell>

        <FieldShell label="2. Vestimenta de las personas involucradas" rojo>
          <CheckboxGroupField value={data.vestimenta ?? []} onChange={(v) => set("vestimenta", v)} options={VESTIMENTA} />
        </FieldShell>
        <FieldShell label="Detalle: colores, símbolos, palabras visibles" rojo>
          <TextAreaField value={data.vestimentaDetalle ?? ""} onChange={(v) => set("vestimentaDetalle", v)} rows={2} />
        </FieldShell>

        <FieldShell label="3. Cómo se movilizaban los victimarios" rojo>
          <CheckboxGroupField value={data.movilizacion ?? []} onChange={(v) => set("movilizacion", v)} options={MOVILIZACION} />
        </FieldShell>

        <FieldShell label="4. Amenazas o mensajes" rojo>
          <CheckboxGroupField value={data.amenazasTipo ?? []} onChange={(v) => set("amenazasTipo", v)} options={TIPO_AMENAZA} />
        </FieldShell>
        <FieldShell label="Detalle: palabras principales, a quién iban dirigidas, medio y qué exigían" rojo>
          <TextAreaField value={data.amenazasDetalle ?? ""} onChange={(v) => set("amenazasDetalle", v)} rows={2} />
        </FieldShell>

        <FieldShell label="5. Documentos presuntamente falsos o irregulares (si aplica)" rojo>
          <div className="grid sm:grid-cols-2 gap-3">
            <TextField value={data.documentoFalsoTipoFecha ?? ""} onChange={(v) => set("documentoFalsoTipoFecha", v)} placeholder="Tipo y fecha del documento" />
            <TextField value={data.documentoFalsoEntidad ?? ""} onChange={(v) => set("documentoFalsoEntidad", v)} placeholder="Entidad o autoridad que dice emitirlo" />
            <TextField value={data.documentoFalsoRadicado ?? ""} onChange={(v) => set("documentoFalsoRadicado", v)} placeholder="Número de radicado o proceso" />
            <TextField value={data.documentoFalsoFirmante ?? ""} onChange={(v) => set("documentoFalsoFirmante", v)} placeholder="Persona que lo firma" />
            <TextField value={data.documentoFalsoUso ?? ""} onChange={(v) => set("documentoFalsoUso", v)} placeholder="Para qué fue utilizado" />
            <TextField value={data.documentoFalsoElementos ?? ""} onChange={(v) => set("documentoFalsoElementos", v)} placeholder="Qué elementos parecen falsos" />
            <TextField value={data.documentoFalsoVerificar ?? ""} onChange={(v) => set("documentoFalsoVerificar", v)} placeholder="Ante qué entidad puede verificarse" />
          </div>
        </FieldShell>

        <FieldShell label="6. Soportes disponibles" rojo>
          <CheckboxGroupField value={data.soportesDisponibles ?? []} onChange={(v) => set("soportesDisponibles", v)} options={SOPORTES_DISPONIBLES} />
        </FieldShell>
        <FieldShell label="Cargar soportes (fotografías, videos, audios, documentos)" rojo>
          <SoportesUploader radicado={caso.radicado} soportesIniciales={caso.soportes} />
        </FieldShell>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">🗺️ 6. ¿Dónde sucedió?</h2>
        <div className="grid sm:grid-cols-2 gap-4">
          <FieldShell label="Departamento" required>
            <SelectDepartamento value={data.departamento ?? ""} onChange={(v) => setData((d) => ({ ...d, departamento: v, municipio: "" }))} />
          </FieldShell>
          <FieldShell label="Municipio" required>
            <SelectMunicipio departamento={data.departamento ?? ""} value={data.municipio ?? ""} onChange={(v) => set("municipio", v)} />
          </FieldShell>
        </div>
        <FieldShell label="¿Rural o urbano?" required>
          <RadioGroupField name="ruralUrbano" value={data.ruralUrbano ?? ""} onChange={(v) => set("ruralUrbano", v)} options={RURAL_URBANO} />
        </FieldShell>
        {data.ruralUrbano === "urbano" && (
          <FieldShell label="Comuna, zona, barrio y/o sector">
            <TextField value={data.urbanoDetalle ?? ""} onChange={(v) => set("urbanoDetalle", v)} />
          </FieldShell>
        )}
        {data.ruralUrbano === "rural" && (
          <FieldShell label="Corregimiento y vereda, finca o zona">
            <TextField value={data.ruralDetalle ?? ""} onChange={(v) => set("ruralDetalle", v)} />
          </FieldShell>
        )}
        <FieldShell label="¿Es predio de Reforma Agraria?" required>
          <RadioGroupField name="esPredioRA" value={data.esPredioReformaAgraria ?? ""} onChange={(v) => set("esPredioReformaAgraria", v)} options={ES_PREDIO_REFORMA_AGRARIA} />
        </FieldShell>
        <FieldShell label="Coordenadas geográficas o punto de referencia" rojo>
          <TextField value={data.coordenadas ?? ""} onChange={(v) => set("coordenadas", v)} placeholder="lat, lon" />
        </FieldShell>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">🎯 7. ¿Por quién(es)?</h2>
        <FieldShell label="Categoría general del/los presunto(s) responsable(s)" required>
          <CheckboxGroupField value={data.actores ?? []} onChange={(v) => set("actores", v)} options={ACTOR_RESPONSABLE} />
        </FieldShell>
        {(data.actores ?? []).includes("otros") && (
          <FieldShell label="¿Cuál?"><TextField value={data.actoresOtroDetalle ?? ""} onChange={(v) => set("actoresOtroDetalle", v)} /></FieldShell>
        )}

        <FieldShell label="Datos sobre el (los) autor(es) del hecho victimizante" rojo>
          <RepeatableSection<Autor>
            items={data.autores ?? []}
            onChange={(v) => set("autores", v)}
            nuevo={() => ({})}
            etiquetaAgregar="Agregar otro presunto responsable"
            etiquetaVacio="No se han registrado presuntos responsables."
            render={(a, _i, update) => (
              <div className="space-y-3">
                <div className="grid sm:grid-cols-2 gap-3">
                  <FieldShell label="Nombre y apellidos, si se conocen"><TextField value={a.nombreApellidos ?? ""} onChange={(v) => update({ nombreApellidos: v })} /></FieldShell>
                  <FieldShell label="Alias, cargo o nombre con el que se presentó"><TextField value={a.aliasCargo ?? ""} onChange={(v) => update({ aliasCargo: v })} /></FieldShell>
                  <FieldShell label="Número aproximado de personas"><TextField value={a.numeroAprox ?? ""} onChange={(v) => update({ numeroAprox: v })} /></FieldShell>
                  <FieldShell label="Sexo o género percibido"><TextField value={a.sexoGenero ?? ""} onChange={(v) => update({ sexoGenero: v })} /></FieldShell>
                  <FieldShell label="Edad exacta o aproximada"><TextField value={a.edad ?? ""} onChange={(v) => update({ edad: v })} /></FieldShell>
                  <FieldShell label="Número de identificación, si se conoce"><TextField value={a.numeroIdentificacion ?? ""} onChange={(v) => update({ numeroIdentificacion: v })} /></FieldShell>
                </div>
                <FieldShell label="Tipo de presunto responsable">
                  <CheckboxGroupField value={a.tipoResponsable ?? []} onChange={(v) => update({ tipoResponsable: v })} options={TIPO_PRESUNTO_RESPONSABLE} />
                </FieldShell>

                {(a.tipoResponsable ?? []).some((v) => FUERZA_PUBLICA_VALORES.includes(v)) && (
                  <div className="rounded-lg bg-cielo-50 border border-cielo-100 p-3 space-y-3">
                    <p className="text-xs font-bold text-cielo-800 uppercase">Si es integrante de la Fuerza Pública o agente estatal</p>
                    <FieldShell label="Institución a la que presuntamente pertenece"><SelectField value={a.fpInstitucion ?? ""} onChange={(v) => update({ fpInstitucion: v })} options={INSTITUCION_FUERZA_PUBLICA} /></FieldShell>
                    <FieldShell label="Unidad o dependencia, si se conoce"><TextField value={a.fpUnidad ?? ""} onChange={(v) => update({ fpUnidad: v })} /></FieldShell>
                    <FieldShell label="Rango o cargo"><SelectField value={a.fpRango ?? ""} onChange={(v) => update({ fpRango: v })} options={RANGO_CARGO} /></FieldShell>
                  </div>
                )}

                {(a.tipoResponsable ?? []).some((v) => GRUPO_ARMADO_VALORES.includes(v)) && (
                  <div className="rounded-lg bg-alerta-50 border border-alerta-100 p-3 space-y-3">
                    <p className="text-xs font-bold text-alerta-800 uppercase">Si pertenece a un grupo armado</p>
                    <FieldShell label="Nombre con el que se identificó el grupo"><TextField value={a.gaNombreGrupo ?? ""} onChange={(v) => update({ gaNombreGrupo: v })} /></FieldShell>
                    <FieldShell label="Estructura, frente, bloque o unidad, si se conoce"><TextField value={a.gaEstructura ?? ""} onChange={(v) => update({ gaEstructura: v })} /></FieldShell>
                    <FieldShell label="Rol o rango"><SelectField value={a.gaRol ?? ""} onChange={(v) => update({ gaRol: v })} options={ROL_GRUPO_ARMADO} /></FieldShell>
                    <FieldShell label="¿Cómo se estableció esa posible pertenencia?">
                      <CheckboxGroupField value={a.gaComoEstablecio ?? []} onChange={(v) => update({ gaComoEstablecio: v })} options={COMO_ESTABLECIO_PERTENENCIA} />
                    </FieldShell>
                  </div>
                )}

                {(a.tipoResponsable ?? []).some((v) => PARTICULAR_VALORES.includes(v)) && (
                  <div className="rounded-lg bg-tierra-100 border border-tierra-200 p-3 space-y-3">
                    <p className="text-xs font-bold text-tierra-800 uppercase">Si es un particular o existe posible fraude documental</p>
                    <FieldShell label="Nombre, alias o cargo que dijo tener"><TextField value={a.pfNombreAliasCargo ?? ""} onChange={(v) => update({ pfNombreAliasCargo: v })} /></FieldShell>
                    <FieldShell label="Entidad, despacho, empresa o fundación que dijo representar"><TextField value={a.pfEntidad ?? ""} onChange={(v) => update({ pfEntidad: v })} /></FieldShell>
                    <FieldShell label="Documento presentado"><TextField value={a.pfDocumento ?? ""} onChange={(v) => update({ pfDocumento: v })} /></FieldShell>
                    <FieldShell label="Elementos que parecen falsos o irregulares"><TextField value={a.pfElementosFalsos ?? ""} onChange={(v) => update({ pfElementosFalsos: v })} /></FieldShell>
                    <FieldShell label="Posible interés sobre el predio"><SelectField value={a.pfInteresPredio ?? ""} onChange={(v) => update({ pfInteresPredio: v })} options={INTERES_SOBRE_PREDIO} /></FieldShell>
                    <FieldShell label="Autoridad ante la que presentó o intentó acreditar su calidad"><TextField value={a.pfAutoridadPresento ?? ""} onChange={(v) => update({ pfAutoridadPresento: v })} /></FieldShell>
                  </div>
                )}
              </div>
            )}
          />
        </FieldShell>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">⏳ 8. ¿Qué está pasando con esta situación?</h2>
        <FieldShell label="Seleccione una opción" required>
          <RadioGroupField name="estadoSituacion" value={data.estadoSituacion ?? ""} onChange={(v) => set("estadoSituacion", v)} options={ESTADO_SITUACION} />
        </FieldShell>
        <FieldShell label="Detalle (amplíe la información)" rojo>
          <TextAreaField value={data.estadoSituacionDetalleRed ?? ""} onChange={(v) => set("estadoSituacionDetalleRed", v)} rows={2} />
        </FieldShell>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">❓ 9. ¿Cuál es la razón del hecho?</h2>
        <FieldShell label="Respuesta de quien denuncia" required>
          <TextAreaField value={data.razonHechoTexto ?? ""} onChange={(v) => set("razonHechoTexto", v)} rows={3} />
        </FieldShell>
        <FieldShell label="Marque la(s) hipótesis sobre la razón del hecho" rojo>
          <CheckboxGroupField value={data.causas ?? []} onChange={(v) => set("causas", v)} options={CAUSAS_HECHO} />
        </FieldShell>
        <FieldShell label="Detalle (amplíe la información)" rojo>
          <TextAreaField value={data.causaDetalleRed ?? ""} onChange={(v) => set("causaDetalleRed", v)} rows={2} />
        </FieldShell>
      </section>

      <section className="card space-y-4">
        <h2 className="section-title">📞 10. Contacto seguro de seguimiento</h2>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldShell label="Medio de contacto preferido" rojo><TextField value={data.contactoMedioPreferido ?? ""} onChange={(v) => set("contactoMedioPreferido", v)} /></FieldShell>
          <FieldShell label="Persona intermediaria de confianza (si aplica)" rojo><TextField value={data.contactoPersonaIntermediaria ?? ""} onChange={(v) => set("contactoPersonaIntermediaria", v)} /></FieldShell>
          <FieldShell label="Horarios en que es seguro comunicarse" rojo><TextField value={data.contactoHorarios ?? ""} onChange={(v) => set("contactoHorarios", v)} /></FieldShell>
          <FieldShell label="Precauciones a tener en cuenta" rojo><TextField value={data.contactoPrecauciones ?? ""} onChange={(v) => set("contactoPrecauciones", v)} /></FieldShell>
        </div>
        <h3 className="font-bold text-tierra-700 text-sm">Punto focal que diligencia</h3>
        <div className="grid sm:grid-cols-2 gap-3">
          <FieldShell label="Nombre" rojo><TextField value={data.puntoFocalNombre ?? ""} onChange={(v) => set("puntoFocalNombre", v)} /></FieldShell>
          <FieldShell label="Organización / punto focal territorial" rojo><TextField value={data.puntoFocalOrganizacion ?? ""} onChange={(v) => set("puntoFocalOrganizacion", v)} /></FieldShell>
        </div>
      </section>

      <section className="card space-y-4 border-2 border-cielo-200">
        <h2 className="section-title">🔒 11. Consentimiento informado</h2>
        <FieldShell label="¿La persona autoriza el tratamiento de sus datos personales conforme a la Ley 1581 de 2012 (Habeas Data)?" required>
          <RadioGroupField name="consentimiento" value={data.consentimientoHabeasData ?? ""} onChange={(v) => set("consentimientoHabeasData", v)} options={SI_NO} />
        </FieldShell>
      </section>

      <section className="card space-y-4 border-2 border-hoja-300">
        <h2 className="section-title">⚖️ 12. Tipo de ruta jurídica</h2>
        <FieldShell label="Seleccione una o varias — habilita la generación de anexos en la columna Acompañamiento">
          <CheckboxGroupField value={data.rutaJuridica ?? []} onChange={(v) => set("rutaJuridica", v)} options={RUTA_JURIDICA} />
        </FieldShell>
      </section>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-tierra-200 py-3 z-20">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-end gap-3">
          <a
            href={`/api/admin/casos/${encodeURIComponent(caso.radicado)}/descargar`}
            className="btn-secondary"
          >
            ⬇️ Descargar en Word
          </a>
          <button onClick={() => guardar(false)} disabled={!!guardando} className="btn-secondary">
            {guardando === "borrador" ? "Guardando…" : "Guardar borrador"}
          </button>
          <button onClick={() => guardar(true)} disabled={!!guardando} className="btn-primary">
            {guardando === "final" ? "Guardando…" : "Enviar y guardar"}
          </button>
        </div>
      </div>
    </div>
  );
}
