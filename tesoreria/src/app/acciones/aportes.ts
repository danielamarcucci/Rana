"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { escribir } from "@/lib/sesion";
import { ErrorUsuario, mensajeError } from "@/lib/db";
import { archivosDe, guardarComprobante } from "@/lib/comprobantes";
import { dinero, entero, fechaCampo, mesCampo, opcion, txt, txtONull } from "@/lib/formulario";
import { generarMensuales } from "@/lib/datos/aportes";
import { periodosEntre } from "@/lib/fechas";
import type { EstadoAccion } from "@/lib/tipos";

async function adjuntarA(tx: Parameters<Parameters<typeof escribir>[0]>[0], d: FormData, campo: "esquema_id" | "compromiso_id", id: number) {
  const dp = txt(d, "sin_datos_personales") !== "1";
  for (const f of archivosDe(d)) {
    const cid = await guardarComprobante(tx, f, { datosPersonales: dp });
    await tx.query(`INSERT INTO soportes (comprobante_id, ${campo}) VALUES ($1, $2)`, [cid, id]);
  }
}

export async function accionGuardarEsquema(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  let id: number;
  try {
    const existente = entero(d, "id");
    const tipo = opcion(d, "tipo", ["constitucion", "mensual"] as const, { requerido: true, nombre: "el tipo" })!;
    const estado = opcion(d, "estado", ["propuesta", "aprobado", "cerrado"] as const, { requerido: true, nombre: "el estado" })!;
    const campos = {
      nombre: txt(d, "nombre", 150),
      estado,
      organo: opcion(d, "organo", ["asamblea", "junta", "otro"] as const),
      referencia_acuerdo: txtONull(d, "referencia_acuerdo", 300),
      fecha_acuerdo: fechaCampo(d, "fecha_acuerdo", { nombre: "la fecha del acuerdo" }),
      presupuesto_gastos: tipo === "constitucion" ? dinero(d, "presupuesto_gastos", { nombre: "El presupuesto de gastos", permitirCero: true }) : null,
      meta_gastos: tipo === "constitucion" ? dinero(d, "meta_gastos", { nombre: "La meta para gastos", permitirCero: true }) : null,
      meta_patrimonio: tipo === "constitucion" ? dinero(d, "meta_patrimonio", { nombre: "La meta de patrimonio", permitirCero: true }) : null,
      dia_pago: tipo === "mensual" ? entero(d, "dia_pago", { nombre: "El día de pago" }) : null,
      monto_sugerido: tipo === "mensual" ? dinero(d, "monto_sugerido", { nombre: "El monto de referencia" }) : null,
      observaciones: txtONull(d, "observaciones", 1000),
    };
    if (!campos.nombre) throw new ErrorUsuario("Escriba un nombre para el esquema.");
    if (campos.dia_pago !== null && (campos.dia_pago < 1 || campos.dia_pago > 28)) throw new ErrorUsuario("El día de pago debe estar entre 1 y 28.");
    if (estado !== "propuesta" && (!campos.organo || !campos.referencia_acuerdo || !campos.fecha_acuerdo))
      throw new ErrorUsuario("Para registrar el esquema como aprobado indique el órgano, la referencia del acuerdo (acta) y su fecha.");
    id = await escribir(async (tx) => {
      let eid: number;
      if (existente) {
        const k = Object.keys(campos);
        await tx.query(`UPDATE esquemas_aporte SET ${k.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1`, [existente, ...Object.values(campos)]);
        eid = existente;
      } else {
        const k = ["tipo", ...Object.keys(campos)];
        const { rows } = await tx.query(
          `INSERT INTO esquemas_aporte (${k.join(", ")}) VALUES (${k.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
          [tipo, ...Object.values(campos)],
        );
        eid = rows[0].id;
      }
      await adjuntarA(tx, d, "esquema_id", eid);
      return eid;
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/aportes", "layout");
  redirect(`/aportes/esquemas/${id}?guardado=1`);
}

export async function accionGuardarAdhesion(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id");
    const campos = {
      esquema_id: entero(d, "esquema_id", { requerido: true, nombre: "el esquema" })!,
      miembro_id: entero(d, "miembro_id", { requerido: true, nombre: "el aportante" })!,
      monto: dinero(d, "monto", { requerido: true, nombre: "El monto mensual" })!,
      mes_inicio: mesCampo(d, "mes_inicio", { requerido: true, nombre: "el mes de inicio" })!,
      mes_fin: mesCampo(d, "mes_fin", { nombre: "el mes de finalización" }),
      dia_pago: entero(d, "dia_pago", { nombre: "el día de pago" }),
      referencia_aceptacion: txt(d, "referencia_aceptacion", 300),
      fecha_aceptacion: fechaCampo(d, "fecha_aceptacion", { requerido: true, nombre: "la fecha de aceptación" })!,
      observaciones: txtONull(d, "observaciones", 500),
    };
    if (!campos.referencia_aceptacion) throw new ErrorUsuario("Indique cómo consta la aceptación (p. ej. formato firmado, correo, acta).");
    if (campos.dia_pago !== null && (campos.dia_pago < 1 || campos.dia_pago > 28)) throw new ErrorUsuario("El día de pago debe estar entre 1 y 28.");
    await escribir(async (tx) => {
      if (id) {
        const k = Object.keys(campos);
        await tx.query(`UPDATE adhesiones SET ${k.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1`, [id, ...Object.values(campos)]);
      } else {
        const k = Object.keys(campos);
        await tx.query(`INSERT INTO adhesiones (${k.join(", ")}) VALUES (${k.map((_, i) => `$${i + 1}`).join(", ")})`, Object.values(campos));
      }
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Aceptación guardada." };
}

export async function accionEliminarAdhesion(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    await escribir((tx) => tx.query("DELETE FROM adhesiones WHERE id = $1", [id]));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Aceptación eliminada." };
}

export async function accionGenerarMensuales(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const esquema = entero(d, "esquema_id", { requerido: true, nombre: "el esquema" })!;
    const desde = mesCampo(d, "desde", { requerido: true, nombre: "el mes inicial" })!;
    const hasta = mesCampo(d, "hasta", { requerido: true, nombre: "el mes final" })!;
    if (hasta < desde) throw new ErrorUsuario("El mes final es anterior al inicial.");
    if (periodosEntre(desde, hasta).length > 24) throw new ErrorUsuario("Genere como máximo 24 meses a la vez.");
    const n = await escribir(async (tx) => {
      const { rows } = await tx.query("SELECT estado, tipo FROM esquemas_aporte WHERE id = $1", [esquema]);
      if (rows[0]?.tipo !== "mensual") throw new ErrorUsuario("Seleccione un esquema mensual.");
      if (rows[0].estado !== "aprobado")
        throw new ErrorUsuario("El esquema no está aprobado: una propuesta de mensualidad no genera compromisos.");
      return generarMensuales(tx, esquema, desde, hasta);
    });
    revalidatePath("/", "layout");
    return { ok: n ? `Se generaron ${n} compromiso(s). Los existentes no se duplicaron.` : "No había compromisos nuevos por generar (los existentes no se duplican)." };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function accionGuardarCompromiso(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id");
    const monto = dinero(d, "monto", { requerido: true, nombre: "El monto acordado" })!;
    const fechaAcordada = fechaCampo(d, "fecha_acordada", { requerido: true, nombre: "la fecha acordada" })!;
    const obs = txtONull(d, "observaciones", 500);
    await escribir(async (tx) => {
      let cid = id;
      if (id) {
        await tx.query("UPDATE compromisos SET monto = $2, fecha_acordada = $3, observaciones = $4 WHERE id = $1", [id, monto, fechaAcordada, obs]);
      } else {
        const destino = opcion(d, "destino", ["gastos_constitucion", "patrimonio_inicial"] as const, { requerido: true, nombre: "el destino" })!;
        const { rows } = await tx.query(
          `INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, monto, fecha_acordada, observaciones)
           VALUES ($1, $2, 'constitucion', $3, $4, $5, $6) RETURNING id`,
          [entero(d, "esquema_id", { requerido: true, nombre: "el esquema" }), entero(d, "miembro_id", { requerido: true, nombre: "el aportante" }), destino, monto, fechaAcordada, obs],
        );
        cid = rows[0].id;
      }
      await adjuntarA(tx, d, "compromiso_id", cid!);
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Compromiso guardado." };
}

export async function accionAnularCompromiso(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const motivo = txt(d, "motivo", 500);
    if (motivo.length < 5) throw new ErrorUsuario("Explique el motivo.");
    await escribir((tx) => tx.query("UPDATE compromisos SET estado = 'anulado', motivo_anulacion = $2 WHERE id = $1", [id, motivo]));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Compromiso anulado." };
}
