import { redirect } from "next/navigation";
import { Formulario } from "@/components/Formulario";
import { accionConfiguracionInicial } from "@/app/acciones/acceso";
import { conRol } from "@/lib/db";

export const metadata = { title: "Configuración inicial" };
export const dynamic = "force-dynamic";

function Cuenta({ p, titulo, ayuda }: { p: string; titulo: string; ayuda: string }) {
  return (
    <fieldset className="space-y-3 border-t border-linea pt-4">
      <legend className="antetitulo pr-2">{titulo}</legend>
      <p className="text-xs text-gris">{ayuda}</p>
      <label className="campo"><span>Nombre</span><input name={`${p}_nombre`} className="entrada" required /></label>
      <label className="campo">
        <span>Usuario</span>
        <input name={`${p}_usuario`} className="entrada" autoCapitalize="none" pattern="[a-z0-9._\-]{3,40}" required />
        <span className="ayuda">Minúsculas sin tildes, números, punto o guion.</span>
      </label>
      <label className="campo"><span>Contraseña (mínimo 12 caracteres)</span><input name={`${p}_clave`} type="password" className="entrada" autoComplete="new-password" minLength={12} required /></label>
      <label className="campo"><span>Repita la contraseña</span><input name={`${p}_clave2`} type="password" className="entrada" autoComplete="new-password" minLength={12} required /></label>
    </fieldset>
  );
}

export default async function ConfiguracionInicial() {
  const hay = await conRol("auth", {}, async (tx) => (await tx.query("SELECT fn_hay_usuarios() AS h")).rows[0].h);
  if (hay) redirect("/ingresar");
  const habilitada = (process.env.CLAVE_CONFIGURACION || "").length >= 20;
  return (
    <>
      <h1 className="text-xl font-semibold">Configuración inicial</h1>
      {!habilitada ? (
        <p className="aviso mt-4 border-aviso bg-aviso-fondo">
          Para crear las primeras cuentas, defina en el servidor la variable <code>CLAVE_CONFIGURACION</code> (mínimo 20
          caracteres) y vuelva a cargar esta página. Consulte el README.
        </p>
      ) : (
        <>
          <p className="mt-2 text-sm text-gris">
            Se crean una cuenta de <strong>tesorería</strong> y una de <strong>consulta</strong>. Esta página deja de
            funcionar cuando existen cuentas.
          </p>
          <Formulario accion={accionConfiguracionInicial} boton="Crear cuentas" className="mt-5 space-y-5">
            <label className="campo">
              <span>Clave de configuración</span>
              <input name="clave_configuracion" type="password" className="entrada" autoComplete="off" required />
              <span className="ayuda">La definida en la variable CLAVE_CONFIGURACION del servidor.</span>
            </label>
            <Cuenta p="t" titulo="Cuenta de tesorería" ayuda="Puede registrar, verificar y administrar." />
            <Cuenta p="c" titulo="Cuenta de consulta" ayuda="Solo lectura de información agregada." />
          </Formulario>
        </>
      )}
    </>
  );
}
