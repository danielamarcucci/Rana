"""Violencia organizada con muertos por municipio, 2023-2026 (UCDP).

Fuentes (Uppsala Conflict Data Program, https://ucdp.uu.se/downloads/):
  * UCDP GED Global versión 26.1 (cubre 1989-2025; publicada 2026-03-30):
    https://ucdp.uu.se/downloads/ged/ged261-csv.zip  -> GEDEvent_v26_1.csv
  * UCDP Candidate Events 2026 (preliminares):
      - trimestral 26.01.26.06 (enero-junio 2026): GEDEvent_v26_01_26_06.csv
      - mensual 26.0.7 (julio 2026):               GEDEvent_v26_0_7.csv
      - mensual 26.0.8 (agosto 2026):              GEDEvent_v26_0_8.csv
    https://ucdp.uu.se/downloads/candidateged/<archivo>
  Codebooks: https://ucdp.uu.se/downloads/ged/ged261.pdf y
  https://ucdp.uu.se/downloads/candidateged/ucdp-candidate-codebook1.5.pdf
  Capa de municipios: DANE, MGN 2025, servicio
  https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer/317
  (descargada por departamento con curl, maxAllowableOffset=0.0001° ~11 m).

Decisiones:
  * Evento UCDP = uso de fuerza armada por un actor organizado contra otro o
    contra civiles con al menos 1 muerto directo (violencia estatal, no estatal
    y unilateral). Colombia = country_id 100. Años 2023-2025 de GED 26.1;
    2026 de Candidate (ene-ago). Candidate se deduplica por `id` (prevalece la
    versión más reciente: 26.0.8 > 26.0.7 > 26.01.26.06) y se filtra year=2026.
    Todo evento 2026 es preliminar; además se cuenta cuántos tienen
    code_status distinto de "Clear" (aún en revisión).
  * Se excluyen eventos con where_prec >= 4 (ubicados solo a nivel de
    departamento, región difusa/lineal, país o aguas internacionales).
    where_prec 3 (solo se conoce el municipio; punto en el centroide) se
    incluye.
  * Asignación de municipio (regla verificable, en este orden):
      - where_prec 1-2 (lugar exacto o radio <=25 km): punto-en-polígono de
        lat/lon contra MGN 2025. Si el punto cae fuera de Colombia o en un
        departamento distinto del adm_1 que UCDP declara para el mismo evento
        (coordenada de un homónimo: p. ej. "Popayán town" ubicado en Planadas,
        Tolima), se usa el nombre adm_2 + adm_1 de UCDP homologado a DIVIPOLA.
      - where_prec 3 (solo se sabe el municipio; UCDP pone un punto
        representativo con su propia capa administrativa, que no coincide con
        el MGN: p. ej. el punto de "La Plata municipality" cae en Inzá): se usa
        el nombre adm_2 + adm_1 homologado a DIVIPOLA.
      Si el nombre no se puede homologar, el evento se lista y NO se asigna.
      Cada evento lleva en el extracto el método usado.
  * Muertes = `best` (estimación más probable de UCDP).
  * Salida: una fila por municipio del universo (1.123) y por año 2023..2026;
    ausente = 0 porque UCDP tiene cobertura global. Valor de Colombia/depto =
    suma de municipios (más los eventos excluidos por precisión, que no se
    asignan: ver nota).
  * grupos_ucdp.csv: actores side_a / side_b (separando díadas "A, B"),
    excluyendo "Government of Colombia" y "Civilians".

El ZIP de GED (39,1 MB) se guarda tal cual en datos/crudos/ucdp/. La capa
MGN se guarda fuera del repositorio (caché; ver CACHE) y su SHA-256 queda en
el manifiesto. El script escribe además un extracto de Colombia con el
municipio asignado a cada evento (datos/crudos/ucdp/extracto_colombia_2023_2026.csv,
producido por este script, no es un archivo de la fuente).
"""
import csv
import datetime as dt
import hashlib
import io
import json
import os
import re
import unicodedata
import subprocess
import sys
import zipfile
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "ucdp"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
CACHE = Path(os.environ.get("HUILA_CACHE_MGN", "/tmp/huila_cache/mgn2025"))

URL_UCDP = "https://ucdp.uu.se/downloads/"
GED = ("ged261-csv.zip", URL_UCDP + "ged/ged261-csv.zip")
CANDIDATOS = [  # del más antiguo al más reciente
    ("GEDEvent_v26_01_26_06.csv", URL_UCDP + "candidateged/GEDEvent_v26_01_26_06.csv"),
    ("GEDEvent_v26_0_7.csv", URL_UCDP + "candidateged/GEDEvent_v26_0_7.csv"),
    ("GEDEvent_v26_0_8.csv", URL_UCDP + "candidateged/GEDEvent_v26_0_8.csv"),
]
MGN = ("https://geoportal.dane.gov.co/mparcgis/rest/services/Divipola/Serv_DIVIPOLA_MGN_2025/FeatureServer/317/query"
       "?where=dpto_ccdgo%3D%27{d}%27&outFields=MPIO_CDPMP%2CMPIO_CNMBRE%2CDPTO_CNMBRE&returnGeometry=true"
       "&outSR=4326&maxAllowableOffset=0.0001&geometryPrecision=5&f=geojson")
ANIOS = ["2023", "2024", "2025", "2026"]
EXCLUIR_ACTORES = {"Government of Colombia", "Civilians"}
# Unificación de nombres de actor (nombres tal como los publica UCDP).
UNIFICA = {
    "EGC": "EGC (Clan del Golfo)",
    "FARC-EMC": "FARC disidencias - EMC",
    "FARC - Segunda Marquetalia": "Segunda Marquetalia",
    "ELN": "ELN",
    "EMBF": "FARC disidencias - EMBF (Estado Mayor de Bloques y Frentes)",
    "Comandos de la Frontera": "Comandos de la Frontera",
    "Autodefensas Conquistadoras de la Sierra Nevada": "Autodefensas Conquistadoras de la Sierra Nevada (ACSN)",
    "Los Costenos": "Los Costeños",
    "Los Pepes": "Los Pepes",
    "La Terraza": "La Terraza",
    "EPL–Los Pelusos": "EPL (Los Pelusos)",
    "FARC- Frente 57 Yair Bermúdez": "FARC disidencias - Frente 57 Yair Bermúdez",
    "Guerrilla Coordinadora Nacional Ejército Bolivariano": "Coordinadora Nacional Ejército Bolivariano (CNEB)",
    "Renacer ERPAC": "Renacer ERPAC",
    "Autodefensas Campesinas de Nariño": "Autodefensas Campesinas de Nariño",
    "Tren de Aragua": "Tren de Aragua",
    # bandas/grupos locales tal como los nombra UCDP (sin unificación adicional)
    "Los Papalópez": "Los Papalópez", "Los Shottas": "Los Shottas", "Los Espartanos": "Los Espartanos",
    "Los Flacos": "Los Flacos", "Nueva Generación Gang": "Nueva Generación (banda)",
    "Norteños": "Norteños", "La Nueva Generación del Freseo": "La Nueva Generación del Freseo",
    "La Inmaculada gang": "La Inmaculada (banda)", "El Mesa gang": "El Mesa (banda)",
    "La Cordillera gang": "La Cordillera (banda)", "El Ajizal": "El Ajizal", "Los Venezolanos": "Los Venezolanos",
    "Los Innombrables": "Los Innombrables", "El Bolo": "El Bolo", "Lovaina": "Lovaina",
}
# Actores genéricos de UCDP: "XXX" + código Gleditsch-Ward = actor no identificado.
# No se incluyen en grupos_ucdp.csv; se cuentan en el informe.


def sha(ruta: Path) -> str:
    h = hashlib.sha256()
    with open(ruta, "rb") as f:
        for b in iter(lambda: f.read(1 << 20), b""):
            h.update(b)
    return h.hexdigest()


def bajar(url: str, destino: Path):
    if not destino.exists():
        destino.parent.mkdir(parents=True, exist_ok=True)
        subprocess.run(["curl", "-sS", "-f", "-L", "-m", "900", "-o", str(destino), url], check=True)


def leer_csv_ucdp(texto: str):
    return [r for r in csv.DictReader(io.StringIO(texto)) if r["country_id"] == "100"]


# ---------- geometría ----------
def anillos(geom):
    if geom["type"] == "Polygon":
        return [geom["coordinates"]]
    if geom["type"] == "MultiPolygon":
        return geom["coordinates"]
    raise ValueError(geom["type"])


def en_anillo(x, y, anillo):
    dentro = False
    j = len(anillo) - 1
    for i in range(len(anillo)):
        xi, yi = anillo[i][0], anillo[i][1]
        xj, yj = anillo[j][0], anillo[j][1]
        if (yi > y) != (yj > y) and x < (xj - xi) * (y - yi) / (yj - yi) + xi:
            dentro = not dentro
        j = i
    return dentro


def en_poligonos(x, y, polis):
    for poli in polis:
        if en_anillo(x, y, poli[0]) and not any(en_anillo(x, y, h) for h in poli[1:]):
            return True
    return False


def cargar_mgn(dptos, manifiesto):
    munis = []
    for d in sorted(dptos):
        ruta = CACHE / f"mgn2025_mpio_d{d}.geojson"
        bajar(MGN.format(d=d), ruta)
        datos = json.loads(ruta.read_bytes())
        if datos.get("exceededTransferLimit") or datos.get("properties", {}).get("exceededTransferLimit"):
            sys.exit(f"MGN depto {d}: respuesta truncada")
        manifiesto.append({"archivo": f"(caché fuera del repo) {ruta.name}", "url": MGN.format(d=d),
                           "fecha_consulta": dt.date.today().isoformat(), "sha256": sha(ruta),
                           "bytes": ruta.stat().st_size})
        for ft in datos["features"]:
            polis = anillos(ft["geometry"])
            xs = [p[0] for poli in polis for p in poli[0]]
            ys = [p[1] for poli in polis for p in poli[0]]
            munis.append((ft["properties"]["MPIO_CDPMP"], (min(xs), min(ys), max(xs), max(ys)), polis))
    return munis


def norm(t: str) -> str:
    t = unicodedata.normalize("NFKD", t).encode("ascii", "ignore").decode().lower()
    for suf in (" municipality", " department", " district"):
        t = t.replace(suf, "")
    return re.sub(r"[^a-z0-9]+", " ", t).strip()


# Nombres de UCDP (normalizados) que no coinciden literalmente con DIVIPOLA.
ALIAS_DPTO = {"bogota": "11", "san andres y providencia": "88"}
ALIAS_MPIO = {  # (cod_dpto, nombre UCDP normalizado) -> cod_divipola (nombre oficial DIVIPOLA)
    ("05", "bolivar"): "05101",            # Ciudad Bolívar
    ("05", "carmen de viboral"): "05148",  # El Carmen de Viboral
    ("11", "bogota"): "11001",             # Bogotá, D.C.
    ("13", "cartagena"): "13001",          # Cartagena de Indias
    ("19", "piendamo"): "19548",           # Piendamó - Tunía
    ("19", "lopez"): "19418",              # López de Micay
    ("19", "belalcazar"): "19517",         # Belalcázar = cabecera de Páez
    ("20", "manaure"): "20443",            # Manaure Balcón del Cesar
    ("47", "cerro san antonio"): "47161",  # Cerro de San Antonio
    ("50", "vista hermosa"): "50711",      # Vistahermosa
    ("52", "tumaco"): "52835",             # San Andrés de Tumaco
    ("54", "cucuta"): "54001",             # San José de Cúcuta
    ("54", "zulia"): "54261",              # El Zulia
    ("70", "tolu"): "70820",               # Santiago de Tolú (no Tolú Viejo; el punto UCDP cae en 70820)
    ("76", "buga"): "76111",               # Guadalajara de Buga
    ("91", "puerto santander"): "91669",   # Puerto Santander (ANM)
}
NO_MUNICIPIO = (" village", " town", " region", " area", " sector", " city")


def homologar(adm1, adm2, nombres, deptos):
    d = ALIAS_DPTO.get(norm(adm1)) or deptos.get(norm(adm1))
    adm2 = re.sub(r"\s*\(.*?\)", "", adm2).strip()  # "Sabanalarga municipality (Atlántico)"
    if not d or not adm2 or adm2.endswith(NO_MUNICIPIO):
        return None
    n2 = norm(adm2)
    if (d, n2) in ALIAS_MPIO:
        return ALIAS_MPIO[(d, n2)]
    cands = [c for c, (cd, nm) in nombres.items() if cd == d and nm == n2]
    return cands[0] if len(cands) == 1 else None


def ubicar(lat, lon, munis):
    hallados = [c for c, (x0, y0, x1, y1), polis in munis
                if x0 <= lon <= x1 and y0 <= lat <= y1 and en_poligonos(lon, lat, polis)]
    return hallados


def main():
    CRUDOS.mkdir(parents=True, exist_ok=True)
    SALIDA.mkdir(parents=True, exist_ok=True)
    hoy = dt.date.today().isoformat()
    manifiesto = []

    # ---- descarga y lectura ----
    nombre, url = GED
    bajar(url, CRUDOS / nombre)
    manifiesto.append({"archivo": nombre, "url": url, "fecha_consulta": hoy,
                       "sha256": sha(CRUDOS / nombre), "bytes": (CRUDOS / nombre).stat().st_size})
    with zipfile.ZipFile(CRUDOS / nombre) as z:
        ged = leer_csv_ucdp(z.read("GEDEvent_v26_1.csv").decode("utf-8-sig"))
    ged = [r for r in ged if r["year"] in ANIOS[:3]]
    if any(r["code_status"] != "Clear" for r in ged):
        sys.exit("GED 26.1 trae eventos que no están en estado Clear")

    cand = {}
    for nombre, url in CANDIDATOS:
        bajar(url, CRUDOS / nombre)
        manifiesto.append({"archivo": nombre, "url": url, "fecha_consulta": hoy,
                           "sha256": sha(CRUDOS / nombre), "bytes": (CRUDOS / nombre).stat().st_size})
        for r in leer_csv_ucdp((CRUDOS / nombre).read_text(encoding="utf-8-sig")):
            r["_version"] = nombre
            cand[r["id"]] = r  # la versión más reciente reemplaza
    cand = [r for r in cand.values() if r["year"] == "2026"]
    for r in cand:
        r["_version"] = r["_version"]
    for r in ged:
        r["_version"] = "GED 26.1"
    eventos = ged + cand
    if len({r["id"] for r in eventos}) != len(eventos):
        sys.exit("ids de evento duplicados entre GED y Candidate")

    # ---- universo ----
    universo, nombres, deptos = {}, {}, {}
    with open(UNIVERSO, encoding="utf-8") as f:
        for r in csv.DictReader(f):
            universo[r["cod_divipola"]] = r["cod_dpto"]
            # sin paréntesis: "Puerto Santander (ANM)" -> "puerto santander"
            nombres[r["cod_divipola"]] = (r["cod_dpto"], norm(re.sub(r"\s*\(.*?\)", "", r["municipio"])))
            deptos[norm(r["departamento"])] = r["cod_dpto"]
    if len(universo) != 1123:
        sys.exit(f"Universo: {len(universo)} municipios, se esperaban 1123")

    munis = cargar_mgn(set(universo.values()), manifiesto)
    sin_capa = set(universo) - {m[0] for m in munis}

    # ---- asignación ----
    excl_prec = Counter()
    fuera, multiples, metodo = [], [], Counter()
    for r in eventos:
        r["cod_divipola"] = r["metodo"] = ""
        if int(r["where_prec"]) >= 4:
            excl_prec[(r["year"], r["where_prec"])] += 1
            continue
        por_nombre = homologar(r["adm_1"], r["adm_2"], nombres, deptos)
        hall = ubicar(float(r["latitude"]), float(r["longitude"]), munis)
        if len(hall) > 1:
            multiples.append((r, hall))
            continue
        punto = hall[0] if hall else None
        d_ucdp = ALIAS_DPTO.get(norm(r["adm_1"])) or deptos.get(norm(r["adm_1"]))
        if r["where_prec"] == "3":
            r["cod_divipola"], r["metodo"] = (por_nombre, "nombre_adm2 (where_prec 3)") if por_nombre else ("", "")
        elif punto and punto[:2] == d_ucdp:
            r["cod_divipola"], r["metodo"] = punto, "punto_en_poligono"
        elif por_nombre:
            r["cod_divipola"], r["metodo"] = por_nombre, "nombre_adm2 (punto fuera del adm_1 de UCDP)"
        if not r["cod_divipola"]:
            fuera.append(r)
            continue
        metodo[r["metodo"]] += 1
        r["_punto"] = punto or ""
        if punto and punto != r["cod_divipola"]:
            metodo["   de ellos: municipio distinto al del punto"] += 1
    if multiples:
        for r, h in multiples:
            print("Punto en varios polígonos:", r["id"], r["latitude"], r["longitude"], h)
        sys.exit("Puntos en más de un municipio: revisar capa")

    # ---- extracto auditable ----
    campos = ["id", "_version", "year", "date_start", "date_end", "code_status", "type_of_violence",
              "side_a", "side_b", "where_prec", "where_coordinates", "adm_1", "adm_2", "latitude",
              "longitude", "best", "low", "high", "cod_divipola", "metodo", "_punto"]
    with open(CRUDOS / "extracto_colombia_2023_2026.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow([{"_punto": "cod_divipola_punto"}.get(c, c.lstrip("_")) for c in campos])
        for r in sorted(eventos, key=lambda r: (r["year"], r["date_start"], r["id"])):
            w.writerow([r.get(c, "") for c in campos])

    # ---- agregación ----
    n_ev, n_m = defaultdict(int), defaultdict(int)
    grupos = set()
    sin_grupo = Counter()
    for r in eventos:
        c = r["cod_divipola"]
        if not c:
            continue
        n_ev[(c, r["year"])] += 1
        n_m[(c, r["year"])] += int(r["best"])
        for lado in ("side_a", "side_b"):
            for actor in [a.strip() for a in r[lado].split(", ")]:
                if actor in EXCLUIR_ACTORES:
                    continue
                if actor.startswith("XXX"):
                    sin_grupo[(r["year"], actor)] += 1
                    continue
                if actor not in UNIFICA:
                    sys.exit(f"Actor UCDP sin unificar: {actor!r}")
                grupos.add((c, r["year"], actor, UNIFICA[actor]))

    fuera_univ = {c for c, _ in n_ev} - set(universo)
    if fuera_univ:
        sys.exit(f"Códigos fuera del universo: {fuera_univ}")

    for ident, datos in (("ucdp_eventos_2023_2026", n_ev), ("ucdp_muertes_2023_2026", n_m)):
        with open(SALIDA / f"{ident}.csv", "w", newline="", encoding="utf-8") as f:
            w = csv.writer(f)
            w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
            for c in sorted(universo):
                for a in ANIOS:
                    w.writerow([c, a, datos.get((c, a), 0), "", ""])
    with open(SALIDA / "grupos_ucdp.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "grupo_original", "grupo"])
        for g in sorted(grupos):
            w.writerow(g)

    with open(CRUDOS / "manifiesto.csv", "w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["archivo", "url", "fecha_consulta", "sha256", "bytes"])
        w.writeheader()
        w.writerows(manifiesto)

    # ---- metadatos ----
    total = Counter(r["year"] for r in eventos)
    asign = Counter(r["year"] for r in eventos if r["cod_divipola"])
    muertes_tot = Counter()
    for r in eventos:
        muertes_tot[r["year"]] += int(r["best"])
    no_clear = sum(1 for r in cand if r["code_status"] != "Clear")
    resumen_excl = "; ".join(f"{a}: {sum(v for (y, p), v in excl_prec.items() if y == a)}" for a in ANIOS)
    sha_meta = {m["archivo"]: m["sha256"] for m in manifiesto if not m["archivo"].startswith("(")}
    nota_comun = (
        f"Años 2023-2025: UCDP GED 26.1 (versión anual depurada). 2026: UCDP Candidate (enero-agosto 2026, "
        f"preliminar: {len(cand)} eventos y {sum(int(r['best']) for r in cand)} muertes; {no_clear} eventos aún tienen "
        f"code_status distinto de 'Clear', la mayoría con actor sin identificar 'XXX100'; solo 'Clear': "
        f"{len(cand) - no_clear} eventos y {sum(int(r['best']) for r in cand if r['code_status'] == 'Clear')} muertes). "
        "2026 NO es comparable con 2023-2025: Candidate incluye eventos aún sin verificar que GED puede descartar o "
        "reclasificar cuando salga GED 27.1. Solo eventos con al menos un muerto directo (violencia estatal, "
        "no estatal y unilateral contra civiles), codificados a partir de prensa y fuentes abiertas: no es un "
        "registro oficial colombiano ni un censo de homicidios. Municipio asignado por punto-en-polígono "
        "(coordenadas UCDP contra MGN 2025 del DANE) para where_prec 1-2; por nombre adm_2/adm_1 de UCDP homologado a "
        "DIVIPOLA para where_prec 3 y para puntos que caen fuera del departamento que UCDP declara "
        f"({metodo['punto_en_poligono']} eventos por punto, {metodo['nombre_adm2 (where_prec 3)']} por nombre con "
        f"where_prec 3, {metodo['nombre_adm2 (punto fuera del adm_1 de UCDP)']} por nombre por punto fuera del "
        "departamento declarado). Se excluyen eventos con where_prec >= 4 (ubicados solo "
        f"a nivel departamento/región/país) — por año: {resumen_excl}; esos eventos sí cuentan en el total de "
        f"Colombia que publica UCDP pero no en ningún municipio. Eventos sin municipio asignable (adm_2 que no es un "
        f"municipio, p. ej. 'Catatumbo region', o que no existe en DIVIPOLA): {len(fuera)}. "
        "Cobertura global: municipio sin eventos = 0. Mapiripana (94663) no está en la capa MGN 2025 consultada: "
        "un evento allí quedaría asignado al municipio vecino que contiene el punto."
    )
    comun = {"anio_principal": "2023-2025", "periodo": "2023-2026 (2026: enero-agosto, preliminar)", "institucion": "Uppsala Conflict Data Program (UCDP), Universidad de Uppsala",
             "base": "UCDP Georeferenced Event Dataset (GED) Global 26.1 + UCDP Candidate Events 26.0.x",
             "enlace": "https://ucdp.uu.se/downloads/", "fecha_consulta": hoy, "agregable": "suma",
             "factor": None, "sentido": "peor", "nota": nota_comun, "sha256": sha_meta}
    metas = {
        "ucdp_eventos_2023_2026": {"etiqueta": "Eventos de violencia organizada (UCDP)",
                                   "descripcion": "Número de eventos de violencia armada organizada con al menos un muerto ocurridos en el municipio en el año, según UCDP.",
                                   "unidad": "eventos"},
        "ucdp_muertes_2023_2026": {"etiqueta": "Muertes en violencia organizada (UCDP)",
                                   "descripcion": "Suma de la estimación más probable (best) de muertes en eventos de violencia armada organizada ocurridos en el municipio en el año, según UCDP.",
                                   "unidad": "muertes"},
    }
    for ident, m in metas.items():
        meta = {"id": ident, **m, **comun}
        orden = ["id", "etiqueta", "descripcion", "unidad", "sentido", "periodo", "anio_principal", "institucion", "base", "enlace",
                 "fecha_consulta", "agregable", "factor", "nota", "sha256"]
        (SALIDA / f"{ident}.meta.json").write_text(
            json.dumps({k: meta[k] for k in orden}, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # ---- informe ----
    print("Eventos Colombia por año (total / asignados a municipio):", {a: (total[a], asign[a]) for a in ANIOS})
    print("Muertes best Colombia por año (todos los eventos):", dict(muertes_tot))
    print("Muertes asignadas:", {a: sum(v for (c, y), v in n_m.items() if y == a) for a in ANIOS})
    print("Excluidos por where_prec>=4:", dict(excl_prec))
    print("Candidate 2026:", len(cand), "eventos; code_status != Clear:", no_clear,
          Counter(r["code_status"] for r in cand), Counter(r["_version"] for r in cand))
    print("Municipios sin polígono en MGN:", sin_capa)
    for r in fuera:
        print("SIN ASIGNAR:", r["id"], r["year"], r["where_prec"], r["latitude"], r["longitude"], r["adm_1"], r["adm_2"], r["best"])
    print("Métodos:", dict(metodo))
    print("Grupos excluidos (gobierno/civiles) solo se omiten; actores distintos:",
          sorted({g[2] for g in grupos}))
    print("Menciones de actor no identificado (XXX*) por año, no incluidas en grupos:", dict(sin_grupo))


if __name__ == "__main__":
    main()
