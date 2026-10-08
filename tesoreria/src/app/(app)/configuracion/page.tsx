import Link from "next/link";
import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { categorias, configuracion, cuentas } from "@/lib/datos/catalogos";
import { pesos, pesosCampo } from "@/lib/dinero";
import { fecha, fechaHora, hoyCO } from "@/lib/fechas";
import { Encabezado, Insignia, Seccion, TablaContenedor, Vacio } from "@/components/ui";
import { Formulario } from "@/components/Formulario";
import {
  accionAnularSaldoInicial, accionGuardarCategoria, accionGuardarCuenta, accionParametros, accionSaldoInicial,
} from "@/app/acciones/configuracion";

export const metadata = { title: "Configuración" };

export default async function Configuracion() {
  await exigirTesoreriaPagina();
  const d = await leer(async (tx) => ({
    conf: await configuracion(tx),
    cs: await cuentas(tx),
    cats: await categorias(tx),
    saldos: (await tx.query(
      `SELECT s.*, c.nombre AS cuenta, u.nombre AS registrado_por_nombre FROM saldos_iniciales s JOIN cuentas c ON c.id = s.cuenta_id
         LEFT JOIN usuarios u ON u.id = s.registrado_por ORDER BY s.estado, c.nombre, s.registrado_en DESC`)).rows,
  }));
  const { conf, cs, cats, saldos } = d;
  const sinSaldo = cs.filter((c) => c.activa && !saldos.some((s: { cuenta_id: number; estado: string }) => s.cuenta_id === c.id && s.estado === "confirmado"));

  return (
    <>
      <Encabezado titulo="Configuración" acciones={<>
        <Link href="/configuracion/usuarios" className="btn-secundario">Cuentas de acceso</Link>
        <Link href="/configuracion/historial" className="btn-secundario">Historial de cambios</Link>
      </>} />

      <Seccion titulo="Cuentas bancarias y de caja" id="cuentas" nota="Registre solo el nombre y, si quiere, los últimos 4 dígitos. No guarde claves ni números completos.">
        {cs.length === 0 ? <Vacio>Sin cuentas.</Vacio> : (
          <TablaContenedor>
            <table className="tabla">
              <thead><tr><th>Cuenta</th><th>Tipo</th><th>Entidad</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {cs.map((c) => (
                  <tr key={c.id}>
                    <td className="font-semibold">{c.nombre}{c.detalle ? <span className="block text-xs font-normal text-gris">{c.detalle}</span> : null}</td>
                    <td className="capitalize">{c.tipo}</td><td>{c.entidad ?? "—"}</td>
                    <td>{c.activa ? <Insignia tono="ok">Activa</Insignia> : <Insignia tono="suave">Inactiva</Insignia>}</td>
                    <td>
                      <details><summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Editar</summary>
                        <Formulario accion={accionGuardarCuenta} boton="Guardar" claseBoton="btn-secundario px-3 py-1 text-xs" className="mt-2 grid w-72 gap-2">
                          <input type="hidden" name="id" value={c.id} />
                          <input name="nombre" className="entrada py-1 text-sm" defaultValue={c.nombre} aria-label="Nombre" />
                          <select name="tipo" className="entrada py-1 text-sm" defaultValue={c.tipo} aria-label="Tipo"><option value="banco">Banco</option><option value="caja">Caja</option><option value="otro">Otro</option></select>
                          <input name="entidad" className="entrada py-1 text-sm" defaultValue={c.entidad ?? ""} placeholder="Entidad" />
                          <input name="detalle" className="entrada py-1 text-sm" defaultValue={c.detalle ?? ""} placeholder="Últimos 4 dígitos" />
                          <select name="activa" className="entrada py-1 text-sm" defaultValue={c.activa ? "1" : "0"} aria-label="Estado"><option value="1">Activa</option><option value="0">Inactiva</option></select>
                        </Formulario></details>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaContenedor>
        )}
        <details className="mt-3">
          <summary className="btn-secundario cursor-pointer list-none">Agregar cuenta</summary>
          <Formulario accion={accionGuardarCuenta} boton="Agregar" className="mt-3 grid max-w-3xl gap-3 sm:grid-cols-2" limpiarAlTerminar>
            <label className="campo"><span>Nombre</span><input name="nombre" className="entrada" required placeholder="Cuenta de ahorros principal" /></label>
            <label className="campo"><span>Tipo</span><select name="tipo" className="entrada"><option value="banco">Banco</option><option value="caja">Caja (efectivo)</option><option value="otro">Otro</option></select></label>
            <label className="campo"><span>Entidad</span><input name="entidad" className="entrada" /></label>
            <label className="campo"><span>Detalle (últimos 4 dígitos)</span><input name="detalle" className="entrada" maxLength={20} /></label>
          </Formulario>
        </details>
      </Seccion>

      <Seccion titulo="Saldo inicial" id="saldo-inicial"
        nota="Se introduce expresamente por cuenta, con fecha de corte y soporte. Los movimientos con fecha igual o anterior al corte quedan como históricos y no se suman otra vez. El patrimonio de $10.000.000 que mencionan los estatutos no se carga automáticamente.">
        {saldos.length > 0 && (
          <TablaContenedor>
            <table className="tabla">
              <thead><tr><th>Cuenta</th><th>Fecha de corte</th><th className="der">Saldo</th><th>Referencia</th><th>Estado</th><th></th></tr></thead>
              <tbody>
                {saldos.map((s: { id: number; cuenta: string; fecha_corte: string; valor: number; referencia: string; estado: string; comprobante_id: string; registrado_en: string; registrado_por_nombre: string; motivo_anulacion: string | null }) => (
                  <tr key={s.id} className={s.estado === "anulado" ? "text-gris" : ""}>
                    <td>{s.cuenta}</td><td className="num">{fecha(s.fecha_corte)}</td><td className="der">{pesos(s.valor)}</td>
                    <td className="text-xs">{s.referencia} · <a href={`/api/comprobantes/${s.comprobante_id}`} target="_blank" rel="noopener">soporte</a>
                      <span className="block text-gris">Registrado por tesorería: {s.registrado_por_nombre} · {fechaHora(s.registrado_en)}</span></td>
                    <td>{s.estado === "confirmado" ? <Insignia tono="ok">Confirmado</Insignia> : <Insignia tono="suave">Anulado: {s.motivo_anulacion}</Insignia>}</td>
                    <td>{s.estado === "confirmado" && (
                      <details><summary className="cursor-pointer text-xs font-semibold text-ocre-texto">Anular</summary>
                        <Formulario accion={accionAnularSaldoInicial} boton="Anular" claseBoton="btn-enlace text-alerta" className="mt-2 w-60" confirmar="¿Anular este saldo inicial?">
                          <input type="hidden" name="id" value={s.id} />
                          <input name="motivo" className="entrada py-1 text-sm" placeholder="Motivo" required minLength={5} />
                        </Formulario></details>
                    )}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaContenedor>
        )}
        {cs.length === 0 ? <p className="text-sm text-gris">Primero agregue una cuenta.</p> : sinSaldo.length > 0 ? (
          <Formulario accion={accionSaldoInicial} boton="Confirmar saldo inicial" className="mt-4 grid max-w-3xl gap-3 sm:grid-cols-2" limpiarAlTerminar
            confirmar="¿Confirmar este saldo inicial? Solo podrá anularse con motivo.">
            <label className="campo"><span>Cuenta</span><select name="cuenta_id" className="entrada">{sinSaldo.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}</select></label>
            <label className="campo"><span>Fecha de corte</span><input type="date" name="fecha_corte" className="entrada" required max={hoyCO()} /></label>
            <label className="campo"><span>Saldo a esa fecha</span><input name="valor" className="entrada num" required placeholder="0" /></label>
            <label className="campo"><span>Referencia</span><input name="referencia" className="entrada" required placeholder="Extracto bancario de septiembre de 2026" /></label>
            <label className="campo sm:col-span-2"><span>Soporte (obligatorio)</span><input type="file" name="comprobante" accept="application/pdf,image/jpeg,image/png" required className="text-sm" />
              <label className="mt-2 flex items-center gap-2 text-sm font-normal"><input type="checkbox" name="sin_datos_personales" value="1" /> Sin datos personales (visible para consulta)</label></label>
          </Formulario>
        ) : <p className="mt-3 text-sm text-gris">Todas las cuentas activas tienen saldo inicial confirmado.</p>}
      </Seccion>

      <Seccion titulo="Categorías" id="categorias" nota="Editables. Desactivar una categoría la oculta de los formularios sin alterar los registros existentes.">
        <div className="grid gap-6 md:grid-cols-2">
          {(["egreso", "ingreso"] as const).map((t) => (
            <div key={t}>
              <h3 className="mb-2 text-sm font-semibold">{t === "egreso" ? "Egresos" : "Ingresos"}</h3>
              <ul className="panel divide-y divide-linea/70">
                {cats.filter((c) => c.tipo === t).map((c) => (
                  <li key={c.id} className="px-3 py-2 text-sm">
                    <details><summary className="flex cursor-pointer items-center justify-between gap-2">
                      <span>{c.nombre}{!c.activa && <span className="text-gris"> (inactiva)</span>}</span><span className="text-xs text-ocre-texto">Editar</span></summary>
                      <Formulario accion={accionGuardarCategoria} boton="Guardar" claseBoton="btn-secundario px-3 py-1 text-xs" className="mt-2 grid grid-cols-3 gap-2">
                        <input type="hidden" name="id" value={c.id} />
                        <input name="nombre" className="entrada col-span-3 py-1 text-sm" defaultValue={c.nombre} aria-label="Nombre" />
                        <input name="orden" type="number" className="entrada py-1 text-sm" defaultValue={c.orden} aria-label="Orden" />
                        <select name="activa" className="entrada col-span-2 py-1 text-sm" defaultValue={c.activa ? "1" : "0"} aria-label="Estado"><option value="1">Activa</option><option value="0">Inactiva</option></select>
                      </Formulario></details>
                  </li>
                ))}
              </ul>
              <Formulario accion={accionGuardarCategoria} boton="Agregar" claseBoton="btn-secundario px-3 py-1 text-xs" className="mt-2 flex gap-2" enLinea limpiarAlTerminar>
                <input type="hidden" name="tipo" value={t} />
                <input name="nombre" className="entrada py-1 text-sm" placeholder="Nueva categoría" required />
              </Formulario>
            </div>
          ))}
        </div>
      </Seccion>

      <Seccion titulo="Parámetros" id="parametros">
        <Formulario accion={accionParametros} boton="Guardar parámetros" className="grid max-w-3xl gap-4 sm:grid-cols-2">
          <label className="campo"><span>Día de pago mensual por defecto (1-28)</span><input type="number" min={1} max={28} name="dia_pago_mensual" className="entrada" defaultValue={conf.dia_pago_mensual} required />
            <span className="ayuda">Cada esquema o aportante puede tener su propio día.</span></label>
          <span className="hidden sm:block" />
          <label className="campo"><span>Salario mínimo mensual (SMMLV)</span><input name="smmlv" className="entrada num" defaultValue={pesosCampo(conf.smmlv)} placeholder="Sin definir" /></label>
          <label className="campo"><span>Año del SMMLV</span><input type="number" name="smmlv_anio" className="entrada" defaultValue={conf.smmlv_anio ?? ""} /></label>
          <label className="campo"><span>Umbral de autorización de la Junta (en SMMLV)</span><input type="number" min={1} name="umbral_smmlv_junta" className="entrada" defaultValue={conf.umbral_smmlv_junta} required />
            <span className="ayuda">Art. 30 c: actos y contratos de más de 30 SMMLV requieren autorización previa de la Junta. Solo genera un aviso.</span></label>
          <span className="hidden sm:block" />
          <fieldset className="rounded-md border border-linea p-4 sm:col-span-2">
            <legend className="px-1 text-sm font-semibold text-olivo">Patrimonio declarado en los estatutos (art. 43, par. 2)</legend>
            <p className="text-sm">Los estatutos indican un patrimonio de <strong>{pesos(conf.patrimonio_declarado)}</strong> ya pagado. Es un dato informativo: no se registra como saldo, ingreso ni meta.</p>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <label className="campo"><span>Estado de verificación</span><select name="patrimonio_estado" className="entrada" defaultValue={conf.patrimonio_estado}><option value="por_confirmar">Por confirmar</option><option value="confirmado">Confirmado con soportes</option></select></label>
              <label className="campo"><span>Nota (dónde consta, en qué cuentas está)</span><input name="patrimonio_nota" className="entrada" defaultValue={conf.patrimonio_nota ?? ""} /></label>
            </div>
          </fieldset>
        </Formulario>
      </Seccion>

      <Seccion titulo="Respaldo y recuperación">
        <p className="max-w-3xl text-sm">
          La base de datos (incluidos los comprobantes) se respalda con el procedimiento descrito en el README del proyecto
          (<code>pg_dump</code> periódico y restauración puntual del proveedor). Desde aquí puede descargar exportaciones de control:
        </p>
        <ul className="mt-2 list-disc pl-5 text-sm">
          <li><a href="/api/exportar?conjunto=movimientos">Movimientos (CSV, detalle completo)</a></li>
          <li><a href="/api/exportar?conjunto=compromisos">Compromisos de aportes (CSV, detalle individual)</a></li>
          <li><a href="/api/exportar?conjunto=miembros">Miembros (CSV, incluye contacto)</a></li>
          <li><a href="/api/exportar?conjunto=respaldo">Respaldo de datos (JSON, sin el contenido de los comprobantes)</a></li>
        </ul>
      </Seccion>
    </>
  );
}
