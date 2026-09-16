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
      className={`rounded-lg border bg-white px-3 py-2.5 shadow-card ${
        acento === "naranja" ? "border-naranja-200" : "border-azul-100"
      }`}
    >
      <p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-500">{etiqueta}</p>
      <p className={`text-lg font-bold leading-tight ${acento === "naranja" ? "text-naranja-600" : "text-azul-900"}`}>
        {valor}
      </p>
      {detalle && <p className="truncate text-[10px] text-slate-500">{detalle}</p>}
    </div>
  );
}
