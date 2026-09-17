"use client";

import { useState } from "react";
import Image from "next/image";
import { motion } from "framer-motion";
import { COLORWAYS, ColorwayId, EMAIL, PORTFOLIO_URL, WHATSAPP_DISPLAY, waLink } from "@/lib/content";
import Reveal from "./Reveal";

export default function Contact() {
  const [name, setName] = useState("");
  const [space, setSpace] = useState("");
  const [color, setColor] = useState<ColorwayId>(COLORWAYS[0].id);

  const colorLabel = COLORWAYS.find((c) => c.id === color)?.label ?? "";

  const message = [
    `Hola Lau, soy ${name || "___"}.`,
    space ? `Mi espacio: ${space}.` : null,
    `Color que más me gusta: ${colorLabel}.`,
    "¿Me ayudas a cotizar una lámpara Cosas Raras?",
  ]
    .filter(Boolean)
    .join(" ");

  return (
    <section id="contacto" className="relative overflow-hidden bg-wine py-28 md:py-36">
      <Image
        src="/images/sconce-detail.webp"
        alt=""
        fill
        aria-hidden="true"
        sizes="100vw"
        className="object-cover opacity-[0.12] mix-blend-screen"
      />
      <div className="relative mx-auto grid max-w-6xl gap-16 px-6 md:grid-cols-[1fr_1.1fr] md:px-10">
        <div>
          <Reveal>
            <p className="font-body text-xs font-semibold uppercase tracking-[0.35em] text-blush">
              Hagamos una a tu medida
            </p>
          </Reveal>
          <Reveal delay={0.1}>
            <h2 className="mt-4 font-display text-4xl font-black leading-[0.95] text-cream sm:text-5xl">
              Cuéntame tu espacio y te propongo una lámpara.
            </h2>
          </Reveal>
          <Reveal delay={0.2}>
            <p className="mt-6 max-w-md font-body text-base leading-relaxed text-cream/80">
              Cada lámpara se fabrica bajo pedido. Escríbeme el tamaño del
              lugar, la altura del techo y el color que te gusta, y te
              cuento tiempos y valor exacto.
            </p>
          </Reveal>

          <Reveal delay={0.3}>
            <div className="mt-10 flex flex-col gap-3 font-body text-sm text-cream/90">
              <a
                href={waLink("Hola Lau, escribo desde cosasraras.co.")}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="lg"
                className="inline-flex w-fit items-center gap-2 border-b border-cream/40 pb-1 transition-colors hover:border-cream"
              >
                WhatsApp — {WHATSAPP_DISPLAY}
              </a>
              <a
                href={`mailto:${EMAIL}`}
                data-cursor="lg"
                className="inline-flex w-fit items-center gap-2 border-b border-cream/40 pb-1 transition-colors hover:border-cream"
              >
                {EMAIL}
              </a>
              <a
                href={PORTFOLIO_URL}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="lg"
                className="inline-flex w-fit items-center gap-2 border-b border-cream/40 pb-1 transition-colors hover:border-cream"
              >
                Ver portafolio de arquitectura y escenografía ↗
              </a>
            </div>
          </Reveal>
        </div>

        <Reveal delay={0.2}>
          <div className="rounded-[2rem] bg-cream/95 p-8 shadow-2xl md:p-10">
            <div className="flex flex-col gap-6">
              <label className="block">
                <span className="font-body text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Tu nombre
                </span>
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej. Camila"
                  className="mt-2 w-full rounded-xl border border-ink/15 bg-white px-4 py-3 font-body text-ink outline-none transition-colors focus:border-wine"
                />
              </label>

              <label className="block">
                <span className="font-body text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Tu espacio
                </span>
                <textarea
                  value={space}
                  onChange={(e) => setSpace(e.target.value)}
                  placeholder="Sala con techo alto, comedor pequeño, entrada..."
                  rows={3}
                  className="mt-2 w-full resize-none rounded-xl border border-ink/15 bg-white px-4 py-3 font-body text-ink outline-none transition-colors focus:border-wine"
                />
              </label>

              <div>
                <span className="font-body text-xs font-semibold uppercase tracking-wide text-ink/60">
                  Color favorito
                </span>
                <div className="mt-3 flex gap-3">
                  {COLORWAYS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      data-cursor="lg"
                      aria-label={c.label}
                      onClick={() => setColor(c.id)}
                      className="relative h-10 w-10 rounded-full transition-transform hover:scale-110"
                      style={{ backgroundColor: c.hex }}
                    >
                      {color === c.id && (
                        <motion.span
                          layoutId="contact-ring"
                          className="absolute -inset-1.5 rounded-full border-2 border-ink"
                        />
                      )}
                    </button>
                  ))}
                </div>
              </div>

              <a
                href={waLink(message)}
                target="_blank"
                rel="noopener noreferrer"
                data-cursor="lg"
                className="mt-2 inline-flex items-center justify-center gap-2 rounded-full bg-ink px-7 py-4 font-body text-sm font-semibold uppercase tracking-wide text-cream transition-transform hover:scale-[1.02]"
              >
                Enviar por WhatsApp
                <span aria-hidden="true">→</span>
              </a>
              <p className="text-center font-body text-xs text-ink/40">
                Se abre WhatsApp con tu mensaje listo para enviar.
              </p>
            </div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
