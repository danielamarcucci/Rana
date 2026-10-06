"""Panel Municipal del CEDE (Universidad de los Andes) — módulo Conflicto y violencia.

Fuente: PANEL_CONFLICTO_Y_VIOLENCIA(2021).tab, Dataverse de Uniandes,
DOI https://doi.org/10.57924/BN57KJ (CC0). Diccionario oficial:
PANEL_CONFLICTO_Y_VIOLENCIA(2021).pdf (331 variables, 1993-2020).
Denominador de población: PANEL_CARACTERISTICAS_GENERALES(2021).tab
(DOI https://doi.org/10.57924/IX38JI), variable retro_pobl_tot (DANE,
retroproyecciones con base en el CNPV 2018) para 1993-2017, y
datos/salida/poblacion_municipal_nacional.csv (DANE, proyecciones CNPV 2018)
para 2018-2020. Ambas series parten del mismo censo.

Los .tab NO se copian al repo (son de 25 MB y 11 MB y están fuera, en
CEDE_DIR, por defecto /mnt/project-files/cede/dataverse/). El script verifica
su SHA-256 antes de leerlos y para si no coincide.

Criterio de selección (14 indicadores, todos serie panel municipio × año):
- Se privilegian series históricas que las fuentes nuevas del tablero no
  cubren: acciones ofensivas por actor armado (FARC, ELN, AUC; Policía/DAS
  1993-2008), acciones de grupos armados según el Ministerio de Defensa
  (terrorismo, acciones subversivas, hostigamientos, ataques a instalaciones
  de policía, 2003-2020), minas antipersonal (DAIMA, 1993-2020), victimización
  registrada en el RUV por lugar de ocurrencia (amenazas, desaparición
  forzada, vinculación de menores, homicidio en el marco del conflicto,
  1993-2020) y la marca histórica de La Violencia (1948-1953).
- Todos los conteos se convierten en tasa por 100.000 habitantes del mismo
  año (numerador = conteo del panel, denominador = población DANE).
- NO se incluyen (duplican lo que ya está en el tablero): coca (H_coca y
  afines; SIMCI 2002-2024), desplazamiento (desplazados_*, o/d/e_desplaza;
  RUV 2024-2025), homicidios totales (homicidios; tasa de homicidio TerriData
  y MinDefensa 12 meses), secuestros totales (secuestros, secues_*,
  o_secuest; TerriData), extorsión (TerriData), hurtos (hurto*, TerriData
  hurto a personas), homicidios de tránsito (homi_tr; TerriData), homicidios
  colectivos/masacres (homic_caso/homic_vict; Indepaz masacres),
  confinamiento (o_confina; OCHA) y delitos sexuales (o_delito_sex,
  TerriData delitos sexuales).

Valores faltantes: en el .tab vienen como celda vacía. Nunca se convierten en
0 (el diccionario no dice que ausente = 0). Consecuencias, explicadas en la
nota de cada indicador:
- Policía/DAS por actor: 2009 y 2010 vienen con 0 en los 1.122 municipios
  para todos los actores (el diccionario dice 1993-2010, pero un 0 nacional
  en plena actividad armada no es un dato): se excluyen y la serie va de
  1993 a 2008.
- MinDefensa: 2003-2019 con fila para los 1.123 municipios (0 explícito);
  2020 solo trae los municipios con al menos un hecho (los demás quedan sin
  dato, no en 0). 2021 aparece en el .tab pero el diccionario documenta la
  serie solo hasta 2020: se excluye.
- Municipio-año sin población DANE (municipios creados después de ese año,
  p. ej. 13490 Norosí, 05390 La Pintada antes de su creación): el conteo no se
  puede convertir en tasa y la fila no se publica; el script informa cuántas.
- DAIMA (minas) y RUV: el panel solo trae filas de municipio-año con
  registro; el resto queda sin dato.

Códigos fuera del universo de 1.123 municipios (no se publican y se informan
en consola): 27086 (Belén de Bajirá), 99572 y 99760 (códigos antiguos de
Vichada), 00000 y una fila sin código.

Salida: datos/salida/cede/cede_conf_<id>.csv y .meta.json.
"""
import csv
import hashlib
import json
import os
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CEDE_DIR = Path(os.environ.get("CEDE_DIR", "/mnt/project-files/cede/dataverse"))
SAL = RAIZ / "datos" / "salida" / "cede"
POB_DANE = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"

TAB = "PANEL_CONFLICTO_Y_VIOLENCIA(2021).tab"
TAB_POB = "PANEL_CARACTERISTICAS_GENERALES(2021).tab"
SHA = {
    TAB: "889790c81e65891fb588fd535d7ee244ae87051597e74b4cfc43dcbe91c7ea6a",
    TAB_POB: "c4d9275b4c80c97236fce4f00bb58c1bb7096b3444975edc8a3e47ce22b5ffc1",
}
DOI = "https://doi.org/10.57924/BN57KJ"
MODULO = "Panel Conflicto y violencia"
FACTOR = 100000

N_POLDAS = (
    "Fuente original Policía Nacional / DAS, compilada por el CEDE. El "
    "diccionario documenta 1993-2010, pero 2009 y 2010 vienen en 0 para todos "
    "los municipios y actores, por lo que se excluyen: la serie útil es "
    "1993-2008. Mide hechos registrados por la fuerza pública, no el total "
    "real de acciones. "
)
N_MD = (
    "Fuente original Ministerio de Defensa, compilada por el CEDE. 2003-2019 "
    "trae fila para todos los municipios (0 explícito); 2020 solo trae los "
    "municipios con al menos un hecho, así que en 2020 el resto queda sin "
    "dato (no se imputa 0) y el año principal es 2019. 2021 aparece en el "
    "archivo pero no está documentado en el diccionario y se excluye. "
)
N_DAIMA = (
    "Fuente original Dirección para la Acción Integral contra Minas "
    "Antipersonal (DAIMA), corte 1 de enero de 2021, compilada por el CEDE. "
    "El panel solo trae filas de municipio-año con al menos un registro: los "
    "demás quedan sin dato (es probable que sean 0, pero el diccionario no lo "
    "dice y no se imputa). Por eso el número de municipios con dato varía "
    "cada año. "
)
N_RUV = (
    "Fuente original Registro Único de Víctimas (RUV), corte 1 de enero de "
    "2021, compilada por el CEDE; se usa la variable por lugar de "
    "ocurrencia (o_), no la de declaración (d_) ni la de evento (e_). El "
    "RUV es un registro administrativo que se sigue alimentando con "
    "declaraciones tardías, así que los años recientes tienden a subir en "
    "versiones posteriores. El panel solo trae filas de municipio-año con "
    "registro; el resto queda sin dato (no se imputa 0). "
)
N_TASA = (
    "Tasa construida: numerador = conteo del panel; denominador = población "
    "total DANE del mismo año (retroproyección CNPV 2018, variable "
    "retro_pobl_tot del Panel de Características Generales, para 1993-2017; "
    "proyección CNPV 2018 de poblacion_municipal_nacional.csv para "
    "2018-2020). En municipios pequeños pocos hechos producen tasas altas."
)

# (id, variables a sumar, años [desde, hasta], etiqueta, descripción, base, nota, año principal)
INDICADORES = [
    ("cede_conf_acc_ofensivas_farc", ["tactof_FARC"], (1993, 2008),
     "Acciones ofensivas de las FARC (histórico)",
     "Actos de acción ofensiva atribuidos a las FARC por 100.000 habitantes: "
     "acciones de ataque de un grupo armado para avanzar en sus frentes.",
     "variable tactof_FARC; fuente original Policía Nacional / DAS",
     N_POLDAS, "2008"),
    ("cede_conf_acc_ofensivas_eln", ["tactof_ELN"], (1993, 2008),
     "Acciones ofensivas del ELN (histórico)",
     "Actos de acción ofensiva atribuidos al ELN por 100.000 habitantes.",
     "variable tactof_ELN; fuente original Policía Nacional / DAS",
     N_POLDAS, "2008"),
    ("cede_conf_acc_ofensivas_auc", ["tactof_AUC"], (1993, 2008),
     "Acciones ofensivas de las AUC (histórico)",
     "Actos de acción ofensiva atribuidos a las Autodefensas Unidas de "
     "Colombia por 100.000 habitantes.",
     "variable tactof_AUC; fuente original Policía Nacional / DAS",
     N_POLDAS + "Las AUC se desmovilizaron entre 2003 y 2006; los primeros "
     "registros del panel son de 1997. ", "2008"),
    ("cede_conf_terrorismo", ["terrorismot"], (2003, 2020),
     "Actos de terrorismo",
     "Total de actos de terrorismo por 100.000 habitantes: acciones que "
     "ponen en peligro la vida, la integridad o la libertad de las personas, "
     "edificaciones o infraestructura, con medios capaces de causar estragos.",
     "variable terrorismot; fuente original Ministerio de Defensa",
     N_MD, "2019"),
    ("cede_conf_acc_subversivas", ["acc_subversivas"], (2003, 2020),
     "Acciones subversivas",
     "Total de acciones subversivas por 100.000 habitantes: acciones de "
     "carácter militar que implican interacción armada entre grupos "
     "guerrilleros y la fuerza pública.",
     "variable acc_subversivas; fuente original Ministerio de Defensa",
     N_MD, "2019"),
    ("cede_conf_hostigamientos", ["hostig_MD"], (2003, 2020),
     "Hostigamientos a la fuerza pública",
     "Total de hostigamientos por 100.000 habitantes: ataques de un grupo "
     "armado ilegal contra unidades de la fuerza pública con intensidad menor "
     "a la respuesta esperada.",
     "variable hostig_MD; fuente original Ministerio de Defensa",
     N_MD, "2019"),
    ("cede_conf_ataques_policia", ["ataq_instpol"], (2003, 2020),
     "Ataques a instalaciones de policía",
     "Total de ataques a instalaciones de policía por 100.000 habitantes.",
     "variable ataq_instpol; fuente original Ministerio de Defensa",
     N_MD + "Hecho poco frecuente: la mayoría de municipios-año vale 0. ",
     "2019"),
    ("cede_conf_eventos_minas", ["eventos_minas"], (1993, 2020),
     "Eventos con minas antipersonal",
     "Número de eventos relacionados con minas antipersonal (accidentes, "
     "incidentes, desminado, incautaciones, sospecha de campo minado) por "
     "100.000 habitantes.",
     "variable eventos_minas; fuente original DAIMA",
     N_DAIMA, "2020"),
    ("cede_conf_victimas_minas", ["accidentes_minas"], (1993, 2020),
     "Víctimas de minas antipersonal",
     "Víctimas de minas antipersonal y munición sin explotar (civiles y "
     "fuerza pública, heridos y muertos) por 100.000 habitantes.",
     "variable accidentes_minas; fuente original DAIMA",
     N_DAIMA + "El diccionario la llama «número de accidentes relacionados "
     "con minas», pero en las 2.334 filas con dato es exactamente la suma de "
     "minas_civ_her + minas_civ_muer + minas_fp_her + minas_fp_muer, es "
     "decir, cuenta víctimas, no accidentes (pico nacional: 1.228 víctimas "
     "en 2006). ", "2020"),
    ("cede_conf_ruv_amenazas", ["o_amenazas"], (1993, 2020),
     "Víctimas de amenazas (RUV)",
     "Víctimas de amenazas en el marco del conflicto registradas en el RUV "
     "según el municipio donde ocurrió el hecho, por 100.000 habitantes.",
     "variable o_amenazas; fuente original Registro Único de Víctimas",
     N_RUV, "2020"),
    ("cede_conf_ruv_desaparicion", ["o_desap_for"], (1993, 2020),
     "Víctimas de desaparición forzada (RUV)",
     "Víctimas de desaparición forzada registradas en el RUV según el "
     "municipio donde ocurrió el hecho, por 100.000 habitantes.",
     "variable o_desap_for; fuente original Registro Único de Víctimas",
     N_RUV + "El RUV incluye víctimas directas e indirectas (familiares). ",
     "2020"),
    ("cede_conf_ruv_reclutamiento", ["o_vinc_mened"], (1993, 2020),
     "Vinculación de niños y adolescentes a grupos armados (RUV)",
     "Víctimas de vinculación de niños, niñas y adolescentes a actividades "
     "relacionadas con grupos armados registradas en el RUV según el "
     "municipio de ocurrencia, por 100.000 habitantes (población total).",
     "variable o_vinc_mened; fuente original Registro Único de Víctimas",
     N_RUV + "El denominador es la población total, no la de menores de 18 "
     "años. ", "2020"),
    ("cede_conf_ruv_homicidio", ["o_homic"], (1993, 2020),
     "Víctimas de homicidio en el conflicto (RUV)",
     "Víctimas de homicidio en el marco del conflicto armado registradas en "
     "el RUV según el municipio de ocurrencia, por 100.000 habitantes.",
     "variable o_homic; fuente original Registro Único de Víctimas",
     N_RUV + "No es la tasa de homicidio general (esa está en el tablero con "
     "TerriData y MinDefensa): solo cuenta homicidios reconocidos como hechos "
     "del conflicto en el RUV, e incluye víctimas indirectas (familiares). ",
     "2020"),
]


def sha256(p):
    h = hashlib.sha256()
    with p.open("rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def verificar():
    for nombre, esperado in SHA.items():
        p = CEDE_DIR / nombre
        if not p.exists():
            sys.exit(f"No encuentro {p}. Define CEDE_DIR.")
        real = sha256(p)
        if real != esperado:
            sys.exit(f"SHA-256 de {nombre} no coincide: {real} != {esperado}")


def cod(t):
    t = t.strip().strip('"')
    if not t:
        return None
    return str(int(float(t))).zfill(5)


def anio(t):
    t = t.strip()
    return int(float(t)) if t else None


def universo():
    pob = {}
    with POB_DANE.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            pob[(r["cod_divipola"], int(r["anio"]))] = int(r["poblacion"])
    return {c for c, _ in pob}, pob


def poblacion(pob_dane):
    """1993-2017 retro_pobl_tot (CEDE/DANE); 2018+ archivo DANE del repo."""
    pob = {k: v for k, v in pob_dane.items() if k[1] >= 2018}
    with (CEDE_DIR / TAB_POB).open(encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            c, a, v = cod(r["codmpio"]), anio(r["ano"]), r["retro_pobl_tot"].strip()
            if c and a and a <= 2017 and v:
                pob[(c, a)] = float(v)
    return pob


def fmt(x, nd=4):
    if x is None:
        return ""
    x = round(x, nd)
    return str(int(x)) if x == int(x) else str(x)


def main():
    verificar()
    SAL.mkdir(parents=True, exist_ok=True)
    U, pob_dane = universo()
    pob = poblacion(pob_dane)

    filas = []
    fuera = {}
    with (CEDE_DIR / TAB).open(encoding="utf-8") as f:
        for r in csv.DictReader(f, delimiter="\t"):
            c, a = cod(r["codmpio"]), anio(r["ano"])
            if c not in U or a is None:
                fuera[c or "(vacío)"] = fuera.get(c or "(vacío)", 0) + 1
                continue
            filas.append((c, a, r))
    print("Filas fuera del universo (no se publican):", fuera)

    resumen = []
    for (iid, vs, (a0, a1), etq, desc, base, nota, aprin) in INDICADORES:
        out, sin_pob = [], []
        for c, a, r in filas:
            if not (a0 <= a <= a1):
                continue
            vals = [r[v].strip() for v in vs]
            if any(v == "" for v in vals):
                continue
            n = sum(float(v) for v in vals)
            d = pob.get((c, a))
            if not d:
                sin_pob.append((c, a))
                continue
            out.append((c, a, n / d * FACTOR, n, d))
        out.sort()
        with (SAL / f"{iid}.csv").open("w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
            for c, a, v, n, d in out:
                w.writerow([c, a, fmt(v), fmt(n), fmt(d, 0)])
        anios = sorted({a for _, a, *_ in out})
        meta = {
            "id": iid, "tema": "Conflicto y violencia", "etiqueta": etq,
            "descripcion": desc, "unidad": "Por cada 100.000 habitantes",
            "sentido": "peor", "periodo": f"{anios[0]}-{anios[-1]}",
            "anio_principal": aprin,
            "institucion": "CEDE, Universidad de los Andes — Panel Municipal",
            "base": f"{MODULO} ({base})", "enlace": DOI,
            "fecha_consulta": "2026-10-06", "agregable": "tasa",
            "factor": FACTOR, "nota": nota + N_TASA,
            "sha256": {TAB: SHA[TAB], TAB_POB: SHA[TAB_POB]},
        }
        (SAL / f"{iid}.meta.json").write_text(
            json.dumps(meta, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
        resumen.append((iid, out, aprin, sin_pob))

    # Marca histórica de La Violencia (dummy constante en el panel)
    iid = "cede_conf_violencia_1948_1953"
    dum = {}
    for c, a, r in filas:
        v = r["Violencia_48_a_53"].strip()
        if v != "":
            dum.setdefault(c, set()).add(float(v))
    incons = [c for c, s in dum.items() if len(s) > 1]
    if incons:
        sys.exit(f"Violencia_48_a_53 cambia entre años en {incons[:5]}: revisar")
    with (SAL / f"{iid}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for c in sorted(dum):
            w.writerow([c, "1948-1953", fmt(next(iter(dum[c]))), "", ""])
    meta = {
        "id": iid, "tema": "Conflicto y violencia",
        "etiqueta": "Presencia de La Violencia (1948-1953)",
        "descripcion": "Marca (1 = sí, 0 = no) de si el municipio fue "
        "reportado con violencia partidista entre 1948 y 1953 en las seis "
        "primeras ediciones de la revista Criminalidad de la Policía Nacional "
        "(1958-1963).",
        "unidad": "Indicador 0/1", "sentido": "contexto",
        "periodo": "1948-1953", "anio_principal": "1948-1953",
        "institucion": "CEDE, Universidad de los Andes — Panel Municipal",
        "base": f"{MODULO} (variable Violencia_48_a_53; fuente original "
        "Fernández (2010), Violencia y derechos de propiedad. El caso de La "
        "Violencia en Colombia, con base en la revista Criminalidad de la "
        "Policía Nacional)",
        "enlace": DOI, "fecha_consulta": "2026-10-06", "agregable": "no",
        "factor": None,
        "nota": "Dato histórico fijo: el panel repite el mismo valor en "
        "todos los años 1993-2019 y aquí se publica una sola fila por "
        "municipio. Refleja la división municipal actual sobre un hecho de "
        "hace 70 años y depende de qué municipios mencionó la revista; un 0 "
        "no prueba que no hubo violencia. Es contexto histórico, no se rankea.",
        "sha256": {TAB: SHA[TAB]},
    }
    (SAL / f"{iid}.meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # Validación
    print(f"\n{'id':34s} filas  Huila(año ppal)  Neiva valor (num/den)")
    for iid, out, aprin, sin_pob in resumen:
        hu = [o for o in out if o[0].startswith("41") and str(o[1]) == aprin]
        ne = [o for o in hu if o[0] == "41001"]
        vmax = max((o[2] for o in out), default=None)
        neiva = f"{ne[0][2]:.2f} ({ne[0][3]:.0f}/{ne[0][4]:.0f})" if ne else "sin dato"
        print(f"{iid:34s} {len(out):6d} {len(hu):3d}/37  {neiva}  max={vmax:.1f}"
              + (f"  sin población (no publicadas): {len(sin_pob)} filas, p. ej. {sin_pob[:3]}" if sin_pob else ""))
    hu1 = [c for c in dum if c.startswith("41")]
    con1 = sorted(c for c in hu1 if 1.0 in dum[c])
    print(f"{'cede_conf_violencia_1948_1953':34s} {len(dum):6d} {len(hu1):3d}/37  Huila con 1: {con1}")


if __name__ == "__main__":
    main()
