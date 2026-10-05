import { NextResponse, type NextRequest } from "next/server";
import { COOKIE_SESION, igualSeguro, tokenEsperado } from "@/lib/sesion";

export async function middleware(req: NextRequest) {
  const esperado = await tokenEsperado();
  if (!esperado) return NextResponse.next();

  const token = req.cookies.get(COOKIE_SESION)?.value ?? "";
  if (igualSeguro(token, esperado)) return NextResponse.next();

  if (req.nextUrl.pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "No autorizado" }, { status: 401 });
  }
  const url = req.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!login|_next/|favicon|icon).*)"],
};
