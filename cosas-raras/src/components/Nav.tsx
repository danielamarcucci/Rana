"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { WHATSAPP_DISPLAY, waLink } from "@/lib/content";

const LINKS = [
  { href: "#lamparas", label: "Lámparas" },
  { href: "#proceso", label: "Proceso" },
  { href: "#historias", label: "Historias" },
  { href: "#contacto", label: "Cotizar" },
];

export default function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <motion.header
      initial={{ y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
      className={`fixed top-0 inset-x-0 z-50 transition-colors duration-500 ${
        scrolled ? "bg-cream/85 backdrop-blur-md shadow-[0_1px_0_rgba(26,17,18,0.08)]" : ""
      }`}
    >
      <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-5 md:px-10">
        <a
          href="#top"
          data-cursor="lg"
          className="font-display text-lg font-extrabold tracking-tight text-ink"
        >
          COSAS<span className="text-wine">·</span>RARAS
        </a>

        <nav className="hidden items-center gap-8 md:flex">
          {LINKS.map((l) => (
            <a
              key={l.href}
              href={l.href}
              data-cursor="lg"
              className="group relative font-body text-sm font-medium uppercase tracking-wide text-ink/80 transition-colors hover:text-wine"
            >
              {l.label}
              <span className="absolute -bottom-1 left-0 h-px w-0 bg-wine transition-all duration-300 group-hover:w-full" />
            </a>
          ))}
          <a
            href={waLink("Hola Lau, escribo desde cosasraras.co, quiero conocer más sobre las lámparas.")}
            target="_blank"
            rel="noopener noreferrer"
            data-cursor="lg"
            className="rounded-full bg-wine px-5 py-2 font-body text-sm font-semibold text-cream transition-transform hover:scale-105"
          >
            {WHATSAPP_DISPLAY}
          </a>
        </nav>

        <button
          aria-label="Abrir menú"
          data-cursor="lg"
          className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
          onClick={() => setOpen((v) => !v)}
        >
          <span
            className={`h-px w-6 bg-ink transition-transform ${open ? "translate-y-2 rotate-45" : ""}`}
          />
          <span className={`h-px w-6 bg-ink transition-opacity ${open ? "opacity-0" : ""}`} />
          <span
            className={`h-px w-6 bg-ink transition-transform ${open ? "-translate-y-2 -rotate-45" : ""}`}
          />
        </button>
      </div>

      {open && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-ink/10 bg-cream px-6 pb-6 md:hidden"
        >
          <div className="flex flex-col gap-4 pt-4">
            {LINKS.map((l) => (
              <a
                key={l.href}
                href={l.href}
                onClick={() => setOpen(false)}
                className="font-display text-xl font-semibold text-ink"
              >
                {l.label}
              </a>
            ))}
            <a
              href={waLink("Hola Lau, escribo desde cosasraras.co, quiero conocer más sobre las lámparas.")}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-2 w-fit rounded-full bg-wine px-5 py-2 font-body text-sm font-semibold text-cream"
            >
              Escribir por WhatsApp
            </a>
          </div>
        </motion.div>
      )}
    </motion.header>
  );
}
