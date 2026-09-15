import { z } from "zod";

export const ubicacionSchema = z.object({
  departamento: z.string().min(1),
  municipio: z.string().min(1).nullable(),
});

export const actuacionInputSchema = z.object({
  tipo: z.enum(["plan", "programa", "convenio", "linea"]),
  nombre: z.string().min(3, "El nombre es obligatorio").max(300),
  dependenciaId: z.number().int().positive(),
  entidadEjecutora: z.string().max(300).default(""),
  descripcion: z.string().max(4000).default(""),
  fechaInicio: z.string().nullable().default(null),
  fechaFin: z.string().nullable().default(null),
  estado: z.enum(["formulacion", "en_ejecucion", "suspendido", "finalizado"]),
  nivelAvance: z.number().min(0).max(100),
  fuenteFinanciacion: z.string().max(300).default(""),
  recursosDestinados: z.number().min(0),
  recursosEjecutados: z.number().min(0),
  beneficiariosTotal: z.number().int().min(0),
  beneficiariosMujeres: z.number().int().min(0),
  beneficiariosJovenes: z.number().int().min(0),
  comentarios: z.string().max(8000).default(""),
  ubicaciones: z.array(ubicacionSchema).default([]),
});

export type ActuacionInputParsed = z.infer<typeof actuacionInputSchema>;
