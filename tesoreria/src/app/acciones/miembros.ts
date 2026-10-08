"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { escribir } from "@/lib/sesion";
import { ErrorUsuario, mensajeError } from "@/lib/db";
import { entero, fechaCampo, opcion, txt, txtONull } from "@/lib/formulario";
import type { EstadoAccion } from "@/lib/tipos";

export async function accionGuardarMiembro(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  let id: number;
  try {
    const existente = entero(d, "id");
    const vinculo = opcion(d, "vinculo", ["asociado", "aportante", "otro"] as const, { requerido: true, nombre: "el vínculo" })!;
    const estado = opcion(d, "estado", ["activo", "retirado"] as const, { requerido: true, nombre: "el estado" })!;
    const campos = {
      nombre: txt(d, "nombre", 200),
      tipo_persona: opcion(d, "tipo_persona", ["natural", "organizacion"] as const, { requerido: true, nombre: "el tipo de persona" })!,
      vinculo,
      clase_asociado: vinculo === "asociado" ? opcion(d, "clase_asociado", ["activo", "honorario"] as const) : null,
      estado,
      fecha_vinculacion: fechaCampo(d, "fecha_vinculacion", { nombre: "la fecha de vinculación" }),
      fecha_retiro: estado === "retirado" ? fechaCampo(d, "fecha_retiro", { nombre: "la fecha de retiro" }) : null,
      observaciones: txtONull(d, "observaciones", 1000),
    };
    if (campos.nombre.length < 2) throw new ErrorUsuario("Escriba el nombre de la persona u organización.");
    const contacto = {
      telefono: txtONull(d, "telefono", 60),
      correo: txtONull(d, "correo", 120),
      direccion: txtONull(d, "direccion", 200),
      otro: txtONull(d, "otro_contacto", 300),
    };
    if (contacto.correo && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contacto.correo)) throw new ErrorUsuario("El correo no parece válido.");
    id = await escribir(async (tx) => {
      let mid: number;
      if (existente) {
        const k = Object.keys(campos);
        await tx.query(`UPDATE miembros SET ${k.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1`, [existente, ...Object.values(campos)]);
        mid = existente;
      } else {
        const k = Object.keys(campos);
        const { rows } = await tx.query(
          `INSERT INTO miembros (${k.join(", ")}, creado_por) VALUES (${k.map((_, i) => `$${i + 1}`).join(", ")}, usuario_actual()) RETURNING id`,
          Object.values(campos),
        );
        mid = rows[0].id;
      }
      if (Object.values(contacto).some(Boolean)) {
        await tx.query(
          `INSERT INTO miembros_contacto (miembro_id, telefono, correo, direccion, otro) VALUES ($1, $2, $3, $4, $5)
           ON CONFLICT (miembro_id) DO UPDATE SET telefono = $2, correo = $3, direccion = $4, otro = $5, actualizado_en = now()`,
          [mid, contacto.telefono, contacto.correo, contacto.direccion, contacto.otro],
        );
      } else {
        await tx.query("DELETE FROM miembros_contacto WHERE miembro_id = $1", [mid]);
      }
      return mid;
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  redirect(`/miembros/${id}?guardado=1`);
}
