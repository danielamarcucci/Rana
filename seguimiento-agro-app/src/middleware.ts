import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "agro_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET || "agro-dev-secret-cambiar-en-produccion";
  return new TextEncoder().encode(secret);
}

const RUTAS_PUBLICAS = ["/login", "/api/login"];

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
  let autenticado = false;
  if (token) {
    try {
      await jwtVerify(token, getSecret());
      autenticado = true;
    } catch {
      autenticado = false;
    }
  }

  if (!autenticado) {
    if (pathname.startsWith("/api/")) {
      return NextResponse.json({ error: "No autenticado" }, { status: 401 });
    }
    const url = new URL("/login", req.url);
    url.searchParams.set("redirect", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image).*)"],
};
