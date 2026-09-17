"use client";

import { useRef, useState } from "react";
import Image from "next/image";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { COLORWAYS, Colorway, Product, waLink } from "@/lib/content";

export default function ProductCard({
  product,
  reverse,
}: {
  product: Product;
  reverse?: boolean;
}) {
  const [color, setColor] = useState<Colorway>(COLORWAYS[0]);
  const ref = useRef<HTMLDivElement>(null);

  const rx = useMotionValue(0);
  const ry = useMotionValue(0);
  const srx = useSpring(rx, { stiffness: 150, damping: 18 });
  const sry = useSpring(ry, { stiffness: 150, damping: 18 });
  const rotateX = useTransform(srx, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(sry, [-0.5, 0.5], [-6, 6]);

  const onMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    rx.set((e.clientY - rect.top) / rect.height - 0.5);
    ry.set((e.clientX - rect.left) / rect.width - 0.5);
  };
  const onLeave = () => {
    rx.set(0);
    ry.set(0);
  };

  return (
    <div
      className={`grid grid-cols-1 items-center gap-10 md:grid-cols-2 md:gap-16 ${
        reverse ? "md:[&>*:first-child]:order-2" : ""
      }`}
    >
      <motion.div
        ref={ref}
        onMouseMove={onMove}
        onMouseLeave={onLeave}
        style={{ rotateX, rotateY, transformPerspective: 1200 }}
        className="group relative aspect-[4/5] w-full overflow-hidden rounded-[2rem] bg-ink"
      >
        <motion.div
          className="absolute -inset-6 -z-10 rounded-[2.5rem] opacity-60 blur-2xl transition-colors duration-500"
          style={{ backgroundColor: color.hex }}
        />
        <Image
          src={product.image}
          alt={`Lámpara ${product.name} de Cosas Raras encendida`}
          fill
          sizes="(min-width: 768px) 45vw, 90vw"
          className="object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-ink/70 via-transparent to-transparent" />
        <div
          className="absolute inset-0 rounded-[2rem] ring-2 ring-inset transition-colors duration-500"
          style={{ boxShadow: `inset 0 0 0 2px ${color.hex}55` }}
        />
        <span className="absolute left-6 top-6 rounded-full bg-cream/90 px-4 py-1.5 font-body text-xs font-semibold uppercase tracking-wide text-ink">
          {product.measures}
        </span>
      </motion.div>

      <div>
        <h3 className="font-display text-4xl font-extrabold text-ink sm:text-5xl">
          {product.name}
          {product.subtitle && (
            <span className="ml-3 align-middle font-body text-base font-medium uppercase tracking-widest text-wine">
              {product.subtitle}
            </span>
          )}
        </h3>

        <p className="mt-5 max-w-md font-body text-base leading-relaxed text-ink/70 md:text-lg">
          {product.description}
        </p>

        <p className="mt-6 font-display text-2xl font-bold text-wine">
          {product.price}
        </p>
        <p className="mt-1 font-body text-xs uppercase tracking-wide text-ink/50">
          Se fabrica bajo pedido · personalizable con el color que desees
        </p>

        <div className="mt-8">
          <p className="mb-3 font-body text-xs font-semibold uppercase tracking-[0.2em] text-ink/50">
            Elige tu color
          </p>
          <div className="flex items-center gap-3">
            {COLORWAYS.map((c) => (
              <button
                key={c.id}
                data-cursor="lg"
                aria-label={c.label}
                onClick={() => setColor(c)}
                className="relative h-10 w-10 rounded-full transition-transform hover:scale-110"
                style={{ backgroundColor: c.hex }}
              >
                {color.id === c.id && (
                  <motion.span
                    layoutId={`ring-${product.id}`}
                    className="absolute -inset-1.5 rounded-full border-2"
                    style={{ borderColor: c.hex }}
                  />
                )}
              </button>
            ))}
            <span className="font-body text-sm font-medium text-ink/70">
              {color.label}
            </span>
          </div>
        </div>

        <a
          href={waLink(
            `Hola Lau, quiero cotizar la lámpara ${product.name}${
              product.subtitle ? " " + product.subtitle : ""
            } en color ${color.label}. ¿Me cuentas los pasos para pedirla?`
          )}
          target="_blank"
          rel="noopener noreferrer"
          data-cursor="lg"
          className="mt-9 inline-flex items-center gap-2 rounded-full bg-ink px-7 py-3.5 font-body text-sm font-semibold uppercase tracking-wide text-cream transition-transform hover:scale-105"
        >
          Cotizar {product.name} en {color.label}
          <span aria-hidden="true">→</span>
        </a>
      </div>
    </div>
  );
}
