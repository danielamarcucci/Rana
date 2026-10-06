"""Alertas tempranas de la Defensoría del Pueblo (SAT) por municipio, 2017-2026.

Fuente: Defensoría del Pueblo, Delegada para la Prevención de Riesgos y Sistema
de Alertas Tempranas (SAT), aplicativo público SISAT
https://alertastempranas.defensoria.gov.co/ (enlazado desde
https://www.defensoria.gov.co/alertas-tempranas).

Datos crudos (datos/crudos/defensoria/, sin modificar):
  - Reporte_de_Alertas_Tempranas.xlsx: exportación oficial "Generar Excel" del
    módulo Reportes, sin filtros (todas las alertas emitidas desde el Decreto
    2124 de 2017). Una fila por alerta: código, tipo, fecha de emisión,
    municipios (texto "Mun1, Mun2 (Depto); Mun3 (Depto)") y grupos armados
    ilegales (separados por ";").
  - sisat_paginas.zip: las páginas HTML tal como se descargaron: el listado
    paginado (listado/p<N>.html, de donde sale el identificador de la ficha de
    cada alerta) y la ficha de cada alerta (fichas/<codigo>.html), que trae la
    tabla estructurada "Lugar de advertencia" (Departamento | Municipio) y los
    grupos armados ilegales nombrados.

Decisiones:
  - Los municipios se toman de la tabla de la ficha (completa). El Excel corta
    la lista con "... y Otros" en 11 alertas de cobertura amplia (p. ej. 013-25,
    la alerta electoral nacional con 1.122 municipios); para el resto se
    verifica que el Excel y la ficha traigan exactamente los mismos municipios,
    y en las 11 cortadas que lo listado en el Excel esté contenido en la ficha.
  - Completitud: la numeración de alertas es consecutiva por año (001-AA a
    NNN-AA) sin huecos y el total coincide con el contador del aplicativo
    ("numAlertas"); si no, el script se detiene. Por eso un municipio sin
    alerta en el periodo vale 0.
  - Homologación de nombres a DIVIPOLA contra el universo DANE
    (datos/salida/poblacion_municipal_nacional.csv): comparación por
    departamento + nombre normalizado (sin tildes ni puntuación, sin el sufijo
    "(ANM)" del DANE) más una tabla explícita de alias (ALIAS). Cualquier
    nombre sin homologar detiene el script.
  - Grupos armados: la Defensoría nombra los grupos por alerta, no por
    municipio. grupos_sat.csv asigna los grupos de cada alerta a cada uno de
    sus municipios ("grupo nombrado en una alerta que cubre al municipio"), por
    año de emisión. No es una verificación de presencia en cada municipio.
    Las 8 alertas de alcance nacional o temático (más de UMBRAL_NACIONAL=200
    municipios: electorales y de liderazgos sociales, p. ej. 013-25 con 1.122)
    no se usan en grupos_sat.csv, porque nombran grupos para todo el país y
    asignarlos a cada municipio sería engañoso; sí cuentan en el indicador.
    Se excluyen las categorías genéricas (GENERICOS) y se unifican variantes de
    nombre (UNIFICAR). La Defensoría registra las disidencias como "Facciones
    disidentes de las FARC-EP", sin distinguir EMC / Segunda Marquetalia /
    EMBF, así que se conservan como una sola categoría.

Salidas (datos/salida/conflicto/):
  alertas_tempranas_2024_2026.csv/.meta.json  número de alertas 2024-2026 que
      incluyen al municipio (una fila por municipio, anio="2024-2026")
  alertas_sat_detalle.csv   numero_alerta,fecha,tipo,cod_divipola (2017-2026)
  grupos_sat.csv            cod_divipola,anio,grupo_original,grupo
"""
import csv
import datetime as dt
import hashlib
import html
import io
import json
import re
import subprocess
import sys
import tempfile
import unicodedata
import urllib.parse
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "defensoria"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
BASE = "https://alertastempranas.defensoria.gov.co"
XLSX = CRUDOS / "Reporte_de_Alertas_Tempranas.xlsx"
ZIP = CRUDOS / "sisat_paginas.zip"
ID = "alertas_tempranas_2024_2026"
ANIOS = ("2024", "2025", "2026")
# Alertas de alcance nacional/temático (electorales, liderazgos sociales): más de este número de
# municipios. Cuentan en el indicador y en el detalle, pero sus grupos no van a grupos_sat.csv.
UMBRAL_NACIONAL = 200

# (cod_dpto, nombre normalizado SAT) -> cod_divipola
ALIAS = {
    ("70", "san jose de toluviejo"): "70823",  # DANE: Tolú Viejo
    ("47", "chivolo"): "47170",  # DANE: Chibolo
    ("73", "san sebastian de mariquita"): "73443",  # DANE: Mariquita
    ("23", "san andres de sotavento"): "23670",  # DANE: San Andrés Sotavento
    ("05", "santa fe de antioquia"): "05042",  # DANE: Santafé de Antioquia
    ("13", "santa cruz de mompox"): "13468",  # DANE: Mompós
    ("05", "san vicente ferrer"): "05674",  # DANE: San Vicente
    ("94", "barranco minas"): "94343",  # DANE: Barrancominas
}
DPTO_ALIAS = {"archipielago de san andres": "88"}

GENERICOS = {
    "Grupos Armados de Crimen Organizado",
    "Actores armados transnacionales",
    "Posdemovilización de las AUC",
    "Grupos armados post AUC",
    "Banda Local",
    "Otro",
}
UNIFICAR = {
    "Autodefensas Gaitanistas de Colombia (AGC)": "EGC (Clan del Golfo)",
    "Facciones disidentes de las FARC-EP": "FARC disidencias (SAT no distingue estructura)",
    "Autodefensas Conquistadoras de la Sierra": "Autodefensas Conquistadoras de la Sierra Nevada (ACSN)",
    "Autodefensas Conquistadores de la Sierra Nevada": "Autodefensas Conquistadoras de la Sierra Nevada (ACSN)",
    "Los Pachenca": "Autodefensas Conquistadoras de la Sierra Nevada (ACSN)",
    "Caparros": "Caparros",
    "Los Caparrapos": "Caparros",
    "La Oficina": "La Oficina (de Envigado / del Valle de Aburrá)",
    "La Oficina de Envigado": "La Oficina (de Envigado / del Valle de Aburrá)",
    "La Oficina del Valle de Aburrá": "La Oficina (de Envigado / del Valle de Aburrá)",
}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def curl(args):
    subprocess.run(["curl", "-sS", "-f", "-m", "300"] + args, check=True)


def descargar():
    CRUDOS.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory() as tmp:
        tmp = Path(tmp)
        jar = str(tmp / "jar.txt")
        if not XLSX.exists():
            curl(["-c", jar, "-b", jar, "-o", str(tmp / "rep.html"), f"{BASE}/Alerta/Reporte"])
            t = (tmp / "rep.html").read_text(encoding="utf-8")
            token = re.search(r'name="__RequestVerificationToken" type="hidden" value="([^"]+)"', t).group(1)
            (tmp / "form.txt").write_text(urllib.parse.urlencode({"__RequestVerificationToken": token}))
            curl(["-c", jar, "-b", jar, "-X", "POST", "-H", "X-Requested-With: XMLHttpRequest",
                  "--data", "@" + str(tmp / "form.txt"), "-o", str(tmp / "ok.json"),
                  f"{BASE}/Alerta/GenerarExcel"])
            if not json.loads((tmp / "ok.json").read_text()).get("success"):
                sys.exit("GenerarExcel no respondió success")
            curl(["-c", jar, "-b", jar, "-o", str(XLSX), f"{BASE}/Alerta/DescargarExcelGenerado"])
        if not ZIP.exists():
            curl(["-o", str(tmp / "p1.html"), f"{BASE}/?page=1"])
            t = (tmp / "p1.html").read_text(encoding="utf-8")
            n = int(re.search(r'"numAlertas": (\d+)', t).group(1))
            paginas = -(-n // 20)
            ids = {}
            with zipfile.ZipFile(ZIP, "w", zipfile.ZIP_DEFLATED) as z:
                for p in range(1, paginas + 1):
                    destino = tmp / f"p{p}.html"
                    if p > 1:
                        curl(["-o", str(destino), f"{BASE}/?page={p}"])
                    z.write(destino, f"listado/p{p}.html")
                    ids.update(ids_listado(destino.read_text(encoding="utf-8")))
                for codigo, i in sorted(ids.items()):
                    destino = tmp / f"{codigo}.html"
                    curl(["-o", str(destino), f"{BASE}/Alerta/Details/{i}"])
                    z.write(destino, f"fichas/{codigo}.html")


def ids_listado(t: str) -> dict:
    return dict(re.findall(r'<tr>\s*<td[^>]*>\s*(\d{3}-\d{2})\s*</td>.*?/Alerta/Details/(\d+)', t, re.S))


def limpiar(s: str) -> str:
    return re.sub(r"\s+", " ", html.unescape(s)).strip()


def ficha(t: str) -> dict:
    cab = re.search(r'class="setSmallerFont">(\d\d/\d\d/\d{4})</label>.*?class="setMediumFont">([^<]*)</label>', t, re.S)
    g = re.search(r"Grupos armados ilegales</h2>\s*<p[^>]*>(.*?)</p>", t, re.S)
    if g is None:
        raise ValueError("ficha sin sección de grupos")
    grupos = [limpiar(x) for x in re.split(r"<br\s*/?>", g.group(1))]
    lugar = re.search(r"Lugar de advertencia</h2>(.*?)</table>", t, re.S).group(1)
    muns = []
    for tr in re.findall(r"<tr>(.*?)</tr>", lugar, re.S):
        tds = re.findall(r"<td[^>]*>(.*?)</td>", tr, re.S)
        if tds:
            muns.append((limpiar(tds[0]), limpiar(tds[1])))
    tipo, codigo = limpiar(cab.group(2)).rsplit(" ", 1)
    return {"fecha": cab.group(1), "tipo": tipo, "codigo": codigo,
            "grupos": [x for x in grupos if x], "muns": muns}


def leer_hoja(xlsx: Path, hoja: str):
    with zipfile.ZipFile(xlsx) as z:
        ss = z.read("xl/sharedStrings.xml").decode("utf-8")
        textos = [html.unescape(re.sub(r"<[^>]+>", "", s)) for s in re.findall(r"<si>(.*?)</si>", ss, re.S)]
        xml = z.read(f"xl/worksheets/{hoja}.xml").decode("utf-8")
    patron = re.compile(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
    for fila in re.findall(r"<row [^>]*>(.*?)</row>", xml, re.S):
        celdas = {}
        for col, attrs, interior in patron.findall(fila):
            v = re.search(r"<v>(.*?)</v>", interior or "", re.S)
            if v is None:
                continue
            v = v.group(1)
            celdas[col] = textos[int(v)] if 't="s"' in attrs else html.unescape(v)
        yield celdas


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s.lower())
    s = "".join(c for c in s if not unicodedata.combining(c))
    s = s.replace("(anm)", "")
    return re.sub(r"[^a-z0-9]+", " ", s).strip()


def excel_muns(texto: str):
    """'A, B (Depto); C (Depto)' -> [(Depto, A), ...]; marca si viene cortado."""
    cortado = texto.endswith("... y Otros")
    texto = texto.replace("... y Otros", "")
    salida = []
    for nombres, dpto in re.findall(r"(.*?) \(([^()]*)\)(?:; |$)", texto):
        if nombres == "Bogotá, D.C.":
            salida.append((dpto, nombres))
            continue
        salida += [(dpto, n.strip()) for n in nombres.split(", ")]
    return salida, cortado


def main():
    descargar()
    hoy = dt.date.today().isoformat()
    # Universo
    universo, por_nombre, dptos = {}, {}, defaultdict(set)
    with UNIVERSO.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            universo[r["cod_divipola"]] = r["municipio"]
            por_nombre.setdefault((r["cod_dpto"], norm(r["municipio"])), set()).add(r["cod_divipola"])
            dptos[norm(r["departamento"])].add(r["cod_dpto"])
    if len(universo) != 1123:
        sys.exit(f"Universo con {len(universo)} municipios")

    def codigo(dpto: str, mun: str) -> str:
        nd = norm(dpto)
        cd = DPTO_ALIAS.get(nd) or (dptos[nd].copy().pop() if len(dptos.get(nd, ())) == 1 else None)
        if cd is None:
            raise KeyError(f"departamento {dpto}")
        c = ALIAS.get((cd, norm(mun)))
        if c is None:
            cands = por_nombre.get((cd, norm(mun)), set())
            if len(cands) != 1:
                raise KeyError(f"{mun} ({dpto})")
            c = next(iter(cands))
        return c

    # Excel oficial
    filas = [c for c in leer_hoja(XLSX, "sheet1")]
    enc = filas[5]
    if [enc.get(k) for k in "ABCEG"] != ["Código", "Tipo", "Fecha Emisión", "Municipios", "Grupos Armados Ilegales"]:
        sys.exit(f"Encabezado inesperado del Excel: {enc}")
    excel = {c["A"]: c for c in filas[6:] if c.get("A")}

    # Páginas del aplicativo
    with zipfile.ZipFile(ZIP) as z:
        listado = z.read("listado/p1.html").decode("utf-8")
        num_alertas = int(re.search(r'"numAlertas": (\d+)', listado).group(1))
        fichas = {Path(n).stem: ficha(z.read(n).decode("utf-8"))
                  for n in z.namelist() if n.startswith("fichas/")}

    # Completitud
    if not (len(excel) == len(fichas) == num_alertas) or set(excel) != set(fichas):
        sys.exit(f"Excel {len(excel)} / fichas {len(fichas)} / aplicativo {num_alertas}")
    por_anio = defaultdict(list)
    for cod in excel:
        n, a = cod.split("-")
        por_anio[a].append(int(n))
    for a, ns in por_anio.items():
        if sorted(ns) != list(range(1, max(ns) + 1)):
            sys.exit(f"Numeración con huecos en 20{a}")

    detalle, grupos, errores, excluidos = [], set(), [], Counter()
    sin_homologar = Counter()
    cortadas, avisos, nacionales = [], [], []
    nac_codigos = set()
    for cod in sorted(excel, key=lambda c: (c[-2:], c)):
        x, fi = excel[cod], fichas[cod]
        fecha_x = dt.date(1899, 12, 30) + dt.timedelta(days=int(float(x["C"])))
        fecha_f = dt.datetime.strptime(fi["fecha"], "%d/%m/%Y").date()
        if fecha_x != fecha_f or x["B"] != fi["tipo"] or fi["codigo"] != cod:
            errores.append(f"{cod}: fecha/tipo distintos Excel vs ficha")
        if str(fecha_f.year)[2:] != cod[-2:] and cod != "001-17":
            errores.append(f"{cod}: año de emisión {fecha_f.year} distinto del código")
        mx, cortado = excel_muns(x.get("E", ""))
        if cortado:
            cortadas.append(cod)
            if not set(mx) <= set(fi["muns"]):
                errores.append(f"{cod}: municipios del Excel no contenidos en la ficha")
        elif sorted(mx) != sorted(fi["muns"]):
            errores.append(f"{cod}: municipios Excel {sorted(set(mx) ^ set(fi['muns']))}")
        gx = [re.sub(r"\s+", " ", g).strip() for g in x.get("G", "").split(";")]
        gx = {g for g in gx if g}
        gf = {re.sub(r"\s+", " ", g).strip() for g in fi["grupos"]}
        if not gx <= gf:
            errores.append(f"{cod}: grupos Excel {gx} vs ficha {gf}")
        elif gf - gx:
            avisos.append(f"{cod}: la ficha nombra además {sorted(gf - gx)} (se usa la ficha)")
        cods = []
        for dpto, mun in fi["muns"]:
            try:
                cods.append(codigo(dpto, mun))
            except KeyError:
                sin_homologar[(dpto, mun)] += 1
        if len(set(cods)) != len(cods):
            errores.append(f"{cod}: municipio repetido")
        for c in cods:
            detalle.append({"numero_alerta": cod, "fecha": fecha_f.isoformat(),
                            "tipo": fi["tipo"].lower(), "cod_divipola": c})
        if len(cods) > UMBRAL_NACIONAL:
            nacionales.append(f"{cod} ({len(cods)} municipios)")
            nac_codigos.add(cod)
            continue  # alerta de alcance nacional: sus grupos no se asignan a cada municipio
        for g in fi["grupos"]:
            g = re.sub(r"\s+", " ", g).strip()
            if g in GENERICOS:
                excluidos[g] += 1
                continue
            for c in cods:
                grupos.add((c, fecha_f.year, g, UNIFICAR.get(g, g)))
    if sin_homologar:
        sys.exit(f"Sin homologar: {dict(sin_homologar)}")
    if errores:
        sys.exit("\n".join(errores))

    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / "alertas_sat_detalle.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["numero_alerta", "fecha", "tipo", "cod_divipola"])
        w.writeheader()
        w.writerows(detalle)
    with (SALIDA / "grupos_sat.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "grupo_original", "grupo"])
        w.writerows(sorted(grupos))

    # Las alertas de alcance nacional o temático (> UMBRAL_NACIONAL municipios) no se cuentan: sumarían 1 a casi
    # todo el país y no distinguen territorios. Siguen en alertas_sat_detalle.csv.
    conteo = Counter(d["cod_divipola"] for d in detalle
                     if d["numero_alerta"][-2:] in ("24", "25", "26") and d["numero_alerta"] not in nac_codigos)
    with (SALIDA / f"{ID}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for c in sorted(universo):
            w.writerow([c, "2024-2026", conteo.get(c, 0), "", ""])

    n_periodo = sum(len(por_anio[a[2:]]) for a in ANIOS)
    ultima = max(d["fecha"] for d in detalle)
    meta = {
        "id": ID,
        "etiqueta": "Alertas tempranas (Defensoría)",
        "descripcion": ("Número de alertas tempranas (estructurales y de inminencia) emitidas por el Sistema de "
                        "Alertas Tempranas de la Defensoría del Pueblo entre 2024 y 2026 cuyo lugar de "
                        "advertencia incluye al municipio."),
        "unidad": "alertas tempranas",
        "sentido": "contexto",
        "periodo": f"2024-01-01 a {ultima} (2026 parcial; alertas 001-24 a {max(por_anio['26']):03d}-26)",
        "institucion": "Defensoría del Pueblo – Delegada para la Prevención de Riesgos y Sistema de Alertas Tempranas (SAT)",
        "base": "SISAT – Alertas Tempranas emitidas (módulo Reportes, exportación Excel, y fichas por alerta)",
        "enlace": BASE + "/",
        "fecha_consulta": hoy,
        "agregable": "no",
        "factor": None,
        "nota": (f"{n_periodo} alertas emitidas en 2024-2026 ({len(por_anio['24'])} en 2024, "
                 f"{len(por_anio['25'])} en 2025, {len(por_anio['26'])} en 2026 hasta {ultima}). El listado "
                 f"es completo: {num_alertas} alertas desde 001-17, numeración consecutiva sin huecos por año, "
                 "igual al contador del aplicativo; por eso ausente = 0. No se cuentan las alertas de alcance "
                 f"nacional o temático (más de {UMBRAL_NACIONAL} municipios; en el periodo: "
                 f"{', '.join(sorted(c for c in nac_codigos if c[-2:] in ('24', '25', '26')))}, p. ej. la 013-25 "
                 "electoral que cubre 1.122 municipios), porque no distinguen territorios; están en "
                 "alertas_sat_detalle.csv. Como una alerta cubre varios municipios, el valor no se suma "
                 "(agregable: no). Una alerta advierte un riesgo, no registra hechos ocurridos. Municipios tomados "
                 "de la tabla 'Lugar de advertencia' de cada ficha (el Excel corta la lista con '... y Otros' en "
                 f"{len(cortadas)} alertas) y homologados por nombre a DIVIPOLA. Se muestra como contexto, sin ranking."),
        "sha256": {XLSX.name: sha(XLSX), ZIP.name: sha(ZIP)},
    }
    (SALIDA / f"{ID}.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"Alertas: {num_alertas}; por año: { {a: len(v) for a, v in sorted(por_anio.items())} }")
    print(f"Cortadas en el Excel: {cortadas}")
    print("Alertas nacionales excluidas de grupos_sat:", nacionales)
    print("Avisos:", *avisos, sep="\n  ")
    print(f"Filas detalle: {len(detalle)}; filas grupos: {len(grupos)}; excluidos genéricos: {dict(excluidos)}")
    print(f"Municipios con >=1 alerta 2024-2026: {len(conteo)}")
    for c in ("41001", "41020", "41006", "41799", "41551"):
        print(c, universo[c], conteo.get(c, 0))
    huila = sorted({d["numero_alerta"] for d in detalle
                    if d["cod_divipola"].startswith("41") and d["numero_alerta"][-2:] in ("24", "25", "26")})
    print("Alertas 2024-2026 con algún municipio del Huila:", len(huila), huila)
    print("sha256", meta["sha256"])


if __name__ == "__main__":
    main()
