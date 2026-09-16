# Notas para trabajar en seguimiento-agro-app

Ver `README.md` para la descripción funcional completa. Esto es solo lo que
conviene tener presente al tocar código de esta app, aprendido a las malas
en sesiones anteriores.

## Mapa de Colombia (`/mapa`)

`src/data/departamentos-mapa.json` **no se escribe a mano** — lo genera
`scripts/generar-mapa-colombia.py` a partir de un GeoJSON de departamentos.
Para volver a generarlo (por ejemplo, para ajustar el tamaño del inset de
San Andrés), leer el docstring de ese script y correrlo; no editar el JSON
directamente.

Lecciones ya aprendidas sobre ese mapa (para no repetir el mismo error):

- **San Andrés y Providencia están separadas por ~90 km de mar abierto.**
  Si se calcula un solo bounding box para las tres islas (San Andrés,
  Providencia, Santa Catalina) y se dibujan en un único recuadro, ese
  recuadro es casi todo mar vacío — las islas se ven como puntos
  diminutos sin importar cuán grande se haga el recuadro exterior. La
  solución es tratarlas como dos grupos geográficos separados, cada uno
  recortado y escalado de forma independiente, en dos recuadros propios
  (como hacen los mapas políticos oficiales de Colombia). Ver el script.
- Ese inset se dibuja a **su propia escala, deliberadamente exagerada**
  ("fuera de escala"), no proporcional al resto del mapa — así es como se
  ve en la cartografía oficial colombiana, y así lo pidió el usuario
  explícitamente (comparó el tamaño esperado con el de Panamá en un mapa
  de referencia, no con el de otro departamento).
- El inset vive en una **franja propia reservada arriba del mapa**
  (el continente se desplaza hacia abajo para dejarle sitio), no en el
  hueco libre que quede junto a la costa del Chocó — así se puede agrandar
  sin riesgo de que choque visualmente con el resto del mapa.
- Antes de subir cualquier cambio a este mapa, verificar visualmente con
  una captura (Playwright headless local, ver sesiones anteriores) que:
  las islas se vean grandes/reconocibles, no se solapen con el continente,
  y el clic sobre ellas siga seleccionando el departamento y mostrando su
  panel de detalle.

## Marca de agua de fondo (`.fondo-campo` en `globals.css`)

Es un patrón SVG en mosaico (`public/patron-campo.svg`, campesinos, ganado,
espigas y hojas), no una foto — una foto única con `background-size: cover`
solo se ve una vez, arriba de la página, y queda en color plano vacío en el
resto de una página larga; un patrón con `background-repeat: repeat` se ve
igual en cualquier alto/ancho.

**Los `background-image` en CSS se apilan con el primero de la lista
arriba de los demás** (al revés de lo que uno esperaría). Si se pone un
degradado opaco a pantalla completa antes que el patrón en la lista de
`background-image`, el degradado tapa el patrón por completo y no se ve
nada aunque todo esté bien configurado (mismo bug ya se dio aquí: la
página se veía con un degradado liso, sin ningún ícono). El patrón va
siempre primero en la lista; el degradado (o color de fondo) va después,
como capa base.

## Gotchas de despliegue en Vercel (ya resueltos, no repetir)

- **`.gitignore` con `data` en vez de `/data`** ignora *cualquier* carpeta
  llamada `data` en cualquier nivel del árbol — incluida `src/data/`, que
  contiene datos reales de la app (catálogos, geometría del mapa), no solo
  la carpeta de la base de datos SQLite local. Esto causó que el build
  funcionara en local (los archivos existían en disco, aunque no
  estuvieran en git) pero fallara en Vercel con "Module not found" al
  clonar el repo limpio. La regla correcta es `/data` (ancla a la raíz del
  proyecto). Si un build de Vercel falla con "Module not found" para algo
  que sí existe en el repo local, **lo primero que hay que revisar es si
  el archivo realmente llegó a git** (`git ls-files <ruta>` o
  `git check-ignore -v <ruta>`), clonando el repo a una carpeta limpia y
  corriendo `npm install && npm run build` ahí antes de reintentar nada.
- Los imports usan **rutas relativas** (`../lib/...`), no el alias `@/`.
  Se intentó el alias (vía tsconfig `paths` y luego vía `webpack.alias`)
  y no se resolvía de forma confiable en el build de Vercel para esta app
  (que vive en una subcarpeta del repositorio, no en la raíz) — no vale la
  pena volver a intentarlo sin una razón de peso.
