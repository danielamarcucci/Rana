import Link from "next/link";
import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { categorias } from "@/lib/datos/catalogos";
import { ejecucion } from "@/lib/datos/presupuesto";
import { pesosCampo } from "@/lib/dinero";
import { hoyCO, nombreMes } from "@/lib/fechas";
import { Encabezado } from "@/components/ui";
import { Formulario } from "@/components/Formulario";
import { accionGuardarPresupuesto } from "@/app/acciones/presupuesto";

export const metadata = { title: "Definir presupuesto" };

export default async function EditarPresupuesto({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirTesoreriaPagina();
  const sp = await searchParams;
  const anio = /^\d{4}$/.test(sp.anio ?? "") ? Number(sp.anio) : Number(hoyCO().slice(0, 4));
  const { cats, celdas } = await leer(async (tx) => ({ cats: await categorias(tx, "egreso", true), celdas: await ejecucion(tx, anio) }));
  const v = (c: number, m: number) => celdas.find((x) => x.categoria_id === c && x.mes === m)?.presupuesto || 0;
  return (
    <>
      <Encabezado antetitulo="Presupuesto" titulo={`Definir presupuesto ${anio}`}
        descripcion="Valor mensual por categoría. Deje en blanco o en cero lo que no aplique. Las categorías se editan en Configuración." />
      <Formulario accion={accionGuardarPresupuesto} boton="Guardar presupuesto">
        <input type="hidden" name="anio" value={anio} />
        <div className="panel overflow-x-auto">
          <table className="tabla">
            <thead><tr><th className="sticky left-0 bg-tenue">Categoría</th>{Array.from({ length: 12 }, (_, i) => <th key={i} className="der capitalize">{nombreMes(i + 1).slice(0, 3)}</th>)}<th className="der">Igual todos los meses</th></tr></thead>
            <tbody>
              {cats.map((c) => (
                <tr key={c.id}>
                  <td className="sticky left-0 bg-white font-semibold">{c.nombre}</td>
                  {Array.from({ length: 12 }, (_, i) => (
                    <td key={i} className="px-1"><input name={`m_${c.id}_${i + 1}`} inputMode="decimal" defaultValue={v(c.id, i + 1) ? pesosCampo(v(c.id, i + 1)) : ""} className="entrada num w-28 px-2 py-1 text-right text-sm" aria-label={`${c.nombre}, ${nombreMes(i + 1)}`} /></td>
                  ))}
                  <td className="px-1"><input name={`todos_${c.id}`} inputMode="decimal" placeholder="Opcional" className="entrada num w-28 px-2 py-1 text-right text-sm" aria-label={`${c.nombre}, todos los meses`} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Formulario>
      <p className="mt-4"><Link href={`/presupuesto?anio=${anio}`}>Volver al presupuesto</Link></p>
    </>
  );
}
