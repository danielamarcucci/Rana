# Cosas Raras

Sitio de la marca **Cosas Raras**, lámparas hechas a mano por Laura Daniela
Galvis (arquitecta y escenógrafa). Next.js 15 (App Router) + TypeScript +
Tailwind CSS + Framer Motion.

## Desarrollo

```bash
npm install
npm run dev
```

## Desplegar en Vercel (proyecto nuevo)

Este directorio vive dentro del monorepo `Rana`, junto a otras apps
independientes (`servicios-app`, la app raíz). Para desplegarlo como un
**proyecto de Vercel separado**:

1. En Vercel, "Add New… → Project" e importa este repositorio de GitHub.
2. En "Root Directory" selecciona `cosas-raras`.
3. Framework preset: Next.js (se detecta solo). No se necesitan variables
   de entorno ni base de datos.
4. Deploy.

## Estructura

- `src/app` — layout, página principal, estilos globales.
- `src/components` — secciones (Hero, About, Products, Process, Gallery,
  Contact, Footer) y utilidades de interacción (cursor personalizado,
  scroll-reveal).
- `src/lib/content.ts` — copys, datos de producto, WhatsApp/email, paleta
  de colores de marca.
- `public/images` — fotografías de las lámparas (retocadas: exposición,
  balance de color y viñeta) y fondos del estudio.

## Contacto que usa el sitio

- WhatsApp: +57 350 450 7151
- Email: Lauradanielagalvis77@gmail.com

Ambos tomados del catálogo y del portafolio (lauradanielgalvis.squarespace.com)
que compartió Lau.
