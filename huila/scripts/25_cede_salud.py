"""Panel Municipal del CEDE (Uniandes) — módulo Salud y servicios públicos (2004-2018).

Fuente: CEDE, Universidad de los Andes, "Panel de salud y servicios públicos",
DOI https://doi.org/10.57924/RASU99 (licencia CC0). Archivo tabulado oficial de
Dataverse PANEL_SALUD_Y_SERVICIOS.tab y diccionario
PANEL_SALUD_Y_SERVICIOS_20042018.pdf (recibidos el 2026-10-06). El .tab NO se
copia al repo; se lee desde CEDE_DIR (por defecto /mnt/project-files/cede/dataverse)
y se verifica su SHA-256 antes de usarlo.

Denominador de las tasas construidas: población total retroproyectada por el
DANE con base en el CNPV 2018 (variable retro_pobl_tot, 1993-2017) del módulo
Características generales del mismo Panel (DOI https://doi.org/10.57924/IX38JI),
porque la serie DANE 2018-2030 del proyecto (poblacion_municipal_nacional.csv)
no cubre 1998-2016. Chequeo: Neiva retro_pobl_tot 2017 = 352.999 vs DANE 2018 =
357.376 (misma base censal, serie continua).

Criterio de selección (8-15 indicadores que agreguen información nueva al tablero):
- Se eligen medidas comparables entre municipios (tasas, porcentajes, índices).
- NO se incluyen (ya están en el tablero con la misma medida, desde TerriData):
  cober_subsidiado (régimen subsidiado), TMI / defun_menores (mortalidad
  infantil), naci_bajopeso (bajo peso al nacer), tacued / talcan / taseo
  (cobertura total de acueducto, alcantarillado y aseo).
- Tampoco: coberturas urbanas (turbacued, turbalcan, turbaseo: casi idénticas a
  la total en la mayoría de municipios; lo nuevo es la brecha rural), conteos
  brutos de usuarios de energía o gas, régimen especial, "catastro" (definición
  ambigua en el diccionario), defun_ninez (no hay población de 1-4 años en el
  panel para volverla tasa), usuarios ZNI (0 en todo el Huila).
- Elegidos (10): afiliación al contributivo, sedes de prestadores públicos por
  10.000 hab, natalidad bruta, mortalidad bruta, acueducto rural, alcantarillado
  rural, índice de cobertura eléctrica total y rural, usuarios eléctricos
  subnormales, cobertura efectiva de gas natural.

Decisiones:
- Valor faltante = celda vacía en el .tab. NO se convierte en 0 (el diccionario
  no dice que ausente = 0). Ej.: gas natural solo tiene dato en 26 municipios
  del Huila; los demás quedan sin fila.
- Tasas: se omiten municipio-años con retro_pobl_tot = 0 o vacía (años previos a la
  creación del municipio, p. ej. Zona Bananera 1998-1999).
- Solo se escriben códigos del universo DANE (1.123 municipios de
  poblacion_municipal_nacional.csv). Los códigos fuera del universo (xx000 de
  departamento, xx999 "sin información", etc.) se cuentan y se imprimen.
- Las series de este módulo no tienen cambios de metodología señalados en el
  diccionario, salvo el régimen subsidiado (excluido por duplicado).

Salidas: datos/salida/cede/cede_sal_*.csv (+ .meta.json).
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

TAB = "PANEL_SALUD_Y_SERVICIOS.tab"
TAB_POB = "PANEL_CARACTERISTICAS_GENERALES(2021).tab"
SHA = {
    TAB: "563cd7570ca7ae4eb1bc85690c60343c1ecf29480eb530f61087f0e647306f5f",
    TAB_POB: "c4d9275b4c80c97236fce4f00bb58c1bb7096b3444975edc8a3e47ce22b5ffc1",
}
DOI = "https://doi.org/10.57924/RASU99"
DOI_POB = "https://doi.org/10.57924/IX38JI"
FECHA = "2026-10-06"
INST = "CEDE, Universidad de los Andes — Panel Municipal"


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
    """Devuelve {(cod, anio): {col: valor|None}} y contador de códigos fuera del universo."""
    datos = {}
    with open(p, encoding="utf-8", errors="replace", newline="") as f:
        for row in csv.DictReader(f, delimiter="\t"):
            if not row["codmpio"] or not row["ano"]:
                continue
            datos[(cod5(row["codmpio"]), int(float(row["ano"])))] = {c: num(row[c]) for c in columnas}
    return datos


def fmt(v, nd=4):
    if v is None:
        return ""
    if float(v).is_integer():
        return str(int(v))
    return f"{round(v, nd)}"


def escribir(ind, filas, universo, fuera):
    """filas: lista (cod, anio, valor, num, den). Escribe CSV y meta, imprime validación."""
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
    meta.update({"institucion": INST, "base": ind["base"], "enlace": DOI, "fecha_consulta": FECHA,
                 "agregable": ind["agregable"], "factor": ind["factor"], "nota": ind["nota"],
                 "sha256": {k: SHA[k] for k in ind.get("archivos", [TAB])}})
    with open(SALIDA / f"{ind['id']}.meta.json", "w", encoding="utf-8") as fh:
        json.dump(meta, fh, ensure_ascii=False, indent=2)
        fh.write("\n")
    # Validación
    ap = int(ind["anio_principal"])
    del_ap = [f for f in ok if f[1] == ap]
    huila = {f[0]: f[2] for f in del_ap if f[0].startswith("41")}
    falt = sorted(c for c in universo if c.startswith("41") and c not in huila)
    vals = [f[2] for f in ok]
    anios = sorted({f[1] for f in ok})
    print(f"{ind['id']}: {len(ok)} filas, años {anios[0]}-{anios[-1]} ({len(anios)}), "
          f"{len(del_ap)} municipios en {ap}; rango {min(vals):.3f}-{max(vals):.3f}; "
          f"Huila {len(huila)}/37 en {ap}, Neiva={huila.get('41001')}"
          + (f"; faltan Huila: {falt}" if falt else ""))
    return ok


def main():
    universo = set()
    with open(UNIVERSO, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            universo.add(r["cod_divipola"])
    p = verificar(TAB)
    pp = verificar(TAB_POB)
    cols = ["contributivo", "sedes", "nacimientos", "defunciones", "truracued", "truralcan",
            "icee_tot", "icee_resto", "uee_subn_sin", "tot_uee", "cob_gres_efec"]
    d = leer_tab(p, cols)
    pob = {k: v["retro_pobl_tot"] for k, v in leer_tab(pp, ["retro_pobl_tot"]).items()
           if v["retro_pobl_tot"]}
    fuera = defaultdict(set)

    def tasa(var, factor, anios=None):
        out = []
        for (c, a), v in d.items():
            n = v[var]
            if n is None or (anios and a not in anios):
                continue
            den = pob.get((c, a))
            if not den:
                continue
            out.append((c, a, n / den * factor, n, den))
        return out

    def directo(var, anios=None):
        return [(c, a, v[var], None, None) for (c, a), v in d.items()
                if v[var] is not None and (not anios or a in anios)]

    base_pob = (" Denominador: retro_pobl_tot (población total retroproyectada DANE, base CNPV 2018) "
                "del módulo Características generales del Panel CEDE (" + DOI_POB + ").")
    gas_mal = [f[2] for f in directo("cob_gres_efec") if f[2] > 100]
    assert not any(f[0].startswith("41") and f[2] > 100 for f in directo("cob_gres_efec"))
    inds = [
        dict(id="cede_sal_contributivo", tema="Salud", etiqueta="Afiliación al régimen contributivo",
             descripcion="Personas afiliadas al régimen contributivo de salud por cada 100 habitantes del municipio.",
             unidad="% de la población", sentido="mejor", periodo="2009-2016", anio_principal="2016",
             base="Salud y servicios (variable contributivo; fuente original CEDE con base en los cubos BDUA - MinSalud)",
             agregable="tasa", factor=100, archivos=[TAB, TAB_POB],
             nota="Tasa construida: contributivo / retro_pobl_tot × 100." + base_pob +
                  " La afiliación se registra en el municipio de afiliación de la BDUA, que puede no coincidir con el de residencia: 5 filas municipio-año superan 100 % (máximo Agua de Dios 2009, 361 %; ninguna del Huila) y se publican tal cual. Complementa (no duplica) la cobertura del régimen subsidiado de TerriData.",
             filas=tasa("contributivo", 100)),
        dict(id="cede_sal_sedes_publicas", tema="Salud", etiqueta="Sedes de prestadores públicos de salud por 10.000 hab.",
             descripcion="Número de sedes de prestadoras públicas de servicios de salud registradas en el REPS por cada 10.000 habitantes.",
             unidad="sedes por 10.000 hab.", sentido="contexto", periodo="2010-2016", anio_principal="2016",
             base="Salud y servicios (variable sedes; fuente original REPS - MinSalud)",
             agregable="tasa", factor=10000, archivos=[TAB, TAB_POB],
             nota="Tasa construida: sedes / retro_pobl_tot × 10.000." + base_pob +
                  " Según el diccionario cuenta sedes de prestadoras de servicio de salud PÚBLICA (red pública), no la oferta privada; por eso Neiva tiene pocas sedes. Las cifras saltan entre años en algunos municipios (Neiva 29 en 2013 y 12 en 2014). Los municipios pequeños tienden a tener tasas altas por escala; se marca como contexto, no para ranking.",
             filas=tasa("sedes", 10000)),
        dict(id="cede_sal_natalidad", tema="Salud", etiqueta="Tasa bruta de natalidad",
             descripcion="Nacidos vivos de madres residentes en el municipio por cada 1.000 habitantes.",
             unidad="nacimientos por 1.000 hab.", sentido="contexto", periodo="1998-2015", anio_principal="2015",
             base="Salud y servicios (variable nacimientos; fuente original Estadísticas vitales DANE)",
             agregable="tasa", factor=1000, archivos=[TAB, TAB_POB],
             nota="Tasa construida: nacimientos (lugar de residencia de la madre) / retro_pobl_tot × 1.000." + base_pob +
                  " Depende de la estructura de edad; el registro de nacimientos puede ser incompleto en municipios apartados.",
             filas=tasa("nacimientos", 1000)),
        dict(id="cede_sal_mortalidad_bruta", tema="Salud", etiqueta="Tasa bruta de mortalidad",
             descripcion="Defunciones de residentes en el municipio por cada 1.000 habitantes (todas las edades y causas).",
             unidad="defunciones por 1.000 hab.", sentido="contexto", periodo="1998-2015", anio_principal="2015",
             base="Salud y servicios (variable defunciones; fuente original Estadísticas vitales DANE)",
             agregable="tasa", factor=1000, archivos=[TAB, TAB_POB],
             nota="Tasa construida: defunciones (municipio de residencia) / retro_pobl_tot × 1.000." + base_pob +
                  " Tasa bruta: no está ajustada por edad, así que municipios con población más envejecida muestran tasas más altas sin que eso indique peor salud. Posible subregistro de defunciones en zonas apartadas.",
             filas=tasa("defunciones", 1000)),
        dict(id="cede_sal_acueducto_rural", tema="Educación y servicios", etiqueta="Cobertura de acueducto rural",
             descripcion="Cobertura del servicio de acueducto en el área rural del municipio, según el SUI.",
             unidad="%", sentido="mejor", periodo="2005, 2008-2016", anio_principal="2016",
             base="Salud y servicios (variable truracued; fuente original Sistema Único de Información de Servicios Públicos - SUI)",
             agregable="no", factor=None,
             nota="Valor tal como lo publica el panel. El diccionario aclara que acueducto no equivale a agua potable. Sin dato para 2006-2007. La cobertura total de acueducto ya está en el tablero (TerriData); este indicador aporta la brecha rural.",
             filas=directo("truracued")),
        dict(id="cede_sal_alcantarillado_rural", tema="Educación y servicios", etiqueta="Cobertura de alcantarillado rural",
             descripcion="Cobertura del servicio de alcantarillado en el área rural del municipio, según el SUI.",
             unidad="%", sentido="mejor", periodo="2005, 2008-2016", anio_principal="2016",
             base="Salud y servicios (variable truralcan; fuente original Sistema Único de Información de Servicios Públicos - SUI)",
             agregable="no", factor=None,
             nota="Valor tal como lo publica el panel. Sin dato para 2006-2007. La cobertura total de alcantarillado ya está en el tablero (TerriData); este indicador aporta la brecha rural.",
             filas=directo("truralcan")),
        dict(id="cede_sal_energia", tema="Educación y servicios", etiqueta="Cobertura de energía eléctrica (ICEE)",
             descripcion="Índice de cobertura del servicio de energía eléctrica del municipio (cabecera y resto) estimado por la UPME.",
             unidad="%", sentido="mejor", periodo="2011-2015", anio_principal="2015",
             base="Salud y servicios (variable icee_tot; fuente original Unidad de Planeación Minero Energética - UPME)",
             agregable="no", factor=None,
             nota="Índice tal como lo publica el panel. En muchos municipios el valor se repite entre años consecutivos (p. ej. Neiva 2012=2013 y 2014=2015), lo que sugiere que la UPME no lo actualizó cada año: no leer esas repeticiones como estancamiento real.",
             filas=directo("icee_tot")),
        dict(id="cede_sal_energia_rural", tema="Educación y servicios", etiqueta="Cobertura de energía eléctrica rural (ICEE resto)",
             descripcion="Índice de cobertura del servicio de energía eléctrica fuera de la cabecera municipal (resto), estimado por la UPME.",
             unidad="%", sentido="mejor", periodo="2011-2015", anio_principal="2015",
             base="Salud y servicios (variable icee_resto; fuente original Unidad de Planeación Minero Energética - UPME)",
             agregable="no", factor=None,
             nota="Índice tal como lo publica el panel. Igual que el total, se repite entre años consecutivos en muchos municipios.",
             filas=directo("icee_resto")),
        dict(id="cede_sal_energia_subnormal", tema="Educación y servicios", etiqueta="Usuarios de energía subnormales",
             descripcion="Porcentaje del total de usuarios de energía eléctrica del municipio que son usuarios subnormales conectados al Sistema Interconectado Nacional (conexiones en asentamientos subnormales).",
             unidad="% de usuarios", sentido="peor", periodo="2011-2015", anio_principal="2015",
             base="Salud y servicios (variables uee_subn_sin y tot_uee; fuente original UPME)",
             agregable="tasa", factor=100,
             nota="Porcentaje construido: uee_subn_sin / tot_uee × 100 (ambas del panel). Se usa tot_uee y no ueetot_sin porque el panel cambia la contabilidad: en 2011-2013 tot_uee = ueetot_sin + ueetot_zni + uee_subn_sin (ueetot_sin excluye a los subnormales) y en 2014-2015 tot_uee = ueetot_sin + ueetot_zni (los incluye); ambas identidades se verificaron fila a fila, y con tot_uee el cociente mide lo mismo en los dos tramos. Los valores se repiten entre años consecutivos en muchos municipios (misma observación que el ICEE). Algunos municipios del Magdalena muestran porcentajes cercanos a 100 en 2011-2013 por cómo la UPME clasificó a sus usuarios; se publican tal cual.",
             filas=[(c, a, v["uee_subn_sin"] / v["tot_uee"] * 100, v["uee_subn_sin"], v["tot_uee"])
                    for (c, a), v in d.items()
                    if v["uee_subn_sin"] is not None and v["tot_uee"]]),
        dict(id="cede_sal_gas_natural", tema="Educación y servicios", etiqueta="Cobertura efectiva de gas natural",
             descripcion="Porcentaje de viviendas del municipio que usan el servicio de gas natural por red (usuarios conectados sobre viviendas).",
             unidad="% de viviendas", sentido="mejor", periodo="2006-2016", anio_principal="2016",
             base="Salud y servicios (variable cob_gres_efec; fuente original Ministerio de Minas y Energía)",
             agregable="no", factor=None,
             nota="Valor tal como lo publica el panel, salvo que se EXCLUYEN las filas con valor > 100 (" + str(len(gas_mal)) + " filas municipio-año, ninguna del Huila; máximo " + f"{max(gas_mal, default=0):.0f}" + " %): una cobertura de viviendas mayor a 100 % es imposible por definición y el panel no da el numerador ni el denominador para revisarla. Solo trae dato para municipios con información del Ministerio de Minas (697 en 2016; 26 de 37 en el Huila). El faltante NO se convierte en 0 porque el diccionario no lo autoriza: un municipio sin fila puede no tener red o no tener reporte. Cobertura potencial (anillados) no se incluye.",
             filas=[f for f in directo("cob_gres_efec") if f[2] <= 100]),
    ]
    for ind in inds:
        escribir(ind, ind["filas"], universo, fuera)
    print("Códigos fuera del universo DANE (no escritos):",
          sorted(set().union(*fuera.values())) if fuera else "ninguno")

    # Filas con numerador pero sin población retroproyectada (no se escriben).
    sin_pob = sorted({c for (c, a), v in d.items()
                      if any(v[k] is not None for k in ("contributivo", "sedes", "nacimientos", "defunciones"))
                      and not pob.get((c, a)) and 1998 <= a <= 2016})
    print("Códigos FUERA del universo con dato de salud (xx999 sin información, 75xxx, códigos "
          "antiguos; no se escriben):", [c for c in sin_pob if c not in universo])
    print("Municipios del universo con dato pero retro_pobl_tot = 0 o vacía (años previos a su "
          "creación; no se escriben en las tasas):",
          sorted((c, a) for (c, a), v in d.items() if c in universo and not pob.get((c, a))
                 and any(v[k] is not None for k in ("contributivo", "sedes", "nacimientos", "defunciones"))))

if __name__ == "__main__":
    main()
