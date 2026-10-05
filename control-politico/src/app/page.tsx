import Link from "next/link";
import { cargarEjemploAccion } from "./actions";
import BotonEnviar from "@/components/BotonEnviar";
import EstadoBadge from "@/components/EstadoBadge";
import { diasParaDebate } from "@/lib/analisis";
import { listarDebates } from "@/lib/debates";
import { formatFecha, nombreInstancia, textoDias } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function Inicio({ searchParams }: { searchParams: Promise<{ guardado?: string }> }) {
  const [debates, { guardado }] = await Promise.all([listarDebates(), searchParams]);
  const proximos = debates.filter((d) => d.estado !== "realizado" && d.estado !== "archivado");
  const otros = debates.filter((d) => !proximos.includes(d));

  return (
    <main>
      {guardado && (
        <p className="mb-4 rounded-lg bg-emerald-50 px-4 py-2 text-sm font-medium text-emerald-800">Configuración guardada.</p>
      )}
      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-neutral-900">Debates de control político</h1>
          <p className="text-sm text-neutral-500">Proposición, cuestionario, pruebas, plazos y guion de cada debate.</p>
        </div>
        <Link href="/debates/nuevo" className="btn-primario">+ Nuevo debate</Link>
      </div>

      {debates.length === 0 ? (
        <div className="tarjeta py-12 text-center">
          <p className="text-lg font-semibold text-neutral-800">Todavía no hay debates</p>
          <p className="mx-auto mt-1 max-w-md text-sm text-neutral-500">
            Cree el primero o cargue un debate de ejemplo (con datos ficticios) para conocer la herramienta.
          </p>
          <div className="mt-5 flex justify-center gap-2">
            <Link href="/debates/nuevo" className="btn-primario">Crear debate</Link>
            <form action={cargarEjemploAccion}>
              <BotonEnviar className="btn-secundario" pendiente="Cargando…">Cargar ejemplo</BotonEnviar>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          <Lista titulo="En preparación" debates={proximos} />
          {otros.length > 0 && <Lista titulo="Realizados y archivados" debates={otros} />}
        </div>
      )}
    </main>
  );
}

function Lista({ titulo, debates }: { titulo: string; debates: Awaited<ReturnType<typeof listarDebates>> }) {
  if (debates.length === 0) return null;
  return (
    <section>
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-neutral-500">{titulo}</h2>
      <div className="grid gap-3 md:grid-cols-2">
        {debates.map((d) => {
          const dias = diasParaDebate(d.fecha_debate);
          const urgente = dias !== null && dias >= 0 && dias <= 7 && d.estado !== "realizado";
          return (
            <Link key={d.id} href={`/debates/${d.id}`} className="tarjeta block transition hover:border-marca-300">
              <div className="mb-2 flex items-start justify-between gap-3">
                <h3 className="font-semibold leading-snug text-neutral-900">{d.titulo}</h3>
                <EstadoBadge estado={d.estado} />
              </div>
              <p className="text-sm text-neutral-500">
                {nombreInstancia(d)}
                {d.municipio && ` · ${d.municipio}`}
              </p>
              <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1 text-sm">
                <span className={urgente ? "font-semibold text-red-700" : "text-neutral-700"}>
                  {formatFecha(d.fecha_debate)} · {textoDias(dias)}
                </span>
                <span className="text-neutral-500">
                  {d.total_citados} citado(s) · {d.total_preguntas} pregunta(s)
                  {d.total_preguntas > 0 && ` · ${d.preguntas_respondidas} evaluada(s)`}
                </span>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
