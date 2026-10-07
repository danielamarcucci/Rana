import { leer } from "@/lib/sesion";
import { datosCierre, informeMensual } from "@/lib/datos/informe";
import { pesos, pesosCampo } from "@/lib/dinero";
import { fecha, fechaHora, finMes, hoyCO, inicioMes, mes, sumarMeses } from "@/lib/fechas";
import { Aviso, Encabezado, EnlaceMov, Insignia, Seccion } from "@/components/ui";
import { InformeVista } from "@/components/InformeVista";
import { Formulario } from "@/components/Formulario";
import { accionCerrarMes, accionReabrirMes } from "@/app/acciones/cierres";

export const metadata = { title: "Informes" };

export default async function Informes({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const hoy = hoyCO();
  const periodo = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? `${sp.mes}-01` : sumarMeses(inicioMes(hoy), -1);
  const verDetalle = sp.detalle === "1";
  const d = await leer(async (tx, s) => ({
    tes: s.rol === "tesoreria",
    inf: await informeMensual(tx, s.rol, periodo, verDetalle),
    cierre: s.rol === "tesoreria" ? await datosCierre(tx, periodo) : null,
  }));
  const { tes, inf, cierre } = d;
  const mesTxt = periodo.slice(0, 7);
  const terminado = finMes(periodo) < hoy;

  return (
    <>
      <Encabezado
        antetitulo="Informe mensual"
        titulo={mes(periodo)}
        descripcion={tes ? "Tesorería puede incluir el detalle individual. La versión para consulta es agregada." : "Versión agregada para consulta."}
        acciones={
          <>
            <form action="/informes" className="flex items-center gap-2">
              <input type="month" name="mes" defaultValue={mesTxt} max={hoy.slice(0, 7)} className="entrada w-auto py-1.5 text-sm" aria-label="Mes" />
              {verDetalle && <input type="hidden" name="detalle" value="1" />}
              <button className="btn-secundario py-1.5">Ver</button>
            </form>
            <a className="btn-primario" href={`/api/informes/pdf?mes=${mesTxt}`}>Descargar PDF</a>
            <a className="btn-secundario" href={`/api/exportar?conjunto=informe&mes=${mesTxt}`}>CSV</a>
          </>
        }
      />
      {tes && (
        <div className="mb-6 flex flex-wrap items-center gap-4 text-sm">
          <a href={verDetalle ? `/informes?mes=${mesTxt}` : `/informes?mes=${mesTxt}&detalle=1`}>{verDetalle ? "Ocultar detalle individual" : "Mostrar detalle individual"}</a>
          <a href={`/api/informes/pdf?mes=${mesTxt}&detalle=1`}>PDF con detalle individual (tesorería)</a>
          <a href={`/api/exportar?conjunto=movimientos&desde=${periodo}&hasta=${finMes(periodo)}`}>Movimientos del mes (CSV)</a>
          <a href={`/api/exportar?conjunto=compromisos`}>Compromisos (CSV)</a>
        </div>
      )}
      {!terminado && <div className="mb-5"><Aviso tono="aviso">El mes aún no termina: las cifras pueden cambiar.</Aviso></div>}

      <InformeVista inf={inf} />

      {tes && cierre && (
        <Seccion titulo={`Cierre mensual y conciliación · ${mes(periodo)}`} id="cierre"
          nota="Compare el saldo calculado (movimientos verificados) con el saldo observado en el extracto o en el arqueo de caja. Un mes cerrado no admite registros ni cambios en esa cuenta hasta reabrirlo con motivo.">
          {cierre.revisar.length > 0 && (
            <div className="mb-4">
              <Aviso tono="aviso">
                <p className="font-semibold">Para revisar antes de cerrar</p>
                <ul className="mt-1 space-y-0.5">
                  {cierre.revisar.map((m: { id: number; fecha_efectiva: string; concepto: string; valor: number; estado: string; tiene_soporte: boolean }) => (
                    <li key={m.id}><EnlaceMov id={m.id} /> · {fecha(m.fecha_efectiva)} · {m.concepto} · {pesos(m.valor)} ·{" "}
                      {m.estado === "pendiente" ? "por verificar" : "sin soporte"}</li>
                  ))}
                </ul>
              </Aviso>
            </div>
          )}
          <div className="grid gap-4 md:grid-cols-2">
            {cierre.saldos.filter((c) => c.activa || c.saldo !== 0).map((c) => {
              const x = cierre.existentes.find((e: { cuenta_id: number }) => e.cuenta_id === c.cuenta_id);
              return (
                <div key={c.cuenta_id} className="panel p-4">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-semibold">{c.nombre}</p>
                    {x?.estado === "cerrado" ? <Insignia tono="ok">Cerrado</Insignia> : x?.estado === "reabierto" ? <Insignia tono="aviso">Reabierto</Insignia> : <Insignia tono="suave">Sin cerrar</Insignia>}
                  </div>
                  <p className="mt-2 text-sm">Saldo calculado al {fecha(finMes(periodo))}: <strong className="num">{pesos(c.saldo)}</strong></p>
                  {x?.estado === "cerrado" ? (
                    <>
                      <p className="text-sm">Saldo observado: <strong className="num">{pesos(x.saldo_observado)}</strong>
                        {x.diferencia ? <span className="text-aviso"> · diferencia {pesos(x.diferencia)}</span> : " · sin diferencia"}</p>
                      {x.explicacion && <p className="text-xs text-gris">Explicación: {x.explicacion}</p>}
                      <p className="text-xs text-gris">Cerrado {fechaHora(x.cerrado_en)} · {x.cerrado_por_nombre}</p>
                      <details className="mt-2">
                        <summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Reabrir</summary>
                        <Formulario accion={accionReabrirMes} boton="Reabrir mes" claseBoton="btn-enlace text-alerta" className="mt-2">
                          <input type="hidden" name="id" value={x.id} />
                          <input name="motivo" className="entrada py-1 text-sm" placeholder="Motivo" required minLength={5} />
                        </Formulario>
                      </details>
                    </>
                  ) : terminado ? (
                    <Formulario accion={accionCerrarMes} boton="Cerrar mes" className="mt-3 space-y-2">
                      <input type="hidden" name="periodo" value={mesTxt} />
                      <input type="hidden" name="cuenta_id" value={c.cuenta_id} />
                      <label className="campo"><span className="!text-xs">Saldo observado (extracto o arqueo)</span>
                        <input name="saldo_observado" className="entrada num py-1.5" defaultValue={x ? pesosCampo(x.saldo_observado) : ""} required /></label>
                      <label className="campo"><span className="!text-xs">Explicación de diferencias</span>
                        <input name="explicacion" className="entrada py-1.5" defaultValue={x?.explicacion ?? ""} placeholder="p. ej. comisión bancaria aún no registrada" /></label>
                    </Formulario>
                  ) : <p className="mt-2 text-xs text-gris">Podrá cerrarse cuando termine el mes.</p>}
                </div>
              );
            })}
          </div>
        </Seccion>
      )}
    </>
  );
}
