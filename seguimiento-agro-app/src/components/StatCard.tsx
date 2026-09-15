export default function StatCard({
  etiqueta,
  valor,
  detalle,
  acento = "azul",
}: {
  etiqueta: string;
  valor: string;
  detalle?: string;
  acento?: "azul" | "naranja";
}) {
  return (
    <div
      className={`rounded-xl border bg-white p-4 shadow-card ${
        acento === "naranja" ? "border-naranja-200" : "border-azul-100"
      }`}
    >
      <p className="text-xs font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className={`mt-1 text-2xl font-bold ${acento === "naranja" ? "text-naranja-600" : "text-azul-900"}`}>
        {valor}
      </p>
      {detalle && <p className="mt-0.5 text-xs text-slate-500">{detalle}</p>}
    </div>
  );
}
