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
- SQLite (`better-sqlite3`) como base de datos embebida — sin dependencias externas
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
| `RANA_DATA_DIR` | Carpeta donde se guardan la base de datos SQLite y los archivos subidos. | `./data` |

**Importante:** antes de poner el sistema en producción, cambie la clave por
defecto generando un nuevo hash y configurando `ADMIN_USERNAME` /
`ADMIN_PASSWORD_HASH`. La clave nunca se guarda en texto plano, solo su hash.

## Datos y almacenamiento

- Los datos de los casos, anexos e infografías se guardan en `data/rana.db`
  (SQLite). Los soportes y fotografías subidas se guardan en `data/uploads/`.
  Ambos quedan fuera del control de versiones (`.gitignore`).
- Para despliegues con más de una instancia del servidor, `data/` debe montarse en
  un volumen persistente compartido (SQLite no es apto para múltiples procesos
  escribiendo sobre discos distintos).

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
