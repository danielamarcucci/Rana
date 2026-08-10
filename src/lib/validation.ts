import { z } from "zod";

// Preguntas visibles del formulario público (Paso 1). Son las únicas de
// diligenciamiento obligatorio, según la nota del documento de referencia.
export const formularioInicialSchema = z.object({
  accedioPor: z.string().min(1, "Seleccione por dónde nos contactó"),
  nombre: z.string().trim().min(1, "El nombre es obligatorio"),
  apellido: z.string().trim().min(1, "El apellido es obligatorio"),
  sexo: z.string().min(1, "Seleccione una opción"),
  contactoCelular: z.string().trim().min(1, "Indique un número de celular"),
  contactoTelefono: z.string().optional(),
  contactoCorreo: z.string().trim().email("Correo electrónico inválido").optional().or(z.literal("")),
  quePasoNarracion: z.string().trim().min(1, "Cuéntenos qué le pasó"),
  cuandoAnio: z.string().trim().min(1, "Indique el año"),
  cuandoMes: z.string().trim().min(1, "Indique el mes"),
  cuandoDia: z.string().trim().min(1, "Indique el día"),
  comoNarracion: z.string().trim().min(1, "Cuéntenos cómo ocurrió"),
  departamento: z.string().min(1, "Seleccione el departamento"),
  municipio: z.string().min(1, "Seleccione el municipio"),
  ruralUrbano: z.string().min(1, "Seleccione una opción"),
  esPredioReformaAgraria: z.string().min(1, "Seleccione una opción"),
  actores: z.array(z.string()).min(1, "Seleccione al menos una opción"),
  actoresOtroDetalle: z.string().optional(),
  estadoSituacion: z.string().min(1, "Seleccione una opción"),
  razonHechoTexto: z.string().trim().min(1, "Indique la razón del hecho"),
  consentimientoHabeasData: z.enum(["si", "no"], {
    message: "Debe indicar si autoriza el tratamiento de datos",
  }),
});

export type FormularioInicialInput = z.infer<typeof formularioInicialSchema>;

export const registrarManualSchema = z.object({
  medioManual: z.string().min(1, "Indique por qué medio se recibió la información"),
  draft: z.boolean().optional().default(false),
  data: z.record(z.string(), z.unknown()).default({}),
});

export const loginSchema = z.object({
  usuario: z.string().min(1),
  clave: z.string().min(1),
});
