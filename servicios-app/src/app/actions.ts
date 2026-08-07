"use server";

import { revalidatePath } from "next/cache";
import { marcarPago } from "@/lib/servicios";
import type { EstadoPago } from "@/lib/types";

export async function actualizarPago(formData: FormData) {
  const servicioId = Number(formData.get("servicioId"));
  const anio = Number(formData.get("anio"));
  const mes = Number(formData.get("mes"));
  const estado = formData.get("estado") as EstadoPago;
  const montoRaw = formData.get("monto");
  const monto =
    montoRaw && String(montoRaw).trim() !== "" ? Number(montoRaw) : undefined;

  if (!servicioId || !anio || !mes || (estado !== "pagado" && estado !== "pendiente")) {
    throw new Error("Datos inválidos para actualizar el pago");
  }

  await marcarPago(servicioId, anio, mes, estado, monto);

  revalidatePath("/");
  revalidatePath(`/servicio/${servicioId}`);
  revalidatePath("/calendario");
}
