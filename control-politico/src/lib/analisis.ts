import type { Configuracion } from "./configuracion";
import type { DebateCompleto } from "./debates";
import { diasHabilesHasta, hoyIso, restarDiasHabiles, sumarDiasHabiles } from "./plazos";
import { TIPOS_PETICION, type Peticion, type Pregunta } from "./types";

// Reglas fijas (sin IA) que ayudan a preparar el debate: cronograma de plazos,
// lista de verificación y observaciones sobre la redacción de las preguntas.

export type Hito = {
  clave: string;
  etiqueta: string;
  fecha: string | null;
  detalle: string;
  cumplido: boolean;
};

export function cronograma(d: DebateCompleto, cfg: Configuracion): Hito[] {
  const { debate } = d;
  const fd = debate.fecha_debate;
  // Cálculo conservador: deja `n` días hábiles completos entre el envío del
  // cuestionario y el día del debate, sin contar ninguno de los dos.
  const limiteCuestionario = fd ? restarDiasHabiles(fd, cfg.diasAnticipacionCitacion + 1) : null;
  const limitePeticiones = limiteCuestionario ? restarDiasHabiles(limiteCuestionario, 10) : null;
  const limiteRespuestas = fd ? restarDiasHabiles(fd, cfg.diasRespuestaAntesDebate) : null;
  const avanzado = (estados: string[]) => estados.includes(debate.estado);

  return [
    {
      clave: "peticiones",
      etiqueta: "Último día para enviar derechos de petición de información",
      fecha: limitePeticiones,
      detalle: "Con 10 días hábiles de plazo (Ley 1755 de 2015, art. 14), la respuesta llega antes de cerrar el cuestionario.",
      cumplido: d.peticiones.length > 0,
    },
    {
      clave: "radicacion",
      etiqueta: "Radicación de la proposición",
      fecha: debate.fecha_radicacion,
      detalle: "Proposición con el cuestionario anexo, firmada por los citantes.",
      cumplido: !!debate.fecha_radicacion,
    },
    {
      clave: "aprobacion",
      etiqueta: "Aprobación de la proposición",
      fecha: debate.fecha_aprobacion,
      detalle: "Votación en plenaria o comisión según el reglamento interno.",
      cumplido: !!debate.fecha_aprobacion,
    },
    {
      clave: "cuestionario",
      etiqueta: "Límite para enviar el cuestionario a los citados",
      fecha: limiteCuestionario,
      detalle: `Anticipación no menor de ${cfg.diasAnticipacionCitacion} días (Constitución, art. 313 num. 11). Cálculo en días hábiles, conservador.`,
      cumplido: avanzado(["cuestionario_enviado", "respuestas_recibidas", "realizado"]),
    },
    {
      clave: "respuestas",
      etiqueta: "Respuestas escritas de la administración",
      fecha: limiteRespuestas,
      detalle: `Configurado a ${cfg.diasRespuestaAntesDebate} días hábiles antes del debate (verifique el reglamento interno del concejo).`,
      cumplido: avanzado(["respuestas_recibidas", "realizado"]),
    },
    {
      clave: "debate",
      etiqueta: "Debate",
      fecha: fd,
      detalle: "El debate encabeza el orden del día y no puede extenderse a asuntos ajenos al cuestionario.",
      cumplido: avanzado(["realizado"]),
    },
  ];
}

export type Verificacion = { etiqueta: string; ok: boolean; ayuda?: string; href?: string };

export function listaVerificacion(d: DebateCompleto): Verificacion[] {
  const { debate, citados, preguntas, fuentes, peticiones, guion } = d;
  const citadosReales = citados.filter((c) => c.tipo === "citado");
  const sinPreguntas = citadosReales.filter((c) => !preguntas.some((p) => p.citado_id === c.id));
  const sinDestinatario = preguntas.filter((p) => !p.citado_id).length;
  const peticionesAbiertas = peticiones.filter((p) => estadoPeticion(p).vencida && p.estado === "enviada").length;
  const minutos = guion.reduce((s, x) => s + Number(x.minutos), 0);

  return [
    { etiqueta: "Tema y objetivo del debate definidos", ok: !!debate.tema.trim() && !!debate.objetivo.trim(), href: "" },
    { etiqueta: "Justificación redactada", ok: debate.justificacion.trim().length > 80, ayuda: "Al menos un párrafo que explique por qué se cita.", href: "" },
    { etiqueta: "Al menos un funcionario citado", ok: citadosReales.length > 0, href: "/cuestionario" },
    {
      etiqueta: "Todos los citados tienen preguntas",
      ok: citadosReales.length > 0 && sinPreguntas.length === 0,
      ayuda: sinPreguntas.length ? `Sin preguntas: ${sinPreguntas.map((c) => c.cargo).join(", ")}` : undefined,
      href: "/cuestionario",
    },
    {
      etiqueta: "Todas las preguntas tienen destinatario",
      ok: preguntas.length > 0 && sinDestinatario === 0,
      ayuda: sinDestinatario ? `${sinDestinatario} pregunta(s) sin citado asignado` : undefined,
      href: "/cuestionario",
    },
    { etiqueta: "Al menos una prueba verificada", ok: fuentes.some((f) => f.verificada), href: "/pruebas" },
    {
      etiqueta: "Sin derechos de petición vencidos sin respuesta",
      ok: peticionesAbiertas === 0,
      ayuda: peticionesAbiertas ? `${peticionesAbiertas} vencido(s): considere insistir o anunciarlo en el debate` : undefined,
      href: "/pruebas",
    },
    { etiqueta: "Proposición radicada", ok: !!debate.fecha_radicacion, href: "" },
    { etiqueta: "Fecha del debate definida", ok: !!debate.fecha_debate, href: "" },
    {
      etiqueta: "Respuestas del cuestionario evaluadas",
      ok: preguntas.length > 0 && preguntas.every((p) => p.evaluacion !== "pendiente"),
      href: "/respuestas",
    },
    { etiqueta: "Guion de intervención preparado", ok: guion.length > 0 && minutos > 0, ayuda: minutos ? `${minutos} minutos en total` : undefined, href: "/guion" },
  ];
}

export function estadoPeticion(p: Peticion, hoy = hoyIso()) {
  const dias = TIPOS_PETICION.find((t) => t.valor === p.tipo)?.dias ?? 15;
  const vence = sumarDiasHabiles(p.fecha_envio, dias);
  const restantes = diasHabilesHasta(hoy, vence);
  return { vence, restantes, vencida: restantes < 0 };
}

const INICIO_CERRADA = /^¿?\s*(es|son|fue|fueron|existe|existen|hay|hubo|ha|han|tiene|tienen|cuenta|cuentan|sabe|conoce|puede|considera|está|están|se ha|se han)\b/i;
const PIDE_SOPORTE = /(cu[aá]nt|cu[aá]l|qu[eé] |relaci[oó]n|detall|soporte|copia|document|cifra|valor|monto|fecha|porcentaje|listado|lista|indique|informe|discrimin|desagreg)/i;

export function observacionesPregunta(p: Pick<Pregunta, "texto">): string[] {
  const t = p.texto.trim();
  const obs: string[] = [];
  if (!t) return obs;
  if ((t.match(/\?/g) ?? []).length > 1) {
    obs.push("Tiene varias preguntas en una: sepárelas para que no se responda solo la más cómoda.");
  }
  if (INICIO_CERRADA.test(t)) {
    obs.push("Se puede responder con un sí o un no: pida cifras, fechas, documentos o responsables.");
  }
  if (!PIDE_SOPORTE.test(t)) {
    obs.push("No pide datos verificables (cifras, fechas, contratos, soportes).");
  }
  if (t.length > 600) {
    obs.push("Es muy larga: el citado puede escoger qué parte responder.");
  }
  return obs;
}

export function diasParaDebate(fecha: string | null): number | null {
  if (!fecha) return null;
  return diasHabilesHasta(hoyIso(), fecha);
}
