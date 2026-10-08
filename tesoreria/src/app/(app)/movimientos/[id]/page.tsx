import { enSerie } from "@/lib/db";
import Link from "next/link";
import { notFound } from "next/navigation";
import { leer } from "@/lib/sesion";
import { aplicacionesDe, detalleMovimiento, ETIQUETA_DESTINO, historialDe } from "@/lib/datos/movimientos";
import { soportesDe } from "@/lib/comprobantes";
import { configuracion, umbralJunta } from "@/lib/datos/catalogos";
import { pesos } from "@/lib/dinero";
import { fecha, fechaHora, mes } from "@/lib/fechas";
import { Aviso, codigoMov, Encabezado, EnlaceMov, EstadoMovimiento, Seccion } from "@/components/ui";
import { ListaSoportes } from "@/components/ListaSoportes";
import { Historial } from "@/components/Historial";
import { Formulario } from "@/components/Formulario";
import {
  accionAgregarSoporte, accionAnular, accionEliminarPendiente, accionMarcaDatosPersonales, accionVerificar,
} from "@/app/acciones/movimientos";

export const metadata = { title: "Movimiento" };

function Dato({ k, children }: { k: string; children: React.ReactNode }) {
  return (
    <div className="grid grid-cols-[10rem_1fr] gap-3 border-b border-linea/70 py-2 text-sm last:border-0 max-sm:grid-cols-1 max-sm:gap-0.5">
      <dt className="text-gris">{k}</dt>
      <dd className="min-w-0 break-words">{children}</dd>
    </div>
  );
}

export default async function Movimiento({ params, searchParams }: { params: Promise<{ id: string }>; searchParams: Promise<Record<string, string>> }) {
  const { id: idTxt } = await params;
  const sp = await searchParams;
  if (!/^\d+$/.test(idTxt)) notFound();
  const id = Number(idTxt);
  const data = await leer(async (tx, s) => {
    const m = await detalleMovimiento(tx, s.rol, id);
    if (!m) return null;
    const tes = s.rol === "tesoreria";
    const [soportes, apps, hist, conf, reemb, correccion] = await enSerie([
      () => soportesDe(tx, "movimiento_id", id),
      () => tes ? aplicacionesDe(tx, id) : Promise.resolve([]),
      () => tes ? historialDe(tx, "movimientos", id) : Promise.resolve([]),
      () => configuracion(tx),
      () => tx.query("SELECT id, fecha_efectiva, valor, estado FROM v_movimientos_consulta WHERE reembolsa_a = $1 ORDER BY fecha_efectiva", [id]),
      () => tx.query("SELECT id FROM v_movimientos_consulta WHERE corrige_a = $1", [id]),
    ]);
    return { m, soportes, apps, hist, umbral: umbralJunta(conf), reemb: reemb.rows, correccion: correccion.rows[0]?.id as number | undefined, tes };
  });
  if (!data) notFound();
  const { m, soportes, apps, hist, umbral, reemb, correccion, tes } = data;
  const totalApps = apps.reduce((a, x) => a + x.valor, 0);
  const tipoTxt = m.reembolsa_a ? "Reembolso (ingreso)" : m.tipo === "ingreso" ? "Ingreso" : m.tipo === "egreso" ? "Egreso" : "Traslado entre cuentas";

  return (
    <>
      <Encabezado
        antetitulo={tipoTxt}
        titulo={codigoMov(m.id)}
        descripcion={m.concepto}
        acciones={tes && m.estado !== "anulado" ? (
          <>
            {m.estado === "pendiente" && <Link href={`/movimientos/${m.id}/editar`} className="btn-secundario">Editar</Link>}
            <Link href={`/movimientos/${m.id}/corregir`} className="btn-secundario">Registrar corrección</Link>
            {m.tipo === "ingreso" && !m.reembolsa_a && m.miembro_id && (
              <Link href={`/movimientos/${m.id}/distribuir`} className="btn-secundario">Distribuir en compromisos</Link>
            )}
          </>
        ) : undefined}
      />
      {sp.guardado && <div className="mb-5"><Aviso>Movimiento guardado.</Aviso></div>}
      {m.estado === "anulado" && (
        <div className="mb-5">
          <Aviso tono="alerta">
            <strong>Anulado</strong> el {fechaHora(m.anulado_en)}{m.anulado_por_nombre ? ` por ${m.anulado_por_nombre}` : ""}. Motivo: {m.motivo_anulacion}.
            No afecta saldos; se conserva como historial.
            {correccion ? <> Corrección registrada en <EnlaceMov id={correccion} />.</> : null}
          </Aviso>
        </div>
      )}
      {m.historico && m.estado !== "anulado" && (
        <div className="mb-5">
          <Aviso>Su fecha efectiva es igual o anterior al corte del saldo inicial de la cuenta: ya está incluido en ese saldo y no se suma otra vez.</Aviso>
        </div>
      )}

      <div className="grid gap-x-10 lg:grid-cols-[1.3fr_1fr]">
        <div>
          <dl className="panel px-4 py-1">
            <Dato k="Valor"><span className={`num text-lg font-semibold ${m.tipo === "ingreso" ? "text-olivo" : m.tipo === "egreso" ? "text-tierra" : ""}`}>{pesos(m.valor)}</span></Dato>
            <Dato k="Estado"><EstadoMovimiento estado={m.estado} historico={m.historico} /></Dato>
            <Dato k="Fecha efectiva">{fecha(m.fecha_efectiva)}</Dato>
            <Dato k={m.tipo === "traslado" ? "Cuentas" : "Cuenta o medio"}>{m.cuenta}{m.cuenta_destino ? ` → ${m.cuenta_destino}` : ""}</Dato>
            {m.medio_pago && <Dato k="Medio de pago">{m.medio_pago}</Dato>}
            {m.categoria && <Dato k="Categoría">{m.categoria}</Dato>}
            {m.fondo && <Dato k="Proyecto o destinación">{m.fondo}</Dato>}
            {tes && m.miembro && <Dato k="Aportante / miembro"><Link href={`/miembros/${m.miembro_id}`}>{m.miembro}</Link></Dato>}
            {m.tercero && <Dato k="Persona u organización">{m.tercero}</Dato>}
            {!tes && m.de_miembro && <Dato k="Aportante">Información reservada a tesorería</Dato>}
            {m.obligacion && <Dato k="Paga el gasto comprometido">{m.obligacion}</Dato>}
            {m.reembolsa_a && <Dato k="Reembolso de"><EnlaceMov id={m.reembolsa_a} /></Dato>}
            {m.corrige_a && <Dato k="Corrige a"><EnlaceMov id={m.corrige_a} /></Dato>}
            <Dato k="Autorización">
              {m.referencia_autorizacion ? (
                <>
                  {m.referencia_autorizacion}
                  <span className="block text-xs text-gris">Referencia cargada por tesorería; no constituye una aprobación digital de presidencia.</span>
                </>
              ) : <span className="text-gris">Sin referencia</span>}
              {umbral !== null && m.tipo === "egreso" && m.valor > umbral && (
                <span className="mt-1 block text-xs text-aviso">Supera {pesos(umbral)}: requiere autorización previa de la Junta Directiva (art. 30 c).</span>
              )}
            </Dato>
            {tes && m.observaciones && <Dato k="Observaciones">{m.observaciones}</Dato>}
            <Dato k="Registrado por tesorería">{fechaHora(m.registrado_en)}{m.registrado_por_nombre ? ` · ${m.registrado_por_nombre}` : ""}</Dato>
            <Dato k="Verificado">{m.verificado_en ? `${fechaHora(m.verificado_en)}${m.verificado_por_nombre ? ` · ${m.verificado_por_nombre}` : ""}` : "Pendiente de verificación"}</Dato>
          </dl>

          {tes && m.tipo === "ingreso" && !m.reembolsa_a && (
            <Seccion titulo="Distribución en compromisos">
              {apps.length === 0 ? <p className="text-sm text-gris">Este ingreso no está distribuido en compromisos de aportes.</p> : (
                <table className="tabla">
                  <thead><tr><th>Compromiso</th><th className="der">Abono</th></tr></thead>
                  <tbody>
                    {apps.map((a) => (
                      <tr key={a.id}>
                        <td>{a.miembro} · {ETIQUETA_DESTINO[a.destino]}{a.periodo ? ` · ${mes(a.periodo)}` : ""}</td>
                        <td className="der">{pesos(a.valor)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
              {m.valor - totalApps > 0 && (
                <p className="mt-2 text-sm">
                  Remanente {pesos(m.valor - totalApps)}:{" "}
                  {m.excedente_destino === "saldo_a_favor" ? "saldo a favor del aportante" : m.excedente_destino === "aporte_adicional" ? "aporte adicional voluntario" : `clasificado como ${m.categoria ?? "ingreso"}`}.
                </p>
              )}
            </Seccion>
          )}

          {reemb.length > 0 && (
            <Seccion titulo="Reembolsos de este egreso">
              <ul className="text-sm">
                {reemb.map((r: { id: number; fecha_efectiva: string; valor: number; estado: string }) => (
                  <li key={r.id}><EnlaceMov id={r.id} /> · {fecha(r.fecha_efectiva)} · {pesos(r.valor)} · {r.estado}</li>
                ))}
              </ul>
            </Seccion>
          )}
        </div>

        <div>
          {tes && m.estado === "pendiente" && (
            <Seccion titulo="Verificación">
              <p className="mb-2 text-sm text-gris">Verifique cuando haya contrastado el movimiento con el extracto o el soporte. Desde ese momento afecta el saldo y no se puede editar.</p>
              <Formulario accion={accionVerificar} boton="Marcar como verificado" enLinea>
                <input type="hidden" name="id" value={m.id} />
              </Formulario>
            </Seccion>
          )}

          <Seccion titulo="Soportes">
            <ListaSoportes soportes={soportes} vacio={tes ? "Sin soportes cargados." : "No hay soportes visibles para consulta."} />
            {tes && soportes.length > 0 && (
              <details className="mt-3 text-sm">
                <summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Cambiar visibilidad para consulta</summary>
                <div className="mt-2 space-y-2">
                  {soportes.map((s) => (
                    <Formulario key={s.id} accion={accionMarcaDatosPersonales} boton={s.datos_personales ? `Permitir que consulta vea "${s.nombre_archivo}"` : `Ocultar "${s.nombre_archivo}" a consulta`} claseBoton="btn-enlace" enLinea>
                      <input type="hidden" name="comprobante_id" value={s.id} />
                      <input type="hidden" name="datos_personales" value={s.datos_personales ? "0" : "1"} />
                    </Formulario>
                  ))}
                </div>
              </details>
            )}
            {tes && m.estado !== "anulado" && (
              <Formulario accion={accionAgregarSoporte} boton="Cargar soporte" claseBoton="btn-secundario" className="mt-4" limpiarAlTerminar>
                <input type="hidden" name="campo" value="movimiento_id" />
                <input type="hidden" name="id" value={m.id} />
                <input type="file" name="comprobante" accept="application/pdf,image/jpeg,image/png" required className="block text-sm" />
                <label className="mt-2 flex items-center gap-2 text-sm"><input type="checkbox" name="sin_datos_personales" value="1" /> No contiene datos personales</label>
              </Formulario>
            )}
          </Seccion>

          {tes && m.estado !== "anulado" && (
            <Seccion titulo="Anular">
              <p className="mb-2 text-sm text-gris">La anulación deja el registro en el historial y retira su efecto de los saldos y de los compromisos.</p>
              <Formulario accion={accionAnular} boton="Anular movimiento" claseBoton="btn-peligro" confirmar="¿Anular este movimiento? La acción queda en el historial.">
                <input type="hidden" name="id" value={m.id} />
                <label className="campo"><span>Motivo</span><input name="motivo" className="entrada" required minLength={5} maxLength={500} /></label>
              </Formulario>
              {m.estado === "pendiente" && (
                <Formulario accion={accionEliminarPendiente} boton="Eliminar registro por verificar" claseBoton="btn-enlace text-alerta" className="mt-3" confirmar="¿Eliminar este registro? Solo es posible porque aún no está verificado.">
                  <input type="hidden" name="id" value={m.id} />
                </Formulario>
              )}
            </Seccion>
          )}

          {tes && (
            <Seccion titulo="Historial de cambios">
              <Historial entradas={hist} />
            </Seccion>
          )}
        </div>
      </div>
    </>
  );
}
