import Link from "next/link";
import { notFound } from "next/navigation";
import { leer } from "@/lib/sesion";
import { esquemas, ORGANO } from "@/lib/datos/aportes";
import { soportesDe } from "@/lib/comprobantes";
import { historialDe } from "@/lib/datos/movimientos";
import { pesos } from "@/lib/dinero";
import { fecha, fechaHora } from "@/lib/fechas";
import { Aviso, Encabezado, Seccion } from "@/components/ui";
import { EstadoEsquema } from "@/components/EstadoEsquema";
import { FormEsquema } from "@/components/FormEsquema";
import { ListaSoportes } from "@/components/ListaSoportes";
import { Historial } from "@/components/Historial";

export const metadata = { title: "Esquema de aportes" };

export default async function EsquemaDetalle({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(id)) notFound();
  const d = await leer(async (tx, s) => {
    const e = (await esquemas(tx)).find((x) => x.id === Number(id));
    if (!e) return null;
    return {
      e, tes: s.rol === "tesoreria",
      soportes: await soportesDe(tx, "esquema_id", e.id),
      hist: s.rol === "tesoreria" ? await historialDe(tx, "esquemas_aporte", e.id) : [],
    };
  });
  if (!d) notFound();
  const { e, tes } = d;
  return (
    <>
      <Encabezado antetitulo={e.tipo === "constitucion" ? "Aporte de constitución" : "Aporte mensual de sostenimiento"} titulo={e.nombre}
        acciones={<Link href={`/aportes?vista=${e.tipo}`} className="btn-secundario">Ver recaudo</Link>} />
      {sp.guardado && <div className="mb-5"><Aviso>Esquema guardado.</Aviso></div>}
      <div className="grid gap-x-10 lg:grid-cols-2">
        <div>
          <dl className="panel divide-y divide-linea/70 px-4 text-sm">
            <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Estado</dt><dd><EstadoEsquema e={e} /></dd></div>
            <div className="py-2"><dt className="text-gris">Acuerdo que lo sustenta</dt>
              <dd className="mt-1">{e.referencia_acuerdo ? `${e.organo ? ORGANO[e.organo] + " · " : ""}${e.referencia_acuerdo} · ${fecha(e.fecha_acuerdo)}` : "Sin acuerdo registrado"}</dd></div>
            {e.aprobacion_registrada_en && (
              <div className="py-2"><dt className="text-gris">Registrado por tesorería</dt>
                <dd className="mt-1">{fechaHora(e.aprobacion_registrada_en)}{e.aprobacion_registrada_por_nombre ? ` · ${e.aprobacion_registrada_por_nombre}` : ""}
                  <span className="block text-xs text-gris">Es el registro de la referencia, no una aprobación digital del órgano.</span></dd></div>
            )}
            {e.tipo === "constitucion" ? (
              <>
                <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Presupuesto de gastos</dt><dd className="num">{e.presupuesto_gastos !== null ? pesos(e.presupuesto_gastos) : "Por definir"}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Meta para gastos</dt><dd className="num">{e.meta_gastos !== null ? pesos(e.meta_gastos) : "Por definir"}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Meta para patrimonio inicial</dt><dd className="num">{e.meta_patrimonio !== null ? pesos(e.meta_patrimonio) : "Por definir"}</dd></div>
              </>
            ) : (
              <>
                <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Monto de referencia</dt><dd className="num">{e.monto_sugerido ? pesos(e.monto_sugerido) : "Diferente por aportante"}</dd></div>
                <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Día de pago</dt><dd>{e.dia_pago ?? "El de Configuración"}</dd></div>
              </>
            )}
            {e.observaciones && <div className="py-2"><dt className="text-gris">Observaciones</dt><dd className="mt-1">{e.observaciones}</dd></div>}
          </dl>
          <Seccion titulo="Soportes del acuerdo"><ListaSoportes soportes={d.soportes} /></Seccion>
          {tes && <Seccion titulo="Historial"><Historial entradas={d.hist} /></Seccion>}
        </div>
        {tes && (
          <Seccion titulo="Modificar">
            <FormEsquema tipo={e.tipo} e={e} />
          </Seccion>
        )}
      </div>
    </>
  );
}
