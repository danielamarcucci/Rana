// Catálogos de opciones controladas usados en el formulario público, el
// formulario ampliado y en la generación de anexos y la infografía.

export type Opcion = { value: string; label: string; help?: string };

export const CANAL_RECEPCION: Opcion[] = [
  { value: "pagina_web", label: "Página web" },
  { value: "instagram", label: "Link en la biografía de Instagram" },
  { value: "whatsapp", label: "Link del canal de WhatsApp" },
  { value: "RED", label: "Registrado por la Red" },
];

export const MEDIO_MANUAL: Opcion[] = [
  { value: "llamada", label: "Llamada telefónica" },
  { value: "mensaje", label: "Mensaje (SMS / WhatsApp / redes)" },
  { value: "correo", label: "Correo electrónico" },
  { value: "presencial", label: "Conversación presencial" },
  { value: "otro", label: "Otro" },
];

export const SEXO: Opcion[] = [
  { value: "mujer", label: "Mujer" },
  { value: "hombre", label: "Hombre" },
  { value: "otro", label: "Otro" },
  { value: "prefiere_no_decir", label: "Prefiere no decir" },
];

export const RURAL_URBANO: Opcion[] = [
  { value: "rural", label: "Rural" },
  { value: "urbano", label: "Urbano" },
];

export const SI_NO: Opcion[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
];

export const SI_NO_NOSABE: Opcion[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no_se_sabe", label: "No se sabe" },
];

export const ES_PREDIO_REFORMA_AGRARIA: Opcion[] = [
  { value: "si", label: "Sí" },
  { value: "no", label: "No" },
  { value: "no_se_sabe", label: "No se sabe" },
];

export const ACTOR_RESPONSABLE: Opcion[] = [
  { value: "grupo_armado_no_estatal", label: "Grupo armado no estatal" },
  { value: "ejercito", label: "Ejército" },
  { value: "policia", label: "Policía" },
  { value: "funcionarios_publicos", label: "Funcionarios públicos" },
  { value: "crimen_organizado", label: "Crimen organizado" },
  { value: "vecinos", label: "Vecinos" },
  { value: "particular_no_identificado", label: "Actor no identificado, particular" },
  { value: "empresa", label: "Empresa" },
  { value: "otros", label: "Otros" },
];

export const ESTADO_SITUACION: Opcion[] = [
  { value: "podria_pasar", label: "Podría pasar", help: "Todavía no está ocurriendo, pero hay señales de peligro." },
  { value: "puede_pasar_pronto", label: "Puede pasar pronto", help: "Parece que puede ocurrir en cualquier momento." },
  { value: "esta_pasando_ahora", label: "Está pasando ahora", help: "La situación está ocurriendo en este momento." },
  { value: "ya_paso", label: "Ya pasó", help: "El hecho ocurrió y dejó consecuencias." },
  { value: "ha_pasado_varias_veces", label: "Ha pasado varias veces", help: "Ocurre repetidamente o continúa pasando." },
  { value: "ya_se_detuvo", label: "Ya se detuvo", help: "La situación terminó o el peligro está controlado." },
];

export const TIPO_DOCUMENTO: Opcion[] = [
  { value: "cedula_ciudadania", label: "Cédula de ciudadanía" },
  { value: "tarjeta_identidad", label: "Tarjeta de identidad" },
  { value: "cedula_extranjeria", label: "Cédula de extranjería" },
  { value: "pasaporte", label: "Pasaporte" },
  { value: "registro_civil", label: "Registro civil" },
  { value: "pep_ppt", label: "Permiso Especial de Permanencia (PEP) / Permiso por Protección Temporal (PPT)" },
  { value: "no_tiene", label: "No tiene documento" },
  { value: "otro", label: "Otro" },
];

export const IDENTIFICACION: Opcion[] = [
  { value: "campesino", label: "Campesino" },
  { value: "indigena", label: "Indígena" },
  { value: "negro", label: "Negro" },
  { value: "afrodescendiente", label: "Afrodescendiente" },
  { value: "raizal", label: "Raizal" },
  { value: "palenquero", label: "Palenquero" },
  { value: "rrom", label: "Rrom" },
  { value: "mujer", label: "Mujer" },
  { value: "joven_rural", label: "Joven rural" },
  { value: "beneficiario_ra", label: "Beneficiario de la Reforma Agraria" },
];

export const ROL_LIDERAZGO: Opcion[] = [
  { value: "lider_social", label: "Líder o lideresa social" },
  { value: "jac", label: "Integrante de Junta de Acción Comunal" },
  { value: "vocera_asociacion", label: "Vocera de asociación productiva" },
  { value: "comite_ra", label: "Integrante de Comité Municipal o departamental de Reforma Agraria" },
  { value: "firmante_paz", label: "Firmante de paz" },
  { value: "otro", label: "Otro" },
];

export const RESOLUCION_ANT: Opcion[] = [
  { value: "se_conoce", label: "Se conoce" },
  { value: "no_se_conoce", label: "No se conoce" },
  { value: "no_aplica", label: "No aplica" },
];

export const SE_CONOCE_NO: Opcion[] = [
  { value: "se_conoce", label: "Se conoce" },
  { value: "no_se_conoce", label: "No se conoce" },
];

export const VINCULO_PREDIO: Opcion[] = [
  { value: "adjudicatario", label: "Adjudicatario(a)" },
  { value: "beneficiario_entrega_provisional", label: "Beneficiario(a) de entrega provisional" },
  { value: "poseedor", label: "Poseedor(a)" },
  { value: "ocupante_tramite", label: "Ocupante en trámite" },
  { value: "solicitante_acceso", label: "Solicitante de acceso o formalización de tierras" },
  { value: "integrante_asociacion", label: "Integrante de una asociación u organización beneficiaria" },
  { value: "integrante_proyecto_productivo", label: "Integrante de un proyecto productivo" },
  { value: "firmante_paz", label: "Firmante de paz" },
  { value: "familiar_beneficiario", label: "Familiar de una persona beneficiaria" },
  { value: "representante_comunidad", label: "Representante o líder de la comunidad" },
  { value: "otro", label: "Otro" },
  { value: "pendiente", label: "Pendiente de establecer" },
];

export const ESTADO_PROCESO_AGRARIO: Opcion[] = [
  { value: "adjudicado", label: "Adjudicado" },
  { value: "entregado_provisional", label: "Entregado provisionalmente" },
  { value: "en_compra", label: "En proceso de compra o adquisición" },
  { value: "en_adjudicacion", label: "En proceso de adjudicación" },
  { value: "en_formalizacion", label: "En proceso de formalización" },
  { value: "en_tramite_ant", label: "En trámite ante la ANT" },
  { value: "en_disputa", label: "En disputa" },
  { value: "con_proceso_judicial", label: "Con proceso judicial o administrativo" },
  { value: "con_medida_cautelar", label: "Con medida cautelar" },
  { value: "con_solicitud_revocatoria", label: "Con solicitud de revocatoria" },
  { value: "con_riesgo_desalojo", label: "Con riesgo o proceso de desalojo" },
  { value: "en_abandono_forzado", label: "En abandono forzado" },
  { value: "otro", label: "Otro" },
  { value: "no_se_conoce", label: "No se conoce" },
];

export const RELACION_HECHO_RA: Opcion[] = [
  { value: "ocurrio_dentro_predio", label: "Ocurrió dentro del predio" },
  { value: "afecto_persona_beneficiaria", label: "Afectó a una persona u organización beneficiaria" },
  { value: "impedir_ingreso_permanencia", label: "Busca impedir el ingreso o la permanencia en el predio" },
  { value: "provocar_abandono_desalojo", label: "Busca provocar el abandono o desalojo del predio" },
  { value: "impedir_adjudicacion", label: "Busca impedir la adjudicación, entrega o formalización" },
  { value: "afecto_proyecto_productivo", label: "Afectó un proyecto productivo desarrollado en el predio" },
  { value: "reclamaciones_terceros", label: "Está relacionado con reclamaciones de antiguos propietarios, ocupantes o terceros" },
  { value: "liderazgo_defensa_ra", label: "Está relacionado con el liderazgo o la defensa de la Reforma Agraria" },
  { value: "menciono_predio", label: "La amenaza o agresión mencionó expresamente el predio, la organización o el proceso agrario" },
  { value: "otra_relacion", label: "Otra relación" },
  { value: "pendiente_verificacion", label: "La relación todavía está pendiente de verificación" },
];

export const CRUCE_BASE_PREDIOS: Opcion[] = [
  { value: "encontrado", label: "Predio encontrado en la base" },
  { value: "posible_coincidencia", label: "Posible coincidencia pendiente de confirmar" },
  { value: "no_encontrado", label: "Predio no encontrado" },
  { value: "predio_nuevo", label: "Predio nuevo: debe incorporarse a la base" },
];

export type TipologiaItem = { value: string; label: string; help: string };
export type TipologiaGrupo = { derecho: string; items: TipologiaItem[] };

export const TIPOLOGIA_HECHO: TipologiaGrupo[] = [
  {
    derecho: "Derecho a la vida",
    items: [
      { value: "homicidio", label: "Homicidio", help: "Causar intencionalmente la muerte de otra persona." },
    ],
  },
  {
    derecho: "Derecho a la integridad personal",
    items: [
      { value: "atentado", label: "Atentado", help: "Ejecución de actos idóneos dirigidos a causar la muerte de una persona, sin que el resultado se produzca por circunstancias ajenas a la voluntad del responsable." },
      { value: "amenaza", label: "Amenaza", help: "Anuncio o advertencia de causar un daño a una persona, familia, comunidad u organización, por cualquier medio, con el propósito de intimidar, generar temor o provocar zozobra." },
      { value: "heridas_lesiones", label: "Heridas o lesiones personales", help: "Daño causado en el cuerpo o en la salud física o mental de otra persona." },
      { value: "tortura", label: "Tortura", help: "Acción mediante la cual se infligen intencionalmente dolores o sufrimientos físicos o psíquicos a una persona." },
      { value: "intimidacion", label: "Intimidación", help: "Actos de presión, hostigamiento o amedrentamiento orientados a generar temor o condicionar la actuación de una persona, familia, comunidad u organización." },
      { value: "presencia_armados", label: "Presencia de personas armadas", help: "Presencia o circulación de personas que portan armas con el propósito o efecto de intimidar a personas, familias o comunidades." },
      { value: "estigmatizacion", label: "Estigmatización pública o en redes sociales", help: "Señalamientos, acusaciones o expresiones públicas contra líderes, lideresas, comunidades u organizaciones que afectan su buen nombre, deslegitiman su labor o incrementan su exposición a riesgos." },
    ],
  },
  {
    derecho: "Derecho a la libertad y movilidad",
    items: [
      { value: "secuestro_simple", label: "Secuestro simple", help: "Arrebatar, sustraer, retener u ocultar a una persona contra su voluntad, con propósitos distintos a la extorsión." },
      { value: "secuestro_extorsivo", label: "Secuestro extorsivo", help: "Retener u ocultar a una persona con el propósito de exigir dinero, una utilidad, una decisión, una acción u omisión, o alcanzar fines políticos." },
      { value: "restricciones_movilidad", label: "Restricciones a la movilidad", help: "Limitaciones impuestas al desplazamiento de personas o comunidades, mediante amenazas, controles, retenes, órdenes, paros armados u otras medidas." },
      { value: "confinamiento", label: "Confinamiento", help: "Situación en la cual una comunidad no puede desplazarse libremente ni acceder a alimentos, servicios de salud, educación u otros bienes esenciales, debido a restricciones impuestas por actores armados." },
    ],
  },
  {
    derecho: "Derecho a los bienes",
    items: [
      { value: "despojo_forzado", label: "Despojo forzado de tierras", help: "Apropiación de un predio mediante violencia, amenazas, engaño, presión, abuso de poder u otros mecanismos ilegales." },
      { value: "abandono_forzado", label: "Abandono forzado de tierras", help: "Situación en la que una persona, familia o comunidad debe dejar su tierra por causa de amenazas, violencia o temor, y queda impedida para usarla, administrarla o regresar a ella." },
      { value: "artefacto_explosivo", label: "Activación de artefacto explosivo", help: "Instalación, lanzamiento o detonación de artefactos explosivos contra predios o proyectos productivos de beneficiarios de la Reforma Agraria." },
      { value: "dano_bienes", label: "Daño a bienes", help: "Afectación intencional de cultivos, viviendas, animales, maquinaria, infraestructura u otros bienes pertenecientes a personas, familias o comunidades beneficiarias de la Reforma Agraria." },
    ],
  },
  {
    derecho: "Derecho de acceso y permanencia en la tierra",
    items: [
      { value: "documentos_fraudulentos", label: "Utilización de documentos fraudulentos", help: "Uso de documentos falsificados, alterados o manipulados para dar apariencia de legalidad a desalojos, comparecencias, reclamaciones o actuaciones dirigidas a apropiarse de predios entregados por la autoridad de tierras." },
      { value: "engano", label: "Engaño", help: "Utilización de información o afirmaciones falsas para inducir a error respecto de la propiedad, tenencia, adjudicación o situación jurídica de un predio de la Reforma Agraria." },
      { value: "revocatoria_sin_debido_proceso", label: "Revocatoria sin debido proceso administrativo", help: "Revocatoria de una adjudicación o terminación de una entrega provisional sin garantizar información, notificación, contradicción, defensa y demás garantías del debido proceso." },
      { value: "judicializacion_indebida", label: "Judicialización indebida", help: "Utilización injustificada o abusiva de actuaciones judiciales, administrativas o policiales para perseguir, presionar u hostigar a beneficiarios de la Reforma Agraria." },
    ],
  },
  {
    derecho: "Otras opciones",
    items: [
      { value: "otro_hecho", label: "Otro hecho", help: "Permite especificar la tipología y su descripción." },
    ],
  },
];

export const MEDIOS_UTILIZADOS: Opcion[] = [
  { value: "arma_fuego_larga", label: "Arma de fuego larga" },
  { value: "arma_fuego_corta", label: "Arma de fuego corta" },
  { value: "arma_blanca", label: "Arma blanca" },
  { value: "explosivos", label: "Explosivos" },
  { value: "gases", label: "Gases" },
  { value: "palos_objetos", label: "Palos u otros objetos" },
  { value: "agresion_verbal", label: "Agresión verbal" },
  { value: "agresion_escrita_digital", label: "Agresión escrita o digital" },
  { value: "otro", label: "Otro" },
  { value: "no_identificado", label: "No se pudo identificar" },
];

export const VESTIMENTA: Opcion[] = [
  { value: "camuflado", label: "Camuflado" },
  { value: "uniforme", label: "Uniforme" },
  { value: "civil", label: "Vestimenta civil" },
  { value: "rostro_cubierto", label: "Rostro cubierto o pañoletas" },
  { value: "insignias", label: "Insignias, brazaletes, siglas o leyendas" },
  { value: "otra", label: "Otra" },
  { value: "no_observado", label: "No se pudo observar" },
];

export const MOVILIZACION: Opcion[] = [
  { value: "carro", label: "Carro" },
  { value: "lancha", label: "Lancha" },
  { value: "avion", label: "Avión" },
  { value: "helicoptero", label: "Helicóptero" },
];

export const TIPO_AMENAZA: Opcion[] = [
  { value: "verbales", label: "Verbales" },
  { value: "escritos", label: "Escritos" },
  { value: "llamada", label: "Por llamada telefónica" },
  { value: "redes", label: "Por mensaje o redes sociales" },
  { value: "panfletos", label: "Mediante panfletos" },
  { value: "otros", label: "Otros" },
];

export const SOPORTES_DISPONIBLES: Opcion[] = [
  { value: "fotografias", label: "Fotografías" },
  { value: "videos", label: "Videos" },
  { value: "audios", label: "Audios" },
  { value: "capturas", label: "Capturas de pantalla" },
  { value: "documentos", label: "Documentos" },
  { value: "testimonios", label: "Testimonios" },
  { value: "ninguno", label: "Ninguno" },
  { value: "otros", label: "Otros" },
];

export const MEDIDAS_AUTOPROTECCION: Opcion[] = [
  { value: "redes_comunitarias", label: "Activación de redes comunitarias" },
  { value: "acompanamiento_permanente", label: "Acompañamiento permanente" },
  { value: "comunicacion_periodica", label: "Comunicación periódica con personas de confianza" },
  { value: "limitacion_actividades", label: "Limitación o cambio de algunas actividades" },
  { value: "traslado_temporal", label: "Traslado temporal" },
  { value: "proteccion_informacion", label: "Protección de información y documentos" },
  { value: "denuncia_organizaciones", label: "Denuncia o comunicación con organizaciones sociales" },
  { value: "otra", label: "Otra medida" },
];

export const ENTIDAD_PROTECCION: Opcion[] = [
  { value: "unp", label: "Unidad Nacional de Protección (UNP)" },
  { value: "policia_nacional", label: "Policía Nacional" },
  { value: "fiscalia", label: "Fiscalía General de la Nación" },
  { value: "defensoria", label: "Defensoría del Pueblo" },
  { value: "personeria", label: "Personería municipal" },
  { value: "alcaldia_gobernacion", label: "Alcaldía o Gobernación" },
  { value: "procuraduria", label: "Procuraduría General de la Nación" },
  { value: "otra", label: "Otra entidad" },
];

export const TIPO_MEDIDA_PROTECCION: Opcion[] = [
  { value: "individuales", label: "Medidas individuales" },
  { value: "colectivas", label: "Medidas colectivas" },
  { value: "preventivas", label: "Medidas preventivas" },
  { value: "emergencia", label: "Medidas de emergencia" },
  { value: "esquema_proteccion", label: "Esquema de protección" },
  { value: "otra", label: "Otra" },
  { value: "no_se_conoce", label: "No se conoce" },
];

export const ESTADO_SOLICITUD_PROTECCION: Opcion[] = [
  { value: "solicitada", label: "Solicitada" },
  { value: "en_evaluacion", label: "En evaluación" },
  { value: "aprobada", label: "Aprobada" },
  { value: "en_implementacion", label: "En implementación" },
  { value: "vigente", label: "Vigente" },
  { value: "implementada_parcial", label: "Implementada parcialmente" },
  { value: "negada", label: "Negada" },
  { value: "suspendida", label: "Suspendida o retirada" },
  { value: "vencida", label: "Vencida" },
  { value: "no_efectiva", label: "No ha sido efectiva" },
  { value: "sin_respuesta", label: "Sin respuesta" },
  { value: "no_se_conoce", label: "No se conoce" },
];

export const TIPO_PRESUNTO_RESPONSABLE: Opcion[] = [
  { value: "fuerza_militar", label: "Fuerza Militar" },
  { value: "policia_nacional", label: "Policía Nacional" },
  { value: "otro_organismo_estatal", label: "Otro organismo o funcionario estatal" },
  { value: "grupo_armado_ilegal", label: "Grupo armado ilegal" },
  { value: "paramilitar", label: "Estructura paramilitar o sucesora del paramilitarismo" },
  { value: "particular", label: "Particular" },
  { value: "empresa_privada", label: "Empresa, fundación u organización privada" },
  { value: "autoridad_local", label: "Autoridad local o comunitaria" },
  { value: "no_identificado", label: "No identificado" },
  { value: "otro", label: "Otro" },
];

export const INSTITUCION_FUERZA_PUBLICA: Opcion[] = [
  { value: "ejercito_nacional", label: "Ejército Nacional" },
  { value: "armada_nacional", label: "Armada Nacional" },
  { value: "fuerza_aeroespacial", label: "Fuerza Aeroespacial Colombiana" },
  { value: "policia_nacional", label: "Policía Nacional" },
  { value: "cti_fiscalia", label: "CTI de la Fiscalía" },
  { value: "otra_entidad", label: "Otra entidad" },
  { value: "no_identificado", label: "No se pudo identificar" },
];

export const RANGO_CARGO: Opcion[] = [
  { value: "oficial", label: "Oficial" },
  { value: "suboficial", label: "Suboficial" },
  { value: "soldado_patrullero", label: "Soldado, patrullero, agente o auxiliar" },
  { value: "funcionario_contratista", label: "Funcionario o contratista" },
  { value: "especifico", label: "Rango o cargo específico, si se conoce" },
  { value: "no_identificado", label: "No se pudo identificar" },
];

export const ROL_GRUPO_ARMADO: Opcion[] = [
  { value: "comandante", label: "Comandante" },
  { value: "mando_medio", label: "Mando medio" },
  { value: "integrante_raso", label: "Integrante raso" },
  { value: "colaborador", label: "Colaborador" },
  { value: "otro", label: "Otro" },
];

export const COMO_ESTABLECIO_PERTENENCIA: Opcion[] = [
  { value: "se_identifico", label: "La persona se identificó como integrante" },
  { value: "insignias", label: "Portaba insignias, brazaletes, uniformes o símbolos" },
  { value: "mensajes_panfletos", label: "Dejó mensajes, panfletos o documentos" },
  { value: "fuente_reconocio", label: "La fuente lo reconoció" },
  { value: "informado_otra_persona", label: "Fue informado por otra persona" },
  { value: "otro", label: "Otro elemento" },
  { value: "pendiente", label: "Pendiente de verificación" },
];

export const INTERES_SOBRE_PREDIO: Opcion[] = [
  { value: "comprador", label: "Comprador" },
  { value: "antiguo_propietario", label: "Antiguo propietario o poseedor" },
  { value: "ocupante_anterior", label: "Ocupante anterior" },
  { value: "tercero_reclamante", label: "Tercero reclamante o litigante" },
  { value: "intermediario", label: "Intermediario" },
  { value: "testaferro", label: "Posible testaferro" },
  { value: "otro", label: "Otro" },
  { value: "no_se_conoce", label: "No se conoce" },
];

export const CAUSAS_HECHO: Opcion[] = [
  { value: "interes_tierra", label: "Interés sobre la tierra o el predio", help: "Intención de ocuparlo, controlarlo, recuperarlo, comprarlo bajo presión o apropiarse de él." },
  { value: "oposicion_ra", label: "Oposición a la Reforma Agraria", help: "Acciones dirigidas a impedir entregas, adjudicaciones, formalizaciones o proyectos de Reforma Agraria." },
  { value: "presion_abandonar", label: "Presión para abandonar o entregar el predio", help: "Amenazas o acciones orientadas a provocar la salida de las personas beneficiarias." },
  { value: "pretension_terceros", label: "Pretensión de antiguos propietarios, ocupantes o terceros", help: "Intento de recuperar, controlar o reclamar el predio." },
  { value: "disputa_linderos", label: "Disputa por linderos", help: "Desacuerdo sobre los límites o la extensión del predio." },
  { value: "disputa_uso_suelo", label: "Disputa por el uso del suelo o de los recursos", help: "Conflicto relacionado con cultivos, ganadería, agua, bosques, vías, servidumbres u otros usos del territorio." },
  { value: "interes_economico", label: "Interés económico o productivo", help: "Intención de controlar actividades productivas, cultivos, maquinaria, animales, recursos naturales o proyectos." },
  { value: "economias_ilegales", label: "Relación con economías ilegales", help: "Interés en utilizar o controlar el territorio para actividades ilícitas." },
  { value: "control_territorial", label: "Control territorial por actores armados", help: "Acciones para imponer autoridad, limitar la movilidad o controlar a la población y el territorio." },
  { value: "retaliacion_liderazgo", label: "Retaliación por liderazgo social o comunitario", help: "Represalia por ejercer funciones de liderazgo, representación u organización." },
  { value: "retaliacion_denuncia", label: "Retaliación por una denuncia previa", help: "Represalia por haber denunciado amenazas, irregularidades, hechos de violencia o actuaciones ilegales." },
  { value: "retaliacion_derechos", label: "Retaliación por reclamar derechos", help: "Represalia por solicitar tierras, restitución, formalización, protección o intervención institucional." },
  { value: "participacion_organizacion", label: "Participación en una organización campesina o comunitaria", help: "Afectación relacionada con la pertenencia o actividad dentro de una organización." },
  { value: "estigmatizacion_politica", label: "Estigmatización política, social o territorial", help: "Señalamiento por ideas políticas, actividad social, procedencia territorial o relación atribuida con algún actor." },
  { value: "presion_desistir", label: "Presión para desistir de un trámite o proceso", help: "Intención de obligar a abandonar una solicitud, adjudicación, denuncia, reclamación o actuación administrativa o judicial." },
  { value: "conflicto_organizaciones", label: "Conflicto entre organizaciones o miembros de la comunidad" },
  { value: "conflicto_personal", label: "Conflicto personal, familiar o económico" },
  { value: "extorsion", label: "Cobro, extorsión o exigencia económica" },
  { value: "otra", label: "Otra causa" },
  { value: "no_se_conoce", label: "No se conoce la causa" },
  { value: "pendiente_verificacion", label: "Causa pendiente de verificación" },
];

export const RUTA_JURIDICA: Opcion[] = [
  { value: "derecho_peticion", label: "Derecho de petición" },
  { value: "denuncia_publica", label: "Denuncia Pública" },
  { value: "alerta", label: "Alerta" },
];

export const ESTADO_CASO: Opcion[] = [
  { value: "recibido", label: "Recibido" },
  { value: "en_verificacion", label: "En verificación" },
  { value: "corroborado", label: "Corroborado" },
  { value: "en_ruta_juridica", label: "En ruta jurídica" },
  { value: "cerrado", label: "Cerrado" },
];

export function labelDe(opciones: Opcion[], value?: string | null) {
  if (!value) return "";
  return opciones.find((o) => o.value === value)?.label ?? value;
}

export function labelesDe(opciones: Opcion[], values?: string[] | null) {
  if (!values || values.length === 0) return [];
  return values.map((v) => labelDe(opciones, v));
}

export function tipologiaLabel(value: string): { derecho: string; label: string } | null {
  for (const g of TIPOLOGIA_HECHO) {
    const it = g.items.find((i) => i.value === value);
    if (it) return { derecho: g.derecho, label: it.label };
  }
  return null;
}
