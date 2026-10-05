# Control Político — Preparación de debates en el concejo municipal

Aplicación web para preparar debates de control político en un concejo municipal:
desde la proposición de citación y el cuestionario hasta el guion de intervención
y el uso en el recinto.

Este proyecto vive en la misma carpeta del repositorio `Rana`, pero es una
aplicación **totalmente independiente** (otro `package.json`, otra base de datos,
otro despliegue).

## Qué incluye

Cada debate tiene estas pestañas:

- **Resumen**: datos del debate (tema, instancia, citantes, objetivo,
  justificación, fechas, estado), **cronograma de plazos** calculado en días
  hábiles y una **lista de verificación** de qué falta para estar listo.
- **Cuestionario**: citados e invitados, y las preguntas organizadas por
  funcionario y eje temático, con orden ajustable. Cada pregunta se revisa con
  reglas fijas y muestra observaciones de redacción (preguntas de sí/no,
  varias preguntas en una, preguntas que no piden datos verificables).
- **Pruebas y peticiones**: fuentes que sostienen el debate (documentos, datos,
  prensa, testimonios) con su hallazgo y si están verificadas; y seguimiento de
  **derechos de petición** con su vencimiento (10, 15 o 30 días hábiles, Ley 1755
  de 2015), avisando si vencen después del límite para enviar el cuestionario.
- **Respuestas**: registro de lo que respondió la administración, evaluación
  (completa, parcial, evasiva, no respondida) y repregunta para el recinto.
- **Guion**: secciones de la intervención con minutos asignados, contrastadas con
  el tiempo disponible.
- **Modo debate**: vista para el recinto con cronómetro por sección, el guion en
  letra grande, las repreguntas para ir tachando y los hallazgos a citar.
- **Documentos**: descarga en Word de la **proposición con el cuestionario**, la
  **matriz de respuestas** y el **guion**. Lo que falte aparece como `[COMPLETAR]`.

En **Configuración** se definen la corporación, el municipio, el concejal por
defecto y los plazos del reglamento interno.

### Plazos

- Los días hábiles excluyen sábados, domingos y festivos de Colombia, calculados
  para cualquier año (Ley 51 de 1983 y fechas según la Pascua).
- **Límite para enviar el cuestionario**: anticipación no menor de 5 días
  (Constitución, art. 313 num. 11). La app usa un cálculo conservador: deja 5 días
  hábiles completos entre el envío y el debate. El número es configurable.
- **Respuestas escritas** y **minutos de intervención**: dependen del reglamento
  interno de cada concejo; configúrelos antes de usar la herramienta.

La herramienta no reemplaza la revisión jurídica: verifique las citas normativas
y el formato de los documentos frente al reglamento interno de su concejo.

## Stack técnico

- Next.js 15 (App Router, server actions) + TypeScript + Tailwind CSS
- Base de datos SQLite vía `@libsql/client`: en desarrollo usa un archivo
  (`data/control-politico.db`) y en producción una base **Turso** con el mismo código.
- `docx` para generar los documentos Word.

## Instalación y desarrollo

Requiere Node.js 20+.

```bash
npm install
npm run dev     # http://localhost:3000
npm test        # pruebas de plazos y reglas de redacción
```

En la pantalla inicial está el botón **Cargar ejemplo**, que crea un debate con
datos ficticios para conocer la herramienta.

## Variables de entorno

| Variable | Descripción |
|---|---|
| `APP_PASSWORD` | Clave para entrar a la app. **Configúrela en producción**: sin ella la app queda abierta a cualquiera que tenga el link. |
| `SESSION_SECRET` | (Opcional) Secreto para firmar la cookie de sesión. Si no se define se deriva de la clave. |
| `TURSO_DATABASE_URL` / `TURSO_AUTH_TOKEN` | Base de datos persistente en producción. Sin ellas, en Vercel los datos se guardan en `/tmp` y se pierden. |
| `CONTROL_DATA_DIR` | (Solo local) Carpeta de la base de datos. Por defecto `./data`. |

## Despliegue en Vercel

Igual que las otras apps del repositorio: crear un proyecto nuevo en Vercel
importando el repositorio `Rana`, con **Root Directory** = `control-politico`,
conectar una base Turso desde la pestaña *Storage* y agregar `APP_PASSWORD` en
*Environment Variables*.

## Estructura

```
src/
  app/                    Páginas y server actions (actions.ts)
    debates/[id]/         Pestañas de cada debate
    api/debates/[id]/documento/[tipo]/  Descarga de documentos Word
  components/             Formularios, pestañas, modo debate
  lib/
    plazos.ts             Días hábiles y festivos de Colombia
    analisis.ts           Cronograma, lista de verificación, reglas de redacción
    documentos.ts         Generación de documentos Word
    debates.ts, db.ts     Acceso a datos
```
