import Link from "next/link";
import { notFound } from "next/navigation";
import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { compromisosAbiertos } from "@/lib/datos/movimientos";
import { valoresMovimiento } from "@/lib/datos/valoresMovimiento";
import { FormDistribuir } from "@/components/FormDistribuir";
import { accionDistribuir } from "@/app/acciones/movimientos";
import { Aviso, codigoMov, Encabezado } from "@/components/ui";

export const metadata = { title: "Distribuir ingreso" };

export default async function Distribuir({ params }: { params: Promise<{ id: string }> }) {
  await exigirTesoreriaPagina();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const r = await leer(async (tx) => {
    const v = await valoresMovimiento(tx, Number(id));
    if (!v || !v.miembro_id) return null;
    const abiertos = await compromisosAbiertos(tx, v.miembro_id);
    // Compromisos ya abonados por este ingreso (aunque estén completos) también se muestran.
    const ya = Object.keys(v.aplicaciones ?? {}).map(Number).filter((cid) => !abiertos.some((a) => a.id === cid));
    const extra = ya.length
      ? (await tx.query(
          `SELECT c.id, c.miembro_id, c.tipo, c.destino, c.periodo, e.nombre AS esquema, c.fecha_acordada, c.monto, 0::bigint AS disponible
             FROM compromisos c JOIN esquemas_aporte e ON e.id = c.esquema_id WHERE c.id = ANY($1)`, [ya])).rows
      : [];
    const nombre = (await tx.query("SELECT nombre FROM miembros WHERE id = $1", [v.miembro_id])).rows[0]?.nombre;
    const comps = [...abiertos, ...extra]
      .map((c) => ({ ...c, disponible: c.disponible + (v.aplicaciones?.[c.id] ?? 0) }))
      .sort((a, b) => a.fecha_acordada.localeCompare(b.fecha_acordada));
    return { v, comps, nombre };
  });
  if (!r || r.v.tipo !== "ingreso" || r.v.reembolsa_a) notFound();
  return (
    <>
      <Encabezado antetitulo={`Ingreso de ${r.nombre}`} titulo={`Distribuir ${codigoMov(id)}`}
        descripcion="Asigne el valor recibido a los compromisos del aportante (por ejemplo, para aplicar un saldo a favor a meses nuevos). El ingreso no se duplica: solo cambia a qué compromisos corresponde." />
      {r.v.estado === "anulado" ? <Aviso tono="alerta">El ingreso está anulado.</Aviso> : (
        <FormDistribuir id={Number(id)} valor={r.v.valor!} compromisos={r.comps} actuales={r.v.aplicaciones ?? {}}
          excedenteActual={r.v.excedente_destino ?? null} verificado={r.v.estado === "verificado"} accion={accionDistribuir} />
      )}
      <p className="mt-6"><Link href={`/movimientos/${id}`}>Volver al movimiento</Link></p>
    </>
  );
}
