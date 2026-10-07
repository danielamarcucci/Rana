import "server-only";
import type { Tx } from "../db";
import type { ValoresMovimiento } from "@/components/FormMovimiento";

/** Valores actuales de un movimiento para precargar edición o corrección (solo tesorería). */
export async function valoresMovimiento(tx: Tx, id: number): Promise<(ValoresMovimiento & { estado: string }) | null> {
  const { rows } = await tx.query(
    `SELECT id, tipo, fecha_efectiva, cuenta_id, cuenta_destino_id, miembro_id, tercero, concepto, categoria_id, valor,
            medio_pago, fondo_id, referencia_autorizacion, obligacion_id, reembolsa_a, excedente_destino, observaciones, estado
       FROM movimientos WHERE id = $1`,
    [id],
  );
  if (!rows[0]) return null;
  const apps = await tx.query("SELECT compromiso_id, valor FROM aplicaciones WHERE movimiento_id = $1", [id]);
  return { ...rows[0], aplicaciones: Object.fromEntries(apps.rows.map((a) => [a.compromiso_id, a.valor])) };
}
