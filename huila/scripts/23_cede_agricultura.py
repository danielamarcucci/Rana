"""Panel Municipal del CEDE (Uniandes) — módulo Tierra y agricultura (EVA 2007-2020, crédito 2003-2021).

Fuente: CEDE, Universidad de los Andes, "Panel de agricultura y tierra", DOI
https://doi.org/10.57924/GH6KPE (licencia CC0). Archivo tabulado oficial de Dataverse
PANEL_AGRICULTURA_Y_TIERRA(2021).tab y diccionario PANEL_AGRICULTURA_Y_TIERRA(2021).pdf
(recibidos el 2026-10-06). El .tab NO se copia al repo; se lee desde CEDE_DIR (por defecto
/mnt/project-files/cede/dataverse) y se verifica su SHA-256 antes de usarlo.

Contenido real del módulo (diccionario y .tab): para ~285 cultivos, área cosechada (ac_),
área sembrada (as_), producción (p_) y rendimiento (r_) de las Evaluaciones Agropecuarias
Municipales (EVA, MinAgricultura), 2007-2020; y número (nuf_) y valor (vrf_) de créditos
agropecuarios por tipo de beneficiario (FINAGRO, publicado en Agronet), 2003-2021. NO trae
variables de tierra (formalidad, Gini de tierras, UAF, tamaño predial): no se construyen.

Criterio de selección (el Huila es cafetero, arrocero y cacaotero):
- Rendimiento (t/ha) de café y cacao (variables r_ del panel) y de arroz (construido:
  producción / área cosechada sumando arroz de riego, secano manual y secano mecanizado).
- Peso de café, cacao, arroz y cultivos de pancoger en el área cosechada agrícola total
  del municipio (suma de todas las variables ac_ con dato).
- Crédito agropecuario FINAGRO normalizado: valor por habitante, valor promedio por
  crédito y participación de pequeños productores en el valor colocado.
- Descartados: áreas y producciones en hectáreas/toneladas brutas (reflejan tamaño); área
  sembrada vs cosechada (en cultivos permanentes el área sembrada incluye lotes aún no
  productivos); número de créditos por categoría (bruto); crédito a mujer rural (el diccionario
  lo da solo para 2000-2013 y en el .tab es casi siempre 0).
- Duplicados: ninguno con el tablero. "Peso de las actividades primarias" (va_primarias,
  TerriData) mide valor agregado de todo el sector primario, no áreas de cultivo: no es la
  misma medida.

Definición de pancoger (clasificación del proyecto, NO del CEDE ni de la EVA): cultivos de
alimentos básicos de consumo del hogar: plátano (sin plátano de exportación), yuca (sin
yuca industrial), maíz tradicional, frijol (todas las variedades del panel), arracacha,
ñame (todas), malanga, ahuyama y batata. Variables: ver PANCOGER abajo.

Decisiones:
- Valor faltante = celda vacía. NO se convierte en 0: un municipio sin registro de café en la
  EVA queda sin dato en las variables de café (no 0). Las participaciones se calculan solo si
  el municipio tiene el cultivo registrado y un área total > 0.
- Área total cosechada = suma de las variables ac_ con dato del municipio-año. En 2020 la
  EVA desagregó aguacate, cítricos, mango, piña, papaya, naranja, limón y mandarina en
  variedades nuevas (las variables antiguas terminan en 2019), así que no hay doble conteo.
- Crédito: el panel llena con 0 todos los años de una categoría en la que el municipio tuvo
  algún crédito y deja vacío si nunca lo tuvo; el total por municipio-año es la suma de las
  categorías con dato (una categoría vacía no aporta). Si todas están vacías no hay dato.
  19 filas del .tab sin código de municipio (créditos 2003-2021 no asignados a un municipio)
  se ignoran y se reportan. Valores en millones de pesos corrientes (total nacional 2020:
  24,2 billones, del orden de las colocaciones anuales publicadas por FINAGRO).
- Denominador de los valores por habitante: población DANE base CNPV 2018 —
  retro_pobl_tot del módulo Características generales del Panel (DOI
  https://doi.org/10.57924/IX38JI) hasta 2017 y poblacion_municipal_nacional.csv del proyecto
  desde 2018. Neiva: retro 2017 = 352.999; DANE 2018 = 357.376.
- Solo se escriben códigos del universo DANE (1.123 municipios).

Salidas: datos/salida/cede/cede_agr_*.csv (+ .meta.json).
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

TAB = "PANEL_AGRICULTURA_Y_TIERRA(2021).tab"
TAB_POB = "PANEL_CARACTERISTICAS_GENERALES(2021).tab"
SHA = {
    TAB: "9eca1556ed1527b3ccc616c0347e76f896244821ba699bfd8d003ac0d0e5f9ac",
    TAB_POB: "c4d9275b4c80c97236fce4f00bb58c1bb7096b3444975edc8a3e47ce22b5ffc1",
}
DOI = "https://doi.org/10.57924/GH6KPE"
DOI_POB = "https://doi.org/10.57924/IX38JI"
FECHA = "2026-10-06"
INST = "CEDE, Universidad de los Andes — Panel Municipal"
SHA_POB_DANE = "poblacion_municipal_nacional.csv"

ARROZ = ["arrozr", "arrozsm", "arrozsme"]
PANCOGER = ["platano", "yuca", "maiztr", "frijol", "frijola", "frijoll", "frijolp", "frijolv",
            "arracacha", "name", "named", "namee", "malanga", "ahuyama", "batata"]
# Categorías de crédito de pequeño productor (p.p.) y poblaciones con activos aún menores
# (mujer rural y jóvenes rurales: activos <= 70 % de los de pequeño productor, Anexo 2).
PEQUENOS = ["peq_productor", "agrem_peq_productor", "desplazados_pp", "victimas_conflicto_pp",
            "desarrollo_alt_pp", "microempresario_peq", "mujer_rural", "jovenes_rurales"]


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


def leer_tab(p, columnas=None):
    """{(cod, anio): {col: valor|None}}; columnas=None lee todas."""
    datos = {}
    sin_cod = []
    with open(p, encoding="utf-8", errors="replace", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            cols = columnas or [c for c in row if c not in ("codmpio", "ano")]
            if not row["codmpio"] or not row["ano"]:
                sin_cod.append(row)
                continue
            datos[(cod5(row["codmpio"]), int(float(row["ano"])))] = {c: num(row[c]) for c in cols}
    return datos, sin_cod


def poblacion(pp):
    d, _ = leer_tab(pp, ["retro_pobl_tot"])
    pob = {k: v["retro_pobl_tot"] for k, v in d.items() if v["retro_pobl_tot"] and k[1] <= 2017}
    universo = set()
    with open(UNIVERSO, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            universo.add(r["cod_divipola"])
            pob[(r["cod_divipola"], int(r["anio"]))] = float(r["poblacion"])
    return pob, universo


def fmt(v, nd=4):
    if v is None:
        return ""
    if float(v).is_integer():
        return str(int(v))
    return f"{round(v, nd)}"


def escribir(ind, filas, universo, fuera):
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
    sha = {k: SHA[k] for k in ind.get("archivos", [TAB])}
    if ind.get("pob_dane"):
        sha[SHA_POB_DANE] = sha256(UNIVERSO)
    meta.update({"institucion": INST, "base": ind["base"], "enlace": DOI, "fecha_consulta": FECHA,
                 "agregable": ind["agregable"], "factor": ind["factor"], "nota": ind["nota"],
                 "sha256": sha})
    with open(SALIDA / f"{ind['id']}.meta.json", "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    ap = int(ind["anio_principal"])
    del_ap = [f for f in ok if f[1] == ap]
    huila = {f[0]: f[2] for f in del_ap if f[0].startswith("41")}
    falt = sorted(c for c in universo if c.startswith("41") and c not in huila)
    vals = [f[2] for f in ok]
    anios = sorted({f[1] for f in ok})
    print(f"{ind['id']}: {len(ok)} filas, años {anios[0]}-{anios[-1]} ({len(anios)}), "
          f"{len(del_ap)} municipios en {ap}; rango {min(vals):.3f}-{max(vals):.3f}; "
          f"Huila {len(huila)}/37 en {ap}, Neiva={huila.get('41001')}, "
          f"Pitalito={huila.get('41551')}, Campoalegre={huila.get('41132')}"
          + (f"; faltan Huila: {falt}" if falt else ""))
    return ok


def main():
    p = verificar(TAB)
    pp = verificar(TAB_POB)
    d, sin_cod = leer_tab(p)
    pob, universo = poblacion(pp)
    fuera = defaultdict(set)
    columnas = next(iter(d.values())).keys()
    AC = [c for c in columnas if c.startswith("ac_")]
    VRF = [c for c in columnas if c.startswith("vrf_")]
    NUF = [c for c in columnas if c.startswith("nuf_")]
    cred_sin_cod = sum(sum(num(r[c]) or 0 for c in VRF) for r in sin_cod)
    print(f"{len(sin_cod)} filas sin código de municipio; crédito no asignado: {cred_sin_cod:,.1f} millones")

    def suma(v, cols):
        xs = [v[c] for c in cols if v.get(c) is not None]
        return sum(xs) if xs else None

    def directo(var, anios):
        return [(c, a, v[var], None, None) for (c, a), v in d.items()
                if v[var] is not None and a in anios]

    def razon(f_num, f_den, anios, factor=1.0):
        out = []
        for (c, a), v in d.items():
            if a not in anios:
                continue
            n, den = f_num(c, a, v), f_den(c, a, v)
            if n is None or not den:
                continue
            out.append((c, a, n / den * factor, n, den))
        return out

    EVA = set(range(2007, 2021))
    CRED = set(range(2003, 2022))
    total_ac = lambda c, a, v: suma(v, AC)
    nota_part = (" Construido: área cosechada del cultivo / suma del área cosechada de todos los cultivos "
                 "con dato del municipio (variables ac_) × 100. Solo municipios con el cultivo registrado en "
                 "la EVA (sin registro = sin dato, no 0). Área cosechada de transitorios asociada al semestre de "
                 "siembra (Anexo 1 del diccionario). No incluye pastos ni bosques. 2020: el área total nacional "
                 "baja de 4,75 a 4,25 millones de ha frente a 2019; tómese con cautela. Un agregado departamental (suma de numeradores / suma de denominadores) solo incluye los municipios con el cultivo, por lo que sobrestima levemente el peso del cultivo en el departamento.")
    base_pob = (" Denominador: población total DANE base CNPV 2018 — retro_pobl_tot del módulo Características "
                "generales del Panel CEDE (" + DOI_POB + ") hasta 2017 y proyecciones DANE 2018-2030 del "
                "proyecto (poblacion_municipal_nacional.csv) desde 2018.")
    nota_cred = (" Fuente original FINAGRO (cartera de crédito agropecuario por tipo de beneficiario, publicada "
                 "en Agronet). El diccionario indica disponibilidad 2000-2020; el .tab trae 2003-2021. Total = "
                 "suma de las 27 categorías vrf_ con dato (el panel deja vacía una categoría en la que el "
                 "municipio nunca tuvo crédito y pone 0 en los demás años). Incluye crédito agrícola y pecuario, "
                 "capital de trabajo, inversión y normalización; se asigna al municipio que registra FINAGRO. "
                 "19 filas del .tab sin código de municipio (créditos no asignados) quedan fuera.")

    inds = [
        dict(id="cede_agr_rend_cafe", tema="Tierra y agricultura", etiqueta="Rendimiento del café",
             descripcion="Toneladas de café producidas por hectárea cosechada en el año.",
             unidad="t/ha", sentido="mejor", periodo="2007-2020", anio_principal="2020",
             base="Tierra y agricultura (variable r_cafe; fuente original EVA - MinAgricultura)",
             agregable="no", factor=None,
             nota="Variable del panel tal como viene (producción / área cosechada). El diccionario no precisa el estado del grano (pergamino o verde). Hay 11 valores mayores a 4 t/ha (casi todos de Cundinamarca en 2008, hasta 10,7) que se dejan tal como vienen y conviene leer como dudosos. Total nacional de producción en el panel 2019: 885.120 t (≈14,75 millones de sacos de 60 kg), consistente con la cosecha publicada por la FNC. Municipios sin café registrado quedan sin dato.",
             filas=directo("r_cafe", EVA)),
        dict(id="cede_agr_rend_cacao", tema="Tierra y agricultura", etiqueta="Rendimiento del cacao",
             descripcion="Toneladas de cacao producidas por hectárea cosechada en el año.",
             unidad="t/ha", sentido="mejor", periodo="2007-2020", anio_principal="2020",
             base="Tierra y agricultura (variable r_cacao; fuente original EVA - MinAgricultura)",
             agregable="no", factor=None,
             nota="Variable del panel tal como viene (producción / área cosechada). Municipios sin cacao registrado quedan sin dato.",
             filas=directo("r_cacao", EVA)),
        dict(id="cede_agr_rend_arroz", tema="Tierra y agricultura", etiqueta="Rendimiento del arroz",
             descripcion="Toneladas de arroz producidas por hectárea cosechada (riego, secano manual y secano mecanizado juntos).",
             unidad="t/ha", sentido="mejor", periodo="2007-2020", anio_principal="2020",
             base="Tierra y agricultura (variables p_arrozr, p_arrozsm, p_arrozsme, ac_arrozr, ac_arrozsm, ac_arrozsme; fuente original EVA - MinAgricultura)",
             agregable="tasa", factor=1,
             nota="Construido: (p_arrozr + p_arrozsm + p_arrozsme) / (ac_arrozr + ac_arrozsm + ac_arrozsme), sumando solo los sistemas con dato. Numerador en toneladas, denominador en hectáreas cosechadas. En el Huila todo el arroz registrado es de riego (18 municipios en 2020); el de riego rinde más que el de secano, así que la comparación nacional mezcla sistemas.",
             filas=razon(lambda c, a, v: suma(v, ["p_" + x for x in ARROZ]),
                         lambda c, a, v: suma(v, ["ac_" + x for x in ARROZ]), EVA)),
        dict(id="cede_agr_part_cafe", tema="Tierra y agricultura", etiqueta="Peso del café en el área cosechada",
             descripcion="Porcentaje del área agrícola cosechada del municipio que corresponde a café.",
             unidad="% del área cosechada", sentido="contexto", periodo="2007-2020", anio_principal="2020",
             base="Tierra y agricultura (variables ac_cafe y ac_* de todos los cultivos; fuente original EVA - MinAgricultura)",
             agregable="tasa", factor=100, nota=nota_part,
             filas=razon(lambda c, a, v: v["ac_cafe"], total_ac, EVA, 100)),
        dict(id="cede_agr_part_cacao", tema="Tierra y agricultura", etiqueta="Peso del cacao en el área cosechada",
             descripcion="Porcentaje del área agrícola cosechada del municipio que corresponde a cacao.",
             unidad="% del área cosechada", sentido="contexto", periodo="2007-2020", anio_principal="2020",
             base="Tierra y agricultura (variables ac_cacao y ac_* de todos los cultivos; fuente original EVA - MinAgricultura)",
             agregable="tasa", factor=100, nota=nota_part,
             filas=razon(lambda c, a, v: v["ac_cacao"], total_ac, EVA, 100)),
        dict(id="cede_agr_part_arroz", tema="Tierra y agricultura", etiqueta="Peso del arroz en el área cosechada",
             descripcion="Porcentaje del área agrícola cosechada del municipio que corresponde a arroz (riego y secano).",
             unidad="% del área cosechada", sentido="contexto", periodo="2007-2020", anio_principal="2020",
             base="Tierra y agricultura (variables ac_arrozr, ac_arrozsm, ac_arrozsme y ac_* de todos los cultivos; fuente original EVA - MinAgricultura)",
             agregable="tasa", factor=100, nota=nota_part,
             filas=razon(lambda c, a, v: suma(v, ["ac_" + x for x in ARROZ]), total_ac, EVA, 100)),
        dict(id="cede_agr_part_pancoger", tema="Tierra y agricultura", etiqueta="Peso de los cultivos de pancoger",
             descripcion="Porcentaje del área agrícola cosechada del municipio en cultivos de alimentos básicos de consumo del hogar (plátano, yuca, maíz tradicional, frijol, arracacha, ñame, malanga, ahuyama y batata).",
             unidad="% del área cosechada", sentido="contexto", periodo="2007-2020", anio_principal="2020",
             base="Tierra y agricultura (variables ac_platano, ac_yuca, ac_maiztr, ac_frijol*, ac_arracacha, ac_name*, ac_malanga, ac_ahuyama, ac_batata y ac_* de todos los cultivos; fuente original EVA - MinAgricultura)",
             agregable="tasa", factor=100,
             nota="La lista de cultivos de pancoger es una clasificación del proyecto, no del CEDE ni de la EVA: " + ", ".join("ac_" + x for x in PANCOGER) + ". Excluye plátano de exportación (ac_platanoe), yuca industrial (ac_yucai), maíz tecnificado y forrajero, y papa. La EVA no distingue si la producción se vende o se consume en el hogar." + nota_part,
             filas=razon(lambda c, a, v: suma(v, ["ac_" + x for x in PANCOGER]), total_ac, EVA, 100)),
        dict(id="cede_agr_credito_pc", tema="Tierra y agricultura", etiqueta="Crédito agropecuario por habitante",
             descripcion="Valor total de los créditos agropecuarios registrados por FINAGRO en el municipio durante el año, por habitante.",
             unidad="pesos corrientes por habitante", sentido="contexto", periodo="2003-2021", anio_principal="2021",
             base="Tierra y agricultura (variables vrf_* de las 27 categorías de beneficiario; fuente original FINAGRO / Agronet)",
             agregable="tasa", factor=1, archivos=[TAB, TAB_POB], pob_dane=True,
             nota="Construido: suma de vrf_* (millones de pesos) × 1.000.000 / población total. Pesos corrientes (sin deflactar). Se normaliza por población total porque el panel no trae número de productores ni población rural para todos los años." + nota_cred + base_pob,
             filas=razon(lambda c, a, v: (lambda s: s * 1e6 if s is not None else None)(suma(v, VRF)),
                         lambda c, a, v: pob.get((c, a)), CRED)),
        dict(id="cede_agr_credito_promedio", tema="Tierra y agricultura", etiqueta="Valor promedio por crédito agropecuario",
             descripcion="Valor promedio de cada crédito agropecuario registrado por FINAGRO en el municipio durante el año.",
             unidad="millones de pesos corrientes por crédito", sentido="contexto", periodo="2003-2021", anio_principal="2021",
             base="Tierra y agricultura (variables vrf_* y nuf_* de las 27 categorías de beneficiario; fuente original FINAGRO / Agronet)",
             agregable="tasa", factor=1,
             nota="Construido: suma de vrf_* (millones de pesos) / suma de nuf_* (número de créditos). Un promedio alto puede reflejar pocos créditos grandes de medianos y grandes productores." + nota_cred,
             filas=razon(lambda c, a, v: suma(v, VRF), lambda c, a, v: suma(v, NUF), CRED)),
        dict(id="cede_agr_credito_pequenos", tema="Tierra y agricultura", etiqueta="Participación de pequeños productores en el crédito",
             descripcion="Porcentaje del valor del crédito agropecuario FINAGRO del municipio colocado en pequeños productores (todas las líneas de pequeño productor, mujer rural y jóvenes rurales).",
             unidad="% del valor del crédito", sentido="mejor", periodo="2003-2021", anio_principal="2021",
             base="Tierra y agricultura (variables " + ", ".join("vrf_" + x for x in PEQUENOS) + " sobre vrf_* total; fuente original FINAGRO / Agronet)",
             agregable="tasa", factor=100,
             nota="Construido: suma de " + ", ".join("vrf_" + x for x in PEQUENOS) + " / suma de todas las vrf_* × 100. Mujer rural y jóvenes rurales se incluyen porque su definición (Anexo 2 del diccionario) exige activos de hasta 70 % de los de pequeño productor. La definición legal de pequeño productor cambió (Decreto 1071 de 2015, modificado por el 691 de 2018). Sentido 'mejor' en cuanto mide acceso de pequeños productores al crédito formal; no evalúa la calidad del crédito." + nota_cred,
             filas=razon(lambda c, a, v: (suma(v, ["vrf_" + x for x in PEQUENOS]) or 0.0) if suma(v, VRF) else None,
                         lambda c, a, v: suma(v, VRF), CRED, 100)),
    ]
    for ind in inds:
        escribir(ind, ind.pop("filas"), universo, fuera)
    for k, v in fuera.items():
        print(f"  {k}: {len(v)} códigos fuera del universo DANE: {sorted(v)[:10]}")


if __name__ == "__main__":
    main()
