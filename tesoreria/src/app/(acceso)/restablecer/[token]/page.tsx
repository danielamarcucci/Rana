import { Formulario } from "@/components/Formulario";
import { accionRestablecer } from "@/app/acciones/acceso";
import { conRol } from "@/lib/db";
import { hashToken } from "@/lib/claves";

export const metadata = { title: "Nueva contraseña" };
export const dynamic = "force-dynamic";

export default async function Restablecer({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const { rows } = await conRol("auth", {}, (tx) =>
    tx.query("SELECT usuario, nombre FROM fn_validar_restablecimiento($1)", [hashToken(token)]),
  );
  const u = rows[0];
  if (!u) {
    return (
      <>
        <h1 className="text-xl font-semibold">Enlace no válido</h1>
        <p className="mt-3 text-sm text-gris">El enlace ya se usó o venció. Solicite uno nuevo a tesorería.</p>
      </>
    );
  }
  return (
    <>
      <h1 className="text-xl font-semibold">Definir contraseña</h1>
      <p className="mt-2 text-sm text-gris">
        Cuenta <strong className="text-tinta">{u.usuario}</strong> ({u.nombre}). Use al menos 12 caracteres; una frase fácil
        de recordar funciona bien.
      </p>
      <Formulario accion={accionRestablecer} boton="Guardar contraseña" className="mt-5 space-y-4">
        <input type="hidden" name="token" value={token} />
        <label className="campo">
          <span>Nueva contraseña</span>
          <input name="clave" type="password" className="entrada" autoComplete="new-password" minLength={12} required />
        </label>
        <label className="campo">
          <span>Repita la contraseña</span>
          <input name="clave2" type="password" className="entrada" autoComplete="new-password" minLength={12} required />
        </label>
      </Formulario>
    </>
  );
}
