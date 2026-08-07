import type { AnexoTipo } from "../types";

export type CampoAnexo = {
  key: string;
  label: string;
  multiline?: boolean;
  opcional?: boolean;
  ayuda?: string;
};

export const CAMPOS_DENUNCIA_PUBLICA: CampoAnexo[] = [
  { key: "tituloCaso", label: "Título o nombre breve del caso", opcional: true },
  { key: "resumenHecho", label: "Resumen del hecho en 1-2 líneas", multiline: true },
  { key: "veredaLugar", label: "Vereda, corregimiento, finca o barrio", ayuda: "Según zona rural/urbana" },
  { key: "sujetosAfectados", label: "Sujetos afectados" },
  { key: "explicacionVinculo", label: "Explicación del vínculo entre el hecho y el proceso de Reforma Agraria", multiline: true },
  { key: "fechaHoraHecho", label: "Fecha y hora del hecho" },
  { key: "relatoHechos", label: "Relato objetivo y verificado de los hechos, ya corroborado por la Red", multiline: true },
  { key: "causaHecho", label: "Causa del hecho (razón o hipótesis señalada por la fuente)", multiline: true },
  { key: "antecedentes", label: "Antecedentes (opcional — deje vacío si no aplica)", multiline: true, opcional: true },
  { key: "contextoAdicional", label: "Contexto adicional: patrón sistemático u otras denuncias en la zona (opcional)", multiline: true, opcional: true },
  { key: "calificacionHechos", label: "Calificación de los hechos según la tipología (ej.: despojo forzado, amenaza)" },
  { key: "responsabilizamos", label: "A quién se responsabiliza (Estado, gobernación, unidad militar/policial, grupo armado, empresa, etc.)", multiline: true },
  { key: "derechosEnRiesgo", label: "Derecho(s) en riesgo según la tipología del hecho" },
  { key: "descripcionAmenaza", label: "Descripción breve de la amenaza que afecta a los sujetos", multiline: true },
  { key: "autoridadLocalNombre", label: "Autoridad local o regional pertinente (nombre)" },
  { key: "autoridadLocalCargo", label: "Cargo de la autoridad local" },
  { key: "autoridadLocalDireccion", label: "Dirección de la autoridad local" },
  { key: "autoridadLocalCorreo", label: "Correo de la autoridad local" },
  { key: "correoContactoRed", label: "Correo electrónico de contacto de la Red" },
  { key: "fechaPublicacion", label: "Fecha de publicación" },
];

export const CAMPOS_ALERTA_AGRARIA: CampoAnexo[] = CAMPOS_DENUNCIA_PUBLICA.filter(
  (c) => c.key !== "tituloCaso"
).concat([
  { key: "accionAdicionalEstado", label: "Acción adicional exigida al Estado (opcional)", multiline: true, opcional: true },
]);

export const CAMPOS_DERECHO_PETICION: CampoAnexo[] = [
  { key: "ciudad", label: "Ciudad" },
  { key: "fecha", label: "Fecha (día de mes de año)" },
  { key: "funcionarioDestinatario", label: "Nombre del funcionario destinatario" },
  { key: "cargoFuncionario", label: "Cargo del funcionario" },
  { key: "entidadDestinataria", label: "Entidad destinataria" },
  { key: "correoEntidad", label: "Correo electrónico de notificaciones de la entidad" },
  { key: "asunto", label: "Asunto: descripción clara y específica de la solicitud", multiline: true },
  { key: "peticionarioNombre", label: "Nombre del peticionario o peticionarios" },
  { key: "numeroCedula", label: "Número de cédula" },
  { key: "organizacion", label: "Organización o asociación relacionada, si aplica" },
  { key: "vinculoPredio", label: "Vínculo con el predio" },
  { key: "predioIdentificacion", label: "Identificación del predio (nombre, vereda, municipio, departamento)", multiline: true },
  { key: "estadoProcesoAgrario", label: "Estado actual del proceso agrario" },
  { key: "numeroExpediente", label: "Número de expediente o trámite" },
  { key: "antecedentesTramite", label: "Antecedentes del trámite ante la entidad", multiline: true },
  { key: "situacionActual", label: "Situación actual: descripción del hecho o problema que motiva la petición", multiline: true },
  { key: "consecuencias", label: "Consecuencias sobre el proyecto productivo y la familia o comunidad", multiline: true },
  { key: "consideracionesJuridicas", label: "Fundamento normativo y jurisprudencial aplicable", multiline: true },
  { key: "solicitudPrimero", label: "Primero: solicitud principal", multiline: true },
  { key: "solicitudSegundo", label: "Segundo: solicitud subsidiaria o complementaria", multiline: true },
  { key: "solicitudTercero", label: "Tercero: solicitud de información sobre el expediente", multiline: true },
  { key: "solicitudCuarto", label: "Cuarto: solicitud adicional (opcional)", multiline: true, opcional: true },
  { key: "telefonoContacto", label: "Teléfono de contacto" },
  { key: "correoContacto", label: "Correo electrónico de contacto" },
];

export function camposPara(tipo: AnexoTipo): CampoAnexo[] {
  if (tipo === "denuncia_publica") return CAMPOS_DENUNCIA_PUBLICA;
  if (tipo === "alerta_agraria") return CAMPOS_ALERTA_AGRARIA;
  return CAMPOS_DERECHO_PETICION;
}

export const NOMBRE_TIPO: Record<AnexoTipo, string> = {
  derecho_peticion: "Derecho de petición",
  denuncia_publica: "Denuncia pública",
  alerta_agraria: "Alerta agraria",
};
