import { usuarioActual } from "../../lib/auth";
import CargarClient from "./CargarClient";

export default async function CargarPage() {
  const sesion = await usuarioActual();
  const esDependencia = sesion?.rol === "dependencia";

  return (
    <div className={esDependencia ? "mx-auto max-w-4xl" : "mx-auto max-w-3xl"}>
      <div className="mb-6 text-center sm:text-left">
        <h1 className="text-2xl font-bold text-azul-900">Cargar información</h1>
        <p className="text-sm text-slate-600">
          {sesion?.nombreVisible ? `${sesion.nombreVisible} — ` : ""}
          {esDependencia
            ? "Aquí puede ver lo que ya se ha cargado para su dependencia, actualizarlo, o añadir una actuación nueva."
            : "Registre en pocos pasos un plan, programa, convenio o línea de acción. Al guardar, puede seguir cargando la siguiente actuación sin salir de esta pantalla."}
        </p>
      </div>
      <CargarClient
        nombreVisible={sesion?.nombreVisible ?? ""}
        rol={sesion?.rol ?? "captura"}
        dependenciaId={sesion?.dependenciaId ?? null}
      />
    </div>
  );
}
