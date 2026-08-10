import type { Caso, AnexoTipo } from "../types";
import {
  labelesDe,
  ACTOR_RESPONSABLE,
  ESTADO_SITUACION,
  tipologiaLabel,
  ESTADO_PROCESO_AGRARIO,
} from "../catalogos";

// Motor de análisis del caso basado en reglas fijas (sin inteligencia
// artificial): a partir de lo que el equipo de la Red ya registró en el
// formulario, organiza la información y sugiere ruta jurídica, urgencia,
// autoridades competentes y pendientes. Nunca inventa datos: todo lo que
// muestra proviene de un campo concreto del formulario.

export type NivelUrgencia = "ordinario" | "prioritario" | "inmediato";

export type RutaSugerida = { ruta: AnexoTipo; razon: string };

export type AutoridadCompetente = { entidad: string; razon: string };

export type CaseAnalysis = {
  rutasSeleccionadas: AnexoTipo[];
  rutasSugeridas: RutaSugerida[];
  sintesisCaso: string;
  derechosAfectados: string[];
  hechosCorroborados: string[];
  hechosReportados: string[];
  hipotesis: string[];
  pendientesCriticos: string[];
  vinculoAgrario: string;
  autoridadesCompetentes: AutoridadCompetente[];
  alertasPrivacidad: string[];
  nivelUrgencia: NivelUrgencia;
  urgenciaRazon: string;
};

const HECHOS_URGENCIA_INMEDIATA = [
  "homicidio",
  "secuestro_simple",
  "secuestro_extorsivo",
  "artefacto_explosivo",
  "tortura",
];

const HECHOS_URGENCIA_PRIORITARIA = [
  "amenaza",
  "intimidacion",
  "despojo_forzado",
  "abandono_forzado",
  "restricciones_movilidad",
  "confinamiento",
  "presencia_armados",
];

const ESTADOS_RIESGO_VIGENTE = [
  "podria_pasar",
  "puede_pasar_pronto",
  "esta_pasando_ahora",
  "ha_pasado_varias_veces",
];

const ESTADOS_HECHO_CONSUMADO = ["ya_paso", "ya_se_detuvo"];

const ESTADOS_PROCESO_CON_TRAMITE = [
  "en_tramite_ant",
  "en_adjudicacion",
  "en_formalizacion",
  "con_solicitud_revocatoria",
  "con_riesgo_desalojo",
  "en_disputa",
  "con_proceso_judicial",
  "con_medida_cautelar",
];

const RUTA_A_CAMPO: Record<AnexoTipo, string> = {
  derecho_peticion: "derecho_peticion",
  denuncia_publica: "denuncia_publica",
  alerta_agraria: "alerta",
};

function estaCorroborado(caso: Caso) {
  return ["corroborado", "en_ruta_juridica", "cerrado"].includes(caso.estado);
}

function calcularRutasSugeridas(caso: Caso): RutaSugerida[] {
  const d = caso.data;
  const sugeridas: RutaSugerida[] = [];
  const seleccionadas = new Set(d.rutaJuridica ?? []);

  if (d.estadoSituacion && ESTADOS_RIESGO_VIGENTE.includes(d.estadoSituacion) && !seleccionadas.has("alerta")) {
    sugeridas.push({
      ruta: "alerta_agraria",
      razon: `El numeral 8 indica que la situación "${labelesDe(ESTADO_SITUACION, [d.estadoSituacion])[0]}" — un riesgo vigente o inminente amerita valorar una alerta preventiva.`,
    });
  }

  if (d.estadoSituacion && ESTADOS_HECHO_CONSUMADO.includes(d.estadoSituacion) && !seleccionadas.has("denuncia_publica")) {
    sugeridas.push({
      ruta: "denuncia_publica",
      razon: `El numeral 8 indica que el hecho "${labelesDe(ESTADO_SITUACION, [d.estadoSituacion])[0]}" — al tratarse de un hecho consumado de posible interés público, valorar una denuncia pública.`,
    });
  }

  const predioConTramite = (d.predios ?? []).find(
    (p) => p.estadoProceso && ESTADOS_PROCESO_CON_TRAMITE.includes(p.estadoProceso)
  );
  if (predioConTramite && !seleccionadas.has("derecho_peticion")) {
    sugeridas.push({
      ruta: "derecho_peticion",
      razon: `El predio "${predioConTramite.nombrePredio || "registrado"}" tiene un proceso agrario activo (${ESTADO_PROCESO_AGRARIO.find((e) => e.value === predioConTramite.estadoProceso)?.label}), lo que da lugar a solicitar información o actuación mediante derecho de petición.`,
    });
  }

  return sugeridas;
}

function calcularSintesis(caso: Caso): string {
  const d = caso.data;
  const partes: string[] = [];
  const nombre = [d.nombre, d.apellido].filter(Boolean).join(" ");
  const lugar = [d.municipio, d.departamento].filter(Boolean).join(", ");
  const tip = (d.tipologiaHecho ?? []).map((t) => tipologiaLabel(t)?.label).filter(Boolean);

  if (nombre) partes.push(nombre);
  if (tip.length) partes.push(`reportó ${tip.join(", ").toLowerCase()}`);
  else if (d.quePasoNarracion) partes.push("reportó un hecho de violencia o amenaza");
  if (lugar) partes.push(`en ${lugar}`);
  if (d.cuandoDia || d.cuandoMes || d.cuandoAnio) {
    partes.push(`el ${[d.cuandoDia, d.cuandoMes, d.cuandoAnio].filter(Boolean).join(" de ")}`);
  }
  let sintesis = partes.length ? partes.join(" ") + "." : "Caso sin síntesis suficiente todavía.";
  if (d.estadoSituacion) {
    sintesis += ` Estado de la situación: ${labelesDe(ESTADO_SITUACION, [d.estadoSituacion])[0]}.`;
  }
  return sintesis;
}

function calcularUrgencia(caso: Caso): { nivel: NivelUrgencia; razon: string } {
  const d = caso.data;
  const tip = d.tipologiaHecho ?? [];

  if (tip.some((t) => HECHOS_URGENCIA_INMEDIATA.includes(t))) {
    return {
      nivel: "inmediato",
      razon: "La tipología reportada incluye un hecho contra la vida, la libertad o la integridad de alta gravedad (numeral 2).",
    };
  }
  if (d.estadoSituacion === "esta_pasando_ahora") {
    return {
      nivel: "inmediato",
      razon: 'El numeral 8 indica que la situación "está pasando ahora".',
    };
  }
  if (
    tip.some((t) => HECHOS_URGENCIA_PRIORITARIA.includes(t)) ||
    d.estadoSituacion === "puede_pasar_pronto" ||
    d.estadoSituacion === "ha_pasado_varias_veces"
  ) {
    return {
      nivel: "prioritario",
      razon: "La tipología o el estado de la situación (numerales 2 y 8) indican un riesgo próximo o recurrente.",
    };
  }
  return {
    nivel: "ordinario",
    razon: "No se identificaron señales de riesgo inmediato o recurrente en los numerales 2 y 8.",
  };
}

function calcularAutoridades(caso: Caso): AutoridadCompetente[] {
  const d = caso.data;
  const autoridades: AutoridadCompetente[] = [];
  const actores = d.actores ?? [];
  const tiposResponsable = (d.autores ?? []).flatMap((a) => a.tipoResponsable ?? []);

  if (actores.includes("ejercito") || tiposResponsable.includes("fuerza_militar")) {
    autoridades.push({ entidad: "Ministerio de Defensa / Ejército Nacional", razon: "Presunto responsable identificado como Ejército o Fuerza Militar (numeral 7)." });
  }
  if (actores.includes("policia") || tiposResponsable.includes("policia_nacional")) {
    autoridades.push({ entidad: "Policía Nacional", razon: "Presunto responsable identificado como Policía (numeral 7)." });
  }
  if (actores.includes("grupo_armado_no_estatal") || tiposResponsable.some((t) => ["grupo_armado_ilegal", "paramilitar"].includes(t))) {
    autoridades.push({ entidad: "Fiscalía General de la Nación", razon: "Presunto responsable identificado como grupo armado no estatal (numeral 7)." });
  }
  if (actores.includes("funcionarios_publicos") || tiposResponsable.includes("otro_organismo_estatal")) {
    autoridades.push({ entidad: "Procuraduría General de la Nación", razon: "Presunto responsable identificado como funcionario público (numeral 7)." });
  }
  const predioConTramite = (d.predios ?? []).find((p) => p.estadoProceso && ESTADOS_PROCESO_CON_TRAMITE.includes(p.estadoProceso));
  if (predioConTramite || (d.predios ?? []).length > 0) {
    autoridades.push({ entidad: "Agencia Nacional de Tierras (ANT)", razon: "El caso está vinculado a un predio con proceso de Reforma Agraria (bloque de vínculo agrario)." });
  }
  autoridades.push({ entidad: "Defensoría del Pueblo", razon: "Entidad de garantía de derechos, pertinente en todos los casos." });

  return autoridades;
}

function calcularPendientesCriticos(caso: Caso): string[] {
  const d = caso.data;
  const pendientes: string[] = [];
  if (!d.tipologiaHecho || d.tipologiaHecho.length === 0) {
    pendientes.push('Falta clasificar la tipología del hecho (numeral 2, solo Red) — es la base para calificar los hechos en los anexos.');
  }
  if (!d.actores || d.actores.length === 0) {
    pendientes.push("Falta indicar el/los presunto(s) responsable(s) (numeral 7).");
  }
  if (!d.predios || d.predios.length === 0) {
    pendientes.push('Falta registrar el predio relacionado con el hecho (bloque "Vínculo con la Reforma Agraria") — sin esto no se puede fundamentar el vínculo agrario en los anexos.');
  }
  if (!d.causas || d.causas.length === 0) {
    pendientes.push("Falta marcar la hipótesis sobre la razón del hecho (numeral 9, solo Red).");
  }
  if (!d.consentimientoHabeasData) {
    pendientes.push("Falta el consentimiento informado (numeral 11).");
  }
  return pendientes;
}

function calcularAlertasPrivacidad(caso: Caso): string[] {
  const d = caso.data;
  const alertas: string[] = [];
  const predioConDatosReservados = (d.predios ?? []).some(
    (p) => p.matriculaInmobiliaria || p.codigoCatastral
  );
  if (predioConDatosReservados) {
    alertas.push(
      "Hay matrícula inmobiliaria o código catastral registrados: NO deben copiarse en los anexos públicos (Alerta / Denuncia Pública). Los generadores ya los excluyen automáticamente, pero revise el texto libre por si los mencionó a mano."
    );
  }
  if (d.coordenadas) {
    alertas.push("Hay coordenadas geográficas registradas: use lenguaje general de ubicación (municipio/vereda) en los documentos públicos, no coordenadas exactas.");
  }
  if (d.autoproteccionMedidas && d.autoproteccionMedidas.length > 0) {
    alertas.push("Hay medidas de autoprotección registradas: son de uso interno y nunca deben aparecer en un documento público.");
  }
  if (d.contactoHorarios || d.contactoPrecauciones) {
    alertas.push("Hay horarios o precauciones de contacto seguro registrados: son de uso interno, no deben aparecer en documentos públicos.");
  }
  return alertas;
}

export function analizarCaso(caso: Caso): CaseAnalysis {
  const d = caso.data;
  const corroborado = estaCorroborado(caso);

  const hechosReportados: string[] = [];
  const hechosCorroborados: string[] = [];
  if (d.quePasoNarracion) (corroborado ? hechosCorroborados : hechosReportados).push(d.quePasoNarracion);
  if (d.comoNarracion) (corroborado ? hechosCorroborados : hechosReportados).push(d.comoNarracion);
  for (const a of d.antecedentes ?? []) {
    if (a.tipoHecho) hechosReportados.push(`Antecedente: ${a.tipoHecho}${a.fecha ? ` (${a.fecha})` : ""} — reportado por la fuente, sin verificar por la Red.`);
  }

  const hipotesis: string[] = [];
  if (d.razonHechoTexto) hipotesis.push(`Razón del hecho según quien denuncia: ${d.razonHechoTexto}`);
  if (d.causaDetalleRed) hipotesis.push(d.causaDetalleRed);

  const { nivel, razon } = calcularUrgencia(caso);
  const predio = (d.predios ?? [])[0];

  return {
    rutasSeleccionadas: (d.rutaJuridica ?? [])
      .map((r) => (Object.entries(RUTA_A_CAMPO).find(([, v]) => v === r)?.[0] as AnexoTipo | undefined))
      .filter((r): r is AnexoTipo => !!r),
    rutasSugeridas: calcularRutasSugeridas(caso),
    sintesisCaso: calcularSintesis(caso),
    derechosAfectados: Array.from(
      new Set((d.tipologiaHecho ?? []).map((t) => tipologiaLabel(t)?.derecho).filter((x): x is string => !!x))
    ),
    hechosCorroborados,
    hechosReportados,
    hipotesis,
    pendientesCriticos: calcularPendientesCriticos(caso),
    vinculoAgrario: predio?.relacionExplicacion || (predio ? "Predio registrado, sin explicación adicional del vínculo." : "No hay predio registrado todavía."),
    autoridadesCompetentes: calcularAutoridades(caso),
    alertasPrivacidad: calcularAlertasPrivacidad(caso),
    nivelUrgencia: nivel,
    urgenciaRazon: razon,
  };
}

export function actoresLabels(caso: Caso) {
  return labelesDe(ACTOR_RESPONSABLE, caso.data.actores);
}
