"""Panel Municipal del CEDE (Uniandes) — módulo Buen gobierno (finanzas y desempeño, 1984-2020).

Fuente: CEDE, Universidad de los Andes, "Panel de buen gobierno", DOI
https://doi.org/10.57924/JS7H35 (licencia CC0). Archivo tabulado oficial de Dataverse
PANEL_BUEN_GOBIERNO(2021).tab y diccionario PANEL_BUEN_GOBIERNO(2021).pdf (recibidos el
2026-10-06). El .tab NO se copia al repo; se lee desde CEDE_DIR (por defecto
/mnt/project-files/cede/dataverse) y se verifica su SHA-256 antes de usarlo.

Denominador de los valores per cápita: población total DANE con base CNPV 2018, en dos
tramos de la MISMA base censal:
- 1993-2017: retro_pobl_tot (retroproyecciones DANE, CNPV 2018) del módulo Características
  generales del mismo Panel (DOI https://doi.org/10.57924/IX38JI);
- 2018 en adelante: datos/salida/poblacion_municipal_nacional.csv del proyecto (proyecciones
  DANE 2018-2030, el universo de 1.123 municipios).
Chequeo de continuidad: Neiva retro_pobl_tot 2017 = 352.999; DANE 2018 = 357.376.

Criterio de selección (nada fiscal está todavía en el tablero; lista de duplicados revisada):
- Índices oficiales del DNP / Procuraduría, ya normalizados (0-100 o %): desempeño fiscal
  (DF_desemp_fisc) y cuatro de sus componentes que describen problemas concretos
  (dependencia de transferencias, generación de ingresos propios, peso del funcionamiento
  sobre ingresos de libre destinación —Ley 617—), desempeño integral
  (DI_desemp_int, 2005-2017, descontinuado), Medición de Desempeño Municipal (MDM,
  2016-2020, su reemplazo) e Índice de Gobierno Abierto (IGA_total).
- Montos fiscales normalizados por habitante: ingresos tributarios, predial, inversión
  (gastos de capital), transferencias SGP y asignaciones SGR.
- Descartados: conteos/montos brutos sin normalizar; posiciones (DF_p_nal, DF_p_dep,
  MDM_puesto_tot: dependen del número de municipios evaluados); subcomponentes del MDM y
  del IGA (el tablero muestra el índice; los componentes están en el .tab); DF_gast_inv
  (casi constante: mediana 85-90 %); DF_deuda; DF_ahorro (desde 2009 no hay valores
  negativos y aparecen ceros, mientras que antes sí hay negativos: tratamiento distinto dentro
  de la serie que el diccionario no explica); inversión sectorial inv_* (solo 2000-2010);
  regalías directas SRA* (régimen anterior, hasta 2006/2016); indesarrollo_* (2000-2010).

Cambios de metodología respetados (no se unen series distintas en un indicador):
- DF_ing_propios: en 2000-2009 el panel trae tributarios / ingresos TOTALES (se reproduce
  con y_corr_tribut / y_total en el 100 % de los municipios) y desde 2011 tributarios /
  ingresos CORRIENTES, que es la definición del Anexo 1 del diccionario. Se publica solo
  2010-2020 (2010 no se reproduce exactamente con ninguna de las dos fórmulas pero está en la
  escala nueva: mediana 54,7 vs 8,6 en 2009).
- IDF: este archivo solo trae la metodología anterior del DNP (DF_*, 2000-2020). La
  metodología nueva del IDF (vigencias 2020 en adelante; DF2_nuevoidf en otras versiones del
  panel) NO está en el archivo oficial de Dataverse 2021, así que no se mezcla ni se aproxima.
- IGA: el diccionario señala cambio de metodología en 2016 (dimensión Diálogo de la
  información); se publica 2010-2015.
- DI (desempeño integral) y MDM son índices distintos: van en indicadores separados.
- SGR: el diccionario dice que cada dato corresponde al año indicado y el siguiente (bienio
  presupuestal). Se publican 2013, 2015, 2017 y 2019 (bienios) y se excluye 2012 (primer año
  del SGR, presupuesto de un solo año: mezclaría duraciones distintas).

Otras decisiones:
- Valor faltante = celda vacía. No se convierte en 0.
- Montos fiscales (y_*, g_*) en millones de pesos corrientes -> pesos por habitante. SGP en
  pesos corrientes (diccionario). SGR: el diccionario no indica la unidad; por magnitud son
  pesos (Neiva 2019-2020: 31.660 millones), y así se documenta en la nota.
- Registros "sin reporte": filas con y_total, g_total o g_cap = 0 (p. ej. Neiva 2004 g_cap=0
  y sin IDF). Se excluyen de los per cápita fiscales (y_*, g_*), no se tratan como 0 reales.
- Solo se escriben códigos del universo DANE (1.123 municipios).

Salidas: datos/salida/cede/cede_bg_*.csv (+ .meta.json).
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

TAB = "PANEL_BUEN_GOBIERNO(2021).tab"
TAB_POB = "PANEL_CARACTERISTICAS_GENERALES(2021).tab"
SHA = {
    TAB: "3c59001051f5df79adf2cebeb8db4e874470cd32c3bbbcc01486d393312d9e88",
    TAB_POB: "c4d9275b4c80c97236fce4f00bb58c1bb7096b3444975edc8a3e47ce22b5ffc1",
}
DOI = "https://doi.org/10.57924/JS7H35"
DOI_POB = "https://doi.org/10.57924/IX38JI"
FECHA = "2026-10-06"
INST = "CEDE, Universidad de los Andes — Panel Municipal"
SHA_POB_DANE = "poblacion_municipal_nacional.csv"


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
    datos = {}
    sin_cod = 0
    with open(p, encoding="utf-8", errors="replace", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if not row["codmpio"] or not row["ano"]:
                sin_cod += 1
                continue
            datos[(cod5(row["codmpio"]), int(float(row["ano"])))] = {c: num(row[c]) for c in columnas}
    if sin_cod:
        print(f"{p.name}: {sin_cod} filas sin código de municipio (ignoradas)")
    return datos


def poblacion(pp):
    """{(cod, anio): población} — retro_pobl_tot (<=2017) + DANE 2018-2030 del proyecto."""
    pob = {k: v["retro_pobl_tot"] for k, v in leer_tab(pp, ["retro_pobl_tot"]).items()
           if v["retro_pobl_tot"] and k[1] <= 2017}
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
          f"Pitalito={huila.get('41551')}, La Plata={huila.get('41396')}"
          + (f"; faltan Huila: {falt}" if falt else ""))
    return ok


def main():
    p = verificar(TAB)
    pp = verificar(TAB_POB)
    cols = ["y_total", "g_total", "g_cap", "y_corr_tribut", "y_corr_tribut_predial",
            "DF_desemp_fisc", "DF_ing_trans", "DF_ing_propios", "DF_ing_func",
            "DI_desemp_int", "MDM", "IGA_total", "SGP_total", "SGR_total"]
    d = leer_tab(p, cols)
    pob, universo = poblacion(pp)
    fuera = defaultdict(set)
    sin_reporte = sorted(k for k, v in d.items()
                         if v["y_total"] is not None and k[1] >= 2000
                         and (v["y_total"] == 0 or v["g_total"] == 0 or v["g_cap"] == 0))
    print(f"Registros fiscales 'sin reporte' (y_total, g_total o g_cap = 0) desde 2000: {len(sin_reporte)}"
          f"; Huila: {[k for k in sin_reporte if k[0].startswith('41')]}")
    sin_rep = set(sin_reporte)

    def directo(var, anios):
        return [(c, a, v[var], None, None) for (c, a), v in d.items()
                if v[var] is not None and a in anios]

    def per_capita(var, anios, escala, fiscal=True):
        out = []
        for (c, a), v in d.items():
            n = v[var]
            if n is None or a not in anios or (fiscal and (c, a) in sin_rep):
                continue
            den = pob.get((c, a))
            if not den:
                continue
            n_pesos = n * escala
            out.append((c, a, n_pesos / den, n_pesos, den))
        return out

    A = lambda a, b: set(range(a, b + 1))
    base_pob = (" Denominador: población total DANE base CNPV 2018 — retro_pobl_tot del módulo "
                "Características generales del Panel CEDE (" + DOI_POB + ") hasta 2017 y proyecciones "
                "DANE 2018-2030 del proyecto (poblacion_municipal_nacional.csv) desde 2018.")
    corrientes = (" Pesos CORRIENTES de cada año (sin deflactar): sirve para comparar municipios en un "
                  "mismo año; la evolución en el tiempo incluye inflación.")
    sin_rep_txt = (" Se excluyen los registros sin reporte fiscal (ingresos totales, gasto total o gasto de "
                   "capital = 0 en el panel).")
    df_txt = ("Componente del Índice de Desempeño Fiscal del DNP (metodología anterior, la única en "
              "este archivo).")
    inds = [
        dict(id="cede_bg_idf", tema="Buen gobierno", etiqueta="Índice de desempeño fiscal (DNP)",
             descripcion="Índice sintético del DNP (0 a 100) que resume solvencia, autofinanciación del funcionamiento, dependencia de transferencias, esfuerzo tributario, inversión, respaldo de la deuda y ahorro corriente del municipio. Más alto = mejor desempeño fiscal.",
             unidad="puntos (0-100)", sentido="mejor", periodo="2000-2020", anio_principal="2020",
             base="Buen gobierno (variable DF_desemp_fisc; fuente original DNP, evaluación de desempeño fiscal)",
             agregable="no", factor=None,
             nota="Metodología ANTERIOR del IDF del DNP (seis componentes, Anexo 1 del diccionario). La metodología nueva del DNP (desde la vigencia 2020) no está en el archivo oficial de Dataverse 2021, por lo que no se une con ella; el valor 2020 aquí está en la escala anterior (mediana nacional 67,3 vs 69,5 en 2019). El componente de ingresos propios cambió de denominador en el panel en 2010 (ver cede_bg_ingresos_propios): comparar con cautela antes y después de 2010. 2000-2002 con menor cobertura (955-1.021 municipios). Hay 31 valores iguales a 0 (2005, 2010 y 2011), muy por debajo del resto (mínimo de los demás alrededor de 11); se dejan tal como vienen y conviene leerlos como dato dudoso.",
             filas=directo("DF_desemp_fisc", A(2000, 2020))),
        dict(id="cede_bg_dependencia_transf", tema="Buen gobierno", etiqueta="Dependencia de transferencias y regalías",
             descripcion="Porcentaje de los ingresos totales del municipio que proviene de transferencias de la Nación y regalías (sin cofinanciación). Por encima de 60 % el municipio financia sus gastos principalmente con esos recursos.",
             unidad="% de los ingresos totales", sentido="peor", periodo="2000-2020", anio_principal="2020",
             base="Buen gobierno (variable DF_ing_trans; fuente original DNP, evaluación de desempeño fiscal)",
             agregable="no", factor=None,
             nota=df_txt + " Umbral de referencia del DNP: 60 %. La subida de 2020 (mediana 79 % vs 72 % en 2019) coincide con el año de la pandemia; es dato, no se interpreta causalmente. Hay 18 valores iguales a 0 (16 en 2011), que se dejan tal como vienen.",
             filas=directo("DF_ing_trans", A(2000, 2020))),
        dict(id="cede_bg_ingresos_propios", tema="Buen gobierno", etiqueta="Generación de ingresos propios",
             descripcion="Peso de los ingresos tributarios dentro de los ingresos corrientes del municipio (esfuerzo fiscal propio).",
             unidad="% de los ingresos corrientes", sentido="mejor", periodo="2010-2020", anio_principal="2020",
             base="Buen gobierno (variable DF_ing_propios; fuente original DNP, evaluación de desempeño fiscal)",
             agregable="no", factor=None,
             nota=df_txt + " Serie cortada en 2010: en 2000-2009 el panel trae tributarios / ingresos TOTALES (se verificó con y_corr_tribut / y_total) y desde 2011 tributarios / ingresos CORRIENTES (definición del diccionario); no se unen. 2010 no se reproduce exactamente con los componentes del panel pero está en la escala nueva. Hay 25 valores iguales a 0 (17 en 2011), que se dejan tal como vienen.",
             filas=directo("DF_ing_propios", A(2010, 2020))),
        dict(id="cede_bg_funcionamiento", tema="Buen gobierno", etiqueta="Ingresos de libre destinación usados en funcionamiento",
             descripcion="Porcentaje de los ingresos corrientes de libre destinación que se va en gastos de funcionamiento (nómina y gastos generales de la administración central). La Ley 617 de 2000 fija un tope según la categoría del municipio (80 % en categorías 4 a 6).",
             unidad="% de los ICLD", sentido="peor", periodo="2000-2020", anio_principal="2020",
             base="Buen gobierno (variable DF_ing_func; fuente original DNP, evaluación de desempeño fiscal)",
             agregable="no", factor=None,
             nota=df_txt + " Valores mayores a 100 % significan que el funcionamiento supera los ingresos de libre destinación. Hay valores extremos aislados (p. ej. 58.300 % en un municipio en 2015) que se dejan tal como vienen; el tablero debe usar quintiles o medianas. El tope de la Ley 617 depende de la categoría (variable categoria del panel); el diccionario no trae el tope por municipio. Hay 40 valores iguales a 0 (34 en 2011), que se dejan tal como vienen.",
             filas=directo("DF_ing_func", A(2000, 2020))),
        dict(id="cede_bg_desempeno_integral", tema="Buen gobierno", etiqueta="Índice de desempeño integral (DNP, hasta 2017)",
             descripcion="Índice del DNP (0 a 100) que evaluaba la gestión municipal en eficacia (metas del plan de desarrollo), eficiencia (educación, salud, agua), cumplimiento de requisitos legales del SGP y capacidad administrativa.",
             unidad="puntos (0-100)", sentido="mejor", periodo="2005-2017", anio_principal="2017",
             base="Buen gobierno (variable DI_desemp_int; fuente original DNP, evaluación de desempeño integral)",
             agregable="no", factor=None,
             nota="Medición descontinuada: el DNP la reemplazó por la Medición de Desempeño Municipal (MDM, ver cede_bg_mdm); son índices distintos y no se unen. Algunos municipios tienen valores muy bajos (0-20) cuando no reportaron información al DNP.",
             filas=directo("DI_desemp_int", A(2005, 2017))),
        dict(id="cede_bg_mdm", tema="Buen gobierno", etiqueta="Medición de Desempeño Municipal (MDM)",
             descripcion="Puntaje del DNP que combina la gestión de la administración (movilización de recursos propios, ejecución, gobierno abierto, ordenamiento territorial) con el cambio en resultados de educación, salud, servicios públicos y seguridad.",
             unidad="puntos (0-100)", sentido="mejor", periodo="2016-2020", anio_principal="2020",
             base="Buen gobierno (variable MDM; fuente original DNP, Medición de Desempeño Municipal)",
             agregable="no", factor=None,
             nota="El DNP compara el MDM dentro de grupos de municipios con capacidades iniciales similares (variable MDM_grupocap del panel); entre grupos distintos la comparación es solo referencial. Reemplaza al desempeño integral (cede_bg_desempeno_integral).",
             filas=directo("MDM", A(2016, 2020))),
        dict(id="cede_bg_gobierno_abierto", tema="Buen gobierno", etiqueta="Índice de Gobierno Abierto (Procuraduría)",
             descripcion="Índice de la Procuraduría General de la Nación (0 a 100) sobre organización de la información (control interno, gestión documental), exposición (contratación, reportes a sistemas nacionales) y diálogo con la ciudadanía (gobierno en línea, rendición de cuentas, atención al ciudadano).",
             unidad="puntos (0-100)", sentido="mejor", periodo="2010-2015", anio_principal="2015",
             base="Buen gobierno (variable IGA_total; fuente original Procuraduría General de la Nación)",
             agregable="no", factor=None,
             nota="Se excluye 2016 porque el diccionario señala cambio de metodología ese año. Entre 2010 y 2015 algunos subcomponentes también cambiaron (p. ej. procesos actualizados 2010-2013 vs plan anual de adquisiciones 2014-2015); la mediana nacional sube de 52 (2010-2011) a 69 (2012). Mide cumplimiento de reportes y normas, no corrupción.",
             filas=directo("IGA_total", A(2010, 2015))),
        dict(id="cede_bg_tributarios_pc", tema="Buen gobierno", etiqueta="Ingresos tributarios por habitante",
             descripcion="Recaudo de impuestos municipales (predial, industria y comercio, sobretasa a la gasolina y otros) por habitante.",
             unidad="pesos corrientes por habitante", sentido="mejor", periodo="2000-2020", anio_principal="2020",
             base="Buen gobierno (variable y_corr_tribut; fuente original DNP, ejecuciones presupuestales)",
             agregable="tasa", factor=1, archivos=[TAB, TAB_POB], pob_dane=True,
             nota="Construido: y_corr_tribut (millones de pesos) × 1.000.000 / población. Numerador en pesos." + corrientes + sin_rep_txt + base_pob,
             filas=per_capita("y_corr_tribut", A(2000, 2020), 1e6)),
        dict(id="cede_bg_predial_pc", tema="Buen gobierno", etiqueta="Recaudo de impuesto predial por habitante",
             descripcion="Recaudo del impuesto predial unificado (tributo municipal a la propiedad de inmuebles) por habitante.",
             unidad="pesos corrientes por habitante", sentido="contexto", periodo="2000-2020", anio_principal="2020",
             base="Buen gobierno (variable y_corr_tribut_predial; fuente original DNP, ejecuciones presupuestales)",
             agregable="tasa", factor=1, archivos=[TAB, TAB_POB], pob_dane=True,
             nota="Construido: y_corr_tribut_predial (millones de pesos) × 1.000.000 / población. Depende del avalúo catastral, la actualización del catastro y la tarifa, no solo de la gestión de cobro; por eso sentido 'contexto'." + corrientes + sin_rep_txt + base_pob,
             filas=per_capita("y_corr_tribut_predial", A(2000, 2020), 1e6)),
        dict(id="cede_bg_inversion_pc", tema="Buen gobierno", etiqueta="Inversión pública municipal por habitante",
             descripcion="Gastos de capital (inversión: formación bruta de capital fijo e inversión social, como nómina de maestros y médicos, subsidios y dotaciones) del municipio por habitante.",
             unidad="pesos corrientes por habitante", sentido="contexto", periodo="2000-2020", anio_principal="2020",
             base="Buen gobierno (variable g_cap; fuente original DNP, ejecuciones presupuestales)",
             agregable="tasa", factor=1, archivos=[TAB, TAB_POB], pob_dane=True,
             nota="Construido: g_cap (millones de pesos) × 1.000.000 / población. Incluye inversión financiada con SGP; no incluye proyectos del SGR (que tienen presupuesto aparte). Más inversión por habitante no implica mejores resultados." + corrientes + sin_rep_txt + base_pob,
             filas=per_capita("g_cap", A(2000, 2020), 1e6)),
        dict(id="cede_bg_sgp_pc", tema="Buen gobierno", etiqueta="Transferencias SGP por habitante",
             descripcion="Recursos del Sistema General de Participaciones (educación, salud, agua potable, propósito general y asignaciones especiales) asignados al municipio, por habitante.",
             unidad="pesos corrientes por habitante", sentido="contexto", periodo="2002-2020", anio_principal="2020",
             base="Buen gobierno (variable SGP_total; fuente original DNP, distribución del SGP)",
             agregable="tasa", factor=1, archivos=[TAB, TAB_POB], pob_dane=True,
             nota="Construido: SGP_total (pesos corrientes, según el diccionario) / población. La participación de educación para prestación del servicio solo llega a los municipios certificados en educación (en los demás la recibe el departamento), así que los certificados tienen montos por habitante mayores sin que eso indique mayor esfuerzo. 2002 es el primer año del SGP y en algunos municipios es mucho menor que 2003 (Neiva: 24.548 vs 91.133 millones); compárese con cautela." + corrientes + base_pob,
             filas=per_capita("SGP_total", A(2002, 2020), 1, fiscal=False)),
        dict(id="cede_bg_regalias_sgr_pc", tema="Buen gobierno", etiqueta="Asignaciones del SGR por habitante (bienio)",
             descripcion="Recursos del Sistema General de Regalías asignados al municipio en el bienio presupuestal (asignaciones directas, fondos de compensación y desarrollo regional, ciencia y tecnología, ahorro), por habitante.",
             unidad="pesos corrientes por habitante por bienio", sentido="contexto", periodo="2013-2019 (bienios)", anio_principal="2019",
             base="Buen gobierno (variable SGR_total; fuente original DNP, Sistema General de Regalías)",
             agregable="tasa", factor=1, archivos=[TAB, TAB_POB], pob_dane=True,
             nota="Construido: SGR_total / población del primer año del bienio. Según el diccionario cada dato corresponde al año indicado y el siguiente: 2013 = 2013-2014, 2015 = 2015-2016, 2017 = 2017-2018, 2019 = 2019-2020. Se excluye 2012 (primer año del SGR, de un solo año). El diccionario no indica la unidad; por su magnitud son pesos (Neiva 2019-2020: 31.660 millones). Son asignaciones presupuestales, no giros ni ejecución." + base_pob,
             filas=per_capita("SGR_total", {2013, 2015, 2017, 2019}, 1, fiscal=False)),
    ]
    for ind in inds:
        escribir(ind, ind.pop("filas"), universo, fuera)
    for k, v in fuera.items():
        print(f"  {k}: {len(v)} códigos fuera del universo DANE: {sorted(v)[:10]}")


if __name__ == "__main__":
    main()
