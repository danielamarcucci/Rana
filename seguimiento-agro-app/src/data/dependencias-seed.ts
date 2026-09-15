// Catálogo de dependencias del Ministerio de Agricultura y Desarrollo Rural
// y de las entidades del sector (adscritas y vinculadas), con base en la
// estructura publicada en minagricultura.gov.co/el-ministerio/organigrama.
// Este catálogo es la semilla inicial: desde la aplicación se pueden agregar
// nuevas dependencias o entidades si la estructura cambia, sin tocar código.
export type TipoDependencia =
  | "despacho"
  | "viceministerio"
  | "direccion"
  | "oficina"
  | "entidad_adscrita"
  | "entidad_vinculada";

export interface DependenciaSeed {
  clave: string;
  nombre: string;
  tipo: TipoDependencia;
  padre: string | null;
}

export const DEPENDENCIAS_SEED: DependenciaSeed[] = [
  { clave: "despacho", nombre: "Despacho del Ministro", tipo: "despacho", padre: null },
  { clave: "oaj", nombre: "Oficina Asesora Jurídica", tipo: "oficina", padre: "despacho" },
  {
    clave: "oai",
    nombre: "Oficina Asesora de Asuntos Internacionales",
    tipo: "oficina",
    padre: "despacho",
  },
  {
    clave: "uied",
    nombre: "Unidad de Información Estratégica del Despacho",
    tipo: "oficina",
    padre: "despacho",
  },

  { clave: "vdr", nombre: "Viceministerio de Desarrollo Rural", tipo: "viceministerio", padre: "despacho" },
  { clave: "dmr", nombre: "Dirección de la Mujer Rural", tipo: "direccion", padre: "vdr" },
  {
    clave: "dbpr",
    nombre: "Dirección de Gestión de Bienes Públicos Rurales",
    tipo: "direccion",
    padre: "vdr",
  },
  {
    clave: "dcpgi",
    nombre: "Dirección de Capacidades Productivas y Generación de Ingresos",
    tipo: "direccion",
    padre: "vdr",
  },
  {
    clave: "dospr",
    nombre: "Dirección de Ordenamiento Social de la Propiedad Rural y Uso Productivo del Suelo",
    tipo: "direccion",
    padre: "vdr",
  },

  {
    clave: "vaa",
    nombre: "Viceministerio de Asuntos Agropecuarios",
    tipo: "viceministerio",
    padre: "despacho",
  },
  {
    clave: "dfra",
    nombre: "Dirección de Financiamiento y Riesgos Agropecuarios",
    tipo: "direccion",
    padre: "vaa",
  },
  {
    clave: "dcaf",
    nombre: "Dirección de Cadenas Agrícolas y Forestales",
    tipo: "direccion",
    padre: "vaa",
  },
  {
    clave: "dcppa",
    nombre: "Dirección de Cadenas Pecuarias, Pesqueras y Acuícolas",
    tipo: "direccion",
    padre: "vaa",
  },

  { clave: "adr", nombre: "Agencia de Desarrollo Rural (ADR)", tipo: "entidad_adscrita", padre: null },
  { clave: "ant", nombre: "Agencia Nacional de Tierras (ANT)", tipo: "entidad_adscrita", padre: null },
  { clave: "ica", nombre: "Instituto Colombiano Agropecuario (ICA)", tipo: "entidad_adscrita", padre: null },
  {
    clave: "aunap",
    nombre: "Autoridad Nacional de Acuicultura y Pesca (AUNAP)",
    tipo: "entidad_adscrita",
    padre: null,
  },
  {
    clave: "urt",
    nombre: "Unidad Administrativa Especial de Gestión de Restitución de Tierras Despojadas (URT)",
    tipo: "entidad_adscrita",
    padre: null,
  },
  {
    clave: "upra",
    nombre: "Unidad de Planificación Rural Agropecuaria (UPRA)",
    tipo: "entidad_adscrita",
    padre: null,
  },

  {
    clave: "banagrario",
    nombre: "Banco Agrario de Colombia (Banagrario)",
    tipo: "entidad_vinculada",
    padre: null,
  },
  {
    clave: "finagro",
    nombre: "Fondo para el Financiamiento del Sector Agropecuario (Finagro)",
    tipo: "entidad_vinculada",
    padre: null,
  },
  {
    clave: "agrosavia",
    nombre: "Corporación Colombiana de Investigación Agropecuaria (Agrosavia)",
    tipo: "entidad_vinculada",
    padre: null,
  },
];

export const ETIQUETA_TIPO_DEPENDENCIA: Record<TipoDependencia, string> = {
  despacho: "Despacho",
  viceministerio: "Viceministerio",
  direccion: "Dirección",
  oficina: "Oficina asesora",
  entidad_adscrita: "Entidad adscrita",
  entidad_vinculada: "Entidad vinculada",
};
