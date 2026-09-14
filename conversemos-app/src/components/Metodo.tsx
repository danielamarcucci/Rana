import { Search, MessagesSquare, Handshake, Sprout } from "lucide-react";
import Reveal from "./Reveal";
import { metodo } from "@/lib/content";

const icons = {
  search: Search,
  messages: MessagesSquare,
  handshake: Handshake,
  sprout: Sprout,
};

export default function Metodo() {
  return (
    <section id="metodo" className="bg-verde-50 px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-center font-display text-3xl font-semibold text-verde-800 sm:text-4xl">
            {metodo.titular}
          </h2>
        </Reveal>
        <Reveal delay={100}>
          <p className="mx-auto mt-5 max-w-2xl text-balance text-center text-lg text-tinta/70">{metodo.parrafo}</p>
        </Reveal>

        <div className="mt-14 grid gap-6 sm:grid-cols-2">
          {metodo.principios.map((p, i) => {
            const Icon = icons[p.icono as keyof typeof icons];
            return (
              <Reveal key={p.titulo} delay={i * 100}>
                <div className="group flex h-full gap-5 rounded-2xl bg-white p-7 shadow-card ring-1 ring-verde-100/60 transition hover:-translate-y-1 hover:shadow-soft">
                  <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-rosa-100 text-rosa-600 transition group-hover:bg-verde-700 group-hover:text-white">
                    <Icon size={26} strokeWidth={1.75} />
                  </div>
                  <div>
                    <h3 className="font-display text-lg font-semibold text-verde-800">{p.titulo}</h3>
                    <p className="mt-2 text-[15px] leading-relaxed text-tinta/70">{p.texto}</p>
                  </div>
                </div>
              </Reveal>
            );
          })}
        </div>
      </div>
    </section>
  );
}
