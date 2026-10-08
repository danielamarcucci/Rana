import Link from "next/link";
import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { pesos } from "@/lib/dinero";
import { fecha } from "@/lib/fechas";
import { Encabezado, Insignia, TablaContenedor, Vacio } from "@/components/ui";

export const metadata = { title: "Miembros" };

const VINCULO: Record<string, string> = { asociado: "Asociado de la Corporación", aportante: "Aportante de la Red", otro: "Otro" };

export default async function Miembros({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirTesoreriaPagina();
  const sp = await searchParams;
  const vinculo = ["asociado", "aportante", "otro"].includes(sp.vinculo) ? sp.vinculo : null;
  const estado = ["activo", "retirado"].includes(sp.estado) ? sp.estado : null;
  const filas = await leer(async (tx) => (await tx.query(
    `SELECT m.id, m.codigo, m.nombre, m.tipo_persona, m.vinculo, m.clase_asociado, m.estado, m.fecha_vinculacion,
            coalesce((SELECT sum(saldo) FROM v_compromisos_estado c WHERE c.miembro_id = m.id AND c.estado = 'vigente'), 0)::bigint AS pendiente,
            coalesce((SELECT sum(disponible) FROM v_saldos_a_favor s WHERE s.miembro_id = m.id AND s.estado = 'verificado'), 0)::bigint AS a_favor,
            EXISTS (SELECT 1 FROM adhesiones a WHERE a.miembro_id = m.id AND (a.mes_fin IS NULL OR a.mes_fin >= date_trunc('month', hoy_co()))) AS mensualidad
       FROM miembros m
      WHERE ($1::text IS NULL OR m.vinculo = $1) AND ($2::text IS NULL OR m.estado = $2)
      ORDER BY m.estado, m.nombre`, [vinculo, estado])).rows);
  return (
    <>
      <Encabezado titulo="Miembros y aportantes"
        descripcion="Registro de personas y organizaciones. El contacto solo es visible para tesorería. Registrar a alguien no le crea obligaciones de pago: los compromisos dependen de esquemas aprobados y aceptaciones expresas."
        acciones={<Link href="/miembros/nuevo" className="btn-primario">Registrar</Link>} />
      <form className="mb-4 flex flex-wrap items-end gap-3" action="/miembros">
        <label className="campo"><span className="!text-xs">Vínculo</span>
          <select name="vinculo" defaultValue={vinculo ?? ""} className="entrada py-1.5 text-sm">
            <option value="">Todos</option>{Object.entries(VINCULO).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select></label>
        <label className="campo"><span className="!text-xs">Estado</span>
          <select name="estado" defaultValue={estado ?? ""} className="entrada py-1.5 text-sm">
            <option value="">Todos</option><option value="activo">Activos</option><option value="retirado">Retirados</option>
          </select></label>
        <button className="btn-secundario py-1.5">Filtrar</button>
        <a className="btn-enlace pb-2" href="/api/exportar?conjunto=miembros">Exportar CSV</a>
      </form>
      {filas.length === 0 ? <Vacio>No hay registros.</Vacio> : (
        <TablaContenedor>
          <table className="tabla">
            <thead><tr><th>Código</th><th>Nombre</th><th>Vínculo</th><th>Vinculación</th><th>Estado</th><th className="der">Aporte pendiente</th><th className="der">Saldo a favor</th></tr></thead>
            <tbody>
              {filas.map((m) => (
                <tr key={m.id}>
                  <td className="num text-xs">{m.codigo}</td>
                  <td><Link href={`/miembros/${m.id}`} className="font-semibold">{m.nombre}</Link>{m.mensualidad && <span className="ml-2"><Insignia tono="suave">Mensualidad</Insignia></span>}</td>
                  <td className="text-xs">{VINCULO[m.vinculo]}{m.clase_asociado ? ` (${m.clase_asociado})` : ""}</td>
                  <td className="num text-xs">{fecha(m.fecha_vinculacion)}</td>
                  <td>{m.estado === "activo" ? <Insignia tono="ok">Activo</Insignia> : <Insignia tono="suave">Retirado</Insignia>}</td>
                  <td className="der">{m.pendiente ? pesos(m.pendiente) : "—"}</td>
                  <td className="der">{m.a_favor ? pesos(m.a_favor) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </TablaContenedor>
      )}
    </>
  );
}
