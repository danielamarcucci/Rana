import { cookies } from "next/headers";
import bcrypt from "bcryptjs";
import { SignJWT, jwtVerify } from "jose";

// Credenciales por defecto de la Red Nacional de Defensa por la Reforma
// Agraria. Solo se guarda el hash de la clave, nunca el texto plano.
// Pueden sobreescribirse con las variables de entorno ADMIN_USERNAME y
// ADMIN_PASSWORD_HASH (generar con bcryptjs) sin tocar el código.
const DEFAULT_USERNAME = "derechoshumanosred";
const DEFAULT_PASSWORD_HASH =
  "$2a$12$IFBe7Si62pawyJ89zf17Su.YVKFuaOn/tVJGM9SlxtCaU1oH0RGUq";

const COOKIE_NAME = "rana_admin_session";
const SESSION_TTL_SECONDS = 60 * 60 * 8; // 8 horas

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "SESSION_SECRET no está configurado. Defínalo antes de desplegar en producción."
      );
    }
    return new TextEncoder().encode("rana-dev-secret-cambiar-en-produccion");
  }
  return new TextEncoder().encode(secret);
}

export async function verificarCredenciales(usuario: string, clave: string) {
  const expectedUser = process.env.ADMIN_USERNAME || DEFAULT_USERNAME;
  const expectedHash = process.env.ADMIN_PASSWORD_HASH || DEFAULT_PASSWORD_HASH;
  if (usuario !== expectedUser) {
    // Igual comparamos contra el hash para no filtrar por tiempo si el
    // usuario existe o no.
    await bcrypt.compare(clave, expectedHash);
    return false;
  }
  return bcrypt.compare(clave, expectedHash);
}

export async function crearSesion(usuario: string) {
  const token = await new SignJWT({ usuario })
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

export async function usuarioActual(): Promise<string | null> {
  const store = await cookies();
  const token = store.get(COOKIE_NAME)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, getSecret());
    return (payload.usuario as string) ?? null;
  } catch {
    return null;
  }
}

export async function requiereSesion() {
  const usuario = await usuarioActual();
  return usuario !== null;
}
