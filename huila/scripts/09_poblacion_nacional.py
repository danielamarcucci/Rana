"""Proyección de población DANE de TODOS los municipios del país (2018-2030).

Denominador común para las tasas del módulo de conflicto (por 100.000 o por
1.000 habitantes), que se comparan contra todos los municipios de Colombia.
Lee el mismo XLSX sin modificar que usa 04_poblacion_seguridad.py
(datos/crudos/dane/PPED-AreaMun-2018-2042_VP.xlsx, hoja PobMunicipalxÁrea,
área Total).

Salida: datos/salida/poblacion_municipal_nacional.csv
  cod_divipola, cod_dpto, departamento, municipio, anio, poblacion
"""
import csv
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from importlib import import_module

m04 = import_module("04_poblacion_seguridad")
RAIZ = m04.RAIZ


def main() -> None:
    xlsx = m04.CRUDOS / "dane" / "PPED-AreaMun-2018-2042_VP.xlsx"
    filas, cab = [], None
    for c in m04.leer_hoja(xlsx, "sheet3"):
        if c.get("F") != "Total" or not c.get("E", "").isdigit():
            continue
        anio = int(c["E"])
        if 2018 <= anio <= 2030:
            filas.append({"cod_divipola": c["C"].zfill(5), "cod_dpto": c["A"].zfill(2),
                          "departamento": c["B"], "municipio": c["D"], "anio": anio,
                          "poblacion": int(round(float(c["G"])))})
    por_anio = {}
    for f in filas:
        por_anio[f["anio"]] = por_anio.get(f["anio"], 0) + 1
    if len(set(por_anio.values())) != 1:
        sys.exit(f"Número de municipios distinto por año: {por_anio}")
    n = next(iter(por_anio.values()))
    if not 1100 <= n <= 1130:
        sys.exit(f"Municipios por año: {n}, fuera de lo esperado (~1.122)")
    huila = sum(1 for f in filas if f["anio"] == 2025 and f["cod_dpto"] == "41")
    if huila != 37:
        sys.exit(f"Huila: {huila} municipios")
    ruta = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
    with ruta.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    print(f"{n} municipios por año, {len(filas)} filas -> {ruta.name}")


if __name__ == "__main__":
    main()
