"""Agrega los resultados mesa a mesa (MMV) de la Registraduría por municipio del Huila.

Entradas (sin modificar):
  datos/crudos/registraduria/MMV_TERRITORIALES{2019,2023}_HUILA.zip
  datos/catalogos/homologacion_registraduria_divipola_huila.csv

Salida:
  datos/salida/territoriales_{anio}_municipio_candidato.csv
    una fila por año, corporación, municipio, partido y candidato, con la suma
    de votos de todas las mesas del municipio.

Antes de agregar se verifica el SHA-256 del CSV interno contra el archivo HASH
que trae el propio ZIP. Si no coincide, el script se detiene.

Gobernación, Asamblea, Alcaldía y Concejo. La JAL se excluye porque su unidad
es la comuna/corregimiento, no el municipio.
"""
import csv
import hashlib
import io
import re
import sys
import zipfile
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CORPORACIONES = {"GOBERNADOR", "ASAMBLEA", "ALCALDE", "CONCEJO"}
ESPECIALES = {"00996": "VOTOS EN BLANCO", "00997": "VOTOS NULOS", "00998": "VOTOS NO MARCADOS"}


def catalogo() -> dict:
    ruta = RAIZ / "datos" / "catalogos" / "homologacion_registraduria_divipola_huila.csv"
    with ruta.open(encoding="utf-8") as f:
        return {fila["cod_registraduria"]: fila for fila in csv.DictReader(f)}


def verificar_hash(z: zipfile.ZipFile, nombre_csv: str) -> str:
    nombre_hash = next(n for n in z.namelist() if n.startswith("HASH_"))
    texto = z.read(nombre_hash).decode("utf-16")
    esperado = re.search(r"SHA-256\s*:\s*([0-9a-f]{64})", texto).group(1)
    h = hashlib.sha256()
    with z.open(nombre_csv) as f:
        for bloque in iter(lambda: f.read(1 << 20), b""):
            h.update(bloque)
    if h.hexdigest() != esperado:
        sys.exit(f"SHA-256 no coincide para {nombre_csv}: {h.hexdigest()} != {esperado}")
    return esperado


def procesar(anio: int, cat: dict) -> None:
    zpath = RAIZ / "datos" / "crudos" / "registraduria" / f"MMV_TERRITORIALES{anio}_HUILA.zip"
    votos = defaultdict(int)
    total_crudo = defaultdict(int)
    with zipfile.ZipFile(zpath) as z:
        nombre_csv = next(n for n in z.namelist() if n.endswith(".csv"))
        sha = verificar_hash(z, nombre_csv)
        with z.open(nombre_csv) as f:
            for fila in csv.DictReader(io.TextIOWrapper(f, encoding="utf-8-sig")):
                corp = fila["Nombre Corporación"]
                if corp not in CORPORACIONES:
                    continue
                if fila["Código Departamento"] != "19":
                    sys.exit(f"Fila fuera del Huila: {fila}")
                cod_cand = fila["Código Candidato"]
                if fila["Código Partido"] == "00000" and cod_cand not in ESPECIALES:
                    sys.exit(f"Código especial desconocido: {fila}")
                partido = "" if cod_cand in ESPECIALES else fila["Nombre Partido"]
                clave = (corp, fila["Código Municipio"], fila["Código Partido"], partido,
                         cod_cand, fila["Nombre Candidato"])
                v = int(fila["Total Votos"])
                votos[clave] += v
                total_crudo[corp] += v

    filas = []
    for (corp, cod_reg, cod_par, partido, cod_cand, candidato), v in votos.items():
        m = cat[cod_reg]
        filas.append({
            "anio": anio, "corporacion": corp, "cod_divipola": m["cod_divipola"],
            "municipio": m["municipio"], "cod_partido": cod_par, "partido": partido,
            "cod_candidato": cod_cand, "candidato": candidato, "votos": v,
        })
    filas.sort(key=lambda r: (r["corporacion"], r["cod_divipola"], r["cod_partido"], r["cod_candidato"]))

    # Control: la suma agregada debe ser idéntica a la suma de todas las mesas.
    for corp, total in total_crudo.items():
        agregado = sum(r["votos"] for r in filas if r["corporacion"] == corp)
        if agregado != total:
            sys.exit(f"{anio} {corp}: agregado {agregado} != crudo {total}")
        municipios = {r["cod_divipola"] for r in filas if r["corporacion"] == corp}
        if len(municipios) != 37:
            sys.exit(f"{anio} {corp}: {len(municipios)} municipios, se esperaban 37")

    salida = RAIZ / "datos" / "salida" / f"territoriales_{anio}_municipio_candidato.csv"
    with salida.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    resumen = ", ".join(f"{c} {t:,}".replace(",", ".") for c, t in sorted(total_crudo.items()))
    print(f"OK {anio}: SHA-256 {sha[:12]}… verificado; {len(filas)} filas; {resumen}")


def main() -> None:
    cat = catalogo()
    for anio in (2019, 2023):
        procesar(anio, cat)


if __name__ == "__main__":
    main()
