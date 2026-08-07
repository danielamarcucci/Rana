import { agruparPorInmueble, listarServiciosConEstado, resumenMes } from "@/lib/servicios";
import { fechaHoy, nombreMes } from "@/lib/format";
import ResumenBar from "@/components/ResumenBar";
import ServicioCard from "@/components/ServicioCard";

export const dynamic = "force-dynamic";

export default async function InicioPage() {
  const { anio, mes } = fechaHoy();
  const [servicios, resumen] = await Promise.all([
    listarServiciosConEstado(anio, mes),
    resumenMes(anio, mes),
  ]);
  const grupos = agruparPorInmueble(servicios);

  return (
    <main className="px-4 pt-6">
      <header className="mb-5">
        <h1 className="text-3xl font-extrabold text-neutral-900">Mis Servicios</h1>
      </header>

      <ResumenBar
        pagados={resumen.pagados}
        total={resumen.total}
        mesLabel={`${nombreMes(mes)} ${anio}`}
      />

      <div className="mt-6 space-y-6">
        {grupos.map(([inmueble, listaServicios]) => (
          <section key={inmueble}>
            <h2 className="mb-2 px-1 text-lg font-bold text-neutral-600">🏠 {inmueble}</h2>
            <div className="space-y-2.5">
              {listaServicios.map((s) => (
                <ServicioCard key={s.id} servicio={s} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </main>
  );
}
