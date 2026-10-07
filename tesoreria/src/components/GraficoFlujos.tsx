import { pesos } from "@/lib/dinero";
import { mesCorto, mes } from "@/lib/fechas";
import type { PuntoMensual } from "@/lib/datos/finanzas";

// Colores validados (CVD ΔE 16.6, contraste ≥ 3:1): olivo vivo y tierra de la Red.
const C_ING = "#7A9A2E";
const C_EGR = "#8C4415";

function compacto(centavos: number): string {
  const p = centavos / 100;
  if (Math.abs(p) >= 1_000_000) return `$${(p / 1_000_000).toLocaleString("es-CO", { maximumFractionDigits: 1 })} M`;
  if (Math.abs(p) >= 1_000) return `$${(p / 1_000).toLocaleString("es-CO", { maximumFractionDigits: 0 })} mil`;
  return `$${p.toLocaleString("es-CO")}`;
}

function escala(max: number): number[] {
  if (max <= 0) return [0];
  const bruto = max / 4;
  const pot = Math.pow(10, Math.floor(Math.log10(bruto)));
  const paso = [1, 2, 2.5, 5, 10].map((m) => m * pot).find((p) => p >= bruto) ?? bruto;
  const out: number[] = [];
  for (let v = 0; v <= max + paso * 0.001; v += paso) out.push(v);
  if (out[out.length - 1] < max) out.push(out[out.length - 1] + paso);
  return out;
}

/** Barras agrupadas por mes: ingresos verificados y egresos netos verificados. */
export function GraficoFlujos({ datos }: { datos: PuntoMensual[] }) {
  const puntos = datos.slice(-12);
  const max = Math.max(0, ...puntos.flatMap((p) => [p.ingresos, p.egresos]));
  const ticks = escala(max);
  const tope = ticks[ticks.length - 1] || 1;
  const W = 720, H = 240, izq = 64, der = 8, arr = 10, abj = 26;
  const ancho = (W - izq - der) / Math.max(puntos.length, 1);
  const barra = Math.min(22, (ancho - 10) / 2);
  const y = (v: number) => arr + (H - arr - abj) * (1 - Math.max(v, 0) / tope);
  const base = y(0);

  const rect = (x: number, v: number, color: string, titulo: string) => {
    const top = y(v);
    const h = base - top;
    if (h <= 0.5) return null;
    const r = Math.min(4, h);
    // Esquinas redondeadas solo arriba; la base queda recta sobre el eje.
    const d = `M${x},${base} V${top + r} Q${x},${top} ${x + r},${top} H${x + barra - r} Q${x + barra},${top} ${x + barra},${top + r} V${base} Z`;
    return (
      <path d={d} fill={color}>
        <title>{titulo}</title>
      </path>
    );
  };

  return (
    <figure>
      <div className="mb-2 flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-gris" aria-hidden="true">
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_ING }} /> Ingresos verificados</span>
        <span className="inline-flex items-center gap-1.5"><span className="h-2.5 w-2.5 rounded-sm" style={{ background: C_EGR }} /> Egresos verificados (netos de reembolsos)</span>
      </div>
      <div className="overflow-x-auto"><svg viewBox={`0 0 ${W} ${H}`} className="h-auto w-full min-w-[540px]" role="img" aria-label="Ingresos y egresos verificados por mes. El detalle está en la tabla siguiente.">
        {ticks.map((t) => (
          <g key={t}>
            <line x1={izq} x2={W - der} y1={y(t)} y2={y(t)} stroke="#DBE1CE" strokeWidth={t === 0 ? 1.2 : 0.8} />
            <text x={izq - 8} y={y(t) + 4} textAnchor="end" fontSize="11" fill="#5F6752">{compacto(t)}</text>
          </g>
        ))}
        {puntos.map((p, i) => {
          const x0 = izq + i * ancho + (ancho - (barra * 2 + 2)) / 2;
          return (
            <g key={p.periodo} className="[&:hover>rect]:fill-[#ECF0E4]">
              <rect x={izq + i * ancho} y={arr} width={ancho} height={H - arr - abj} fill="transparent">
                <title>{`${mes(p.periodo)}\nIngresos: ${pesos(p.ingresos)}\nEgresos: ${pesos(p.egresos)}`}</title>
              </rect>
              {rect(x0, p.ingresos, C_ING, `${mes(p.periodo)} · Ingresos: ${pesos(p.ingresos)}`)}
              {rect(x0 + barra + 2, p.egresos, C_EGR, `${mes(p.periodo)} · Egresos: ${pesos(p.egresos)}`)}
              <text x={izq + i * ancho + ancho / 2} y={H - 8} textAnchor="middle" fontSize="11" fill="#5F6752">{mesCorto(p.periodo)}</text>
            </g>
          );
        })}
      </svg></div>
      <details className="mt-2 text-sm">
        <summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Ver como tabla</summary>
        <div className="mt-2 overflow-x-auto">
          <table className="tabla">
            <thead><tr><th>Mes</th><th className="der">Ingresos</th><th className="der">Egresos</th><th className="der">Diferencia</th></tr></thead>
            <tbody>
              {puntos.map((p) => (
                <tr key={p.periodo}>
                  <td className="capitalize">{mes(p.periodo)}</td>
                  <td className="der">{pesos(p.ingresos)}</td>
                  <td className="der">{pesos(p.egresos)}</td>
                  <td className="der">{pesos(p.ingresos - p.egresos)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
