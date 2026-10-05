"use client";

// Botón de envío que pide confirmación antes de borrar algo.
export default function BotonConfirmar({
  mensaje = "¿Seguro que desea eliminarlo?",
  children = "Eliminar",
  className = "btn-mini text-red-700 hover:bg-red-50",
}: {
  mensaje?: string;
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!confirm(mensaje)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
