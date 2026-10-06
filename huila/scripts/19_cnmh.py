"""Hechos de violencia del conflicto y grupos presuntos responsables por
municipio, 2023-2026 (CNMH, Observatorio de Memoria y Conflicto, SIEVCAC).

Fuente: Centro Nacional de Memoria Histórica (CNMH), Observatorio de Memoria y
Conflicto (OMC), Sistema de Información de Eventos de Violencia del Conflicto
Armado Colombiano (SIEVCAC). Página de descargas:
  https://micrositios.centrodememoriahistorica.gov.co/observatorio/portal-de-datos/base-de-datos/
Bases "Casos" con corte a 31 de marzo de 2026 (una por modalidad, XLSX, una
fila = un caso; los archivos traen el sufijo _202603):
  AB acciones bélicas, AS asesinatos selectivos, AP ataques a poblaciones,
  AT atentados terroristas, DB daño a bienes civiles, DF desaparición forzada,
  MA masacres, MI minas antipersonal/MUSE/AEI, RU reclutamiento y utilización
  de niñas, niños y adolescentes, SE secuestro, VS violencia sexual.
Se usan las 11 modalidades (el SIEVCAC no documenta desplazamiento forzado,
que queda en el RUV). Cada XLSX pesa menos de 40 MB (el mayor, AS, 16,8 MB),
así que se guardan tal cual en datos/crudos/cnmh/.

Verificación: el tablero oficial "El conflicto armado en cifras"
(https://micrositios.centrodememoriahistorica.gov.co/observatorio/portal-de-datos/el-conflicto-en-cifras/,
Power BI público) se consulta con su API pública de solo lectura (la misma que
usa el navegador al abrir el tablero) para obtener la fecha de corte y el
número de casos por modalidad y año, en Colombia y en el Huila; deben coincidir
exactamente con los conteos de los XLSX o el script se detiene. Respuestas
guardadas en datos/crudos/cnmh/verificacion_tablero.json. Con --sin-verificar
se omite (p. ej. sin red).

Decisiones:
  * Hecho = caso SIEVCAC con Año 2023-2026 en cualquiera de las 11 bases. El
    ID Caso es único dentro de cada base y no se repite entre bases (se
    verifica). 2026 cubre solo enero-marzo (corte 31-mar-2026) y los años
    recientes siguen recibiendo registros en cortes posteriores.
  * Municipio = "Código DANE de Municipio" de la base (5 dígitos). Casos sin
    municipio (00000, códigos departamentales xx000, exterior) o con un código
    fuera del universo de 1.123 municipios (Belén de Bajirá, 27086, creado
    después de las proyecciones DANE 2018) se listan y NO se asignan.
  * Grupos (grupos_cnmh.csv): "Presunto Responsable" + "Descripción Presunto
    Responsable" (bases AS, AT, DB, DF, MA, MI, RU, SE, VS) y "Grupo Armado
    1-3" + descripción (AB y AP, donde son las partes del combate o del
    ataque). Solo grupos armados con nombre; se excluyen y cuentan: agentes del
    Estado, agentes extranjeros, "no identificado", "desconocido", "otro",
    "otra disidencia", "guerrilla otra/no identificada", combinaciones sin
    nombre ("AGENTE DEL ESTADO - GUERRILLA" / "NO APLICA"). Unificación en
    UNIFICACION. El CNMH no distingue estructuras de las disidencias de las
    FARC (EMC, EMBF, Segunda Marquetalia...): todas vienen como "DISIDENCIA
    FARC" y se dejan como "FARC disidencias (sin distinguir estructura)".
    "URABEÑOS/AUTODEFENSAS GAITANISTAS DE COLOMBIA/ÁGUILAS NEGRAS/CLAN ÚSUGA"
    es una sola categoría del CNMH -> "EGC (Clan del Golfo)".
  * Indicador cnmh_hechos_2023_2026: casos por municipio y año (2023, 2024,
    2025, 2026 ene-mar). Cobertura nacional: municipio sin casos = 0.

Salidas:
  datos/crudos/cnmh/  (11 XLSX, verificacion_tablero.json, manifiesto.csv)
  datos/salida/conflicto/grupos_cnmh.csv
  datos/salida/conflicto/cnmh_hechos_2023_2026.csv / .meta.json
"""
import csv
import hashlib
import html
import json
import re
import subprocess
import sys
import urllib.request
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "cnmh"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
FECHA_CONSULTA = "2026-10-06"
CORTE = "2026-03-31"
ANIOS = ["2023", "2024", "2025", "2026"]
BASE_URL = "https://micrositios.centrodememoriahistorica.gov.co/observatorio/download/"

# archivo -> (slug de descarga, id wpdm, modalidad como la nombra el tablero)
BASES = {
    "CasosAB_202603.xlsx": ("casos-acciones-belicas", 1240, "ACCIONES BÉLICAS (AB)"),
    "CasosAS_202603.xlsx": ("casos-asesinatos-selectivos", 1252, "ASESINATOS SELECTIVOS (AS)"),
    "CasosAP_202603.xlsx": ("casos-ataques-poblaciones", 1242, "ATAQUE A POBLADO (AP)"),
    "CasosAT_202603.xlsx": ("casos-atentados-terroristas", 1253, "ATENTADO TERRORISTA (AT)"),
    "CasosDB_202603.xlsx": ("casos-danos-bienes-civiles", 1254, "DAÑO A BIENES CIVILES (DB)"),
    "CasosDF_202603.xlsx": ("casos-desaparicion-forzada", 1255, "DESAPARICIÓN FORZADA (DF)"),
    "CasosMA_202603.xlsx": ("casos-ma", 1256, "MASACRES (MA)"),
    "CasosMI_202603.xlsx": ("casos-mi", 1257, "MINAS (MI)"),
    "CasosRU_202603.xlsx": ("casos-ru", 1258, "RECLUTAMIENTO Y UTILIZACIÓN DE MENORES DE 18 AÑOS DE EDAD (RU)"),
    "CasosSE_202603.xlsx": ("casos-se", 1259, "SECUESTRO (SE)"),
    "CasosVS_202603.xlsx": ("casos-vs", 1260, "VIOLENCIA SEXUAL (VS)"),
}

# (Presunto Responsable / Grupo Armado, Descripción) -> nombre unificado
UNIFICACION = {
    ("GUERRILLA", "DISIDENCIA FARC"): "FARC disidencias (sin distinguir estructura)",
    ("GUERRILLA", "ELN"): "ELN",
    ("GRUPO POSDESMOVILIZACIÓN", "URABEÑOS/AUTODEFENSAS GAITANISTAS DE COLOMBIA/ÁGUILAS NEGRAS/CLAN ÚSUGA"):
        "EGC (Clan del Golfo)",
    ("GRUPO POSDESMOVILIZACIÓN", "LOS RASTROJOS"): "Los Rastrojos",
    ("GUERRILLA", "DISIDENCIA EPL"): "EPL",
    ("GUERRILLA", "DISIDENCIA ERG"): "Disidencia ERG",
}
EXCLUIR_RESP = {"AGENTE DEL ESTADO", "AGENTE EXTRANJERO", "GRUPO ARMADO NO IDENTIFICADO",
                "DESCONOCIDO", "OTRO", "AGENTE DEL ESTADO - GUERRILLA",
                "GRUPO POSDESMOVILIZACIÓN - GUERRILLA", "AGENTE DEL ESTADO - GRUPO POSDESMOVILIZACIÓN"}
EXCLUIR_DESC = {"NO IDENTIFICADO", "NO IDENTIFICADA", "OTRO", "OTRA", "OTRA DISIDENCIA", "NO APLICA", ""}

PBI_URL = "https://wabi-paas-1-scus-api.analysis.windows.net/public/reports/querydata?synchronous=true"
PBI_KEY = "93347544-56e1-4527-b8cc-f5f2d3da2cb1"   # clave pública del iframe del tablero
PBI_MODELO = 2821699


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
    for nombre, (slug, wpdm, _) in BASES.items():
        url = f"{BASE_URL}{slug}/?wpdmdl={wpdm}"
        p = CRUDOS / nombre
        if not p.exists():
            subprocess.run(["curl", "-sS", "-f", "-L", "-m", "600", "-o", str(p), url], check=True)
        if p.stat().st_size > 40 * 1024 * 1024:
            sys.exit(f"{nombre} pesa más de 40 MB: no debe quedar en el repo")
        h = sha256(p)
        if nombre in previo and previo[nombre]["sha256"] != h:
            sys.exit(f"SHA-256 de {nombre} no coincide con el manifiesto: el crudo cambió "
                     "(¿nuevo corte del CNMH? revisar antes de seguir)")
        hashes[nombre] = h
        filas.append({"archivo": nombre, "url": url,
                      "fecha_consulta": previo.get(nombre, {}).get("fecha_consulta", FECHA_CONSULTA),
                      "corte": CORTE, "sha256": h, "bytes": p.stat().st_size})
    with man.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    return hashes


def leer_hoja(xlsx: Path, hoja: str = "sheet1"):
    """Filas de la hoja como dict {encabezado: valor} (librería estándar)."""
    with zipfile.ZipFile(xlsx) as z:
        ss = z.read("xl/sharedStrings.xml").decode("utf-8")
        textos = [html.unescape(re.sub(r"<[^>]+>", "", s)) for s in re.findall(r"<si>(.*?)</si>", ss, re.S)]
        xml = z.read(f"xl/worksheets/{hoja}.xml").decode("utf-8")
    patron = re.compile(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
    encabezado = None
    for fila in re.findall(r"<row [^>]*>(.*?)</row>", xml, re.S):
        celdas = {}
        for col, attrs, interior in patron.findall(fila):
            v = re.search(r"<v>(.*?)</v>", interior or "")
            if v is None:
                continue
            celdas[col] = textos[int(v.group(1))] if 't="s"' in attrs else v.group(1)
        if encabezado is None:
            encabezado = celdas
            continue
        yield {encabezado[c]: v for c, v in celdas.items() if c in encabezado}


def universo():
    with UNIVERSO.open(encoding="utf-8") as f:
        codigos = sorted({r["cod_divipola"] for r in csv.DictReader(f)})
    if len(codigos) != 1123:
        sys.exit(f"Universo con {len(codigos)} municipios (se esperaban 1.123)")
    return codigos


# ------------------------------------------------------------ verificación
def _pbi(query: dict, n_cols: int) -> list:
    cuerpo = {"version": "1.0.0", "queries": [{"Query": {"Commands": [{"SemanticQueryDataShapeCommand": {
        "Query": query, "Binding": {"Primary": {"Groupings": [{"Projections": list(range(n_cols))}]},
                                    "DataReduction": {"DataVolume": 3, "Primary": {"Window": {"Count": 1000}}},
                                    "Version": 1}}}]}, "QueryId": ""}], "cancelQueries": [],
        "modelId": PBI_MODELO}
    req = urllib.request.Request(PBI_URL, data=json.dumps(cuerpo).encode(),
                                 headers={"X-PowerBI-ResourceKey": PBI_KEY, "Content-Type": "application/json"})
    d = json.loads(urllib.request.urlopen(req, timeout=120).read())
    ds = d["results"][0]["result"]["data"]["dsr"]["DS"][0]
    dicts = ds.get("ValueDicts", {})
    filas, previa = [], [None] * n_cols
    for r in ds["PH"][0]["DM0"]:
        rep, nul = r.get("R", 0), r.get("Ø", 0)
        # Filas comprimidas: "C" trae solo los valores no repetidos (bitmask
        # "R") ni nulos (bitmask "Ø"); la primera fila puede venir como G0, M0...
        sueltos = r["C"] if "C" in r else [v for k, v in r.items() if re.fullmatch(r"[GM]\d+", k)]
        vals, it = [], iter(sueltos)
        for i in range(n_cols):
            if rep >> i & 1:
                v = previa[i]
            elif nul >> i & 1:
                v = None
            else:
                v = next(it)
            vals.append(v)
        filas.append(vals)
        previa = vals
    out = []
    for vals in filas:
        out.append([dicts["D0"][vals[0]] if "D0" in dicts and isinstance(vals[0], int) and n_cols > 1 else vals[0]]
                   + vals[1:])
    return out


def _col(src, prop):
    return {"Column": {"Expression": {"SourceRef": {"Source": src}}, "Property": prop}}


def verificar_tablero(conteo_mod: Counter, conteo_huila: Counter) -> dict:
    corte_q = {"Version": 2, "From": [{"Name": "o", "Entity": "ADMDWH DIM_OPERACION", "Type": 0}],
               "Select": [dict(_col("o", "Fecha de corte:"), Name="corte")]}
    ms = _pbi(corte_q, 1)[0][0]
    import datetime as dt
    corte = dt.datetime.fromtimestamp(ms / 1000, dt.timezone.utc).date().isoformat()
    if corte != CORTE:
        sys.exit(f"El tablero del CNMH tiene corte {corte}, los XLSX {CORTE}")
    registro = {"corte_tablero": corte, "consultado": FECHA_CONSULTA, "colombia": {}, "huila": {}}
    for anio in ANIOS:
        for ambito, dpto in (("colombia", None), ("huila", "HUILA")):
            frm = [{"Name": "c", "Entity": "CASO", "Type": 0}, {"Name": "t", "Entity": "TIPO_ACCION", "Type": 0},
                   {"Name": "h", "Entity": "HECHOS_C", "Type": 0}]
            where = [{"Condition": {"In": {"Expressions": [_col("c", "Año")],
                                           "Values": [[{"Literal": {"Value": f"{anio}L"}}]]}}}]
            if dpto:
                frm.append({"Name": "g", "Entity": "GEOGRAFIA", "Type": 0})
                where.append({"Condition": {"In": {"Expressions": [_col("g", "Departamento")],
                                                   "Values": [[{"Literal": {"Value": f"'{dpto}'"}}]]}}})
            q = {"Version": 2, "From": frm, "Where": where,
                 "Select": [dict(_col("t", "Tipo de Violencia"), Name="t"),
                            {"Aggregation": {"Expression": _col("h", "CasosCount"), "Function": 0}, "Name": "n"}]}
            tablero = {t: int(n) for t, n in _pbi(q, 2) if n}
            registro[ambito][anio] = tablero
            propio = conteo_mod if ambito == "colombia" else conteo_huila
            for _, _, mod in BASES.values():
                if tablero.get(mod, 0) != propio.get((anio, mod), 0):
                    sys.exit(f"{ambito} {anio} {mod}: tablero={tablero.get(mod, 0)} "
                             f"XLSX={propio.get((anio, mod), 0)}")
    (CRUDOS / "verificacion_tablero.json").write_text(json.dumps(registro, ensure_ascii=False, indent=1) + "\n",
                                                      encoding="utf-8")
    return registro


# ------------------------------------------------------------------ main
def main() -> None:
    hashes = asegurar_crudos()
    codigos = universo()
    univ = set(codigos)
    conteo = defaultdict(Counter)            # cod -> {anio: n}
    conteo_mod, conteo_huila = Counter(), Counter()
    por_mod_anio = Counter()
    grupos, excluidos, sin_mpio = set(), Counter(), Counter()
    ids_vistos = {}
    for nombre, (_, _, mod) in BASES.items():
        filas = 0
        for r in leer_hoja(CRUDOS / nombre):
            filas += 1
            anio = r.get("Año", "")
            if anio not in ANIOS:
                continue
            idc = r["ID Caso"]
            if idc in ids_vistos:
                sys.exit(f"ID Caso {idc} repetido ({ids_vistos[idc]} y {nombre})")
            ids_vistos[idc] = nombre
            conteo_mod[(anio, mod)] += 1
            por_mod_anio[(mod, anio)] += 1
            if r.get("Departamento") == "HUILA":
                conteo_huila[(anio, mod)] += 1
            cod = r.get("Código DANE de Municipio", "")
            if cod not in univ:
                sin_mpio[(cod, r.get("Municipio"), r.get("Departamento"), anio)] += 1
                continue
            if cod.startswith("41") != (r.get("Departamento") == "HUILA"):
                sys.exit(f"Código {cod} no corresponde al departamento {r.get('Departamento')}")
            conteo[cod][anio] += 1
            if "Presunto Responsable" in r:
                pares = [(r.get("Presunto Responsable", ""), r.get("Descripción Presunto Responsable", ""))]
            else:
                pares = [(r.get(f"Grupo Armado {i}", ""), r.get(f"Descripción Grupo Armado {i}", ""))
                         for i in (1, 2, 3)]
            for resp, desc in pares:
                if not resp:
                    continue
                if (resp, desc) in UNIFICACION:
                    grupos.add((cod, anio, f"{resp} | {desc}", UNIFICACION[(resp, desc)]))
                elif resp in EXCLUIR_RESP or desc in EXCLUIR_DESC:
                    excluidos[f"{resp} | {desc}"] += 1
                else:
                    sys.exit(f"Responsable sin regla: {resp!r} / {desc!r} ({nombre})")
        if filas == 0:
            sys.exit(f"{nombre} vacío")

    if "--sin-verificar" not in sys.argv:
        verificar_tablero(conteo_mod, conteo_huila)
        verif = "verificado contra el tablero oficial del CNMH (mismo corte): casos por modalidad y año coinciden en Colombia y Huila"
    else:
        verif = "sin verificar contra el tablero en esta ejecución"

    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / "grupos_cnmh.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "grupo_original", "grupo"])
        w.writerows(sorted(grupos))
    with (SALIDA / "cnmh_hechos_2023_2026.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for c in codigos:
            for a in ANIOS:
                w.writerow([c, a, conteo[c][a], "", ""])

    tot = {a: sum(conteo_mod[(a, m)] for _, _, m in BASES.values()) for a in ANIOS}
    asignados = {a: sum(conteo[c][a] for c in conteo) for a in ANIOS}
    sinm = "; ".join(f"{a}: {cod} {m}/{d} ({n})" for (cod, m, d, a), n in sorted(sin_mpio.items(), key=lambda x: x[0][3]))
    desglose = "; ".join(f"{a}: " + ", ".join(f"{m.split('(')[-1].rstrip(')')} {por_mod_anio[(m, a)]}"
                                               for _, _, m in BASES.values() if por_mod_anio[(m, a)])
                         for a in ANIOS)
    meta = {
        "id": "cnmh_hechos_2023_2026",
        "etiqueta": "Hechos de violencia del conflicto (CNMH)",
        "descripcion": "Número de casos de violencia del conflicto armado registrados por el SIEVCAC del CNMH en el municipio en el año, sumando sus 11 modalidades.",
        "unidad": "casos",
        "sentido": "peor",
        "periodo": "2023-2026 (2026: enero-marzo; corte 31-mar-2026)",
        "anio_principal": "2023-2025",
        "institucion": "Centro Nacional de Memoria Histórica (CNMH) - Observatorio de Memoria y Conflicto",
        "base": "SIEVCAC, bases de casos por modalidad (AB, AS, AP, AT, DB, DF, MA, MI, RU, SE, VS), corte 31 de marzo de 2026",
        "enlace": "https://micrositios.centrodememoriahistorica.gov.co/observatorio/portal-de-datos/base-de-datos/",
        "fecha_consulta": FECHA_CONSULTA,
        "agregable": "suma",
        "factor": None,
        "nota": ("Modalidades: acciones bélicas, asesinatos selectivos, ataques a poblaciones, atentados terroristas, "
                 "daño a bienes civiles, desaparición forzada, masacres, minas/MUSE/AEI, reclutamiento y utilización de "
                 "NNA, secuestro y violencia sexual (no incluye desplazamiento forzado, que el SIEVCAC no documenta). "
                 "Un caso = un hecho, con independencia del número de víctimas. Casos por año y modalidad en Colombia: "
                 f"{desglose}. Total Colombia por año: {tot}; asignados a municipio: {asignados}. "
                 f"Casos sin municipio del universo (cuentan en Colombia pero en ningún municipio): {sinm or 'ninguno'}. "
                 "Los años recientes tienen subregistro por rezago de documentación y se actualizan en cada corte "
                 "trimestral; 2026 solo cubre enero-marzo. Cobertura nacional: municipio sin casos = 0. "
                 f"Conteos {verif}."),
        "sha256": hashes,
    }
    (SALIDA / "cnmh_hechos_2023_2026.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n",
                                                            encoding="utf-8")

    print("Total Colombia:", tot, "asignados:", asignados)
    print("Sin municipio:", dict(sin_mpio))
    print("Excluidos (menciones):", excluidos.most_common())
    print("Grupos:", Counter(g for *_, g in grupos))
    for c in ["41001", "41551", "41396", "41298", "41020"]:
        print(c, dict(conteo[c]), sorted({(a, g) for cc, a, _, g in grupos if cc == c}))
    print("Huila:", {a: sum(conteo[c][a] for c in conteo if c.startswith("41")) for a in ANIOS})


if __name__ == "__main__":
    main()
