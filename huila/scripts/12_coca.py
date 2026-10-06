"""Hectáreas de coca por municipio (censo SIMCI), todos los municipios, 2002-2024.

Fuente: Ministerio de Justicia y del Derecho – Observatorio de Drogas de
Colombia (ODC), con el censo del Sistema Integrado de Monitoreo de Cultivos
Ilícitos (SIMCI, Gobierno de Colombia – UNODC). Dataset "Detección de
Cultivos de Coca (hectáreas)" en datos.gov.co (acs4-3wgp): una fila por
municipio con coca detectada en algún año, una columna por año 2001-2024
(área a 31 de diciembre). El CSV se descarga completo y se guarda tal cual en
datos/crudos/odc/acs4-3wgp.csv.

Decisiones:
- Celda vacía o municipio ausente = 0 ha: el censo SIMCI cubre todo el
  territorio nacional, así que no detectar coca es un dato (0), no un faltante.
- Se escribe una fila por municipio del universo (1.123) y por año.
- Chequeo año por año: la suma nacional del dataset se compara con el total
  nacional publicado por SIMCI/UNODC (PUBLICADO abajo). Los años que difieren
  más de 0,1 % NO se incluyen en la salida (no se corrigen ni se reparten):
    2001: dataset 136.918 ha vs 144.807 publicadas (-5,4 %)
    2009: dataset  68.027 ha vs  73.139 publicadas (-7,0 %)
  Ambos quedan en el crudo, sin usar.
- Los códigos son los de la DIVIPOLA vigente (incluye Barrancominas 94343 y
  las áreas no municipalizadas); los 319 códigos del dataset están en el
  universo DANE.

Salidas: datos/salida/conflicto/coca_2024.csv (serie completa) y .meta.json
"""
import csv
import datetime as dt
import hashlib
import json
import subprocess
import sys
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "odc"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
POBLACION = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"

DATASET = "acs4-3wgp"
URL = f"https://www.datos.gov.co/api/views/{DATASET}/rows.csv?accessType=DOWNLOAD"
CRUDO = CRUDOS / f"{DATASET}.csv"
ID = "coca_2024"

# Totales nacionales publicados (ha).
# 2001-2010: UNODC/SIMCI, "Monitoreo de cultivos de coca 2015" (jul-2016), tabla
#   "Total Nacional" (https://www.unodc.org/documents/colombia/2016/Julio/
#   Censo_Cultivos_Coca_2015_SIMCI.pdf, SHA-256 1ed4c143854bf316...ea5cd).
# 2011-2024: UNODC/SIMCI, "Monitoreo de territorios con presencia de cultivos de
#   coca 2024" (jun-2026), serie histórica (https://www.unodc.org/documents/
#   crop-monitoring/Colombia/Monitoreo_de_cultivos_de_coca_2024.pdf, SHA-256
#   42384b0c5147dd1a...c56df01). 2012 (47.788) también en ese gráfico.
PUBLICADO = {
    2001: 144807, 2002: 102071, 2003: 86340, 2004: 80350, 2005: 85750, 2006: 77870,
    2007: 98899, 2008: 80953, 2009: 73139, 2010: 61812, 2011: 63765, 2012: 47788,
    2013: 48189, 2014: 69132, 2015: 96085, 2016: 146140, 2017: 171495, 2018: 169018,
    2019: 154476, 2020: 142784, 2021: 204257, 2022: 230028, 2023: 252572, 2024: 261386,
}
TOLERANCIA = 0.001


def sha(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def descargar() -> dict:
    CRUDOS.mkdir(parents=True, exist_ok=True)
    manif = CRUDOS / "manifiesto.csv"
    if CRUDO.exists() and manif.exists():
        with manif.open(encoding="utf-8") as f:
            fila = next(csv.DictReader(f))
        if sha(CRUDO) != fila["sha256"]:
            sys.exit("acs4-3wgp.csv: el SHA-256 no coincide con el manifiesto")
        return fila
    subprocess.run(["curl", "-sS", "-f", "-m", "300", "-o", str(CRUDO), URL], check=True)
    fila = {"archivo": CRUDO.name, "dataset": DATASET, "url": URL,
            "fecha_consulta": dt.date.today().isoformat(), "sha256": sha(CRUDO)}
    with manif.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(fila))
        w.writeheader()
        w.writerow(fila)
    return fila


def main() -> None:
    fila_manif = descargar()
    universo = set()
    with POBLACION.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            universo.add(r["cod_divipola"])
    if len(universo) != 1123:
        sys.exit(f"Universo con {len(universo)} municipios, se esperaban 1.123")

    with CRUDO.open(encoding="utf-8-sig") as f:
        filas = list(csv.DictReader(f))
    anios = sorted(int(c) for c in filas[0] if c.strip().isdigit())
    if anios != list(range(2001, 2025)):
        sys.exit(f"Años inesperados en el dataset: {anios}")
    ha = {}
    for r in filas:
        cod = r["CODMPIO"].strip().zfill(5)
        if cod not in universo:
            sys.exit(f"Código fuera del universo DANE: {r['CODMPIO']} {r['MUNICIPIO']}")
        if cod in ha:
            sys.exit(f"Código duplicado: {cod}")
        ha[cod] = {a: float(r[str(a)]) if r[str(a)].strip() else 0.0 for a in anios}

    validos, excluidos = [], {}
    for a in anios:
        total = sum(v[a] for v in ha.values())
        dif = total / PUBLICADO[a] - 1
        ok = abs(dif) <= TOLERANCIA
        print(f"{a}: dataset {total:,.0f} ha vs publicado {PUBLICADO[a]:,} ({dif * 100:+.2f}%)"
              f"{'' if ok else '  -> EXCLUIDO'}")
        if ok:
            validos.append(a)
        else:
            excluidos[a] = (round(total), PUBLICADO[a])
    if 2024 not in validos:
        sys.exit("El total 2024 no cuadra con el publicado: se detiene el indicador")

    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / f"{ID}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for cod in sorted(universo):
            for a in validos:
                v = ha.get(cod, {}).get(a, 0.0)
                w.writerow([cod, a, f"{v:.2f}".rstrip("0").rstrip("."), "", ""])
    print(f"OK {ID}.csv: {len(universo)} municipios x {len(validos)} años; "
          f"{sum(1 for v in ha.values() if v[2024] > 0)} municipios con coca en 2024")

    meta = {
        "id": ID,
        "etiqueta": "Hectáreas de coca (SIMCI 2024)",
        "descripcion": ("Área sembrada con coca detectada por el censo SIMCI a 31 de diciembre "
                        "de 2024, en hectáreas, por municipio. El CSV incluye la serie anual "
                        "2002-2024 (sin 2001 ni 2009)."),
        "unidad": "hectáreas",
        "sentido": "peor",
        "periodo": "2024 (serie 2002-2024 en el CSV)",
        "institucion": ("Ministerio de Justicia y del Derecho – Observatorio de Drogas de "
                        "Colombia; censo SIMCI (Gobierno de Colombia – UNODC)"),
        "base": "Detección de Cultivos de Coca (hectáreas), datos.gov.co acs4-3wgp",
        "enlace": f"https://www.datos.gov.co/d/{DATASET}",
        "fecha_consulta": fila_manif["fecha_consulta"],
        "agregable": "suma",
        "factor": None,
        "nota": ("Municipio sin coca detectada = 0 (el censo SIMCI cubre todo el país). Es "
                 "área a 31 de diciembre detectada con imágenes satelitales, no producción. "
                 "Totales nacionales del dataset verificados contra SIMCI/UNODC (2024: 261.386 "
                 "ha, igual al informe de junio de 2026). Se excluyen de la serie 2001 y 2009 "
                 "porque la suma municipal del dataset no cuadra con el total nacional "
                 + "publicado (" + "; ".join(f"{a}: {d:,} vs {p:,} ha" for a, (d, p) in
                                            excluidos.items()) + ")."),
        "sha256": {fila_manif["archivo"]: fila_manif["sha256"]},
    }
    (SALIDA / f"{ID}.meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
