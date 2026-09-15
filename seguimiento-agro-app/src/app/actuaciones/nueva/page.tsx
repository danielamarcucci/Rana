import ActuacionForm from "@/components/ActuacionForm";

export default function NuevaActuacionPage() {
  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="mb-1 text-2xl font-bold text-azul-900">Nueva actuación</h1>
      <p className="mb-6 text-sm text-slate-600">
        Registre un plan, programa, convenio o línea de acción para hacerle seguimiento.
      </p>
      <div className="rounded-xl border border-azul-100 bg-white p-6 shadow-card">
        <ActuacionForm />
      </div>
    </div>
  );
}
