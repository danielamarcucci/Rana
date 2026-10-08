import "server-only";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { conRol, ErrorUsuario, type Tx } from "./db";
import { hashClave, hashToken, tokenAleatorio, verificarClave } from "./claves";

export type Rol = "tesoreria" | "consulta";
export type Sesion = {
  sesionId: number;
  usuarioId: number;
  usuario: string;
  nombre: string;
  rol: Rol;
};

const PRODUCCION = process.env.NODE_ENV === "production";
export const COOKIE = PRODUCCION ? "__Host-tesoreria" : "tesoreria";
const DURACION_HORAS = 12; // duración máxima de una sesión
const INACTIVIDAD_MIN = 120; // cierre por inactividad
const MAX_FALLOS_USUARIO = 5; // por usuario, en 15 minutos
const MAX_FALLOS_IP = 20; // por dirección IP, en 15 minutos

export async function ipCliente(): Promise<string> {
  const h = await headers();
  return (h.get("x-forwarded-for")?.split(",")[0] || h.get("x-real-ip") || "").trim().slice(0, 64);
}

/** Sesión vigente (validada en la base de datos) o null. Se memoriza por solicitud. */
export const obtenerSesion = cache(async (): Promise<Sesion | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token || token.length > 100) return null;
  return conRol("auth", {}, async (tx) => {
    const { rows } = await tx.query(
      `SELECT s.id, s.usuario_id, u.usuario, u.nombre, u.rol,
              s.ultima_actividad < now() - make_interval(mins => $2) AS inactiva,
              s.ultima_actividad < now() - interval '5 minutes' AS refrescar
         FROM sesiones s JOIN usuarios u ON u.id = s.usuario_id
        WHERE s.token_hash = $1 AND s.expira_en > now() AND u.activo`,
      [hashToken(token), INACTIVIDAD_MIN],
    );
    const r = rows[0];
    if (!r) return null;
    if (r.inactiva) {
      await tx.query("DELETE FROM sesiones WHERE id = $1", [r.id]);
      return null;
    }
    if (r.refrescar) await tx.query("UPDATE sesiones SET ultima_actividad = now() WHERE id = $1", [r.id]);
    return { sesionId: Number(r.id), usuarioId: r.usuario_id, usuario: r.usuario, nombre: r.nombre, rol: r.rol };
  });
});

/** Para páginas: exige sesión o envía a la pantalla de ingreso. */
export async function exigirSesion(): Promise<Sesion> {
  const s = await obtenerSesion();
  if (!s) redirect("/ingresar");
  return s;
}

/** Para páginas exclusivas de tesorería. */
export async function exigirTesoreriaPagina(): Promise<Sesion> {
  const s = await exigirSesion();
  if (s.rol !== "tesoreria") redirect("/?sin-permiso=1");
  return s;
}

/** Lectura con los privilegios del rol de la sesión. */
export async function leer<T>(fn: (tx: Tx, s: Sesion) => Promise<T>): Promise<T> {
  const s = await exigirSesion();
  return conRol(s.rol, { usuarioId: s.usuarioId, sesionId: s.sesionId }, (tx) => fn(tx, s));
}

/** Escritura: solo tesorería (verificado aquí y de nuevo por la base de datos). */
export async function escribir<T>(fn: (tx: Tx, s: Sesion) => Promise<T>): Promise<T> {
  const s = await obtenerSesion();
  if (!s) throw new ErrorUsuario("Su sesión terminó. Ingrese de nuevo.");
  if (s.rol !== "tesoreria") throw new ErrorUsuario("Solo tesorería puede modificar información.");
  return conRol("tesoreria", { usuarioId: s.usuarioId, sesionId: s.sesionId }, (tx) => fn(tx, s));
}

export type ResultadoIngreso = { ok: true } | { ok: false; error: string };

export async function iniciarSesion(usuarioBruto: string, clave: string): Promise<ResultadoIngreso> {
  const usuario = usuarioBruto.trim().toLowerCase().slice(0, 60);
  const ip = await ipCliente();
  const agente = ((await headers()).get("user-agent") || "").slice(0, 200);
  const generico = "Usuario o contraseña incorrectos.";

  const res = await conRol("auth", {}, async (tx) => {
    const { rows: f } = await tx.query(
      `SELECT count(*) FILTER (WHERE usuario = $1) AS por_usuario,
              count(*) FILTER (WHERE ip = $2) AS por_ip
         FROM intentos_acceso WHERE NOT exitoso AND en > now() - interval '15 minutes'`,
      [usuario, ip],
    );
    if (Number(f[0].por_usuario) >= MAX_FALLOS_USUARIO || Number(f[0].por_ip) >= MAX_FALLOS_IP) {
      return { ok: false as const, error: "Demasiados intentos fallidos. Espere 15 minutos e intente de nuevo." };
    }
    const { rows } = await tx.query(
      "SELECT id, clave_hash, activo FROM usuarios WHERE usuario = $1",
      [usuario],
    );
    const u = rows[0];
    const valida = await verificarClave(clave, u?.clave_hash);
    const exitoso = Boolean(u && u.activo && valida);
    await tx.query("INSERT INTO intentos_acceso (usuario, ip, exitoso) VALUES ($1, $2, $3)", [usuario, ip, exitoso]);
    if (!exitoso) return { ok: false as const, error: generico };

    const token = tokenAleatorio();
    await tx.query(
      `INSERT INTO sesiones (token_hash, usuario_id, expira_en, ip, agente)
       VALUES ($1, $2, now() + make_interval(hours => $3), $4, $5)`,
      [hashToken(token), u.id, DURACION_HORAS, ip, agente],
    );
    await tx.query("UPDATE usuarios SET ultimo_acceso = now() WHERE id = $1", [u.id]);
    // Limpieza ocasional
    await tx.query("DELETE FROM sesiones WHERE expira_en < now() - interval '1 day'");
    await tx.query("DELETE FROM intentos_acceso WHERE en < now() - interval '90 days'");
    return { ok: true as const, token };
  });

  if (!res.ok) return res;
  (await cookies()).set(COOKIE, res.token, {
    httpOnly: true,
    secure: PRODUCCION,
    sameSite: "lax",
    path: "/",
    maxAge: DURACION_HORAS * 3600,
  });
  return { ok: true };
}

export async function cerrarSesion(): Promise<void> {
  const jar = await cookies();
  const token = jar.get(COOKIE)?.value;
  if (token) {
    await conRol("auth", {}, (tx) => tx.query("DELETE FROM sesiones WHERE token_hash = $1", [hashToken(token)]));
  }
  jar.delete(COOKIE);
}

export { hashClave };
