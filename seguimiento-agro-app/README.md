# Seguimiento sectorial agro — tablero de control del sector agricultura

Aplicación web propuesta por la **Unidad de Información Estratégica del Despacho**
para hacer seguimiento a los planes, programas, convenios y líneas de acción del
sector agricultura: viceministerios, direcciones, oficinas asesoras del
Ministerio de Agricultura y Desarrollo Rural, y las entidades del sector
(adscritas y vinculadas).

Este proyecto vive en la misma carpeta del repositorio `Rana`, pero es una
aplicación **totalmente independiente** (otro `package.json`, otra base de
datos, otro despliegue) — no tiene relación con el sistema de denuncias de la
raíz del repositorio ni con `servicios-app`.

## Dos interfaces separadas

- **Carga de información** (`/cargar`, usuario `Equipo`): una pantalla única y
  sencilla para registrar una actuación en pocos pasos. Al guardar, el
  formulario se limpia y queda lista para cargar la siguiente, sin tener que
  navegar a ningún otro lado. Este usuario **no ve** el tablero, el mapa ni
  el detalle/edición de actuaciones — solo carga información.
- **Tablero dinámico de seguimiento** (`/` y `/mapa`, usuarios
  `UnidadInformación` y `Despacho`): el tablero de control, el mapa
  interactivo y el detalle/edición/historial de cada actuación, descritos
  abajo. Estos usuarios también pueden usar `/cargar` si necesitan registrar
  algo rápidamente.

La separación se aplica automáticamente al iniciar sesión (cada usuario cae en
su pantalla) y también por `src/middleware.ts`: el usuario `Equipo` es
redirigido a `/cargar` si intenta abrir cualquier otra página.

## Qué incluye

- **Tablero de control** (`/`): resumen ejecutivo con indicadores clave
  (número de actuaciones, avance promedio, recursos destinados/ejecutados,
  beneficiarios totales, mujeres y jóvenes), filtros por tipo, estado,
  dependencia/entidad, departamento, avance y texto libre, y una tabla
  detallada de todas las actuaciones registradas.
- **Registro de actuaciones** (planes, programas, convenios o líneas de
  acción), con:
  - Dependencia o entidad responsable (viceministerios y sus direcciones,
    oficinas asesoras, entidades adscritas y vinculadas).
  - Cobertura geográfica: se pueden agregar varios departamentos, y para cada
    uno elegir municipios específicos o dejarlo aplicado a todo el
    departamento.
  - Fechas, estado, nivel de avance, fuente de financiación, recursos
    destinados y ejecutados.
  - Beneficiarios: total, mujeres y jóvenes.
  - Comentarios de seguimiento.
  - **Historial de versiones**: cada vez que se edita una actuación se guarda
    una copia de cómo estaba antes, para no perder información ni trazabilidad
    de quién cambió qué y cuándo.
- **Mapa interactivo** (`/mapa`): mapa de Colombia por departamento, coloreado
  según el número de actuaciones, el avance promedio o los recursos
  ejecutados (con los mismos filtros del tablero). Al hacer clic en un
  departamento se despliega un panel con el detalle agregado (recursos,
  beneficiarios, avance), los municipios con actuaciones y la lista completa
  de actuaciones de ese departamento/municipio.
- **Descarga a Excel** (botón "Descargar Excel" en el tablero): exporta toda la
  información alojada (o solo lo que esté filtrado) en un archivo `.xlsx` con
  una hoja de actuaciones y otra de ubicaciones detalladas, lista para
  análisis o para compartir.
- **Acceso restringido** con tres usuarios (ver más abajo), sesión con cookie
  firmada y todas las páginas y la API protegidas por middleware.

## Usuarios

| Usuario | Clave | Perfil | Interfaz |
|---|---|---|---|
| `UnidadInformación` | `revoluciónporlavida` | Unidad de Información Estratégica del Despacho | Tablero dinámico (+ carga) |
| `Despacho` | `campomilagro2026` | Despacho del Ministro | Tablero dinámico (+ carga) |
| `Equipo` | `Report32026` | Equipo de carga de información | Solo carga de información |

`UnidadInformación` y `Despacho` tienen los mismos permisos (crear, editar,
eliminar y descargar) y ven el tablero completo. `Equipo` solo puede cargar
actuaciones nuevas desde `/cargar`. Los tres se crean automáticamente la
primera vez que la aplicación se conecta a la base de datos (y también se
agregan solos si faltan en una base ya existente). Si en algún momento se
quiere cambiar alguna clave, se puede actualizar directamente en la tabla
`usuarios` de la base de datos (el valor guardado es un hash `bcrypt`, nunca
la clave en texto plano).

## Stack técnico

- Next.js 15 (App Router) + TypeScript + Tailwind CSS (colores azul y naranja,
  la identidad de "Campo Milagro" del sector agricultura).
- Base de datos SQLite vía `@libsql/client`: en desarrollo local usa un
  archivo (`data/agro.db`), y en producción se conecta a una base de datos
  **Turso** (SQLite alojado y persistente, gratis) usando exactamente el mismo
  código — así los datos que se van registrando **no se pierden** entre
  despliegues.
- `exceljs` para generar la descarga en Excel.
- Autenticación con cookie de sesión firmada (`jose`) y claves con hash
  `bcrypt`.
- Validación de datos con `zod`.
- Mapa de Colombia dibujado con la división político-administrativa oficial
  (departamentos DIVIPOLA/DANE), sin depender de servicios externos de mapas.

## Requisitos

- Node.js 20+

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Variables de entorno

Ninguna es obligatoria para desarrollo local (hay valores por defecto), pero
se recomienda configurarlas antes de desplegar en producción:

| Variable | Descripción | Por defecto |
|---|---|---|
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión. **Obligatorio en producción** (la app no arranca sin él). | — |
| `AGRO_DATA_DIR` | (Solo desarrollo local) Carpeta donde se guarda la base de datos. | `./data` |
| `TURSO_DATABASE_URL` | URL de la base de datos Turso. **Necesaria en producción** — sin ella, los datos se guardan en un archivo temporal que Vercel borra en cada despliegue. | — |
| `TURSO_AUTH_TOKEN` | Token de autenticación de la base de datos Turso. | — |

## Datos y almacenamiento

- **En desarrollo local** (`npm run dev`), los datos se guardan en
  `data/agro.db` (archivo SQLite), fuera del control de versiones
  (`.gitignore`).
- **En producción (Vercel)** el disco no es persistente: cada despliegue
  empieza "en blanco". Por eso la aplicación usa **Turso** cuando sus
  variables de entorno están presentes — los datos (actuaciones, historial de
  cambios, catálogo de dependencias) quedan guardados de forma duradera,
  fuera del propio servidor, y se pueden seguir descargando en Excel en
  cualquier momento como respaldo adicional.

## Guía de despliegue (paso a paso, sin experiencia técnica)

Esta guía asume que ya tiene (o puede crear) una cuenta de Vercel conectada a
GitHub con acceso al repositorio `danielamarcucci/Rana`. Es gratis y no pide
tarjeta de crédito.

### 1. Crear un proyecto de Vercel nuevo (independiente de los demás)

1. En **vercel.com**, haga clic en **"Add New…" → "Project"**.
2. Busque y seleccione el repositorio **`Rana`** y haga clic en **"Import"**.
3. **Importante**: antes de darle a Deploy, en **"Root Directory"** haga clic
   en **"Edit"** y escriba `seguimiento-agro-app`. Esto le dice a Vercel que
   este proyecto nuevo es solo la carpeta de esta app, no las otras que viven
   en el mismo repositorio.
4. Vercel detecta automáticamente que es un proyecto Next.js — no hay que
   cambiar ningún otro campo de "Build & Output Settings".
5. Baje hasta "Environment Variables" y agregue `SESSION_SECRET` con un texto
   largo y aleatorio (por ejemplo, generado en
   <https://1password.com/password-generator/>, 40 caracteres). Guárdelo en un
   lugar seguro.
6. Todavía no haga clic en Deploy — primero agregue la base de datos (paso 2).

### 2. Activar la base de datos persistente (Turso)

1. En la pantalla de importación (o después, en el proyecto ya creado, en la
   pestaña **"Storage"**), haga clic en **"Browse Marketplace"** o
   **"Connect Database"**.
2. Busque **"Turso"** y selecciónelo (servicio de base de datos gratuito,
   compatible con SQLite). Puede usar la misma cuenta de Turso de otros
   proyectos de este repositorio si ya la tiene, pero cree una **base de datos
   nueva y distinta** (por ejemplo `seguimiento-agro`) — no reutilice la de
   otra aplicación.
3. Vercel conecta automáticamente las variables `TURSO_DATABASE_URL` y
   `TURSO_AUTH_TOKEN` a este proyecto.

### 3. Elegir la rama a publicar

1. En **"Settings" → "Git"**, en **"Production Branch"**, escriba el nombre de
   la rama donde está el código de este sistema y guarde.

### 4. Publicar

1. Haga clic en **"Deploy"** (o "Redeploy" si el proyecto ya existía).
2. Cuando termine (1-2 minutos), Vercel le da un link como
   `https://seguimiento-agro-xxxx.vercel.app`. Compártalo solo con quienes
   deban tener acceso, junto con los usuarios y claves de la sección
   "Usuarios" arriba.

### Después de publicar

- Si algún día cambia la estructura de viceministerios/direcciones/entidades,
  no es necesario tocar código: desde la base de datos se pueden agregar
  nuevas dependencias (endpoint `POST /api/dependencias`), o se puede ampliar
  el catálogo semilla en `src/data/dependencias-seed.ts` para que quede en el
  código.
- Se recomienda hacer respaldos periódicos descargando el Excel completo
  desde el tablero, además de la persistencia en Turso.

## Compilar para producción

```bash
npm run build
npm run start
```

## Estructura del proyecto

```
seguimiento-agro-app/
  src/
    app/            Páginas y rutas de API (Next.js App Router)
    components/     Componentes de React (tablero, formulario, mapa, filtros)
    lib/            Lógica de dominio: base de datos, autenticación,
                    actuaciones, agregación para el mapa, exportación a Excel
    data/           Catálogo de dependencias/entidades del sector y de
                    departamentos/municipios de Colombia, y la geometría
                    del mapa (generada a partir de la división político-
                    administrativa oficial)
  src/middleware.ts Protege todas las páginas y la API salvo /login
```

## Seguridad

- Todas las páginas y rutas de la API están protegidas por
  `src/middleware.ts`, que exige una sesión válida (cookie firmada) salvo en
  `/login` y `/api/login`.
- Las claves de los usuarios nunca se guardan en texto plano, solo su hash
  `bcrypt`.
- Antes de compartir el enlace públicamente, considere cambiar las claves por
  defecto si el nivel de exposición lo requiere (ver sección "Usuarios").

## Fuentes de la estructura institucional

El catálogo de viceministerios, direcciones, oficinas asesoras y entidades
adscritas/vinculadas (`src/data/dependencias-seed.ts`) se construyó con base
en el organigrama publicado por el Ministerio de Agricultura y Desarrollo
Rural (minagricultura.gov.co/el-ministerio/organigrama). Como la estructura
del Estado puede cambiar, el catálogo es una semilla inicial editable desde
la propia aplicación, no un valor fijo en el código.

## Créditos de la foto de fondo

La foto de campo colombiano usada como marca de agua de fondo
(`public/fondo-campo.jpg`, cultivo de arroz en Distracción, La Guajira) es de
Wikimedia Commons, bajo licencia
[CC BY-SA 4.0](https://creativecommons.org/licenses/by-sa/4.0/deed.es):
<https://commons.wikimedia.org/wiki/File:Cultivo_de_arroz_en_Distracci%C3%B3n.JPG>.
