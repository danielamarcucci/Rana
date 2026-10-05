"""Capas CNPV 2018 del Geoportal DANE para TODOS los municipios del país.

Las mismas capas de 03_descargar_dane.py, pero sin filtrar por departamento,
para poder ubicar a cada municipio del Huila frente a los ~1.100 del país en
el módulo Caracterización. Cada respuesta se guarda tal cual (una por página)
en datos/crudos/dane/geoportal_nacional/ y se registra en manifiesto.csv.

Salida: datos/salida/dane_cnpv_nacional.json
"""
import csv
import datetime as dt
import hashlib
import json
import statistics
import subprocess
import sys
import urllib.parse
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
DESTINO = RAIZ / "datos" / "crudos" / "dane" / "geoportal_nacional"
BASE = "https://geoportal.dane.gov.co/mparcgis/rest/services"
ANDINA = {"05", "11", "15", "17", "25", "41", "54", "63", "66", "68", "73"}

CAPAS = {
    "poblacion_total_2018": ("INDICADORES_DE_POBLACION/Serv_Mpios_DistribucionPoblacionTotalCen_2018", 4, "MPIO_CCDGO", ["CL0_TT_PERSN"]),
    "poblacion_rural_disperso_2018": ("INDICADORES_DE_POBLACION/Serv_Mpios_DistribucionPoblacion_RuralDisper_2018", 4, "MPIO_CCDGO", ["CL3_TT_PERSN"]),
    "indice_envejecimiento_2018": ("INDICADORES_DE_POBLACION/Serv_Mpios_IndEnvejecim60ymas_Total_2018", 4, "MPIO_CCDGO", ["CL0_INDENVJ60MAS"]),
    "indice_juventud_2018": ("INDICADORES_DE_POBLACION/Serv_Mpios_IndJuventud_Total_2018", 4, "MPIO_CCDGO", ["CL0_INDJUVT"]),
    "grupos_etnicos_2018": ("INDICADORES_GRUPOS_ETNICOS/Serv_Mpios_PoblacionIndigena_2018", 4, "U_MPIO",
                            ["PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_1", "PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_5"]),
}
# id, etiqueta, unidad, capa, campo (None = cálculo propio)
INDICADORES = [
    ("rural", "Población en zona rural dispersa", "% de las personas censadas", "poblacion_rural_disperso_2018", None),
    ("envejecimiento", "Índice de envejecimiento", "personas de 60+ por cada 100 menores de 15", "indice_envejecimiento_2018", "CL0_INDENVJ60MAS"),
    ("juventud", "Índice de juventud", "% de la población de 14 a 26 años", "indice_juventud_2018", "CL0_INDJUVT"),
    ("indigena", "Población que se reconoce indígena", "% de las personas", "grupos_etnicos_2018", "PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_1"),
    ("afro", "Población negra, afrocolombiana, raizal o palenquera", "% de las personas", "grupos_etnicos_2018", "PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_5"),
]


def curl_json(url: str) -> bytes:
    r = subprocess.run(["curl", "-sS", "-f", "-m", "180", url], capture_output=True, check=True)
    json.loads(r.stdout)
    return r.stdout


def descargar(ident, servicio, capa, cod, campos, manifiesto):
    filas, offset, pagina = {}, 0, 0
    while True:
        params = {"where": "1=1", "outFields": ",".join([cod] + campos), "returnGeometry": "false",
                  "orderByFields": cod, "resultOffset": offset, "resultRecordCount": 1000, "f": "json"}
        url = f"{BASE}/{servicio}/MapServer/{capa}/query?" + urllib.parse.urlencode(params)
        crudo = curl_json(url)
        datos = json.loads(crudo)
        if "error" in datos:
            sys.exit(f"{ident}: {datos['error']}")
        ruta = DESTINO / f"{ident}_p{pagina}.json"
        ruta.write_bytes(crudo)
        manifiesto.append({"archivo": ruta.name, "url": url, "fecha_consulta": dt.date.today().isoformat(),
                           "sha256": hashlib.sha256(crudo).hexdigest()})
        for ft in datos["features"]:
            a = ft["attributes"]
            filas[a[cod]] = a
        if not datos.get("exceededTransferLimit") and len(datos["features"]) < 1000:
            break
        offset += 1000
        pagina += 1
    return filas


def main():
    DESTINO.mkdir(parents=True, exist_ok=True)
    manifiesto, capas = [], {}
    for ident, (servicio, capa, cod, campos) in CAPAS.items():
        capas[ident] = descargar(ident, servicio, capa, cod, campos, manifiesto)
        n_huila = sum(1 for k in capas[ident] if k.startswith("41"))
        print(f"OK {ident}: {len(capas[ident])} municipios ({n_huila} del Huila)")
        if n_huila != 37 or len(capas[ident]) < 1100:
            sys.exit("Cobertura inesperada")
    with (DESTINO / "manifiesto.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(manifiesto[0]))
        w.writeheader()
        w.writerows(manifiesto)

    total = capas["poblacion_total_2018"]
    salida = []
    for ident, etiqueta, unidad, capa, campo in INDICADORES:
        if campo is None:
            rural = capas[capa]
            vals = {k: 100 * rural[k]["CL3_TT_PERSN"] / total[k]["CL0_TT_PERSN"]
                    for k in rural if k in total and total[k]["CL0_TT_PERSN"]}
        else:
            vals = {k: a[campo] for k, a in capas[capa].items() if a.get(campo) is not None}
        salida.append({
            "id": ident, "tema": "Caracterización", "etiqueta": etiqueta, "sentido": "contexto", "ceros": False,
            "unidad": unidad, "fuente": "DANE - Censo Nacional de Población y Vivienda 2018 (Geoportal DANE)",
            "anio": 2018, "huila": None, "colombia": None, "puesto_dep": None, "n_dep": 0,
            "mediana_andina": round(statistics.median(v for k, v in vals.items() if k[:2] in ANDINA), 4),
            "n_andina": sum(1 for k in vals if k[:2] in ANDINA),
            "nacional": sorted(round(v, 4) for v in vals.values()),
            "nacional_cod": {k: round(v, 4) for k, v in vals.items() if k.startswith("41")},
            "serie_huila": {}, "serie_colombia": {},
            "serie_municipios": {k: {"2018": round(v, 4)} for k, v in vals.items() if k.startswith("41")},
            "nota": "Dato censal municipal. El geoportal no publica el valor del departamento ni de Colombia en esta capa.",
        })
    (RAIZ / "datos" / "salida" / "dane_cnpv_nacional.json").write_text(json.dumps(salida, ensure_ascii=False, indent=0), "utf-8")


if __name__ == "__main__":
    main()
