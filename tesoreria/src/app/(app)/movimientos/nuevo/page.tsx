import { exigirTesoreriaPagina, leer } from "@/lib/sesion";
import { datosFormMovimiento } from "@/lib/datos/formMovimiento";
import { FormMovimiento } from "@/components/FormMovimiento";
import { accionGuardarMovimiento } from "@/app/acciones/movimientos";
import { Aviso, Encabezado } from "@/components/ui";
import { hoyCO } from "@/lib/fechas";
import Link from "next/link";

export const metadata = { title: "Registrar movimiento" };

export default async function Nuevo({ searchParams }: { searchParams: Promise<Record<string, string>> }) {
  await exigirTesoreriaPagina();
  const sp = await searchParams;
  const datos = await leer((tx) => datosFormMovimiento(tx));
  const n = (k: string) => (/^\d+$/.test(sp[k] ?? "") ? Number(sp[k]) : undefined);
  const tipo = (["ingreso", "egreso", "traslado"] as const).find((t) => t === sp.tipo);
  const ob = datos.obligaciones.find((o) => o.id === n("obligacion"));
  const prefOb = ob
    ? { tipo: "egreso" as const, obligacion_id: ob.id, categoria_id: ob.categoria_id, fondo_id: ob.fondo_id, tercero: ob.tercero, concepto: `Pago: ${ob.descripcion}`, valor: ob.saldo }
    : {};
  return (
    <>
      <Encabezado antetitulo="Movimientos" titulo="Registrar movimiento" />
      {datos.cuentas.length === 0 ? (
        <Aviso tono="aviso">Primero registre al menos una cuenta en <Link href="/configuracion#cuentas">Configuración</Link>.</Aviso>
      ) : (
        <FormMovimiento
          datos={datos}
          accion={accionGuardarMovimiento}
          hoy={hoyCO()}
          valores={{ tipo, miembro_id: n("miembro"), reembolsa_a: n("reembolso"), ...prefOb }}
        />
      )}
    </>
  );
}
