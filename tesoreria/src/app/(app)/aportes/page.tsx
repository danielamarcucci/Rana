import Link from "next/link";
import { leer } from "@/lib/sesion";
import { adhesiones, compromisos, esquemas, ORGANO, recaudo, type RecaudoFila } from "@/lib/datos/aportes";
import { pesos } from "@/lib/dinero";
import { fecha, hoyCO, inicioMes, mes, sumarMeses } from "@/lib/fechas";
import { Avance, Encabezado, Seccion, TablaContenedor, Vacio } from "@/components/ui";
import { TablaCompromisos } from "@/components/TablaCompromisos";
import { Formulario } from "@/components/Formulario";
import { EstadoEsquema } from "@/components/EstadoEsquema";
import { accionGenerarMensuales } from "@/app/acciones/aportes";

export const metadata = { title: "Aportes" };

const VISTAS = [
  { k: "constitucion", t: "Constitución" },
  { k: "mensual", t: "Mensualidades" },
  { k: "esquemas", t: "Esquemas y acuerdos" },
];

function suma(f: RecaudoFila[], k: keyof RecaudoFila) {
  return f.reduce((a, x) => a + Number(x[k] ?? 0), 0);
}

export default async function Aportes({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const vista = VISTAS.some((v) => v.k === sp.vista) ? sp.vista : "constitucion";
  const hoy = hoyCO();
  const periodo = /^\d{4}-\d{2}$/.test(sp.mes ?? "") ? `${sp.mes}-01` : inicioMes(hoy);
  const d = await leer(async (tx, s) => {
    const tes = s.rol === "tesoreria";
    const esq = await esquemas(tx);
    const rec = await recaudo(tx);
    return {
      tes, esq, rec,
      compsConst: tes && vista === "constitucion" ? await compromisos(tx, { tipo: "constitucion" }) : [],
      compsMes: tes && vista === "mensual" ? await compromisos(tx, { tipo: "mensual", periodo }) : [],
      adh: tes && vista === "mensual" ? await adhesiones(tx) : [],
    };
  });
  const { tes, esq, rec } = d;

  return (
    <>
      <Encabezado
        titulo="Aportes"
        descripcion="Compromisos acordados frente a dinero efectivamente recibido. Una propuesta no crea obligaciones: solo los esquemas aprobados, con referencia a su acuerdo, admiten compromisos. No se aplican intereses, sanciones ni restricciones por aportes pendientes."
      />
      <nav className="mb-7 flex gap-1 border-b border-linea" aria-label="Vistas de aportes">
        {VISTAS.map((v) => (
          <Link key={v.k} href={`/aportes?vista=${v.k}`} aria-current={vista === v.k ? "page" : undefined}
            className={`-mb-px border-b-2 px-3 py-2 text-sm font-semibold no-underline ${vista === v.k ? "border-ocre text-olivo" : "border-transparent text-gris hover:text-olivo"}`}>
            {v.t}
          </Link>
        ))}
      </nav>

      {vista === "constitucion" && (() => {
        const lista = esq.filter((e) => e.tipo === "constitucion");
        if (!lista.length) return <Vacio>No hay esquemas de aporte de constitución. {tes && <Link href="/aportes/esquemas/nuevo?tipo=constitucion">Crear uno</Link>}</Vacio>;
        return (
          <>
            {lista.map((e) => {
              const f = rec.filter((r) => r.esquema_id === e.id);
              const g = f.filter((r) => r.destino === "gastos_constitucion");
              const p = f.filter((r) => r.destino === "patrimonio_inicial");
              const metaTotal = (e.meta_gastos ?? 0) + (e.meta_patrimonio ?? 0);
              return (
                <section key={e.id} className="seccion">
                  <div className="seccion-titulo">
                    <h2>{e.nombre}</h2>
                    <div className="flex items-center gap-3 text-sm"><EstadoEsquema e={e} /><Link href={`/aportes/esquemas/${e.id}`}>Ver acuerdo</Link></div>
                  </div>
                  <div className="grid gap-8 md:grid-cols-3">
                    <div>
                      <p className="etiqueta">Presupuesto de gastos de constitución</p>
                      <p className="num mt-1 text-xl font-semibold">{e.presupuesto_gastos !== null ? pesos(e.presupuesto_gastos) : "Por definir"}</p>
                      <p className="mt-3 etiqueta">Meta total de recaudo</p>
                      <p className="num mt-1 text-xl font-semibold">{metaTotal ? pesos(metaTotal) : "Por definir"}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">Para gastos de constitución</p>
                      <Avance valor={suma(g, "recaudado")} total={e.meta_gastos ?? suma(g, "comprometido")} etiqueta="Recaudo para gastos" />
                      <p className="mt-2 text-xs text-gris">Comprometido {pesos(suma(g, "comprometido"))} · pendiente {pesos(suma(g, "pendiente"))}{suma(g, "por_verificar") ? ` · por verificar ${pesos(suma(g, "por_verificar"))}` : ""}</p>
                    </div>
                    <div>
                      <p className="mb-2 text-sm font-semibold">Para patrimonio inicial</p>
                      <Avance valor={suma(p, "recaudado")} total={e.meta_patrimonio ?? suma(p, "comprometido")} etiqueta="Recaudo para patrimonio" />
                      <p className="mt-2 text-xs text-gris">Comprometido {pesos(suma(p, "comprometido"))} · pendiente {pesos(suma(p, "pendiente"))}{suma(p, "por_verificar") ? ` · por verificar ${pesos(suma(p, "por_verificar"))}` : ""}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-xs text-gris">
                    {suma(f, "compromisos")} compromiso(s): {suma(f, "n_completos")} completos, {suma(f, "n_parciales")} parciales,{" "}
                    {suma(f, "n_pendientes")} pendientes y {suma(f, "n_vencidos")} pendientes con fecha vencida. El avance se mide con abonos verificados.
                  </p>
                  {tes && (
                    <div className="mt-4">
                      {d.compsConst.filter((c) => c.esquema_id === e.id).length === 0
                        ? <Vacio>Sin compromisos individuales. Regístrelos desde la ficha de cada miembro.</Vacio>
                        : <TablaCompromisos filas={d.compsConst.filter((c) => c.esquema_id === e.id)} />}
                    </div>
                  )}
                </section>
              );
            })}
          </>
        );
      })()}

      {vista === "mensual" && (() => {
        const lista = esq.filter((e) => e.tipo === "mensual");
        const meses = [...new Set(rec.filter((r) => r.periodo).map((r) => r.periodo!))].sort().reverse();
        return (
          <>
            {lista.length === 0 && <Vacio>No hay esquemas de aporte mensual. {tes && <Link href="/aportes/esquemas/nuevo?tipo=mensual">Crear uno</Link>}</Vacio>}
            {lista.length > 0 && (
              <Seccion titulo="Recaudo por mes" nota="Agregado, sin personas. Recibido = abonos verificados al compromiso de cada mes (incluye pagos anticipados o de varios meses ya distribuidos).">
                {meses.length === 0 ? <Vacio>Aún no se han generado compromisos mensuales.</Vacio> : (
                  <TablaContenedor>
                    <table className="tabla">
                      <thead><tr><th>Mes</th><th className="der">Compromisos</th><th className="der">Comprometido</th><th className="der">Recibido</th><th className="der">Pendiente</th><th>Situación</th></tr></thead>
                      <tbody>
                        {meses.map((p) => {
                          const f = rec.filter((r) => r.periodo === p);
                          return (
                            <tr key={p}>
                              <td className="capitalize">{tes ? <Link href={`/aportes?vista=mensual&mes=${p.slice(0, 7)}`}>{mes(p)}</Link> : mes(p)}</td>
                              <td className="der">{suma(f, "compromisos")}</td>
                              <td className="der">{pesos(suma(f, "comprometido"))}</td>
                              <td className="der">{pesos(suma(f, "recaudado"))}{suma(f, "por_verificar") ? <span className="block text-xs text-aviso">+{pesos(suma(f, "por_verificar"))} por verificar</span> : null}</td>
                              <td className="der">{pesos(suma(f, "pendiente"))}</td>
                              <td className="text-xs text-gris">{suma(f, "n_completos")} completos · {suma(f, "n_parciales")} parciales · {suma(f, "n_pendientes") + suma(f, "n_vencidos")} pendientes{suma(f, "n_vencidos") ? ` (${suma(f, "n_vencidos")} con fecha vencida)` : ""}</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </TablaContenedor>
                )}
              </Seccion>
            )}

            {tes && lista.some((e) => e.estado === "aprobado") && (
              <Seccion titulo="Generar compromisos mensuales" nota="Solo para aportantes con aceptación registrada que cubra cada mes. Si un compromiso ya existe para esa persona y mes, no se duplica.">
                <Formulario accion={accionGenerarMensuales} boton="Generar" className="grid max-w-3xl gap-3 sm:grid-cols-3">
                  <label className="campo sm:col-span-3"><span>Esquema</span>
                    <select name="esquema_id" className="entrada">{lista.filter((e) => e.estado === "aprobado").map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
                  <label className="campo"><span>Desde</span><input type="month" name="desde" className="entrada" defaultValue={hoy.slice(0, 7)} required /></label>
                  <label className="campo"><span>Hasta</span><input type="month" name="hasta" className="entrada" defaultValue={sumarMeses(inicioMes(hoy), 2).slice(0, 7)} required /></label>
                </Formulario>
              </Seccion>
            )}

            {tes && lista.length > 0 && (
              <Seccion titulo={`Detalle de ${mes(periodo)}`} acciones={
                <form action="/aportes" className="flex items-center gap-2">
                  <input type="hidden" name="vista" value="mensual" />
                  <input type="month" name="mes" defaultValue={periodo.slice(0, 7)} className="entrada w-auto py-1 text-sm" aria-label="Mes" />
                  <button className="btn-secundario px-3 py-1 text-xs">Ver</button>
                </form>
              }>
                {d.compsMes.length === 0 ? <Vacio>No hay compromisos generados para este mes.</Vacio> : <TablaCompromisos filas={d.compsMes} />}
              </Seccion>
            )}

            {tes && lista.length > 0 && (
              <Seccion titulo="Aportantes que aceptaron una mensualidad" nota="Montos diferentes por persona u organización. Para registrar o terminar una aceptación, abra la ficha del miembro.">
                {d.adh.length === 0 ? <Vacio>Nadie ha aceptado aún un aporte mensual.</Vacio> : (
                  <TablaContenedor>
                    <table className="tabla">
                      <thead><tr><th>Aportante</th><th>Esquema</th><th className="der">Monto mensual</th><th>Vigencia</th><th>Aceptación</th></tr></thead>
                      <tbody>
                        {d.adh.map((a) => (
                          <tr key={a.id}>
                            <td><Link href={`/miembros/${a.miembro_id}`}>{a.miembro}</Link>{a.miembro_estado === "retirado" && <span className="ml-1 text-xs text-gris">(retirado)</span>}</td>
                            <td className="text-xs">{a.esquema}</td>
                            <td className="der">{pesos(a.monto)}</td>
                            <td className="text-xs">{mes(a.mes_inicio)} – {a.mes_fin ? mes(a.mes_fin) : "sin finalización"}</td>
                            <td className="text-xs">{a.referencia_aceptacion} · {fecha(a.fecha_aceptacion)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </TablaContenedor>
                )}
              </Seccion>
            )}
          </>
        );
      })()}

      {vista === "esquemas" && (
        <Seccion titulo="Esquemas de aportes" acciones={tes ? <>
          <Link href="/aportes/esquemas/nuevo?tipo=constitucion">Nuevo de constitución</Link>
          <Link href="/aportes/esquemas/nuevo?tipo=mensual">Nuevo mensual</Link>
        </> : undefined}
          nota="Cada esquema registra la referencia del acuerdo que lo sustenta. Registrar la referencia es un acto de tesorería; no equivale a una aprobación digital de la Asamblea, la Junta o la presidencia.">
          {esq.length === 0 ? <Vacio>Sin esquemas registrados.</Vacio> : (
            <TablaContenedor>
              <table className="tabla">
                <thead><tr><th>Esquema</th><th>Tipo</th><th>Estado</th><th>Acuerdo que lo sustenta</th></tr></thead>
                <tbody>
                  {esq.map((e) => (
                    <tr key={e.id}>
                      <td><Link href={`/aportes/esquemas/${e.id}`} className="font-semibold">{e.nombre}</Link></td>
                      <td>{e.tipo === "constitucion" ? "Constitución" : "Mensual de sostenimiento"}</td>
                      <td><EstadoEsquema e={e} /></td>
                      <td className="text-xs">{e.referencia_acuerdo ? `${e.organo ? ORGANO[e.organo] + ": " : ""}${e.referencia_acuerdo} (${fecha(e.fecha_acuerdo)})` : <span className="text-gris">Sin acuerdo registrado</span>}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TablaContenedor>
          )}
        </Seccion>
      )}
    </>
  );
}
