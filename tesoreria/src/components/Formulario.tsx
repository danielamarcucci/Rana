"use client";

import { useActionState, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";
import type { EstadoAccion } from "@/lib/tipos";

type Props = {
  accion: (prev: EstadoAccion, datos: FormData) => Promise<EstadoAccion>;
  children: React.ReactNode;
  boton?: string;
  claseBoton?: string;
  className?: string;
  confirmar?: string;
  limpiarAlTerminar?: boolean;
  enLinea?: boolean;
};

export function BotonEnviar({ children, className = "btn-primario" }: { children: React.ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" className={className} disabled={pending} aria-busy={pending}>
      {pending ? "Guardando…" : children}
    </button>
  );
}

export function Mensajes({ estado }: { estado: EstadoAccion }) {
  if (!estado?.error && !estado?.ok) return null;
  return (
    <p
      role={estado.error ? "alert" : "status"}
      className={`aviso mt-3 ${estado.error ? "border-alerta bg-alerta-fondo text-alerta" : "border-olivo-vivo bg-suave text-olivo"}`}
    >
      {estado.error || estado.ok}
    </p>
  );
}

/** Formulario que envía a una acción del servidor y muestra el resultado. */
export function Formulario({
  accion, children, boton = "Guardar", claseBoton, className = "", confirmar, limpiarAlTerminar, enLinea,
}: Props) {
  const [estado, despachar] = useActionState(accion, undefined);
  const ref = useRef<HTMLFormElement>(null);
  useEffect(() => {
    if (estado?.ok && limpiarAlTerminar) ref.current?.reset();
  }, [estado, limpiarAlTerminar]);
  return (
    <form
      ref={ref}
      action={despachar}
      className={className}
      onSubmit={(e) => {
        if (confirmar && !window.confirm(confirmar)) e.preventDefault();
      }}
    >
      {children}
      <div className={enLinea ? "inline" : "mt-4 flex flex-wrap items-center gap-3"}>
        <BotonEnviar className={claseBoton}>{boton}</BotonEnviar>
      </div>
      <Mensajes estado={estado} />
    </form>
  );
}
