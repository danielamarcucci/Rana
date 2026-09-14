"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Mail, MapPin, MessageCircle, Phone, Send } from "lucide-react";
import Reveal from "./Reveal";
import { contacto, contactoSeccion, lineas } from "@/lib/content";

type Errores = Partial<Record<"nombre" | "correo" | "situacion", string>>;

export default function Contacto() {
  const [nombre, setNombre] = useState("");
  const [organizacion, setOrganizacion] = useState("");
  const [situacion, setSituacion] = useState("");
  const [correo, setCorreo] = useState("");
  const [whatsapp, setWhatsapp] = useState("");
  const [linea, setLinea] = useState<number | "">("");
  const [errores, setErrores] = useState<Errores>({});
  const [enviado, setEnviado] = useState(false);

  useEffect(() => {
    const onLinea = (e: Event) => {
      const detail = (e as CustomEvent<number>).detail;
      setLinea(detail);
    };
    window.addEventListener("conversemos:linea", onLinea);
    return () => window.removeEventListener("conversemos:linea", onLinea);
  }, []);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const nuevosErrores: Errores = {};

    if (!nombre.trim()) nuevosErrores.nombre = "Cuéntame tu nombre.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo)) nuevosErrores.correo = "Escribe un correo válido.";
    if (!situacion.trim()) nuevosErrores.situacion = "Este campo me ayuda a entender tu contexto antes de hablar.";

    setErrores(nuevosErrores);
    if (Object.keys(nuevosErrores).length > 0) return;

    const lineaTexto = linea ? lineas.items.find((l) => l.numero === linea)?.titulo : null;

    const cuerpo = [
      `Organización: ${organizacion || "—"}`,
      lineaTexto ? `Línea de interés: ${lineaTexto}` : null,
      "",
      "¿Qué está pasando en tu equipo?",
      situacion,
      "",
      `WhatsApp: ${whatsapp || "—"}`,
      `Correo de contacto: ${correo}`,
    ]
      .filter((line) => line !== null)
      .join("\n");

    const asunto = encodeURIComponent(`Conversemos — ${nombre}`);
    const mailto = `mailto:${contacto.email}?subject=${asunto}&body=${encodeURIComponent(cuerpo)}`;

    window.location.href = mailto;
    setEnviado(true);
  };

  return (
    <section id="contacto" className="bg-crema px-6 py-24">
      <div className="mx-auto max-w-5xl">
        <Reveal>
          <h2 className="text-balance text-center font-display text-3xl font-semibold leading-tight text-verde-800 sm:text-4xl">
            {contactoSeccion.titular}
            <br className="hidden sm:block" /> {contactoSeccion.titularLinea2}
          </h2>
        </Reveal>
        <Reveal delay={80}>
          <p className="mx-auto mt-5 max-w-lg text-balance text-center text-lg text-tinta/70">
            {contactoSeccion.subtitulo}
          </p>
        </Reveal>

        <div className="mt-14 grid gap-10 lg:grid-cols-[1fr_1.1fr]">
          <Reveal delay={120}>
            <div className="flex h-full flex-col justify-between rounded-2xl bg-verde-800 p-8 text-crema shadow-soft">
              <div className="space-y-5">
                <a
                  href={`mailto:${contacto.email}`}
                  className="flex items-center gap-3 text-[15px] transition hover:text-rosa-200"
                >
                  <Mail size={18} className="text-rosa-300" /> {contacto.email}
                </a>
                <a
                  href={`https://wa.me/${contacto.telefonoWhatsapp}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 text-[15px] transition hover:text-rosa-200"
                >
                  <Phone size={18} className="text-rosa-300" /> {contacto.telefono}
                </a>
                <p className="flex items-center gap-3 text-[15px]">
                  <MapPin size={18} className="text-rosa-300" /> {contacto.ciudad}
                </p>
              </div>

              <a
                href={`https://wa.me/${contacto.telefonoWhatsapp}?text=${encodeURIComponent(
                  "Hola Carolina, me gustaría conversar sobre mi equipo.",
                )}`}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-10 inline-flex items-center justify-center gap-2 rounded-full bg-white/10 px-5 py-3 text-sm font-semibold transition hover:bg-white/20"
              >
                <MessageCircle size={18} />
                Escríbeme directo por WhatsApp
              </a>
            </div>
          </Reveal>

          <Reveal delay={180}>
            <form onSubmit={handleSubmit} className="rounded-2xl bg-white p-8 shadow-card ring-1 ring-verde-100/60">
              <div className="grid gap-5 sm:grid-cols-2">
                <div className="sm:col-span-1">
                  <label htmlFor="nombre" className="text-sm font-semibold text-verde-800">
                    Nombre
                  </label>
                  <input
                    id="nombre"
                    value={nombre}
                    onChange={(e) => setNombre(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-verde-100 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-rosa-400 focus:ring-2 focus:ring-rosa-100"
                    placeholder="Tu nombre"
                  />
                  {errores.nombre && <p className="mt-1 text-xs text-rosa-600">{errores.nombre}</p>}
                </div>

                <div>
                  <label htmlFor="organizacion" className="text-sm font-semibold text-verde-800">
                    Organización
                  </label>
                  <input
                    id="organizacion"
                    value={organizacion}
                    onChange={(e) => setOrganizacion(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-verde-100 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-rosa-400 focus:ring-2 focus:ring-rosa-100"
                    placeholder="Nombre de tu equipo u organización"
                  />
                </div>
              </div>

              <div className="mt-5">
                <label htmlFor="linea" className="text-sm font-semibold text-verde-800">
                  Línea de interés <span className="font-normal text-tinta/50">(opcional)</span>
                </label>
                <select
                  id="linea"
                  value={linea}
                  onChange={(e) => setLinea(e.target.value ? Number(e.target.value) : "")}
                  className="mt-1.5 w-full rounded-lg border border-verde-100 bg-white px-3.5 py-2.5 text-[15px] outline-none transition focus:border-rosa-400 focus:ring-2 focus:ring-rosa-100"
                >
                  <option value="">Prefiero contarte directamente</option>
                  {lineas.items.map((item) => (
                    <option key={item.numero} value={item.numero}>
                      {item.titulo}
                    </option>
                  ))}
                </select>
              </div>

              <div className="mt-5">
                <label htmlFor="situacion" className="text-sm font-semibold text-verde-800">
                  {contactoSeccion.campoClave}
                </label>
                <textarea
                  id="situacion"
                  value={situacion}
                  onChange={(e) => setSituacion(e.target.value)}
                  rows={4}
                  className="mt-1.5 w-full rounded-lg border border-verde-100 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-rosa-400 focus:ring-2 focus:ring-rosa-100"
                  placeholder="Cuéntame con tus palabras qué está pasando…"
                />
                {errores.situacion && <p className="mt-1 text-xs text-rosa-600">{errores.situacion}</p>}
              </div>

              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <div>
                  <label htmlFor="correo" className="text-sm font-semibold text-verde-800">
                    Correo electrónico
                  </label>
                  <input
                    id="correo"
                    type="email"
                    value={correo}
                    onChange={(e) => setCorreo(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-verde-100 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-rosa-400 focus:ring-2 focus:ring-rosa-100"
                    placeholder="tucorreo@ejemplo.com"
                  />
                  {errores.correo && <p className="mt-1 text-xs text-rosa-600">{errores.correo}</p>}
                </div>
                <div>
                  <label htmlFor="whatsapp" className="text-sm font-semibold text-verde-800">
                    WhatsApp <span className="font-normal text-tinta/50">(opcional)</span>
                  </label>
                  <input
                    id="whatsapp"
                    value={whatsapp}
                    onChange={(e) => setWhatsapp(e.target.value)}
                    className="mt-1.5 w-full rounded-lg border border-verde-100 px-3.5 py-2.5 text-[15px] outline-none transition focus:border-rosa-400 focus:ring-2 focus:ring-rosa-100"
                    placeholder="+57 300 000 00 00"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="group mt-7 inline-flex w-full items-center justify-center gap-2 rounded-full bg-rosa-500 px-7 py-3.5 text-base font-semibold text-white shadow-soft transition hover:-translate-y-0.5 hover:bg-rosa-600 sm:w-auto"
              >
                {contactoSeccion.ctaBoton}
                <Send size={17} className="transition group-hover:translate-x-1" />
              </button>

              {enviado && (
                <p className="mt-4 text-sm text-verde-700">
                  Se abrió tu correo con el mensaje listo — solo dale enviar. Si no se abrió, escríbeme directo a{" "}
                  <a href={`mailto:${contacto.email}`} className="font-semibold underline">
                    {contacto.email}
                  </a>
                  .
                </p>
              )}
            </form>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
