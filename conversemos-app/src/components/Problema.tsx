import Reveal from "./Reveal";
import Counter from "./Counter";
import { problema } from "@/lib/content";

export default function Problema() {
  return (
    <section id="problema" className="bg-crema px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-balance text-center font-display text-3xl font-semibold text-verde-800 sm:text-4xl">
            {problema.titular}
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-center text-lg text-tinta/70">
            {problema.subtitulo}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-3">
          {problema.datos.map((dato, i) => (
            <Reveal key={dato.titulo} delay={i * 120}>
              <div className="flex h-full flex-col rounded-2xl bg-white p-7 shadow-card ring-1 ring-verde-100/60 transition hover:-translate-y-1 hover:shadow-soft">
                <div className="font-display text-4xl font-bold text-verde-700 sm:text-5xl">
                  {dato.cifra === "48%" && <Counter target={48} suffix="%" />}
                  {dato.cifra === "30%" && <Counter target={30} suffix="%" />}
                  {dato.cifra === "6–9" && <span>6–9</span>}
                </div>
                {dato.sufijo && <p className="mt-1 text-sm font-semibold text-rosa-600">{dato.sufijo}</p>}
                <p className="mt-3 text-sm font-bold uppercase tracking-wide text-verde-700">{dato.titulo}</p>
                <p className="mt-3 flex-1 text-[15px] leading-relaxed text-tinta/70">{dato.texto}</p>
                <p className="mt-5 text-xs font-medium text-tinta/40">Fuente: {dato.fuente}</p>
              </div>
            </Reveal>
          ))}
        </div>

        <Reveal delay={150}>
          <p className="mx-auto mt-14 max-w-xl text-balance text-center font-display text-xl italic text-verde-800">
            {problema.cierre}
          </p>
        </Reveal>
      </div>
    </section>
  );
}
