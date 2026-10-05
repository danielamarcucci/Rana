"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function Pestanas({ base, pestanas }: { base: string; pestanas: { ruta: string; etiqueta: string; contador?: string }[] }) {
  const ruta = usePathname();
  return (
    <nav className="no-imprimir -mb-px flex gap-1 overflow-x-auto">
      {pestanas.map((p) => {
        const href = base + p.ruta;
        const activa = p.ruta === "" ? ruta === base : ruta.startsWith(href);
        return (
          <Link
            key={p.ruta}
            href={href}
            className={`whitespace-nowrap border-b-2 px-3 py-2.5 text-sm font-semibold transition ${
              activa ? "border-marca-700 text-marca-800" : "border-transparent text-neutral-500 hover:text-neutral-800"
            }`}
          >
            {p.etiqueta}
            {p.contador && <span className="ml-1.5 rounded-full bg-neutral-100 px-1.5 py-0.5 text-xs text-neutral-600">{p.contador}</span>}
          </Link>
        );
      })}
    </nav>
  );
}
