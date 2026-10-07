"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const COMUNES = [
  { href: "/", texto: "Resumen" },
  { href: "/aportes", texto: "Aportes" },
  { href: "/movimientos", texto: "Movimientos" },
  { href: "/presupuesto", texto: "Presupuesto" },
  { href: "/informes", texto: "Informes" },
];
const TESORERIA = [
  { href: "/miembros", texto: "Miembros" },
  { href: "/configuracion", texto: "Configuración" },
];

export function Navegacion({ tesoreria }: { tesoreria: boolean }) {
  const ruta = usePathname();
  const items = tesoreria ? [...COMUNES, ...TESORERIA] : COMUNES;
  return (
    <nav aria-label="Secciones" className="-mb-px flex gap-1 overflow-x-auto [scrollbar-width:none] sm:gap-2">
      {items.map((i) => {
        const activo = i.href === "/" ? ruta === "/" : ruta.startsWith(i.href);
        return (
          <Link
            key={i.href}
            href={i.href}
            aria-current={activo ? "page" : undefined}
            className={`whitespace-nowrap border-b-[3px] px-2.5 py-2.5 text-[14.5px] font-semibold no-underline transition-colors sm:px-3 ${
              activo ? "border-ocre text-olivo" : "border-transparent text-gris hover:border-linea hover:text-olivo"
            }`}
          >
            {i.texto}
          </Link>
        );
      })}
    </nav>
  );
}
