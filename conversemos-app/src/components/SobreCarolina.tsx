import Image from "next/image";
import { GraduationCap } from "lucide-react";
import Reveal from "./Reveal";
import { sobre } from "@/lib/content";

export default function SobreCarolina() {
  return (
    <section id="sobre" className="relative overflow-hidden bg-verde-800 px-6 py-24 text-crema">
      <div className="pointer-events-none absolute -left-20 bottom-0 h-72 w-72 rounded-full bg-verde-400/10 blur-3xl" />

      <div className="relative mx-auto grid max-w-5xl items-center gap-14 lg:grid-cols-[380px_1fr]">
        <Reveal>
          <div className="relative mx-auto w-full max-w-xs lg:max-w-none">
            <div className="absolute -inset-4 rounded-[2rem] bg-rosa-400/15 blur-xl" />
            <div className="relative overflow-hidden rounded-[1.75rem] border border-crema/10 shadow-soft">
              <Image
                src="/images/carolina-sobre.png"
                alt="Carolina Melo Arévalo"
                width={585}
                height={955}
                className="h-full w-full object-cover"
                sizes="(min-width: 1024px) 380px, 80vw"
              />
            </div>
          </div>
        </Reveal>

        <div>
          <Reveal>
            <h2 className="font-display text-3xl font-semibold sm:text-4xl">
              Una trayectoria, una <span className="italic text-rosa-300">convicción</span>
            </h2>
          </Reveal>

          <Reveal delay={80}>
            <p className="mt-6 text-[15px] leading-relaxed text-crema/80">{sobre.parrafo1}</p>
          </Reveal>
          <Reveal delay={140}>
            <p className="mt-4 text-[15px] leading-relaxed text-crema/80">{sobre.parrafo2}</p>
          </Reveal>

          <Reveal delay={200}>
            <blockquote className="mt-6 rounded-2xl border border-crema/15 bg-white/5 p-6 font-display text-lg italic leading-relaxed text-crema">
              “{sobre.frase}”
            </blockquote>
          </Reveal>

          <Reveal delay={260}>
            <div className="mt-8">
              <p className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-rosa-300">
                <GraduationCap size={18} />
                {sobre.formacionTitulo}
              </p>
              <ul className="mt-4 space-y-2.5">
                {sobre.formacion.map((item) => (
                  <li key={item} className="flex gap-3 text-[15px] text-crema/80">
                    <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rosa-400" />
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
