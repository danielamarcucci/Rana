import { notFound } from "next/navigation";
import { cache } from "react";
import { obtenerConfiguracion } from "./configuracion";
import { obtenerDebateCompleto } from "./debates";

// Carga compartida por el layout y las páginas de un debate (una sola consulta por petición).
export const cargarDebate = cache(async (idTexto: string) => {
  const id = Number(idTexto);
  if (!Number.isInteger(id) || id <= 0) notFound();
  const [d, cfg] = await Promise.all([obtenerDebateCompleto(id), obtenerConfiguracion()]);
  if (!d) notFound();
  return { ...d, cfg };
});
