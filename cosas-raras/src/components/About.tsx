import Image from "next/image";
import Reveal from "./Reveal";

const FIELDS = [
  "Arquitectura",
  "Interiorismo",
  "Escenografía",
  "Dirección de arte",
  "Danza",
  "Teatro",
];

export default function About() {
  return (
    <section className="relative overflow-hidden bg-ink py-28 md:py-36">
      <div className="absolute inset-0">
        <Image
          src="/images/bg-showroom.webp"
          alt="Sala de exhibición con mobiliario y objetos de diseño de Cosas Raras"
          fill
          sizes="100vw"
          className="object-cover opacity-[0.28]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-ink via-ink/85 to-ink" />
      </div>

      <div className="relative mx-auto max-w-5xl px-6 text-center md:px-10">
        <Reveal>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.35em] text-blush">
            Sobre Lau
          </p>
        </Reveal>

        <Reveal delay={0.1}>
          <h2 className="mt-6 font-display text-3xl font-bold leading-tight text-cream sm:text-4xl md:text-5xl">
            Siempre me ha gustado diseñar y crear{" "}
            <span className="text-olive">cosas raras.</span>
          </h2>
        </Reveal>

        <Reveal delay={0.2}>
          <p className="mx-auto mt-8 max-w-2xl font-body text-base leading-relaxed text-cream/80 md:text-lg">
            Este espacio nace de una curiosidad genuina por explorar otras
            posibilidades de creación para los objetos decorativos de
            nuestras casas — para sentir que tienen vida y personalidad
            propias. El proceso de creación es orgánico, el armado es a
            mano, y cada pieza recuerda que la arquitectura de nuestra
            tierra es colorida y tiene vida.
          </p>
        </Reveal>

        <Reveal delay={0.3}>
          <div className="mx-auto mt-12 flex max-w-3xl flex-wrap items-center justify-center gap-3">
            {FIELDS.map((f) => (
              <span
                key={f}
                className="rounded-full border border-cream/25 px-4 py-2 font-body text-xs font-medium uppercase tracking-wide text-cream/70 transition-colors hover:border-blush hover:text-blush"
              >
                {f}
              </span>
            ))}
          </div>
        </Reveal>

        <Reveal delay={0.4}>
          <p className="mt-14 font-display text-2xl italic text-blush">— Lau.</p>
        </Reveal>
      </div>
    </section>
  );
}
