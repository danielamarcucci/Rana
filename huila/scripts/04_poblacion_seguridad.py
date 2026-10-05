"""Proyecciones de población DANE y delitos MinDefensa por municipio del Huila.

1. Proyecciones municipales de población 2018-2042 por área (DANE, actualización
   del 30 de julio de 2025). Se descarga el XLSX completo a
   datos/crudos/dane/PPED-AreaMun-2018-2042_VP.xlsx y se lee con la librería
   estándar (zipfile + XML), sin modificarlo.
2. Delitos de MinDefensa en datos.gov.co (homicidio, violencia intrafamiliar,
   lesiones personales), agregados en el servidor con SoQL por municipio y año
   para el departamento 41. La respuesta se guarda tal cual en
   datos/crudos/mindefensa/<delito>.json.

Salidas:
  datos/salida/poblacion_proyeccion_municipio.csv   (2018-2030, área Total)
  datos/salida/seguridad_delitos_municipio_anio.csv
"""
import csv
import datetime as dt
import hashlib
import json
import re
import subprocess
import sys
import urllib.parse
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos"
SALIDA = RAIZ / "datos" / "salida"

URL_PROYECCIONES = ("https://www.dane.gov.co/files/censo2018/proyecciones-de-poblacion/"
                    "Municipal/PPED-AreaMun-2018-2042_VP.xlsx")
DELITOS = {
    "homicidio": "m8fd-ahd9",
    "violencia_intrafamiliar": "gepp-dxcs",
    "lesiones_personales": "jr6v-i33g",
}


def curl(url: str, destino: Path) -> str:
    subprocess.run(["curl", "-sS", "-f", "-m", "300", "-o", str(destino), url], check=True)
    return hashlib.sha256(destino.read_bytes()).hexdigest()


def municipios_huila() -> dict:
    ruta = RAIZ / "datos" / "catalogos" / "homologacion_registraduria_divipola_huila.csv"
    with ruta.open(encoding="utf-8") as f:
        return {fila["cod_divipola"]: fila["municipio"] for fila in csv.DictReader(f)}


def leer_hoja(xlsx: Path, hoja: str):
    with zipfile.ZipFile(xlsx) as z:
        ss = z.read("xl/sharedStrings.xml").decode("utf-8")
        textos = [re.sub(r"<[^>]+>", "", s) for s in re.findall(r"<si>(.*?)</si>", ss, re.S)]
        xml = z.read(f"xl/worksheets/{hoja}.xml").decode("utf-8")
    patron = re.compile(r'<c r="([A-Z]+)\d+"([^>]*?)(?:/>|>(.*?)</c>)', re.S)
    for fila in re.findall(r"<row [^>]*>(.*?)</row>", xml, re.S):
        celdas = {}
        for col, attrs, interior in patron.findall(fila):
            v = re.search(r"<v>(.*?)</v>", interior or "")
            if v is None:
                continue
            v = v.group(1)
            celdas[col] = textos[int(v)] if 't="s"' in attrs else v
        yield celdas


def poblacion(muni: dict) -> list:
    xlsx = CRUDOS / "dane" / "PPED-AreaMun-2018-2042_VP.xlsx"
    if not xlsx.exists():
        curl(URL_PROYECCIONES, xlsx)
    filas = []
    for c in leer_hoja(xlsx, "sheet3"):  # hoja "PobMunicipalxÁrea"
        if c.get("A") == "41" and c.get("F") == "Total" and 2018 <= int(c["E"]) <= 2030:
            if c["C"] not in muni:
                sys.exit(f"Municipio DANE fuera del catálogo: {c}")
            filas.append({"cod_divipola": c["C"], "municipio": muni[c["C"]],
                          "anio": int(c["E"]), "poblacion": int(round(float(c["G"])))})
    for anio in range(2018, 2031):
        n = sum(1 for f in filas if f["anio"] == anio)
        if n != 37:
            sys.exit(f"Proyección {anio}: {n} municipios, se esperaban 37")
    return filas


def delitos(muni: dict) -> list:
    destino = CRUDOS / "mindefensa"
    destino.mkdir(parents=True, exist_ok=True)
    hoy = dt.date.today().isoformat()
    filas, manifiesto = [], []
    for delito, ident in DELITOS.items():
        params = {
            "$select": "cod_muni, date_extract_y(fecha_hecho) as anio, sum(cantidad) as total",
            "$where": "cod_depto='41'",
            "$group": "cod_muni, anio",
            "$order": "cod_muni, anio",
            "$limit": "50000",
        }
        url = f"https://www.datos.gov.co/resource/{ident}.json?" + urllib.parse.urlencode(params)
        sha = curl(url, destino / f"{delito}.json")
        datos = json.loads((destino / f"{delito}.json").read_text("utf-8"))
        for d in datos:
            if d["cod_muni"] not in muni:
                sys.exit(f"{delito}: código de municipio desconocido {d}")
            filas.append({"delito": delito, "cod_divipola": d["cod_muni"],
                          "municipio": muni[d["cod_muni"]], "anio": int(d["anio"]),
                          "casos": int(float(d["total"]))})
        manifiesto.append({"delito": delito, "dataset": ident, "url": url,
                           "fecha_consulta": hoy, "sha256": sha, "filas": len(datos)})
    with (destino / "manifiesto.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(manifiesto[0]))
        w.writeheader()
        w.writerows(manifiesto)
    return filas


def escribir(nombre: str, filas: list) -> None:
    with (SALIDA / nombre).open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    print(f"OK {nombre}: {len(filas)} filas")


def main() -> None:
    muni = municipios_huila()
    escribir("poblacion_proyeccion_municipio.csv", poblacion(muni))
    escribir("seguridad_delitos_municipio_anio.csv", delitos(muni))


if __name__ == "__main__":
    main()
