import { listCasos } from "@/lib/casos";
import { CasosTable } from "@/components/admin/CasosTable";

export default async function AdminDashboardPage() {
  const casos = await listCasos();
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-hoja-800">Matriz de casos</h1>
        <p className="text-tierra-500 text-sm">
          Denuncias recibidas por la Red Nacional de Defensa por la Reforma Agraria.
        </p>
      </div>
      <CasosTable casosIniciales={casos} />
    </div>
  );
}
