"""Homicidios por 100.000 habitantes en los últimos 12 meses, todos los municipios.

Fuente: Ministerio de Defensa Nacional / Policía Nacional (SIEDCO), dataset
"HOMICIDIO" en datos.gov.co (m8fd-ahd9), medido en víctimas (campo `cantidad`).
La agregación se hace en el servidor con SoQL (group by `cod_muni`) y la
respuesta se guarda tal cual en datos/crudos/mindefensa_nacional/.

Decisiones:
- Periodo: los 12 meses que terminan en el último mes completo publicado. Al
  consultar (2026-10-06) el dato más reciente era fecha_hecho = 2026-08-31
  (actualización del 2026-09-16), así que el periodo es 2025-09-01 a
  2026-08-31 ("12m_ago2026"). El periodo queda fijo en PERIODO para que el
  script sea reproducible; si la fuente publica meses nuevos, el script lo
  avisa pero no cambia el periodo solo.
- Denominador: población DANE proyectada 2026 (datos/salida/
  poblacion_municipal_nacional.csv, universo de 1.123 municipios).
- Municipio sin homicidios en el periodo = 0: el dataset cubre todo el país y
  solo lista hechos registrados.
- Filas con un código que no está en el universo DANE se reportan y el script
  se detiene (no se descartan en silencio).
- Chequeo: total nacional del año 2025 en el mismo dataset contra la cifra
  de la Policía Nacional (SIEDCO, corte 12-jun-2026) citada por la
  Universidad Externado: 14.037 homicidios.

Salidas: datos/salida/conflicto/homicidios_12m.csv y .meta.json
"""
import csv
import datetime as dt
import hashlib
import json
import subprocess
import sys
import urllib.parse
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "mindefensa_nacional"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
POBLACION = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"

DATASET = "m8fd-ahd9"
BASE = f"https://www.datos.gov.co/resource/{DATASET}.json"
PERIODO = ("2025-09-01T00:00:00", "2026-08-31T23:59:59")
ETIQ_PERIODO = "12m_ago2026"
ANIO_POB = "2026"
PUBLICADO_2025 = 14037  # Policía Nacional (SIEDCO), corte 12-jun-2026, vía U. Externado

CONSULTAS = {
    "homicidio_12m_municipio.json": {
        "$select": "cod_muni, sum(cantidad) as total",
        "$where": f"fecha_hecho between '{PERIODO[0]}' and '{PERIODO[1]}'",
        "$group": "cod_muni", "$order": "cod_muni", "$limit": "50000"},
    "homicidio_12m_mensual_nacional.json": {
        "$select": "date_trunc_ym(fecha_hecho) as mes, sum(cantidad) as total",
        "$where": f"fecha_hecho between '{PERIODO[0]}' and '{PERIODO[1]}'",
        "$group": "mes", "$order": "mes", "$limit": "100"},
    "homicidio_2025_nacional.json": {
        "$select": "sum(cantidad) as total",
        "$where": "fecha_hecho between '2025-01-01T00:00:00' and '2025-12-31T23:59:59'"},
    "homicidio_fecha_maxima.json": {"$select": "max(fecha_hecho) as maxima"},
}


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def descargar() -> list:
    CRUDOS.mkdir(parents=True, exist_ok=True)
    manif = CRUDOS / "manifiesto.csv"
    previo = {}
    if manif.exists():
        with manif.open(encoding="utf-8") as f:
            previo = {r["archivo"]: r for r in csv.DictReader(f)}
    filas = []
    for nombre, params in CONSULTAS.items():
        url = BASE + "?" + urllib.parse.urlencode(params)
        destino = CRUDOS / nombre
        if destino.exists() and nombre in previo:
            fila = previo[nombre]
            if sha(destino) != fila["sha256"]:
                sys.exit(f"{nombre}: el SHA-256 no coincide con el manifiesto")
        else:
            subprocess.run(["curl", "-sS", "-f", "-m", "300", "-o", str(destino), url], check=True)
            fila = {"archivo": nombre, "dataset": DATASET, "url": url,
                    "fecha_consulta": dt.date.today().isoformat(), "sha256": sha(destino)}
        filas.append(fila)
    with manif.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    return filas


def leer(nombre: str):
    return json.loads((CRUDOS / nombre).read_text("utf-8"))


def main() -> None:
    manifiesto = descargar()
    pob = {}
    with POBLACION.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["anio"] == ANIO_POB:
                pob[r["cod_divipola"]] = int(r["poblacion"])
    if len(pob) != 1123:
        sys.exit(f"Universo con {len(pob)} municipios, se esperaban 1.123")

    maxima = leer("homicidio_fecha_maxima.json")[0]["maxima"]
    if maxima[:10] < PERIODO[1][:10]:
        sys.exit(f"La fuente llega a {maxima}, antes del fin del periodo {PERIODO[1]}")
    if maxima[:7] > PERIODO[1][:7]:
        print(f"AVISO: la fuente ya publica datos hasta {maxima}; el periodo fijo es {ETIQ_PERIODO}")

    meses = leer("homicidio_12m_mensual_nacional.json")
    if len(meses) != 12:
        sys.exit(f"Se esperaban 12 meses, hay {len(meses)}")

    casos, sin_homologar = {}, []
    for d in leer("homicidio_12m_municipio.json"):
        cod = (d.get("cod_muni") or "").zfill(5)
        n = int(float(d["total"]))
        if cod not in pob:
            sin_homologar.append((d.get("cod_muni"), n))
            continue
        casos[cod] = casos.get(cod, 0) + n
    if sin_homologar:
        sys.exit(f"Códigos de municipio fuera del universo DANE: {sin_homologar}")

    total = sum(casos.values())
    total_meses = sum(int(float(m["total"])) for m in meses)
    if total != total_meses:
        sys.exit(f"Total municipal {total} != suma mensual {total_meses}")
    total_2025 = int(float(leer("homicidio_2025_nacional.json")[0]["total"]))
    dif = total_2025 - PUBLICADO_2025
    print(f"Chequeo 2025: dataset {total_2025} vs publicado {PUBLICADO_2025} (dif {dif})")
    if abs(dif) > 0.01 * PUBLICADO_2025:
        sys.exit("El total 2025 difiere más de 1% de la cifra publicada")

    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / "homicidios_12m.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for cod in sorted(pob):
            n = casos.get(cod, 0)
            # Población 0 (p. ej. Mapiripana ANM en 2026): la tasa no se define, valor vacío.
            valor = round(n / pob[cod] * 100000, 2) if pob[cod] > 0 else ""
            if valor == "":
                print(f"AVISO {cod}: población {ANIO_POB} = 0, {n} casos; tasa vacía")
            w.writerow([cod, ETIQ_PERIODO, valor, n, pob[cod]])
    total_pob = sum(pob.values())
    print(f"OK homicidios_12m.csv: {len(pob)} municipios, {total} homicidios, "
          f"tasa Colombia {total / total_pob * 100000:.2f}")

    meta = {
        "id": "homicidios_12m",
        "etiqueta": "Homicidios por 100.000 hab. (12 meses)",
        "descripcion": ("Víctimas de homicidio intencional registradas por la Policía Nacional "
                        "entre septiembre de 2025 y agosto de 2026, por municipio del hecho, "
                        "por cada 100.000 habitantes (población DANE proyectada 2026)."),
        "unidad": "homicidios por 100.000 habitantes",
        "sentido": "peor",
        "periodo": "Septiembre 2025 – agosto 2026 (12 meses)",
        "institucion": "Ministerio de Defensa Nacional – Policía Nacional (SIEDCO)",
        "base": "HOMICIDIO (datos.gov.co, m8fd-ahd9), agregado por municipio con SoQL",
        "enlace": f"https://www.datos.gov.co/d/{DATASET}",
        "fecha_consulta": manifiesto[0]["fecha_consulta"],
        "agregable": "tasa",
        "factor": 100000,
        "nota": ("Cifras de la Policía Nacional, preliminares y sujetas a actualización; suelen "
                 "ser menores que las de Medicina Legal o DANE. Agosto de 2026 era el último mes "
                 "completo publicado al consultar. Municipio sin registros en el periodo = 0 "
                 "(cobertura nacional). Mapiripana (ANM, 94663) tiene población DANE 2026 = 0: tasa vacía. En municipios pequeños pocos casos producen tasas altas. "
                 f"Chequeo: total 2025 en el dataset {total_2025} vs {PUBLICADO_2025} publicado "
                 "por la Policía (SIEDCO, corte 12-jun-2026, citado por U. Externado)."),
        "sha256": {m["archivo"]: m["sha256"] for m in manifiesto},
    }
    (SALIDA / "homicidios_12m.meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
