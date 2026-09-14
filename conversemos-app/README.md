# Conversemos — Carolina Melo Arévalo

Landing page de una sola página para el **Método Conversemos**, de Carolina
Melo Arévalo (facilitadora de conversaciones pendientes). Construida a partir
de la estructura y los textos definidos en `Contenido Web · Carolina Melo ·
Conversemos`.

## Stack

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Animaciones de entrada con `IntersectionObserver` (`src/components/Reveal.tsx`)
  y CSS puro, sin librerías de animación pesadas.
- `lucide-react` para los íconos.
- Tipografías: Playfair Display (títulos) + Manrope (cuerpo), vía
  `next/font/google`.

## Estructura

```
src/
  app/            layout, page y estilos globales
  components/     una sección de la página por componente
  lib/
    content.ts      todos los textos del sitio (editar aquí para cambiar copy)
    testimonios.ts   lista de testimonios reales (vacía por ahora)
public/images/    fotografías de Carolina
```

## Instalación y desarrollo

```bash
npm install
npm run dev
```

## Pendientes conocidos (no bloquean el lanzamiento)

- **Testimonios**: la sección muestra un estado "próximamente" honesto
  mientras `src/lib/testimonios.ts` esté vacío. Agregar ahí los testimonios
  reales cuando estén listos (ver el Plan de Lanzamiento, Fase 3).
- **LinkedIn / hoja de vida**: el brief pedía un enlace a LinkedIn y/o a un
  PDF de hoja de vida en "Sobre Carolina". No se incluyó ningún enlace o
  archivo para evitar apuntar a una URL incorrecta; se puede agregar
  fácilmente en `src/components/SobreCarolina.tsx` en cuanto se tenga la URL.
- **Formulario de contacto**: no hay backend de envío de correo configurado.
  El botón "Conversemos" abre un `mailto:` prellenado hacia
  `carolina.melo.consultora@gmail.com` con todos los campos del formulario, y
  también hay un botón directo de WhatsApp. Si más adelante se quiere un
  envío real desde el servidor (por ejemplo con Resend), se puede añadir una
  ruta API sin cambiar el formulario.
- **Dominio propio**: pendiente según el Plan de Lanzamiento (Fase 1).

## Paleta de marca

| Token | Valor | Uso |
|---|---|---|
| `verde-700` | `#1a5c45` | Fondo oscuro principal (hero, footer) |
| `rosa-500` | `#e14f78` | Acento, CTAs |
| `crema` | `#faf8f4` | Fondo claro |
