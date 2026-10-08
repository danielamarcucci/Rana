import "server-only";
import { randomBytes, scrypt as _scrypt, timingSafeEqual, createHash } from "node:crypto";
import { promisify } from "node:util";

const scrypt = promisify(_scrypt) as (
  pwd: string,
  salt: Buffer,
  len: number,
  opts: { N: number; r: number; p: number; maxmem: number },
) => Promise<Buffer>;

const N = 32768;
const R = 8;
const P = 1;
const LEN = 32;
const MAXMEM = 64 * 1024 * 1024;

export async function hashClave(clave: string): Promise<string> {
  const salt = randomBytes(16);
  const h = await scrypt(clave.normalize("NFC"), salt, LEN, { N, r: R, p: P, maxmem: MAXMEM });
  return `scrypt$${N}$${R}$${P}$${salt.toString("base64")}$${h.toString("base64")}`;
}

// Hash de relleno para comparar en tiempo constante cuando el usuario no existe.
const RELLENO = "scrypt$32768$8$1$AAAAAAAAAAAAAAAAAAAAAA==$AAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAAA=";

export async function verificarClave(clave: string, guardado: string | null | undefined): Promise<boolean> {
  const partes = (guardado || RELLENO).split("$");
  if (partes.length !== 6 || partes[0] !== "scrypt") return false;
  const [, n, r, p, salt, hash] = partes;
  const esperado = Buffer.from(hash, "base64");
  const h = await scrypt(clave.normalize("NFC"), Buffer.from(salt, "base64"), esperado.length, {
    N: Number(n),
    r: Number(r),
    p: Number(p),
    maxmem: MAXMEM,
  });
  return Boolean(guardado) && h.length === esperado.length && timingSafeEqual(h, esperado);
}

/** Política de contraseñas: al menos 12 caracteres, distinta del usuario. */
export function problemaClave(clave: string, usuario?: string): string | null {
  if (clave.length < 12) return "La contraseña debe tener al menos 12 caracteres.";
  if (clave.length > 128) return "La contraseña es demasiado larga.";
  if (usuario && clave.toLowerCase().includes(usuario.toLowerCase()))
    return "La contraseña no debe contener el nombre de usuario.";
  if (/^(.)\1+$/.test(clave)) return "La contraseña es demasiado simple.";
  return null;
}

export function tokenAleatorio(): string {
  return randomBytes(32).toString("base64url");
}

export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}
