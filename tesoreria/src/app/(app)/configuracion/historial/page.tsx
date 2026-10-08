import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { esFechaISO } from "@/lib/fechas";
import { Encabezado } from "@/components/ui";
import { Historial } from "@/components/Historial";

export const metadata = { title: "Historial de cambios" };

const TABLAS: Record<string, string> = {
  movimientos: "Movimientos", aplicaciones: "Distribuciones de pagos", compromisos: "Compromisos", adhesiones: "Aceptaciones",
  esquemas_aporte: "Esquemas de aportes", miembros: "Miembros", miembros_contacto: "Contactos", obligaciones: "Gastos comprometidos",
  fondos: "Fondos", fondo_asignaciones: "Reservas", presupuesto: "Presupuesto", presupuesto_anual: "Aprobación del presupuesto",
  cierres: "Cierres", saldos_iniciales: "Saldos iniciales", cuentas: "Cuentas", categorias: "Categorías", usuarios: "Cuentas de acceso",
  configuracion: "Parámetros", comprobantes: "Comprobantes", soportes: "Soportes",
};

export default async function HistorialCambios({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirTesoreriaPagina();
  const sp = await searchParams;
  const tabla = sp.tabla && TABLAS[sp.tabla] ? sp.tabla : null;
  const desde = esFechaISO(sp.desde) ? sp.desde : null;
  const hasta = esFechaISO(sp.hasta) ? sp.hasta : null;
  const filas = await leer(async (tx) => (await tx.query(
    `SELECT h.id, h.tabla, h.registro_id, h.accion, h.antes, h.despues, h.en, u.nombre AS usuario
       FROM historial h LEFT JOIN usuarios u ON u.id = h.usuario_id
      WHERE ($1::text IS NULL OR h.tabla = $1)
        AND ($2::date IS NULL OR h.en >= ($2::date::timestamp AT TIME ZONE 'America/Bogota'))
        AND ($3::date IS NULL OR h.en < (($3::date + 1)::timestamp AT TIME ZONE 'America/Bogota'))
      ORDER BY h.en DESC, h.id DESC LIMIT 300`, [tabla, desde, hasta])).rows);
  return (
    <>
      <Encabezado antetitulo="Configuración" titulo="Historial de cambios"
        descripcion="Registro automático e inalterable de creaciones, modificaciones, anulaciones y eliminaciones, con usuario y hora de Colombia." />
      <form className="mb-5 flex flex-wrap items-end gap-3" action="/configuracion/historial">
        <label className="campo"><span className="!text-xs">Registro</span>
          <select name="tabla" defaultValue={tabla ?? ""} className="entrada py-1.5 text-sm"><option value="">Todos</option>
            {Object.entries(TABLAS).map(([k, v]) => <option key={k} value={k}>{v}</option>)}</select></label>
        <label className="campo"><span className="!text-xs">Desde</span><input type="date" name="desde" defaultValue={desde ?? ""} className="entrada py-1.5 text-sm" /></label>
        <label className="campo"><span className="!text-xs">Hasta</span><input type="date" name="hasta" defaultValue={hasta ?? ""} className="entrada py-1.5 text-sm" /></label>
        <button className="btn-secundario py-1.5">Filtrar</button>
      </form>
      <p className="mb-3 text-sm text-gris">{filas.length} cambio(s){filas.length >= 300 ? " (los 300 más recientes)" : ""}.</p>
      <Historial entradas={filas} mostrarTabla />
    </>
  );
}
