import { obtenerSesion } from "@/lib/sesion";
import { enSerie, conRol } from "@/lib/db";
import { csv, celdaPesos as p, respuestaCsv } from "@/lib/csv";
import { listarMovimientos } from "@/lib/datos/movimientos";
import { compromisos, recaudo } from "@/lib/datos/aportes";
import { informeMensual } from "@/lib/datos/informe";
import { ejecucion } from "@/lib/datos/presupuesto";
import { categorias } from "@/lib/datos/catalogos";
import { esFechaISO, hoyCO, inicioMes, sumarMeses } from "@/lib/fechas";

export const dynamic = "force-dynamic";

// Conjuntos exclusivos de tesorería (detalle individual o datos personales).
const SOLO_TESORERIA = new Set(["compromisos", "miembros", "respaldo"]);

export async function GET(req: Request) {
  const s = await obtenerSesion();
  if (!s) return Response.json({ error: "Sesión requerida." }, { status: 401 });
  const url = new URL(req.url);
  const conjunto = url.searchParams.get("conjunto") ?? "";
  if (SOLO_TESORERIA.has(conjunto) && s.rol !== "tesoreria") {
    return Response.json({ error: "Este conjunto de datos es exclusivo de tesorería." }, { status: 403 });
  }
  const desde = url.searchParams.get("desde");
  const hasta = url.searchParams.get("hasta");
  const hoy = hoyCO();
  const ctx = { usuarioId: s.usuarioId, sesionId: s.sesionId };

  return conRol(s.rol, ctx, async (tx) => {
    switch (conjunto) {
      case "movimientos": {
        const filas = await listarMovimientos(tx, s.rol, {
          desde: esFechaISO(desde) ? desde : undefined, hasta: esFechaISO(hasta) ? hasta : undefined, limite: 1000000,
        });
        const tes = s.rol === "tesoreria";
        return respuestaCsv(`movimientos-${hoy}.csv`, csv(
          ["numero", "fecha_efectiva", "tipo", "estado", "incluido_en_saldo_inicial", "cuenta", "cuenta_destino", "categoria", "concepto", ...(tes ? ["miembro"] : []), "tercero", "fondo", "reembolso_de", "valor", "con_soporte"],
          filas.map((m) => [
            `MOV-${String(m.id).padStart(5, "0")}`, m.fecha_efectiva, m.tipo, m.estado, m.historico, m.cuenta, m.cuenta_destino, m.categoria,
            m.concepto, ...(tes ? [m.miembro] : []), m.tercero, m.fondo, m.reembolsa_a ? `MOV-${String(m.reembolsa_a).padStart(5, "0")}` : "",
            p(m.valor), m.tiene_soporte,
          ]),
        ));
      }
      case "compromisos": {
        const filas = await compromisos(tx, { incluirAnulados: true });
        return respuestaCsv(`compromisos-${hoy}.csv`, csv(
          ["id", "aportante", "codigo", "esquema", "tipo", "destino", "periodo", "fecha_acordada", "acordado", "abonado_verificado", "por_verificar", "saldo", "situacion", "estado"],
          filas.map((c) => [c.id, c.miembro, c.codigo, c.esquema, c.tipo, c.destino, c.periodo?.slice(0, 7) ?? "", c.fecha_acordada, p(c.monto), p(c.abonado), p(c.por_verificar), p(c.saldo), c.situacion, c.estado]),
        ));
      }
      case "recaudo": {
        const filas = await recaudo(tx);
        return respuestaCsv(`recaudo-agregado-${hoy}.csv`, csv(
          ["esquema_id", "destino", "periodo", "compromisos", "comprometido", "recaudado", "por_verificar", "pendiente", "completos", "parciales", "pendientes", "con_fecha_vencida"],
          filas.map((r) => [r.esquema_id, r.destino, r.periodo?.slice(0, 7) ?? "", r.compromisos, p(r.comprometido), p(r.recaudado), p(r.por_verificar), p(r.pendiente), r.n_completos, r.n_parciales, r.n_pendientes, r.n_vencidos]),
        ));
      }
      case "miembros": {
        const { rows } = await tx.query(
          `SELECT m.codigo, m.nombre, m.tipo_persona, m.vinculo, m.clase_asociado, m.estado, m.fecha_vinculacion, m.fecha_retiro,
                  c.telefono, c.correo, c.direccion, c.otro, m.observaciones
             FROM miembros m LEFT JOIN miembros_contacto c ON c.miembro_id = m.id ORDER BY m.nombre`,
        );
        return respuestaCsv(`miembros-${hoy}.csv`, csv(Object.keys(rows[0] ?? { codigo: 1 }), rows.map((r) => Object.values(r))));
      }
      case "presupuesto": {
        const anio = Number(url.searchParams.get("anio")) || Number(hoy.slice(0, 4));
        const [celdas, cats] = await enSerie([() => ejecucion(tx, anio), () => categorias(tx, "egreso")]);
        return respuestaCsv(`presupuesto-${anio}.csv`, csv(
          ["anio", "mes", "categoria", "presupuesto", "ejecutado", "diferencia"],
          celdas.sort((a, b) => a.mes - b.mes).map((c) => [anio, c.mes, cats.find((x) => x.id === c.categoria_id)?.nombre ?? c.categoria_id, p(c.presupuesto), p(c.ejecutado), p(c.presupuesto - c.ejecutado)]),
        ));
      }
      case "informe": {
        const m = url.searchParams.get("mes");
        const periodo = /^\d{4}-\d{2}$/.test(m ?? "") ? `${m}-01` : sumarMeses(inicioMes(hoy), -1);
        const inf = await informeMensual(tx, s.rol, periodo, false);
        const f: unknown[][] = [
          ["Saldo", "Saldo inicial", p(inf.saldo_inicial)],
          ["Saldo", "Ingresos verificados", p(inf.flujos.ingresos)],
          ["Saldo", "Egresos verificados", p(inf.flujos.egresos)],
          ["Saldo", "Reembolsos", p(inf.flujos.reembolsos)],
          ["Saldo", "Saldo final", p(inf.saldo_final)],
          ...inf.ingresos_concepto.map((r) => ["Ingresos por concepto", r.concepto, p(r.valor)]),
          ...inf.egresos_categoria.map((r) => ["Egresos netos por categoría", r.categoria, p(r.neto)]),
          ...inf.constitucion.flatMap((c) => [
            ["Recaudo constitución (gastos)", `${c.esquema}: comprometido / recaudado / pendiente`, `${p(c.gastos.comprometido)} / ${p(c.gastos.recaudado)} / ${p(c.gastos.pendiente)}`],
            ["Recaudo constitución (patrimonio)", `${c.esquema}: comprometido / recaudado / pendiente`, `${p(c.patrimonio.comprometido)} / ${p(c.patrimonio.recaudado)} / ${p(c.patrimonio.pendiente)}`],
          ]),
          ["Sostenimiento del mes", "Comprometido", p(inf.sostenimiento_mes.comprometido)],
          ["Sostenimiento del mes", "Recaudado", p(inf.sostenimiento_mes.recaudado)],
          ...inf.pendientes_aportes.map((x) => ["Compromisos pendientes", x.tipo, p(x.pendiente)]),
          ["Disponibilidad", "Gastos por pagar", p(inf.gastos_por_pagar)],
          ["Disponibilidad", "Reservas y destinación específica (retenido)", p(inf.retenido)],
          ["Disponibilidad", "Disponible estimado", p(inf.disponible)],
        ];
        return respuestaCsv(`informe-${periodo.slice(0, 7)}.csv`, csv(["seccion", "concepto", "valor"], f));
      }
      case "respaldo": {
        const tablas = ["configuracion", "cuentas", "categorias", "fondos", "miembros", "miembros_contacto", "saldos_iniciales", "esquemas_aporte",
          "adhesiones", "compromisos", "obligaciones", "movimientos", "aplicaciones", "fondo_asignaciones", "presupuesto_anual", "presupuesto", "cierres"];
        const datos: Record<string, unknown[]> = {};
        for (const t of tablas) datos[t] = (await tx.query(`SELECT * FROM ${t} ORDER BY 1`)).rows;
        datos.comprobantes = (await tx.query("SELECT id, nombre_archivo, tipo_mime, tamano, sha256, datos_personales, subido_en FROM comprobantes")).rows;
        datos.soportes = (await tx.query("SELECT * FROM soportes ORDER BY id")).rows;
        return new Response(JSON.stringify({ generado: new Date().toISOString(), nota: "Valores monetarios en centavos. Sin el contenido de los comprobantes.", datos }, null, 1), {
          headers: { "Content-Type": "application/json; charset=utf-8", "Content-Disposition": `attachment; filename="respaldo-tesoreria-${hoy}.json"`, "Cache-Control": "private, no-store" },
        });
      }
      default:
        return Response.json({ error: "Conjunto desconocido." }, { status: 400 });
    }
  });
}
