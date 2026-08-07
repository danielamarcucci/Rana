"use client";

import { useRouter } from "next/navigation";

export function CerrarSesionBoton() {
  const router = useRouter();
  async function salir() {
    await fetch("/api/admin/logout", { method: "POST" });
    router.push("/admin/login");
    router.refresh();
  }
  return (
    <button onClick={salir} className="btn-secondary !bg-transparent !text-white !border-hoja-500 hover:!bg-hoja-700">
      Cerrar sesión
    </button>
  );
}
