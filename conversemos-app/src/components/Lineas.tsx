"use client";

import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
import { lineas } from "@/lib/content";

const bandStyles = [
  "bg-verde-100 text-verde-900",
  "bg-verde-400 text-white",
  "bg-verde-800 text-crema",
];

const numberStyles = [
  "bg-verde-800 text-crema",
  "bg-white text-verde-700",
  "bg-rosa-500 text-white",
];

const buttonStyles = [
  "bg-verde-800 text-crema hover:bg-verde-900",
  "bg-white text-verde-700 hover:bg-crema",
  "bg-rosa-500 text-white hover:bg-rosa-600",
];

export function elegirLinea(numero: number) {
  window.dispatchEvent(new CustomEvent("conversemos:linea", { detail: numero }));
  document.querySelector("#contacto")?.scrollIntoView({ behavior: "smooth" });
}

export default function Lineas() {
  return (
    <section id="lineas" className="bg-crema px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-semibold text-verde-800 sm:text-4xl">
            {lineas.titular}
          </h2>
        </Reveal>

        <div className="mt-14 space-y-5">
          {lineas.items.map((item, i) => (
            <Reveal key={item.numero} delay={i * 100}>
              <div className={`flex flex-col gap-6 rounded-2xl p-8 shadow-card sm:flex-row sm:items-center ${bandStyles[i]}`}>
                <div
                  className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-full font-display text-2xl font-bold ${numberStyles[i]}`}
                >
                  {item.numero}
                </div>
                <div className="flex-1">
                  <h3 className="font-display text-xl font-semibold">{item.titulo}</h3>
                  <p className="mt-2 text-[15px] leading-relaxed opacity-85">{item.texto}</p>
                </div>
                <button
                  type="button"
                  onClick={() => elegirLinea(item.numero)}
                  className={`group inline-flex shrink-0 items-center gap-2 self-start rounded-full px-5 py-2.5 text-sm font-semibold transition sm:self-center ${buttonStyles[i]}`}
                >
                  {lineas.cta}
                  <ArrowRight size={16} className="transition group-hover:translate-x-1" />
                </button>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <p className="mx-auto mt-10 max-w-xl text-balance text-center text-sm text-tinta/60">{lineas.nota}</p>
        </Reveal>
      </div>
    </section>
  );
}
