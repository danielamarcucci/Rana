function colorPorAvance(avance: number) {
  if (avance >= 100) return "bg-avance-completo";
  if (avance >= 60) return "bg-avance-alto";
  if (avance >= 30) return "bg-avance-medio";
  return "bg-avance-bajo";
}

export default function ProgressBar({ valor, tamano = "md" }: { valor: number; tamano?: "sm" | "md" }) {
  const pct = Math.max(0, Math.min(100, valor));
  return (
    <div className="flex items-center gap-2">
      <div className={`flex-1 overflow-hidden rounded-full bg-azul-100 ${tamano === "sm" ? "h-1.5" : "h-2.5"}`}>
        <div
          className={`h-full rounded-full ${colorPorAvance(pct)} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="w-10 shrink-0 text-right text-xs font-semibold text-azul-900">{pct}%</span>
    </div>
  );
}
