import Link from "next/link";
import { pesos } from "@/lib/dinero";
import { ETIQUETA_SITUACION, type Situacion } from "@/lib/calculos";

export function Encabezado({
  titulo, antetitulo, descripcion, acciones,
}: { titulo: string; antetitulo?: string; descripcion?: React.ReactNode; acciones?: React.ReactNode }) {
  return (
    <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        {antetitulo && <p className="antetitulo mb-1.5">{antetitulo}</p>}
        <h1 className="titular text-[30px] sm:text-[38px]">{titulo}</h1>
        {descripcion && <p className="mt-2 max-w-3xl text-sm text-gris">{descripcion}</p>}
      </div>
      {acciones && <div className="flex flex-wrap gap-2">{acciones}</div>}
    </header>
  );
}

/** Cifra destacada, sin tarjeta: etiqueta, valor y nota. */
export function Cifra({
  etiqueta, valor, nota, tono = "normal", grande,
}: { etiqueta: string; valor: number; nota?: React.ReactNode; tono?: "normal" | "ingreso" | "egreso" | "aviso" | "suave"; grande?: boolean }) {
  const color = {
    normal: "text-tinta",
    ingreso: "text-olivo",
    egreso: "text-tierra",
    aviso: "text-aviso",
    suave: "text-gris",
  }[tono];
  return (
    <div className="min-w-0">
      <p className="etiqueta">{etiqueta}</p>
      <p className={`num mt-1 font-semibold tracking-tight ${grande ? "text-[28px] sm:text-[32px]" : "text-[21px]"} ${color}`}>
        {pesos(valor)}
      </p>
      {nota && <p className="mt-0.5 text-xs text-gris">{nota}</p>}
    </div>
  );
}

export function Insignia({ children, tono = "neutro" }: { children: React.ReactNode; tono?: "neutro" | "ok" | "aviso" | "alerta" | "suave" | "ocre" }) {
  const c = {
    neutro: "bg-suave text-olivo",
    ok: "bg-[#E6EED3] text-[#3D4A22]",
    aviso: "bg-aviso-fondo text-aviso",
    alerta: "bg-alerta-fondo text-alerta",
    suave: "bg-tenue text-gris border border-linea",
    ocre: "bg-[#F6EAD6] text-ocre-texto",
  }[tono];
  return <span className={`insignia ${c}`}>{children}</span>;
}

export function EstadoMovimiento({ estado, historico }: { estado: string; historico?: boolean }) {
  if (estado === "anulado") return <Insignia tono="suave">Anulado</Insignia>;
  if (estado === "pendiente") return <Insignia tono="aviso">Por verificar</Insignia>;
  if (historico) return <Insignia tono="suave">Incluido en saldo inicial</Insignia>;
  return <Insignia tono="ok">Verificado</Insignia>;
}

export function SituacionCompromiso({ s }: { s: Situacion }) {
  const tono = { completo: "ok", parcial: "ocre", pendiente: "neutro", vencido: "aviso", anulado: "suave" } as const;
  return <Insignia tono={tono[s]}>{ETIQUETA_SITUACION[s]}</Insignia>;
}

export function Aviso({ children, tono = "info" }: { children: React.ReactNode; tono?: "info" | "aviso" | "alerta" }) {
  const c = {
    info: "border-olivo-vivo bg-white text-tinta",
    aviso: "border-ocre bg-aviso-fondo text-tinta",
    alerta: "border-alerta bg-alerta-fondo text-tinta",
  }[tono];
  return <div className={`aviso ${c}`}>{children}</div>;
}

export function Vacio({ children }: { children: React.ReactNode }) {
  return <p className="rounded-md border border-dashed border-linea px-4 py-6 text-center text-sm text-gris">{children}</p>;
}

export function Seccion({
  titulo, children, acciones, nota, id,
}: { titulo: string; children: React.ReactNode; acciones?: React.ReactNode; nota?: React.ReactNode; id?: string }) {
  return (
    <section className="seccion min-w-0" id={id}>
      <div className="seccion-titulo">
        <h2>{titulo}</h2>
        {acciones && <div className="flex flex-wrap items-center gap-3 text-sm">{acciones}</div>}
      </div>
      {nota && <p className="-mt-1 mb-3 text-xs text-gris">{nota}</p>}
      <div className="overflow-x-auto">{children}</div>
    </section>
  );
}

export function TablaContenedor({ children }: { children: React.ReactNode }) {
  return <div className="panel overflow-x-auto">{children}</div>;
}

/** Barra de avance discreta. */
export function Avance({ valor, total, etiqueta }: { valor: number; total: number; etiqueta?: string }) {
  const p = total > 0 ? Math.min(100, Math.floor((valor * 100) / total)) : 0;
  return (
    <div>
      <div className="h-2 overflow-hidden rounded-full bg-suave" role="progressbar" aria-valuenow={p} aria-valuemin={0} aria-valuemax={100} aria-label={etiqueta}>
        <div className="h-full rounded-full bg-olivo-vivo" style={{ width: `${p}%` }} />
      </div>
      <p className="mt-1 text-xs text-gris">
        {pesos(valor)} de {pesos(total)} · {p}%
      </p>
    </div>
  );
}

export function codigoMov(id: number | string) {
  return `MOV-${String(id).padStart(5, "0")}`;
}

export function EnlaceMov({ id }: { id: number }) {
  return <Link href={`/movimientos/${id}`} className="num font-semibold no-underline hover:underline">{codigoMov(id)}</Link>;
}
