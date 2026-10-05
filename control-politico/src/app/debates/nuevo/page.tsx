import Link from "next/link";
import { crearDebateAccion } from "@/app/actions";
import FormularioDebate from "@/components/FormularioDebate";
import { obtenerConfiguracion } from "@/lib/configuracion";

export const dynamic = "force-dynamic";

export default async function NuevoDebate() {
  const cfg = await obtenerConfiguracion();
  return (
    <main className="mx-auto max-w-3xl">
      <Link href="/" className="text-sm font-semibold text-marca-700">‹ Debates</Link>
      <h1 className="mb-1 mt-2 text-2xl font-bold">Nuevo debate</h1>
      <p className="mb-5 text-sm text-neutral-500">
        Solo el título es obligatorio. Lo demás se puede completar después; los citados y el cuestionario se agregan en el siguiente paso.
      </p>
      <div className="tarjeta">
        <FormularioDebate
          accion={crearDebateAccion}
          municipioPorDefecto={cfg.municipio}
          citantesPorDefecto={cfg.concejal}
          textoBoton="Crear debate"
        />
      </div>
    </main>
  );
}
