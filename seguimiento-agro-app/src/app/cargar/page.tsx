import ActuacionForm from "@/components/ActuacionForm";
import { usuarioActual } from "@/lib/auth";

export default async function CargarPage() {
  const sesion = await usuarioActual();

  return (
    <div className="mx-auto max-w-3xl">
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-azul-900">Cargar información</h1>
        <p className="text-sm text-slate-600">
          {sesion?.nombreVisible ? `${sesion.nombreVisible} — ` : ""}
          Registre en pocos pasos un plan, programa, convenio o línea de acción. Al guardar,
          puede seguir cargando la siguiente actuación sin salir de esta pantalla.
        </p>
      </div>
      <div className="rounded-xl border border-azul-100 bg-white p-6 shadow-card">
        <ActuacionForm modoRapido />
      </div>
    </div>
  );
}
