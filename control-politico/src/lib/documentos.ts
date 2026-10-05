import { AlignmentType, Document, HeadingLevel, Packer, Paragraph, Table, TableCell, TableRow, TextRun, WidthType } from "docx";
import type { Configuracion } from "./configuracion";
import type { DebateCompleto } from "./debates";
import { formatFechaLarga, nombreInstancia } from "./format";
import { EVALUACIONES, type Citado, type Pregunta } from "./types";

export type TipoDocumento = "proposicion" | "respuestas" | "guion";

export const DOCUMENTOS: { tipo: TipoDocumento; titulo: string; descripcion: string }[] = [
  {
    tipo: "proposicion",
    titulo: "Proposición de citación y cuestionario",
    descripcion: "Texto para radicar en la Secretaría General: citación, justificación, cuestionario por funcionario y firmas.",
  },
  {
    tipo: "respuestas",
    titulo: "Matriz de respuestas",
    descripcion: "Cada pregunta con la respuesta de la administración, su evaluación y la repregunta. Para tener a mano en el recinto.",
  },
  {
    tipo: "guion",
    titulo: "Guion de intervención",
    descripcion: "Secciones de la intervención con el tiempo asignado a cada una.",
  },
];

const FALTA = "[COMPLETAR]";

function p(texto: string, opciones: { negrita?: boolean; centro?: boolean; espacio?: number; antes?: number } = {}) {
  return new Paragraph({
    alignment: opciones.centro ? AlignmentType.CENTER : AlignmentType.JUSTIFIED,
    spacing: { before: opciones.antes ?? 0, after: opciones.espacio ?? 160 },
    children: texto.split("\n").map((t, i) => new TextRun({ text: t, bold: opciones.negrita, break: i > 0 ? 1 : 0 })),
  });
}

function parrafos(texto: string) {
  return (texto.trim() || FALTA).split(/\n{2,}|\n/).map((t) => p(t));
}

function titulo(texto: string, nivel: (typeof HeadingLevel)[keyof typeof HeadingLevel] = HeadingLevel.HEADING_2) {
  return new Paragraph({ heading: nivel, spacing: { before: 240, after: 120 }, children: [new TextRun(texto)] });
}

function describirCitado(c: Citado) {
  return [c.nombre, c.cargo, c.entidad && !c.cargo.toLowerCase().includes(c.entidad.toLowerCase()) ? c.entidad : ""]
    .filter(Boolean)
    .join(", ");
}

function agruparPorCitado(d: DebateCompleto) {
  const grupos: { citado: Citado | null; preguntas: Pregunta[] }[] = d.citados.map((c) => ({
    citado: c,
    preguntas: d.preguntas.filter((q) => q.citado_id === c.id),
  }));
  const sueltas = d.preguntas.filter((q) => !q.citado_id || !d.citados.some((c) => c.id === q.citado_id));
  if (sueltas.length) grupos.push({ citado: null, preguntas: sueltas });
  return grupos.filter((g) => g.preguntas.length > 0);
}

function proposicion(d: DebateCompleto, cfg: Configuracion): Paragraph[] {
  const { debate } = d;
  const citados = d.citados.filter((c) => c.tipo === "citado");
  const invitados = d.citados.filter((c) => c.tipo === "invitado");
  const anio = (debate.fecha_radicacion ?? new Date().toISOString()).slice(0, 4);
  const municipio = debate.municipio || cfg.municipio || FALTA;
  const sesion = debate.instancia === "plenaria" ? "sesión plenaria" : `sesión de la ${nombreInstancia(debate)}`;

  const salida: Paragraph[] = [
    p(`${cfg.concejo.toUpperCase()} DE ${municipio.toUpperCase()}`, { negrita: true, centro: true, espacio: 80 }),
    p(`PROPOSICIÓN No. ____ DE ${anio}`, { negrita: true, centro: true, espacio: 80 }),
    p(`Debate de control político: ${debate.titulo}`, { negrita: true, centro: true, espacio: 320 }),
  ];

  const lista = citados.length ? citados.map(describirCitado).join("; ") : FALTA;
  salida.push(
    p(
      `En ejercicio de la función de control político prevista en el numeral 11 del artículo 313 de la Constitución Política y en el artículo 38 de la Ley 136 de 1994, y conforme al reglamento interno de la corporación, cítese a: ${lista}, para que en ${sesion} absuelvan el cuestionario anexo sobre ${debate.tema || FALTA}.`
    )
  );
  if (invitados.length) {
    salida.push(p(`Invítese a: ${invitados.map(describirCitado).join("; ")}.`));
  }
  if (debate.objetivo.trim()) {
    salida.push(titulo("Objetivo del debate"), ...parrafos(debate.objetivo));
  }
  salida.push(titulo("Justificación"), ...parrafos(debate.justificacion));

  salida.push(titulo("Cuestionario", HeadingLevel.HEADING_1));
  let n = 1;
  for (const g of agruparPorCitado(d)) {
    salida.push(titulo(g.citado ? `Para ${describirCitado(g.citado)}` : "Preguntas generales"));
    let eje = "";
    for (const q of g.preguntas) {
      if (q.eje !== eje) {
        eje = q.eje;
        if (eje) salida.push(p(eje, { negrita: true, espacio: 100 }));
      }
      salida.push(p(`${n++}. ${q.texto}`));
    }
  }
  if (n === 1) salida.push(p(FALTA));

  salida.push(
    p("Se solicita que las respuestas se alleguen por escrito, con sus respectivos soportes, dentro del término previsto en el reglamento interno.", {
      espacio: 480,
    }),
    p("Citantes:", { negrita: true })
  );
  const firmantes = (debate.citantes || cfg.concejal || FALTA).split(/\n|,|;/).map((s) => s.trim()).filter(Boolean);
  for (const f of firmantes) {
    salida.push(p("_______________________________", { espacio: 0, antes: 720 }), p(`${f}\nConcejal`, { espacio: 320 }));
  }
  if (debate.bancada) salida.push(p(`Bancada: ${debate.bancada}`));
  return salida;
}

function celda(texto: string, negrita = false) {
  return new TableCell({
    children: (texto || "—").split("\n").map((t) => new Paragraph({ children: [new TextRun({ text: t, bold: negrita, size: 18 })] })),
  });
}

function matrizRespuestas(d: DebateCompleto): (Paragraph | Table)[] {
  const salida: (Paragraph | Table)[] = [
    p(`Matriz de respuestas — ${d.debate.titulo}`, { negrita: true, centro: true }),
  ];
  if (d.debate.fecha_debate) salida.push(p(`Debate: ${formatFechaLarga(d.debate.fecha_debate)}`, { centro: true }));
  let n = 1;
  for (const g of agruparPorCitado(d)) {
    salida.push(titulo(g.citado ? describirCitado(g.citado) : "Preguntas generales"));
    salida.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            tableHeader: true,
            children: ["#", "Pregunta", "Respuesta", "Evaluación", "Repregunta"].map((t) => celda(t, true)),
          }),
          ...g.preguntas.map(
            (q) =>
              new TableRow({
                children: [
                  celda(String(n++)),
                  celda(q.texto),
                  celda(q.respuesta),
                  celda(EVALUACIONES.find((e) => e.valor === q.evaluacion)?.etiqueta ?? ""),
                  celda(q.repregunta),
                ],
              })
          ),
        ],
      })
    );
  }
  return salida;
}

function guion(d: DebateCompleto): Paragraph[] {
  const total = d.guion.reduce((s, x) => s + Number(x.minutos), 0);
  const salida = [
    p(`Guion de intervención — ${d.debate.titulo}`, { negrita: true, centro: true }),
    p(`Tiempo total previsto: ${total} minutos`, { centro: true, espacio: 320 }),
  ];
  for (const s of d.guion) {
    salida.push(titulo(`${s.titulo} (${s.minutos} min)`), ...parrafos(s.contenido));
  }
  const repreguntas = d.preguntas.filter((q) => q.repregunta.trim());
  if (repreguntas.length) {
    salida.push(titulo("Repreguntas preparadas"));
    repreguntas.forEach((q, i) => salida.push(p(`${i + 1}. ${q.repregunta}`)));
  }
  return salida;
}

export async function generarDocumento(tipo: TipoDocumento, d: DebateCompleto, cfg: Configuracion): Promise<Buffer> {
  const hijos = tipo === "proposicion" ? proposicion(d, cfg) : tipo === "respuestas" ? matrizRespuestas(d) : guion(d);
  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 22 } } } },
    sections: [{ children: hijos }],
  });
  return Packer.toBuffer(doc);
}
