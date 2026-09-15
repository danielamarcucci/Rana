const ESTILOS_TIPO: Record<string, string> = {
  plan: "bg-azul-100 text-azul-800",
  programa: "bg-naranja-100 text-naranja-800",
  convenio: "bg-emerald-100 text-emerald-800",
  linea: "bg-purple-100 text-purple-800",
};

const ESTILOS_ESTADO: Record<string, string> = {
  formulacion: "bg-slate-100 text-slate-700",
  en_ejecucion: "bg-azul-100 text-azul-800",
  suspendido: "bg-red-100 text-red-700",
  finalizado: "bg-emerald-100 text-emerald-800",
};

export function BadgeTipo({ tipo, etiqueta }: { tipo: string; etiqueta: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ESTILOS_TIPO[tipo] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {etiqueta}
    </span>
  );
}

export function BadgeEstado({ estado, etiqueta }: { estado: string; etiqueta: string }) {
  return (
    <span
      className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        ESTILOS_ESTADO[estado] ?? "bg-slate-100 text-slate-700"
      }`}
    >
      {etiqueta}
    </span>
  );
}
