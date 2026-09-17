"use client";

import { useRef } from "react";
import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import Reveal from "./Reveal";

const STEPS = [
  {
    n: "01",
    title: "Diseño",
    text: "Cada pieza nace como un boceto de arquitectura: proporción, ritmo y el hueco exacto por donde se escapa la luz.",
  },
  {
    n: "02",
    title: "Corte y curva",
    text: "Los listones de madera se cortan y curvan uno a uno hasta formar la esfera que va a sostener el bombillo.",
  },
  {
    n: "03",
    title: "Armado a mano",
    text: "Todo se ensambla a mano, sin moldes en serie. Por eso cada Cosas Raras es, literalmente, una pieza única.",
  },
];

export default function Process() {
  const ref = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });
  const y = useTransform(scrollYProgress, [0, 1], ["-12%", "12%"]);

  return (
    <section
      id="proceso"
      ref={ref}
      className="relative overflow-hidden bg-ink py-28 md:py-36"
    >
      <motion.div className="absolute inset-0" style={{ y }}>
        <Image
          src="/images/bg-staircase.webp"
          alt="Escalera y estudio de Cosas Raras"
          fill
          sizes="100vw"
          className="object-cover opacity-30"
        />
      </motion.div>
      <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/80 to-ink" />

      <div className="relative mx-auto max-w-6xl px-6 md:px-10">
        <Reveal>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.35em] text-blush">
            El proceso
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-4 max-w-xl font-display text-4xl font-black leading-[0.95] text-cream sm:text-5xl">
            Orgánico. A mano. Sin dos piezas iguales.
          </h2>
        </Reveal>

        <div className="mt-20 grid gap-12 md:grid-cols-3 md:gap-8">
          {STEPS.map((s, i) => (
            <Reveal key={s.n} delay={0.15 * i}>
              <div className="border-t border-cream/20 pt-6">
                <span className="font-display text-sm font-bold text-blush">
                  {s.n}
                </span>
                <h3 className="mt-3 font-display text-2xl font-bold text-cream">
                  {s.title}
                </h3>
                <p className="mt-3 font-body text-sm leading-relaxed text-cream/70">
                  {s.text}
                </p>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
