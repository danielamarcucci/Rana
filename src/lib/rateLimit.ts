// Limitador de intentos simple, en memoria, para el login del panel
// privado. Suficiente para una única instancia; si se despliega en varias
// instancias, reemplazar por un almacén compartido (Redis, etc.).

const intentos = new Map<string, { count: number; resetAt: number }>();

const MAX_INTENTOS = 8;
const VENTANA_MS = 10 * 60 * 1000; // 10 minutos

export function permitirIntento(clave: string): boolean {
  const ahora = Date.now();
  const registro = intentos.get(clave);
  if (!registro || registro.resetAt < ahora) {
    intentos.set(clave, { count: 1, resetAt: ahora + VENTANA_MS });
    return true;
  }
  if (registro.count >= MAX_INTENTOS) return false;
  registro.count += 1;
  return true;
}
