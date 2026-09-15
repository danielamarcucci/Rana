export type TipoActuacion = "plan" | "programa" | "convenio" | "linea";

export type EstadoActuacion = "formulacion" | "en_ejecucion" | "suspendido" | "finalizado";

export const ETIQUETA_TIPO_ACTUACION: Record<TipoActuacion, string> = {
  plan: "Plan",
  programa: "Programa",
  convenio: "Convenio",
  linea: "Línea de acción",
};

export const ETIQUETA_ESTADO: Record<EstadoActuacion, string> = {
  formulacion: "En formulación",
  en_ejecucion: "En ejecución",
  suspendido: "Suspendido",
  finalizado: "Finalizado",
};

export interface Ubicacion {
  departamento: string;
  municipio: string | null;
}

export interface Dependencia {
  id: number;
  clave: string;
  nombre: string;
  tipo: string;
  padreId: number | null;
}

export interface Actuacion {
  id: number;
  tipo: TipoActuacion;
  nombre: string;
  dependenciaId: number;
  dependenciaNombre?: string;
  dependenciaTipo?: string;
  entidadEjecutora: string;
  descripcion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoActuacion;
  nivelAvance: number;
  fuenteFinanciacion: string;
  recursosDestinados: number;
  recursosEjecutados: number;
  beneficiariosTotal: number;
  beneficiariosMujeres: number;
  beneficiariosJovenes: number;
  comentarios: string;
  creadoPor: string;
  actualizadoPor: string;
  createdAt: string;
  updatedAt: string;
  ubicaciones: Ubicacion[];
}

export interface ActuacionInput {
  tipo: TipoActuacion;
  nombre: string;
  dependenciaId: number;
  entidadEjecutora: string;
  descripcion: string;
  fechaInicio: string | null;
  fechaFin: string | null;
  estado: EstadoActuacion;
  nivelAvance: number;
  fuenteFinanciacion: string;
  recursosDestinados: number;
  recursosEjecutados: number;
  beneficiariosTotal: number;
  beneficiariosMujeres: number;
  beneficiariosJovenes: number;
  comentarios: string;
  ubicaciones: Ubicacion[];
}
