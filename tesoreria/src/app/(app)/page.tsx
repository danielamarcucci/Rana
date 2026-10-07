import Link from "next/link";
import { leer } from "@/lib/sesion";
import { resumenFinanciero, serieMensual, ultimosMovimientos } from "@/lib/datos/finanzas";
import { resolverPeriodo } from "@/lib/periodo";
import { pesos } from "@/lib/dinero";
import { fecha, sumarMeses, inicioMes } from "@/lib/fechas";
import { FiltroPeriodo } from "@/components/FiltroPeriodo";
import { GraficoFlujos } from "@/components/GraficoFlujos";
import { Aviso, Cifra, Encabezado, EnlaceMov, EstadoMovimiento, Seccion, TablaContenedor, Vacio } from "@/components/ui";

export const metadata = { title: "Resumen" };

function Pregunta({ pregunta, children }: { pregunta: string; children: React.ReactNode }) {
  return (
    <div className="border-t border-linea py-4 sm:pr-6">
      <p className="mb-2 text-[13px] text-gris">{pregunta}</p>
      {children}
    </div>
  );
}

export default async function Resumen({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  const sp = await searchParams;
  const periodo = resolverPeriodo(sp);
  const desdeGrafico = periodo.clave === "todo" || periodo.clave === "mes" || periodo.clave === "mes-anterior"
    ? sumarMeses(inicioMes(periodo.hasta), -11)
    : periodo.desde;
  const { r, serie, ultimos, rol } = await leer(async (tx, s) => ({
    r: await resumenFinanciero(tx, periodo.desde, periodo.hasta),
    serie: await serieMensual(tx, desdeGrafico, periodo.hasta),
    ultimos: await ultimosMovimientos(tx, periodo.desde, periodo.hasta, 8),
    rol: s.rol,
  }));
  const constit = r.recaudo.constitucion;
  const mensual = r.recaudo.mensual;
  const porRecaudar = (constit?.pendiente ?? 0) + (mensual?.pendiente ?? 0);
  const pendSinFondo = r.pendientes.gastos_pendientes_sin_fondo;

  return (
    <>
      <Encabezado antetitulo={periodo.etiqueta} titulo="Resumen financiero" />
      <FiltroPeriodo periodo={periodo} />

      {sp["sin-permiso"] && <div className="mb-5"><Aviso tono="aviso">Esa sección es exclusiva de tesorería.</Aviso></div>}
      {r.cuentas.length === 0 ? (
        <div className="mb-6">
          <Aviso tono="aviso">
            Aún no hay cuentas registradas.{" "}
            {rol === "tesoreria" ? <Link href="/configuracion#cuentas">Registre las cuentas y su saldo inicial</Link> : "Tesorería debe registrar las cuentas y su saldo inicial."}
          </Aviso>
        </div>
      ) : r.cuentas_sin_saldo_inicial.length > 0 ? (
        <div className="mb-6">
          <Aviso tono="aviso">
            Sin saldo inicial confirmado: {r.cuentas_sin_saldo_inicial.join(", ")}. Mientras no se registre (con fecha y
            soporte), el saldo de esas cuentas solo refleja los movimientos verificados.
          </Aviso>
        </div>
      ) : null}

      <section aria-label="Respuestas principales" className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
        <Pregunta pregunta="¿Cuánto dinero hemos recibido?">
          <Cifra etiqueta="Ingresos verificados" valor={r.flujos.ingresos} tono="ingreso" grande
            nota={`${fecha(periodo.desde)} – ${fecha(periodo.hasta)}. No incluye traslados ni reembolsos.`} />
        </Pregunta>
        <Pregunta pregunta="¿Cuánto hemos gastado?">
          <Cifra etiqueta="Egresos verificados" valor={r.flujos.egresos_netos} tono="egreso" grande
            nota={r.flujos.reembolsos ? `Netos de reembolsos por ${pesos(r.flujos.reembolsos)}.` : "Mismo periodo."} />
        </Pregunta>
        <Pregunta pregunta="¿Cuál es el saldo?">
          <Cifra etiqueta="Saldo de caja y bancos" valor={r.caja} grande nota={`Al ${fecha(periodo.hasta)}, solo con movimientos verificados.`} />
        </Pregunta>
        <Pregunta pregunta="¿Cuánto falta por recaudar de lo acordado?">
          <Cifra etiqueta="Aportes comprometidos pendientes" valor={porRecaudar} tono="suave" grande
            nota="Es dinero comprometido, todavía no recibido." />
        </Pregunta>
        <Pregunta pregunta="¿Qué gastos están pendientes?">
          <Cifra etiqueta="Gastos comprometidos por pagar" valor={r.pendientes.gastos_pendientes} tono="aviso" grande
            nota={`${r.pendientes.n_gastos_pendientes} gasto(s) pendiente(s)${r.pendientes.gastos_vencidos ? `; ${pesos(r.pendientes.gastos_vencidos)} con fecha vencida` : ""}.`} />
        </Pregunta>
        <Pregunta pregunta="¿Cuánto queda disponible?">
          <Cifra etiqueta="Disponible estimado" valor={r.disponible} grande tono={r.disponible < 0 ? "egreso" : "normal"}
            nota="Después de gastos pendientes y reservas, sin descontar dos veces." />
        </Pregunta>
      </section>

      {r.por_verificar.n > 0 && (
        <div className="mt-5">
          <Aviso>
            <strong>{r.por_verificar.n} movimiento(s) por verificar</strong> — ingresos {pesos(r.por_verificar.ingresos)} · egresos{" "}
            {pesos(r.por_verificar.egresos)}. No afectan los saldos hasta que tesorería los verifique.{" "}
            <Link href="/movimientos?estado=pendiente">Ver registros</Link>
          </Aviso>
        </div>
      )}

      <div className="mt-4 grid gap-x-10 lg:grid-cols-[1.4fr_1fr]">
        <Seccion titulo="Ingresos y egresos por mes" nota="Solo movimientos verificados.">
          <GraficoFlujos datos={serie} />
        </Seccion>

        <Seccion titulo="Cómo se calcula el disponible">
          <table className="tabla">
            <tbody>
              <tr><td>Saldo inicial confirmado</td><td className="der text-gris">{pesos(r.saldo_inicial_confirmado)}</td></tr>
              <tr><td className="font-semibold">Saldo de caja y bancos</td><td className="der font-semibold">{pesos(r.caja)}</td></tr>
              <tr>
                <td>
                  − Reservas y fondos con destinación específica
                  <span className="block text-xs text-gris">Incluye los gastos pendientes que se pagarán con esos fondos.</span>
                </td>
                <td className="der">{pesos(r.retenido)}</td>
              </tr>
              <tr><td>− Gastos pendientes sin fondo asignado</td><td className="der">{pesos(pendSinFondo)}</td></tr>
            </tbody>
            <tfoot><tr><td>= Disponible estimado</td><td className="der">{pesos(r.disponible)}</td></tr></tfoot>
          </table>
          <p className="mt-2 text-xs text-gris">
            Para cada fondo se retiene el mayor valor entre su saldo y lo pendiente con cargo a él; así una obligación ya
            cubierta por una reserva no se descuenta dos veces. Los aportes comprometidos no se suman: aún no son dinero.
          </p>
        </Seccion>
      </div>

      <div className="grid gap-x-10 lg:grid-cols-2">
        <Seccion titulo="Recibido frente a comprometido" acciones={<Link href="/aportes">Ver aportes</Link>}>
          <table className="tabla">
            <thead><tr><th>Aportes</th><th className="der">Comprometido</th><th className="der">Recibido</th><th className="der">Pendiente</th></tr></thead>
            <tbody>
              <tr>
                <td>Constitución</td>
                <td className="der">{pesos(constit?.comprometido)}</td>
                <td className="der">{pesos(constit?.recaudado)}</td>
                <td className="der">{pesos(constit?.pendiente)}</td>
              </tr>
              <tr>
                <td>Mensual de sostenimiento<span className="block text-xs text-gris">Meses generados</span></td>
                <td className="der">{pesos(mensual?.comprometido)}</td>
                <td className="der">{pesos(mensual?.recaudado)}</td>
                <td className="der">{pesos(mensual?.pendiente)}</td>
              </tr>
            </tbody>
          </table>
          <p className="mt-2 text-xs text-gris">
            Solo esquemas aprobados con referencia a su acuerdo. Recibido = abonos verificados (incluye los anteriores al
            saldo inicial, que ya están dentro de ese saldo).
          </p>
        </Seccion>

        <Seccion titulo="Cuentas">
          {r.cuentas.length === 0 ? <Vacio>Sin cuentas registradas.</Vacio> : (
            <table className="tabla">
              <thead><tr><th>Cuenta</th><th>Saldo inicial</th><th className="der">Saldo</th></tr></thead>
              <tbody>
                {r.cuentas.filter((c) => c.activa || c.saldo !== 0).map((c) => (
                  <tr key={c.cuenta_id}>
                    <td>{c.nombre}</td>
                    <td className="text-xs text-gris">{c.fecha_corte ? `${pesos(c.saldo_inicial)} al ${fecha(c.fecha_corte)}` : "Sin confirmar"}</td>
                    <td className="der">{pesos(c.saldo)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {r.fondos.length > 0 && (
            <table className="tabla mt-4">
              <thead><tr><th>Reserva o fondo</th><th className="der">Saldo</th><th className="der">Pendiente</th></tr></thead>
              <tbody>
                {r.fondos.map((f) => (
                  <tr key={f.id}>
                    <td>{f.nombre} <span className="text-xs text-gris">({f.tipo === "reserva" ? "reserva" : "destinación específica"})</span></td>
                    <td className="der">{pesos(f.saldo)}</td>
                    <td className="der">{pesos(f.pendiente)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </Seccion>
      </div>

      <Seccion titulo="Últimos movimientos" acciones={<Link href="/movimientos">Ver todos</Link>}>
        {ultimos.length === 0 ? <Vacio>No hay movimientos en este periodo.</Vacio> : (
          <TablaContenedor>
            <table className="tabla">
              <thead><tr><th>Fecha</th><th className="max-sm:hidden">Movimiento</th><th>Concepto</th><th className="max-sm:hidden">Estado</th><th className="der">Valor</th></tr></thead>
              <tbody>
                {ultimos.map((m) => (
                  <tr key={m.id}>
                    <td className="num whitespace-nowrap">{fecha(m.fecha_efectiva)}</td>
                    <td className="whitespace-nowrap max-sm:hidden"><EnlaceMov id={m.id} /></td>
                    <td>
                      {m.concepto}
                      <span className="block text-xs text-gris">
                        {m.tipo === "traslado" ? `Traslado ${m.cuenta} → ${m.cuenta_destino}` : [m.categoria !== m.concepto ? m.categoria : null, m.tercero, m.cuenta].filter(Boolean).join(" · ")}
                        {m.reembolsa_a ? " · Reembolso" : ""}
                      </span>
                    </td>
                    <td className="max-sm:hidden"><EstadoMovimiento estado={m.estado} historico={m.historico} /></td>
                    <td className={`der whitespace-nowrap ${m.tipo === "ingreso" ? "text-olivo" : m.tipo === "egreso" ? "text-tierra" : "text-gris"}`}>
                      {m.tipo === "egreso" ? "−" : m.tipo === "ingreso" ? "+" : ""}{pesos(m.valor)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TablaContenedor>
        )}
      </Seccion>
    </>
  );
}
