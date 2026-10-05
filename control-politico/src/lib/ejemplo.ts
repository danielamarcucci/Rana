import { db } from "./db";
import { crearDebate } from "./debates";
import { hoyIso, restarDiasHabiles, sumarDiasHabiles } from "./plazos";

// Debate de ejemplo con datos ficticios, para conocer la herramienta.
export async function cargarEjemplo(): Promise<number> {
  const hoy = hoyIso();
  const id = await crearDebate({
    titulo: "Programa de Alimentación Escolar: cobertura, calidad y contratación",
    tema: "la ejecución del Programa de Alimentación Escolar (PAE) en la vigencia actual",
    municipio: "Municipio de ejemplo",
    instancia: "plenaria",
    instancia_otra: "",
    citantes: "Concejal de ejemplo 1\nConcejal de ejemplo 2",
    bancada: "",
    justificacion:
      "Durante el primer semestre, padres de familia y rectores de varias instituciones educativas reportaron días sin servicio de alimentación, raciones incompletas y menús que no corresponden a la minuta aprobada.\n\nEl PAE se financia con recursos del Sistema General de Participaciones, cofinanciación nacional y recursos propios, por lo que el concejo debe verificar que la contratación, la supervisión y la cobertura correspondan a lo planeado.",
    objetivo:
      "Establecer la cobertura real del PAE frente a la meta del plan de desarrollo, las causas de las interrupciones del servicio y las acciones de supervisión y sanción frente al operador.",
    fecha_radicacion: restarDiasHabiles(hoy, 3),
    fecha_aprobacion: null,
    fecha_debate: sumarDiasHabiles(hoy, 15),
    estado: "proposicion_radicada",
  });

  const c = await db.run(
    "INSERT INTO citados (debate_id, nombre, cargo, entidad, tipo, orden) VALUES (?, '', 'Secretario(a) de Educación', 'Alcaldía municipal', 'citado', 0)",
    [id]
  );
  const educacion = Number(c.lastInsertRowid);
  const h = await db.run(
    "INSERT INTO citados (debate_id, nombre, cargo, entidad, tipo, orden) VALUES (?, '', 'Secretario(a) de Hacienda', 'Alcaldía municipal', 'citado', 1)",
    [id]
  );
  const hacienda = Number(h.lastInsertRowid);
  await db.run(
    "INSERT INTO citados (debate_id, nombre, cargo, entidad, tipo, orden) VALUES (?, '', 'Personero(a) municipal', 'Personería', 'invitado', 2)",
    [id]
  );

  const preguntas: [number, string, string, string][] = [
    [educacion, "Cobertura", "Indique el número de estudiantes focalizados y el número de raciones entregadas por mes, discriminado por institución educativa y modalidad (preparada en sitio, industrializada).", "Contrastar con la meta del plan de desarrollo."],
    [educacion, "Cobertura", "¿Hubo interrupciones del servicio?", "Pregunta cerrada a propósito, para ver la observación de la herramienta."],
    [educacion, "Contratación y supervisión", "Relacione los contratos suscritos para la operación del PAE en la vigencia: número, operador, valor, plazo y supervisor designado. Anexe copia de los informes de supervisión.", "Verificar si hubo incumplimientos documentados."],
    [educacion, "Contratación y supervisión", "Indique qué requerimientos, multas o procesos sancionatorios se han iniciado contra el operador, con fecha y estado actual.", ""],
    [hacienda, "Financiación", "Detalle las fuentes de financiación del PAE en la vigencia (SGP, cofinanciación nacional, recursos propios), con valor apropiado, comprometido y pagado a la fecha.", "Ver si los atrasos en pagos explican las interrupciones."],
  ];
  await db.batch(
    preguntas.map(([citado, eje, texto, proposito], orden) => ({
      sql: "INSERT INTO preguntas (debate_id, citado_id, eje, texto, proposito, orden) VALUES (?, ?, ?, ?, ?, ?)",
      args: [id, citado, eje, texto, proposito, orden],
    }))
  );

  await db.batch([
    {
      sql: "INSERT INTO fuentes (debate_id, tipo, titulo, descripcion, url, hallazgo, verificada) VALUES (?, 'testimonio', 'Quejas de padres de familia', 'Mensajes y fotos recibidos en la oficina del concejal.', '', 'Reportes de días sin servicio en al menos 4 sedes rurales.', 0)",
      args: [id],
    },
    {
      sql: "INSERT INTO fuentes (debate_id, tipo, titulo, descripcion, url, hallazgo, verificada) VALUES (?, 'documento', 'Contrato de operación del PAE (SECOP II)', 'Buscar el proceso en SECOP II con el nombre del municipio y PAE.', 'https://www.colombiacompra.gov.co/secop-ii', '', 0)",
      args: [id],
    },
    {
      sql: "INSERT INTO peticiones (debate_id, entidad, asunto, radicado, tipo, fecha_envio, estado, notas) VALUES (?, 'Secretaría de Educación', 'Informes de supervisión del contrato PAE', '', 'informacion', ?, 'enviada', '')",
      args: [id, restarDiasHabiles(hoy, 4)],
    },
  ]);

  return id;
}
