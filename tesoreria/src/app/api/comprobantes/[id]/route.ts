import { obtenerSesion } from "@/lib/sesion";
import { conRol } from "@/lib/db";

export const dynamic = "force-dynamic";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const s = await obtenerSesion();
  if (!s) return Response.json({ error: "Sesión requerida." }, { status: 401 });
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) return Response.json({ error: "No encontrado." }, { status: 404 });
  // La consulta corre con el rol de la sesión: para consulta, la seguridad por
  // filas de la base de datos solo deja ver comprobantes sin datos personales.
  const { rows } = await conRol(s.rol, { usuarioId: s.usuarioId, sesionId: s.sesionId }, (tx) =>
    tx.query("SELECT nombre_archivo, tipo_mime, contenido FROM comprobantes WHERE id = $1", [id]),
  );
  const c = rows[0];
  if (!c) return Response.json({ error: "No encontrado." }, { status: 404 });
  return new Response(new Uint8Array(c.contenido), {
    headers: {
      "Content-Type": c.tipo_mime,
      "Content-Disposition": `inline; filename*=UTF-8''${encodeURIComponent(c.nombre_archivo)}`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
