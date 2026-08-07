import type { AnexoTipo, Caso } from "../types";
import {
  labelDe,
  labelesDe,
  ACTOR_RESPONSABLE,
  VINCULO_PREDIO,
  ESTADO_PROCESO_AGRARIO,
  MEDIOS_UTILIZADOS,
  VESTIMENTA,
  TIPO_AMENAZA,
  CAUSAS_HECHO,
  tipologiaLabel,
} from "../catalogos";

const RED_EMAIL = process.env.RED_CONTACTO_EMAIL || "contacto@rednacionalreformaagraria.org";

function fechaHechoTexto(d: Caso["data"]) {
  const partes = [d.cuandoDia, d.cuandoMes, d.cuandoAnio].filter(Boolean).join(" de ");
  return d.cuandoHora ? `${partes}, ${d.cuandoHora}` : partes;
}

function nombreCompleto(d: Caso["data"]) {
  return [d.nombre, d.apellido].filter(Boolean).join(" ");
}

function tipologiaLabels(d: Caso["data"]) {
  return (d.tipologiaHecho || []).map((t) => tipologiaLabel(t)).filter(Boolean) as {
    derecho: string;
    label: string;
  }[];
}

function relatoHechosSugerido(caso: Caso) {
  const d = caso.data;
  const partes: string[] = [];
  if (d.comoNarracion) partes.push(d.comoNarracion);
  const tip = tipologiaLabels(d);
  if (tip.length) {
    partes.push(`Tipología identificada: ${tip.map((t) => `${t.label} (${t.derecho})`).join("; ")}.`);
  }
  const medios = labelesDe(MEDIOS_UTILIZADOS, d.mediosUtilizados);
  if (medios.length) partes.push(`Medios utilizados: ${medios.join(", ")}.`);
  const vest = labelesDe(VESTIMENTA, d.vestimenta);
  if (vest.length) partes.push(`Vestimenta de los responsables: ${vest.join(", ")}.`);
  const amenazas = labelesDe(TIPO_AMENAZA, d.amenazasTipo);
  if (amenazas.length && d.amenazasDetalle) {
    partes.push(`Amenazas (${amenazas.join(", ")}): ${d.amenazasDetalle}`);
  }
  return partes.join(" ");
}

function causaSugerida(caso: Caso) {
  const d = caso.data;
  const partes: string[] = [];
  const causas = labelesDe(CAUSAS_HECHO, d.causas);
  if (causas.length) partes.push(causas.join("; ") + ".");
  if (d.causaDetalleRed) partes.push(d.causaDetalleRed);
  else if (d.razonHechoTexto) partes.push(d.razonHechoTexto);
  return partes.join(" ");
}

function responsabilizamosSugerido(caso: Caso) {
  const d = caso.data;
  const actores = labelesDe(ACTOR_RESPONSABLE, d.actores);
  const autoresTxt = (d.autores || [])
    .map((a) => a.nombreApellidos || a.aliasCargo)
    .filter(Boolean);
  const partes: string[] = [];
  if (actores.length) partes.push(`Presuntos responsables: ${actores.join(", ")}${d.actoresOtroDetalle ? ` (${d.actoresOtroDetalle})` : ""}.`);
  if (autoresTxt.length) partes.push(`Identificados: ${autoresTxt.join("; ")}.`);
  return partes.join(" ");
}

function derechosEnRiesgoSugerido(caso: Caso) {
  const tip = tipologiaLabels(caso.data);
  const derechos = Array.from(new Set(tip.map((t) => t.derecho)));
  return derechos.join(", ");
}

function antecedentesSugerido(caso: Caso) {
  const d = caso.data;
  if (d.primeraVezPersona === "si" && d.primeraVezOrganizacion === "si") {
    return "Es la primera vez que la persona y la organización enfrentan hechos de este tipo.";
  }
  if (!d.antecedentes || d.antecedentes.length === 0) return "";
  return d.antecedentes
    .map(
      (a) =>
        `${a.fecha || "Fecha no precisada"}: ${a.tipoHecho || "hecho no especificado"}${a.estadoActual ? ` (estado: ${a.estadoActual})` : ""}.`
    )
    .join(" ");
}

function veredaLugarSugerido(caso: Caso) {
  const d = caso.data;
  return d.ruralUrbano === "urbano" ? d.urbanoDetalle || "" : d.ruralDetalle || "";
}

export function sugeridosPara(tipo: AnexoTipo, caso: Caso): Record<string, string> {
  const d = caso.data;
  const predio = d.predios?.[0];
  const hoy = new Date().toLocaleDateString("es-CO", { day: "numeric", month: "long", year: "numeric" });

  if (tipo === "denuncia_publica" || tipo === "alerta_agraria") {
    return {
      resumenHecho: d.quePasoNarracion || "",
      veredaLugar: veredaLugarSugerido(caso),
      sujetosAfectados: nombreCompleto(d),
      explicacionVinculo: predio?.relacionExplicacion || "",
      fechaHoraHecho: fechaHechoTexto(d),
      relatoHechos: relatoHechosSugerido(caso),
      causaHecho: causaSugerida(caso),
      antecedentes: antecedentesSugerido(caso),
      contextoAdicional: "",
      calificacionHechos: tipologiaLabels(d)[0]?.label || "",
      responsabilizamos: responsabilizamosSugerido(caso),
      derechosEnRiesgo: derechosEnRiesgoSugerido(caso),
      descripcionAmenaza: d.quePasoNarracion || "",
      autoridadLocalNombre: d.departamento ? `Gobernación de ${d.departamento}` : "",
      autoridadLocalCargo: "Gobernador(a)",
      autoridadLocalDireccion: "",
      autoridadLocalCorreo: "",
      correoContactoRed: RED_EMAIL,
      fechaPublicacion: hoy,
      tituloCaso: "",
      accionAdicionalEstado: "",
    };
  }

  return {
    ciudad: "Bogotá D.C.",
    fecha: hoy,
    funcionarioDestinatario: "",
    cargoFuncionario: "",
    entidadDestinataria: predio?.estadoProceso ? "Agencia Nacional de Tierras (ANT)" : "",
    correoEntidad: "",
    asunto: d.rutaJuridica?.length ? `Solicitud relacionada con: ${labelesDe(VINCULO_PREDIO, predio?.vinculoPredio).join(", ")}` : "",
    peticionarioNombre: nombreCompleto(d),
    numeroCedula: "",
    organizacion: predio?.organizacionNombre || "",
    vinculoPredio: labelesDe(VINCULO_PREDIO, predio?.vinculoPredio).join(", "),
    predioIdentificacion: predio
      ? `Predio ${predio.nombrePredio || "sin nombre"}, vereda ${predio.vereda || "N/D"}, municipio de ${predio.municipio || d.municipio || "N/D"}, departamento de ${predio.departamento || d.departamento || "N/D"}.`
      : `Municipio de ${d.municipio || "N/D"}, departamento de ${d.departamento || "N/D"}.`,
    estadoProcesoAgrario: labelDe(ESTADO_PROCESO_AGRARIO, predio?.estadoProceso),
    numeroExpediente: predio?.numeroExpediente || "",
    antecedentesTramite: "",
    situacionActual: [d.quePasoNarracion, d.comoNarracion].filter(Boolean).join(" "),
    consecuencias: "",
    consideracionesJuridicas: "",
    solicitudPrimero: "",
    solicitudSegundo: "",
    solicitudTercero: predio?.numeroExpediente
      ? `Solicito información sobre el estado del expediente No. ${predio.numeroExpediente}, actuaciones pendientes y cronograma previsto.`
      : "",
    solicitudCuarto: "",
    telefonoContacto: d.contactoMedioPreferido || "",
    correoContacto: "",
  };
}
