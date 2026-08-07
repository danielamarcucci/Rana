import { Paragraph } from "docx";
import type { Caso } from "../types";
import { nuevoDocumento, documentoABuffer, titulo, subtitulo, campo, parrafo, lineaDivisoria } from "./common";
import {
  labelDe,
  labelesDe,
  SEXO,
  RURAL_URBANO,
  ES_PREDIO_REFORMA_AGRARIA,
  ACTOR_RESPONSABLE,
  ESTADO_SITUACION,
  ESTADO_CASO,
  CANAL_RECEPCION,
  IDENTIFICACION,
  ROL_LIDERAZGO,
  tipologiaLabel,
  MEDIOS_UTILIZADOS,
  VESTIMENTA,
  MOVILIZACION,
  TIPO_AMENAZA,
  SOPORTES_DISPONIBLES,
  VINCULO_PREDIO,
  ESTADO_PROCESO_AGRARIO,
  RELACION_HECHO_RA,
  MEDIDAS_AUTOPROTECCION,
  ENTIDAD_PROTECCION,
  TIPO_MEDIDA_PROTECCION,
  ESTADO_SOLICITUD_PROTECCION,
  TIPO_PRESUNTO_RESPONSABLE,
  CAUSAS_HECHO,
  RUTA_JURIDICA,
  SI_NO_NOSABE,
} from "../catalogos";

function fecha(d: string) {
  return new Date(d).toLocaleString("es-CO", { dateStyle: "long", timeStyle: "short" });
}

export async function generarFormularioInicialDocx(caso: Caso): Promise<Buffer> {
  const d = caso.data;
  const children: Paragraph[] = [
    titulo("Ficha de recepción de datos"),
    parrafo(`Número de denuncia: ${caso.radicado}`, { bold: true }),
    campo("Fecha de recepción", fecha(caso.createdAt)),
    campo("Canal de recepción", labelDe(CANAL_RECEPCION, caso.canalRecepcion)),
    lineaDivisoria(),

    subtitulo("1. Datos de quien denuncia"),
    campo("Nombre", d.nombre),
    campo("Apellido", d.apellido),
    campo("Sexo", labelDe(SEXO, d.sexo)),

    subtitulo("2. ¿Qué le pasó?"),
    parrafo(d.quePasoNarracion || ""),

    subtitulo("3. ¿Cuándo le pasó?"),
    campo("Fecha del hecho", `${d.cuandoDia ?? "?"}/${d.cuandoMes ?? "?"}/${d.cuandoAnio ?? "?"}`),

    subtitulo("4. ¿Cómo?"),
    parrafo(d.comoNarracion || ""),

    subtitulo("6. ¿Dónde sucedió?"),
    campo("Departamento", d.departamento),
    campo("Municipio", d.municipio),
    campo("Zona", labelDe(RURAL_URBANO, d.ruralUrbano)),
    campo("¿Es predio de Reforma Agraria?", labelDe(ES_PREDIO_REFORMA_AGRARIA, d.esPredioReformaAgraria)),

    subtitulo("7. ¿Por quién(es)?"),
    campo("Presuntos responsables", labelesDe(ACTOR_RESPONSABLE, d.actores).join(", ") || d.actoresOtroDetalle || ""),

    subtitulo("8. ¿Qué está pasando con esta situación?"),
    campo("Estado de la situación", labelDe(ESTADO_SITUACION, d.estadoSituacion)),

    subtitulo("9. ¿Cuál es la razón del hecho?"),
    parrafo(d.razonHechoTexto || ""),

    lineaDivisoria(),
    campo("Consentimiento informado (Ley 1581 de 2012 – Habeas Data)", labelDe(SI_NO_NOSABE, d.consentimientoHabeasData)),
  ];

  const doc = nuevoDocumento(children, `Formulario de denuncia ${caso.radicado}`);
  return documentoABuffer(doc);
}

export async function generarFormularioAmpliadoDocx(caso: Caso): Promise<Buffer> {
  const d = caso.data;
  const children: Paragraph[] = [
    titulo("Formulario ampliado de denuncia"),
    parrafo(`Número de radicado: ${caso.radicado}`, { bold: true }),
    campo("Fecha de recepción", fecha(caso.createdAt)),
    campo("Última actualización", fecha(caso.updatedAt)),
    campo("Canal de recepción", labelDe(CANAL_RECEPCION, caso.canalRecepcion) + (caso.medioManual ? ` (${caso.medioManual})` : "")),
    campo("Estado del caso", labelDe(ESTADO_CASO, caso.estado)),
    lineaDivisoria(),

    subtitulo("1. Datos de quien denuncia"),
    campo("Nombre", d.nombre),
    campo("Apellido", d.apellido),
    campo("Sexo", labelDe(SEXO, d.sexo)),
    campo("Edad", d.edad),
    campo("Identificación", labelesDe(IDENTIFICACION, d.identificacion).join(", ")),
    campo("Rol o liderazgo específico", labelDe(ROL_LIDERAZGO, d.rolLiderazgo) + (d.rolLiderazgoOtro ? `: ${d.rolLiderazgoOtro}` : "")),

    subtitulo("Vínculo del hecho con la Reforma Agraria"),
    ...(d.predios && d.predios.length
      ? d.predios.flatMap((p, i) => [
          parrafo(`Predio ${i + 1}: ${p.nombrePredio || "sin nombre"}`, { bold: true }),
          campo("Departamento / Municipio / Vereda", `${p.departamento || ""} / ${p.municipio || ""} / ${p.vereda || ""}`),
          campo("Resolución de adjudicación ANT", p.resolucionAnt),
          campo("Matrícula inmobiliaria", p.matriculaInmobiliaria),
          campo("Código catastral", p.codigoCatastral),
          campo("Vínculo con el predio", labelesDe(VINCULO_PREDIO, p.vinculoPredio).join(", ")),
          campo("Organización relacionada", p.organizacionNombre),
          campo("Estado del proceso agrario", labelDe(ESTADO_PROCESO_AGRARIO, p.estadoProceso)),
          campo("Número de expediente", p.numeroExpediente),
          campo("Relación entre el hecho y la Reforma Agraria", labelesDe(RELACION_HECHO_RA, p.relacionHecho).join(", ")),
          parrafo(p.relacionExplicacion || ""),
          campo("Cruce con la base de predios de la Red", p.cruceBase),
          campo("Código interno del predio", p.codigoInternoPredio),
        ])
      : [parrafo("No se registraron predios asociados.")]),

    subtitulo("2. ¿Qué le pasó?"),
    parrafo(d.quePasoNarracion || ""),
    campo(
      "Tipología del hecho",
      (d.tipologiaHecho || [])
        .map((t) => {
          const info = tipologiaLabel(t);
          return info ? `${info.label} (${info.derecho})` : t;
        })
        .join(", ")
    ),
    campo("Detalle de \"otro hecho\"", d.tipologiaOtroDetalle),

    subtitulo("Antecedentes y medidas de protección"),
    campo("¿Primera vez que la persona es amenazada?", labelDe(SI_NO_NOSABE, d.primeraVezPersona)),
    campo("¿Primera vez que la organización enfrenta hechos similares?", labelDe(SI_NO_NOSABE, d.primeraVezOrganizacion)),
    ...(d.antecedentes && d.antecedentes.length
      ? d.antecedentes.flatMap((a, i) => [
          parrafo(`Antecedente ${i + 1}`, { bold: true }),
          campo("Fecha aproximada", a.fecha),
          campo("Tipo de hecho", a.tipoHecho),
          campo("Persona u organización afectada", a.personaOrganizacion),
          campo("Relación con el hecho actual", a.relacionHechoActual),
          campo("Autoridad ante la que se denunció", a.autoridadDenuncia),
          campo("Número de radicado", a.numeroRadicado),
          campo("Estado actual del caso", a.estadoActual),
          campo("Otro dato relevante", a.otroDato),
        ])
      : []),
    campo("¿Se han adoptado medidas de autoprotección?", labelDe(SI_NO_NOSABE, d.autoproteccionAdoptada)),
    campo("Medidas adoptadas", labelesDe(MEDIDAS_AUTOPROTECCION, d.autoproteccionMedidas).join(", ")),
    parrafo(d.autoproteccionObservaciones || ""),
    campo("¿Se solicitaron medidas de protección estatal?", labelDe(SI_NO_NOSABE, d.proteccionSolicitada)),
    campo("Entidades", labelesDe(ENTIDAD_PROTECCION, d.proteccionEntidades).join(", ")),
    campo("Tipo de medida", labelesDe(TIPO_MEDIDA_PROTECCION, d.proteccionTipoMedida).join(", ")),
    campo("Estado de la solicitud", labelDe(ESTADO_SOLICITUD_PROTECCION, d.proteccionEstadoSolicitud)),
    campo("Número de radicado o acto administrativo", d.proteccionNumeroRadicado),
    campo("Fecha de la solicitud", d.proteccionFecha),
    parrafo(d.proteccionObservaciones || ""),

    subtitulo("3. ¿Cuándo le pasó?"),
    campo("Fecha del hecho", `${d.cuandoDia ?? "?"}/${d.cuandoMes ?? "?"}/${d.cuandoAnio ?? "?"}`),
    campo("Hora", d.cuandoHora),

    subtitulo("4. ¿Cómo?"),
    parrafo(d.comoNarracion || ""),
    campo("Medios utilizados", labelesDe(MEDIOS_UTILIZADOS, d.mediosUtilizados).join(", ")),
    parrafo(d.mediosDetalle || ""),
    campo("Vestimenta de las personas involucradas", labelesDe(VESTIMENTA, d.vestimenta).join(", ")),
    parrafo(d.vestimentaDetalle || ""),
    campo("Cómo se movilizaban", labelesDe(MOVILIZACION, d.movilizacion).join(", ")),
    campo("Amenazas o mensajes", labelesDe(TIPO_AMENAZA, d.amenazasTipo).join(", ")),
    parrafo(d.amenazasDetalle || ""),
    campo("Documentos presuntamente falsos: tipo y fecha", d.documentoFalsoTipoFecha),
    campo("Entidad que dice emitirlo", d.documentoFalsoEntidad),
    campo("Número de radicado o proceso", d.documentoFalsoRadicado),
    campo("Persona que lo firma", d.documentoFalsoFirmante),
    campo("Para qué fue utilizado", d.documentoFalsoUso),
    campo("Qué elementos parecen falsos", d.documentoFalsoElementos),
    campo("Ante qué entidad puede verificarse", d.documentoFalsoVerificar),
    campo("Soportes disponibles", labelesDe(SOPORTES_DISPONIBLES, d.soportesDisponibles).join(", ")),
    campo("Archivos adjuntos", (caso.soportes || []).map((s) => s.nombreOriginal).join(", ")),

    subtitulo("6. ¿Dónde sucedió?"),
    campo("Departamento", d.departamento),
    campo("Municipio", d.municipio),
    campo("Zona", labelDe(RURAL_URBANO, d.ruralUrbano)),
    campo("Detalle urbano (comuna/zona/barrio)", d.urbanoDetalle),
    campo("Detalle rural (corregimiento/vereda/finca)", d.ruralDetalle),
    campo("¿Es predio de Reforma Agraria?", labelDe(ES_PREDIO_REFORMA_AGRARIA, d.esPredioReformaAgraria)),
    campo("Coordenadas geográficas o punto de referencia", d.coordenadas),

    subtitulo("7. ¿Por quién(es)?"),
    campo("Presuntos responsables (categoría general)", labelesDe(ACTOR_RESPONSABLE, d.actores).join(", ")),
    campo("Otros, ¿cuál?", d.actoresOtroDetalle),
    ...(d.autores && d.autores.length
      ? d.autores.flatMap((a, i) => [
          parrafo(`Presunto responsable ${i + 1}`, { bold: true }),
          campo("Nombre y apellidos", a.nombreApellidos),
          campo("Alias, cargo o nombre con el que se presentó", a.aliasCargo),
          campo("Número aproximado de personas", a.numeroAprox),
          campo("Sexo o género percibido", a.sexoGenero),
          campo("Edad exacta o aproximada", a.edad),
          campo("Número de identificación", a.numeroIdentificacion),
          campo("Tipo de presunto responsable", labelesDe(TIPO_PRESUNTO_RESPONSABLE, a.tipoResponsable).join(", ")),
          campo("Institución (Fuerza Pública)", a.fpInstitucion),
          campo("Unidad o dependencia", a.fpUnidad),
          campo("Rango o cargo", a.fpRango),
          campo("Nombre del grupo armado", a.gaNombreGrupo),
          campo("Estructura, frente o bloque", a.gaEstructura),
          campo("Rol o rango", a.gaRol),
          campo("Cómo se estableció la pertenencia", (a.gaComoEstablecio || []).join(", ")),
          campo("Nombre/alias/cargo (particular)", a.pfNombreAliasCargo),
          campo("Entidad que dijo representar", a.pfEntidad),
          campo("Documento presentado", a.pfDocumento),
          campo("Elementos que parecen falsos", a.pfElementosFalsos),
          campo("Posible interés sobre el predio", a.pfInteresPredio),
          campo("Autoridad ante la que acreditó su calidad", a.pfAutoridadPresento),
        ])
      : []),

    subtitulo("8. ¿Qué está pasando con esta situación?"),
    campo("Estado de la situación", labelDe(ESTADO_SITUACION, d.estadoSituacion)),
    parrafo(d.estadoSituacionDetalleRed || ""),

    subtitulo("9. ¿Cuál es la razón del hecho?"),
    parrafo(d.razonHechoTexto || ""),
    campo("Hipótesis sobre la causa", labelesDe(CAUSAS_HECHO, d.causas).join(", ")),
    parrafo(d.causaDetalleRed || ""),

    subtitulo("10. Contacto seguro de seguimiento"),
    campo("Medio de contacto preferido", d.contactoMedioPreferido),
    campo("Persona intermediaria de confianza", d.contactoPersonaIntermediaria),
    campo("Horarios seguros para comunicarse", d.contactoHorarios),
    campo("Precauciones a tener en cuenta", d.contactoPrecauciones),

    subtitulo("Punto focal que diligencia"),
    campo("Nombre / organización / punto focal territorial", `${d.puntoFocalNombre || ""} ${d.puntoFocalOrganizacion ? "– " + d.puntoFocalOrganizacion : ""}`),

    subtitulo("11. Consentimiento informado"),
    campo("¿Autoriza el tratamiento de datos personales (Ley 1581 de 2012)?", labelDe(SI_NO_NOSABE, d.consentimientoHabeasData)),

    subtitulo("12. Tipo de ruta jurídica"),
    campo("Ruta(s) jurídica(s)", labelesDe(RUTA_JURIDICA, d.rutaJuridica).join(", ")),
  ];

  const doc = nuevoDocumento(children, `Formulario ampliado ${caso.radicado}`);
  return documentoABuffer(doc);
}
