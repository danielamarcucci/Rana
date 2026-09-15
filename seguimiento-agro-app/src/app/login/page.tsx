import { redirect } from "next/navigation";
import { usuarioActual } from "@/lib/auth";
import LoginForm from "./LoginForm";

export default async function LoginPage() {
  const sesion = await usuarioActual();
  if (sesion) redirect("/");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-azul-900 via-azul-800 to-azul-950 px-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-8 shadow-2xl">
        <div className="mb-6 flex flex-col items-center text-center">
          <span className="mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-naranja-500 text-3xl">
            🌾
          </span>
          <h1 className="text-xl font-bold text-azul-900">Seguimiento sectorial agro</h1>
          <p className="mt-1 text-sm text-azul-700">
            Tablero de control de planes, programas, convenios y líneas de acción — sector
            agricultura
          </p>
          <p className="mt-1 text-xs text-naranja-600">
            Unidad de Información Estratégica del Despacho
          </p>
        </div>
        <LoginForm />
      </div>
    </div>
  );
}
