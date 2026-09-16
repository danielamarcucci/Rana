# Notas para trabajar en seguimiento-agro-app

Ver `README.md` para la descripción funcional completa. Esto es solo lo que
conviene tener presente al tocar código de esta app, aprendido a las malas
en sesiones anteriores.

## Mapa de Colombia (`/mapa`)

**El filtro de departamento/municipio de `/api/mapa` no debe usarse para
calcular `porDepartamento`** (el agregado que colorea el mapa completo):
si se filtra por el departamento seleccionado, el resto de departamentos
se quedan sin datos y el mapa se ve "en blanco" apenas se elige uno. Ya
pasó una vez (bug real, encontrado al exponer el filtro de departamento en
el panel de Filtros de esta página — antes solo se disparaba haciendo clic
en el mapa, así que era menos evidente). La regla: `porDepartamento` se
calcula con los filtros generales (tipo, estado, dependencia, q, avance)
pero **sin** `departamento`/`municipio`; `porMunicipio` sí se filtra por
`departamento` (para traer solo los municipios de ese departamento) pero
tampoco por `municipio` (si no, se pierde la lista completa de municipios
del departamento apenas se elige uno). Ver `src/app/api/mapa/route.ts`.

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

**`background-attachment: fixed` hace que un fondo se vea "en toda la
interfaz" sin necesidad de que sea un patrón en mosaico.** Un fondo fijo
queda pegado a la ventana (no al documento), así que sigue visible detrás
de todo el contenido en cualquier punto de scroll — no hace falta que sea
un SVG repetido para cumplir "que se vea en toda la interfaz"; una sola
foto con `background-attachment: fixed` + `background-size: cover` ya lo
cumple. Lo que sí importa es que el velo/degradado encima no sea tan
opaco que tape la foto (ver el historial: eso fue el problema real la
primera vez, se leyó como "cambiar de foto a patrón" pero era un problema
de opacidad).

Historial de estilo de este fondo (5 vueltas — para no repetir ninguna):

1. Foto de campo colombiano (arrozal, La Guajira), con velo blanco muy
   opaco (~80%) — el usuario la vio "poco clara".
2. Patrón SVG en mosaico de íconos ilustrados a color (campesinos, ganado,
   espigas) — el usuario pidió quitarlo por no verse "institucional de
   élite".
3. Emblema institucional abstracto sin nada de campo (escudo + estrella +
   laurel, SVG dibujado a mano) — el usuario pidió que igual "evocara el
   campo y el campesinado".
4. Emblema tipo sello agrario (escudo con sol, cordillera y un campesino
   con azadón, corona de espigas) — seguía siendo un dibujo SVG a mano, y
   el usuario lo rechazó directamente: "ese sello se ve horrible".
5. **Actual**: una **foto real** de nuevo (`public/ganado-campo.jpg`,
   campo con ganado y cordillera al fondo, licencia Pexels — ver README),
   con un velo mucho más liviano (~55-60%) que en el intento 1, y
   `background-attachment: fixed` (ya lo tenía desde el intento 1) para
   que se vea en toda la interfaz sin necesidad de mosaico. Ante un nuevo
   pedido de cambiar este fondo, **preguntar primero si el problema es la
   claridad/opacidad o el motivo/contenido** antes de rediseñar de cero —
   las vueltas 2-4 salieron de no distinguir esas dos cosas a tiempo.

**Los `background-image` en CSS se apilan con el primero de la lista
arriba de los demás** (al revés de lo que uno esperaría). Si se pone un
degradado opaco a pantalla completa antes que el patrón en la lista de
`background-image`, el degradado tapa el patrón por completo y no se ve
nada aunque todo esté bien configurado (mismo bug ya se dio aquí: la
página se veía con un degradado liso, sin ningún ícono). El o los patrones
van siempre primero en la lista; el degradado (o color de fondo) va
después, como capa base.

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
