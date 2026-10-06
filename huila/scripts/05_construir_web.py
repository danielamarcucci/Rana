"""Construye web/datos/tablero.js a partir de los datos ya validados.

Solo lee archivos de datos/salida, datos/crudos (sin modificarlos), datos/geo
y datos/catalogos. Genera además datos/salida/indicadores_municipio.csv, la
tabla larga de todos los indicadores que usa el módulo de Indicadores.

El JS resultante asigna window.TABLERO para que la app funcione abriendo
index.html directamente, sin servidor.
"""
import csv
import json
import math
import re
import unicodedata
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
D = RAIZ / "datos"
GEO = D / "crudos" / "dane" / "geoportal"

CNPV = "DANE, Censo Nacional de Población y Vivienda 2018 (Geoportal DANE)"
PROY = "DANE, proyecciones municipales de población 2018-2042 (act. 30-jul-2025)"
MINDEF = "MinDefensa / Policía Nacional (datos.gov.co, dataset {ds}) y proyección DANE de población"

# id, tema, nombre, unidad, archivo crudo, campo(s), lectura, nota
INDICADORES_DANE = [
    ("envejecimiento", "Población", "Índice de envejecimiento (60+ por cada 100 menores de 15)", "índice", "indice_envejecimiento_2018", "CL0_INDENVJ60MAS", "neutro", 2018),
    ("juventud", "Población", "Índice de juventud (% de 14 a 26 años)", "%", "indice_juventud_2018", "CL0_INDJUVT", "neutro", 2018),
    ("dependencia65", "Población", "Dependencia demográfica 65+ (%)", "%", "dependencia_65mas_2018", "CL0_INDDEPDC_65MAS", "neutro", 2018),
    ("indigena", "Población", "Población que se reconoce indígena", "%", "grupos_etnicos_2018", "PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_1", "neutro", 2018),
    ("afro", "Población", "Población que se reconoce negra, afrocolombiana, raizal o palenquera", "%", "grupos_etnicos_2018", "PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_5", "neutro", 2018),
    ("ipm", "Pobreza", "Índice de pobreza multidimensional (IPM)", "% personas", "ipm_2018", "IPM", "peor", 2018),
    ("nbi", "Pobreza", "Personas con necesidades básicas insatisfechas (NBI)", "% personas", "nbi_2018", "NBIC_Total_Prop_de_Personas_en_NBIPorc", "peor", 2018),
    ("miseria", "Pobreza", "Personas en miseria (2+ NBI)", "% personas", "miseria_2018", "NBIC_Total_Prop_de_Personas_en_miseria", "peor", 2018),
    ("inasistencia", "Educación", "NBI por inasistencia escolar (niños 6-12 sin asistir)", "% personas", "nbi_inasistencia_escolar_2018", "NBIC_Total_PP_Comp_Inasistencia", "peor", 2018),
    ("alcantarillado", "Vivienda y servicios", "Viviendas con alcantarillado", "% viviendas", "cobertura_alcantarillado_2018", "CL0_AL_PP1", "mejor", 2018),
    ("energia", "Vivienda y servicios", "Viviendas con energía eléctrica", "% viviendas", "cobertura_energia_2018", "CL0_EE_PP1", "mejor", 2018),
    ("gas", "Vivienda y servicios", "Viviendas con gas natural", "% viviendas", "cobertura_gas_2018", "CL0_GA_PP1", "mejor", 2018),
    ("internet", "Vivienda y servicios", "Viviendas con internet", "% viviendas", "cobertura_internet_2018", "CL0_IN_PP1", "mejor", 2018),
    ("deficit", "Vivienda y servicios", "Hogares en déficit habitacional", "% hogares", "deficit_habitacional_2018", "PC_dvhabitat", "peor", 2018),
    ("deficit_cuanti", "Vivienda y servicios", "Hogares en déficit cuantitativo de vivienda", "% hogares", "deficit_cuantitativo_2018", "PC_dvcuanti", "peor", 2018),
    ("deficit_cuali", "Vivienda y servicios", "Hogares en déficit cualitativo de vivienda", "% hogares", "deficit_cualitativo_2018", "PC_dvcuali", "peor", 2018),
]
DELITOS = [
    ("homicidio", "Homicidios", "m8fd-ahd9"),
    ("violencia_intrafamiliar", "Violencia intrafamiliar", "gepp-dxcs"),
    ("lesiones_personales", "Lesiones personales", "jr6v-i33g"),
]
ANIO_DELITOS = 2025  # último año completo publicado


def leer_csv(ruta):
    with open(ruta, encoding="utf-8") as f:
        return list(csv.DictReader(f))


def capa(ident):
    datos = json.loads((GEO / f"{ident}.json").read_text("utf-8"))
    out = {}
    for ft in datos["features"]:
        a = ft["attributes"]
        cod = a.get("MPIO_CCDGO") or a.get("U_MPIO")
        out[cod] = a
    return out


def indicadores(munis):
    filas = []

    def agregar(ident, tema, nombre, unidad, valores, lectura, anio, fuente, nota=""):
        assert set(valores) == set(munis), ident
        for cod, v in valores.items():
            filas.append({"id": ident, "tema": tema, "indicador": nombre, "unidad": unidad,
                          "anio": anio, "lectura": lectura, "fuente": fuente, "nota": nota,
                          "cod_divipola": cod, "municipio": munis[cod],
                          "valor": None if v is None else round(v, 3)})

    pob = defaultdict(dict)
    for r in leer_csv(D / "salida" / "poblacion_proyeccion_municipio.csv"):
        pob[int(r["anio"])][r["cod_divipola"]] = int(r["poblacion"])
    agregar("poblacion", "Población", "Población proyectada 2026", "personas",
            pob[2026], "neutro", 2026, PROY)

    total = capa("poblacion_total_2018")
    rural = capa("poblacion_rural_disperso_2018")
    agregar("rural", "Población", "Población en rural disperso (censada)", "%",
            {c: 100 * rural[c]["CL3_TT_PERSN"] / total[c]["CL0_TT_PERSN"] for c in munis},
            "neutro", 2018, CNPV, "Cálculo propio: personas en rural disperso / total de personas censadas.")

    for ident, tema, nombre, unidad, archivo, campo, lectura, anio in INDICADORES_DANE:
        c = capa(archivo)
        agregar(ident, tema, nombre, unidad, {k: c[k][campo] for k in munis}, lectura, anio, CNPV)

    acu = capa("cobertura_acueducto_2018")
    agregar("acueducto", "Vivienda y servicios", "Viviendas con acueducto", "% viviendas",
            {c: 100 * acu[c]["CL0_AC_TU1"] / (acu[c]["CL0_AC_TU1"] + acu[c]["CL0_AC_TU2"]) for c in munis},
            "mejor", 2018, CNPV, "Cálculo propio: viviendas con acueducto / (con + sin acueducto). La capa de porcentaje no está publicada para acueducto.")

    casos = defaultdict(lambda: defaultdict(int))
    for r in leer_csv(D / "salida" / "seguridad_delitos_municipio_anio.csv"):
        if int(r["anio"]) == ANIO_DELITOS:
            casos[r["delito"]][r["cod_divipola"]] += int(r["casos"])
    for ident, nombre, ds in DELITOS:
        agregar(f"tasa_{ident}", "Seguridad", f"{nombre} por 100.000 habitantes ({ANIO_DELITOS})",
                "por 100 mil hab.",
                {c: 1e5 * casos[ident].get(c, 0) / pob[ANIO_DELITOS][c] for c in munis},
                "peor", ANIO_DELITOS, MINDEF.format(ds=ds),
                "Municipio sin registros en el año = 0 casos. Tasa con la proyección DANE del mismo año.")
    return filas


def proyectar(geojson):
    """Proyección equirectangular simple centrada en el Huila -> paths SVG."""
    feats = geojson["features"]
    lat0 = math.radians(2.5)
    k = math.cos(lat0)

    def anillos(g):
        if g["type"] == "Polygon":
            return [g["coordinates"]]
        return g["coordinates"]

    xs, ys = [], []
    for f in feats:
        for poly in anillos(f["geometry"]):
            for ring in poly:
                for lon, lat in ring:
                    xs.append(lon * k)
                    ys.append(-lat)
    minx, maxx, miny, maxy = min(xs), max(xs), min(ys), max(ys)
    ancho = 520
    esc = ancho / (maxx - minx)
    alto = (maxy - miny) * esc
    out = {}
    for f in feats:
        partes, cx, cy, n = [], 0, 0, 0
        for poly in anillos(f["geometry"]):
            for ring in poly:
                pts = [((lon * k - minx) * esc, (-lat - miny) * esc) for lon, lat in ring]
                partes.append("M" + "L".join(f"{x:.1f},{y:.1f}" for x, y in pts) + "Z")
                for x, y in pts:
                    cx += x
                    cy += y
                    n += 1
        out[f["properties"]["MPIO_CDPMP"]] = {"d": "".join(partes), "cx": round(cx / n, 1), "cy": round(cy / n, 1)}
    return out, ancho, round(alto, 1)


def electoral(munis):
    res = {}
    for anio in (2019, 2023):
        corps = defaultdict(lambda: defaultdict(lambda: {"cand": defaultdict(int), "part": defaultdict(int),
                                                          "blanco": 0, "nulos": 0, "no_marcados": 0}))
        nombres_cand = {}
        for r in leer_csv(D / "salida" / f"territoriales_{anio}_municipio_candidato.csv"):
            m = corps[r["corporacion"]][r["cod_divipola"]]
            v = int(r["votos"])
            cc = r["cod_candidato"]
            if cc == "00996":
                m["blanco"] += v
            elif cc == "00997":
                m["nulos"] += v
            elif cc == "00998":
                m["no_marcados"] += v
            else:
                m["part"][r["partido"]] += v
                if r["corporacion"] in ("GOBERNADOR", "ALCALDE") and cc != "00000":
                    key = f"{r['candidato']}|{r['partido']}"
                    m["cand"][key] += v
        res[anio] = {}
        for corp, porm in corps.items():
            res[anio][corp] = {}
            for cod, m in porm.items():
                validos = sum(m["part"].values()) + m["blanco"]
                ent = {"validos": validos, "blanco": m["blanco"], "nulos": m["nulos"],
                       "no_marcados": m["no_marcados"],
                       "total": validos + m["nulos"] + m["no_marcados"],
                       "partidos": dict(sorted(m["part"].items(), key=lambda x: -x[1]))}
                if m["cand"]:
                    ent["candidatos"] = dict(sorted(m["cand"].items(), key=lambda x: -x[1]))
                res[anio][corp][cod] = ent
            assert set(res[anio][corp]) == set(munis), (anio, corp)
    return res


def unidad_corta(u):
    if u.startswith("Porcentaje"):
        return "%"
    return {"Tasa por cada 100.000 habitantes": "por cada 100.000 habitantes", "Hab/Km2": "habitantes por km²",
            "Personas": "personas", "Puntos": "puntos", "Pesos corrientes": "pesos corrientes"}.get(u, u[:1].lower() + u[1:])


def redondear(v):
    if v is None:
        return None
    return round(v, 2) if abs(v) < 1000 else round(v)


def problemas():
    """Indicadores TerriData (06) + capas CNPV nacionales (07), listos para la web."""
    fecha_td = max(r["fecha_verificacion"] for r in leer_csv(D / "crudos" / "terridata" / "manifiesto.csv"))
    lista = [{**x, "fecha": fecha_td} for x in json.loads((D / "salida" / "terridata_indicadores.json").read_text("utf-8"))]
    fecha_cnpv = max(r["fecha_consulta"] for r in leer_csv(D / "crudos" / "dane" / "geoportal_nacional" / "manifiesto.csv"))
    lista += [{**x, "fecha": fecha_cnpv} for x in json.loads((D / "salida" / "dane_cnpv_nacional.json").read_text("utf-8"))]
    # Conflicto (fuentes 10-19) y Panel Municipal del CEDE (21-26), unidos por 20_conflicto.py
    lista += json.loads((D / "salida" / "conflicto_indicadores.json").read_text("utf-8"))
    out = []
    for x in lista:
        r = lambda d: {k: redondear(v) for k, v in d.items()}
        out.append({
            "id": x["id"], "tema": x["tema"], "etiqueta": x["etiqueta"], "sentido": x["sentido"],
            "ceros": x["ceros"], "unidad": unidad_corta(x["unidad"]), "fuente": x["fuente"],
            "nota": x.get("nota", ""), "descripcion": x.get("descripcion", ""), "fecha": x.get("fecha", ""),
            "periodo": x.get("periodo", ""), "agregable": x.get("agregable", ""), "anio": x["anio"], "huila": redondear(x["huila"]),
            "colombia": redondear(x["colombia"]), "puesto_dep": x["puesto_dep"], "n_dep": x["n_dep"],
            "mediana_andina": redondear(x["mediana_andina"]), "n_andina": x["n_andina"],
            "nacional": [redondear(v) for v in x["nacional"]], "municipios": r(x["nacional_cod"]),
            "serie_huila": r(x["serie_huila"]), "serie_colombia": r(x["serie_colombia"]),
            "serie_municipios": {k: r(v) for k, v in x["serie_municipios"].items()},
            **({"grupos_municipio": x["grupos_municipio"]} if "grupos_municipio" in x else {}),
        })
    return out


CORP_NOMBRE = {"GOBERNADOR": "Gobernación", "ASAMBLEA": "Asamblea", "ALCALDE": "Alcaldías", "CONCEJO": "Concejos",
               "CAMARA": "Cámara", "SENADO": "Senado", "PRESIDENTE 1V": "Presidencia 1.ª vuelta",
               "PRESIDENTE 2V": "Presidencia 2.ª vuelta"}
ORDEN_CORP = list(CORP_NOMBRE)


def familia(nombre, alias):
    s = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode().upper()
    s = re.sub(r"\s+", " ", re.sub(r"[^A-Z0-9 ]", " ", s)).strip()
    s = re.sub(r"^(PARTIDO POLITICO|PARTIDO|MOVIMIENTO POLITICO|MOVIMIENTO|COALICION) ", "", s)
    return alias.get(s, s)


def transferencia(munis):
    """Votos por partido (familia de nombres) y municipio en las 18 elecciones de 08_otras_elecciones.py."""
    alias = {r["nombre_normalizado"]: r["familia"] for r in leer_csv(D / "catalogos" / "partidos_alias.csv")}
    validos = defaultdict(lambda: defaultdict(int))
    fam_votos = defaultdict(lambda: defaultdict(lambda: defaultdict(int)))
    fam_nombres = defaultdict(lambda: defaultdict(int))
    pres = defaultdict(lambda: defaultdict(int))
    meta = {}
    for r in leer_csv(D / "salida" / "elecciones_huila_municipio.csv"):
        e, cod, op, v = r["eleccion"], r["cod_divipola"], r["opcion"], int(r["votos"])
        meta[e] = (int(r["anio"]), r["corporacion"])
        if op in ("__NULOS__", "__NO_MARCADOS__"):
            continue
        validos[e][cod] += v
        if op == "__BLANCO__":
            continue
        partido = op.split("|")[-1]
        f = familia(partido, alias)
        fam_votos[f][e][cod] += v
        fam_nombres[f][partido.strip()] += v
        if r["corporacion"].startswith("PRESIDENTE"):
            pres[(e, op.split("|")[0])][cod] += v
    orden = sorted(meta, key=lambda e: (meta[e][0], ORDEN_CORP.index(meta[e][1])))
    elecciones = [{"id": e, "anio": meta[e][0], "corp": meta[e][1],
                   "nombre": f"{CORP_NOMBRE[meta[e][1]]} {meta[e][0]}"} for e in orden]
    partidos = {}
    for f, porel in fam_votos.items():
        total = sum(sum(x.values()) for x in porel.values())
        if len(porel) < 2 or total < 5000:
            continue  # partidos de una sola elección o muy pequeños: no hay trayectoria que seguir
        partidos[f] = {"etiqueta": max(fam_nombres[f].items(), key=lambda x: x[1])[0], "total": total,
                       "votos": {e: dict(x) for e, x in porel.items()},
                       "nombres": sorted(fam_nombres[f])}
    presidenciales = []
    for (e, cand), x in pres.items():
        tot = sum(x.values())
        if tot / sum(validos[e].values()) >= 0.03:
            presidenciales.append({"id": f"{e}|{cand}", "eleccion": e, "candidato": cand, "votos": dict(x)})
    presidenciales.sort(key=lambda p: (p["eleccion"], -sum(p["votos"].values())))
    for e in validos:
        assert set(validos[e]) == set(munis), e
    return {"elecciones": elecciones, "validos": {e: dict(x) for e, x in validos.items()},
            "partidos": dict(sorted(partidos.items(), key=lambda x: -x[1]["total"])),
            "presidenciales": presidenciales}


def main():
    cat = leer_csv(D / "catalogos" / "homologacion_registraduria_divipola_huila.csv")
    munis = {r["cod_divipola"]: r["municipio"] for r in cat}
    subregion = {r["cod_divipola"]: r["subregion"] for r in leer_csv(D / "catalogos" / "subregiones_huila.csv")}
    assert set(subregion) == set(munis)

    # Tabla larga de los indicadores DANE/MinDefensa del Huila (primera versión del módulo de indicadores).
    filas = indicadores(munis)
    with (D / "salida" / "indicadores_municipio.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)

    geo = json.loads((D / "geo" / "mgn2025_municipios_huila_simplificado.geojson").read_text("utf-8"))
    paths, ancho, alto = proyectar(geo)
    assert set(paths) == set(munis)

    tablero = {
        "generado": "scripts/05_construir_web.py",
        "mapa": {"ancho": ancho, "alto": alto},
        "municipios": [{"cod": c, "nombre": munis[c], "subregion": subregion[c], **paths[c]} for c in sorted(munis)],
        "indicadores": problemas(),
        "electoral": electoral(munis),
        "transferencia": transferencia(munis),
    }
    salida = RAIZ / "web" / "datos" / "tablero.js"
    salida.write_text("window.TABLERO = " + json.dumps(tablero, ensure_ascii=False, separators=(",", ":")) + ";\n", "utf-8")
    print(f"OK {salida.relative_to(RAIZ)}: {salida.stat().st_size / 1024:.0f} KB, {len(tablero['indicadores'])} indicadores")


if __name__ == "__main__":
    main()
