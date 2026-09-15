import { notFound } from "next/navigation";
import { historialActuacion, obtenerActuacion } from "@/lib/actuaciones";
import ActuacionDetalle from "./ActuacionDetalle";

export default async function DetalleActuacionPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const actuacion = await obtenerActuacion(Number(id));
  if (!actuacion) notFound();
  const historial = await historialActuacion(Number(id));

  return <ActuacionDetalle actuacion={actuacion} historial={historial} />;
}
