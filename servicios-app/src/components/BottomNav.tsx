"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const ITEMS = [
  { href: "/", label: "Inicio", icono: "🏠" },
  { href: "/calendario", label: "Calendario", icono: "🗓️" },
];

export default function BottomNav() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-black/10 bg-white/95 backdrop-blur">
      <div className="mx-auto flex max-w-2xl">
        {ITEMS.map((item) => {
          const activo = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-1 flex-col items-center gap-1 py-3 text-base font-semibold ${
                activo ? "text-marca-700" : "text-neutral-500"
              }`}
            >
              <span className="text-2xl leading-none">{item.icono}</span>
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
