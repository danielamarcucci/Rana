import { ArrowRight } from "lucide-react";
import Reveal from "./Reveal";
import { proceso } from "@/lib/content";

export default function Proceso() {
  return (
    <section id="proceso" className="relative overflow-hidden bg-verde-800 px-6 py-24 text-crema">
      <div className="pointer-events-none absolute -right-24 top-1/3 h-80 w-80 rounded-full bg-rosa-500/10 blur-3xl" />

      <div className="relative mx-auto max-w-6xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-semibold sm:text-4xl">{proceso.titular}</h2>
        </Reveal>

        <div className="mt-16 grid gap-8 sm:grid-cols-5 sm:gap-4">
          {proceso.pasos.map((paso, i) => (
            <Reveal key={paso.numero} delay={i * 90} className="relative">
              {i < proceso.pasos.length - 1 && (
                <div className="absolute left-1/2 top-8 hidden h-px w-full bg-crema/20 sm:block" />
              )}
              <div className="relative z-10 flex flex-col items-center text-center">
                <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-crema/30 bg-verde-800 font-display text-2xl font-semibold">
                  {paso.numero}
                  {paso.etiqueta && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-rosa-500 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white shadow-card">
                      {paso.etiqueta}
                    </span>
                  )}
                </div>
                <h3 className="mt-5 font-display text-lg font-semibold">{paso.titulo}</h3>
                <p className="mt-2 text-sm leading-relaxed text-crema/70">{paso.texto}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={200}>
          <p className="mt-16 text-center text-sm text-crema/60">{proceso.nota}</p>
        </Reveal>

        <Reveal delay={260}>
          <div className="mt-8 flex flex-col items-center gap-3">
            <a
              href="#contacto"
              className="group inline-flex items-center gap-2 rounded-full bg-rosa-500 px-7 py-3.5 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-rosa-600"
            >
              {proceso.ctaDestacado}
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </a>
            <span className="text-sm font-medium text-rosa-200">{proceso.notaGratuita}</span>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
