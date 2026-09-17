import { PRODUCTS } from "@/lib/content";
import ProductCard from "./ProductCard";
import Reveal from "./Reveal";

export default function Products() {
  return (
    <section id="lamparas" className="relative bg-cream py-28 md:py-36">
      <div className="mx-auto max-w-6xl px-6 md:px-10">
        <Reveal>
          <p className="font-body text-xs font-semibold uppercase tracking-[0.35em] text-wine">
            Las lámparas
          </p>
        </Reveal>
        <Reveal delay={0.1}>
          <h2 className="mt-4 max-w-2xl font-display text-4xl font-black leading-[0.95] text-ink sm:text-5xl md:text-6xl">
            Dos formas de encender un cuarto.
          </h2>
        </Reveal>

        <div className="mt-24 flex flex-col gap-28 md:mt-28 md:gap-36">
          {PRODUCTS.map((p, i) => (
            <Reveal key={p.id} delay={0.1}>
              <ProductCard product={p} reverse={i % 2 === 1} />
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
