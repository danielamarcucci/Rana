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

## Lo que este tablero no hace

- No usa datos de personas ni infiere cómo votó nadie: todo es agregado por municipio.
- No atribuye causas: que dos indicadores coincidan entre municipios no significa que uno explique el otro.
- No calcula participación: los archivos MMV no traen el potencial electoral. Queda pendiente.
