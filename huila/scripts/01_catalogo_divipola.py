"""Homologa el código de municipio de la Registraduría con el código DIVIPOLA del DANE.

Entradas (sin modificar):
  datos/crudos/registraduria/MMV_TERRITORIALES2023_HUILA.zip
  datos/crudos/dane/divipola_huila_datosgov.json

Salida:
  datos/catalogos/homologacion_registraduria_divipola_huila.csv

El cruce se hace por nombre normalizado (sin tildes, sin texto entre paréntesis).
Si algún municipio no cruza de forma única, el script se detiene: no se
completa a mano ni se aproxima.
"""
import csv
import io
import json
import re
import sys
import unicodedata
import zipfile
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos"


def normalizar(nombre: str) -> str:
    nombre = re.sub(r"\(.*?\)", "", nombre)
    nombre = unicodedata.normalize("NFKD", nombre).encode("ascii", "ignore").decode()
    return re.sub(r"\s+", " ", nombre).strip().upper()


def municipios_registraduria(anio: int) -> dict:
    zpath = CRUDOS / "registraduria" / f"MMV_TERRITORIALES{anio}_HUILA.zip"
    with zipfile.ZipFile(zpath) as z:
        nombre_csv = next(n for n in z.namelist() if n.endswith(".csv"))
        with z.open(nombre_csv) as f:
            lector = csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig"))
            return {fila["Código Municipio"]: fila["Nombre Municipio"] for fila in lector}


def main() -> None:
    reg = municipios_registraduria(2023)
    reg2019 = municipios_registraduria(2019)
    if set(reg) != set(reg2019):
        sys.exit(f"Los códigos de municipio cambian entre 2019 y 2023: {set(reg) ^ set(reg2019)}")

    divipola = json.loads((CRUDOS / "dane" / "divipola_huila_datosgov.json").read_text("utf-8"))
    por_nombre = {}
    for m in divipola:
        por_nombre.setdefault(normalizar(m["nom_mpio"]), []).append(m)

    filas = []
    for cod_reg, nombre_reg in sorted(reg.items()):
        candidatos = por_nombre.get(normalizar(nombre_reg), [])
        if len(candidatos) != 1:
            sys.exit(f"Sin cruce único para {cod_reg} {nombre_reg}: {candidatos}")
        m = candidatos[0]
        filas.append({
            "cod_registraduria": cod_reg,
            "nombre_registraduria_2019": reg2019[cod_reg],
            "nombre_registraduria_2023": nombre_reg,
            "cod_divipola": m["cod_mpio"],
            "municipio": m["nom_mpio"],
            "latitud": m["latitud"].replace(",", "."),
            "longitud": m["longitud"].replace(",", "."),
        })

    if len(filas) != 37 or len({f["cod_divipola"] for f in filas}) != 37:
        sys.exit(f"Se esperaban 37 municipios distintos, hay {len(filas)}")

    salida = RAIZ / "datos" / "catalogos" / "homologacion_registraduria_divipola_huila.csv"
    with salida.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    print(f"OK: {len(filas)} municipios homologados -> {salida.relative_to(RAIZ)}")


if __name__ == "__main__":
    main()
