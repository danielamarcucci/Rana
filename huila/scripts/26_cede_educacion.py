"""Panel Municipal del CEDE (Uniandes) — módulo Educación (1993-2020).

Fuente: CEDE, Universidad de los Andes, "Panel de educación", DOI
https://doi.org/10.57924/EPRE6V (licencia CC0). Archivo tabulado oficial de
Dataverse PANEL_DE_EDUCACION(2021).tab (45 MB) y diccionario
"PANEL_EDUCACION (2021).pdf" (recibidos el 2026-10-06). El .tab NO se copia al
repo; se lee desde CEDE_DIR (por defecto /mnt/project-files/cede/dataverse) y se
verifica su SHA-256 antes de usarlo. Fuentes originales según el diccionario:
C600 DANE-MEN (matrícula, docentes), ICFES (Saber 11, clasificación de
planteles), censos DANE (asistencia escolar).

Nombres de columna: en el .tab van sin guion bajo (alumntotal, s11ingles,
colC...), en el PDF con guion bajo (alumn_total, s11_ingles, col_C...).
Ojo: el PDF tiene invertidas las descripciones de alumn_rural ("zona urbana") y
alumn_urbano ("zona rural"); el dato confirma que alumnrural es la zona rural
(Neiva 2020: alumnrural 3.795, alumnurbano 71.103).

Criterio de selección (8 indicadores que agregan información nueva al tablero):
- NO se incluyen (ya están en el tablero con la misma medida, desde TerriData):
  ind_alfa (analfabetismo, complemento), s11_mate y s11_lectu (Saber 11
  matemáticas y lectura crítica), matrícula de educación superior SNIES
  (cobertura en educación superior). Tampoco coberturas netas/deserción (no
  están en el panel).
- Tampoco: anos_est_mun (solo 1993 y 2005, desactualizado), conteos brutos de
  establecimientos, jornadas, docentes o alumnos, personal administrativo y
  variables IES/SNIES por semestre (miden tamaño, no condición), alumnos
  subsidiados (muy pocos municipios con dato), Saber 11 por estrato/educación
  de los padres (útiles pero demasiado finos para el tablero) y clasificación de
  planteles 2001-2014 (otra escala, superior...muy inferior).
- Elegidos: alumnos por docente, % matrícula rural, % matrícula oficial,
  repitencia, Saber 11 puntaje global normalizado, Saber 11 inglés, % colegios
  en categorías C o D, asistencia escolar 5-24 años (censal).

Cambios de metodología respetados (no se unen series de metodologías distintas):
- Docentes: desde 2004 el C600 cuenta "docente-servicio" (un docente por cada
  jornada en que trabaja; nota 4 del diccionario). Solo se usa 2004-2020.
- Saber 11: los puntajes solo son comparables dentro de 2000-2004, 2005-2014-1 y
  2014-2 en adelante (nota 8 y Anexo 1). Se usa el periodo vigente, 2015-2020
  (2014 se excluye porque mezcla 2014-1 y 2014-2).
- Clasificación de planteles: categorías A+, A, B, C, D desde 2014-2 (nota 10).
  Se usa 2015-2018; 2014 se excluye porque coltotal no coincide con la suma de
  categorías en 58 municipios (mezcla de clasificaciones).

Año 2007 excluido de los indicadores del C600 (matrícula, docentes, repitencia):
el panel trae ese año incompleto (suma nacional de alumn_total 9,05 millones vs
9,6-9,7 millones en 2006 y 2008; 35 de 37 municipios del Huila; filas imposibles
como Ubaque 2007 con 25 alumnos y 75 repitentes). No se corrige ni se interpola.

Valores faltantes: celda vacía en el .tab; NO se convierten en 0, salvo dos
casos en que el propio panel lo implica por identidad contable verificada fila
a fila (se documenta en la nota de cada indicador):
- matrícula rural: alumnrural + alumnurbano = alumntotal en 27.050 de 27.050
  filas con las tres variables; cuando alumnrural está vacía y alumnurbano =
  alumntotal (646 filas), la matrícula rural es alumntotal - alumnurbano = 0.
- colegios C o D: en 2015-2018 la suma de las categorías presentes
  (A+, A, B, C, D) es igual a coltotal en 4.414 de 4.414 filas; una categoría
  vacía en una fila con coltotal es, por esa identidad, 0. Filas en que la
  identidad no se cumpla se omiten.

Salidas: datos/salida/cede/cede_edu_*.csv (+ .meta.json).
"""
import csv
import hashlib
import json
import os
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
SALIDA = RAIZ / "datos" / "salida" / "cede"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
CEDE_DIR = Path(os.environ.get("CEDE_DIR", "/mnt/project-files/cede/dataverse"))

TAB = "PANEL_DE_EDUCACION(2021).tab"
SHA = {TAB: "8bda7ac46e53550c0b28977cca04a6a1e91dfa4a9953233fe2a173b3d33290b3"}
DOI = "https://doi.org/10.57924/EPRE6V"
FECHA = "2026-10-06"
INST = "CEDE, Universidad de los Andes — Panel Municipal"
# C600 2007 incompleto en el panel: suma nacional de alumn_total 9,05 millones vs 9,6-9,7
# en 2006 y 2008, 35 de 37 municipios del Huila con dato y filas imposibles (Ubaque 2007:
# 25 alumnos y 75 repitentes). Se excluye de los indicadores construidos con el C600.
EXCLUIR_C600 = {2007}


def sha256(p):
    h = hashlib.sha256()
    with open(p, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def verificar(nombre):
    p = CEDE_DIR / nombre
    if not p.exists():
        sys.exit(f"Falta {p}. Defina CEDE_DIR con la carpeta de los .tab del CEDE.")
    s = sha256(p)
    if s != SHA[nombre]:
        sys.exit(f"SHA-256 de {nombre} no coincide: {s} != {SHA[nombre]}")
    return p


def num(x):
    x = (x or "").strip()
    if x in ("", ".", "NA", "NaN"):
        return None
    return float(x)


def cod5(x):
    return str(int(float(x))).zfill(5)


def leer_tab(p, columnas):
    """Devuelve {(cod, anio): {col: valor|None}} y contador de códigos fuera del universo."""
    datos = {}
    with open(p, encoding="utf-8", errors="replace", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if not row["codmpio"] or not row["ano"]:
                continue
            datos[(cod5(row["codmpio"]), int(float(row["ano"])))] = {c: num(row[c]) for c in columnas}
    return datos


def fmt(v, nd=4):
    if v is None:
        return ""
    if float(v).is_integer():
        return str(int(v))
    return f"{round(v, nd)}"


def escribir(ind, filas, universo, fuera):
    """filas: lista (cod, anio, valor, num, den). Escribe CSV y meta, imprime validación."""
    SALIDA.mkdir(parents=True, exist_ok=True)
    ok = []
    for f in filas:
        if f[0] in universo:
            ok.append(f)
        else:
            fuera[ind["id"]].add(f[0])
    ok.sort(key=lambda f: (f[0], f[1]))
    with open(SALIDA / f"{ind['id']}.csv", "w", newline="", encoding="utf-8") as fh:
        w = csv.writer(fh)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for c, a, v, n, d in ok:
            w.writerow([c, a, fmt(v), fmt(n), fmt(d)])
    meta = {k: ind[k] for k in ("id", "tema", "etiqueta", "descripcion", "unidad", "sentido",
                                "periodo", "anio_principal")}
    meta.update({"institucion": INST, "base": ind["base"], "enlace": DOI, "fecha_consulta": FECHA,
                 "agregable": ind["agregable"], "factor": ind["factor"], "nota": ind["nota"],
                 "sha256": {k: SHA[k] for k in ind.get("archivos", [TAB])}})
    with open(SALIDA / f"{ind['id']}.meta.json", "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    # Validación
    ap = int(ind["anio_principal"])
    del_ap = [f for f in ok if f[1] == ap]
    huila = {f[0]: f[2] for f in del_ap if f[0].startswith("41")}
    falt = sorted(c for c in universo if c.startswith("41") and c not in huila)
    vals = [f[2] for f in ok]
    anios = sorted({f[1] for f in ok})
    print(f"{ind['id']}: {len(ok)} filas, años {anios[0]}-{anios[-1]} ({len(anios)}), "
          f"{len(del_ap)} municipios en {ap}; rango {min(vals):.3f}-{max(vals):.3f}; "
          f"Huila {len(huila)}/37 en {ap}, Neiva={huila.get('41001')}"
          + (f"; faltan Huila: {falt}" if falt else ""))
    return ok


def main():
    universo = set()
    with open(UNIVERSO, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            universo.add(r["cod_divipola"])
    p = verificar(TAB)
    cols = ["alumntotal", "docentotal", "alumnrural", "alumnurbano", "alumnoficial", "alumntotalre",
            "s11total", "s11ingles", "colAmas", "colA", "colB", "colC", "colD", "coltotal",
            "asistesc5a24"]
    d = leer_tab(p, cols)
    fuera = defaultdict(set)

    def razon(nvar, dvar, factor, anios):
        return [(c, a, v[nvar] / v[dvar] * factor, v[nvar], v[dvar]) for (c, a), v in d.items()
                if a in anios and a not in EXCLUIR_C600 and v[nvar] is not None and v[dvar]]

    def directo(var, anios):
        return [(c, a, v[var], None, None) for (c, a), v in d.items()
                if a in anios and v[var] is not None]

    # Matrícula rural (con la identidad rural + urbano = total).
    rural, rural_deriv = [], 0
    for (c, a), v in d.items():
        t = v["alumntotal"]
        if not t or a in EXCLUIR_C600:
            continue
        if v["alumnrural"] is not None:
            n = v["alumnrural"]
        elif v["alumnurbano"] is not None:
            n = t - v["alumnurbano"]
            rural_deriv += 1
        else:
            continue
        rural.append((c, a, n / t * 100, n, t))

    # Colegios en categorías C o D (2015-2018), con la identidad suma de categorías = coltotal.
    cd, cd_omit, cd_deriv = [], 0, 0
    for (c, a), v in d.items():
        if a not in range(2015, 2019) or not v["coltotal"]:
            continue
        cats = [v[k] for k in ("colAmas", "colA", "colB", "colC", "colD")]
        if abs(sum(x for x in cats if x is not None) - v["coltotal"]) >= 0.5:
            cd_omit += 1
            continue
        if v["colC"] is None or v["colD"] is None:
            cd_deriv += 1
        n = (v["colC"] or 0) + (v["colD"] or 0)
        cd.append((c, a, n / v["coltotal"] * 100, n, v["coltotal"]))

    base = "Educación (variable {}; fuente original {})"
    inds = [
        dict(id="cede_edu_alumnos_docente", tema="Educación y servicios", etiqueta="Alumnos por docente",
             descripcion="Alumnos matriculados en preescolar, primaria, secundaria y media por cada docente (docente-servicio) de los establecimientos del municipio, oficiales y no oficiales.",
             unidad="alumnos por docente", sentido="peor", periodo="2004-2020 (sin 2007)", anio_principal="2020",
             base=base.format("alumn_total y docen_total", "C600 DANE - MEN"), agregable="tasa", factor=1,
             nota="Razón construida: alumn_total / docen_total. Desde 2004 el C600 cuenta docentes como 'docente-servicio' (un docente que trabaja en dos jornadas cuenta dos veces), por eso se omite 1996-2003 (otra metodología). alumn_total excluye aceleración del aprendizaje y ciclos de adultos, mientras que docen_total incluye a todos los docentes de aula: la razón es una aproximación de la carga, no la relación técnica oficial del MEN. Se excluye 2007: el C600 de ese año viene incompleto en el panel (matrícula nacional 9,05 millones vs 9,6-9,7 en 2006 y 2008, filas imposibles como más repitentes que alumnos). En municipios rurales pequeños la razón baja por escuelas multigrado, no necesariamente por mejor dotación.",
             filas=razon("alumntotal", "docentotal", 1, range(2004, 2021))),
        dict(id="cede_edu_matricula_rural", tema="Educación y servicios", etiqueta="Matrícula en zona rural",
             descripcion="Porcentaje de los alumnos de preescolar, primaria, secundaria y media del municipio que estudian en establecimientos de la zona rural.",
             unidad="% de la matrícula", sentido="contexto", periodo="1996-2020 (sin 2007)", anio_principal="2020",
             base=base.format("alumn_rural y alumn_total", "C600 DANE - MEN"), agregable="tasa", factor=100,
             nota=f"Porcentaje construido: alumn_rural / alumn_total × 100. El PDF del diccionario tiene invertidas las descripciones de alumn_rural y alumn_urbano; el dato confirma que alumn_rural es la zona rural. Cuando alumn_rural está vacía pero alumn_urbano = alumn_total ({rural_deriv} filas), el numerador se calcula como alumn_total - alumn_urbano = 0, porque alumn_rural + alumn_urbano = alumn_total se cumple en todas las filas que traen las tres variables (27.050 de 27.050). Se excluye 2007: el C600 de ese año viene incompleto en el panel (matrícula nacional 9,05 millones vs 9,6-9,7 en 2006 y 2008, filas imposibles como más repitentes que alumnos).",
             filas=rural),
        dict(id="cede_edu_matricula_oficial", tema="Educación y servicios", etiqueta="Matrícula en sector oficial",
             descripcion="Porcentaje de los alumnos de preescolar, primaria, secundaria y media del municipio matriculados en establecimientos oficiales (públicos).",
             unidad="% de la matrícula", sentido="contexto", periodo="1996-2020 (sin 2007)", anio_principal="2020",
             base=base.format("alumn_oficial y alumn_total", "C600 DANE - MEN"), agregable="tasa", factor=100,
             nota="Porcentaje construido: alumn_oficial / alumn_total × 100 (se cumple alumn_oficial + alumn_nooficial = alumn_total en todas las filas con las tres variables). Se usa el sector oficial y no el no oficial porque alumn_nooficial viene vacía en cerca de la mitad de los municipios desde 2005 y el diccionario no dice que vacío = 0. La matrícula oficial incluye la contratada con privados si el C600 la registra en el establecimiento oficial. Se excluye 2007: el C600 de ese año viene incompleto en el panel (matrícula nacional 9,05 millones vs 9,6-9,7 en 2006 y 2008, filas imposibles como más repitentes que alumnos).",
             filas=razon("alumnoficial", "alumntotal", 100, range(1996, 2021))),
        dict(id="cede_edu_repitencia", tema="Educación y servicios", etiqueta="Tasa de repitencia",
             descripcion="Alumnos repitentes de preescolar, primaria, secundaria y media como porcentaje del total de alumnos de esos niveles en el municipio.",
             unidad="% de la matrícula", sentido="peor", periodo="2005-2013 (sin 2007)", anio_principal="2013",
             base=base.format("alumn_totalre y alumn_total", "C600 DANE - MEN"), agregable="tasa", factor=100,
             nota="Porcentaje construido: alumn_totalre / alumn_total × 100. El panel solo trae repitentes 2005-2013. Se verificó que alumn_totalre corresponde a los niveles tradicionales (igual a la suma de repitentes por nivel y sexo sin ciclos en 98 % de las filas), igual que alumn_total. La repitencia depende también de las políticas de promoción de cada año (p. ej. el Decreto 230 de 2002 limitaba la reprobación), así que los cambios en el tiempo no son solo de desempeño. Se excluye 2007: el C600 de ese año viene incompleto en el panel (matrícula nacional 9,05 millones vs 9,6-9,7 en 2006 y 2008, filas imposibles como más repitentes que alumnos).",
             filas=razon("alumntotalre", "alumntotal", 100, range(2005, 2014))),
        dict(id="cede_edu_saber11_global", tema="Educación y servicios", etiqueta="Saber 11: puntaje global (normalizado)",
             descripcion="Promedio del puntaje total de la prueba Saber 11 de los estudiantes de los colegios ubicados en el municipio, con los puntajes por área normalizados a media 50 y desviación 10 a nivel nacional y ponderados (3 matemáticas, 3 lectura crítica, 3 sociales y ciudadanas, 3 ciencias naturales, 1 inglés).",
             unidad="puntos (media nacional = 50)", sentido="mejor", periodo="2015-2020", anio_principal="2020",
             base=base.format("s11_total", "ICFES"), agregable="no", factor=None,
             nota="Valor tal como lo publica el panel. Solo se usa el periodo comparable vigente (2014-2 en adelante, Anexo 1 del diccionario); 2014 se excluye porque mezcla 2014-1 y 2014-2, y los años anteriores no son comparables. Por la normalización, un cambio en el tiempo indica cambio de posición frente al promedio nacional de ese año, no de nivel absoluto. Municipio = ubicación del colegio, no residencia del estudiante. No es el mismo dato que Saber 11 matemáticas y lectura crítica ya presentes (TerriData).",
             filas=directo("s11total", range(2015, 2021))),
        dict(id="cede_edu_saber11_ingles", tema="Educación y servicios", etiqueta="Saber 11: inglés (normalizado)",
             descripcion="Promedio del puntaje en inglés de la prueba Saber 11 de los estudiantes de los colegios ubicados en el municipio, normalizado a media 50 y desviación 10 a nivel nacional.",
             unidad="puntos (media nacional = 50)", sentido="mejor", periodo="2015-2020", anio_principal="2020",
             base=base.format("s11_ingles", "ICFES"), agregable="no", factor=None,
             nota="Valor tal como lo publica el panel. Solo se usa el periodo comparable vigente (2015-2020); el panel trae inglés desde 2007, pero 2007-2014 pertenece a otro periodo de la prueba. Por la normalización, un cambio en el tiempo indica cambio de posición frente al promedio nacional. Municipio = ubicación del colegio.",
             filas=directo("s11ingles", range(2015, 2021))),
        dict(id="cede_edu_colegios_cd", tema="Educación y servicios", etiqueta="Colegios en categorías C o D (Saber 11)",
             descripcion="Porcentaje de los colegios evaluados del municipio que el ICFES clasificó en las dos categorías más bajas de desempeño (C o D) de la escala A+, A, B, C, D.",
             unidad="% de colegios evaluados", sentido="peor", periodo="2015-2018", anio_principal="2018",
             base=base.format("col_C, col_D y col_total", "ICFES, clasificación de planteles"), agregable="tasa", factor=100,
             nota=f"Porcentaje construido: (col_C + col_D) / col_total × 100. Escala A+...D vigente desde 2014-2 (nota 10 del diccionario); se usa 2015-2018 (2014 mezcla clasificaciones: col_total no cuadra con la suma de categorías en 58 municipios). En 2015-2018 la suma de las categorías presentes es igual a col_total en todas las filas, así que una categoría vacía se toma como 0 colegios ({cd_deriv} filas con C o D vacía); filas omitidas por no cumplir la identidad: {cd_omit}. En municipios con pocos colegios un solo plantel mueve mucho el porcentaje.",
             filas=cd),
        dict(id="cede_edu_asistencia_5_24", tema="Educación y servicios", etiqueta="Asistencia escolar 5 a 24 años (censo)",
             descripcion="Porcentaje de la población de 5 a 24 años del municipio que asiste a una institución educativa, según los censos DANE.",
             unidad="% de la población de 5-24 años", sentido="mejor", periodo="1993, 2005, 2018", anio_principal="2018",
             base=base.format("asistesc_5_a_24", "DANE, censos 1993, 2005 y 2018"), agregable="no", factor=None,
             nota="Valor tal como lo publica el panel; solo años censales. Es asistencia declarada en el censo (cualquier nivel, incluida la educación superior), distinta de las coberturas netas administrativas del MEN que ya están en el tablero. En 1993 y 2005 faltan los municipios creados después (1.030 con dato). Algunos valores censales de 2005 son muy bajos (p. ej. Argelia, Cauca, 1,3 %) y se publican tal cual.",
             filas=directo("asistesc5a24", (1993, 2005, 2018))),
    ]
    for ind in inds:
        escribir(ind, ind["filas"], universo, fuera)
    print("Códigos fuera del universo DANE (no escritos):", sorted(set().union(*fuera.values())))


if __name__ == "__main__":
    main()
