import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE_NAME = "rana_admin_session";

function getSecret() {
  const secret = process.env.SESSION_SECRET || "rana-dev-secret-cambiar-en-produccion";
  return new TextEncoder().encode(secret);
}

async function tieneSesionValida(req: NextRequest) {
  const token = req.cookies.get(COOKIE_NAME)?.value;
  if (!token) return false;
  try {
    await jwtVerify(token, getSecret());
    return true;
  } catch {
    return false;
  }
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const esRutaAdminPublica = pathname === "/admin/login";
  const esApiAdmin = pathname.startsWith("/api/admin/") && pathname !== "/api/admin/login";
  const esPaginaAdmin = pathname.startsWith("/admin") && !esRutaAdminPublica;

  if (esPaginaAdmin || esApiAdmin) {
    const ok = await tieneSesionValida(req);
    if (!ok) {
      if (esApiAdmin) {
        return NextResponse.json({ error: "No autorizado." }, { status: 401 });
      }
      const url = req.nextUrl.clone();
      url.pathname = "/admin/login";
      url.searchParams.set("next", pathname);
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
