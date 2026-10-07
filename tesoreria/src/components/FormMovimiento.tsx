"use client";

import { useActionState, useMemo, useState } from "react";
import { BotonEnviar, Mensajes } from "./Formulario";
import { leerPesos, pesos, pesosCampo } from "@/lib/dinero";
import { distribuir } from "@/lib/calculos";
import { fecha, mes } from "@/lib/fechas";
import type { EstadoAccion } from "@/lib/tipos";

type Opcion = { id: number; nombre: string };
export type DatosFormMovimiento = {
  cuentas: Opcion[];
  categorias: (Opcion & { tipo: "ingreso" | "egreso" })[];
  fondos: Opcion[];
  miembros: (Opcion & { codigo: string })[];
  compromisos: {
    id: number; miembro_id: number; tipo: string; destino: string; periodo: string | null;
    esquema: string; fecha_acordada: string; disponible: number;
  }[];
  obligaciones: { id: number; descripcion: string; tercero: string | null; saldo: number; categoria_id: number; fondo_id: number | null }[];
  egresos: { id: number; fecha_efectiva: string; concepto: string; valor: number }[];
  umbralJunta: number | null;
  mediosPago: string[];
};

export type ValoresMovimiento = Partial<{
  id: number; corrige_a: number; tipo: "ingreso" | "egreso" | "traslado"; fecha_efectiva: string; cuenta_id: number;
  cuenta_destino_id: number | null; miembro_id: number | null; tercero: string | null; concepto: string;
  categoria_id: number | null; valor: number; medio_pago: string | null; fondo_id: number | null;
  referencia_autorizacion: string | null; obligacion_id: number | null; reembolsa_a: number | null;
  excedente_destino: string | null; observaciones: string | null; aplicaciones: Record<number, number>;
}>;

const DESTINO: Record<string, string> = {
  gastos_constitucion: "Constitución · gastos",
  patrimonio_inicial: "Constitución · patrimonio",
  sostenimiento: "Mensualidad",
};

export function FormMovimiento({
  datos, valores = {}, accion, hoy,
}: {
  datos: DatosFormMovimiento;
  valores?: ValoresMovimiento;
  accion: (p: EstadoAccion, d: FormData) => Promise<EstadoAccion>;
  hoy: string;
}) {
  const [estado, despachar] = useActionState(accion, undefined);
  const [tipo, setTipo] = useState(valores.tipo ?? "ingreso");
  const [valorTxt, setValorTxt] = useState(valores.valor ? pesosCampo(valores.valor) : "");
  const [miembro, setMiembro] = useState<number | "">(valores.miembro_id ?? "");
  const [reembolso, setReembolso] = useState<number | "">(valores.reembolsa_a ?? "");
  const [obligacion, setObligacion] = useState<number | "">(valores.obligacion_id ?? "");
  const [categoria, setCategoria] = useState<number | "">(valores.categoria_id ?? "");
  const [fondo, setFondo] = useState<number | "">(valores.fondo_id ?? "");
  const [tercero, setTercero] = useState(valores.tercero ?? "");
  const [concepto, setConcepto] = useState(valores.concepto ?? "");
  const [refAut, setRefAut] = useState(valores.referencia_autorizacion ?? "");
  const [apps, setApps] = useState<Record<number, string>>(
    Object.fromEntries(Object.entries(valores.aplicaciones ?? {}).map(([k, v]) => [k, pesosCampo(v)])),
  );
  const [excedente, setExcedente] = useState(valores.excedente_destino ?? "");

  const valor = leerPesos(valorTxt) ?? 0;
  const abiertos = useMemo(
    () => datos.compromisos.filter((c) => c.miembro_id === miembro).map((c) => ({
      ...c,
      // En una edición, lo ya aplicado por este mismo movimiento vuelve a estar disponible.
      disponible: c.disponible + (valores.aplicaciones?.[c.id] ?? 0),
    })),
    [datos.compromisos, miembro, valores.aplicaciones],
  );
  const totalApps = Object.values(apps).reduce((a, v) => a + (leerPesos(v) ?? 0), 0);
  const resto = valor - totalApps;
  const esAporte = tipo === "ingreso" && !reembolso && miembro !== "";
  const cats = datos.categorias.filter((c) => c.tipo === (tipo === "egreso" ? "egreso" : "ingreso"));
  const superaUmbral = tipo === "egreso" && datos.umbralJunta !== null && valor > datos.umbralJunta;

  function autoDistribuir() {
    const r = distribuir(valor, abiertos.map((c) => ({ id: c.id, saldo: c.disponible })));
    setApps(Object.fromEntries(r.asignaciones.map((a) => [a.compromiso_id, pesosCampo(a.valor)])));
  }

  function elegirObligacion(id: number | "") {
    setObligacion(id);
    const o = datos.obligaciones.find((x) => x.id === id);
    if (o) {
      setCategoria(o.categoria_id);
      setFondo(o.fondo_id ?? "");
      if (!tercero && o.tercero) setTercero(o.tercero);
      if (!concepto) setConcepto(`Pago: ${o.descripcion}`);
      if (!valorTxt) setValorTxt(pesosCampo(o.saldo));
    }
  }

  return (
    <form action={despachar} className="space-y-8">
      {valores.id && <input type="hidden" name="id" value={valores.id} />}
      {valores.corrige_a && <input type="hidden" name="corrige_a" value={valores.corrige_a} />}

      {valores.corrige_a && (
        <fieldset className="rounded-md border-l-4 border-ocre bg-aviso-fondo p-4">
          <legend className="sr-only">Corrección</legend>
          <p className="text-sm">
            Está registrando la <strong>corrección</strong> del movimiento MOV-{String(valores.corrige_a).padStart(5, "0")}. Al guardar,
            el original quedará <strong>anulado con este motivo</strong> y se conservará en el historial.
          </p>
          <label className="campo mt-3">
            <span>Motivo de la corrección</span>
            <input name="motivo_correccion" className="entrada" required minLength={5} maxLength={500} />
          </label>
          <label className="mt-2 flex items-center gap-2 text-sm">
            <input type="checkbox" name="conservar_soportes" value="1" defaultChecked /> Usar también los soportes del movimiento original
          </label>
        </fieldset>
      )}

      <fieldset>
        <legend className="etiqueta mb-2">Tipo de movimiento</legend>
        <div className="inline-flex overflow-hidden rounded-md border border-linea">
          {(["ingreso", "egreso", "traslado"] as const).map((t) => (
            <label key={t} className={`cursor-pointer px-4 py-2 text-sm font-semibold ${tipo === t ? "bg-olivo text-white" : "bg-white text-gris hover:bg-suave"}`}>
              <input type="radio" name="tipo" value={t} checked={tipo === t} onChange={() => setTipo(t)} className="sr-only" />
              {t === "ingreso" ? "Ingreso" : t === "egreso" ? "Egreso" : "Traslado entre cuentas"}
            </label>
          ))}
        </div>
        {tipo === "traslado" && (
          <p className="ayuda">Un traslado entre cuentas propias no es ingreso ni gasto: solo cambia el saldo de cada cuenta.</p>
        )}
      </fieldset>

      <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        <label className="campo">
          <span>Fecha efectiva</span>
          <input type="date" name="fecha_efectiva" className="entrada" defaultValue={valores.fecha_efectiva ?? hoy} max="2100-12-31" required />
          <span className="ayuda">Cuándo ocurrió la transacción (distinta de la fecha de registro).</span>
        </label>
        <label className="campo">
          <span>Valor (pesos)</span>
          <input
            name="valor" inputMode="decimal" className="entrada num" placeholder="0" required value={valorTxt}
            onChange={(e) => setValorTxt(e.target.value)}
            onBlur={() => { const c = leerPesos(valorTxt); if (c !== null) setValorTxt(pesosCampo(c)); }}
          />
          <span className="ayuda">{valorTxt && leerPesos(valorTxt) === null ? "Formato: 150.000 o 150.000,50" : valor ? pesos(valor) : " "}</span>
        </label>
        <label className="campo">
          <span>{tipo === "traslado" ? "Cuenta de origen" : "Cuenta o medio"}</span>
          <select name="cuenta_id" className="entrada" defaultValue={valores.cuenta_id ?? ""} required>
            <option value="">Seleccione…</option>
            {datos.cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select>
        </label>
        {tipo === "traslado" && (
          <label className="campo">
            <span>Cuenta de destino</span>
            <select name="cuenta_destino_id" className="entrada" defaultValue={valores.cuenta_destino_id ?? ""} required>
              <option value="">Seleccione…</option>
              {datos.cuentas.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        )}
        <label className="campo">
          <span>Medio de pago</span>
          <select name="medio_pago" className="entrada" defaultValue={valores.medio_pago ?? ""}>
            <option value="">—</option>
            {datos.mediosPago.map((m) => <option key={m}>{m}</option>)}
          </select>
        </label>
      </div>

      {tipo === "ingreso" && (
        <label className="campo max-w-xl">
          <span>¿Es el reembolso de un egreso?</span>
          <select name="reembolsa_a" className="entrada" value={reembolso} onChange={(e) => setReembolso(e.target.value ? Number(e.target.value) : "")}>
            <option value="">No, es un ingreso</option>
            {datos.egresos.map((e) => (
              <option key={e.id} value={e.id}>
                MOV-{String(e.id).padStart(5, "0")} · {fecha(e.fecha_efectiva)} · {e.concepto} · {pesos(e.valor)}
              </option>
            ))}
          </select>
          <span className="ayuda">Un reembolso disminuye el gasto original (misma categoría y fondo); no se cuenta como ingreso nuevo.</span>
        </label>
      )}

      {tipo === "egreso" && datos.obligaciones.length > 0 && (
        <label className="campo max-w-xl">
          <span>¿Paga un gasto comprometido?</span>
          <select name="obligacion_id" className="entrada" value={obligacion} onChange={(e) => elegirObligacion(e.target.value ? Number(e.target.value) : "")}>
            <option value="">No</option>
            {datos.obligaciones.map((o) => (
              <option key={o.id} value={o.id}>{o.descripcion} · por pagar {pesos(o.saldo)}</option>
            ))}
          </select>
          <span className="ayuda">El pago verificado disminuye automáticamente el saldo pendiente de ese gasto.</span>
        </label>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="campo sm:col-span-2">
          <span>Concepto</span>
          <input name="concepto" className="entrada" maxLength={300} required value={concepto} onChange={(e) => setConcepto(e.target.value)} />
        </label>
        {tipo !== "traslado" && !reembolso && (
          <label className="campo">
            <span>Categoría</span>
            <select name="categoria_id" className="entrada" value={categoria} onChange={(e) => setCategoria(e.target.value ? Number(e.target.value) : "")} required>
              <option value="">Seleccione…</option>
              {cats.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
            </select>
          </label>
        )}
        {tipo !== "traslado" && !reembolso && datos.fondos.length > 0 && (
          <label className="campo">
            <span>Proyecto o destinación</span>
            <select name="fondo_id" className="entrada" value={fondo} onChange={(e) => setFondo(e.target.value ? Number(e.target.value) : "")}>
              <option value="">Recursos generales</option>
              {datos.fondos.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
            </select>
          </label>
        )}
        {tipo !== "traslado" && (
          <>
            <label className="campo">
              <span>{tipo === "ingreso" ? "Aportante registrado (opcional)" : "Miembro relacionado (opcional)"}</span>
              <select name="miembro_id" className="entrada" value={miembro} onChange={(e) => { setMiembro(e.target.value ? Number(e.target.value) : ""); setApps({}); }}>
                <option value="">—</option>
                {datos.miembros.map((m) => <option key={m.id} value={m.id}>{m.nombre} ({m.codigo})</option>)}
              </select>
            </label>
            <label className="campo">
              <span>{tipo === "ingreso" ? "Otra persona u organización" : "Proveedor o beneficiario"}</span>
              <input name="tercero" className="entrada" maxLength={200} value={tercero} onChange={(e) => setTercero(e.target.value)}
                placeholder={tipo === "ingreso" ? "p. ej. donante no registrado" : ""} />
            </label>
          </>
        )}
      </div>

      {esAporte && (
        <fieldset className="rounded-md border border-linea p-4">
          <legend className="px-1 text-sm font-semibold text-olivo">Abonos a compromisos de aportes</legend>
          {abiertos.length === 0 ? (
            <p className="text-sm text-gris">Esta persona no tiene compromisos con saldo. Si es un pago anticipado, genere primero los compromisos de esos meses (Aportes → Mensualidades) o regístrelo como saldo a favor.</p>
          ) : (
            <>
              <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-gris">Un solo ingreso puede cubrir varios meses: se distribuye sin duplicar el dinero recibido.</p>
                <button type="button" className="btn-secundario px-3 py-1.5 text-xs" onClick={autoDistribuir} disabled={!valor}>
                  Distribuir desde el más antiguo
                </button>
              </div>
              <div className="overflow-x-auto">
                <table className="tabla">
                  <thead><tr><th>Compromiso</th><th>Fecha acordada</th><th className="der">Saldo</th><th className="der">Abonar</th></tr></thead>
                  <tbody>
                    {abiertos.map((c) => (
                      <tr key={c.id}>
                        <td>{DESTINO[c.destino]}{c.periodo ? ` · ${mes(c.periodo)}` : ""}<span className="block text-xs text-gris">{c.esquema}</span></td>
                        <td className="num">{fecha(c.fecha_acordada)}</td>
                        <td className="der">{pesos(c.disponible)}</td>
                        <td className="der">
                          <input name={`aplicacion_${c.id}`} inputMode="decimal" className="entrada num w-32 py-1 text-right" value={apps[c.id] ?? ""}
                            onChange={(e) => setApps({ ...apps, [c.id]: e.target.value })} aria-label="Valor a abonar" />
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
          <div className="mt-3 flex flex-wrap gap-x-6 text-sm">
            <span>Recibido: <strong className="num">{pesos(valor)}</strong></span>
            <span>Distribuido: <strong className="num">{pesos(totalApps)}</strong></span>
            <span className={resto < 0 ? "text-alerta" : ""}>Excedente: <strong className="num">{pesos(resto)}</strong></span>
          </div>
          {resto < 0 && <p className="mt-1 text-sm text-alerta">Lo distribuido supera el valor recibido.</p>}
          {resto > 0 && (
            <div className="mt-3 space-y-1.5 text-sm">
              <p className="font-semibold">¿Qué hacer con el excedente? (decisión de tesorería)</p>
              <label className="flex items-center gap-2"><input type="radio" name="excedente_destino" value="saldo_a_favor" checked={excedente === "saldo_a_favor"} onChange={() => setExcedente("saldo_a_favor")} /> Saldo a favor del aportante (se aplicará a compromisos futuros)</label>
              <label className="flex items-center gap-2"><input type="radio" name="excedente_destino" value="aporte_adicional" checked={excedente === "aporte_adicional"} onChange={() => setExcedente("aporte_adicional")} /> Aporte adicional voluntario</label>
              {totalApps === 0 && (
                <label className="flex items-center gap-2"><input type="radio" name="excedente_destino" value="" checked={excedente === ""} onChange={() => setExcedente("")} /> No corresponde a compromisos (se clasifica por su categoría, p. ej. donación)</label>
              )}
            </div>
          )}
        </fieldset>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <label className="campo">
          <span>Referencia de autorización</span>
          <input name="referencia_autorizacion" className="entrada" maxLength={300} value={refAut} onChange={(e) => setRefAut(e.target.value)}
            placeholder="p. ej. Acta de Junta n.º 3 del 12/09/2026" />
          <span className="ayuda">Tesorería registra la referencia; no equivale a una aprobación digital de presidencia.</span>
        </label>
        <label className="campo">
          <span>Observaciones</span>
          <input name="observaciones" className="entrada" maxLength={1000} defaultValue={valores.observaciones ?? ""} />
        </label>
      </div>
      {superaUmbral && (
        <p className={`aviso ${refAut ? "border-olivo-vivo bg-tenue" : "border-ocre bg-aviso-fondo"}`}>
          Este egreso supera el umbral de {pesos(datos.umbralJunta!)} (art. 30 c de los estatutos): el acto o contrato requiere
          autorización previa de la Junta Directiva. {refAut ? "Referencia registrada." : "Registre la referencia del acta."}
        </p>
      )}

      <fieldset className="space-y-2">
        <legend className="etiqueta mb-1">Comprobante</legend>
        <input type="file" name="comprobante" accept="application/pdf,image/jpeg,image/png,.pdf,.jpg,.jpeg,.png" multiple className="block text-sm" />
        <span className="ayuda">PDF, JPG o PNG. Se guarda de forma privada.</span>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="sin_datos_personales" value="1" /> El comprobante no tiene datos personales (puede verlo consulta)
        </label>
      </fieldset>

      <div className="flex flex-wrap items-center gap-4 border-t border-linea pt-5">
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" name="verificar" value="1" /> Marcar como verificado (contrastado con el extracto o el soporte)
        </label>
        <BotonEnviar>{valores.corrige_a ? "Guardar corrección" : valores.id ? "Guardar cambios" : "Registrar movimiento"}</BotonEnviar>
      </div>
      <Mensajes estado={estado} />
    </form>
  );
}
