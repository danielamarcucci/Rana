// Estructura de datos de un caso (denuncia). Se guarda como JSON en
// casos.data. Las secciones "solo Red" corresponden a las preguntas
// ocultas del formulario ampliado (Paso 2 del documento de referencia).

export type Predio = {
  nombrePredio?: string;
  departamento?: string;
  municipio?: string;
  vereda?: string;
  resolucionAnt?: string;
  matriculaInmobiliaria?: string;
  codigoCatastral?: string;
  vinculoPredio?: string[];
  organizacionNombre?: string;
  estadoProceso?: string;
  numeroExpediente?: string;
  relacionHecho?: string[];
  relacionExplicacion?: string;
  cruceBase?: string;
  codigoInternoPredio?: string;
};

export type Antecedente = {
  fecha?: string;
  tipoHecho?: string;
  personaOrganizacion?: string;
  relacionHechoActual?: string;
  autoridadDenuncia?: string;
  numeroRadicado?: string;
  estadoActual?: string;
  otroDato?: string;
};

export type Autor = {
  nombreApellidos?: string;
  aliasCargo?: string;
  numeroAprox?: string;
  sexoGenero?: string;
  edad?: string;
  numeroIdentificacion?: string;
  tipoResponsable?: string[];
  fpInstitucion?: string;
  fpUnidad?: string;
  fpRango?: string;
  gaNombreGrupo?: string;
  gaEstructura?: string;
  gaRol?: string;
  gaComoEstablecio?: string[];
  pfNombreAliasCargo?: string;
  pfEntidad?: string;
  pfDocumento?: string;
  pfElementosFalsos?: string;
  pfInteresPredio?: string;
  pfAutoridadPresento?: string;
};

export type Soporte = {
  id: string;
  nombreOriginal: string;
  archivo: string; // filename en disco
  tipo: string;
  tamano: number;
  subidoEn: string;
};

export type CasoData = {
  // 1. Datos de quien denuncia
  nombre?: string;
  apellido?: string;
  sexo?: string;
  edad?: string;
  identificacion?: string[];
  rolLiderazgo?: string;
  rolLiderazgoOtro?: string;

  accedioPor?: string;

  // 2. Qué le pasó
  quePasoNarracion?: string;
  tipologiaHecho?: string[];
  tipologiaOtroDetalle?: string;

  // 3. Cuándo
  cuandoAnio?: string;
  cuandoMes?: string;
  cuandoDia?: string;
  cuandoHora?: string;

  // 4. Cómo
  comoNarracion?: string;
  mediosUtilizados?: string[];
  mediosDetalle?: string;
  vestimenta?: string[];
  vestimentaDetalle?: string;
  movilizacion?: string[];
  amenazasTipo?: string[];
  amenazasDetalle?: string;
  documentoFalsoTipoFecha?: string;
  documentoFalsoEntidad?: string;
  documentoFalsoRadicado?: string;
  documentoFalsoFirmante?: string;
  documentoFalsoUso?: string;
  documentoFalsoElementos?: string;
  documentoFalsoVerificar?: string;
  soportesDisponibles?: string[];
  soportes?: Soporte[];

  // 6. Dónde
  departamento?: string;
  municipio?: string;
  ruralUrbano?: string;
  urbanoDetalle?: string;
  ruralDetalle?: string;
  esPredioReformaAgraria?: string;
  coordenadas?: string;

  // 7. Por quién
  actores?: string[];
  actoresOtroDetalle?: string;

  // 8. Qué está pasando
  estadoSituacion?: string;
  estadoSituacionDetalleRed?: string;

  // 9. Razón del hecho
  razonHechoTexto?: string;
  causas?: string[];
  causaDetalleRed?: string;

  // Vínculo con la Reforma Agraria (solo Red)
  predios?: Predio[];

  // Antecedentes y medidas de protección (solo Red)
  primeraVezPersona?: string;
  primeraVezOrganizacion?: string;
  antecedentes?: Antecedente[];
  autoproteccionAdoptada?: string;
  autoproteccionMedidas?: string[];
  autoproteccionObservaciones?: string;
  proteccionSolicitada?: string;
  proteccionEntidades?: string[];
  proteccionTipoMedida?: string[];
  proteccionEstadoSolicitud?: string;
  proteccionNumeroRadicado?: string;
  proteccionFecha?: string;
  proteccionObservaciones?: string;

  // Autores (solo Red)
  autores?: Autor[];

  // Contacto y punto focal (solo Red)
  contactoMedioPreferido?: string;
  contactoPersonaIntermediaria?: string;
  contactoHorarios?: string;
  contactoPrecauciones?: string;
  puntoFocalNombre?: string;
  puntoFocalOrganizacion?: string;

  // Consentimiento
  consentimientoHabeasData?: string;

  // Ruta jurídica
  rutaJuridica?: string[];
};

export type CanalRecepcion = "pagina_web" | "instagram" | "whatsapp" | "RED";
export type EstadoCaso =
  | "recibido"
  | "en_verificacion"
  | "corroborado"
  | "en_ruta_juridica"
  | "cerrado";

export type Caso = {
  radicado: string;
  accessToken: string | null;
  createdAt: string;
  updatedAt: string;
  canalRecepcion: CanalRecepcion;
  medioManual?: string | null;
  estado: EstadoCaso;
  isManual: boolean;
  draft: boolean;
  ampliadoCompleto: boolean;
  ampliadoSubmittedAt?: string | null;
  data: CasoData;
  soportes: Soporte[];
};

export type AnexoTipo = "derecho_peticion" | "denuncia_publica" | "alerta_agraria";
export type AnexoEstado = "borrador" | "version_final";

export type Anexo = {
  id: number;
  radicado: string;
  tipo: AnexoTipo;
  estado: AnexoEstado;
  overrides: Record<string, string>;
  createdAt: string;
  updatedAt: string;
  finalizedAt?: string | null;
};
