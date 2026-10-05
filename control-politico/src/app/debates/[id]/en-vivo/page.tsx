import ModoDebate from "@/components/ModoDebate";
import { cargarDebate } from "@/lib/cargar";

export default async function EnVivo({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { guion, preguntas, citados, fuentes } = await cargarDebate(id);
  const cargo = (cid: number | null) => citados.find((c) => c.id === cid)?.cargo ?? "";
  return (
    <ModoDebate
      secciones={guion.map((s) => ({ id: Number(s.id), titulo: s.titulo, contenido: s.contenido, minutos: Number(s.minutos) }))}
      repreguntas={preguntas
        .filter((p) => p.repregunta.trim() || p.evaluacion === "evasiva" || p.evaluacion === "no_respondida")
        .map((p) => ({ id: Number(p.id), texto: p.repregunta || p.texto, para: cargo(p.citado_id), evaluacion: p.evaluacion }))}
      pruebas={fuentes.filter((f) => f.hallazgo.trim()).map((f) => ({ id: Number(f.id), titulo: f.titulo, hallazgo: f.hallazgo, verificada: !!f.verificada }))}
    />
  );
}
