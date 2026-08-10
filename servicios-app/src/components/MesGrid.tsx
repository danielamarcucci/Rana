import { actualizarPago } from "@/app/actions";
import { nombreMesCorto } from "@/lib/format";
import type { EstadoPago } from "@/lib/types";

export default function MesGrid({
  servicioId,
  anio,
  mesActual,
  anioActual,
  estadosPorMes,
}: {
  servicioId: number;
  anio: number;
  mesActual: number;
  anioActual: number;
  estadosPorMes: Map<number, EstadoPago>;
}) {
  const meses = Array.from({ length: 12 }, (_, i) => i + 1);

  return (
    <div className="grid grid-cols-3 gap-2.5 sm:grid-cols-4">
      {meses.map((mes) => {
        const estado = estadosPorMes.get(mes) ?? "pendiente";
        const pagado = estado === "pagado";
        const esMesActual = anio === anioActual && mes === mesActual;
        const nuevoEstado: EstadoPago = pagado ? "pendiente" : "pagado";

        return (
          <form key={mes} action={actualizarPago}>
            <input type="hidden" name="servicioId" value={servicioId} />
            <input type="hidden" name="anio" value={anio} />
            <input type="hidden" name="mes" value={mes} />
            <input type="hidden" name="estado" value={nuevoEstado} />
            <button
              type="submit"
              className={`flex w-full flex-col items-center gap-1 rounded-xl border-2 py-3 text-sm font-bold ${
                pagado
                  ? "border-pagado-300 bg-pagado-50 text-pagado-800"
                  : "border-neutral-200 bg-neutral-50 text-neutral-500"
              } ${esMesActual ? "ring-2 ring-marca-500 ring-offset-1" : ""}`}
            >
              <span className="text-xl leading-none">{pagado ? "✅" : "⬜"}</span>
              {nombreMesCorto(mes)}
            </button>
          </form>
        );
      })}
    </div>
  );
}
