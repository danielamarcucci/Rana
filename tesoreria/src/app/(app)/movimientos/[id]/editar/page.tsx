import { notFound, redirect } from "next/navigation";
import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { datosFormMovimiento } from "@/lib/datos/formMovimiento";
import { valoresMovimiento } from "@/lib/datos/valoresMovimiento";
import { FormMovimiento } from "@/components/FormMovimiento";
import { accionGuardarMovimiento } from "@/app/acciones/movimientos";
import { codigoMov, Encabezado } from "@/components/ui";
import { hoyCO } from "@/lib/fechas";

export const metadata = { title: "Editar movimiento" };

export default async function Editar({ params }: { params: Promise<{ id: string }> }) {
  await exigirTesoreriaPagina();
  const { id } = await params;
  if (!/^\d+$/.test(id)) notFound();
  const r = await leer(async (tx) => ({ datos: await datosFormMovimiento(tx), v: await valoresMovimiento(tx, Number(id)) }));
  if (!r.v) notFound();
  if (r.v.estado !== "pendiente") redirect(`/movimientos/${id}/corregir`);
  return (
    <>
      <Encabezado antetitulo="Editar registro por verificar" titulo={codigoMov(id)} />
      <FormMovimiento datos={r.datos} valores={r.v} accion={accionGuardarMovimiento} hoy={hoyCO()} />
    </>
  );
}
