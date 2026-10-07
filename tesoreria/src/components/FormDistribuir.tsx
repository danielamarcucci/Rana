"use client";

import { useActionState, useState } from "react";
import { BotonEnviar, Mensajes } from "./Formulario";
import { leerPesos, pesos, pesosCampo } from "@/lib/dinero";
import { distribuir } from "@/lib/calculos";
import { fecha, mes } from "@/lib/fechas";
import type { EstadoAccion } from "@/lib/tipos";

type Comp = { id: number; destino: string; periodo: string | null; esquema: string; fecha_acordada: string; disponible: number };
const DESTINO: Record<string, string> = { gastos_constitucion: "Constitución · gastos", patrimonio_inicial: "Constitución · patrimonio", sostenimiento: "Mensualidad" };

export function FormDistribuir({
  id, valor, compromisos, actuales, excedenteActual, verificado, accion,
}: {
  id: number; valor: number; compromisos: Comp[]; actuales: Record<number, number>; excedenteActual: string | null; verificado: boolean;
  accion: (p: EstadoAccion, d: FormData) => Promise<EstadoAccion>;
}) {
  const [estado, despachar] = useActionState(accion, undefined);
  const [apps, setApps] = useState<Record<number, string>>(Object.fromEntries(Object.entries(actuales).map(([k, v]) => [k, pesosCampo(v)])));
  const [exc, setExc] = useState(excedenteActual ?? "");
  const total = Object.values(apps).reduce((a, v) => a + (leerPesos(v) ?? 0), 0);
  const resto = valor - total;
  return (
    <form action={despachar} className="space-y-4">
      <input type="hidden" name="id" value={id} />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm">Valor recibido: <strong className="num">{pesos(valor)}</strong></p>
        <button type="button" className="btn-secundario px-3 py-1.5 text-xs"
          onClick={() => setApps(Object.fromEntries(distribuir(valor, compromisos.map((c) => ({ id: c.id, saldo: c.disponible }))).asignaciones.map((a) => [a.compromiso_id, pesosCampo(a.valor)])))}>
          Distribuir desde el más antiguo
        </button>
      </div>
      <div className="panel overflow-x-auto">
        <table className="tabla">
          <thead><tr><th>Compromiso</th><th>Fecha acordada</th><th className="der">Disponible</th><th className="der">Abonar</th></tr></thead>
          <tbody>
            {compromisos.map((c) => (
              <tr key={c.id}>
                <td>{DESTINO[c.destino]}{c.periodo ? ` · ${mes(c.periodo)}` : ""}<span className="block text-xs text-gris">{c.esquema}</span></td>
                <td className="num">{fecha(c.fecha_acordada)}</td>
                <td className="der">{pesos(c.disponible)}</td>
                <td className="der"><input name={`aplicacion_${c.id}`} inputMode="decimal" className="entrada num w-32 py-1 text-right" value={apps[c.id] ?? ""} onChange={(e) => setApps({ ...apps, [c.id]: e.target.value })} aria-label="Valor a abonar" /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="text-sm">Distribuido: <strong className="num">{pesos(total)}</strong> · Excedente: <strong className={`num ${resto < 0 ? "text-alerta" : ""}`}>{pesos(resto)}</strong></p>
      {resto > 0 && (verificado ? (
        <input type="hidden" name="excedente_destino" value={excedenteActual ?? ""} />
      ) : (
        <div className="space-y-1.5 text-sm">
          <label className="flex items-center gap-2"><input type="radio" name="excedente_destino" value="saldo_a_favor" checked={exc === "saldo_a_favor"} onChange={() => setExc("saldo_a_favor")} /> Saldo a favor del aportante</label>
          <label className="flex items-center gap-2"><input type="radio" name="excedente_destino" value="aporte_adicional" checked={exc === "aporte_adicional"} onChange={() => setExc("aporte_adicional")} /> Aporte adicional voluntario</label>
        </div>
      ))}
      <BotonEnviar>Guardar distribución</BotonEnviar>
      <Mensajes estado={estado} />
    </form>
  );
}
