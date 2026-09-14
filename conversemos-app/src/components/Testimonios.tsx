import { Quote } from "lucide-react";
import Reveal from "./Reveal";
import { testimonios } from "@/lib/testimonios";

export default function Testimonios() {
  if (testimonios.length === 0) {
    return (
      <section id="testimonios" className="bg-verde-50 px-6 py-20">
        <div className="mx-auto max-w-2xl text-center">
          <Reveal>
            <Quote className="mx-auto mb-4 text-rosa-400" size={32} />
            <p className="font-display text-xl italic text-verde-800">
              Los testimonios de los procesos en curso se publicarán aquí próximamente.
            </p>
            <p className="mt-3 text-sm text-tinta/60">
              Mientras tanto, escríbeme y con gusto te cuento sobre experiencias recientes.
            </p>
          </Reveal>
        </div>
      </section>
    );
  }

  return (
    <section id="testimonios" className="bg-verde-50 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-semibold text-verde-800">Lo que dicen los equipos</h2>
        </Reveal>
        <div className="mt-12 grid gap-6 sm:grid-cols-2">
          {testimonios.map((t, i) => (
            <Reveal key={t.autor} delay={i * 100}>
              <div className="h-full rounded-2xl bg-white p-7 shadow-card ring-1 ring-verde-100/60">
                <Quote className="text-rosa-300" size={28} />
                <p className="mt-4 text-[15px] leading-relaxed text-tinta/80">“{t.frase}”</p>
                <p className="mt-5 text-sm font-semibold text-verde-700">
                  {t.autor} · <span className="font-normal text-tinta/60">{t.organizacion}</span>
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
