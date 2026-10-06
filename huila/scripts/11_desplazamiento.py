"""Desplazamiento forzado por 1.000 habitantes (2024-2025), todos los municipios.

Fuente: Unidad para la Atención y Reparación Integral a las Víctimas (UARIV),
Registro Único de Víctimas / Red Nacional de Información, publicado en
datos.gov.co:
- krnc-8azs "REPORTE VICTIMAS DESPLAZAMIENTO ANUALIZADO OCURRENCIA Y LLEGADA
  MUNICIPALES" (una fila por municipio, vigencia, sexo, etnia, discapacidad y
  ciclo vital; medidas per_ocu, per_llegada, eventos).
- e29y-pi4y "... CIFRA NACIONAL" (misma estructura sin municipio), solo para
  contrastar.
Ambos datasets acumulan varios cortes mensuales; se usa solo el corte más
reciente al consultar: fecha_corte = '31/08/2026'. La agregación se hace en
el servidor con SoQL y la respuesta se guarda tal cual en datos/crudos/uariv/.

Decisiones:
- Medida: `per_ocu` = personas víctimas de desplazamiento forzado según el
  municipio donde OCURRIÓ el hecho y el año (vigencia) del hecho. No se usan
  `eventos` (un mismo desplazado puede tener varios eventos) ni `per_llegada`
  (municipio receptor).
- Numerador = per_ocu 2024 + per_ocu 2025. Una persona desplazada en ambos
  años, o en dos municipios, cuenta una vez por cada municipio-año; por eso la
  suma municipal supera ligeramente la cifra nacional de personas únicas
  (se reporta la diferencia).
- Denominador: población DANE proyectada 2025 (poblacion_municipal_nacional).
- Municipio sin registros = 0: el RUV es un registro nacional.
- Filas con municipio "SIN DEFINIR" (código 0) o con un código que ya no
  existe en la DIVIPOLA (99572 Santa Rita, Vichada: 1 persona en 2024) no se
  pueden ubicar en un municipio del universo: se reportan, no se asignan.
- Chequeo: la suma de `eventos` municipales debe ser igual a la del reporte
  nacional para el mismo corte y años.

Salidas: datos/salida/conflicto/desplazamiento_2024_2025.csv y .meta.json
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
CRUDOS = RAIZ / "datos" / "crudos" / "uariv"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
POBLACION = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"

MUNICIPAL, NACIONAL = "krnc-8azs", "e29y-pi4y"
CORTE = "31/08/2026"
ANIO_POB = "2025"
ID = "desplazamiento_2024_2025"
# Códigos del RUV que no existen en la DIVIPOLA vigente (DANE 2018-2030). No se
# reasignan a otro municipio (sería una aproximación): se reportan y quedan fuera.
# 99572 "Santa Rita": antiguo corregimiento departamental de Vichada, hoy sin
# código propio en la DIVIPOLA.
NO_HOMOLOGABLES = {"00000", "99572"}

CONSULTAS = {
    "desplazamiento_ocurrencia_municipio_2024_2025.json": (MUNICIPAL, {
        "$select": "cod_estado_depto, cod_ciudad_muni, ciudad_municipio, vigencia, "
                   "sum(per_ocu) as personas_ocurrencia, sum(eventos) as eventos",
        "$where": f"fecha_corte='{CORTE}' AND vigencia in (2024, 2025)",
        "$group": "cod_estado_depto, cod_ciudad_muni, ciudad_municipio, vigencia",
        "$order": "cod_ciudad_muni, vigencia", "$limit": "50000"}),
    "desplazamiento_cortes_municipal.json": (MUNICIPAL, {
        "$select": "fecha_corte, count(*) as filas", "$group": "fecha_corte",
        "$order": "fecha_corte", "$limit": "1000"}),
    # En el reporte nacional per_ocu y eventos son texto: se baja el detalle y se suma aquí.
    "desplazamiento_nacional_2024_2025.json": (NACIONAL, {
        "$select": "vigencia, sexo, etnia, discapacidad, ciclo_vital, per_ocu, eventos",
        "$where": f"fecha_corte='{CORTE}' AND vigencia in ('2024', '2025')",
        "$limit": "50000"}),
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
    for nombre, (ident, params) in CONSULTAS.items():
        url = f"https://www.datos.gov.co/resource/{ident}.json?" + urllib.parse.urlencode(params)
        destino = CRUDOS / nombre
        if destino.exists() and nombre in previo:
            fila = previo[nombre]
            if sha(destino) != fila["sha256"]:
                sys.exit(f"{nombre}: el SHA-256 no coincide con el manifiesto")
        else:
            subprocess.run(["curl", "-sS", "-f", "-m", "600", "-o", str(destino), url], check=True)
            fila = {"archivo": nombre, "dataset": ident, "url": url,
                    "fecha_consulta": dt.date.today().isoformat(), "sha256": sha(destino)}
        filas.append(fila)
    with manif.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    return filas


def leer(nombre: str):
    return json.loads((CRUDOS / nombre).read_text("utf-8"))


def num(x) -> int:
    return int(float(x or 0))


def main() -> None:
    manifiesto = descargar()
    pob = {}
    with POBLACION.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["anio"] == ANIO_POB:
                pob[r["cod_divipola"]] = int(r["poblacion"])
    if len(pob) != 1123:
        sys.exit(f"Universo con {len(pob)} municipios, se esperaban 1.123")

    cortes = [c["fecha_corte"] for c in leer("desplazamiento_cortes_municipal.json")]
    posteriores = [c for c in cortes if len(c) == 10 and c[6:] + c[3:5] > CORTE[6:] + CORTE[3:5]]
    if posteriores:
        print(f"AVISO: hay cortes posteriores a {CORTE}: {posteriores}")

    personas, eventos_mun = {}, 0
    por_anio = {"2024": 0, "2025": 0}
    sin_ubicar = []
    for d in leer("desplazamiento_ocurrencia_municipio_2024_2025.json"):
        p, e = num(d.get("personas_ocurrencia")), num(d.get("eventos"))
        eventos_mun += e
        cod = str(d.get("cod_ciudad_muni") or "").zfill(5)
        if cod not in pob:
            sin_ubicar.append((d.get("cod_estado_depto"), d.get("cod_ciudad_muni"),
                               d.get("ciudad_municipio"), d["vigencia"], p))
            continue
        personas[cod] = personas.get(cod, 0) + p
        por_anio[d["vigencia"]] += p
    for s in sin_ubicar:
        if str(s[1] or "").zfill(5) not in NO_HOMOLOGABLES:
            sys.exit(f"Código de municipio fuera del universo DANE: {s}")
        print(f"No homologado (no asignado): depto={s[0]} muni={s[1]} {s[2]} {s[3]}: {s[4]} personas")

    nac_p, nac_e = {"2024": 0, "2025": 0}, 0
    for d in leer("desplazamiento_nacional_2024_2025.json"):
        nac_p[d["vigencia"]] += num(d.get("per_ocu"))
        nac_e += num(d.get("eventos"))
    if nac_e != eventos_mun:
        sys.exit(f"Eventos: municipal {eventos_mun} != nacional {nac_e}")
    for a in ("2024", "2025"):
        print(f"{a}: suma municipal {por_anio[a]} personas vs nacional (personas únicas) {nac_p[a]}"
              f" ({(por_anio[a] / nac_p[a] - 1) * 100:+.1f}%)")
        if not 0 <= por_anio[a] - nac_p[a] <= 0.03 * nac_p[a]:
            sys.exit("La suma municipal no cuadra con el reporte nacional")

    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / f"{ID}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["cod_divipola", "anio", "valor", "numerador", "denominador"])
        for cod in sorted(pob):
            n = personas.get(cod, 0)
            valor = round(n / pob[cod] * 1000, 2) if pob[cod] > 0 else ""
            if valor == "":
                print(f"AVISO {cod}: población {ANIO_POB} = 0, {n} personas; tasa vacía")
            w.writerow([cod, "2024-2025", valor, n, pob[cod]])
    total = sum(personas.values())
    print(f"OK {ID}.csv: {len(pob)} municipios, {total} personas, "
          f"tasa Colombia {total / sum(pob.values()) * 1000:.2f} por 1.000")

    meta = {
        "id": ID,
        "etiqueta": "Desplazamiento forzado por 1.000 hab. (2024-2025)",
        "descripcion": ("Personas víctimas de desplazamiento forzado en 2024 y 2025 según el "
                        "municipio donde ocurrió el hecho (Registro Único de Víctimas), por cada "
                        "1.000 habitantes (población DANE proyectada 2025)."),
        "unidad": "personas desplazadas por 1.000 habitantes",
        "sentido": "peor",
        "periodo": f"2024-2025 (años de ocurrencia), corte RUV {CORTE}",
        "institucion": "Unidad para las Víctimas (UARIV) – Red Nacional de Información",
        "base": ("Reporte víctimas desplazamiento anualizado ocurrencia y llegada, cifra "
                 "municipal (datos.gov.co krnc-8azs), medida per_ocu"),
        "enlace": f"https://www.datos.gov.co/d/{MUNICIPAL}",
        "fecha_consulta": manifiesto[0]["fecha_consulta"],
        "agregable": "tasa",
        "factor": 1000,
        "nota": ("Cuenta personas por municipio de ocurrencia y año: quien fue desplazado en "
                 "2024 y en 2025, o en dos municipios, cuenta más de una vez, por lo que la suma "
                 f"municipal supera a la nacional de personas únicas (2024: {por_anio['2024']} vs "
                 f"{nac_p['2024']}; 2025: {por_anio['2025']} vs {nac_p['2025']}). "
                 f"{sum(s[4] for s in sin_ubicar)} personas no se asignan a ningún municipio "
                 "(municipio 'SIN DEFINIR' o código 99572 Santa Rita, Vichada, que no existe en "
                 "la DIVIPOLA vigente). El RUV se actualiza con declaraciones tardías: los años recientes "
                 "pueden crecer en cortes posteriores. Municipio sin registros = 0 (registro "
                 "nacional). Mapiripana (ANM, 94663) tiene población DANE = 0: tasa vacía."),
        "sha256": {m["archivo"]: m["sha256"] for m in manifiesto},
    }
    (SALIDA / f"{ID}.meta.json").write_text(
        json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
