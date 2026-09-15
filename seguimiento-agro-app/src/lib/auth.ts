import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";
import { db } from "./db";

const COOKIE_NAME = "agro_session";
const SESSION_TTL_SECONDS = 60 * 60 * 12; // 12 horas

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET no está configurado. Defínalo antes de desplegar en producción."
      );
    }
    return new TextEncoder().encode("agro-dev-secret-cambiar-en-produccion");
  }
  return new TextEncoder().encode(secret);
}

export interface SesionUsuario {
  usuario: string;
  nombreVisible: string;
}

export async function verificarCredenciales(
  usuario: string,
  clave: string
): Promise<SesionUsuario | null> {
  const fila = await db.get<{ usuario: string; password_hash: string; nombre_visible: string }>(
    `SELECT usuario, password_hash, nombre_visible FROM usuarios WHERE usuario = ? COLLATE NOCASE`,
    [usuario.trim()]
  );
  if (!fila) return null;
  const ok = await bcrypt.compare(clave, fila.password_hash);
  if (!ok) return null;
  return { usuario: fila.usuario, nombreVisible: fila.nombre_visible };
}

export async function crearSesion(sesion: SesionUsuario) {
  const token = await new SignJWT({ usuario: sesion.usuario, nombreVisible: sesion.nombreVisible })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_TTL_SECONDS}s`)
    .sign(getSecret());

  const store = await cookies();
  store.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
}

export async function cerrarSesion() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}

export async function usuarioActual(): Promise<SesionUsuario | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    if (!payload.usuario) return null;
    return {
      usuario: payload.usuario as string,
      nombreVisible: (payload.nombreVisible as string) ?? (payload.usuario as string),
    };
  } catch {
    return null;
  }
}
