import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { adhesiones, compromisos, esquemas } from "@/lib/datos/aportes";
import { historialDe, listarMovimientos } from "@/lib/datos/movimientos";
import { pesos, pesosCampo } from "@/lib/dinero";
import { fecha, hoyCO, mes } from "@/lib/fechas";
import { Aviso, Encabezado, EnlaceMov, EstadoMovimiento, Insignia, Seccion, Vacio } from "@/components/ui";
import { FormMiembro } from "@/components/FormMiembro";
import { TablaCompromisos } from "@/components/TablaCompromisos";
import { Formulario } from "@/components/Formulario";
import { Historial } from "@/components/Historial";
import { accionEliminarAdhesion, accionGuardarAdhesion, accionGuardarCompromiso } from "@/app/acciones/aportes";

export const metadata = { title: "Miembro" };

const VINCULO: Record<string, string> = { asociado: "Asociado de la Corporación", aportante: "Aportante de la Red", otro: "Otro vínculo" };

export default async function Miembro({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  await exigirTesoreriaPagina();
  const { id: idTxt } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(idTxt)) notFound();
  const id = Number(idTxt);
  const d = await leer(async (tx, s) => {
    const { rows } = await tx.query(
      `SELECT m.*, c.telefono, c.correo, c.direccion, c.otro FROM miembros m LEFT JOIN miembros_contacto c ON c.miembro_id = m.id WHERE m.id = $1`,
      [id],
    );
    if (!rows[0]) return null;
    return {
      m: rows[0],
      comps: await compromisos(tx, { miembroId: id, incluirAnulados: true }),
      adh: await adhesiones(tx, { miembroId: id }),
      esq: await esquemas(tx),
      favor: (await tx.query("SELECT * FROM v_saldos_a_favor WHERE miembro_id = $1 ORDER BY fecha_efectiva", [id])).rows,
      pagos: await listarMovimientos(tx, s.rol, { miembro: id, limite: 100 }),
      hist: await historialDe(tx, "miembros", id),
    };
  });
  if (!d) notFound();
  const { m, comps, adh, esq, favor, pagos, hist } = d;
  const mensuales = esq.filter((e) => e.tipo === "mensual" && e.estado !== "cerrado");
  const constit = esq.filter((e) => e.tipo === "constitucion" && e.estado === "aprobado");
  const pendiente = comps.filter((c) => c.estado === "vigente").reduce((a, c) => a + c.saldo, 0);
  const aFavor = favor.filter((f: { estado: string }) => f.estado === "verificado").reduce((a: number, f: { disponible: number }) => a + f.disponible, 0);

  return (
    <>
      <Encabezado
        antetitulo={`${m.codigo} · ${VINCULO[m.vinculo]}${m.clase_asociado ? ` (${m.clase_asociado})` : ""}`}
        titulo={m.nombre}
        acciones={<Link href={`/movimientos/nuevo?tipo=ingreso&miembro=${m.id}`} className="btn-primario">Registrar pago o aporte</Link>}
      />
      {sp.guardado && <div className="mb-5"><Aviso>Datos guardados.</Aviso></div>}

      <div className="grid gap-x-10 lg:grid-cols-[1fr_1.4fr]">
        <div>
          <dl className="panel divide-y divide-linea/70 px-4 text-sm">
            <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Estado</dt><dd>{m.estado === "activo" ? <Insignia tono="ok">Activo</Insignia> : <Insignia tono="suave">Retirado {fecha(m.fecha_retiro)}</Insignia>}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Tipo</dt><dd>{m.tipo_persona === "natural" ? "Persona natural" : "Organización"}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Vinculación</dt><dd>{fecha(m.fecha_vinculacion)}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Aporte pendiente</dt><dd className="num">{pesos(pendiente)}</dd></div>
            <div className="flex justify-between gap-4 py-2"><dt className="text-gris">Saldo a favor</dt><dd className="num">{pesos(aFavor)}</dd></div>
            <div className="py-2"><dt className="text-gris">Contacto (solo tesorería)</dt>
              <dd className="mt-1">{[m.telefono, m.correo, m.direccion, m.otro].filter(Boolean).join(" · ") || "—"}</dd></div>
            {m.observaciones && <div className="py-2"><dt className="text-gris">Observaciones</dt><dd className="mt-1">{m.observaciones}</dd></div>}
          </dl>
          <details className="mt-4">
            <summary className="btn-secundario cursor-pointer list-none">Editar datos</summary>
            <div className="mt-4"><FormMiembro m={m} /></div>
          </details>
        </div>

        <div>
          <Seccion titulo="Aceptación de mensualidad" nota="Los compromisos mensuales solo se generan para quienes aceptaron expresamente un esquema aprobado.">
            {adh.length === 0 ? <p className="text-sm text-gris">No ha aceptado un aporte mensual.</p> : (
              <ul className="space-y-2 text-sm">
                {adh.map((a) => (
                  <li key={a.id} className="rounded-md border border-linea p-3">
                    <p><strong className="num">{pesos(a.monto)}</strong> mensuales · {a.esquema}</p>
                    <p className="text-xs text-gris">
                      Desde {mes(a.mes_inicio)}{a.mes_fin ? ` hasta ${mes(a.mes_fin)}` : " (sin fecha de finalización)"}
                      {a.dia_pago ? ` · día de pago ${a.dia_pago}` : ""} · Aceptación: {a.referencia_aceptacion} ({fecha(a.fecha_aceptacion)})
                    </p>
                    <details className="mt-2">
                      <summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Modificar o finalizar</summary>
                      <Formulario accion={accionGuardarAdhesion} boton="Guardar" claseBoton="btn-secundario px-3 py-1 text-xs" className="mt-2 grid gap-3 sm:grid-cols-2">
                        <input type="hidden" name="id" value={a.id} />
                        <input type="hidden" name="esquema_id" value={a.esquema_id} />
                        <input type="hidden" name="miembro_id" value={m.id} />
                        <label className="campo"><span className="!text-xs">Monto mensual</span><input name="monto" className="entrada num py-1 text-sm" defaultValue={pesosCampo(a.monto)} /></label>
                        <label className="campo"><span className="!text-xs">Día de pago (1-28)</span><input name="dia_pago" type="number" min={1} max={28} className="entrada py-1 text-sm" defaultValue={a.dia_pago ?? ""} /></label>
                        <label className="campo"><span className="!text-xs">Mes de inicio</span><input type="month" name="mes_inicio" className="entrada py-1 text-sm" defaultValue={a.mes_inicio.slice(0, 7)} /></label>
                        <label className="campo"><span className="!text-xs">Mes de finalización</span><input type="month" name="mes_fin" className="entrada py-1 text-sm" defaultValue={a.mes_fin?.slice(0, 7) ?? ""} /></label>
                        <label className="campo sm:col-span-2"><span className="!text-xs">Referencia de la aceptación</span><input name="referencia_aceptacion" className="entrada py-1 text-sm" defaultValue={a.referencia_aceptacion} /></label>
                        <label className="campo"><span className="!text-xs">Fecha de aceptación</span><input type="date" name="fecha_aceptacion" className="entrada py-1 text-sm" defaultValue={a.fecha_aceptacion} /></label>
                      </Formulario>
                      <Formulario accion={accionEliminarAdhesion} boton="Eliminar (solo si no generó compromisos)" claseBoton="btn-enlace text-alerta" className="mt-2" confirmar="¿Eliminar esta aceptación?">
                        <input type="hidden" name="id" value={a.id} />
                      </Formulario>
                    </details>
                  </li>
                ))}
              </ul>
            )}
            {mensuales.length > 0 ? (
              <details className="mt-3">
                <summary className="cursor-pointer text-sm font-semibold text-ocre-texto">Registrar aceptación de mensualidad</summary>
                <Formulario accion={accionGuardarAdhesion} boton="Registrar aceptación" className="mt-3 grid gap-3 sm:grid-cols-2" limpiarAlTerminar>
                  <input type="hidden" name="miembro_id" value={m.id} />
                  <label className="campo sm:col-span-2"><span>Esquema mensual</span>
                    <select name="esquema_id" className="entrada" required>
                      {mensuales.map((e) => <option key={e.id} value={e.id}>{e.nombre}{e.estado === "propuesta" ? " (propuesta, aún no genera compromisos)" : ""}</option>)}
                    </select></label>
                  <label className="campo"><span>Monto mensual acordado</span><input name="monto" className="entrada num" required defaultValue={pesosCampo(mensuales[0].monto_sugerido)} /></label>
                  <label className="campo"><span>Día de pago (opcional)</span><input name="dia_pago" type="number" min={1} max={28} className="entrada" /></label>
                  <label className="campo"><span>Mes de inicio</span><input type="month" name="mes_inicio" className="entrada" required defaultValue={hoyCO().slice(0, 7)} /></label>
                  <label className="campo"><span>Mes de finalización (opcional)</span><input type="month" name="mes_fin" className="entrada" /></label>
                  <label className="campo sm:col-span-2"><span>¿Cómo consta la aceptación?</span><input name="referencia_aceptacion" className="entrada" required placeholder="Formato firmado, correo del 5/10/2026, acta…" /></label>
                  <label className="campo"><span>Fecha de aceptación</span><input type="date" name="fecha_aceptacion" className="entrada" required defaultValue={hoyCO()} /></label>
                </Formulario>
              </details>
            ) : <p className="mt-2 text-xs text-gris">No hay esquemas mensuales. Créelos en <Link href="/aportes?vista=esquemas">Aportes → Esquemas</Link>.</p>}
          </Seccion>

          <Seccion titulo="Compromiso de constitución">
            {constit.length > 0 ? (
              <details>
                <summary className="cursor-pointer text-sm font-semibold text-ocre-texto">Registrar monto acordado</summary>
                <Formulario accion={accionGuardarCompromiso} boton="Registrar compromiso" className="mt-3 grid gap-3 sm:grid-cols-2" limpiarAlTerminar>
                  <input type="hidden" name="miembro_id" value={m.id} />
                  <label className="campo sm:col-span-2"><span>Esquema de constitución</span>
                    <select name="esquema_id" className="entrada">{constit.map((e) => <option key={e.id} value={e.id}>{e.nombre}</option>)}</select></label>
                  <label className="campo"><span>Destino</span>
                    <select name="destino" className="entrada">
                      <option value="gastos_constitucion">Cubrir gastos de constitución</option>
                      <option value="patrimonio_inicial">Patrimonio inicial</option>
                    </select></label>
                  <label className="campo"><span>Monto acordado</span><input name="monto" className="entrada num" required /></label>
                  <label className="campo"><span>Fecha acordada</span><input type="date" name="fecha_acordada" className="entrada" required /></label>
                  <label className="campo"><span>Soporte (opcional)</span><input type="file" name="comprobante" accept="application/pdf,image/jpeg,image/png" className="text-sm" /></label>
                  <label className="campo sm:col-span-2"><span>Observaciones</span><input name="observaciones" className="entrada" /></label>
                </Formulario>
              </details>
            ) : <p className="text-sm text-gris">No hay un esquema de constitución aprobado. <Link href="/aportes?vista=esquemas">Ver esquemas</Link></p>}
          </Seccion>
        </div>
      </div>

      <Seccion titulo="Compromisos de aportes">
        {comps.length === 0 ? <Vacio>Sin compromisos.</Vacio> : <TablaCompromisos filas={comps} mostrarMiembro={false} />}
      </Seccion>

      {favor.length > 0 && (
        <Seccion titulo="Saldo a favor por aplicar">
          <ul className="space-y-1 text-sm">
            {favor.map((f: { movimiento_id: number; fecha_efectiva: string; disponible: number; estado: string }) => (
              <li key={f.movimiento_id}>
                <EnlaceMov id={f.movimiento_id} /> · {fecha(f.fecha_efectiva)} · disponible <strong className="num">{pesos(f.disponible)}</strong>
                {f.estado === "pendiente" && " (ingreso por verificar)"} ·{" "}
                <Link href={`/movimientos/${f.movimiento_id}/distribuir`}>Aplicar a compromisos</Link>
              </li>
            ))}
          </ul>
        </Seccion>
      )}

      <Seccion titulo="Pagos y movimientos relacionados">
        {pagos.length === 0 ? <Vacio>Sin movimientos.</Vacio> : (
          <div className="panel overflow-x-auto">
            <table className="tabla">
              <thead><tr><th>Fecha</th><th>N.º</th><th>Concepto</th><th>Estado</th><th className="der">Valor</th></tr></thead>
              <tbody>
                {pagos.map((p) => (
                  <tr key={p.id}>
                    <td className="num">{fecha(p.fecha_efectiva)}</td><td><EnlaceMov id={p.id} /></td><td>{p.concepto}</td>
                    <td><EstadoMovimiento estado={p.estado} historico={p.historico} /></td><td className="der">{pesos(p.valor)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Seccion>

      <Seccion titulo="Historial de cambios del registro"><Historial entradas={hist} /></Seccion>
    </>
  );
}
