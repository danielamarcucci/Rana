import { exigirTesoreriaPagina } from "@/lib/sesion";
import { Encabezado } from "@/components/ui";
import { FormEsquema } from "@/components/FormEsquema";

export const metadata = { title: "Nuevo esquema de aportes" };

export default async function NuevoEsquema({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirTesoreriaPagina();
  const tipo = (await searchParams).tipo === "mensual" ? "mensual" : "constitucion";
  return (
    <>
      <Encabezado antetitulo="Aportes" titulo={tipo === "mensual" ? "Nuevo esquema mensual" : "Nuevo esquema de constitución"}
        descripcion="Puede registrarlo como propuesta y marcarlo como aprobado cuando exista el acuerdo. Montos y fechas no definidos pueden quedar en blanco." />
      <FormEsquema tipo={tipo} />
    </>
  );
}
