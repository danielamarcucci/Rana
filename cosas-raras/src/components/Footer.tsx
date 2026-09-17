import { EMAIL, PORTFOLIO_URL, WHATSAPP_DISPLAY, waLink } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="bg-ink py-14">
      <div className="mx-auto flex max-w-6xl flex-col gap-8 px-6 md:flex-row md:items-center md:justify-between md:px-10">
        <div>
          <p className="font-display text-xl font-extrabold text-cream">
            COSAS<span className="text-wine">·</span>RARAS
          </p>
          <p className="mt-2 max-w-xs font-body text-sm text-cream/50">
            Objetos hechos a mano por Laura Daniela Galvis, arquitecta y
            escenógrafa.
          </p>
        </div>

        <div className="flex flex-wrap gap-x-8 gap-y-3 font-body text-sm text-cream/70">
          <a href={waLink("Hola Lau, escribo desde cosasraras.co.")} target="_blank" rel="noopener noreferrer" className="hover:text-cream">
            {WHATSAPP_DISPLAY}
          </a>
          <a href={`mailto:${EMAIL}`} className="hover:text-cream">
            {EMAIL}
          </a>
          <a href={PORTFOLIO_URL} target="_blank" rel="noopener noreferrer" className="hover:text-cream">
            Portafolio
          </a>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-6xl px-6 md:px-10">
        <div className="border-t border-cream/10 pt-6 font-body text-xs text-cream/35">
          © {new Date().getFullYear()} Cosas Raras — Lau. Hecho a mano en Bogotá.
        </div>
      </div>
    </footer>
  );
}
