import Image from "next/image";
import { ArrowDown, ArrowRight } from "lucide-react";
import { hero } from "@/lib/content";

export default function Hero() {
  return (
    <section
      id="inicio"
      className="relative overflow-hidden bg-verde-800 pt-28 text-crema lg:pt-0"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-verde-900 via-verde-800 to-verde-700" />
      <div className="absolute -left-24 top-10 h-72 w-72 rounded-full bg-rosa-500/10 blur-3xl" />
      <div className="absolute -right-10 bottom-0 h-96 w-96 rounded-full bg-verde-400/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-6xl items-center gap-10 px-6 pb-16 lg:min-h-screen lg:grid-cols-2 lg:gap-8 lg:pb-0">
        <div className="relative z-10 animate-fade-up">
          <span className="mb-6 inline-block rounded-full border border-rosa-300/40 bg-white/5 px-4 py-1.5 text-xs font-semibold uppercase tracking-[0.2em] text-rosa-200">
            {hero.marca}
          </span>

          <h1 className="font-display text-balance text-4xl font-semibold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
            {hero.nombre}
          </h1>

          <p className="mt-4 font-display text-xl italic text-rosa-200 sm:text-2xl">{hero.descriptor}</p>

          <p className="mt-6 max-w-lg text-balance text-lg leading-relaxed text-crema/85">{hero.subtitulo}</p>

          <p className="mt-6 max-w-lg border-l-2 border-rosa-400 pl-4 text-base font-medium italic text-crema/90">
            {hero.slogan}
          </p>

          <div className="mt-9 flex flex-wrap items-center gap-4">
            <a
              href="#contacto"
              className="group inline-flex items-center gap-2 rounded-full bg-rosa-500 px-7 py-3.5 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-rosa-600"
            >
              {hero.ctaPrincipal}
              <ArrowRight size={18} className="transition group-hover:translate-x-1" />
            </a>
            <a
              href="#metodo"
              className="inline-flex items-center gap-2 rounded-full border border-crema/30 px-7 py-3.5 text-base font-medium text-crema/90 transition hover:border-crema hover:bg-white/5"
            >
              {hero.ctaSecundario}
            </a>
          </div>
        </div>

        <div className="relative z-10 mx-auto w-full max-w-sm lg:max-w-md">
          <div className="absolute -inset-6 rounded-[2.5rem] bg-rosa-400/10 blur-2xl" />
          <div className="relative overflow-hidden rounded-[2rem] border border-white/10 shadow-soft">
            <Image
              src="/images/carolina-hero.jpeg"
              alt="Carolina Melo Arévalo, facilitadora del Método Conversemos"
              width={1067}
              height={1599}
              priority
              className="h-full w-full object-cover"
              sizes="(min-width: 1024px) 420px, 90vw"
            />
          </div>
        </div>
      </div>

      <a
        href="#problema"
        aria-label="Bajar a la siguiente sección"
        className="absolute bottom-6 left-1/2 hidden -translate-x-1/2 animate-float text-crema/60 transition hover:text-crema lg:block"
      >
        <ArrowDown size={22} />
      </a>
    </section>
  );
}
