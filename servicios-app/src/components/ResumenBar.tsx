export default function ResumenBar({
  pagados,
  total,
  mesLabel,
}: {
  pagados: number;
  total: number;
  mesLabel: string;
}) {
  const porcentaje = total > 0 ? Math.round((pagados / total) * 100) : 0;
  const completo = pagados === total && total > 0;

  return (
    <div className="rounded-2xl bg-white p-5 shadow-card">
      <p className="text-sm font-semibold uppercase tracking-wide text-neutral-500">{mesLabel}</p>
      <p className="mt-1 text-3xl font-extrabold text-neutral-900">
        {pagados} de {total} pagados
      </p>
      <div className="mt-3 h-4 w-full overflow-hidden rounded-full bg-neutral-100">
        <div
          className={`h-full rounded-full transition-all ${completo ? "bg-pagado-500" : "bg-marca-500"}`}
          style={{ width: `${porcentaje}%` }}
        />
      </div>
      {completo ? (
        <p className="mt-3 text-base font-semibold text-pagado-700">🎉 ¡Todo pagado este mes!</p>
      ) : (
        <p className="mt-3 text-base font-semibold text-pendiente-700">
          Faltan {total - pagados} por pagar
        </p>
      )}
    </div>
  );
}
