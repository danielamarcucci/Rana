import { cargarDebate } from "@/lib/cargar";
import { DOCUMENTOS } from "@/lib/documentos";

export default async function Documentos({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { debate } = await cargarDebate(id);
  return (
    <div className="space-y-4">
      <div className="grid gap-4 md:grid-cols-3">
        {DOCUMENTOS.map((doc) => (
          <div key={doc.tipo} className="tarjeta flex flex-col">
            <h2 className="font-semibold">{doc.titulo}</h2>
            <p className="mb-4 mt-1 flex-1 text-sm text-neutral-500">{doc.descripcion}</p>
            <a href={`/api/debates/${debate.id}/documento/${doc.tipo}`} className="btn-primario">
              Descargar Word
            </a>
          </div>
        ))}
      </div>
      <p className="rounded-lg bg-amber-50 p-3 text-sm text-amber-900">
        Los documentos se arman con lo que haya registrado. Los datos faltantes aparecen como <b>[COMPLETAR]</b>. Revise el texto
        y ajústelo al formato y al reglamento interno de su concejo antes de radicar.
      </p>
    </div>
  );
}
