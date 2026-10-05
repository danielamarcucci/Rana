"""Descarga los indicadores municipales del Huila publicados por el DANE en su geoportal.

Fuente: servicios ArcGIS REST del Geoportal DANE (Censo Nacional de Población y
Vivienda 2018 salvo que se diga otra cosa). Cada consulta se guarda tal cual en
datos/crudos/dane/geoportal/<id>.json y se registra en
datos/crudos/dane/geoportal/manifiesto.csv con su URL exacta, fecha y SHA-256.

Se usa curl (no urllib) porque el geoportal bloquea el agente de Python.
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
DESTINO = RAIZ / "datos" / "crudos" / "dane" / "geoportal"
BASE = "https://geoportal.dane.gov.co/mparcgis/rest/services"

# id, servicio, capa, campo de código de municipio, campos a conservar
CAPAS = [
    ("poblacion_total_2018", "INDICADORES_DE_POBLACION/Serv_Mpios_DistribucionPoblacionTotalCen_2018", 4, "MPIO_CCDGO", ["CL0_TT_PERSN"]),
    ("poblacion_rural_disperso_2018", "INDICADORES_DE_POBLACION/Serv_Mpios_DistribucionPoblacion_RuralDisper_2018", 4, "MPIO_CCDGO", ["CL3_TT_PERSN"]),
    ("indice_envejecimiento_2018", "INDICADORES_DE_POBLACION/Serv_Mpios_IndEnvejecim60ymas_Total_2018", 4, "MPIO_CCDGO", ["CL0_INDENVJ60MAS"]),
    ("indice_juventud_2018", "INDICADORES_DE_POBLACION/Serv_Mpios_IndJuventud_Total_2018", 4, "MPIO_CCDGO", ["CL0_INDJUVT"]),
    ("dependencia_65mas_2018", "INDICADORES_DE_POBLACION/Serv_Mpios_IndDependDemografica65ymas_Total_2018", 4, "MPIO_CCDGO", ["CL0_INDDEPDC_65MAS"]),
    ("ipm_2018", "INDICADORES_COND_DE_VIDA/Serv_Mpios_IndPobrezaMultidimensional_2018", 4, "MPIO_CCDGO", ["IPM"]),
    ("nbi_2018", "INDICADORES_COND_DE_VIDA/Serv_Mpios_NBI_PropPersonasEnNBI_Total_2018", 4, "MPIO_CCDGO", ["NBIC_Total_Prop_de_Personas_en_NBIPorc"]),
    ("miseria_2018", "INDICADORES_COND_DE_VIDA/Serv_Mpios_NBI_PropPersonasEnMiseria_Total_2018", 4, "MPIO_CCDGO", ["NBIC_Total_Prop_de_Personas_en_miseria"]),
    ("nbi_inasistencia_escolar_2018", "INDICADORES_COND_DE_VIDA/Serv_Mpios_NBI_ComponenteInasistenciaEscolar_Total_2018", 4, "MPIO_CCDGO", ["NBIC_Total_PP_Comp_Inasistencia"]),
    ("deficit_habitacional_2018", "INDICADORES_COND_DE_VIDA/Serv_Mpios_DeficitHab_DeficitHabitacional_2018", 4, "MPIO_CCDGO", ["PC_dvhabitat", "N_dvhabitat"]),
    ("deficit_cuantitativo_2018", "INDICADORES_COND_DE_VIDA/Serv_Mpios_DeficitHab_DeficitVivCuantitativo_2018", 4, "MPIO_CCDGO", ["PC_dvcuanti"]),
    ("deficit_cualitativo_2018", "INDICADORES_COND_DE_VIDA/Serv_Mpios_DeficitHab_DeficitVivCualitativo_2018", 4, "MPIO_CCDGO", ["PC_dvcuali"]),
    ("cobertura_acueducto_2018", "INDICADORES_VIVIENDA/Serv_Mpios_CoberturaAcueducto_Ano_2018", 1, "MPIO_CCDGO", ["CL0_AC_TU1", "CL0_AC_TU2"]),
    ("cobertura_alcantarillado_2018", "INDICADORES_VIVIENDA/Serv_Mpios_CoberturaAlcantarillado_Ano_2018", 5, "MPIO_CCDGO", ["CL0_AL_PP1"]),
    ("cobertura_energia_2018", "INDICADORES_VIVIENDA/Serv_Mpios_CoberturaEnergia_Ano_2018", 5, "MPIO_CCDGO", ["CL0_EE_PP1"]),
    ("cobertura_gas_2018", "INDICADORES_VIVIENDA/Serv_Mpios_CoberturaGas_Ano_2018", 5, "MPIO_CCDGO", ["CL0_GA_PP1"]),
    ("cobertura_internet_2018", "INDICADORES_VIVIENDA/Serv_Mpios_CoberturaInternet_Ano_2018", 5, "MPIO_CCDGO", ["CL0_IN_PP1"]),
    ("grupos_etnicos_2018", "INDICADORES_GRUPOS_ETNICOS/Serv_Mpios_PoblacionIndigena_2018", 4, "U_MPIO",
     ["TOTAL_UNIDADES_PA1_GRP_ETNIC_1", "PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_1",
      "TOTAL_UNIDADES_PA1_GRP_ETNIC_5", "PARTICIPACION_PORCENTUAL_PA1_GRP_ETNIC_5"]),
]


def curl_json(url: str) -> bytes:
    r = subprocess.run(["curl", "-sS", "-f", "-m", "120", url], capture_output=True, check=True)
    json.loads(r.stdout)  # falla si no es JSON
    return r.stdout


def main() -> None:
    DESTINO.mkdir(parents=True, exist_ok=True)
    hoy = dt.date.today().isoformat()
    manifiesto = []
    for ident, servicio, capa, campo_cod, campos in CAPAS:
        params = {
            "where": f"{campo_cod} LIKE '41%'",
            "outFields": ",".join([campo_cod] + campos),
            "returnGeometry": "false",
            "orderByFields": campo_cod,
            "f": "json",
        }
        url = f"{BASE}/{servicio}/MapServer/{capa}/query?" + urllib.parse.urlencode(params)
        crudo = curl_json(url)
        datos = json.loads(crudo)
        if "error" in datos:
            sys.exit(f"{ident}: {datos['error']}")
        n = len(datos.get("features", []))
        if n != 37:
            sys.exit(f"{ident}: {n} municipios, se esperaban 37")
        (DESTINO / f"{ident}.json").write_bytes(crudo)
        manifiesto.append({"id": ident, "url": url, "fecha_consulta": hoy,
                           "sha256": hashlib.sha256(crudo).hexdigest(), "municipios": n})
        print(f"OK {ident}: {n} municipios")

    with (DESTINO / "manifiesto.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(manifiesto[0]))
        w.writeheader()
        w.writerows(manifiesto)


if __name__ == "__main__":
    main()
