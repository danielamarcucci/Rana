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
- **Dominio propio**: ✅ comprado — `conversacionespendientes.net` (registrado
  en Cloudflare). Falta conectarlo a un despliegue (ver guía abajo).

## Guía de despliegue (Vercel + dominio de Cloudflare)

Este repositorio tiene **dos** apps de Next.js independientes en carpetas
distintas (`servicios-app`, `conversemos-app` y la app en la raíz). Cada una
se despliega como un **proyecto separado en Vercel**, apuntando al mismo
repositorio de GitHub pero con una "Root Directory" distinta.

### 1. Crear el proyecto en Vercel

1. En [vercel.com](https://vercel.com), **"Add New…" → "Project"**.
2. Seleccione el repositorio **`Rana`** e **"Import"**.
3. Antes de darle a Deploy, en **"Root Directory"** haga clic en **"Edit"** y
   escriba `conversemos-app`. Esto es indispensable — si se deja en blanco,
   Vercel intentará construir la app equivocada.
4. Vercel detecta Next.js automáticamente; no hay variables de entorno que
   configurar (esta app no usa base de datos ni backend propio).
5. En **"Settings" → "Git" → "Production Branch"**, escriba el nombre de la
   rama que quiera publicar (por ejemplo `claude/nifty-davinci-5j7mbq`, o
   `main` si ya se fusionó ahí).
6. Deploy. Al terminar, Vercel da un link `https://conversemos-app-xxxx.vercel.app`
   para probar antes de conectar el dominio final.

### 2. Conectar `conversacionespendientes.net`

1. En el proyecto de Vercel: **"Settings" → "Domains" → "Add"**, escriba
   `conversacionespendientes.net` (y opcionalmente `www.conversacionespendientes.net`).
2. Vercel muestra los registros DNS exactos que hay que crear (normalmente un
   registro **A** para el dominio raíz y un **CNAME** para `www`). Use los
   valores que Vercel muestre en pantalla en ese momento, no valores fijos.
3. Como el dominio se compró en **Cloudflare**, esos mismos registros se
   agregan en el **dashboard de Cloudflare** → seleccione
   `conversacionespendientes.net` → **DNS → Records → Add record** → copie
   ahí exactamente lo que mostró Vercel.
4. Importante: mientras Vercel emite el certificado SSL, ponga esos registros
   en modo **"DNS only"** (nube gris, no naranja) en Cloudflare. Una vez que
   Vercel confirme el dominio con un check verde, puede activar el proxy
   naranja de Cloudflare si lo desea.
5. Espere unos minutos a que se propague el DNS y recargue la pantalla de
   Domains en Vercel — cuando aparezca en verde, el sitio ya sirve en
   `https://conversacionespendientes.net`.

## Paleta de marca

| Token | Valor | Uso |
|---|---|---|
| `verde-700` | `#1a5c45` | Fondo oscuro principal (hero, footer) |
| `rosa-500` | `#e14f78` | Acento, CTAs |
| `crema` | `#faf8f4` | Fondo claro |
