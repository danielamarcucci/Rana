# Metodología

## Reproducir todo

Solo necesita Python 3 (librería estándar) y curl. Desde `huila/`:

```bash
python3 scripts/01_catalogo_divipola.py        # homologación Registraduría ↔ DIVIPOLA
python3 scripts/02_resultados_territoriales.py # verifica SHA-256 y agrega MMV 2019/2023 por municipio
python3 scripts/03_descargar_dane.py           # descarga 18 capas del geoportal DANE
python3 scripts/04_poblacion_seguridad.py      # proyecciones DANE + delitos MinDefensa
python3 scripts/06_terridata.py                # indicadores TerriData (Colombia, departamentos, municipios)
python3 scripts/07_dane_nacional.py            # capas CNPV 2018 de todos los municipios del país
python3 scripts/08_otras_elecciones.py         # 2015, Congreso 2022 y presidenciales, por municipio
python3 scripts/09_poblacion_nacional.py       # población DANE de todos los municipios (denominador)
python3 scripts/10_homicidios_12m.py           # 10 a 19: fuentes de conflicto (ver fuentes.md)
python3 scripts/11_desplazamiento.py
python3 scripts/12_coca.py
python3 scripts/13_ucdp.py                     # capa MGN en HUILA_CACHE_MGN (se descarga si falta)
python3 scripts/14_ocha_confinamiento.py
python3 scripts/15_indepaz.py
python3 scripts/16_alertas_tempranas_sat.py
python3 scripts/17_moe_riesgo_electoral.py
python3 scripts/18_pares.py
python3 scripts/19_cnmh.py
CEDE_DIR=/ruta/a/cede/dataverse python3 scripts/21_cede_conflicto.py   # 21 a 26: Panel CEDE
CEDE_DIR=/ruta/a/cede/dataverse python3 scripts/22_cede_caracteristicas.py
CEDE_DIR=/ruta/a/cede/dataverse python3 scripts/23_cede_agricultura.py
CEDE_DIR=/ruta/a/cede/dataverse python3 scripts/24_cede_buen_gobierno.py
CEDE_DIR=/ruta/a/cede/dataverse python3 scripts/25_cede_salud.py
CEDE_DIR=/ruta/a/cede/dataverse python3 scripts/26_cede_educacion.py
python3 scripts/20_conflicto.py                # une conflicto y CEDE en el formato de Problemas
python3 scripts/05_construir_web.py            # web/datos/tablero.js (se corre al final)
```

Luego abrir `web/index.html` en el navegador (no necesita servidor ni instalar nada).

Cada script se detiene si algo no cuadra (hash distinto, municipio que no
cruza, número de municipios distinto de 37, suma agregada distinta de la suma
de mesas). No se completa ni se aproxima nada a mano.

## Validación realizada (2026-10-05)

- **Integridad**: SHA-256 de los dos CSV de la Registraduría idéntico al archivo HASH oficial incluido en cada ZIP.
- **Homologación de municipios**: 37 de 37 por nombre normalizado (sin tildes ni texto entre paréntesis, p. ej. "TESALIA (CARNICERIAS)" → Tesalia, "LA ARGENTINA (PLATA VIEJA)" → La Argentina). Los códigos de la Registraduría son los mismos en 2019 y 2023.
- **Agregación**: la suma por municipio es idéntica a la suma de todas las mesas, por corporación. Votos totales (incluye blanco, nulos y no marcados):

  | Corporación | 2019 | 2023 |
  |---|---:|---:|
  | Gobernación | 557.659 | 564.269 |
  | Asamblea | 554.803 | 563.052 |
  | Alcaldía | 558.142 | 565.476 |
  | Concejo | 555.841 | 564.764 |

- **Control contra resultado conocido**: el más votado a la Gobernación es Luis Enrique Dussán López (2019, 237.386 votos) y Rodrigo Villalba Mosquera (2023, 217.833), los gobernadores electos. Pendiente cotejar cifra por cifra contra el boletín de escrutinio departamental.
- **Indicadores DANE**: 37 municipios en cada una de las 18 capas.
- **TerriData**: 37 municipios del Huila en el universo (los que tienen población); el script se detiene si un mismo indicador, municipio, año y mes trae dos valores distintos. Controles: mortalidad infantil 2024 Huila 7,47 vs Colombia 10,37 (puesto 28 de 32); homicidio 2025 Huila 31,4 vs 25,9 (puesto 12); dengue 2024 Huila 2.278 por 100.000 en riesgo, puesto 2 de 32.
- **Delitos 2025**: total departamental de homicidios 390, violencia intrafamiliar 2.706 y lesiones 2.887; iguales a la consulta por año sin desagregar municipio.

## Definiciones

- **Votos válidos** = votos por candidatos y listas (incluye voto solo por el partido) + votos en blanco. Los porcentajes del panorama electoral son sobre votos válidos.
- **Margen** = diferencia en puntos porcentuales entre el primero y el segundo del municipio.
- **Gobernación**: opción = candidato (con su partido o coalición). **Alcaldía**: el mapa colorea por partido o coalición que avaló al ganador; el nombre del alcalde aparece en la tabla. **Asamblea y Concejo**: opción = partido (suma de votos a la lista y a sus candidatos).
- La **JAL** se excluye: su unidad es la comuna o corregimiento, no el municipio.
- La comparación 2019↔2023 de una opción solo se muestra si aparece con el mismo nombre exacto en ambos años. No se homologan coaliciones con nombres distintos.
- **Tasas de delito** = casos 2025 / proyección DANE de población 2025 × 100.000.
- **Mediana**: valor del municipio del medio; no es un dato departamental oficial.
- **Sentido** de cada indicador (`indicadores_terridata.csv`): `peor` (más alto es peor), `mejor` (más alto es mejor) o `contexto` (no es bueno ni malo; no lleva puesto ni etiqueta Peor/Mejor).
- **Puesto entre departamentos**: 1 = peor situación de los 32 (orden según el sentido). **Puesto entre municipios**: 1 = peor situación de los ~1.100 municipios con dato.
- **Situación frente al país (mapa, tabla e histograma)**: quintil del municipio en la distribución de todos los municipios del país en el mismo año (rango medio en empates, así muchos municipios en 0 no caen todos en el mismo extremo). Cinco clases: entre el 20% con peor situación, peor que la mayoría, en la mitad, mejor que la mayoría, entre el 20% con mejor situación. Escala naranja (peor) → gris → morado (mejor); nunca rojo-verde.
- **Etiqueta Peor/Similar/Mejor** de la lista: compara el territorio elegido con Colombia; diferencia relativa menor a 5% = Similar.
- **Territorio elegido**: Todo Huila usa el dato departamental (si no existe, la mediana de los 37, rotulada); una subregión usa la mediana de sus municipios (la suma, en población); un municipio usa su propio valor.
- **Último año** de cada indicador: el más reciente con dato municipal; si ese año no tiene dato del departamento y el anterior sí, se usa el anterior para que todas las cifras sean del mismo año.
- **Región Andina** (para la mediana regional): municipios de los departamentos de Antioquia, Bogotá, Boyacá, Caldas, Cundinamarca, Huila, Norte de Santander, Quindío, Risaralda, Santander y Tolima. Se eligió Andina y no Sur porque el Huila pertenece a la región natural andina y comparte con esos departamentos economía cafetera y de montaña; la región "Sur" no tiene una definición oficial única.
- **Subregiones del Huila**: ver fuentes.md (fuente secundaria, por confirmar).
- **Elecciones**: las cifras de una subregión o de todo el Huila suman los municipios. En Alcaldía y Concejo cada municipio elige por separado, así que ese total es una suma de elecciones distintas.

## Transferencia del voto

- 18 elecciones por municipio: territoriales 2015, 2019 y 2023 (Gobernación, Asamblea, Alcaldías, Concejos), Cámara y Senado 2022, presidenciales 2022 y 2026 (dos vueltas). JAL excluida.
- **Partido**: se agrupan los nombres oficiales que solo difieren en tildes, puntuación o el prefijo "Partido", "Movimiento (Político)" o "Coalición". Los cambios de nombre del mismo partido se agrupan solo con la tabla explícita `datos/catalogos/partidos_alias.csv` (Partido de la U, ASI, AICO, "PactoHistorico"). Las coaliciones con nombre propio no se reparten entre los partidos que la forman. La nota de la pestaña lista los nombres agrupados en cada partido.
- En Gobernación, Alcaldía y presidenciales cuenta el partido o coalición que avaló al candidato.
- **% del partido** = votos del partido / votos válidos de esa elección en el mismo territorio (subregión o Huila = suma de municipios).
- **Cambio** (pp) = % en la elección "Hasta" − % en la elección "Desde", solo en municipios donde el partido se presentó en ambas. Si se presentó en una sola, se marca aparte y no se cuenta como subida ni caída.
- **Dispersión presidencial**: correlación de Pearson, sin ponderar, entre el % del candidato presidencial y el % del partido, en los municipios donde el partido se presentó. Es una relación entre territorios (ecológica): no dice que las mismas personas votaron por ambos. Lectura: |r| < 0,3 débil o nula; 0,3-0,6 moderada; > 0,6 fuerte.
- Controles: 2015, los 13 elegidos de Gobernación y Asamblea cuadran voto a voto con `Elegidos.txt` (gobernador Carlos Julio González Villa, 214.134 votos); Congreso 2022 y presidenciales 2026 con SHA-256 verificado; totales en el Huila: Cámara 2022 390.118, Senado 2022 393.573, presidencial 2022 507.464 y 539.805, 2026 555.368 y 620.224 votos.

## Conflicto y Panel Municipal del CEDE (2026-10-06)

La pestaña Problemas suma dos temas nuevos (Tierra y agricultura, Buen gobierno),
amplía Conflicto y violencia y agrega indicadores CEDE a Salud, Educación y
servicios y Caracterización. Reglas comunes:

- **Universo**: los 1.123 municipios de la proyección DANE. Toda tasa usa esa
  población (2018 en adelante) o la retroproyección DANE del propio CEDE
  (`retro_pobl_tot`, base CNPV 2018) para años anteriores; empatan en 2017-2018.
- **Ausente = 0 solo si la fuente es exhaustiva** (registro nacional completo:
  MinDefensa, RUV, SIMCI, UCDP, OCHA, Indepaz, SAT, MOE, CNMH). Cuando la fuente
  solo trae municipio-año con registro y no se sabe si el vacío es 0 (minas y RUV
  dentro del CEDE, cultivos no registrados), queda sin dato. Un indicador con
  menos de 30 de los 37 municipios del Huila con dato en su año principal no se
  muestra (`MIN_HUILA` en `20_conflicto.py`; hoy: minas, desaparición,
  reclutamiento y homicidio del RUV en el CEDE, arroz y gas natural).
- **Valor departamental y de Colombia**: suma de municipios para conteos; suma de
  numeradores sobre suma de denominadores para tasas. Para índices y porcentajes
  que no se pueden agregar sin ponderar (IDF, MDM, coberturas) no se inventa un
  valor del Huila: el tablero muestra la mediana de sus municipios y lo dice.
- **Conteos frente a Colombia**: un conteo municipal no se compara con el total
  del país; se muestra la parte del total y el lugar entre municipios.
- **Periodos**: cuando el último año es parcial o preliminar (UCDP 2026, CNMH y
  OCHA 2026), el valor principal suma los años completos y el año parcial se ve
  solo en la serie.
- **Grupos armados con presencia (desde 2024)**: grupos distintos con nombre que
  ubican en el municipio la Defensoría (SAT), Pares, CNMH o UCDP. Se excluyen
  categorías genéricas (no identificado, posdesmovilización sin nombre, agentes
  del Estado) y se unifican nombres (AGC = EGC = Clan del Golfo; Gentil Duarte =
  EMC). «Disidencias FARC» sin estructura (CNMH, SAT) solo cuenta si ninguna
  fuente nombra una estructura concreta en ese municipio. La Defensoría nombra
  grupos por alerta y no por municipio, y sus alertas de alcance nacional no se
  usan. La tabla del indicador dice qué fuente nombra cada grupo.
- **No duplicar**: de CEDE se dejaron fuera las series que ya están en el tablero
  desde TerriData, DANE o las fuentes nuevas (coca, desplazamiento, homicidio,
  secuestro, extorsión, población, IPM total, NBI, coberturas totales de
  servicios, Saber 11 matemáticas y lectura, entre otras).
- **Datos panel**: los indicadores CEDE se entregan como serie municipio-año
  completa (`datos/salida/cede/<id>.csv`), sin unir metodologías distintas
  (p. ej. Saber 11 desde 2015, ingresos propios desde 2010, IGA hasta 2015).

## Lo que este tablero no hace

- No usa datos de personas ni infiere cómo votó nadie: todo es agregado por municipio.
- No atribuye causas: que dos indicadores coincidan entre municipios no significa que uno explique el otro.
- No calcula participación: los archivos MMV no traen el potencial electoral. Queda pendiente.
