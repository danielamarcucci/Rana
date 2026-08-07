export type EstadoPago = "pagado" | "pendiente";

export interface Servicio {
  id: number;
  concepto: string;
  detalle: string;
  inmueble: string;
  tipo_cuenta: string | null;
  numero_cuenta: string | null;
  link_pago: string | null;
  orden: number;
  activo: number;
}

export interface Pago {
  id: number;
  servicio_id: number;
  anio: number;
  mes: number;
  estado: EstadoPago;
  fecha_pago: string | null;
  monto: number | null;
  updated_at: string;
}

export interface ServicioConEstado extends Servicio {
  estado_mes_actual: EstadoPago;
  ultimo_pago: string | null;
}
