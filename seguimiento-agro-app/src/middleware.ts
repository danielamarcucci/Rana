import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "agro_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET || "agro-dev-secret-cambiar-en-produccion";
  return new TextEncoder().encode(secret);
}

const RUTAS_PUBLICAS = ["/login", "/api/login"];

// El rol "captura" (usuario Equipo) solo ve la interfaz sencilla de carga de
// información — no el tablero, el mapa ni el detalle/edición de actuaciones,
// que son la interfaz de seguimiento del rol "gestor".
const RUTAS_PERMITIDAS_CAPTURA = ["/cargar"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (
    RUTAS_PUBLICAS.some((r) => pathname === r) ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/data/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json"
  ) {
    return NextResponse.next();
  }

  const token = req.cookies.get(COOKIE_NAME)?.value;
  let rol: string | null = null;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getSecret());
      rol = (payload.rol as string) ?? "gestor";
    } catch {
      rol = null;
    }
  }

  if (!rol) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  if (rol === "captura" && !pathname.startsWith("/api/") && !RUTAS_PERMITIDAS_CAPTURA.includes(pathname)) {
    return NextResponse.redirect(new URL("/cargar", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
