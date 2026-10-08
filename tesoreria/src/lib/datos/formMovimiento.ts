import "server-only";
import { enSerie, type Tx } from "../db";
import type { DatosFormMovimiento } from "@/components/FormMovimiento";
import { categorias, configuracion, cuentas, fondos, umbralJunta } from "./catalogos";
import { compromisosAbiertos, MEDIOS_PAGO } from "./movimientos";

/** Opciones para el formulario de movimientos (solo tesorería). */
export async function datosFormMovimiento(tx: Tx): Promise<DatosFormMovimiento> {
  const [cs, cats, fs, conf, comp] = await enSerie([
    () => cuentas(tx, true), () => categorias(tx, undefined, true), () => fondos(tx, true), () => configuracion(tx), () => compromisosAbiertos(tx),
  ]);
  const miembros = await tx.query("SELECT id, nombre, codigo FROM miembros ORDER BY estado, nombre");
  const obligaciones = await tx.query(
    "SELECT id, descripcion, tercero, saldo, categoria_id, fondo_id FROM v_obligaciones_estado WHERE estado = 'vigente' AND saldo > 0 ORDER BY fecha_compromiso",
  );
  const egresos = await tx.query(
    `SELECT id, fecha_efectiva, concepto, valor FROM movimientos
      WHERE tipo = 'egreso' AND estado <> 'anulado' ORDER BY fecha_efectiva DESC, id DESC LIMIT 150`,
  );
  return {
    cuentas: cs.map((c) => ({ id: c.id, nombre: c.nombre })),
    categorias: cats.map((c) => ({ id: c.id, nombre: c.nombre, tipo: c.tipo })),
    fondos: fs.map((f) => ({ id: f.id, nombre: f.nombre })),
    miembros: miembros.rows,
    compromisos: comp,
    obligaciones: obligaciones.rows,
    egresos: egresos.rows,
    umbralJunta: umbralJunta(conf),
    mediosPago: MEDIOS_PAGO,
  };
}
