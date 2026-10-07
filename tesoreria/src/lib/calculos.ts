// Cálculos puros (sin base de datos), probados en tests/calculos.test.ts.

export type FondoSaldo = { fondo_id: number; saldo: number; pendiente: number };

/**
 * Disponible estimado = caja − recursos retenidos − gastos pendientes sin fondo.
 *
 * Para cada fondo (reserva o proyecto) se retiene el MAYOR entre su saldo y lo
 * que tiene pendiente por pagar con cargo a él: un gasto pendiente que se
 * pagará con una reserva ya está cubierto por esa reserva y no se descuenta
 * otra vez. Si los pendientes de un fondo superan su saldo, la diferencia
 * también sale de los recursos libres.
 */
export function disponibleEstimado(caja: number, fondos: FondoSaldo[], pendienteSinFondo: number) {
  let retenido = 0;
  for (const f of fondos) retenido += Math.max(f.saldo, f.pendiente, 0);
  return { retenido, disponible: caja - retenido - pendienteSinFondo };
}

export type Abierto = { id: number; saldo: number };

/**
 * Distribuye un valor recibido entre compromisos abiertos en el orden dado
 * (normalmente de la fecha acordada más antigua a la más reciente). Nunca
 * asigna más que el saldo de cada compromiso ni más que el valor recibido.
 */
export function distribuir(valor: number, abiertos: Abierto[]) {
  const asignaciones: { compromiso_id: number; valor: number }[] = [];
  let resto = valor;
  for (const c of abiertos) {
    if (resto <= 0) break;
    const v = Math.min(resto, c.saldo);
    if (v > 0) {
      asignaciones.push({ compromiso_id: c.id, valor: v });
      resto -= v;
    }
  }
  return { asignaciones, excedente: resto };
}

export type Situacion = "pendiente" | "parcial" | "completo" | "vencido" | "anulado";

export const ETIQUETA_SITUACION: Record<Situacion, string> = {
  pendiente: "Pendiente",
  parcial: "Parcial",
  completo: "Completo",
  vencido: "Pendiente con fecha vencida",
  anulado: "Anulado",
};
