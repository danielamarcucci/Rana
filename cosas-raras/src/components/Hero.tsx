"use client";

import { useRef } from "react";
import Image from "next/image";
import {
  motion,
  useMotionValue,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { waLink } from "@/lib/content";

export default function Hero() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0.5);
  const my = useMotionValue(0.5);
  const smx = useSpring(mx, { stiffness: 40, damping: 20 });
  const smy = useSpring(my, { stiffness: 40, damping: 20 });

  const glowX = useTransform(smx, (v) => `${v * 100}%`);
  const glowY = useTransform(smy, (v) => `${v * 100}%`);
  const parallaxX = useTransform(smx, [0, 1], [-16, 16]);
  const parallaxY = useTransform(smy, [0, 1], [-12, 12]);

  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ["start start", "end start"],
  });
  const imgY = useTransform(scrollYProgress, [0, 1], ["0%", "22%"]);
  const fade = useTransform(scrollYProgress, [0, 0.85], [1, 0]);

  const onMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width);
    my.set((e.clientY - rect.top) / rect.height);
  };

  return (
    <section
      id="top"
      ref={sectionRef}
      onMouseMove={onMouseMove}
      className="relative flex min-h-[100svh] w-full items-end overflow-hidden bg-ink"
    >
      {/* background photo */}
      <motion.div className="absolute inset-0" style={{ y: imgY }}>
        <Image
          src="/images/hero-main.webp"
          alt="Lámpara Cosas Raras encendida, proyectando un estallido de luz sobre el techo"
          fill
          priority
          sizes="100vw"
          className="object-cover object-[50%_20%] opacity-[0.55]"
        />
      </motion.div>

      <div className="absolute inset-0 bg-gradient-to-t from-ink via-ink/70 to-ink/20" />
      <div className="absolute inset-0 bg-gradient-to-r from-ink/70 via-transparent to-ink/50" />

      {/* animated rays, echoing the lamp's own light pattern */}
      <div
        className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <div className="animate-spin-slow rays h-[130vmin] w-[130vmin] opacity-[0.05]" />
      </div>
      <div
        className="pointer-events-none absolute left-1/2 top-[16%] -translate-x-1/2 -translate-y-1/2"
        aria-hidden="true"
      >
        <div className="animate-spin-slower rays h-[90vmin] w-[90vmin] opacity-[0.06]" />
      </div>

      {/* mouse-reactive glow */}
      <motion.div
        className="pointer-events-none absolute inset-0 opacity-70 mix-blend-screen"
        style={{
          background: `radial-gradient(480px circle at ${glowX} ${glowY}, rgba(230,179,198,0.18), transparent 70%)`,
        }}
      />

      <motion.div
        style={{ x: parallaxX, y: parallaxY, opacity: fade }}
        className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-40 md:px-10 md:pb-24"
      >
        <p className="mb-5 font-body text-xs font-semibold uppercase tracking-[0.35em] text-blush">
          Laura Daniela Galvis · arquitecta &amp; escenógrafa
        </p>

        <h1 className="font-display text-[15vw] font-black uppercase leading-[0.85] tracking-tight text-cream sm:text-[10vw] md:text-[7.2vw] lg:text-[6.2rem]">
          Cosas
          <br />
          <span className="text-outline">Raras</span>
        </h1>

        <div className="mt-8 flex flex-col items-start gap-8 md:flex-row md:items-end md:justify-between">
          <p className="max-w-md font-body text-base leading-relaxed text-cream/85 md:text-lg">
            Objetos diseñados para que tu casa tenga mucho color, vida,
            estilo y personalidad. Lámparas esculpidas y armadas a mano,
            una por una.
          </p>

          <div className="flex flex-wrap gap-4">
            <a
              href="#lamparas"
              data-cursor="lg"
              className="rounded-full bg-cream px-7 py-3.5 font-body text-sm font-semibold uppercase tracking-wide text-ink transition-transform hover:scale-105"
            >
              Ver las lámparas
            </a>
            <a
              href={waLink(
                "Hola Lau, quiero cotizar una lámpara Cosas Raras para mi espacio."
              )}
              target="_blank"
              rel="noopener noreferrer"
              data-cursor="lg"
              className="rounded-full border border-cream/40 px-7 py-3.5 font-body text-sm font-semibold uppercase tracking-wide text-cream transition-colors hover:border-cream hover:bg-cream/10"
            >
              Cotizar la mía
            </a>
          </div>
        </div>
      </motion.div>

      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 1 }}
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2 animate-float text-cream/70"
        aria-hidden="true"
      >
        <svg width="20" height="30" viewBox="0 0 20 30" fill="none">
          <rect x="1" y="1" width="18" height="28" rx="9" stroke="currentColor" strokeWidth="1.2" />
          <circle className="animate-pulseglow" cx="10" cy="9" r="2.4" fill="currentColor" />
        </svg>
      </motion.div>
    </section>
  );
}
