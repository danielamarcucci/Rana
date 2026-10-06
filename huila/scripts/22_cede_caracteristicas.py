"""Panel Municipal del CEDE (Universidad de los Andes) — módulo Características
generales.

Fuente: PANEL_CARACTERISTICAS_GENERALES(2021).tab, Dataverse de Uniandes,
DOI https://doi.org/10.57924/IX38JI (CC0). Diccionario oficial:
PANEL_CARACTERISTICAS_GENERALES(2021).pdf (76 variables, 1993-2020).
El .tab NO se copia al repo; se lee desde CEDE_DIR (por defecto
/mnt/project-files/cede/dataverse/) y se verifica su SHA-256.

Criterio de selección (13 indicadores):
- Lo que caracteriza al municipio y no está en el tablero: área oficial,
  altitud, distancias lineales a la capital del departamento, a Bogotá y al
  mercado de alimentos más cercano; coeficiente de Gini municipal (1993 y 2005); pobreza
  multidimensional en zona rural; y seis privaciones del IPM censal (2005 y
  2018): empleo informal, dependencia económica, trabajo infantil, rezago
  escolar, barreras de acceso a salud y hacinamiento crítico.
- NO se incluyen (duplican el tablero): población (pobl_*, retro_pobl_*),
  índice de ruralidad (indrural ~ población rural dispersa), IPM total y
  NBI total (TerriData/DANE 2018; el CEDE solo añade años anteriores),
  analfabetismo (ipm_analf_p ~ analfabetismo DANE 2018), acceso a agua
  mejorada y eliminación de excretas (cercanos a acueducto/alcantarillado),
  PIB municipal 2000-2009 (superado por el valor agregado de TerriData).
- Distancia al principal mercado mayorista (dismdo): en el Huila el mercado
  de referencia es Neiva para los 37 municipios y el valor es idéntico a la
  distancia a la capital; se omite por redundante.
- Descartados por calidad: hectáreas de minorías étnicas, parques, Estado,
  comunidades religiosas y otras (IGAC 2000-2010, catastro): en 82
  municipio-año las hectáreas de minorías superan el área oficial del
  municipio y los parques naturales del Huila casi no aparecen (el propio
  diccionario advierte que esos predios están mal clasificados en catastro).
  SISBEN III por edad (2016-2020): son inscritos, no población; no se
  normaliza sin suponer cobertura. Pobreza por consumo y gasto per cápita
  (1993 y 2005): estimaciones viejas, se deja solo el Gini por ser la única
  medida municipal de desigualdad. No hay variables de discapacidad ni de
  categoría municipal en este módulo.

Variables fijas (área, altitud, distancias): el panel repite el mismo valor
en todos los años 1993-2020 en los 1.122 municipios (verificado por el
script, que para si alguno cambia). Se publica una sola fila por municipio
con anio = "2020" (el corte del panel).

IPM 2005 y 2018: el diccionario los presenta como una misma variable de
fuente DANE-DNP (censos 2005 y 2018) sin señalar cambio de metodología; se
publican ambos años con esa advertencia en la nota.

Valores faltantes: celda vacía; nunca se convierten en 0. Una fila del .tab
(codmpio 94663, Mapiripana) viene sin año y se descarta (se informa).

Salida: datos/salida/cede/cede_gen_<id>.csv y .meta.json.
"""
import csv
import hashlib
import json
import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CEDE_DIR = Path(os.environ.get("CEDE_DIR", "/mnt/project-files/cede/dataverse"))
SAL = RAIZ / "datos" / "salida" / "cede"
POB_DANE = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"

TAB = "PANEL_CARACTERISTICAS_GENERALES(2021).tab"
SHA = "c4d9275b4c80c97236fce4f00bb58c1bb7096b3444975edc8a3e47ce22b5ffc1"
DOI = "https://doi.org/10.57924/IX38JI"
MODULO = "Panel Características generales"

N_DIST = (
    "Distancia en línea recta (no por carretera) calculada por el CEDE con "
    "coordenadas del IGAC; no refleja tiempo de viaje ni estado de las vías. "
    "Dato fijo: el panel repite el mismo valor en 1993-2020 y se publica una "
    "sola fila con el corte 2020. "
)
N_IPM = (
    "Privación del Índice de Pobreza Multidimensional de fuente censal "
    "(DANE-DNP, censos 2005 y 2018), tal como la publica el diccionario del "
    "CEDE: porcentaje de la población en privación. El diccionario no señala cambio de metodología entre "
    "2005 y 2018 y se publican ambos años, pero son censos con cuestionarios "
    "distintos: comparar con cautela (TerriData también publica el IPM "
    "total de ambos censos como una serie, y el IPM total de este panel "
    "coincide con el de TerriData en los 37 municipios del Huila, diferencia "
    "máxima 0,005 puntos). Solo años censales; no hay serie anual."
)

# (id, variable, tipo, etiqueta, descripción, unidad, sentido, fuente original, nota, agregable)
FIJAS = [
    ("cede_gen_area_km2", "areaoficialkm2", "Área oficial",
     "Área oficial del municipio en kilómetros cuadrados.",
     "km²", "contexto", "DANE, Divipola",
     "Dato fijo: el panel repite el mismo valor en 1993-2020 y se publica "
     "una sola fila con el corte 2020. La densidad de población ya está en "
     "el tablero (TerriData).", "suma"),
    ("cede_gen_altitud", "altura", "Altitud de la cabecera",
     "Altura del municipio en metros sobre el nivel del mar.",
     "m s. n. m.", "contexto",
     "Instituto Geográfico Agustín Codazzi (IGAC), corte 6 de junio de 2020",
     "Dato fijo: el panel repite el mismo valor en 1993-2020 y se publica "
     "una sola fila con el corte 2020. Es la altura de referencia del "
     "municipio (cabecera), no la del territorio rural.", "no"),
    ("cede_gen_dist_capital", "discapital", "Distancia a la capital del departamento",
     "Distancia lineal del municipio a la capital de su departamento, en "
     "kilómetros (0 en la capital).",
     "km", "contexto", "cálculos del CEDE con datos del IGAC", N_DIST, "no"),
    ("cede_gen_dist_bogota", "disbogota", "Distancia a Bogotá",
     "Distancia lineal del municipio a Bogotá, en kilómetros.",
     "km", "contexto", "cálculos del CEDE con datos del IGAC", N_DIST, "no"),
    ("cede_gen_dist_mercado_cercano", "distancia_mercado",
     "Distancia al mercado de alimentos más cercano",
     "Distancia lineal del municipio al municipio con un mercado de "
     "alimentos cercano, en kilómetros; vale 0 si el municipio tiene un "
     "mercado mayorista de alimentos.",
     "km", "contexto",
     "CEDE con información de la Red de Información y Comunicación "
     "Estratégica del Sector Agropecuario (AGRONET)", N_DIST, "no"),
]

SERIES = [
    ("cede_gen_gini", "gini", "Desigualdad del consumo (Gini)",
     "Coeficiente de Gini municipal del consumo per cápita de los hogares "
     "(0 = igualdad total, 1 = desigualdad máxima).",
     "Índice 0-1", "peor",
     "cálculos del CEDE a partir de CASEN 1993, ECV 2003 y censos 1993 y "
     "2005 del DANE",
     "Estimación de áreas pequeñas (metodología Elbers, Lanjouw y Lanjouw "
     "2003): combina encuestas de hogares, que solo son representativas por "
     "región, con el censo. Solo 1993 y 2005; es la única medida municipal "
     "de desigualdad disponible, pero tiene más de 20 años.", "no"),
    ("cede_gen_ipm_rural", "IPM_rur", "Pobreza multidimensional rural",
     "Índice de pobreza multidimensional en la zona rural (centros poblados "
     "y rural disperso): porcentaje de personas en hogares con privación en "
     "al menos el 33,3 % de las 15 variables ponderadas.",
     "% de personas", "peor", "DANE - DNP",
     "El IPM total ya está en el tablero (DANE 2018); este indicador solo "
     "agrega la parte rural. " + N_IPM, "no"),
    ("cede_gen_priv_informalidad", "ipm_templeof_p", "Privación por empleo informal",
     "Porcentaje de la población en privación por empleo informal, una de "
     "las 15 variables del IPM (peso 10 %).",
     "% de personas", "peor", "DANE - DNP", N_IPM, "no"),
    ("cede_gen_priv_dependencia", "ipm_tdep_p",
     "Privación por dependencia económica",
     "Porcentaje de la población en privación por tasa de dependencia "
     "económica, una de las 15 variables del IPM (peso 10 %).",
     "% de personas", "peor", "DANE - DNP", N_IPM, "no"),
    ("cede_gen_priv_trabajo_infantil", "ipm_ti_p", "Privación por trabajo infantil",
     "Porcentaje de la población en privación por trabajo infantil, una de "
     "las 15 variables del IPM (peso 5 %).",
     "% de personas", "peor", "DANE - DNP", N_IPM, "no"),
    ("cede_gen_priv_rezago_escolar", "ipm_rezagoescu_p", "Privación por rezago escolar",
     "Porcentaje de la población en privación por rezago escolar, una de "
     "las 15 variables del IPM (peso 5 %).",
     "% de personas", "peor", "DANE - DNP",
     N_IPM + " Distinto de la deserción escolar (MEN) que ya está en el "
     "tablero.", "no"),
    ("cede_gen_priv_acceso_salud", "ipm_accsalud_p",
     "Privación por barreras de acceso a salud",
     "Porcentaje de la población en privación por barreras de acceso a "
     "servicios de salud dada una necesidad, una de las 15 variables del IPM "
     "(peso 10 %).",
     "% de personas", "peor", "DANE - DNP", N_IPM, "no"),
    ("cede_gen_priv_hacinamiento", "ipm_hacinam_p", "Privación por hacinamiento crítico",
     "Porcentaje de la población en privación por hacinamiento crítico, una "
     "de las 15 variables del IPM (peso 4 %).",
     "% de personas", "peor", "DANE - DNP",
     N_IPM + " Mide hogares con hacinamiento crítico; no es el déficit "
     "habitacional cuantitativo o cualitativo que ya está en el tablero.",
     "no"),
]


def sha256(p):
    h = hashlib.sha256()
    with p.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def cod(t):
    t = t.strip().strip('"')
    return str(int(float(t))).zfill(5) if t else None


def fmt(x, nd=4):
    x = round(x, nd)
    return str(int(x)) if x == int(x) else str(x)


def meta(iid, var, etq, desc, uni, sentido, fuente, nota, ag, periodo, aprin):
    return {
        "id": iid, "tema": "Caracterización", "etiqueta": etq,
        "descripcion": desc, "unidad": uni, "sentido": sentido,
        "periodo": periodo, "anio_principal": aprin,
        "institucion": "CEDE, Universidad de los Andes — Panel Municipal",
        "base": f"{MODULO} (variable {var}; fuente original {fuente})",
        "enlace": DOI, "fecha_consulta": "2026-10-06", "agregable": ag,
        "factor": None, "nota": nota, "sha256": {TAB: SHA},
    }


def escribir(iid, filas, m):
    with (SAL / f"{iid}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for c, a, v in sorted(filas):
            w.writerow([c, a, fmt(v), "", ""])
    (SAL / f"{iid}.meta.json").write_text(
        json.dumps(m, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")


def main():
    p = CEDE_DIR / TAB
    if not p.exists():
        sys.exit(f"No encuentro {p}. Define CEDE_DIR.")
    real = sha256(p)
    if real != SHA:
        sys.exit(f"SHA-256 de {TAB} no coincide: {real} != {SHA}")
    SAL.mkdir(parents=True, exist_ok=True)
    with POB_DANE.open(encoding="utf-8") as f:
        U = {r["cod_divipola"] for r in csv.DictReader(f)}

    datos = {}  # var -> {(cod, anio): valor}
    vars_ = [x[1] for x in FIJAS] + [x[1] for x in SERIES]
    descartes = []
    with p.open(encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            c, a = cod(r["codmpio"]), r["ano"].strip()
            if c not in U or not a:
                descartes.append((c, a or "(sin año)"))
                continue
            a = int(float(a))
            for v in vars_:
                t = r[v].strip()
                if t != "":
                    datos.setdefault(v, {})[(c, a)] = float(t)
    print("Filas descartadas (fuera del universo o sin año):", descartes)

    resumen = []
    for (iid, var, etq, desc, uni, sen, fue, nota, ag) in FIJAS:
        porm = {}
        for (c, a), v in datos[var].items():
            porm.setdefault(c, set()).add(v)
        cambia = [c for c, s in porm.items() if len(s) > 1]
        if cambia:
            sys.exit(f"{var} cambia entre años en {cambia[:5]}: no es fija, revisar")
        filas = [(c, "2020", next(iter(s))) for c, s in porm.items()]
        escribir(iid, filas, meta(iid, var, etq, desc, uni, sen, fue, nota, ag,
                                  "1993-2020 (dato fijo)", "2020"))
        resumen.append((iid, filas, "2020"))

    for (iid, var, etq, desc, uni, sen, fue, nota, ag) in SERIES:
        filas = [(c, a, v) for (c, a), v in datos[var].items()]
        anios = sorted({a for _, a, _ in filas})
        aprin = str(anios[-1])
        escribir(iid, filas, meta(iid, var, etq, desc, uni, sen, fue, nota, ag,
                                  " y ".join(map(str, anios)), aprin))
        resumen.append((iid, filas, aprin))

    print(f"\n{'id':32s}  filas  Huila  Neiva   min / max (año ppal)")
    for iid, filas, aprin in resumen:
        ap = [f for f in filas if str(f[1]) == aprin]
        hu = [f for f in ap if f[0].startswith("41")]
        ne = [f[2] for f in hu if f[0] == "41001"]
        vs = [f[2] for f in ap]
        print(f"{iid:32s} {len(filas):6d} {len(hu):3d}/37 {ne[0] if ne else 'sin dato':>8}  "
              f"{min(vs):.2f} / {max(vs):.2f}  (n={len(ap)})")


if __name__ == "__main__":
    main()
