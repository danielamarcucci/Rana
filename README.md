# Rana — Sistema de denuncias de la Red Nacional de Defensa por la Reforma Agraria

Aplicación web para la recepción y atención de denuncias sobre amenazas, agresiones
o hechos de violencia contra personas y comunidades beneficiarias de la Reforma
Agraria, según el documento *"Paso a paso para la recepción y atención de las
denuncias"* de la Red.

## Qué incluye

- **Formulario público de denuncia** (`/denuncia`): cualquier persona puede reportar
  un hecho. Genera un número de radicado único (`AAAAMMDD#NNNN`), muestra un mensaje
  de confirmación y permite descargar el formulario en Word.
- **Panel privado de la Red** (`/admin`): sitio con usuario y clave, no indexable por
  buscadores (`robots.txt` + cabecera `X-Robots-Tag`), con:
  - Matriz de casos con radicado, fecha, canal de recepción, lugar, estado (lista
    desplegable), acompañamiento e infografía.
  - **Formulario ampliado**, prediligenciado con la información pública, con todas
    las preguntas adicionales que solo ve el equipo de la Red (marcadas "Solo Red"),
    incluidas las condicionales de antecedentes y medidas de protección, carga de
    soportes, y bloques repetibles (predios, antecedentes, presuntos responsables).
  - **Registro manual de casos** (llamada, mensaje, correo, presencial).
  - **Anexos jurídicos**: generación automática de Derecho de Petición, Denuncia
    Pública y Alerta Agraria a partir de los modelos de la Red, con mail-merge de
    los campos conocidos del caso y marcadores `[COMPLETAR: …]` para lo que requiere
    redacción humana. Flujo de revisar/editar/descargar y versión final con
    historial de versiones.
  - **Ficha gráfica (infografía)** 1080×1350 en PNG y PDF, generada solo a partir de
    un anexo en versión final, que excluye por diseño datos personales y reservados
    (nombre, cédula, matrícula, catastro, coordenadas, medidas de autoprotección).

## Stack técnico

- Next.js 15 (App Router) + TypeScript + Tailwind CSS
- Base de datos SQLite vía `@libsql/client`: en desarrollo local usa un archivo
  (`data/rana.db`), y en producción se conecta a una base de datos **Turso**
  (SQLite alojado y persistente, gratis) usando exactamente el mismo código.
- Archivos subidos (soportes y fotos): en desarrollo local se guardan en disco
  (`data/uploads/`); en producción se guardan en **Vercel Blob** (persistente,
  gratis en el plan Hobby).
- `docx` para generar los documentos Word
- `@napi-rs/canvas` + `pdf-lib` para generar la infografía en PNG/PDF
- Autenticación con cookie de sesión firmada (`jose`) y clave con hash `bcrypt`
- Validación de datos con `zod`

## Requisitos

- Node.js 20+

## Instalación y desarrollo

```bash
npm install
npm run dev
```

La aplicación queda disponible en `http://localhost:3000`.

## Variables de entorno

Ninguna es obligatoria para desarrollo local (hay valores por defecto), pero se
recomienda configurarlas antes de desplegar en producción:

| Variable | Descripción | Por defecto |
|---|---|---|
| `SESSION_SECRET` | Secreto para firmar la cookie de sesión del panel privado. **Obligatorio en producción** (la app no arranca sin él). | — |
| `ADMIN_USERNAME` | Usuario del panel privado. | `derechoshumanosred` |
| `ADMIN_PASSWORD_HASH` | Hash `bcrypt` de la clave del panel privado. Generar con `node -e "console.log(require('bcryptjs').hashSync('NUEVA_CLAVE', 12))"`. | Hash de `R3dCosecha#2026` |
| `RED_CONTACTO_EMAIL` | Correo de contacto de la Red usado en los anexos generados. | `contacto@rednacionalreformaagraria.org` |
| `RANA_DATA_DIR` | (Solo desarrollo local) Carpeta donde se guardan la base de datos y los archivos subidos. | `./data` |
| `TURSO_DATABASE_URL` | URL de la base de datos Turso. **Necesaria en producción** — sin ella, los datos se guardan en un archivo local que Vercel borra en cada despliegue. | — |
| `TURSO_AUTH_TOKEN` | Token de autenticación de la base de datos Turso. | — |
| `BLOB_READ_WRITE_TOKEN` | Token de Vercel Blob para guardar soportes y fotos de forma persistente. Vercel lo agrega automáticamente al conectar un almacén Blob al proyecto. | — |

**Importante:** antes de poner el sistema en producción, cambie la clave por
defecto generando un nuevo hash y configurando `ADMIN_USERNAME` /
`ADMIN_PASSWORD_HASH`. La clave nunca se guarda en texto plano, solo su hash.

## Datos y almacenamiento

- **En desarrollo local** (`npm run dev`), los datos se guardan en `data/rana.db`
  (archivo SQLite) y los archivos subidos en `data/uploads/`. Ambos quedan fuera
  del control de versiones (`.gitignore`) y no requieren ninguna cuenta externa.
- **En producción (Vercel)** el disco no es persistente: cada despliegue empieza
  "en blanco". Por eso la aplicación usa Turso (base de datos) y Vercel Blob
  (archivos) cuando sus variables de entorno están presentes — los datos quedan
  guardados de forma duradera, fuera del propio servidor. Ver la guía de
  despliegue más abajo.

## Guía de despliegue (paso a paso, sin experiencia técnica)

Esta guía asume que usted ya tiene acceso a la cuenta de GitHub donde vive el
repositorio (`danielamarcucci/Rana`) y que no tiene ninguna otra cuenta creada.
Todo lo que sigue es gratuito y no pide tarjeta de crédito.

### 1. Crear la cuenta de hosting (Vercel)

1. Vaya a **vercel.com** y haga clic en **"Sign Up"**.
2. Elija **"Continue with GitHub"** e inicie sesión con la cuenta de GitHub que
   tiene acceso al repositorio `Rana`.
3. Acepte los permisos que pida Vercel para leer sus repositorios.

### 2. Importar el proyecto

1. En el panel de Vercel, haga clic en **"Add New…" → "Project"**.
2. Busque y seleccione el repositorio **`Rana`** y haga clic en **"Import"**.
3. Vercel detecta automáticamente que es un proyecto Next.js — no hay que
   cambiar ningún campo de "Build & Output Settings".
4. **Antes de darle a "Deploy"**, baje hasta "Environment Variables" y agregue
   `SESSION_SECRET` con cualquier texto largo y aleatorio (por ejemplo, generado
   en <https://1password.com/password-generator/>, 40 caracteres). Guárdelo en
   un lugar seguro.
5. Todavía no haga clic en Deploy — primero agregue la base de datos (paso 3),
   porque así la variable queda configurada desde el primer despliegue.

### 3. Activar la base de datos persistente (Turso)

1. Dentro de la pantalla de importación (o después, en el proyecto ya creado, en
   la pestaña **"Storage"**), haga clic en **"Browse Marketplace"** o
   **"Connect Database"**.
2. Busque **"Turso"** y selecciónelo. Es un servicio de base de datos gratuito,
   compatible con SQLite.
3. Siga el flujo de "Add Integration" (puede pedir crear una cuenta de Turso con
   el mismo inicio de sesión de GitHub — un clic, sin formularios).
4. Cree una base de datos nueva (cualquier nombre, por ejemplo `rana`).
5. Vercel conecta automáticamente las variables `TURSO_DATABASE_URL` y
   `TURSO_AUTH_TOKEN` al proyecto — no hay que copiarlas a mano.

### 4. Activar el almacenamiento de archivos (Vercel Blob)

1. En la misma pestaña **"Storage"** del proyecto, haga clic en
   **"Create Database"** (o "Create Store") y elija **"Blob"**.
2. Póngale un nombre (por ejemplo `rana-archivos`) y conéctelo al proyecto.
3. Vercel agrega automáticamente la variable `BLOB_READ_WRITE_TOKEN`.

### 5. Elegir la rama a publicar

1. En **"Settings" → "Git"**, en **"Production Branch"**, escriba
   `claude/documento-20260805-pasos-wmd97f` (el nombre de la rama donde está el
   código de este sistema) y guarde.

### 6. Publicar

1. Vuelva a la pestaña **"Deployments"** y haga clic en **"Redeploy"** (o
   termine el asistente de importación con **"Deploy"** si es la primera vez).
2. Cuando termine (1-2 minutos), Vercel le da un link como
   `https://rana-xxxx.vercel.app`. Ese es el link público.

### Los dos links que necesita, una vez publicado

- **Formulario público**: `https://SU-DOMINIO.vercel.app/denuncia`
- **Panel privado de la Red**: `https://SU-DOMINIO.vercel.app/admin/login`
  (usuario y clave: los que configuró, o los que vienen por defecto si no los
  cambió — ver la sección de variables de entorno arriba).

### Después de publicar

- Cambie la clave del panel por una propia (ver "Variables de entorno" arriba)
  antes de compartir el link con el equipo de la Red.
- Si el dominio `vercel.app` no le sirve, en "Settings → Domains" puede conectar
  un dominio propio si lo tiene.

## Seguridad

- El panel `/admin` está protegido por middleware en todas sus rutas y en la API
  `/api/admin/*`.
- La página pública de confirmación/descarga usa un token aleatorio de un solo caso
  (no el radicado, que es secuencial y por tanto adivinable) para evitar que
  cualquiera pueda enumerar denuncias ajenas.
- El login tiene un limitador de intentos en memoria (10 minutos / 8 intentos por
  IP). Para despliegues con varias instancias, reemplazar por un almacén
  compartido (Redis, etc.).
- La ficha gráfica excluye automáticamente del contenido sugerido los datos
  personales y reservados; aun así, el equipo de la Red debe revisar el texto
  libre antes de aprobar la versión final, tal como indica el flujo de trabajo.

## Compilar para producción

```bash
npm run build
npm run start
```

## Estructura del proyecto

```
src/
  app/            Páginas y rutas de API (Next.js App Router)
  components/     Componentes de React (formularios, panel admin)
  lib/            Lógica de dominio: base de datos, autenticación, catálogos,
                  generación de documentos Word e infografías
  data/           Catálogo de departamentos y municipios de Colombia
```

## Alcance y próximos pasos sugeridos

Este proyecto implementa el flujo completo descrito en el documento de referencia.
Algunas decisiones de implementación quedan documentadas para quien continúe el
proyecto:

- Los anexos jurídicos (derecho de petición, denuncia pública, alerta agraria)
  completan automáticamente los campos que se pueden derivar del formulario, y
  marcan en rojo `[COMPLETAR: …]` los párrafos que requieren redacción o criterio
  jurídico humano — no se genera lenguaje legal por IA.
  Antes de descargar/publicar, el equipo de la Red debe revisar y editar.
- La infografía es una plantilla propia (no se recibió un archivo de diseño de
  referencia); el color, la tipografía y el logo pueden ajustarse en
  `src/lib/infografiaRender.ts` si la Red define una línea gráfica definitiva.
- El listado de municipios de Colombia usado en los menús desplegables es un
  catálogo público de referencia; se recomienda contrastarlo con la división
  político-administrativa (DIVIPOLA) oficial del DANE antes de producción.
