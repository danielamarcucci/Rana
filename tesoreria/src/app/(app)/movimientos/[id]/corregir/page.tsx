import { notFound, redirect } from "next/navigation";
import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { datosFormMovimiento } from "@/lib/datos/formMovimiento";
import { valoresMovimiento } from "@/lib/datos/valoresMovimiento";
import { FormMovimiento } from "@/components/FormMovimiento";
import { accionGuardarMovimiento } from "@/app/acciones/movimientos";
import { codigoMov, Encabezado } from "@/components/ui";
import { hoyCO } from "@/lib/fechas";

export const metadata = { title: "Corregir movimiento" };

export default async function Corregir({ params }: { params: Promise<{ id: string }> }) {
  await exigirTesoreriaPagina();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const r = await leer(async (tx) => ({ datos: await datosFormMovimiento(tx), v: await valoresMovimiento(tx, Number(id)) }));
  if (!r.v) notFound();
  if (r.v.estado === "anulado") redirect(`/movimientos/${id}`);
  const { id: _omit, estado: _e, ...resto } = r.v;
  return (
    <>
      <Encabezado
        antetitulo="Corrección"
        titulo={`Corregir ${codigoMov(id)}`}
        descripcion="La corrección crea un movimiento nuevo con los datos correctos y anula el original con su motivo. Ambos quedan en el historial."
      />
      <FormMovimiento datos={r.datos} valores={{ ...resto, corrige_a: Number(id) }} accion={accionGuardarMovimiento} hoy={hoyCO()} />
    </>
  );
}
