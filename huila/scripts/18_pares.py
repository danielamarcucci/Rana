"""Presencia de grupos armados organizados por municipio (Fundación Pares).

Fuente (Fundación Paz & Reconciliación, Pares, https://www.pares.com.co/):
  * Base de monitoreo de presencia armada que alimenta el "Mapa de Presencia de
    Grupos Armados Organizados en Colombia" (https://www.pares.com.co/mapas/,
    tablero Power BI). Pares publica la tabla subyacente como archivo CSV en su
    biblioteca de medios:
      https://www.pares.com.co/wp-content/uploads/2025/12/presencia_grupos.csv
    (adjunto WordPress id 54567, subido el 2025-12-02; metadatos en
    https://www.pares.com.co/wp-json/wp/v2/media/54567, guardados tal cual).
    Columnas: Latitude, Longitude, Group, Year, Details, Departamento,
    Municipio. Una fila = un punto de presencia de un grupo en un municipio en
    una medición (2018, 2019, 2022, 2025). Hay varios puntos por grupo y
    municipio (p. ej. varias veredas): se cuenta presencia, no puntos.
  * Verificación: informe "Tiempos violentos: radiografía del poder armado en
    Colombia" (Pares, septiembre de 2026), parte 2, Tabla 2 "Presencia
    municipal de grupos armados organizados en Colombia" y texto adjunto:
      https://www.pares.com.co/wp-content/uploads/2026/09/PARTE-2.pdf
    Los municipios por grupo de la base (por código DIVIPOLA) deben coincidir
    con la Tabla 2 para 2019, 2022 y 2025 y el total 2025 con los 518
    municipios del texto; si no, el script se detiene.

Decisiones:
  * Homologación de nombre de municipio a DIVIPOLA por departamento + nombre
    normalizado (sin tildes ni signos) contra el universo de 1.123 municipios
    (datos/salida/poblacion_municipal_nacional.csv), con una tabla de alias
    inequívocos (ALIAS). Las áreas no municipalizadas (ANM) de Amazonas y
    Guainía se homologan quitando el sufijo "(ANM)" del nombre DANE. Filas que
    no son un municipio (p. ej. "CATATUMBO", una subregión, en 2019) se listan
    y NO se asignan.
  * Unificación de nombres (UNIFICACION). Pares usa etiquetas distintas por
    medición: "AGC ahora EGC" (2019) y "EGC" -> "EGC (Clan del Golfo)";
    "Gentil Duarte" (2018, 2022) y "EMC" -> "FARC disidencias - EMC" (la Tabla 2
    de Pares trata los 118 municipios de "Gentil Duarte" en 2022 como EMC); "SM"
    -> "Segunda Marquetalia" (en 2022 la Tabla 2 atribuye esos 60 municipios a
    la CN-EB, escindida después de la Segunda Marquetalia; aquí se conserva el
    nombre que trae la base para 2022).
  * Categorías genéricas excluidas de grupos_pares.csv (se cuentan en consola):
    "Otras organizaciones", "Disidencias dispersas" y "Disidencias postfarc
    indeterminadas". "Disidencias de las FARC" (solo 2019: todas las
    disidencias sin distinguir comandancia) se conserva como "FARC disidencias
    (sin distinguir estructura)", el mismo nombre que se usa para la categoría
    "DISIDENCIA FARC" del CNMH (script 19).
  * Indicador pares_grupos_2025: número de grupos distintos (nombre unificado)
    con presencia en el municipio según la medición 2025 (la más reciente con
    base publicada; la medición 2026 de "Tiempos violentos" solo está en cifras
    agregadas). La base es un monitoreo de cobertura nacional: municipio sin
    presencia registrada = 0.

Salidas:
  datos/crudos/pares/  (presencia_grupos.csv, media_54567.json,
                        tiempos_violentos_parte2.pdf, manifiesto.csv)
  datos/salida/conflicto/grupos_pares.csv
  datos/salida/conflicto/pares_grupos_2025.csv / .meta.json
"""
import csv
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "pares"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
FECHA_CONSULTA = "2026-10-06"

FUENTES = {
    "presencia_grupos.csv": "https://www.pares.com.co/wp-content/uploads/2025/12/presencia_grupos.csv",
    "media_54567.json": "https://www.pares.com.co/wp-json/wp/v2/media/54567",
    "tiempos_violentos_parte2.pdf": "https://www.pares.com.co/wp-content/uploads/2026/09/PARTE-2.pdf",
}

ALIAS = {
    ("cordoba", "san andres de sotavento"): "san andres sotavento",
    ("valle del cauca", "santiago de cali"): "cali",
    ("antioquia", "santa fe de antioquia"): "santafe de antioquia",
    ("magdalena", "chivolo"): "chibolo",
    ("sucre", "san jose de toluviejo"): "tolu viejo",
    ("bolivar", "santa cruz de mompox"): "mompos",
    ("tolima", "san sebastian de mariquita"): "mariquita",
}

UNIFICACION = {
    "AGC ahora EGC": "EGC (Clan del Golfo)",
    "EGC": "EGC (Clan del Golfo)",
    "ELN": "ELN",
    "CDS": "Comuneros del Sur",
    "CN-EB": "Coordinadora Nacional Ejército Bolivariano (CNEB)",
    "Gentil Duarte": "FARC disidencias - EMC",
    "EMC": "FARC disidencias - EMC",
    "EMBF": "FARC disidencias - EMBF (Estado Mayor de Bloques y Frentes)",
    "SM": "Segunda Marquetalia",
    "FRENTE 57": "FARC disidencias - Frente 57 Yair Bermúdez",
    "ACSN": "Autodefensas Conquistadoras de la Sierra Nevada (ACSN)",
    "EPL": "EPL",
    "CAPARROS": "Caparros",
    "Caparros": "Caparros",
    "AUN": "AUN",
    "Disidencias de las FARC": "FARC disidencias (sin distinguir estructura)",
}
GENERICOS = {"Otras organizaciones", "Disidencias dispersas",
             "Disidencias postfarc indeterminadas"}

# Tabla 2 de "Tiempos violentos" (Pares, 2026): municipios con presencia, por
# etiqueta original de la base (2019 "AGC ahora EGC" = EGC; 2019 "Disidencias de
# las FARC" = 111* de EMC; 2022 "Gentil Duarte" = EMC 118*; 2022 "SM" = CN-EB 60).
TABLA2 = {
    "2019": {"AGC ahora EGC": 107, "ELN": 106, "Disidencias de las FARC": 111},
    "2022": {"EGC": 241, "ELN": 183, "Gentil Duarte": 118, "SM": 60},
    "2025": {"EGC": 304, "ELN": 150, "EMC": 127, "EMBF": 107, "CN-EB": 22,
             "ACSN": 20, "SM": 14, "FRENTE 57": 18},
}
TOTAL_2025 = 518


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"\(anm\)", " ", s)
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return " ".join(s.split())


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def asegurar_crudos() -> dict:
    CRUDOS.mkdir(parents=True, exist_ok=True)
    man = CRUDOS / "manifiesto.csv"
    previo = {}
    if man.exists():
        with man.open(encoding="utf-8") as f:
            previo = {r["archivo"]: r for r in csv.DictReader(f)}
    filas, hashes = [], {}
    for nombre, url in FUENTES.items():
        p = CRUDOS / nombre
        if not p.exists():
            subprocess.run(["curl", "-sS", "-f", "-L", "-m", "300", "-o", str(p), url], check=True)
        h = sha256(p)
        if nombre in previo and previo[nombre]["sha256"] != h:
            sys.exit(f"SHA-256 de {nombre} no coincide con el manifiesto: el crudo cambió")
        hashes[nombre] = h
        filas.append({"archivo": nombre, "url": url,
                      "fecha_consulta": previo.get(nombre, {}).get("fecha_consulta", FECHA_CONSULTA),
                      "sha256": h, "bytes": p.stat().st_size})
    with man.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    return hashes


def universo():
    idx, codigos = {}, set()
    with UNIVERSO.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            codigos.add(r["cod_divipola"])
            k = (norm(r["departamento"]), norm(r["municipio"]))
            if idx.get(k, r["cod_divipola"]) != r["cod_divipola"]:
                sys.exit(f"Clave duplicada en universo: {k}")
            idx[k] = r["cod_divipola"]
    if len(codigos) != 1123:
        sys.exit(f"Universo con {len(codigos)} municipios (se esperaban 1.123)")
    return idx, sorted(codigos)


def verificar_pdf() -> None:
    texto = subprocess.run(["pdftotext", "-layout", str(CRUDOS / "tiempos_violentos_parte2.pdf"), "-"],
                           capture_output=True, text=True, check=True).stdout
    texto = " ".join(texto.split())
    for frase in ["El EGC pasó de 107 a 241", "de 106 a 183 municipios",
                  "111 a 118 municipios", "(241 a 304)", "(118 a 127, +9)",
                  "presencia en 107 municipios", "de 183 a 150 municipios",
                  "con 60 municipios", "hasta 22 municipios", "(19 a 20 municipios)",
                  "con 14 y 18 municipios", f"alcanzaba {TOTAL_2025} municipios"]:
        if frase not in texto:
            sys.exit(f"No se encontró en el PDF de verificación: «{frase}»")


def main() -> None:
    hashes = asegurar_crudos()
    verificar_pdf()
    idx, codigos = universo()
    with (CRUDOS / "presencia_grupos.csv").open(encoding="utf-8-sig") as f:
        filas = list(csv.DictReader(f))
    if list(filas[0]) != ["Latitude", "Longitude", "Group", "Year", "Details", "Departamento", "Municipio"]:
        sys.exit(f"Encabezado inesperado: {list(filas[0])}")

    sin_homologar = Counter()
    presencia = defaultdict(set)      # (anio, grupo_original) -> {cod}
    unidades = defaultdict(set)       # igual, pero por nombre (como cuenta Pares)
    for r in filas:
        if r["Group"] != r["Details"]:
            sys.exit(f"Group y Details difieren: {r}")
        d, m = norm(r["Departamento"]), norm(r["Municipio"])
        m = ALIAS.get((d, m), m)
        unidades[(r["Year"], r["Group"])].add((d, m))
        cod = idx.get((d, m))
        if cod is None:
            sin_homologar[(r["Year"], r["Departamento"], r["Municipio"], r["Group"])] += 1
            continue
        presencia[(r["Year"], r["Group"])].add(cod)

    # --- verificación contra la Tabla 2 publicada
    for anio, grupos in TABLA2.items():
        for g, n in grupos.items():
            # Pares cuenta unidades territoriales por nombre: en 2019 incluye
            # "CATATUMBO" (subregión), que aquí no se asigna a ningún municipio.
            obtenido = len(unidades.get((anio, g), ()))
            if obtenido != n:
                sys.exit(f"{anio} {g}: base={obtenido} municipios, Tabla 2 Pares={n}")
    total_2025 = len(set().union(*(v for k, v in presencia.items() if k[0] == "2025")))
    if total_2025 != len(set().union(*(v for k, v in unidades.items() if k[0] == "2025"))):
        sys.exit("2025: conteo por código y por nombre difieren")
    if total_2025 != TOTAL_2025:
        sys.exit(f"2025: {total_2025} municipios con presencia en la base vs {TOTAL_2025} publicados")

    # --- grupos_pares.csv
    salida, genericos = set(), Counter()
    otros = set(k[1] for k in presencia) - set(UNIFICACION) - GENERICOS
    if otros:
        sys.exit(f"Grupo sin regla de unificación: {otros}")
    for (anio, g), cods in presencia.items():
        if g in GENERICOS:
            genericos[(anio, g)] += len(cods)
            continue
        for c in cods:
            salida.add((c, anio, g, UNIFICACION[g]))
    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / "grupos_pares.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "grupo_original", "grupo"])
        w.writerows(sorted(salida))

    # --- indicador 2025
    por_mun = defaultdict(set)
    for c, anio, _, g in salida:
        if anio == "2025":
            por_mun[c].add(g)
    with (SALIDA / "pares_grupos_2025.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for c in codigos:
            w.writerow([c, "2025", len(por_mun.get(c, ())), "", ""])

    excl = "; ".join(f"{a} {g}: {n} municipios" for (a, g), n in sorted(genericos.items()))
    sinh = "; ".join(f"{a} {d}/{m} ({g})" for (a, d, m, g) in sorted(sin_homologar))
    meta = {
        "id": "pares_grupos_2025",
        "etiqueta": "Grupos armados con presencia (Pares 2025)",
        "descripcion": "Número de grupos armados organizados distintos que la Fundación Pares registra con presencia en el municipio en su medición de 2025.",
        "unidad": "grupos",
        "sentido": "peor",
        "periodo": "2025",
        "institucion": "Fundación Paz & Reconciliación (Pares)",
        "base": "Base de monitoreo de presencia armada (presencia_grupos.csv, tabla del Mapa de Presencia de Grupos Armados Organizados en Colombia), mediciones 2018, 2019, 2022 y 2025",
        "enlace": FUENTES["presencia_grupos.csv"],
        "fecha_consulta": FECHA_CONSULTA,
        "agregable": "no",
        "factor": None,
        "nota": ("Presencia no equivale a control territorial (Pares). Base de una organización de la sociedad civil, "
                 "construida con monitoreo propio, trabajo de campo y prensa; no es un registro oficial del Estado. "
                 "Cobertura nacional: municipio sin presencia registrada = 0. Verificada contra la Tabla 2 del informe "
                 "'Tiempos violentos' (Pares, sept. 2026): municipios por grupo 2019, 2022 y 2025 y total 2025 (518) "
                 "coinciden exactamente. El 'Balance de grupos armados 2025' (Pares, dic. 2025) publicó cifras previas "
                 "distintas (497 municipios en 2025, 410 en 2022). La medición 2026 (527 municipios) solo existe en cifras "
                 "agregadas. Nombres unificados: Gentil Duarte/EMC -> FARC disidencias - EMC; AGC/EGC -> EGC (Clan del Golfo). "
                 f"Categorías genéricas excluidas del conteo de grupos: {excl or 'ninguna'}. "
                 f"Filas no homologables a un municipio: {sinh or 'ninguna'}."),
        "sha256": hashes,
    }
    (SALIDA / "pares_grupos_2025.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
                                                        encoding="utf-8")

    print("Sin homologar:", dict(sin_homologar))
    print("Genéricos excluidos:", dict(genericos))
    print("Municipios con presencia 2025:", total_2025)
    for c in ["41001", "41551", "41396", "41298", "41020"]:
        print(c, sorted(por_mun.get(c, ())))
    huila = set().union(*(por_mun[c] for c in por_mun if c.startswith("41")))
    print("Huila: municipios con presencia 2025:", sum(1 for c in por_mun if c.startswith("41")),
          "grupos distintos:", sorted(huila))


if __name__ == "__main__":
    main()
