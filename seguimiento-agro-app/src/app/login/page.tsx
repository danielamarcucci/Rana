import { redirect } from "next/navigation";
import { usuarioActual } from "../../lib/auth";
import LoginForm from "./LoginForm";

const DESTACADOS = [
  { icono: "📊", texto: "Panorama del sector en tiempo real" },
  { icono: "🗺️", texto: "Seguimiento por departamento y municipio" },
  { icono: "🎯", texto: "Apoyo a la toma de decisiones" },
];

export default async function LoginPage() {
  const sesion = await usuarioActual();
  if (sesion) redirect(sesion.rol === "captura" ? "/cargar" : "/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-azul-900 via-azul-800 to-azul-950 px-4 py-10">
      <div className="grid w-full max-w-4xl gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
        <div className="text-white">
          <span className="mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-naranja-500 text-3xl">
            🌾
          </span>
          <h1 className="text-2xl font-bold sm:text-3xl">Seguimiento sectorial agro</h1>
          <p className="mt-1 text-sm font-medium text-naranja-300">
            Panorama estratégico del sector agricultura, en tiempo real
          </p>
          <p className="mt-4 max-w-md text-sm leading-relaxed text-azul-100">
            Este es el repositorio y sistema de gestión de la <b>Unidad de Información Estratégica
            del Despacho</b>: centraliza en un solo lugar los planes, programas, convenios y líneas
            de acción del Viceministerio de Desarrollo Rural, el Viceministerio de Asuntos
            Agropecuarios, sus direcciones y oficinas asesoras, y las entidades adscritas y
            vinculadas del sector.
          </p>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-azul-100">
            Con acceso a esta herramienta se puede ver, de forma actualizada, cómo avanza la
            gestión del sector a lo largo del país — metas, recursos y beneficiarios por
            departamento y municipio — para hacer monitoreo permanente e identificar posibles
            rutas de acción.
          </p>
          <div className="mt-5 flex flex-wrap gap-2">
            {DESTACADOS.map((d) => (
              <span
                key={d.texto}
                className="flex items-center gap-1.5 rounded-full border border-azul-700 bg-azul-800/60 px-3 py-1.5 text-xs font-medium text-azul-100"
              >
                <span aria-hidden>{d.icono}</span> {d.texto}
              </span>
            ))}
          </div>
        </div>

        <div className="w-full rounded-2xl bg-white p-8 shadow-2xl">
          <div className="mb-6 text-center">
            <h2 className="text-lg font-bold text-azul-900">Ingresar</h2>
            <p className="mt-1 text-xs text-slate-500">Use el usuario y la clave asignados a su equipo.</p>
          </div>
          <LoginForm />
        </div>
      </div>
    </div>
  );
}
