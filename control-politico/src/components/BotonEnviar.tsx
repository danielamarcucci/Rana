"use client";

import { useFormStatus } from "react-dom";

export default function BotonEnviar({
  children,
  className = "btn-primario",
  pendiente = "Guardando…",
  ...resto
}: React.ButtonHTMLAttributes<HTMLButtonElement> & { pendiente?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className={className} {...resto}>
      {pending ? pendiente : children}
    </button>
  );
}
