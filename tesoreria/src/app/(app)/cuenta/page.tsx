import { exigirSesion } from "@/lib/sesion";
import { Encabezado } from "@/components/ui";
import { Formulario } from "@/components/Formulario";
import { accionCambiarMiClave } from "@/app/acciones/acceso";

export const metadata = { title: "Mi cuenta" };

export default async function MiCuenta() {
  const s = await exigirSesion();
  return (
    <>
      <Encabezado antetitulo={`${s.nombre} · ${s.rol === "tesoreria" ? "Tesorería" : "Consulta"}`} titulo="Cambiar contraseña" />
      <Formulario accion={accionCambiarMiClave} boton="Cambiar contraseña" className="max-w-md space-y-4" limpiarAlTerminar>
        <label className="campo"><span>Contraseña actual</span><input type="password" name="actual" className="entrada" autoComplete="current-password" required /></label>
        <label className="campo"><span>Nueva contraseña (mínimo 12 caracteres)</span><input type="password" name="clave" className="entrada" autoComplete="new-password" minLength={12} required /></label>
        <label className="campo"><span>Repita la nueva contraseña</span><input type="password" name="clave2" className="entrada" autoComplete="new-password" minLength={12} required /></label>
      </Formulario>
    </>
  );
}
