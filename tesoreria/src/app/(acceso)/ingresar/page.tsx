import { redirect } from "next/navigation";
import { Formulario } from "@/components/Formulario";
import { accionIngresar } from "@/app/acciones/acceso";
import { obtenerSesion } from "@/lib/sesion";
import { conRol } from "@/lib/db";

export const metadata = { title: "Ingresar" };
export const dynamic = "force-dynamic";

export default async function Ingresar({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  if (await obtenerSesion()) redirect("/");
  const sp = await searchParams;
  const hayUsuarios = await conRol("auth", {}, async (tx) => (await tx.query("SELECT fn_hay_usuarios() AS h")).rows[0].h);
  if (!hayUsuarios) redirect("/configuracion-inicial");
  return (
    <>
      <h1 className="text-xl font-semibold">Ingresar</h1>
      {sp.configurado && <p className="aviso mt-3 border-olivo-vivo bg-suave">Cuentas creadas. Ya puede ingresar.</p>}
      {sp.restablecido && <p className="aviso mt-3 border-olivo-vivo bg-suave">Contraseña actualizada. Ingrese con la nueva.</p>}
      <Formulario accion={accionIngresar} boton="Ingresar" className="mt-5 space-y-4">
        <label className="campo">
          <span>Usuario</span>
          <input name="usuario" className="entrada" autoComplete="username" autoCapitalize="none" required />
        </label>
        <label className="campo">
          <span>Contraseña</span>
          <input name="clave" type="password" className="entrada" autoComplete="current-password" required />
        </label>
      </Formulario>
      <p className="mt-6 text-xs text-gris">
        ¿Olvidó su contraseña? Pida a tesorería un enlace de restablecimiento.
      </p>
    </>
  );
}
