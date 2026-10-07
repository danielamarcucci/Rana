import { obtenerSesion } from "@/lib/sesion";
import { conRol } from "@/lib/db";
import { informeMensual } from "@/lib/datos/informe";
import { informePdf } from "@/lib/pdf/informePdf";
import { hoyCO, inicioMes, sumarMeses } from "@/lib/fechas";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET(req: Request) {
  const s = await obtenerSesion();
  if (!s) return Response.json({ error: "Sesión requerida." }, { status: 401 });
  const url = new URL(req.url);
  const m = url.searchParams.get("mes");
  const periodo = /^\d{4}-\d{2}$/.test(m ?? "") ? `${m}-01` : sumarMeses(inicioMes(hoyCO()), -1);
  // El detalle individual solo se entrega a tesorería; consulta recibe la versión agregada.
  const detalle = url.searchParams.get("detalle") === "1";
  if (detalle && s.rol !== "tesoreria") return Response.json({ error: "El detalle individual es exclusivo de tesorería." }, { status: 403 });
  const inf = await conRol(s.rol, { usuarioId: s.usuarioId, sesionId: s.sesionId }, (tx) => informeMensual(tx, s.rol, periodo, detalle));
  const pdf = await informePdf(inf, { generadoPor: s.nombre, detalle });
  return new Response(new Uint8Array(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="informe-tesoreria-${periodo.slice(0, 7)}${detalle ? "-detalle" : ""}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
