"use server";

import { revalidatePath } from "next/cache";
import { escribir } from "@/lib/sesion";
import { ErrorUsuario, mensajeError } from "@/lib/db";
import { dinero, entero, mesCampo, txt } from "@/lib/formulario";
import { saldosCuentas } from "@/lib/datos/finanzas";
import { finMes, hoyCO } from "@/lib/fechas";
import type { EstadoAccion } from "@/lib/tipos";

/** Cierra un mes para una cuenta: el saldo calculado lo obtiene el servidor, no el formulario. */
export async function accionCerrarMes(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const periodo = mesCampo(d, "periodo", { requerido: true, nombre: "el mes" })!;
    const cuenta = entero(d, "cuenta_id", { requerido: true, nombre: "la cuenta" })!;
    const observado = dinero(d, "saldo_observado", { requerido: true, nombre: "El saldo observado", permitirCero: true, permitirNegativo: true })!;
    const explicacion = txt(d, "explicacion", 1000);
    if (finMes(periodo) >= hoyCO()) throw new ErrorUsuario("Solo se cierran meses terminados.");
    const res = await escribir(async (tx) => {
      const s = (await saldosCuentas(tx, finMes(periodo))).find((c) => c.cuenta_id === cuenta);
      if (!s) throw new ErrorUsuario("Cuenta no encontrada.");
      if (observado !== s.saldo && !explicacion) throw new ErrorUsuario("Hay diferencia entre el saldo calculado y el observado: registre la explicación.");
      const { rows: c } = await tx.query(
        `SELECT count(*) FILTER (WHERE estado = 'pendiente')::int AS pend,
                count(*) FILTER (WHERE estado = 'verificado' AND NOT tiene_soporte)::int AS sin
           FROM v_movimientos_consulta WHERE fecha_efectiva BETWEEN $1 AND $2 AND (cuenta_id = $3 OR cuenta_destino_id = $3)`,
        [periodo, finMes(periodo), cuenta],
      );
      if (c[0].pend > 0) throw new ErrorUsuario(`Hay ${c[0].pend} movimiento(s) por verificar en esta cuenta y mes. Verifíquelos o anúlelos antes de cerrar.`);
      await tx.query(
        `INSERT INTO cierres (periodo, cuenta_id, saldo_calculado, saldo_observado, explicacion, pendientes_verificar, sin_soporte)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (periodo, cuenta_id) DO UPDATE SET saldo_calculado = $3, saldo_observado = $4, explicacion = $5,
           pendientes_verificar = $6, sin_soporte = $7, estado = 'cerrado'
         WHERE cierres.estado = 'reabierto' RETURNING id`,
        [periodo, cuenta, s.saldo, observado, explicacion || null, c[0].pend, c[0].sin],
      ).then((r) => { if (!r.rowCount) throw new ErrorUsuario("Ese mes ya está cerrado para esta cuenta."); });
      return { dif: observado - s.saldo, sin: c[0].sin };
    });
    revalidatePath("/informes");
    return { ok: `Mes cerrado${res.dif ? " con diferencia explicada" : " sin diferencias"}.${res.sin ? ` Atención: ${res.sin} movimiento(s) verificados sin soporte.` : ""}` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function accionReabrirMes(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const motivo = txt(d, "motivo", 500);
    if (motivo.length < 5) throw new ErrorUsuario("Explique por qué se reabre el mes.");
    await escribir((tx) => tx.query("UPDATE cierres SET estado = 'reabierto', motivo_reapertura = $2 WHERE id = $1 AND estado = 'cerrado'", [id, motivo]));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/informes");
  return { ok: "Mes reabierto. Queda constancia en el historial." };
}
