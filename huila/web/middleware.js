// Acceso con usuario y contraseña al tablero del Huila en Vercel.
// Vercel ejecuta este archivo antes de servir cualquier archivo del sitio
// (Routing Middleware, funciona también en sitios estáticos sin framework).
// El usuario y la contraseña NO están en el repositorio (que es público):
// se leen de las variables de entorno HUILA_USUARIO y HUILA_CLAVE del
// proyecto de Vercel. Si faltan, el sitio no se abre.

export const config = { matcher: "/:path*" };

function iguales(a, b) {
  // comparación de tiempo constante para no filtrar la clave por tiempos de respuesta
  const x = new TextEncoder().encode(a), y = new TextEncoder().encode(b);
  let d = x.length ^ y.length;
  for (let i = 0; i < Math.max(x.length, y.length); i++) d |= (x[i] || 0) ^ (y[i] || 0);
  return d === 0;
}

const CABECERAS = { "X-Robots-Tag": "noindex, nofollow", "Cache-Control": "no-store" };

export default function middleware(request) {
  const usuario = process.env.HUILA_USUARIO, clave = process.env.HUILA_CLAVE;
  if (!usuario || !clave) {
    return new Response("Falta configurar HUILA_USUARIO y HUILA_CLAVE en Vercel.", { status: 503, headers: CABECERAS });
  }
  const auth = request.headers.get("authorization") || "";
  if (auth.startsWith("Basic ")) {
    let texto = "";
    try { texto = new TextDecoder().decode(Uint8Array.from(atob(auth.slice(6)), (c) => c.charCodeAt(0))); } catch { texto = ""; }
    const i = texto.indexOf(":");
    if (i >= 0 && iguales(texto.slice(0, i), usuario) & iguales(texto.slice(i + 1), clave)) {
      return; // sigue: Vercel sirve el archivo pedido
    }
  }
  return new Response("Acceso restringido.", {
    status: 401,
    headers: { ...CABECERAS, "WWW-Authenticate": 'Basic realm="Tablero Huila", charset="UTF-8"' },
  });
}
