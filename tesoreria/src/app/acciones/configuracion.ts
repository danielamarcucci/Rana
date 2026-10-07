"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { randomBytes } from "node:crypto";
import { escribir } from "@/lib/sesion";
import { ErrorUsuario, mensajeError } from "@/lib/db";
import { archivosDe, guardarComprobante } from "@/lib/comprobantes";
import { hashClave, hashToken, tokenAleatorio } from "@/lib/claves";
import { dinero, entero, fechaCampo, opcion, txt, txtONull } from "@/lib/formulario";
import type { EstadoAccion } from "@/lib/tipos";

export async function accionParametros(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const dia = entero(d, "dia_pago_mensual", { requerido: true, nombre: "el día de pago" })!;
    if (dia < 1 || dia > 28) throw new ErrorUsuario("El día de pago debe estar entre 1 y 28.");
    const umbral = entero(d, "umbral_smmlv_junta", { requerido: true, nombre: "el umbral" })!;
    if (umbral < 1) throw new ErrorUsuario("El umbral debe ser mayor que cero.");
    await escribir((tx) => tx.query(
      `UPDATE configuracion SET dia_pago_mensual = $1, smmlv = $2, smmlv_anio = $3, umbral_smmlv_junta = $4,
              patrimonio_estado = $5, patrimonio_nota = $6, actualizado_en = now()`,
      [dia, dinero(d, "smmlv", { nombre: "El SMMLV" }), entero(d, "smmlv_anio"), umbral,
        opcion(d, "patrimonio_estado", ["por_confirmar", "confirmado"] as const, { requerido: true }), txtONull(d, "patrimonio_nota", 1000)],
    ));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Parámetros guardados." };
}

export async function accionGuardarCuenta(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id");
    const campos = {
      nombre: txt(d, "nombre", 120),
      tipo: opcion(d, "tipo", ["banco", "caja", "otro"] as const, { requerido: true, nombre: "el tipo" })!,
      entidad: txtONull(d, "entidad", 120),
      detalle: txtONull(d, "detalle", 120),
      activa: txt(d, "activa") !== "0",
    };
    if (!campos.nombre) throw new ErrorUsuario("Escriba el nombre de la cuenta.");
    if (campos.detalle && /\d{6,}/.test(campos.detalle.replace(/\D/g, "")))
      throw new ErrorUsuario("Por seguridad, registre solo los últimos 4 dígitos del número de cuenta.");
    await escribir(async (tx) => {
      const k = Object.keys(campos);
      if (id) await tx.query(`UPDATE cuentas SET ${k.map((c, i) => `${c} = $${i + 2}`).join(", ")} WHERE id = $1`, [id, ...Object.values(campos)]);
      else await tx.query(`INSERT INTO cuentas (${k.join(", ")}) VALUES (${k.map((_, i) => `$${i + 1}`).join(", ")})`, Object.values(campos));
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Cuenta guardada." };
}

/** Saldo inicial: se introduce expresamente, con fecha de corte y soporte obligatorio. */
export async function accionSaldoInicial(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const cuenta = entero(d, "cuenta_id", { requerido: true, nombre: "la cuenta" })!;
    const fecha = fechaCampo(d, "fecha_corte", { requerido: true, nombre: "la fecha de corte" })!;
    const valor = dinero(d, "valor", { requerido: true, nombre: "El saldo", permitirCero: true })!;
    const ref = txt(d, "referencia", 300);
    if (!ref) throw new ErrorUsuario("Indique la referencia (p. ej. extracto bancario a la fecha de corte).");
    const archivos = archivosDe(d);
    if (!archivos.length) throw new ErrorUsuario("Adjunte el soporte del saldo (extracto o arqueo).");
    await escribir(async (tx) => {
      const cid = await guardarComprobante(tx, archivos[0], { datosPersonales: txt(d, "sin_datos_personales") !== "1" });
      await tx.query(
        "INSERT INTO saldos_iniciales (cuenta_id, fecha_corte, valor, referencia, comprobante_id) VALUES ($1, $2, $3, $4, $5)",
        [cuenta, fecha, valor, ref, cid],
      );
    });
  } catch (e) {
    const m = mensajeError(e);
    return { error: m.includes("duplicado") ? "Esa cuenta ya tiene un saldo inicial confirmado. Anúlelo (con motivo) antes de registrar otro." : m };
  }
  revalidatePath("/", "layout");
  return { ok: "Saldo inicial confirmado." };
}

export async function accionAnularSaldoInicial(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const motivo = txt(d, "motivo", 500);
    if (motivo.length < 5) throw new ErrorUsuario("Explique el motivo.");
    await escribir((tx) => tx.query("UPDATE saldos_iniciales SET estado = 'anulado', motivo_anulacion = $2 WHERE id = $1 AND estado = 'confirmado'", [id, motivo]));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Saldo inicial anulado." };
}

export async function accionGuardarCategoria(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id");
    const nombre = txt(d, "nombre", 80);
    if (!nombre) throw new ErrorUsuario("Escriba el nombre.");
    const orden = entero(d, "orden") ?? 100;
    const activa = txt(d, "activa") !== "0";
    await escribir(async (tx) => {
      if (id) await tx.query("UPDATE categorias SET nombre = $2, orden = $3, activa = $4 WHERE id = $1", [id, nombre, orden, activa]);
      else await tx.query("INSERT INTO categorias (nombre, tipo, orden) VALUES ($1, $2, $3)", [
        nombre, opcion(d, "tipo", ["ingreso", "egreso"] as const, { requerido: true, nombre: "el tipo" }), orden,
      ]);
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Categoría guardada." };
}

async function urlBase(): Promise<string> {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  const h = await headers();
  const host = h.get("x-forwarded-host") || h.get("host") || "localhost:3000";
  const proto = h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

const HORAS_ENLACE = 72;

/** Crea una cuenta de consulta y devuelve un enlace de un solo uso para que la persona defina su contraseña. */
export async function accionCrearConsulta(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const usuario = txt(d, "usuario", 40).toLowerCase();
    const nombre = txt(d, "nombre", 120);
    if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) throw new ErrorUsuario("Usuario: 3 a 40 caracteres en minúsculas sin tildes, números, punto o guion.");
    if (nombre.length < 2) throw new ErrorUsuario("Escriba el nombre de la persona.");
    const token = tokenAleatorio();
    // Contraseña aleatoria que nadie conoce: la persona define la suya con el enlace.
    const hInutil = await hashClave(randomBytes(32).toString("base64"));
    await escribir(async (tx) => {
      const { rows } = await tx.query("SELECT fn_crear_usuario($1, $2, 'consulta', $3) AS id", [usuario, nombre, hInutil]);
      await tx.query("SELECT fn_crear_restablecimiento($1, $2, $3)", [rows[0].id, hashToken(token), HORAS_ENLACE]);
    });
    return { ok: `Cuenta creada. Entregue este enlace a ${nombre} por un canal seguro (vence en ${HORAS_ENLACE} horas y sirve una sola vez): ${await urlBase()}/restablecer/${token}` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function accionEnlaceRestablecer(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const token = tokenAleatorio();
    await escribir((tx) => tx.query("SELECT fn_crear_restablecimiento($1, $2, $3)", [id, hashToken(token), HORAS_ENLACE]));
    return { ok: `Enlace de un solo uso (vence en ${HORAS_ENLACE} horas; los enlaces anteriores quedan sin efecto): ${await urlBase()}/restablecer/${token}` };
  } catch (e) {
    return { error: mensajeError(e) };
  }
}

export async function accionActivarUsuario(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const activo = txt(d, "activo") === "1";
    await escribir(async (tx, s) => {
      if (id === s.usuarioId) throw new ErrorUsuario("No puede desactivar su propia cuenta.");
      const { rows } = await tx.query("SELECT rol FROM usuarios WHERE id = $1", [id]);
      if (rows[0]?.rol !== "consulta") throw new ErrorUsuario("Desde la aplicación solo se administran cuentas de consulta.");
      await tx.query("UPDATE usuarios SET activo = $2 WHERE id = $1", [id, activo]);
      if (!activo) await tx.query("DELETE FROM sesiones WHERE usuario_id = $1", [id]);
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/configuracion");
  return { ok: "Cuenta actualizada." };
}
