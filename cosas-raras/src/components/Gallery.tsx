"use client";

import { useRef } from "react";
import Image from "next/image";
import { GALLERY } from "@/lib/content";
import Reveal from "./Reveal";

export default function Gallery() {
  const trackRef = useRef<HTMLDivElement>(null);

  const scrollBy = (dir: 1 | -1) => {
    trackRef.current?.scrollBy({ left: dir * 420, behavior: "smooth" });
  };

  return (
    <section id="historias" className="relative bg-cream py-28 md:py-36">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <Reveal>
              <p className="font-body text-xs font-semibold uppercase tracking-[0.35em] text-wine">
                En casas reales
              </p>
            </Reveal>
            <Reveal delay={0.1}>
              <h2 className="mt-4 max-w-lg font-display text-4xl font-black leading-[0.95] text-ink sm:text-5xl">
                Así se ve el estallido de luz.
              </h2>
            </Reveal>
          </div>

          <Reveal delay={0.2}>
            <div className="flex gap-3">
              <button
                data-cursor="lg"
                aria-label="Anterior"
                onClick={() => scrollBy(-1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:border-wine hover:text-wine"
              >
                ←
              </button>
              <button
                data-cursor="lg"
                aria-label="Siguiente"
                onClick={() => scrollBy(1)}
                className="flex h-11 w-11 items-center justify-center rounded-full border border-ink/20 text-ink transition-colors hover:border-wine hover:text-wine"
              >
                →
              </button>
            </div>
          </Reveal>
        </div>
      </div>

      <Reveal delay={0.15}>
        <div
          ref={trackRef}
          className="mt-14 flex snap-x snap-mandatory gap-6 overflow-x-auto px-6 pb-6 [-ms-overflow-style:none] [scrollbar-width:none] md:px-10 [&::-webkit-scrollbar]:hidden"
        >
          {GALLERY.map((g, i) => (
            <div
              key={i}
              className="group relative aspect-[4/5] w-[78vw] flex-none snap-center overflow-hidden rounded-2xl sm:w-[46vw] md:w-[30vw] lg:w-[24vw]"
            >
              <Image
                src={g.src}
                alt={g.caption}
                fill
                sizes="(min-width: 1024px) 24vw, (min-width: 640px) 46vw, 78vw"
                className="object-cover transition-transform duration-700 ease-out group-hover:scale-110"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-ink/80 via-ink/0 to-ink/0 opacity-70 transition-opacity duration-500 group-hover:opacity-90" />
              <p className="absolute bottom-5 left-5 font-body text-sm font-medium text-cream">
                {g.caption}
              </p>
            </div>
          ))}
        </div>
      </Reveal>
    </section>
  );
}
