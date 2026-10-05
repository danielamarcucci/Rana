"""Indicadores TerriData (DNP) para el módulo Problemas y Caracterización.

Para cada indicador del catálogo datos/catalogos/indicadores_terridata.csv:
- valor del Huila (código 41000), de Colombia (01001) y de los 32 departamentos
  (códigos terminados en 000) para el puesto entre departamentos;
- valor de todos los municipios del país en el último año, para los quintiles
  del mapa y el histograma;
- serie anual de Huila, Colombia y los 37 municipios del Huila, para el
  gráfico de evolución;
- mediana de los municipios de la región Andina.

Entradas sin modificar: datos/crudos/terridata/TerriData_Dim{N}.txt.zip
(descarga directa de https://terridata.dnp.gov.co/assets/docs/txt/dimensiones/).
Si un ZIP no está, se descarga y se registra su SHA-256 en el manifiesto.

Salida: datos/salida/terridata_indicadores.json
"""
import csv
import datetime as dt
import hashlib
import io
import json
import statistics
import subprocess
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "terridata"
URL = "https://terridata.dnp.gov.co/assets/docs/txt/dimensiones/TerriData_Dim{n}.txt.zip"
ANIO_MAX = 2026  # Población y densidad traen proyecciones hasta 2042: no se usan años futuros.

# Región Andina = departamentos completos de la región natural andina
# (decisión de diseño documentada en metodologia.md).
ANDINA = {"05", "11", "15", "17", "25", "41", "54", "63", "66", "68", "73"}


def numero_co(texto: str) -> float:
    return float(texto.strip().replace(".", "").replace(",", "."))


def asegurar_zip(n: int, manifiesto: list) -> Path:
    ruta = CRUDOS / f"TerriData_Dim{n}.txt.zip"
    if not ruta.exists():
        CRUDOS.mkdir(parents=True, exist_ok=True)
        subprocess.run(["curl", "-sS", "-f", "-m", "600", "-o", str(ruta), URL.format(n=n)], check=True)
    manifiesto.append({"archivo": ruta.name, "url": URL.format(n=n),
                       "sha256": hashlib.sha256(ruta.read_bytes()).hexdigest(),
                       "fecha_verificacion": dt.date.today().isoformat()})
    return ruta


def leer_dim(ruta: Path, nombres: dict):
    """Devuelve {indicador: {cod: {anio: (mes, valor)}}} y metadatos."""
    datos = defaultdict(lambda: defaultdict(dict))
    meta = defaultdict(lambda: {"unidad": set(), "fuente": set()})
    with zipfile.ZipFile(ruta) as z:
        nombre = z.namelist()[0]
        with z.open(nombre) as f:
            lector = csv.reader(io.TextIOWrapper(f, encoding="utf-8-sig", errors="replace"), delimiter="|")
            cab = next(lector)
            i = {c: k for k, c in enumerate(cab)}
            for fila in lector:
                if len(fila) < len(cab):
                    continue
                ind = fila[i["Indicador"]]
                if ind not in nombres or (nombres[ind] and fila[i["Subcategoría"]] != nombres[ind]):
                    continue
                v = fila[i["Dato Numérico"]].strip()
                if not v:
                    continue
                anio = int(fila[i["Año"]])
                if anio > ANIO_MAX:
                    continue
                mes = int(fila[i["Mes"]] or 0)
                cod = fila[i["Código Entidad"]].strip().zfill(5)
                previo = datos[ind][cod].get(anio)
                valor = numero_co(v)
                if previo and previo[0] == mes and previo[1] != valor:
                    sys.exit(f"Dos valores distintos para {ind} {cod} {anio}-{mes}")
                if not previo or mes > previo[0]:
                    datos[ind][cod][anio] = (mes, valor)
                meta[ind]["unidad"].add(fila[i["Unidad de Medida"]])
                meta[ind]["fuente"].add(fila[i["Fuente"]])
    return datos, meta


def mediana(vals):
    return round(statistics.median(vals), 4) if vals else None


def main() -> None:
    with (RAIZ / "datos" / "catalogos" / "indicadores_terridata.csv").open(encoding="utf-8") as f:
        catalogo = list(csv.DictReader(f))
    por_dim = defaultdict(dict)
    for c in catalogo:
        por_dim[int(c["dim"])][c["indicador"]] = c["subcategoria"]

    manifiesto, crudos, metas = [], {}, {}
    for n, nombres in sorted(por_dim.items()):
        d, m = leer_dim(asegurar_zip(n, manifiesto), nombres)
        faltan = set(nombres) - set(d)
        if faltan:
            sys.exit(f"Dim{n}: indicadores no encontrados {faltan}")
        crudos.update(d)
        metas.update(m)
        print(f"Dim{n}: {len(nombres)} indicadores")
    with (CRUDOS / "manifiesto.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(manifiesto[0]))
        w.writeheader()
        w.writerows(manifiesto)

    # Universo de municipios del país: los que tienen población en TerriData.
    universo = {c for c in crudos["Población total"] if not c.endswith("000") and c != "01001"}
    huila = sorted(c for c in universo if c.startswith("41"))
    if len(huila) != 37:
        sys.exit(f"Municipios del Huila en TerriData: {len(huila)}")

    salida = []
    for c in catalogo:
        d = crudos[c["indicador"]]
        val = lambda cod: {a: v for a, (_, v) in sorted(d.get(cod, {}).items())}
        municipios = {cod: val(cod) for cod in universo}
        anios_mun = [a for s in municipios.values() for a in s]
        serie_col, serie_dep = val("01001"), val("41000")
        # Último año: el más reciente con dato de municipios; si el indicador no es municipal, el del departamento.
        ultimo = max(anios_mun) if anios_mun else max(serie_dep)
        # Si el último año municipal no tiene dato departamental, se usa el año anterior que tenga ambos
        # (solo un año de diferencia: si no, se queda el municipal y el departamento sale sin dato).
        if ultimo not in serie_dep and (ultimo - 1) in serie_dep and (ultimo - 1) in anios_mun:
            ultimo -= 1
        con_dato = {cod for cod, s in municipios.items() if s}
        nacional = {}
        for cod in universo:
            if ultimo in municipios[cod]:
                nacional[cod] = municipios[cod][ultimo]
            elif c["ceros"] == "si" and cod in con_dato:
                nacional[cod] = 0.0  # TerriData omite el municipio el año que no hubo casos
        deps = {cod: s[ultimo] for cod, s in ((k, val(k)) for k in d if k.endswith("000") and k != "01001")
                if ultimo in s}
        dep = serie_dep.get(ultimo)
        puesto_dep = None
        if dep is not None and c["sentido"] != "contexto":
            peores = sorted(deps.values(), reverse=(c["sentido"] == "peor"))
            puesto_dep = peores.index(dep) + 1
        unidades, fuentes = metas[c["indicador"]]["unidad"], metas[c["indicador"]]["fuente"]
        salida.append({
            "id": c["id"], "tema": c["tema"], "etiqueta": c["etiqueta"], "indicador_terridata": c["indicador"],
            "sentido": c["sentido"], "ceros": c["ceros"] == "si",
            "unidad": sorted(unidades)[0], "fuente": " / ".join(sorted(fuentes)),
            "anio": ultimo, "huila": dep, "colombia": serie_col.get(ultimo),
            "puesto_dep": puesto_dep, "n_dep": len(deps),
            "mediana_andina": mediana([v for k, v in nacional.items() if k[:2] in ANDINA]),
            "n_andina": sum(1 for k in nacional if k[:2] in ANDINA),
            "nacional": sorted(round(v, 4) for v in nacional.values()),
            "nacional_cod": {k: round(v, 4) for k, v in nacional.items() if k.startswith("41")},
            "serie_huila": serie_dep, "serie_colombia": serie_col,
            "serie_municipios": {k: municipios[k] for k in huila},
        })
        print(f"  {c['id']}: {ultimo} · Huila {dep} · Colombia {serie_col.get(ultimo)} · "
              f"{len(nacional)} municipios · puesto {puesto_dep}/{len(deps)}")

    (RAIZ / "datos" / "salida" / "terridata_indicadores.json").write_text(
        json.dumps(salida, ensure_ascii=False, indent=0), "utf-8")


if __name__ == "__main__":
    main()
