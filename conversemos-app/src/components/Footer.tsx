import { contacto, footer, nav } from "@/lib/content";

export default function Footer() {
  return (
    <footer className="bg-verde-900 px-6 py-14 text-crema/80">
      <div className="mx-auto flex max-w-5xl flex-col gap-10 sm:flex-row sm:justify-between">
        <div>
          <p className="font-display text-xl font-semibold text-crema">{footer.marca}</p>
          <p className="text-sm font-medium text-rosa-300">{footer.metodo}</p>
          <p className="mt-1 text-sm text-crema/60">{footer.descriptor}</p>
          <p className="mt-4 max-w-xs text-sm italic text-crema/60">{footer.slogan}</p>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-crema/50">Enlaces rápidos</p>
          <ul className="mt-3 space-y-2">
            {nav.map((item) => (
              <li key={item.href}>
                <a href={item.href} className="text-sm transition hover:text-rosa-300">
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </div>

        <div>
          <p className="text-sm font-semibold uppercase tracking-wide text-crema/50">Contacto</p>
          <ul className="mt-3 space-y-2 text-sm">
            <li>
              <a href={`mailto:${contacto.email}`} className="transition hover:text-rosa-300">
                {contacto.email}
              </a>
            </li>
            <li>
              <a href={`https://wa.me/${contacto.telefonoWhatsapp}`} className="transition hover:text-rosa-300">
                {contacto.telefono}
              </a>
            </li>
            <li>{contacto.ciudad}</li>
          </ul>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-5xl border-t border-crema/10 pt-6 text-center text-xs text-crema/40">
        © {new Date().getFullYear()} {footer.marca} · {footer.metodo}
      </div>
    </footer>
  );
}
