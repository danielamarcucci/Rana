"""Municipios en riesgo electoral extremo según la MOE (mapa consolidado), 2023 y 2026.

Fuente: Misión de Observación Electoral (MOE), Observatorio Político-Electoral
de la Democracia, "Mapas y Factores de Riesgo Electoral":
  - Elecciones de Autoridades Locales 2023 (libro, sept. 2023):
    https://moe.org.co/mapa-de-riesgo-electoral-elecciones-de-autoridades-locales-2023/
  - Elecciones Nacionales 2026 (resumen ejecutivo, feb. 2026):
    https://moe.org.co/mapas-y-factores-de-riesgo-electoral-elecciones-nacionales-2026/

El "mapa consolidado" marca los municipios donde coinciden riesgo por factores
indicativos de fraude electoral y riesgo por factores de violencia, en tres
niveles (medio, alto, extremo). Aquí se toma solo el nivel extremo.

Datos crudos (datos/crudos/moe/, sin modificar):
  - 2023__MRE-Elecciones-Autoridades-Locales-2023_DIGITAL.pdf (34 MB): página
    24 del PDF = listado por nivel y departamento del "Mapa # 1. Mapa
    consolidado de riesgo por coincidencia de factores indicativos de fraude
    electoral y de violencia 2023" (20 medio, 58 alto, 81 extremo = 159).
  - Mapa-de-riesgo-electoral-2026-Resumen-ejecutivo-MOE-1.pdf (8,7 MB):
    página 19 = "Municipios en Riesgo Extremo" (numerados 1 a 81, con el
    conteo "(k de N mpios)" por departamento); páginas 20-21 = los que pasan a
    riesgo extremo frente a 2022 (56) y los que lo mantienen desde 2022 (25).
  El libro completo 2026 (web-Mapa-de-riesgo-2025.pdf, 41,6 MB) pesa más de
  40 MB, es solo imagen (sin capa de texto) y no se usa ni se guarda.

Verificaciones (el script se detiene si alguna falla):
  - 2023: el conteo de cada departamento "(n)" coincide con los nombres
    listados, y los totales por nivel son 20/58/81, como en la leyenda del mapa
    ("Riesgo extremo (81 municipios)") y en el texto del libro ("a 81
    municipios en riesgo extremo en el 2023").
  - 2026: 81 municipios, igual al texto de la MOE ("170 municipios con algún
    nivel de riesgo ... de los cuales 81 se encuentran en riesgo extremo");
    conteo "(k de N mpios)" por departamento; y la lista de la página 19 es
    idéntica a la unión de las tablas de las páginas 20 (56) y 21 (25).
  - Todos los nombres se homologan a DIVIPOLA (departamento + nombre sin
    tildes ni espacios, porque pdftotext -raw a veces pega palabras, más
    ALIAS); un nombre sin homologar detiene el script.

Decisión 2023: el libro presenta dos consolidados, SIN trashumancia (Mapa #1:
159 municipios, 81 en extremo; comparable con la serie histórica, 40 en 2019)
y CON trashumancia (166 municipios, 83 en extremo; el que usa la presentación
de lanzamiento). Se usa el Mapa #1 (SIN trashumancia) por ser el consolidado
principal del libro, el comparable con la serie y con 2026 (elección nacional,
sin variables de trashumancia).

Salida: datos/salida/conflicto/moe_riesgo_extremo.csv/.meta.json, con
anio = "2023", "2026" y "2023-2026" (1 si está en riesgo extremo en alguno).
"""
import csv
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
import unicodedata
from collections import Counter
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "moe"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
ID = "moe_riesgo_extremo"

PDF_2023 = CRUDOS / "2023__MRE-Elecciones-Autoridades-Locales-2023_DIGITAL.pdf"
URL_2023 = "https://moe.org.co/wp-content/uploads/2023/09/2023__MRE-Elecciones-Autoridades-Locales-2023_DIGITAL.pdf"
PDF_2026 = CRUDOS / "Mapa-de-riesgo-electoral-2026-Resumen-ejecutivo-MOE-1.pdf"
URL_2026 = "https://moe.org.co/wp-content/uploads/2026/02/Mapa-de-riesgo-electoral-2026-Resumen-ejecutivo-MOE-1.pdf"

# (cod_dpto, nombre normalizado MOE) -> cod_divipola
ALIAS = {
    ("52", "tumaco"): "52835",  # DANE: San Andrés de Tumaco
    ("52", "maguipayan"): "52427",  # DANE: Magüí
    ("54", "cucuta"): "54001",  # DANE: San José de Cúcuta
    ("86", "leguizamo"): "86573",  # DANE: Puerto Leguízamo
    ("19", "lopez"): "19418",  # DANE: López de Micay
}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def descargar():
    CRUDOS.mkdir(parents=True, exist_ok=True)
    for ruta, url in ((PDF_2023, URL_2023), (PDF_2026, URL_2026)):
        if not ruta.exists():
            subprocess.run(["curl", "-sS", "-f", "-L", "-m", "600", "-o", str(ruta), url], check=True)


def texto(pdf: Path, pagina: int) -> list:
    t = subprocess.run(["pdftotext", "-f", str(pagina), "-l", str(pagina), "-raw", str(pdf), "-"],
                       check=True, capture_output=True, text=True).stdout
    return [l.strip() for l in t.splitlines() if l.strip()]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("(anm)", "")
    return re.sub(r"[^a-z0-9]+", "", s)


def cargar_universo():
    universo, por_nombre, dptos = {}, {}, {}
    with UNIVERSO.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            universo[r["cod_divipola"]] = (r["departamento"], r["municipio"])
            por_nombre.setdefault((r["cod_dpto"], norm(r["municipio"])), set()).add(r["cod_divipola"])
            dptos[norm(r["departamento"])] = r["cod_dpto"]
    dptos[norm("Bogotá D.C.")] = "11"
    if len(universo) != 1123:
        sys.exit(f"Universo con {len(universo)} municipios")
    return universo, por_nombre, dptos


def homologar(pares, por_nombre, dptos) -> list:
    codigos, faltan = [], []
    for dpto, mun in pares:
        cd = dptos.get(norm(dpto))
        c = ALIAS.get((cd, norm(mun)))
        if c is None:
            cands = por_nombre.get((cd, norm(mun)), set())
            c = next(iter(cands)) if len(cands) == 1 else None
        if c is None:
            faltan.append((dpto, mun))
        else:
            codigos.append(c)
    if faltan:
        sys.exit(f"Sin homologar: {faltan}")
    if len(set(codigos)) != len(codigos):
        sys.exit("Municipio repetido en la lista")
    return codigos


def lista_2023(dptos) -> dict:
    """Página 24 del libro 2023: niveles -> [(departamento, municipio)]."""
    lineas = texto(PDF_2023, 24)
    niveles, nivel, dpto, esperado = {}, None, None, Counter()
    totales = {}
    for l in lineas:
        m_nivel = re.fullmatch(r"Riesgo (medio|alto|extremo)", l)
        m_dpto = re.fullmatch(r"(.+?) \((\d+)\)", l)
        m_total = re.fullmatch(r"Total: (\d+)", l)
        if m_nivel:
            nivel = m_nivel.group(1)
            niveles[nivel] = []
        elif m_total and nivel:
            totales[nivel] = int(m_total.group(1))
            nivel = None
        elif m_dpto and nivel and norm(m_dpto.group(1)) in dptos:
            dpto = m_dpto.group(1)
            esperado[(nivel, dpto)] = int(m_dpto.group(2))
        elif nivel and dpto:
            niveles[nivel].append((dpto, l))
    for (nivel, dpto), n in esperado.items():
        k = sum(1 for d, _ in niveles[nivel] if d == dpto)
        if k != n:
            sys.exit(f"2023 {nivel} {dpto}: {k} listados vs ({n})")
    for nivel, n in (("medio", 20), ("alto", 58), ("extremo", 81)):
        if len(niveles.get(nivel, [])) != n or totales.get(nivel) != n:
            sys.exit(f"2023 {nivel}: {len(niveles.get(nivel, []))} listados, total impreso {totales.get(nivel)}, esperado {n}")
    return niveles


def lista_2026(dptos) -> list:
    """Página 19 del resumen 2026: [(departamento, municipio)] numerados 1-81."""
    lineas = texto(PDF_2026, 19)
    inicio = lineas.index("# Departamento Municipio")
    lineas = [l for l in lineas[inicio:] if l != "# Departamento Municipio"]
    corte = next(i for i, l in enumerate(lineas) if l.startswith("Desde la MOE"))
    fin = next(i for i, l in enumerate(lineas) if l.startswith("Mapa consolidado"))
    lineas = lineas[:corte] + lineas[fin + 2:]
    pat_cnt = re.compile(r"\(?(\d+) de \d+ mpios\)\s*")
    salida, dpto, esperado, numeros = [], None, {}, []
    pendiente_num = False
    i = 0
    while i < len(lineas):
        l = lineas[i]
        sig = lineas[i + 1] if i + 1 < len(lineas) else ""
        m_num = re.match(r"^(\d+)(?: (.*))?$", l)
        resto = l
        if m_num:
            numeros.append(int(m_num.group(1)))
            resto = m_num.group(2) or ""
        if not resto:
            i += 1
            continue
        if resto == "Bogotá D.C. Bogotá D.C.":
            salida.append(("Bogotá D.C.", "Bogotá D.C."))
            dpto = None
            i += 1
            continue
        if pat_cnt.match(sig) and norm(resto) in dptos:
            dpto = resto
            esperado[dpto] = int(pat_cnt.match(sig).group(1))
            resto2 = pat_cnt.sub("", sig, count=1).strip()
            if resto2:
                salida.append((dpto, resto2))
            i += 2
            continue
        salida.append((dpto, resto))
        i += 1
    if numeros != list(range(1, 82)):
        sys.exit(f"2026: numeración inesperada {numeros}")
    if len(salida) != 81:
        sys.exit(f"2026: {len(salida)} municipios, esperado 81")
    for d, n in esperado.items():
        k = sum(1 for dd, _ in salida if dd == d)
        if k != n:
            sys.exit(f"2026 {d}: {k} listados vs ({n} de N mpios)")
    return salida


def tablas_2026_cambio(dptos) -> list:
    """Páginas 20-21: municipios que pasan a extremo (56) y que lo mantienen (25)."""
    sufijo = re.compile(r"\s*Riesgo extremo (Sin riesgo|Riesgo (medio|alto))$")
    omitir = {"Riesgo", "Consolidado", "2026", "2022", "Departamento Municipio"}
    pares = []
    for pagina, n_esperado in ((20, 56), (21, 25)):
        lineas = texto(PDF_2026, pagina)[1:]  # la primera línea es el número de página
        dpto, nums, pendiente, buf = None, [], None, []
        for l in lineas:
            if l in omitir or l.startswith(("Mapa consolidado", "Municipios")):
                continue
            fin_fila = bool(sufijo.search(l))
            l = sufijo.sub("", l)
            if pendiente is not None:
                buf.append(l)
                if fin_fila:
                    pares.append((dpto, " ".join(buf)))
                    nums.append(pendiente)
                    pendiente, buf = None, []
                continue
            if norm(l) in dptos:
                dpto = l
                continue
            m = re.match(r"^(?:(.+?) )?(\d+) ?(.*)$", l)
            if not m or (m.group(1) and norm(m.group(1)) not in dptos):
                sys.exit(f"2026 página {pagina}: línea no reconocida {l!r}")
            if m.group(1):
                dpto = m.group(1)
            if m.group(3):
                pares.append((dpto, m.group(3)))
                nums.append(int(m.group(2)))
            else:
                pendiente = int(m.group(2))
        if sorted(nums) != list(range(1, n_esperado + 1)):
            sys.exit(f"2026 página {pagina}: numeración {sorted(nums)}")
    return pares


def main():
    descargar()
    hoy = dt.date.today().isoformat()
    universo, por_nombre, dptos = cargar_universo()

    n23 = lista_2023(dptos)
    ext23 = set(homologar(n23["extremo"], por_nombre, dptos))
    for nivel in ("medio", "alto"):
        homologar(n23[nivel], por_nombre, dptos)  # verifica que todo el mapa homologa

    l26 = lista_2026(dptos)
    ext26 = set(homologar(l26, por_nombre, dptos))
    cambio = homologar(tablas_2026_cambio(dptos), por_nombre, dptos)
    if len(cambio) != 81 or set(cambio) != ext26:
        sys.exit(f"2026: página 19 y páginas 20-21 no coinciden: {sorted(set(cambio) ^ ext26)}")

    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / f"{ID}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for anio, conj in (("2023", ext23), ("2026", ext26), ("2023-2026", ext23 | ext26)):
            for c in sorted(universo):
                w.writerow([c, anio, int(c in conj), "", ""])

    meta = {
        "id": ID,
        "etiqueta": "Riesgo electoral extremo (MOE)",
        "descripcion": ("1 si el municipio está en riesgo extremo en el mapa consolidado de la MOE (coincidencia de "
                        "factores indicativos de fraude electoral y de factores de violencia), 0 si no; para "
                        "elecciones locales 2023 y nacionales 2026, y '2023-2026' = 1 si lo estuvo en alguna."),
        "unidad": "municipios en riesgo extremo",
        "sentido": "peor",
        "periodo": "2023 (elecciones de autoridades locales) y 2026 (elecciones nacionales)",
        "institucion": "Misión de Observación Electoral (MOE) – Observatorio Político-Electoral de la Democracia",
        "base": "Mapas y Factores de Riesgo Electoral: Elecciones de Autoridades Locales 2023 (Mapa #1) y Elecciones Nacionales 2026 (resumen ejecutivo)",
        "enlace": "https://moe.org.co/datos-electorales/mapas-de-riesgo-electoral/",
        "fecha_consulta": hoy,
        "agregable": "suma",
        "factor": None,
        "nota": (f"Riesgo extremo: {len(ext23)} municipios en 2023 y {len(ext26)} en 2026, iguales a las cifras "
                 "que publica la MOE en el texto (2023: 'a 81 municipios en riesgo extremo'; 2026: '170 municipios "
                 "... de los cuales 81 se encuentran en riesgo extremo'); "
                 f"{len(ext23 | ext26)} distintos en 2023-2026 ({len(ext23 & ext26)} en ambos). El mapa "
                 "consolidado cubre todo el país, así que fuera de la lista vale 0. 2023 usa el consolidado SIN "
                 "trashumancia (Mapa #1 del libro, comparable con 2019 y con 2026); la versión CON trashumancia "
                 "de la presentación de lanzamiento tiene 83 en extremo y difiere en algunos municipios (en el "
                 "Huila, Neiva está en ambas). Es una evaluación de riesgo de una organización de la sociedad "
                 "civil, no un registro de hechos; listas extraídas con pdftotext de tablas regulares y "
                 "verificadas contra los conteos por departamento y los totales impresos."),
        "sha256": {PDF_2023.name: sha(PDF_2023), PDF_2026.name: sha(PDF_2026)},
    }
    (SALIDA / f"{ID}.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"2023 extremo: {len(ext23)}; 2026 extremo: {len(ext26)}; unión {len(ext23 | ext26)}; ambos {len(ext23 & ext26)}")
    for anio, conj in (("2023", ext23), ("2026", ext26)):
        print(anio, "Huila:", [universo[c][1] for c in sorted(conj) if c.startswith("41")])
    print("sha256", meta["sha256"])


if __name__ == "__main__":
    main()
