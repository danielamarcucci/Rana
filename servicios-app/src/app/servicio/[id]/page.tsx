import Link from "next/link";
import { notFound } from "next/navigation";
import { actualizarPago } from "@/app/actions";
import EstadoBadge from "@/components/EstadoBadge";
import MesGrid from "@/components/MesGrid";
import { fechaHoy, formatFecha, iconoConcepto, nombreMes } from "@/lib/format";
import { listarPagosAnio, obtenerEstadoMes, obtenerServicio } from "@/lib/servicios";

export const dynamic = "force-dynamic";

export default async function ServicioPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ anio?: string }>;
}) {
  const { id } = await params;
  const { anio: anioParam } = await searchParams;
  const servicioId = Number(id);
  const servicio = await obtenerServicio(servicioId);
  if (!servicio) notFound();

  const { anio: anioActual, mes: mesActual } = fechaHoy();
  const anio = anioParam ? Number(anioParam) : anioActual;

  const [pagoMesActual, pagosAnio, ultimoPago] = await Promise.all([
    obtenerEstadoMes(servicioId, anioActual, mesActual),
    listarPagosAnio(servicioId, anio),
    (async () => {
      const pagos = await listarPagosAnio(servicioId, anioActual);
      const pagados = Array.from(pagos.values()).filter((p) => p.estado === "pagado" && p.fecha_pago);
      pagados.sort((a, b) => (a.fecha_pago! < b.fecha_pago! ? 1 : -1));
      return pagados[0]?.fecha_pago ?? null;
    })(),
  ]);

  const estadoMesActual = pagoMesActual?.estado ?? "pendiente";
  const estadosPorMes = new Map(Array.from(pagosAnio.entries()).map(([m, p]) => [m, p.estado]));
  const nuevoEstadoMesActual = estadoMesActual === "pagado" ? "pendiente" : "pagado";

  return (
    <main className="px-4 pt-5">
      <Link href="/" className="mb-4 inline-flex items-center gap-1 text-base font-semibold text-marca-700">
        ‹ Inicio
      </Link>

      <header className="mb-4 flex items-start gap-3">
        <span className="text-4xl" aria-hidden>
          {iconoConcepto(servicio.concepto)}
        </span>
        <div>
          <h1 className="text-2xl font-extrabold text-neutral-900">{servicio.concepto}</h1>
          <p className="text-base text-neutral-500">{servicio.detalle}</p>
        </div>
      </header>

      <section className="rounded-2xl bg-white p-4 shadow-card">
        <dl className="space-y-1.5 text-base">
          {servicio.tipo_cuenta && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">{servicio.tipo_cuenta}</dt>
              <dd className="font-semibold text-neutral-900">{servicio.numero_cuenta}</dd>
            </div>
          )}
          {ultimoPago && (
            <div className="flex justify-between gap-3">
              <dt className="text-neutral-500">Último pago registrado</dt>
              <dd className="font-semibold text-neutral-900">{formatFecha(ultimoPago)}</dd>
            </div>
          )}
        </dl>
      </section>

      <section className="mt-4 rounded-2xl bg-white p-4 text-center shadow-card">
        <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">
          {nombreMes(mesActual)} {anioActual}
        </p>
        <div className="my-3 flex justify-center">
          <EstadoBadge estado={estadoMesActual} tamano="lg" />
        </div>
        <form action={actualizarPago}>
          <input type="hidden" name="servicioId" value={servicioId} />
          <input type="hidden" name="anio" value={anioActual} />
          <input type="hidden" name="mes" value={mesActual} />
          <input type="hidden" name="estado" value={nuevoEstadoMesActual} />
          <button
            type="submit"
            className={`min-h-[60px] w-full rounded-2xl text-xl font-extrabold text-white shadow-card active:scale-[0.98] ${
              estadoMesActual === "pagado" ? "bg-pendiente-500" : "bg-pagado-500"
            }`}
          >
            {estadoMesActual === "pagado" ? "Marcar como pendiente" : "✅ Marcar como pagado"}
          </button>
        </form>
      </section>

      {servicio.link_pago && (
        <a
          href={servicio.link_pago}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-4 flex min-h-[60px] w-full items-center justify-center gap-2 rounded-2xl bg-marca-600 text-xl font-extrabold text-white shadow-card active:scale-[0.98]"
        >
          💳 Botón de pago
        </a>
      )}

      <section className="mt-6">
        <div className="mb-2 flex items-center justify-between px-1">
          <h2 className="text-lg font-bold text-neutral-700">Historial {anio}</h2>
          <div className="flex gap-2">
            <Link
              href={`/servicio/${servicioId}?anio=${anio - 1}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold shadow-card"
            >
              ‹
            </Link>
            <Link
              href={`/servicio/${servicioId}?anio=${anio + 1}`}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-white text-lg font-bold shadow-card"
            >
              ›
            </Link>
          </div>
        </div>
        <MesGrid
          servicioId={servicioId}
          anio={anio}
          mesActual={mesActual}
          anioActual={anioActual}
          estadosPorMes={estadosPorMes}
        />
        <p className="mt-2 px-1 text-sm text-neutral-400">Toca un mes para marcarlo como pagado o pendiente.</p>
      </section>
    </main>
  );
}
