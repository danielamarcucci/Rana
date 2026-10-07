import Link from "next/link";
import { leer } from "@/lib/sesion";
import { categorias, fondos } from "@/lib/datos/catalogos";
import { asignaciones, ejecucion, obligaciones, presupuestoAnual } from "@/lib/datos/presupuesto";
import { fondosEstado } from "@/lib/datos/finanzas";
import { pesos } from "@/lib/dinero";
import { fecha, hoyCO, nombreMes } from "@/lib/fechas";
import { Encabezado, Insignia, Seccion, TablaContenedor, Vacio } from "@/components/ui";
import { Formulario } from "@/components/Formulario";
import {
  accionAnularObligacion, accionAsignarFondo, accionGuardarFondo, accionGuardarObligacion, accionPresupuestoAnual,
} from "@/app/acciones/presupuesto";

export const metadata = { title: "Presupuesto" };

export default async function Presupuesto({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const hoy = hoyCO();
  const anio = /^\d{4}$/.test(sp.anio ?? "") ? Number(sp.anio) : Number(hoy.slice(0, 4));
  const mesSel = /^\d{1,2}$/.test(sp.mes ?? "") && Number(sp.mes) >= 1 && Number(sp.mes) <= 12
    ? Number(sp.mes) : anio === Number(hoy.slice(0, 4)) ? Number(hoy.slice(5, 7)) : 12;
  const d = await leer(async (tx, s) => ({
    tes: s.rol === "tesoreria",
    pa: await presupuestoAnual(tx, anio),
    celdas: await ejecucion(tx, anio),
    cats: await categorias(tx, "egreso"),
    obls: await obligaciones(tx, sp.cerradas === "1"),
    fds: await fondosEstado(tx, hoy),
    fondosLista: await fondos(tx, true),
    asig: await asignaciones(tx),
  }));
  const { tes, pa, celdas, cats, obls, fds } = d;
  const celda = (cat: number, mes: number) => celdas.find((c) => c.categoria_id === cat && c.mes === mes) ?? { presupuesto: 0, ejecutado: 0 };
  const acum = (cat: number) => celdas.filter((c) => c.categoria_id === cat && c.mes <= mesSel).reduce((a, c) => ({ p: a.p + c.presupuesto, e: a.e + c.ejecutado }), { p: 0, e: 0 });
  const filas = cats.filter((c) => c.activa || celdas.some((x) => x.categoria_id === c.id));
  const tot = filas.reduce((a, c) => {
    const m = celda(c.id, mesSel), y = acum(c.id);
    return { pm: a.pm + m.presupuesto, em: a.em + m.ejecutado, py: a.py + y.p, ey: a.ey + y.e };
  }, { pm: 0, em: 0, py: 0, ey: 0 });

  return (
    <>
      <Encabezado
        antetitulo={`Ejercicio ${anio} (enero a diciembre, art. 46)`}
        titulo="Presupuesto"
        acciones={<>
          <form action="/presupuesto" className="flex items-center gap-2">
            <select name="anio" defaultValue={anio} className="entrada w-auto py-1.5 text-sm" aria-label="Año">
              {[anio - 2, anio - 1, anio, anio + 1].map((a) => <option key={a}>{a}</option>)}
            </select>
            <select name="mes" defaultValue={mesSel} className="entrada w-auto py-1.5 text-sm" aria-label="Mes">
              {Array.from({ length: 12 }, (_, i) => <option key={i + 1} value={i + 1}>{nombreMes(i + 1)}</option>)}
            </select>
            <button className="btn-secundario py-1.5">Ver</button>
          </form>
          {tes && <Link href={`/presupuesto/editar?anio=${anio}`} className="btn-primario">Definir presupuesto</Link>}
        </>}
      />

      <div className="mb-6 flex flex-wrap items-center gap-3 text-sm">
        {pa?.estado === "aprobado"
          ? <><Insignia tono="ok">Aprobado</Insignia><span>Asamblea: {pa.referencia_acta} · {fecha(pa.fecha_aprobacion)} <span className="text-gris">(referencia registrada por tesorería)</span></span></>
          : <><Insignia tono="aviso">Borrador</Insignia><span className="text-gris">Pendiente de aprobación por la Asamblea General (art. 26 c).</span></>}
        {tes && (
          <details>
            <summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Registrar estado</summary>
            <Formulario accion={accionPresupuestoAnual} boton="Guardar" claseBoton="btn-secundario px-3 py-1 text-xs" className="mt-2 grid max-w-xl gap-3 sm:grid-cols-3">
              <input type="hidden" name="anio" value={anio} />
              <label className="campo"><span className="!text-xs">Estado</span><select name="estado" className="entrada py-1 text-sm" defaultValue={pa?.estado ?? "borrador"}><option value="borrador">Borrador</option><option value="aprobado">Aprobado</option></select></label>
              <label className="campo"><span className="!text-xs">Acta</span><input name="referencia_acta" className="entrada py-1 text-sm" defaultValue={pa?.referencia_acta ?? ""} /></label>
              <label className="campo"><span className="!text-xs">Fecha</span><input type="date" name="fecha_aprobacion" className="entrada py-1 text-sm" defaultValue={pa?.fecha_aprobacion ?? ""} /></label>
            </Formulario>
          </details>
        )}
      </div>

      <Seccion titulo={`Presupuestado frente a ejecutado · ${nombreMes(mesSel)} de ${anio}`}
        nota="Ejecutado = egresos verificados menos reembolsos de la categoría. Los gastos comprometidos aún no pagados se muestran aparte.">
        {filas.length === 0 ? <Vacio>Sin categorías de egreso.</Vacio> : (
          <TablaContenedor>
            <table className="tabla">
              <thead>
                <tr><th>Categoría</th><th className="der">Presupuesto del mes</th><th className="der">Ejecutado del mes</th><th className="der">Diferencia</th>
                  <th className="der">Presupuesto acumulado</th><th className="der">Ejecutado acumulado</th><th></th></tr>
              </thead>
              <tbody>
                {filas.map((c) => {
                  const m = celda(c.id, mesSel), y = acum(c.id);
                  const supera = m.ejecutado > m.presupuesto;
                  return (
                    <tr key={c.id}>
                      <td>{c.nombre}{!c.activa && <span className="text-xs text-gris"> (inactiva)</span>}</td>
                      <td className="der">{pesos(m.presupuesto)}</td>
                      <td className="der">{pesos(m.ejecutado)}</td>
                      <td className={`der ${supera ? "text-aviso" : ""}`}>{pesos(m.presupuesto - m.ejecutado)}</td>
                      <td className="der">{pesos(y.p)}</td>
                      <td className="der">{pesos(y.e)}</td>
                      <td>{supera && <Insignia tono="aviso">Supera el presupuesto</Insignia>}</td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot>
                <tr><td>Total</td><td className="der">{pesos(tot.pm)}</td><td className="der">{pesos(tot.em)}</td><td className="der">{pesos(tot.pm - tot.em)}</td>
                  <td className="der">{pesos(tot.py)}</td><td className="der">{pesos(tot.ey)}</td><td></td></tr>
              </tfoot>
            </table>
          </TablaContenedor>
        )}
      </Seccion>

      <Seccion titulo="Gastos comprometidos por pagar" id="gastos"
        acciones={<Link href={`/presupuesto?anio=${anio}&mes=${mesSel}&cerradas=${sp.cerradas === "1" ? "0" : "1"}#gastos`}>{sp.cerradas === "1" ? "Ocultar pagados y anulados" : "Ver pagados y anulados"}</Link>}
        nota="Obligaciones adquiridas aún no pagadas. Cada pago verificado vinculado disminuye automáticamente su saldo.">
        {obls.length === 0 ? <Vacio>No hay gastos pendientes.</Vacio> : (
          <TablaContenedor>
            <table className="tabla">
              <thead><tr><th>Gasto</th><th>Categoría / fondo</th><th>Pago previsto</th><th className="der">Valor</th><th className="der">Pagado</th><th className="der">Por pagar</th><th></th></tr></thead>
              <tbody>
                {obls.map((o) => (
                  <tr key={o.id} className={o.estado !== "vigente" ? "text-gris" : ""}>
                    <td>{o.descripcion}<span className="block text-xs text-gris">{[o.tercero, o.referencia_autorizacion && `Autorización: ${o.referencia_autorizacion}`].filter(Boolean).join(" · ")}</span>
                      {o.estado === "anulada" && <span className="block text-xs">Anulado: {o.motivo_anulacion}</span>}</td>
                    <td className="text-xs">{o.categoria}{o.fondo ? ` · ${o.fondo}` : ""}</td>
                    <td className="num text-xs">{fecha(o.fecha_vencimiento)}{o.estado === "vigente" && o.saldo > 0 && o.fecha_vencimiento && o.fecha_vencimiento < hoy ? <span className="block text-aviso">Fecha cumplida</span> : null}</td>
                    <td className="der">{pesos(o.monto)}</td>
                    <td className="der">{pesos(o.pagado)}{o.pago_por_verificar > 0 && <span className="block text-xs text-aviso">+{pesos(o.pago_por_verificar)} por verificar</span>}</td>
                    <td className="der font-semibold">{pesos(o.saldo)}</td>
                    <td className="whitespace-nowrap text-xs">
                      {tes && o.estado === "vigente" && o.saldo > 0 && <Link href={`/movimientos/nuevo?tipo=egreso&obligacion=${o.id}`}>Registrar pago</Link>}
                      {tes && o.estado === "vigente" && o.pagado + o.pago_por_verificar === 0 && (
                        <details className="mt-1"><summary className="cursor-pointer text-ocre-texto">Anular</summary>
                          <Formulario accion={accionAnularObligacion} boton="Anular" claseBoton="btn-enlace text-alerta" className="mt-1 w-56">
                            <input type="hidden" name="id" value={o.id} />
                            <input name="motivo" className="entrada py-1 text-sm" placeholder="Motivo" required minLength={5} />
                          </Formulario></details>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaContenedor>
        )}
        {tes && (
          <details className="mt-4">
            <summary className="btn-secundario cursor-pointer list-none">Registrar gasto comprometido</summary>
            <Formulario accion={accionGuardarObligacion} boton="Registrar" className="mt-4 grid max-w-3xl gap-4 sm:grid-cols-2" limpiarAlTerminar>
              <label className="campo sm:col-span-2"><span>Descripción</span><input name="descripcion" className="entrada" required maxLength={300} /></label>
              <label className="campo"><span>Proveedor o beneficiario</span><input name="tercero" className="entrada" maxLength={200} /></label>
              <label className="campo"><span>Valor</span><input name="monto" className="entrada num" required /></label>
              <label className="campo"><span>Categoría</span><select name="categoria_id" className="entrada" required>{cats.filter((c) => c.activa).map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
              <label className="campo"><span>Se pagará con</span><select name="fondo_id" className="entrada"><option value="">Recursos generales</option>{d.fondosLista.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></label>
              <label className="campo"><span>Fecha del compromiso</span><input type="date" name="fecha_compromiso" className="entrada" defaultValue={hoy} required /></label>
              <label className="campo"><span>Fecha prevista de pago</span><input type="date" name="fecha_vencimiento" className="entrada" /></label>
              <label className="campo sm:col-span-2"><span>Referencia de autorización</span><input name="referencia_autorizacion" className="entrada" maxLength={300} />
                <span className="ayuda">Cargada por tesorería; no equivale a la aprobación digital de presidencia.</span></label>
              <label className="campo sm:col-span-2"><span>Soporte (cotización, contrato…)</span><input type="file" name="comprobante" accept="application/pdf,image/jpeg,image/png" className="text-sm" /></label>
            </Formulario>
          </details>
        )}
      </Seccion>

      <Seccion titulo="Reservas y fondos con destinación específica" id="fondos"
        nota="Reserva: recursos propios separados por decisión de la Junta. Destinación específica: recursos de un proyecto o convenio. El disponible estimado los descuenta sin duplicar los gastos pendientes que se pagarán con ellos.">
        {fds.length === 0 ? <Vacio>No hay reservas ni fondos.</Vacio> : (
          <TablaContenedor>
            <table className="tabla">
              <thead><tr><th>Fondo</th><th className="der">Reservado</th><th className="der">Ingresos</th><th className="der">Egresos</th><th className="der">Saldo</th><th className="der">Gastos pendientes</th></tr></thead>
              <tbody>
                {fds.map((f) => (
                  <tr key={f.id} className={f.activo ? "" : "text-gris"}>
                    <td>{f.nombre}<span className="block text-xs text-gris">{f.tipo === "reserva" ? "Reserva" : "Destinación específica"}{f.referencia_acuerdo ? ` · ${f.referencia_acuerdo}` : ""}{!f.activo ? " · inactivo" : ""}</span></td>
                    <td className="der">{pesos(f.asignado)}</td><td className="der">{pesos(f.ingresos)}</td><td className="der">{pesos(f.egresos)}</td>
                    <td className="der font-semibold">{pesos(f.saldo)}</td><td className="der">{pesos(f.pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaContenedor>
        )}
        {tes && (
          <div className="mt-4 grid gap-6 lg:grid-cols-2">
            <details>
              <summary className="btn-secundario cursor-pointer list-none">Crear reserva o fondo</summary>
              <Formulario accion={accionGuardarFondo} boton="Crear" className="mt-3 grid gap-3 sm:grid-cols-2" limpiarAlTerminar>
                <label className="campo sm:col-span-2"><span>Nombre</span><input name="nombre" className="entrada" required /></label>
                <label className="campo"><span>Tipo</span><select name="tipo" className="entrada"><option value="reserva">Reserva</option><option value="proyecto">Destinación específica / proyecto</option></select></label>
                <label className="campo"><span>Acuerdo o convenio</span><input name="referencia_acuerdo" className="entrada" /></label>
                <label className="campo sm:col-span-2"><span>Descripción</span><input name="descripcion" className="entrada" /></label>
              </Formulario>
            </details>
            {d.fondosLista.length > 0 && (
              <details>
                <summary className="btn-secundario cursor-pointer list-none">Reservar o liberar recursos</summary>
                <Formulario accion={accionAsignarFondo} boton="Registrar" className="mt-3 grid gap-3 sm:grid-cols-2" limpiarAlTerminar>
                  <label className="campo"><span>Fondo</span><select name="fondo_id" className="entrada">{d.fondosLista.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}</select></label>
                  <label className="campo"><span>Operación</span><select name="sentido" className="entrada"><option value="reservar">Reservar</option><option value="liberar">Liberar</option></select></label>
                  <label className="campo"><span>Valor</span><input name="valor" className="entrada num" required /></label>
                  <label className="campo"><span>Fecha</span><input type="date" name="fecha" className="entrada" defaultValue={hoy} required /></label>
                  <label className="campo"><span>Motivo</span><input name="motivo" className="entrada" required /></label>
                  <label className="campo"><span>Referencia (acta)</span><input name="referencia" className="entrada" /></label>
                </Formulario>
                <p className="mt-2 text-xs text-gris">Reservar no mueve dinero: separa recursos que ya están en caja. Los registros no se editan; para corregir, registre la operación contraria.</p>
              </details>
            )}
          </div>
        )}
        {d.asig.length > 0 && (
          <details className="mt-4 text-sm">
            <summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Ver reservas y liberaciones registradas</summary>
            <ul className="mt-2 space-y-1">
              {d.asig.map((a) => <li key={a.id}>{fecha(a.fecha)} · {a.fondo} · <span className="num">{a.valor > 0 ? "+" : ""}{pesos(a.valor)}</span> · {a.motivo}{a.referencia ? ` (${a.referencia})` : ""}</li>)}
            </ul>
          </details>
        )}
      </Seccion>
    </>
  );
}
