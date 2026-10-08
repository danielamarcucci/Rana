import Link from "next/link";
import { leer } from "@/lib/sesion";
import { listarMovimientos } from "@/lib/datos/movimientos";
import { categorias, cuentas } from "@/lib/datos/catalogos";
import { porVerificar } from "@/lib/datos/finanzas";
import { pesos } from "@/lib/dinero";
import { fecha } from "@/lib/fechas";
import { esFechaISO } from "@/lib/fechas";
import { Aviso, Encabezado, EnlaceMov, EstadoMovimiento, Insignia, TablaContenedor, Vacio } from "@/components/ui";

export const metadata = { title: "Movimientos" };

export default async function Movimientos({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const filtro = {
    desde: esFechaISO(sp.desde) ? sp.desde : undefined,
    hasta: esFechaISO(sp.hasta) ? sp.hasta : undefined,
    tipo: ["ingreso", "egreso", "traslado", "reembolso"].includes(sp.tipo) ? sp.tipo : undefined,
    estado: ["pendiente", "verificado", "anulado", "activos"].includes(sp.estado) ? sp.estado : sp.estado === "todos" ? undefined : "activos",
    cuenta: /^\d+$/.test(sp.cuenta ?? "") ? Number(sp.cuenta) : undefined,
    categoria: /^\d+$/.test(sp.categoria ?? "") ? Number(sp.categoria) : undefined,
    q: sp.q?.slice(0, 80) || undefined,
    sinSoporte: sp.soporte === "sin",
  };
  const { filas, cs, cats, pv, rol } = await leer(async (tx, s) => ({
    filas: await listarMovimientos(tx, s.rol, filtro),
    cs: await cuentas(tx),
    cats: await categorias(tx),
    pv: await porVerificar(tx),
    rol: s.rol,
  }));
  const tes = rol === "tesoreria";
  const activos = filas.filter((f) => f.estado !== "anulado");
  const totIng = activos.filter((f) => f.tipo === "ingreso" && f.estado === "verificado" && !f.historico && !f.reembolsa_a).reduce((a, f) => a + f.valor, 0);
  const totEgr = activos.filter((f) => f.tipo === "egreso" && f.estado === "verificado" && !f.historico).reduce((a, f) => a + f.valor, 0);
  const exportar = new URLSearchParams({ conjunto: "movimientos", ...(filtro.desde ? { desde: filtro.desde } : {}), ...(filtro.hasta ? { hasta: filtro.hasta } : {}) });

  return (
    <>
      <Encabezado
        titulo="Movimientos"
        descripcion="Ingresos, egresos y traslados. Solo los movimientos verificados afectan el saldo confirmado; los verificados no se borran: se anulan o corrigen con motivo."
        acciones={
          <>
            <a href={`/api/exportar?${exportar}`} className="btn-secundario">Exportar CSV</a>
            {tes && <Link href="/movimientos/nuevo" className="btn-primario">Registrar movimiento</Link>}
          </>
        }
      />
      {sp.eliminado && <div className="mb-4"><Aviso>Registro por verificar eliminado (queda constancia en el historial).</Aviso></div>}
      {pv.n > 0 && filtro.estado !== "pendiente" && (
        <div className="mb-5">
          <Aviso tono="aviso">
            <strong>{pv.n} registro(s) pendiente(s) de verificación</strong> (ingresos {pesos(pv.ingresos)} · egresos {pesos(pv.egresos)}).{" "}
            <Link href="/movimientos?estado=pendiente">Ver solo pendientes</Link>
          </Aviso>
        </div>
      )}

      <form className="mb-5 grid grid-cols-2 gap-3 rounded-lg bg-tenue p-4 sm:grid-cols-3 lg:grid-cols-6" action="/movimientos">
        <label className="campo"><span className="!text-xs">Desde</span><input type="date" name="desde" defaultValue={filtro.desde} className="entrada py-1.5 text-sm" /></label>
        <label className="campo"><span className="!text-xs">Hasta</span><input type="date" name="hasta" defaultValue={filtro.hasta} className="entrada py-1.5 text-sm" /></label>
        <label className="campo"><span className="!text-xs">Tipo</span>
          <select name="tipo" defaultValue={filtro.tipo ?? ""} className="entrada py-1.5 text-sm">
            <option value="">Todos</option><option value="ingreso">Ingresos</option><option value="egreso">Egresos</option>
            <option value="traslado">Traslados</option><option value="reembolso">Reembolsos</option>
          </select></label>
        <label className="campo"><span className="!text-xs">Estado</span>
          <select name="estado" defaultValue={sp.estado ?? "activos"} className="entrada py-1.5 text-sm">
            <option value="activos">No anulados</option><option value="pendiente">Por verificar</option>
            <option value="verificado">Verificados</option><option value="anulado">Anulados</option><option value="todos">Todos</option>
          </select></label>
        <label className="campo"><span className="!text-xs">Cuenta</span>
          <select name="cuenta" defaultValue={sp.cuenta ?? ""} className="entrada py-1.5 text-sm">
            <option value="">Todas</option>{cs.map((c) => <option key={c.id} value={c.id}>{c.nombre}</option>)}
          </select></label>
        <label className="campo"><span className="!text-xs">Categoría</span>
          <select name="categoria" defaultValue={sp.categoria ?? ""} className="entrada py-1.5 text-sm">
            <option value="">Todas</option>{cats.map((c) => <option key={c.id} value={c.id}>{c.nombre} ({c.tipo})</option>)}
          </select></label>
        <label className="campo col-span-2 sm:col-span-2"><span className="!text-xs">Buscar</span><input name="q" defaultValue={filtro.q} className="entrada py-1.5 text-sm" placeholder="Concepto o tercero" /></label>
        <label className="flex items-end gap-2 pb-2 text-sm"><input type="checkbox" name="soporte" value="sin" defaultChecked={filtro.sinSoporte} /> Sin soporte</label>
        <div className="flex items-end gap-2"><button className="btn-secundario py-1.5">Filtrar</button><Link href="/movimientos" className="btn-enlace pb-2">Limpiar</Link></div>
      </form>

      <p className="mb-2 text-sm text-gris">
        {filas.length} registro(s){filas.length >= 300 ? " (se muestran los 300 más recientes; use los filtros)" : ""} · Verificados en la lista:
        ingresos <span className="num text-olivo">{pesos(totIng)}</span> · egresos <span className="num text-tierra">{pesos(totEgr)}</span>
      </p>
      {filas.length === 0 ? <Vacio>No hay movimientos con esos filtros.</Vacio> : (
        <TablaContenedor>
          <table className="tabla">
            <thead>
              <tr><th>Fecha</th><th className="max-sm:hidden">N.º</th><th>Concepto</th><th className="max-sm:hidden">Cuenta</th><th className="max-sm:hidden">Estado</th><th className="der max-sm:hidden">Valor</th></tr>
            </thead>
            <tbody>
              {filas.map((m) => (
                <tr key={m.id} className={m.estado === "anulado" ? "text-gris line-through decoration-gris/40" : ""}>
                  <td className="num whitespace-nowrap">{fecha(m.fecha_efectiva)}</td>
                  <td className="whitespace-nowrap max-sm:hidden"><EnlaceMov id={m.id} /></td>
                  <td className="sm:min-w-[14rem]">
                    {m.concepto}
                    <span className="block text-xs text-gris no-underline">
                      {[m.tipo === "traslado" ? "Traslado" : m.categoria, m.miembro, m.tercero, m.fondo].filter(Boolean).join(" · ")}
                      {m.reembolsa_a ? ` · Reembolso de MOV-${String(m.reembolsa_a).padStart(5, "0")}` : ""}
                      {m.obligacion_id ? " · Pago de gasto comprometido" : ""}
                    </span>
                    <span className="mt-1 flex flex-wrap items-center gap-2 sm:hidden">
                      <EnlaceMov id={m.id} />
                      <strong className={`num ${m.tipo === "ingreso" ? "text-olivo" : m.tipo === "egreso" ? "text-tierra" : "text-gris"}`}>{m.tipo === "egreso" ? "−" : m.tipo === "ingreso" ? "+" : ""}{pesos(m.valor)}</strong>
                      <EstadoMovimiento estado={m.estado} historico={m.historico} />
                    </span>
                  </td>
                  <td className="whitespace-nowrap text-xs max-sm:hidden">{m.cuenta}{m.cuenta_destino ? ` → ${m.cuenta_destino}` : ""}</td>
                  <td className="space-x-1 whitespace-nowrap max-sm:hidden">
                    <EstadoMovimiento estado={m.estado} historico={m.historico} />
                    {!m.tiene_soporte && m.estado !== "anulado" && <Insignia tono="suave">Sin soporte</Insignia>}
                  </td>
                  <td className={`der whitespace-nowrap max-sm:hidden ${m.tipo === "ingreso" ? "text-olivo" : m.tipo === "egreso" ? "text-tierra" : "text-gris"}`}>
                    {m.tipo === "egreso" ? "−" : m.tipo === "ingreso" ? "+" : ""}{pesos(m.valor)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablaContenedor>
      )}
    </>
  );
}
