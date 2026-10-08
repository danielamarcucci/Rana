"use server";

import { revalidatePath } from "next/cache";
import { escribir } from "@/lib/sesion";
import { ErrorUsuario, mensajeError } from "@/lib/db";
import { archivosDe, guardarComprobante } from "@/lib/comprobantes";
import { dinero, entero, fechaCampo, opcion, txt, txtONull } from "@/lib/formulario";
import { leerPesos } from "@/lib/dinero";
import type { EstadoAccion } from "@/lib/tipos";

export async function accionPresupuestoAnual(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const anio = entero(d, "anio", { requerido: true })!;
    const estado = opcion(d, "estado", ["borrador", "aprobado"] as const, { requerido: true })!;
    const ref = txtONull(d, "referencia_acta", 300);
    const f = fechaCampo(d, "fecha_aprobacion", { nombre: "la fecha de aprobación" });
    if (estado === "aprobado" && (!ref || !f)) throw new ErrorUsuario("Para registrarlo como aprobado indique el acta de la Asamblea y su fecha (art. 26 c).");
    await escribir((tx) => tx.query(
      `INSERT INTO presupuesto_anual (anio, estado, referencia_acta, fecha_aprobacion, registrado_por) VALUES ($1, $2, $3, $4, usuario_actual())
       ON CONFLICT (anio) DO UPDATE SET estado = $2, referencia_acta = $3, fecha_aprobacion = $4, registrado_por = usuario_actual(), actualizado_en = now()`,
      [anio, estado, ref, f],
    ));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/presupuesto");
  return { ok: "Estado del presupuesto guardado." };
}

/** Guarda la grilla de presupuesto: campos m_<categoria>_<mes>. */
export async function accionGuardarPresupuesto(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const anio = entero(d, "anio", { requerido: true })!;
    const celdas: { cat: number; mes: number; monto: number }[] = [];
    for (const [k, v] of d.entries()) {
      const m = /^m_(\d+)_(\d{1,2})$/.exec(k);
      if (!m || typeof v !== "string") continue;
      const mes = Number(m[2]);
      if (mes < 1 || mes > 12) continue;
      const t = v.trim();
      const monto = t ? leerPesos(t) : 0;
      if (monto === null || monto < 0) throw new ErrorUsuario(`Valor no válido: "${t}".`);
      celdas.push({ cat: Number(m[1]), mes, monto });
    }
    // "Igual todos los meses": reemplaza los 12 meses de la categoría.
    for (const [k, v] of d.entries()) {
      const m = /^todos_(\d+)$/.exec(k);
      if (!m || typeof v !== "string" || !v.trim()) continue;
      const monto = leerPesos(v.trim());
      if (monto === null || monto < 0) throw new ErrorUsuario(`Valor no válido: "${v}".`);
      const cat = Number(m[1]);
      for (let mes = 1; mes <= 12; mes++) {
        const i = celdas.findIndex((c) => c.cat === cat && c.mes === mes);
        if (i >= 0) celdas[i].monto = monto;
        else celdas.push({ cat, mes, monto });
      }
    }
    await escribir(async (tx) => {
      await tx.query("INSERT INTO presupuesto_anual (anio, registrado_por) VALUES ($1, usuario_actual()) ON CONFLICT (anio) DO NOTHING", [anio]);
      for (const c of celdas) {
        if (c.monto === 0) {
          await tx.query("DELETE FROM presupuesto WHERE anio = $1 AND categoria_id = $2 AND mes = $3", [anio, c.cat, c.mes]);
        } else {
          await tx.query(
            `INSERT INTO presupuesto (anio, mes, categoria_id, monto) VALUES ($1, $2, $3, $4)
             ON CONFLICT (anio, mes, categoria_id) DO UPDATE SET monto = EXCLUDED.monto WHERE presupuesto.monto <> EXCLUDED.monto`,
            [anio, c.mes, c.cat, c.monto],
          );
        }
      }
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/presupuesto");
  return { ok: "Presupuesto guardado." };
}

export async function accionGuardarObligacion(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id");
    const campos = {
      descripcion: txt(d, "descripcion", 300),
      tercero: txtONull(d, "tercero", 200),
      categoria_id: entero(d, "categoria_id", { requerido: true, nombre: "la categoría" })!,
      fondo_id: entero(d, "fondo_id"),
      monto: dinero(d, "monto", { requerido: true, nombre: "El valor" })!,
      fecha_compromiso: fechaCampo(d, "fecha_compromiso", { requerido: true, nombre: "la fecha del compromiso" })!,
      fecha_vencimiento: fechaCampo(d, "fecha_vencimiento", { nombre: "la fecha de pago prevista" }),
      referencia_autorizacion: txtONull(d, "referencia_autorizacion", 300),
    };
    if (!campos.descripcion) throw new ErrorUsuario("Describa el gasto.");
    await escribir(async (tx) => {
      let oid = id;
      if (id) {
        const k = Object.keys(campos);
        await tx.query(`UPDATE obligaciones SET ${k.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1`, [id, ...Object.values(campos)]);
      } else {
        const k = Object.keys(campos);
        const { rows } = await tx.query(`INSERT INTO obligaciones (${k.join(", ")}) VALUES (${k.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`, Object.values(campos));
        oid = rows[0].id;
      }
      for (const f of archivosDe(d)) {
        const cid = await guardarComprobante(tx, f, { datosPersonales: txt(d, "sin_datos_personales") !== "1" });
        await tx.query("INSERT INTO soportes (comprobante_id, obligacion_id) VALUES ($1, $2)", [cid, oid]);
      }
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Gasto comprometido guardado." };
}

export async function accionAnularObligacion(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const motivo = txt(d, "motivo", 500);
    if (motivo.length < 5) throw new ErrorUsuario("Explique el motivo.");
    await escribir((tx) => tx.query("UPDATE obligaciones SET estado = 'anulada', motivo_anulacion = $2 WHERE id = $1", [id, motivo]));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Gasto comprometido anulado." };
}

export async function accionGuardarFondo(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id");
    const campos = {
      nombre: txt(d, "nombre", 150),
      tipo: opcion(d, "tipo", ["reserva", "proyecto"] as const, { requerido: true, nombre: "el tipo" })!,
      descripcion: txtONull(d, "descripcion", 500),
      referencia_acuerdo: txtONull(d, "referencia_acuerdo", 300),
      activo: txt(d, "activo") !== "0",
    };
    if (!campos.nombre) throw new ErrorUsuario("Escriba el nombre.");
    await escribir(async (tx) => {
      const k = Object.keys(campos);
      if (id) await tx.query(`UPDATE fondos SET ${k.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1`, [id, ...Object.values(campos)]);
      else await tx.query(`INSERT INTO fondos (${k.join(", ")}) VALUES (${k.map((_, i) => `$${i + 1}`).join(", ")})`, Object.values(campos));
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Fondo guardado." };
}

export async function accionAsignarFondo(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const fondo = entero(d, "fondo_id", { requerido: true, nombre: "el fondo" })!;
    const sentido = opcion(d, "sentido", ["reservar", "liberar"] as const, { requerido: true })!;
    const valor = dinero(d, "valor", { requerido: true, nombre: "El valor" })!;
    const fecha = fechaCampo(d, "fecha", { requerido: true, nombre: "la fecha" })!;
    const motivo = txt(d, "motivo", 300);
    if (!motivo) throw new ErrorUsuario("Indique el motivo.");
    await escribir((tx) => tx.query(
      "INSERT INTO fondo_asignaciones (fondo_id, fecha, valor, motivo, referencia, registrado_por) VALUES ($1, $2, $3, $4, $5, usuario_actual())",
      [fondo, fecha, sentido === "reservar" ? valor : -valor, motivo, txtONull(d, "referencia", 300)],
    ));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Asignación registrada." };
}
