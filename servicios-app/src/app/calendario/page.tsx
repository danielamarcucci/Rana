import Link from "next/link";
import { actualizarPago } from "@/app/actions";
import EstadoBadge from "@/components/EstadoBadge";
import { fechaHoy, iconoConcepto, nombreMes } from "@/lib/format";
import { listarServiciosConEstado, resumenMes } from "@/lib/servicios";
import type { EstadoPago } from "@/lib/types";

export const dynamic = "force-dynamic";

function mesAnterior(anio: number, mes: number) {
  return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

function mesSiguiente(anio: number, mes: number) {
  return mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
}

export default async function CalendarioPage({
  searchParams,
}: {
  searchParams: Promise<{ anio?: string; mes?: string }>;
}) {
  const { anio: anioParam, mes: mesParam } = await searchParams;
  const { anio: anioActual, mes: mesActual } = fechaHoy();
  const anio = anioParam ? Number(anioParam) : anioActual;
  const mes = mesParam ? Number(mesParam) : mesActual;

  const [servicios, resumen] = await Promise.all([
    listarServiciosConEstado(anio, mes),
    resumenMes(anio, mes),
  ]);

  const anterior = mesAnterior(anio, mes);
  const siguiente = mesSiguiente(anio, mes);
  const esMesActual = anio === anioActual && mes === mesActual;

  return (
    <main className="px-4 pt-6">
      <header className="mb-4">
        <h1 className="text-3xl font-extrabold text-neutral-900">Calendario</h1>
        <p className="text-base text-neutral-500">Recorre mes a mes todos tus servicios</p>
      </header>

      <div className="mb-4 flex items-center justify-between rounded-2xl bg-white p-2 shadow-card">
        <Link
          href={`/calendario?anio=${anterior.anio}&mes=${anterior.mes}`}
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold text-marca-700 active:bg-neutral-100"
          aria-label="Mes anterior"
        >
          ‹
        </Link>
        <div className="text-center">
          <span className="block text-xl font-extrabold text-neutral-900">
            {nombreMes(mes)} {anio}
          </span>
          {!esMesActual && (
            <Link
              href={`/calendario?anio=${anioActual}&mes=${mesActual}`}
              className="text-sm font-semibold text-marca-600"
            >
              Volver al mes actual
            </Link>
          )}
        </div>
        <Link
          href={`/calendario?anio=${siguiente.anio}&mes=${siguiente.mes}`}
          className="flex h-12 w-12 items-center justify-center rounded-full text-2xl font-bold text-marca-700 active:bg-neutral-100"
          aria-label="Mes siguiente"
        >
          ›
        </Link>
      </div>

      <div className="mb-4 rounded-2xl bg-white p-4 shadow-card">
        <p className="text-lg font-bold text-neutral-900">
          {resumen.pagados} de {resumen.total} pagados
        </p>
        <div className="mt-2 h-3 w-full overflow-hidden rounded-full bg-neutral-100">
          <div
            className={`h-full rounded-full ${
              resumen.pagados === resumen.total ? "bg-pagado-500" : "bg-marca-500"
            }`}
            style={{ width: `${resumen.total > 0 ? (resumen.pagados / resumen.total) * 100 : 0}%` }}
          />
        </div>
      </div>

      <div className="space-y-2.5">
        {servicios.map((s) => {
          const nuevoEstado: EstadoPago = s.estado_mes_actual === "pagado" ? "pendiente" : "pagado";
          return (
            <div
              key={s.id}
              className="flex items-center gap-3 rounded-2xl border border-black/5 bg-white px-4 py-3 shadow-card"
            >
              <span className="text-2xl" aria-hidden>
                {iconoConcepto(s.concepto)}
              </span>
              <Link href={`/servicio/${s.id}`} className="flex-1">
                <span className="block text-base font-bold text-neutral-900">{s.concepto}</span>
                <span className="block text-sm text-neutral-500">{s.detalle}</span>
              </Link>
              <form action={actualizarPago}>
                <input type="hidden" name="servicioId" value={s.id} />
                <input type="hidden" name="anio" value={anio} />
                <input type="hidden" name="mes" value={mes} />
                <input type="hidden" name="estado" value={nuevoEstado} />
                <button type="submit">
                  <EstadoBadge estado={s.estado_mes_actual} tamano="sm" />
                </button>
              </form>
            </div>
          );
        })}
      </div>
      <p className="mt-3 px-1 text-sm text-neutral-400">Toca el estado para cambiarlo.</p>
    </main>
  );
}
