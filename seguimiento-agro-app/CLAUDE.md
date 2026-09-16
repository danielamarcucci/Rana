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

**Bug de hydration real, ya corregido**: el `<title>` dentro de cada
`<path>` de departamento tenía dos expresiones JSX en líneas separadas
(`{nombre}` y `{dato ? ... : ...}`, con un salto de línea entre ellas en
el código fuente). Eso generaba un mismatch de hydration en React
("Hydration failed...") porque el HTML renderizado en el servidor y el
árbol que arma el cliente no manejan igual el espacio en blanco entre
expresiones JSX dentro de un `<title>` de SVG. Solución: una sola
expresión con un template literal (`{`${nombre}${...}`}`) en vez de dos
expresiones adyacentes. Si aparece este error en algún otro `<title>`,
`<text>` u otro elemento "inline" de SVG con varias expresiones JSX
seguidas, es la misma causa.

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

## Zoom al departamento y ficha descargable (`/mapa`)

Al elegir un departamento (clic en el mapa o filtro), `MapaColombia`
"hace zoom" aplicando `transform: translate(...) scale(...)` a un `<g>`
que envuelve todas las formas — **no** recalculando el `viewBox`. Así el
cambio se anima solo con una transición CSS normal sobre `transform`
(cambiar el `viewBox` no es animable con CSS). La caja del departamento
seleccionado se calcula con `cajaDePath` (`src/lib/geometria-mapa.ts`),
que asume que el path solo usa comandos `M`/`L`/`Z` (líneas rectas, sin
curvas) — cierto para todo lo que genera
`scripts/generar-mapa-colombia.py` hoy; si algún día se agregan curvas
(Q/C) a algún path, ese cálculo de caja dejaría de ser exacto. Los paths
llevan `vector-effect="non-scaling-stroke"` para que el borde no se vea
absurdamente grueso cuando el zoom escala mucho (departamentos pequeños).
El zoom no distingue departamento de municipio: no hay geometría de
municipios en este proyecto, así que seleccionar un municipio dentro de
un departamento no mueve el zoom (ya está enfocado en el departamento).

La ficha del panel derecho se descarga como PNG con la librería
`html-to-image` (`toPng`), capturando el `<div>` que envuelve el mapa
zoomeado **y** la ficha juntos (así la imagen descargada incluye el mapa,
como pidió el usuario explícitamente: "la ficha debe tener... información
de departamento, municipio. Con el mapa"). Los botones que no deben salir
en la imagen (Descargar, Cerrar) llevan `data-ficha-ignorar="true"`, y
`descargarFicha` pasa un `filter` a `toPng` que los excluye — **ese
atributo es una convención propia de este proyecto**, no algo que
`html-to-image` reconozca solo; si se agregan más botones dentro del área
capturada, hay que marcarlos igual o van a salir en la imagen descargada.

## Marca de agua de fondo (`.fondo-campo` en `globals.css`)

**Antes de tocar este fondo otra vez, preguntar qué es lo que no
funciona** (¿el contenido — campo/institucional? ¿que sea foto o patrón?
¿la opacidad/claridad?) **en vez de adivinar y rediseñar de cero.** Van
6 vueltas sobre este mismo fondo; casi todas salieron de resolver la
pregunta equivocada:

1. Foto de campo colombiano (arrozal, La Guajira), con velo blanco muy
   opaco (~80%) — el usuario la vio "poco clara".
2. Patrón SVG en mosaico con campesino, ganado, espigas y hojas, en azul
   institucional a baja opacidad (`public/patron-campo.svg`) — el usuario
   pidió quitarlo por no verse "institucional de élite" (con esa misma
   paleta monocroma tenue — el rechazo no era por ser "a color").
3. Emblema institucional abstracto sin nada de campo (escudo + estrella +
   laurel, SVG dibujado a mano) — el usuario pidió que igual "evocara el
   campo y el campesinado".
4. Emblema tipo sello agrario (escudo con sol, cordillera y un campesino
   con azadón, corona de espigas) — seguía siendo un dibujo SVG a mano, y
   el usuario lo rechazó directamente: "ese sello se ve horrible".
5. Foto real de campo con ganado y cordillera (Pexels, ver README), con un
   velo más liviano (~55-60%) y `background-attachment: fixed` para que se
   viera en toda la interfaz sin necesidad de mosaico — técnicamente
   correcto, pero el usuario pidió volver a un patrón de todos modos
   ("vuelvas a cambiar el fondo por patrones").
6. **Actual**: de vuelta al patrón del punto 2 (`public/patron-campo.svg`,
   sin cambios — mismo archivo), con `background-repeat: repeat`. Es la
   combinación de TODO lo pedido a lo largo de las 6 vueltas: patrón (no
   foto única), con campo y campesinado (no abstracto), en tono
   institucional monocromo tenue (no ilustración a color ni dibujo
   recargado). Si se vuelve a rechazar, probablemente el problema ya no es
   ninguna de esas tres cosas — preguntar qué se ve mal concretamente.

**`background-attachment: fixed` hace que un fondo se vea "en toda la
interfaz" sin necesidad de que sea un patrón en mosaico** (queda pegado a
la ventana, no al documento, así que sigue visible en cualquier punto de
scroll) — pero un patrón en mosaico también lo logra, y es lo que se pidió
explícitamente en la vuelta 6, así que ambas técnicas se usan juntas
(patrón + `fixed`) por si acaso.

**Los `background-image` en CSS se apilan con el primero de la lista
arriba de los demás** (al revés de lo que uno esperaría). Si se pone un
degradado opaco a pantalla completa antes que el patrón en la lista de
`background-image`, el degradado tapa el patrón por completo y no se ve
nada aunque todo esté bien configurado (bug real ya encontrado aquí: la
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
