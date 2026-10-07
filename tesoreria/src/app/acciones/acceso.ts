"use server";

import { redirect } from "next/navigation";
import { timingSafeEqual, createHash } from "node:crypto";
import { conRol, mensajeError } from "@/lib/db";
import { hashClave, hashToken, problemaClave, verificarClave } from "@/lib/claves";
import { cerrarSesion, iniciarSesion, leer, ipCliente } from "@/lib/sesion";
import type { EstadoAccion } from "@/lib/tipos";

const txt = (d: FormData, k: string) => String(d.get(k) ?? "").trim();

export async function accionIngresar(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  const usuario = txt(d, "usuario");
  const clave = String(d.get("clave") ?? "");
  if (!usuario || !clave) return { error: "Escriba su usuario y contraseña." };
  let r;
  try {
    r = await iniciarSesion(usuario, clave);
  } catch (e) {
    return { error: mensajeError(e) };
  }
  if (!r.ok) return { error: r.error };
  redirect("/");
}

export async function accionSalir() {
  await cerrarSesion();
  redirect("/ingresar");
}

function iguales(a: string, b: string) {
  const ha = createHash("sha256").update(a).digest();
  const hb = createHash("sha256").update(b).digest();
  return timingSafeEqual(ha, hb);
}

function validarCuenta(usuario: string, nombre: string, clave: string, clave2: string, quien: string): string | null {
  if (!/^[a-z0-9._-]{3,40}$/.test(usuario))
    return `${quien}: el usuario debe tener entre 3 y 40 caracteres (letras minúsculas sin tildes, números, punto, guion).`;
  if (nombre.length < 2) return `${quien}: escriba el nombre.`;
  const p = problemaClave(clave, usuario);
  if (p) return `${quien}: ${p}`;
  if (clave !== clave2) return `${quien}: las contraseñas no coinciden.`;
  return null;
}

/** Crea las dos primeras cuentas. Exige la clave de configuración definida en el servidor. */
export async function accionConfiguracionInicial(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  const clave = process.env.CLAVE_CONFIGURACION || "";
  if (clave.length < 20) return { error: "La configuración inicial no está habilitada en el servidor." };
  // Freno a intentos repetidos: reutiliza el registro de intentos de acceso.
  const ip = await ipCliente();
  const bloqueado = await conRol("auth", {}, async (tx) => {
    const { rows } = await tx.query(
      "SELECT count(*) AS n FROM intentos_acceso WHERE usuario = '#configuracion' AND ip = $1 AND NOT exitoso AND en > now() - interval '15 minutes'",
      [ip],
    );
    return Number(rows[0].n) >= 5;
  });
  if (bloqueado) return { error: "Demasiados intentos. Espere 15 minutos." };
  if (!iguales(String(d.get("clave_configuracion") ?? ""), clave)) {
    await conRol("auth", {}, (tx) =>
      tx.query("INSERT INTO intentos_acceso (usuario, ip, exitoso) VALUES ('#configuracion', $1, false)", [ip]),
    );
    return { error: "La clave de configuración no es correcta." };
  }
  const t = { u: txt(d, "t_usuario").toLowerCase(), n: txt(d, "t_nombre"), c: String(d.get("t_clave") ?? ""), c2: String(d.get("t_clave2") ?? "") };
  const c = { u: txt(d, "c_usuario").toLowerCase(), n: txt(d, "c_nombre"), c: String(d.get("c_clave") ?? ""), c2: String(d.get("c_clave2") ?? "") };
  const err = validarCuenta(t.u, t.n, t.c, t.c2, "Tesorería") || validarCuenta(c.u, c.n, c.c, c.c2, "Consulta");
  if (err) return { error: err };
  if (t.u === c.u) return { error: "Las dos cuentas deben tener usuarios distintos." };
  try {
    const [ht, hc] = await Promise.all([hashClave(t.c), hashClave(c.c)]);
    await conRol("auth", {}, (tx) =>
      tx.query("SELECT fn_configuracion_inicial($1, $2, $3, $4, $5, $6)", [t.u, t.n, ht, c.u, c.n, hc]),
    );
  } catch (e) {
    return { error: mensajeError(e) };
  }
  redirect("/ingresar?configurado=1");
}

export async function accionRestablecer(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  const token = txt(d, "token");
  const clave = String(d.get("clave") ?? "");
  const clave2 = String(d.get("clave2") ?? "");
  const th = hashToken(token);
  try {
    const { rows } = await conRol("auth", {}, (tx) =>
      tx.query("SELECT usuario FROM fn_validar_restablecimiento($1)", [th]),
    );
    if (!rows[0]) return { error: "El enlace no es válido o ya venció. Solicite uno nuevo a tesorería." };
    const p = problemaClave(clave, rows[0].usuario);
    if (p) return { error: p };
    if (clave !== clave2) return { error: "Las contraseñas no coinciden." };
    const h = await hashClave(clave);
    const ok = await conRol("auth", {}, async (tx) => {
      const r = await tx.query("SELECT fn_usar_restablecimiento($1, $2) AS ok", [th, h]);
      return r.rows[0].ok as boolean;
    });
    if (!ok) return { error: "El enlace no es válido o ya venció." };
  } catch (e) {
    return { error: mensajeError(e) };
  }
  redirect("/ingresar?restablecido=1");
}

export async function accionCambiarMiClave(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  const actual = String(d.get("actual") ?? "");
  const clave = String(d.get("clave") ?? "");
  const clave2 = String(d.get("clave2") ?? "");
  try {
    return await leer(async (tx, s) => {
      const { rows } = await tx.query("SELECT fn_mi_hash() AS h");
      if (!(await verificarClave(actual, rows[0].h))) return { error: "La contraseña actual no es correcta." };
      const p = problemaClave(clave, s.usuario);
      if (p) return { error: p };
      if (clave !== clave2) return { error: "Las contraseñas nuevas no coinciden." };
      await tx.query("SELECT fn_cambiar_mi_clave($1)", [await hashClave(clave)]);
      return { ok: "Contraseña actualizada. Se cerraron sus otras sesiones abiertas." };
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
}
