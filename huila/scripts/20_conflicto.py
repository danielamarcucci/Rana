"""Módulo de conflicto: une los indicadores de datos/salida/conflicto/ en el
formato de la pestaña Problemas (el mismo de 06_terridata.py).

Cada indicador llega como <id>.csv (cod_divipola, anio, valor, numerador,
denominador) + <id>.meta.json, construidos por los scripts 10 a 19 desde la
fuente oficial. Aquí solo se agrega:
- Huila (41) y Colombia: suma de municipios (agregable "suma") o
  suma(numerador) / suma(denominador) × factor (agregable "tasa");
- puesto del Huila entre los 32 departamentos y Bogotá con la misma regla;
- mediana de los municipios de la región Andina;
- valores de todos los municipios del país para quintiles e histograma.

Además construye el indicador compuesto "grupos armados con presencia desde
2024": número de grupos DISTINTOS con nombre que alguna de las fuentes
grupos_*.csv ubica en el municipio desde 2024 (las categorías genéricas ya
vienen excluidas por cada script y los nombres ya vienen unificados).

También lee datos/salida/cede/ (Panel Municipal del CEDE, scripts 21 a 26), con el
tema que trae cada .meta.json.

Salida: datos/salida/conflicto_indicadores.json
"""
import csv
import json
import re
import statistics
import sys
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
D = RAIZ / "datos" / "salida"
C = D / "conflicto"
CEDE = D / "cede"
ANDINA = {"05", "11", "15", "17", "25", "41", "54", "63", "66", "68", "73"}
TEMA = "Conflicto y violencia"
# Un indicador sin dato en la mayoría de municipios del Huila en su año principal no se muestra: la fuente
# solo trae municipio-año con registro y no se imputa 0 (ver metodologia.md).
MIN_HUILA = 30
FUENTES_GRUPOS = ["sat", "pares", "cnmh", "ucdp"]


def universo():
    with (D / "poblacion_municipal_nacional.csv").open(encoding="utf-8") as f:
        return sorted({r["cod_divipola"] for r in csv.DictReader(f)})


def num(t):
    t = (t or "").strip()
    return float(t) if t else None


def mediana(vals):
    return round(statistics.median(vals), 4) if vals else None


def agregar(filas, meta, cods):
    """Valor de un conjunto de municipios para un periodo."""
    ag = meta["agregable"]
    if ag == "suma":
        vals = [filas[c][0] for c in cods if c in filas and filas[c][0] is not None]
        return round(sum(vals), 4) if vals else None
    if ag == "tasa":
        n = sum(filas[c][1] or 0 for c in cods if c in filas and filas[c][1] is not None)
        d = sum(filas[c][2] or 0 for c in cods if c in filas and filas[c][2] is not None)
        return round(n / d * meta["factor"], 4) if d else None
    return None


def construir(carpeta, ident, univ):
    meta = json.loads((carpeta / f"{ident}.meta.json").read_text("utf-8"))
    por_anio = defaultdict(dict)
    with (carpeta / f"{ident}.csv").open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            cod = r["cod_divipola"].zfill(5)
            if cod not in univ:
                sys.exit(f"{ident}: código {cod} fuera del universo DANE")
            por_anio[r["anio"]][cod] = (num(r["valor"]), num(r["numerador"]), num(r["denominador"]))
    anios = sorted(por_anio, key=lambda a: (not a.isdigit(), a))
    ultimo = meta.get("anio_principal") or anios[-1]
    if ultimo not in por_anio and re.fullmatch(r"\d{4}-\d{4}", ultimo):
        # Periodo principal = suma de los años de la serie anual (solo conteos sumables por municipio).
        a0, a1 = map(int, ultimo.split("-"))
        filas = defaultdict(lambda: (0.0, None, None))
        for a in anios:
            if a.isdigit() and a0 <= int(a) <= a1:
                for cod, (v, _, _) in por_anio[a].items():
                    if v is not None:
                        filas[cod] = (filas[cod][0] + v, None, None)
        filas = dict(filas)
        if meta["agregable"] not in ("suma", "no"):
            sys.exit(f"{ident}: periodo sumado solo para conteos")
    else:
        filas = por_anio[ultimo]
    huila = sorted(c for c in univ if c.startswith("41"))
    deps = defaultdict(list)
    for c in univ:
        deps[c[:2]].append(c)
    val_dep = {d: agregar(filas, meta, cs) for d, cs in deps.items()}
    val_dep = {d: v for d, v in val_dep.items() if v is not None}
    dep = val_dep.get("41")
    puesto = None
    if dep is not None and meta["sentido"] != "contexto":
        orden = sorted(val_dep.values(), reverse=(meta["sentido"] == "peor"))
        puesto = orden.index(dep) + 1
    nacional = {c: v[0] for c, v in filas.items() if v[0] is not None}
    serie = lambda cods: {a: agregar(por_anio[a], meta, cods) for a in anios if a.isdigit()}
    return {
        "id": ident, "tema": meta.get("tema", TEMA), "etiqueta": meta["etiqueta"], "descripcion": meta.get("descripcion", ""),
        "sentido": meta["sentido"], "ceros": False, "unidad": meta["unidad"], "agregable": meta["agregable"],
        "fuente": f"{meta['institucion']} — {meta['base']}", "fecha": meta["fecha_consulta"],
        "nota": meta.get("nota", ""), "periodo": meta.get("periodo", ""), "anio": ultimo, "huila": dep, "colombia": agregar(filas, meta, univ),
        "puesto_dep": puesto, "n_dep": len(val_dep),
        "mediana_andina": mediana([v for k, v in nacional.items() if k[:2] in ANDINA]),
        "n_andina": sum(1 for k in nacional if k[:2] in ANDINA),
        "nacional": sorted(round(v, 4) for v in nacional.values()),
        "nacional_cod": {k: round(v, 4) for k, v in nacional.items() if k.startswith("41")},
        "serie_huila": {a: v for a, v in serie(deps["41"]).items() if v is not None},
        "serie_colombia": {a: v for a, v in serie(univ).items() if v is not None},
        "serie_municipios": {c: {a: por_anio[a][c][0] for a in anios if a.isdigit() and c in por_anio[a]
                                 and por_anio[a][c][0] is not None} for c in huila},
    }


def grupos(univ):
    presentes = [f for f in FUENTES_GRUPOS if (C / f"grupos_{f}.csv").exists()]
    if not presentes:
        return None
    por_mun, fuentes_de = defaultdict(set), defaultdict(lambda: defaultdict(set))
    for fte in presentes:
        with (C / f"grupos_{fte}.csv").open(encoding="utf-8") as f:
            for r in csv.DictReader(f):
                anio = int(str(r["anio"])[:4])
                if anio < 2024:
                    continue
                cod = r["cod_divipola"].zfill(5)
                if cod not in univ:
                    sys.exit(f"grupos_{fte}: código {cod} fuera del universo")
                por_mun[cod].add(r["grupo"])
                fuentes_de[cod][r["grupo"]].add(fte)
    # "FARC disidencias (…)" sin estructura (CNMH, SAT, Pares 2019) es una etiqueta de familia, no un
    # grupo: solo cuenta si en el municipio ninguna fuente nombra una estructura disidente concreta.
    for c, g in por_mun.items():
        genericos = {x for x in g if x.startswith("FARC disidencias (")}  # CNMH, SAT y Pares 2019
        if genericos and any(x.startswith("FARC disidencias -") for x in g):
            g -= genericos
            for x in genericos:
                fuentes_de[c].pop(x, None)
        elif len(genericos) > 1:  # varias fuentes con la misma familia sin estructura: un solo grupo
            g -= genericos
            g.add("FARC disidencias (sin distinguir estructura)")
            fusion = set().union(*(fuentes_de[c].pop(x) for x in genericos))
            fuentes_de[c]["FARC disidencias (sin distinguir estructura)"] = fusion
    deps = defaultdict(set)
    for c, g in por_mun.items():
        deps[c[:2]] |= g
    dep_codes = {c[:2] for c in univ}
    val_dep = {d: len(deps.get(d, ())) for d in dep_codes}
    nacional = {c: len(por_mun.get(c, ())) for c in univ}
    huila = sorted(c for c in univ if c.startswith("41"))
    orden = sorted(val_dep.values(), reverse=True)
    nombres = {"sat": "Defensoría del Pueblo (SAT)", "pares": "Fundación Pares", "cnmh": "CNMH (SIEVCAC)",
               "ucdp": "UCDP (Universidad de Uppsala)"}
    return {
        "id": "grupos_armados_2024", "tema": TEMA, "etiqueta": "Grupos armados con presencia (desde 2024)",
        "descripcion": ("Número de grupos armados distintos, con nombre, que alguna de las fuentes ubica en el "
                        "municipio desde 2024. Se excluyen categorías genéricas y se unifican nombres escritos "
                        "de dos maneras; «disidencias FARC» sin estructura solo cuenta si ninguna fuente nombra una."),
        "sentido": "peor", "ceros": False, "unidad": "grupos armados distintos", "agregable": "grupos",
        "fuente": "Compuesto: " + ", ".join(nombres[f] for f in presentes), "fecha": "2026-10-06",
        "nota": f"Fuentes usadas: {', '.join(nombres[f] for f in presentes)}. El departamento y Colombia cuentan "
                "grupos distintos (no suman municipios).",
        "periodo": "2024-2026 (cada fuente con su corte)", "anio": "2024-2026", "huila": val_dep["41"], "colombia": len(set().union(*por_mun.values())),
        "puesto_dep": orden.index(val_dep["41"]) + 1, "n_dep": len(val_dep),
        "mediana_andina": mediana([v for k, v in nacional.items() if k[:2] in ANDINA]),
        "n_andina": sum(1 for k in nacional if k[:2] in ANDINA),
        "nacional": sorted(nacional.values()), "nacional_cod": {c: nacional[c] for c in huila},
        "serie_huila": {}, "serie_colombia": {}, "serie_municipios": {c: {} for c in huila},
        "grupos_municipio": {c: {g: sorted(fs) for g, fs in sorted(fuentes_de[c].items())} for c in huila
                             if c in fuentes_de},
    }


def main():
    univ = set(universo())
    salida, excluidos = [], []
    for meta in sorted(C.glob("*.meta.json")) + sorted(CEDE.glob("*.meta.json")):
        ident = meta.name[:-len(".meta.json")]
        x = construir(meta.parent, ident, univ)
        if len(x["nacional_cod"]) < MIN_HUILA:
            excluidos.append(f"{ident} ({len(x['nacional_cod'])} de 37 municipios del Huila con dato en {x['anio']})")
            continue
        salida.append(x)
        print(f"  {ident}: {x['anio']} · Huila {x['huila']} · Colombia {x['colombia']} · "
              f"puesto {x['puesto_dep']}/{x['n_dep']} · {len(x['nacional'])} municipios")
    if excluidos:
        print("No se muestran por cobertura insuficiente en el Huila:\n  " + "\n  ".join(excluidos))
    g = grupos(univ)
    if g:
        salida.insert(0, g)
        print(f"  grupos_armados_2024: Huila {g['huila']} · Colombia {g['colombia']} · puesto {g['puesto_dep']}")
    (D / "conflicto_indicadores.json").write_text(json.dumps(salida, ensure_ascii=False, indent=0), "utf-8")


if __name__ == "__main__":
    main()
