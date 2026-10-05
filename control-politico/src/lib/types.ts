export type EstadoDebate =
  | "borrador"
  | "proposicion_radicada"
  | "aprobada"
  | "cuestionario_enviado"
  | "respuestas_recibidas"
  | "realizado"
  | "archivado";

export const ESTADOS_DEBATE: { valor: EstadoDebate; etiqueta: string }[] = [
  { valor: "borrador", etiqueta: "Borrador" },
  { valor: "proposicion_radicada", etiqueta: "Proposición radicada" },
  { valor: "aprobada", etiqueta: "Proposición aprobada" },
  { valor: "cuestionario_enviado", etiqueta: "Cuestionario enviado" },
  { valor: "respuestas_recibidas", etiqueta: "Respuestas recibidas" },
  { valor: "realizado", etiqueta: "Debate realizado" },
  { valor: "archivado", etiqueta: "Archivado" },
];

export type Instancia = "plenaria" | "comision_plan" | "comision_hacienda" | "comision_gobierno" | "otra";

export const INSTANCIAS: { valor: Instancia; etiqueta: string }[] = [
  { valor: "plenaria", etiqueta: "Plenaria" },
  { valor: "comision_plan", etiqueta: "Comisión del Plan" },
  { valor: "comision_hacienda", etiqueta: "Comisión de Hacienda" },
  { valor: "comision_gobierno", etiqueta: "Comisión de Gobierno" },
  { valor: "otra", etiqueta: "Otra comisión" },
];

export type Debate = {
  id: number;
  titulo: string;
  tema: string;
  municipio: string;
  instancia: Instancia;
  instancia_otra: string;
  citantes: string;
  bancada: string;
  justificacion: string;
  objetivo: string;
  fecha_radicacion: string | null;
  fecha_aprobacion: string | null;
  fecha_debate: string | null;
  estado: EstadoDebate;
  created_at: string;
  updated_at: string;
};

export type TipoCitacion = "citado" | "invitado";

export type Citado = {
  id: number;
  debate_id: number;
  nombre: string;
  cargo: string;
  entidad: string;
  tipo: TipoCitacion;
  orden: number;
};

export type EvaluacionRespuesta = "pendiente" | "completa" | "parcial" | "evasiva" | "no_respondida";

export const EVALUACIONES: { valor: EvaluacionRespuesta; etiqueta: string; color: string }[] = [
  { valor: "pendiente", etiqueta: "Sin respuesta aún", color: "bg-neutral-100 text-neutral-700" },
  { valor: "completa", etiqueta: "Completa", color: "bg-emerald-100 text-emerald-800" },
  { valor: "parcial", etiqueta: "Parcial", color: "bg-amber-100 text-amber-800" },
  { valor: "evasiva", etiqueta: "Evasiva", color: "bg-orange-100 text-orange-800" },
  { valor: "no_respondida", etiqueta: "No respondida", color: "bg-red-100 text-red-800" },
];

export type Pregunta = {
  id: number;
  debate_id: number;
  citado_id: number | null;
  eje: string;
  texto: string;
  proposito: string;
  respuesta: string;
  evaluacion: EvaluacionRespuesta;
  repregunta: string;
  orden: number;
};

export type TipoFuente = "documento" | "dato" | "prensa" | "testimonio" | "norma" | "otro";

export const TIPOS_FUENTE: { valor: TipoFuente; etiqueta: string }[] = [
  { valor: "documento", etiqueta: "Documento oficial" },
  { valor: "dato", etiqueta: "Dato / estadística" },
  { valor: "prensa", etiqueta: "Nota de prensa" },
  { valor: "testimonio", etiqueta: "Testimonio / denuncia ciudadana" },
  { valor: "norma", etiqueta: "Norma / acto administrativo" },
  { valor: "otro", etiqueta: "Otro" },
];

export type Fuente = {
  id: number;
  debate_id: number;
  tipo: TipoFuente;
  titulo: string;
  descripcion: string;
  url: string;
  hallazgo: string;
  verificada: number;
};

export type TipoPeticion = "informacion" | "general" | "consulta";

export const TIPOS_PETICION: { valor: TipoPeticion; etiqueta: string; dias: number }[] = [
  { valor: "informacion", etiqueta: "Documentos e información (10 días hábiles)", dias: 10 },
  { valor: "general", etiqueta: "Petición general (15 días hábiles)", dias: 15 },
  { valor: "consulta", etiqueta: "Consulta (30 días hábiles)", dias: 30 },
];

export type EstadoPeticion = "enviada" | "respondida" | "respuesta_incompleta" | "vencida_sin_respuesta";

export const ESTADOS_PETICION: { valor: EstadoPeticion; etiqueta: string }[] = [
  { valor: "enviada", etiqueta: "Enviada, en espera" },
  { valor: "respondida", etiqueta: "Respondida" },
  { valor: "respuesta_incompleta", etiqueta: "Respuesta incompleta" },
  { valor: "vencida_sin_respuesta", etiqueta: "Vencida sin respuesta" },
];

export type Peticion = {
  id: number;
  debate_id: number;
  entidad: string;
  asunto: string;
  radicado: string;
  tipo: TipoPeticion;
  fecha_envio: string;
  estado: EstadoPeticion;
  notas: string;
};

export type SeccionGuion = {
  id: number;
  debate_id: number;
  titulo: string;
  contenido: string;
  minutos: number;
  orden: number;
};
