import { usuarioActual } from "../../lib/auth";
import CargarClient from "./CargarClient";

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
      <CargarClient nombreVisible={sesion?.nombreVisible ?? ""} />
    </div>
  );
}
