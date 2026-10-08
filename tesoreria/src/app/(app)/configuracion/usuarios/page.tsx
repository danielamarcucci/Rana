import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { fechaHora } from "@/lib/fechas";
import { Encabezado, Insignia, Seccion, TablaContenedor } from "@/components/ui";
import { Formulario } from "@/components/Formulario";
import { accionActivarUsuario, accionCrearConsulta, accionEnlaceRestablecer } from "@/app/acciones/configuracion";

export const metadata = { title: "Cuentas de acceso" };

export default async function Usuarios() {
  const yo = await exigirTesoreriaPagina();
  const us = await leer(async (tx) => (await tx.query(
    `SELECT u.id, u.usuario, u.nombre, u.rol, u.activo, u.creado_en, u.ultimo_acceso, u.clave_cambiada_en,
            (SELECT count(*) FROM sesiones s WHERE s.usuario_id = u.id AND s.expira_en > now())::int AS sesiones
       FROM usuarios u ORDER BY u.rol DESC, u.activo DESC, u.nombre`)).rows);
  return (
    <>
      <Encabezado antetitulo="Configuración" titulo="Cuentas de acceso"
        descripcion="Dos roles: tesorería (registra y administra) y consulta (solo lectura agregada). Desde aquí se crean y administran cuentas de consulta individuales. Las cuentas de tesorería se crean o recuperan con el procedimiento administrativo del README." />
      <TablaContenedor>
        <table className="tabla">
          <thead><tr><th>Persona</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th>Acciones</th></tr></thead>
          <tbody>
            {us.map((u) => (
              <tr key={u.id}>
                <td className="font-semibold">{u.nombre}<span className="block text-xs font-normal text-gris">{u.usuario}{u.id === yo.usuarioId ? " · usted" : ""}</span></td>
                <td>{u.rol === "tesoreria" ? <Insignia tono="ocre">Tesorería</Insignia> : <Insignia>Consulta</Insignia>}</td>
                <td>{u.activo ? <Insignia tono="ok">Activa</Insignia> : <Insignia tono="suave">Desactivada</Insignia>}</td>
                <td className="text-xs">{fechaHora(u.ultimo_acceso)}{u.sesiones ? ` · ${u.sesiones} sesión(es) abierta(s)` : ""}</td>
                <td className="min-w-[14rem] text-xs">
                  {u.rol === "consulta" && (
                    <div className="space-y-2">
                      <Formulario accion={accionEnlaceRestablecer} boton="Generar enlace para nueva contraseña" claseBoton="btn-enlace" enLinea>
                        <input type="hidden" name="id" value={u.id} />
                      </Formulario>
                      <Formulario accion={accionActivarUsuario} boton={u.activo ? "Desactivar y cerrar sesiones" : "Reactivar"} claseBoton={u.activo ? "btn-enlace text-alerta" : "btn-enlace"} enLinea
                        confirmar={u.activo ? "¿Desactivar esta cuenta?" : undefined}>
                        <input type="hidden" name="id" value={u.id} />
                        <input type="hidden" name="activo" value={u.activo ? "0" : "1"} />
                      </Formulario>
                    </div>
                  )}
                  {u.rol === "tesoreria" && <span className="text-gris">Procedimiento administrativo</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </TablaContenedor>

      <Seccion titulo="Nueva cuenta de consulta">
        <p className="mb-3 max-w-2xl text-sm text-gris">
          La cuenta se crea sin contraseña conocida. Se genera un enlace de un solo uso, que vence en 72 horas, para que la persona
          defina su propia contraseña. Entréguelo por un canal seguro; tesorería nunca conoce la contraseña.
        </p>
        <Formulario accion={accionCrearConsulta} boton="Crear cuenta y generar enlace" className="grid max-w-2xl gap-3 sm:grid-cols-2" limpiarAlTerminar>
          <label className="campo"><span>Nombre de la persona</span><input name="nombre" className="entrada" required /></label>
          <label className="campo"><span>Usuario</span><input name="usuario" className="entrada" required pattern="[a-z0-9._\-]{3,40}" autoCapitalize="none" placeholder="p. ej. fiscal.junta" /></label>
        </Formulario>
      </Seccion>
    </>
  );
}
