"""Confinamientos por conflicto armado por municipio, 2024-2026 (OCHA Colombia, Monitor).

Fuente: OCHA Colombia, sistema Monitor (https://monitor.unocha.org/colombia),
publicado en HDX, conjunto "Colombia: Acceso Humanitario"
(https://data.humdata.org/dataset/acceso-humanitario-colombia), recurso
monitor_hist_2026_acc.xlsx ("Incidentes de Acceso Humanitario en Colombia con
confinamientos incluidos"), licencia CC BY. Cubre enero 2024 - mayo 2026.

Qué se mide (categoría "Confinamiento/Bloqueo de comunidades" del Monitor):
  * ocha_confinamientos_2024_2026: número de eventos de confinamiento
    (identificadores "Monitor ID" distintos) registrados en el municipio y año.
  * ocha_personas_confinadas_2024_2026: suma de la columna "Victimas" de esos
    eventos (personas afectadas por confinamiento; cada fila del archivo es una
    desagregación por sexo/edad/etnia/lugar de un evento, y su suma por evento es
    el total de víctimas que publica OCHA).
OCHA solo monitorea emergencias masivas (confinamientos de comunidades), no
casos individuales. Confinamiento: restricción a la libre movilidad de una
comunidad impuesta por actores armados, con limitación de acceso a bienes y
servicios básicos (glosario UARIV, citado por OCHA).

Decisiones:
  * Se usa solo el archivo más reciente (monitor_hist_2026_acc.xlsx); el
    histórico 2008-sept 2025 del mismo conjunto es un corte anterior de las
    mismas bases y sus cifras 2024-2025 fueron actualizadas después.
  * Año = columna "Año" (fecha de inicio del evento).
  * Municipio = columna "Divipola Municipal" (código a 4-5 dígitos, se completa
    a 5 con cero). Un evento que afecta varios municipios cuenta una vez en
    cada municipio; por eso el número de eventos de un departamento o de
    Colombia NO es la suma de los municipios (agregable = "no"); las personas
    sí se suman (cada fila pertenece a un solo municipio).
  * Cobertura nacional del Monitor: municipio sin eventos registrados = 0.
  * Chequeo contra lo publicado por OCHA (Informe de Tendencias e Impacto
    Humanitario 2025, publicado 5-mar-2026): 2025 = 113 eventos y 155,2 mil
    personas. El script se detiene si el total 2025 no cuadra.
"""
import csv
import datetime as dt
import hashlib
import html
import json
import re
import subprocess
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "ocha"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"

ARCHIVO = "monitor_hist_2026_acc.xlsx"
URL = ("https://data.humdata.org/dataset/f3187152-affc-4454-bbc5-de2aa2e6f906/resource/"
       "4a9cdb5f-d1eb-4d97-83cc-59321b41d17f/download/monitor_hist_2026_acc.xlsx")
DATASET = "https://data.humdata.org/dataset/acceso-humanitario-colombia"
CATEGORIA = "Confinamiento/Bloqueo de comunidades"
ANIOS = ["2024", "2025", "2026"]
# Cifras publicadas por OCHA (Informe de Tendencias e Impacto Humanitario 2025, p. 4):
PUBLICADO_2025 = {"eventos": 113, "personas_miles": 155.2}


def sha(ruta: Path) -> str:
    return hashlib.sha256(ruta.read_bytes()).hexdigest()


def leer_xlsx(xlsx: Path):
    """Primera hoja como lista de dicts (cadenas compartidas e inline)."""
    with zipfile.ZipFile(xlsx) as z:
        try:
            ss = z.read("xl/sharedStrings.xml").decode("utf-8")
            textos = [re.sub(r"<[^>]+>", "", s) for s in re.findall(r"<si>(.*?)</si>", ss, re.S)]
        except KeyError:
            textos = []
        xml = z.read("xl/worksheets/sheet1.xml").decode("utf-8")
    patron = re.compile(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
    filas = []
    for fila in re.findall(r"<row [^>]*>(.*?)</row>", xml, re.S):
        celdas = {}
        for col, attrs, interior in patron.findall(fila):
            v = re.search(r"<v>(.*?)</v>", interior or "")
            if v is None:  # cadena en línea (t="inlineStr"), usada en los encabezados
                t = re.search(r"<t[^>]*>(.*?)</t>", interior or "", re.S)
                if t is not None:
                    celdas[col] = html.unescape(t.group(1))
                continue
            celdas[col] = html.unescape(textos[int(v.group(1))]) if 't="s"' in attrs else v.group(1)
        filas.append(celdas)
    enc = filas[0]
    return [{enc[k]: v for k, v in f.items() if k in enc} for f in filas[1:]]


def main():
    CRUDOS.mkdir(parents=True, exist_ok=True)
    SALIDA.mkdir(parents=True, exist_ok=True)
    ruta = CRUDOS / ARCHIVO
    if not ruta.exists():
        subprocess.run(["curl", "-sS", "-f", "-L", "-m", "300", "-o", str(ruta), URL], check=True)
    hoy = dt.date.today().isoformat()
    huella = sha(ruta)
    with open(CRUDOS / "manifiesto.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["archivo", "url", "fecha_consulta", "sha256", "bytes"])
        w.writerow([ARCHIVO, URL, hoy, huella, ruta.stat().st_size])

    universo = set()
    with open(UNIVERSO, encoding="utf-8") as f:
        universo = {r["cod_divipola"] for r in csv.DictReader(f)}
    if len(universo) != 1123:
        sys.exit(f"Universo: {len(universo)} municipios, se esperaban 1123")

    todas = leer_xlsx(ruta)
    if not todas or "Categoria" not in todas[0] or "Divipola Municipal" not in todas[0]:
        sys.exit("Estructura del archivo distinta a la esperada")
    filas = [r for r in todas if r.get("Categoria") == CATEGORIA]
    sin_mpio = [r for r in filas if not r.get("Divipola Municipal")]
    if sin_mpio:
        for r in sin_mpio:
            print("Fila de confinamiento sin municipio:", r.get("Monitor ID"), r.get("Titulo"))
        sys.exit("Hay confinamientos sin código de municipio")
    eventos, personas = defaultdict(set), defaultdict(float)
    ev_nac, pers_nac = defaultdict(set), defaultdict(float)
    fuera = defaultdict(lambda: [set(), 0.0])
    for r in filas:
        cod = r["Divipola Municipal"].zfill(5)
        anio = r["Año"]
        if anio not in ANIOS:
            sys.exit(f"Año inesperado: {anio}")
        v = float(r.get("Victimas") or 0)
        if v != int(v) or v < 0:
            sys.exit(f"Víctimas no entero: {r}")
        ev_nac[anio].add(r["Monitor ID"])
        pers_nac[anio] += v
        if cod not in universo:  # se lista; no se reasigna a otro municipio
            fuera[(cod, r.get("Municipio"), r.get("Departamento"), anio)][0].add(r["Monitor ID"])
            fuera[(cod, r.get("Municipio"), r.get("Departamento"), anio)][1] += v
            continue
        eventos[(cod, anio)].add(r["Monitor ID"])
        personas[(cod, anio)] += v

    meses_2026 = sorted({int(r["Mes"]) for r in filas if r["Año"] == "2026"})
    ultimo_mes = max(int(r["Mes"]) for r in todas if r.get("Año") == "2026")

    # chequeo contra el informe publicado
    if len(ev_nac["2025"]) != PUBLICADO_2025["eventos"] or round(pers_nac["2025"] / 1000, 1) != PUBLICADO_2025["personas_miles"]:
        sys.exit(f"2025 no cuadra con lo publicado por OCHA: {len(ev_nac['2025'])} eventos, {pers_nac['2025']} personas")

    for ident, datos in (("ocha_confinamientos_2024_2026", {k: len(v) for k, v in eventos.items()}),
                         ("ocha_personas_confinadas_2024_2026", {k: int(v) for k, v in personas.items()})):
        with open(SALIDA / f"{ident}.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
            for c in sorted(universo):
                for a in ANIOS:
                    w.writerow([c, a, datos.get((c, a), 0), "", ""])

    multi = sum(1 for a in ANIOS for e in ev_nac[a] if sum(1 for (c, y), s in eventos.items() if y == a and e in s) > 1)
    resumen = "; ".join(f"{a}: {len(ev_nac[a])} eventos, " + f"{int(pers_nac[a]):,}".replace(",", ".") + " personas"
                        for a in ANIOS)
    nota = (
        f"Registro del Monitor de OCHA Colombia (categoría '{CATEGORIA}'), alimentado por los Equipos Locales de "
        "Coordinación, socios humanitarios y fuentes abiertas; OCHA solo monitorea emergencias masivas y advierte que "
        "las cifras se actualizan y validan continuamente (pueden cambiar). 2026 llega solo hasta "
        f"{['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][ultimo_mes-1]} "
        f"(corte del archivo publicado el 25-may-2026): no es comparable con años completos. Totales Colombia: {resumen}. "
        "Chequeo: 2025 coincide con el informe de OCHA (113 eventos, 155,2 mil personas, publicado 5-mar-2026); 2024 "
        "difiere levemente del informe de feb-2025 (90 eventos y 138.419 personas) porque el archivo es un corte "
        "posterior. Año = fecha de inicio del evento. Cobertura nacional: municipio sin registro = 0 (ausencia de "
        "registro, no certeza de ausencia de confinamiento)."
    )
    if fuera:
        nota += (" Registros con código DIVIPOLA fuera del universo de 1.123 municipios del DANE (no se reasignan, "
                 "cuentan en el total nacional pero en ningún municipio): " + "; ".join(
                     f"{c} {m} ({d}) {a}: {len(e)} eventos, {int(p)} personas" for (c, m, d, a), (e, p) in sorted(fuera.items())) + ".")
    comun = {"anio_principal": "2024-2025", "sentido": "peor", "periodo": f"2024-2026 (2026: enero-{['enero','febrero','marzo','abril','mayo','junio','julio','agosto','septiembre','octubre','noviembre','diciembre'][ultimo_mes-1]})",
             "institucion": "Oficina de las Naciones Unidas para la Coordinación de Asuntos Humanitarios (OCHA) Colombia",
             "base": "Monitor OCHA Colombia — Incidentes de acceso humanitario con confinamientos (HDX: Colombia: Acceso Humanitario, monitor_hist_2026_acc.xlsx)",
             "enlace": DATASET, "fecha_consulta": hoy, "factor": None, "sha256": {ARCHIVO: huella}}
    metas = {
        "ocha_confinamientos_2024_2026": {
            "etiqueta": "Eventos de confinamiento (OCHA)",
            "descripcion": "Número de eventos de confinamiento o bloqueo de comunidades por actores armados registrados por OCHA en el municipio en el año.",
            "unidad": "eventos", "agregable": "no",
            "nota": nota + f" Un evento que afecta varios municipios cuenta en cada uno ({multi} eventos en 2024-2026), "
                           "por eso el total departamental o nacional no es la suma de municipios.",
        },
        "ocha_personas_confinadas_2024_2026": {
            "etiqueta": "Personas confinadas (OCHA)",
            "descripcion": "Número de personas afectadas por eventos de confinamiento o bloqueo de comunidades por actores armados registrados por OCHA en el municipio en el año.",
            "unidad": "personas", "agregable": "suma", "nota": nota,
        },
    }
    orden = ["id", "etiqueta", "descripcion", "unidad", "sentido", "periodo", "anio_principal", "institucion", "base", "enlace",
             "fecha_consulta", "agregable", "factor", "nota", "sha256"]
    for ident, m in metas.items():
        meta = {"id": ident, **m, **comun}
        (SALIDA / f"{ident}.meta.json").write_text(
            json.dumps({k: meta[k] for k in orden}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print("Totales:", resumen, "| meses 2026 con confinamiento:", meses_2026, "| último mes del archivo:", ultimo_mes)
    print("Eventos multi-municipio:", multi)
    for k, (e, p) in sorted(fuera.items()):
        print("FUERA DEL UNIVERSO:", k, len(e), "eventos", int(p), "personas")
    huila = {a: (sum(len(v) for (c, y), v in eventos.items() if c[:2] == "41" and y == a),
                 int(sum(v for (c, y), v in personas.items() if c[:2] == "41" and y == a))) for a in ANIOS}
    print("Huila (eventos-municipio, personas):", huila)
    for (c, a), v in sorted(personas.items()):
        if c[:2] == "41":
            print("  ", c, a, len(eventos[(c, a)]), int(v))


if __name__ == "__main__":
    main()
