import { NextResponse, type NextRequest } from "next/server";

// Primer filtro: sin cookie de sesión no se entra a ninguna página ni API.
// La validación real de la sesión y del rol ocurre en el servidor y en la
// base de datos en cada solicitud.
const PUBLICAS = ["/ingresar", "/restablecer/", "/configuracion-inicial"];
const COOKIE = process.env.NODE_ENV === "production" ? "__Host-tesoreria" : "tesoreria";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLICAS.some((p) => pathname === p || pathname.startsWith(p))) return NextResponse.next();
  if (req.cookies.get(COOKIE)?.value) return NextResponse.next();
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Sesión requerida." }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/ingresar";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!_next/|marca/|icon.png|apple-icon.png|favicon.ico|robots.txt).*)"],
};
