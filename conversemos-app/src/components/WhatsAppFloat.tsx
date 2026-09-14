import { MessageCircle } from "lucide-react";
import { contacto } from "@/lib/content";

export default function WhatsAppFloat() {
  const mensaje = encodeURIComponent("Hola Carolina, me gustaría conversar sobre mi equipo.");

  return (
    <a
      href={`https://wa.me/${contacto.telefonoWhatsapp}?text=${mensaje}`}
      target="_blank"
      rel="noopener noreferrer"
      aria-label="Escribir por WhatsApp"
      className="group fixed bottom-6 right-6 z-40 flex items-center gap-2 rounded-full bg-verde-700 px-4 py-3.5 text-white shadow-soft transition-all hover:bg-verde-800 hover:pr-5 animate-float"
    >
      <MessageCircle size={22} className="shrink-0" />
      <span className="max-w-0 overflow-hidden whitespace-nowrap text-sm font-semibold transition-all duration-300 group-hover:max-w-[9rem]">
        Escríbeme
      </span>
    </a>
  );
}
