# Mis Servicios — Seguimiento de pagos de servicios públicos

Aplicación web (funciona en el celular y en el computador) para llevar el control de
los pagos de servicios públicos: administración, luz, acueducto y gas de varios
inmuebles. Pensada para ser muy sencilla de usar.

Este proyecto vive en la misma carpeta del repositorio `Rana`, pero es una
aplicación **totalmente independiente** (otro `package.json`, otra base de datos,
otro despliegue) — no tiene relación con el sistema de denuncias que está en la
carpeta `src/` de la raíz del repositorio.

## Qué incluye

- **Inicio**: resumen del mes actual ("7 de 10 pagados") y la lista de todos los
  servicios agrupados por inmueble, cada uno con su estado (Pagado / Pendiente).
- **Detalle de cada servicio**: número de cuenta o referencia, botón grande para
  marcar el mes actual como pagado o pendiente, **botón de pago** que lleva
  directamente a la plataforma de pago de la empresa (PSE, Davivienda, etc.), y un
  historial tipo calendario de los 12 meses del año que se puede tocar para
  corregir cualquier mes.
- **Calendario**: recorrer mes a mes (como un calendario) el estado de todos los
  servicios a la vez.
- Se puede **instalar en el celular** como si fuera una app (desde el navegador,
  opción "Agregar a la pantalla de inicio" / "Instalar app").
- Los datos quedan guardados en una base de datos, así que se ven igual desde el
  celular y desde el computador.

## Datos iniciales

Los 10 servicios (Administración, Luz ENEL, Acueducto, Gas Vanti, Gas Alcanos) de
los inmuebles Alto Velo 707, Oficina 507 y Eva Girardot 404 vienen precargados con
los números de cuenta/referencia y los links de pago del archivo `Servicios_2026.xlsx`
que se usó como base. Se cargan automáticamente la primera vez que alguien abre la
aplicación (no hay que hacer nada aparte).

## Stack técnico

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Base de datos SQLite vía `@libsql/client`: en desarrollo local usa un archivo
  (`data/servicios.db`), y en producción se conecta a una base de datos **Turso**
  (SQLite alojado y persistente, gratis) usando exactamente el mismo código.
- Sin usuario ni clave: es una app personal de un solo usuario.

## Requisitos

- Node.js 20+

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Variables de entorno

Ninguna es obligatoria para desarrollo local.

| Variable | Descripción | Por defecto |
|---|---|---|
| `SERVICIOS_DATA_DIR` | (Solo desarrollo local) Carpeta donde se guarda la base de datos. | `./data` |
| `TURSO_DATABASE_URL` | URL de la base de datos Turso. **Necesaria en producción** — sin ella, los datos se guardan en un archivo temporal que Vercel borra en cada despliegue. | — |
| `TURSO_AUTH_TOKEN` | Token de autenticación de la base de datos Turso. | — |

## Guía de despliegue (paso a paso, sin experiencia técnica)

Esta guía asume que ya tiene una cuenta de Vercel conectada a GitHub (si ya
desplegó el sistema de denuncias de este mismo repositorio, puede usar la misma
cuenta). Es gratis y no pide tarjeta de crédito.

### 1. Crear un proyecto de Vercel nuevo (independiente del de denuncias)

1. En **vercel.com**, haga clic en **"Add New…" → "Project"**.
2. Busque y seleccione el repositorio **`Rana`** y haga clic en **"Import"**.
3. **Importante**: antes de darle a Deploy, en **"Root Directory"** haga clic en
   **"Edit"** y escriba `servicios-app`. Esto le dice a Vercel que este proyecto
   nuevo es solo la carpeta de la app de servicios, no la app de denuncias.
4. Vercel detecta automáticamente que es un proyecto Next.js — no hay que cambiar
   ningún otro campo.
5. Todavía no haga clic en Deploy — primero agregue la base de datos (paso 2).

### 2. Activar la base de datos persistente (Turso)

1. En la pantalla de importación (o después, en el proyecto ya creado, en la
   pestaña **"Storage"**), haga clic en **"Browse Marketplace"** o
   **"Connect Database"**.
2. Busque **"Turso"** y selecciónelo (servicio de base de datos gratuito,
   compatible con SQLite). Puede usar la misma cuenta de Turso del proyecto de
   denuncias si ya la tiene, pero cree una **base de datos nueva y distinta**
   (por ejemplo `servicios`) — no reutilice la de denuncias.
3. Vercel conecta automáticamente las variables `TURSO_DATABASE_URL` y
   `TURSO_AUTH_TOKEN` a este proyecto.

### 3. Publicar

1. Haga clic en **"Deploy"**.
2. Cuando termine (1-2 minutos), Vercel le da un link como
   `https://servicios-app-xxxx.vercel.app`. Ese es el link que va a usar su papá
   (puede guardarlo como acceso directo en la pantalla de inicio del celular).

### 4. Instalar como app en el celular

- **Android (Chrome)**: abrir el link, tocar el menú (⋮) y elegir **"Instalar
  app"** o **"Agregar a pantalla de inicio"**.
- **iPhone (Safari)**: abrir el link, tocar el botón de compartir (□↑) y elegir
  **"Agregar a pantalla de inicio"**.

Después de esto queda un ícono en el celular que abre la app directamente, sin
necesidad de buscarla en el navegador.

## Compilar para producción

```bash
npm run build
npm run start
```

## Estructura del proyecto

```
servicios-app/
  src/
    app/            Páginas y server actions (Next.js App Router)
    components/     Componentes de React (tarjetas, calendario, navegación)
    lib/            Base de datos, datos iniciales, formato de fechas/moneda
  public/           Ícono y manifest para instalar la app
```
