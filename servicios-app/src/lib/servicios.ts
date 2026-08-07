import { db, nowIso } from "./db";
import type { EstadoPago, Pago, Servicio, ServicioConEstado } from "./types";

export async function listarServiciosConEstado(
  anio: number,
  mes: number
): Promise<ServicioConEstado[]> {
  const servicios = await db.all<Servicio>(
    `SELECT * FROM servicios WHERE activo = 1 ORDER BY orden ASC`
  );
  const pagos = await db.all<Pago>(
    `SELECT * FROM pagos WHERE anio = ? AND mes = ?`,
    [anio, mes]
  );
  const pagoPorServicio = new Map(pagos.map((p) => [p.servicio_id, p]));

  const ultimos = await db.all<{ servicio_id: number; fecha_pago: string }>(
    `SELECT servicio_id, MAX(fecha_pago) as fecha_pago
     FROM pagos WHERE estado = 'pagado' AND fecha_pago IS NOT NULL
     GROUP BY servicio_id`
  );
  const ultimoPorServicio = new Map(ultimos.map((u) => [u.servicio_id, u.fecha_pago]));

  return servicios.map((s) => {
    const pago = pagoPorServicio.get(s.id);
    return {
      ...s,
      estado_mes_actual: pago?.estado ?? "pendiente",
      ultimo_pago: ultimoPorServicio.get(s.id) ?? null,
    };
  });
}

export async function obtenerServicio(id: number): Promise<Servicio | undefined> {
  return db.get<Servicio>(`SELECT * FROM servicios WHERE id = ?`, [id]);
}

export async function obtenerEstadoMes(
  servicioId: number,
  anio: number,
  mes: number
): Promise<Pago | undefined> {
  return db.get<Pago>(
    `SELECT * FROM pagos WHERE servicio_id = ? AND anio = ? AND mes = ?`,
    [servicioId, anio, mes]
  );
}

export async function listarPagosAnio(
  servicioId: number,
  anio: number
): Promise<Map<number, Pago>> {
  const filas = await db.all<Pago>(
    `SELECT * FROM pagos WHERE servicio_id = ? AND anio = ?`,
    [servicioId, anio]
  );
  return new Map(filas.map((p) => [p.mes, p]));
}

export async function marcarPago(
  servicioId: number,
  anio: number,
  mes: number,
  estado: EstadoPago,
  monto?: number | null
) {
  const existente = await obtenerEstadoMes(servicioId, anio, mes);
  const fechaPago = estado === "pagado" ? nowIso() : null;

  if (existente) {
    await db.run(
      `UPDATE pagos SET estado = ?, fecha_pago = ?, monto = ?, updated_at = ? WHERE id = ?`,
      [estado, fechaPago, monto ?? existente.monto, nowIso(), existente.id]
    );
  } else {
    await db.run(
      `INSERT INTO pagos (servicio_id, anio, mes, estado, fecha_pago, monto, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [servicioId, anio, mes, estado, fechaPago, monto ?? null, nowIso()]
    );
  }
}

export async function resumenMes(anio: number, mes: number) {
  const servicios = await listarServiciosConEstado(anio, mes);
  const pagados = servicios.filter((s) => s.estado_mes_actual === "pagado").length;
  return { total: servicios.length, pagados, pendientes: servicios.length - pagados };
}

export function agruparPorInmueble(servicios: ServicioConEstado[]) {
  const grupos = new Map<string, ServicioConEstado[]>();
  for (const s of servicios) {
    const lista = grupos.get(s.inmueble) ?? [];
    lista.push(s);
    grupos.set(s.inmueble, lista);
  }
  return Array.from(grupos.entries());
}
