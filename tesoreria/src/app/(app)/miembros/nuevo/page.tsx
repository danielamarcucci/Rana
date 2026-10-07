import { exigirTesoreriaPagina } from "@/lib/sesion";
import { Encabezado } from "@/components/ui";
import { FormMiembro } from "@/components/FormMiembro";

export const metadata = { title: "Nuevo miembro" };

export default async function NuevoMiembro() {
  await exigirTesoreriaPagina();
  return (
    <>
      <Encabezado antetitulo="Miembros y aportantes" titulo="Registrar" />
      <div className="max-w-3xl"><FormMiembro /></div>
    </>
  );
}
