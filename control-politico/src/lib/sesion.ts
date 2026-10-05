// Protección opcional con una clave compartida. Si APP_PASSWORD no está
// configurada (por ejemplo, en desarrollo local) la aplicación queda abierta.
// Usa Web Crypto para que funcione igual en el middleware (edge) y en Node.

export const COOKIE_SESION = "cp_sesion";

export function claveConfigurada(): string | undefined {
  return process.env.APP_PASSWORD || undefined;
}

async function hmac(secreto: string, mensaje: string): Promise<string> {
  const enc = new TextEncoder();
  const llave = await crypto.subtle.importKey("raw", enc.encode(secreto), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const firma = await crypto.subtle.sign("HMAC", llave, enc.encode(mensaje));
  return Array.from(new Uint8Array(firma), (b) => b.toString(16).padStart(2, "0")).join("");
}

/** Token de sesión válido para la clave actual; cambiar la clave cierra todas las sesiones. */
export async function tokenEsperado(): Promise<string | null> {
  const clave = claveConfigurada();
  if (!clave) return null;
  return hmac(process.env.SESSION_SECRET || clave, `control-politico:${clave}`);
}

export function igualSeguro(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let r = 0;
  for (let i = 0; i < a.length; i++) r |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return r === 0;
}
