"""Resultados de otras elecciones en el Huila, por municipio, para la pestaña
Transferencia del voto.

Entradas (sin modificar), en datos/crudos/registraduria/:
- territoriales_2015/Huila.txt: resultados mesa a mesa de las territoriales
  2015. La Registraduría solo los publica dentro de un instalador de Windows
  (2015_ELECCIONES_TERRITORIALES.zip → setupEstadisticas.exe); el archivo se
  extrajo sin cambios con innoextract (ver fuentes.md). Elegidos.txt sirve de
  control.
- MMV_CONGRESO_2022_HUILA.zip: Cámara (circunscripción departamental) y
  Senado (circunscripción nacional) 2022. SHA-256 verificado contra el HASH
  incluido en el ZIP.
- congreso_2026/: escrutinio del Congreso 2026. MMV_9999_ESCRUTINIO_HUILA.csv.gz
  son las filas del Huila (departamento 19) de MMV_9999.csv copiadas byte a
  byte; el archivo nacional (9,7 GB) no se versiona. Se verifica el SHA-256
  del extracto contra manifiesto.csv, el del archivo nacional del manifiesto
  contra HASH_MMV_9999.txt oficial y los archivos básicos (partidos) contra
  su HASH.txt. Si el extracto falta, se rehace con la variable de entorno
  CONGRESO2026_ZIP apuntando a MMV_CONGRESO_2026.zip.
- presidencial/: presidenciales 2022 y 2026, 1.ª y 2.ª vuelta (los mismos
  archivos oficiales que usa el tablero de Bogotá). En 2026 se usa el
  escrutinio, con SHA-256 verificado contra su HASH; el preconteo no se usa.

Salida: datos/salida/elecciones_huila_municipio.csv
  eleccion, anio, corporacion, cod_divipola, opcion, votos
  opcion = partido (corporaciones) o candidato (presidencial y
  Gobernación/Alcaldía 2015, con su partido), más __BLANCO__, __NULOS__ y
  __NO_MARCADOS__. 2019 y 2023 se toman de las salidas de
  02_resultados_territoriales.py.
Salida: datos/salida/presidencial_colombia.csv
  eleccion, opcion, votos: total nacional (todos los departamentos y el
  exterior) de cada presidencial, para comparar el Huila con Colombia.
"""
import csv
import gzip
import hashlib
import os
import io
import re
import sys
import unicodedata
import zipfile
from collections import defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "registraduria"
ESP = {"996": "__BLANCO__", "997": "__NULOS__", "998": "__NO_MARCADOS__"}


def norm(s: str) -> str:
    s = unicodedata.normalize("NFKD", s).encode("ascii", "ignore").decode()
    s = re.sub(r"\(.*?\)", "", s)
    return re.sub(r"\s+", " ", s).strip().upper()


def catalogo():
    with (RAIZ / "datos" / "catalogos" / "homologacion_registraduria_divipola_huila.csv").open(encoding="utf-8") as f:
        filas = list(csv.DictReader(f))
    por_cod = {r["cod_registraduria"]: r["cod_divipola"] for r in filas}
    por_nombre = {}
    for r in filas:
        for k in ("nombre_registraduria_2019", "nombre_registraduria_2023", "municipio"):
            por_nombre[norm(r[k])] = r["cod_divipola"]
    return por_cod, por_nombre


def texto(b: bytes) -> str:
    return b.decode("utf-16") if b[:2] in (b"\xff\xfe", b"\xfe\xff") else b.decode("latin-1")


def hash_esperado(texto: str) -> str:
    return re.search(r"SHA-256\s*:\s*([0-9a-fA-F]{64})", texto).group(1).lower()


def sha_stream(f) -> str:
    h = hashlib.sha256()
    for b in iter(lambda: f.read(1 << 20), b""):
        h.update(b)
    return h.hexdigest()


def t2015(por_nombre, salida):
    corp = {"GOBERNACION": "GOBERNADOR", "ASAMBLEA": "ASAMBLEA", "ALCALDIA": "ALCALDE", "CONCEJO": "CONCEJO"}
    votos = defaultdict(int)
    cand = defaultdict(int)
    ruta = CRUDOS / "territoriales_2015" / "Huila.txt"
    with ruta.open(encoding="latin-1", newline="") as f:
        for r in csv.DictReader(f, delimiter=";"):
            if r["corporacion"] not in corp:
                continue  # JAL: su unidad es la comuna
            if r["desc_depto"] != "HUILA":
                sys.exit(f"Fila fuera del Huila: {r}")
            cod = por_nombre.get(norm(r["desc_mpio"]))
            if not cod:
                sys.exit(f"Municipio sin homologar: {r['desc_mpio']}")
            c = corp[r["corporacion"]]
            v = int(r["votos"])
            if r["partido"] in ESP:
                op = ESP[r["partido"]]
            else:
                partido = r["desc_partido"].strip()
                if c in ("GOBERNADOR", "ALCALDE"):
                    op = f"{r['desc_candidato'].strip()}|{partido}"
                    cand[(c, r["desc_candidato"].strip())] += v
                else:
                    op = partido
                    cand[(c, r["desc_candidato"].strip(), partido)] += v
            votos[(c, cod, op)] += v
    # Control contra el archivo oficial de elegidos: gobernador y diputados electos.
    with (CRUDOS / "territoriales_2015" / "Elegidos.txt").open(encoding="latin-1", newline="") as f:
        elegidos = [r for r in csv.DictReader(f, delimiter=";") if r["departamento"] == "HUILA"
                    and r["corporacion"] in ("GOBERNACION", "ASAMBLEA")]
    for e in elegidos:
        if e["corporacion"] == "GOBERNACION":
            obtenido = cand[("GOBERNADOR", e["nombre"].strip())]
        else:
            obtenido = cand[("ASAMBLEA", e["nombre"].strip(), e["desc_partido"].strip())]
        if obtenido != int(e["votos"]):
            sys.exit(f"2015 {e['corporacion']} {e['nombre']}: {obtenido} != elegidos {e['votos']}")
    print(f"OK 2015: {len(elegidos)} elegidos de Gobernación y Asamblea cuadran voto a voto")
    for (c, cod, op), v in votos.items():
        salida.append(("t2015_" + c, 2015, c, cod, op, v))


def congreso2022(por_cod, salida):
    with zipfile.ZipFile(CRUDOS / "MMV_CONGRESO_2022_HUILA.zip") as z:
        nombre = next(n for n in z.namelist() if n.endswith(".csv"))
        esperado = hash_esperado(texto(z.read(next(n for n in z.namelist() if "HASH_" in n))))
        with z.open(nombre) as f:
            if sha_stream(f) != esperado:
                sys.exit("SHA-256 de Congreso 2022 no coincide")
        votos = defaultdict(int)
        crudo = defaultdict(int)
        with z.open(nombre) as f:
            for r in csv.DictReader(io.TextIOWrapper(f, encoding="utf-16")):
                c = r["Nombre Corporación"]
                circ = r["Nombre Circunscripción"]
                # Solo la circunscripción ordinaria: Cámara departamental y Senado nacional.
                if (c, circ) not in (("CAMARA", "DEPARTAMENTAL"), ("SENADO", "NACIONAL")):
                    continue
                cc = r["Código Candidato"].lstrip("0")
                op = ESP[cc] if r["Código Partido"].strip("0") == "" and cc in ESP else r["Nombre Partido"].strip()
                v = int(r["Total Votos"])
                votos[(c, por_cod[r["Código Municipio"]], op)] += v
                crudo[c] += v
    for c, t in crudo.items():
        if sum(v for (cc, _, _), v in votos.items() if cc == c) != t:
            sys.exit("Congreso 2022: agregado distinto del crudo")
        especiales = sum(v for (cc, _, op), v in votos.items() if cc == c and op.startswith("__"))
        print(f"OK Congreso 2022 {c}: {t} votos, {especiales} en blanco, nulos o no marcados")
    for (c, cod, op), v in votos.items():
        salida.append((f"c2022_{c}", 2022, c, cod, op, v))


def congreso2026(por_cod, salida):
    carpeta = CRUDOS / "congreso_2026"
    man = {r["archivo"]: r for r in csv.DictReader((carpeta / "manifiesto.csv").open(encoding="utf-8"))}
    extracto = carpeta / "MMV_9999_ESCRUTINIO_HUILA.csv.gz"
    oficial = hash_esperado(texto((carpeta / "HASH_MMV_9999.txt").read_bytes()))
    if man["MMV_9999.csv"]["sha256"] != oficial:
        sys.exit("Congreso 2026: el SHA-256 del manifiesto no es el de HASH_MMV_9999.txt")
    if not extracto.exists():
        # Rehacer el extracto desde el ZIP oficial (521 MB), verificando el archivo nacional completo.
        zip_ruta = os.environ.get("CONGRESO2026_ZIP")
        if not zip_ruta:
            sys.exit("Falta el extracto del Congreso 2026: defina CONGRESO2026_ZIP (ver manifiesto.csv)")
        h = hashlib.sha256()
        with zipfile.ZipFile(zip_ruta) as z, zipfile.ZipFile(z.open("MMV_CONGRESO_2026/mmvESCRUTINIOCongreso2026.zip")) as ze, \
                ze.open("MMV_9999.csv") as f, gzip.GzipFile(extracto, "wb", 9, mtime=0) as g:
            for linea in f:
                h.update(linea)
                if linea.startswith(b"9999;19;"):
                    g.write(linea)
        if h.hexdigest() != oficial:
            extracto.unlink()
            sys.exit("Congreso 2026: SHA-256 del escrutinio nacional no coincide con HASH_MMV_9999.txt")
    with gzip.open(extracto, "rb") as f:
        if sha_stream(f) != man["MMV_9999_ESCRUTINIO_HUILA.csv (dentro del .gz)"]["sha256"]:
            sys.exit("Congreso 2026: SHA-256 del extracto del Huila no coincide con el manifiesto")
    with zipfile.ZipFile(carpeta / "ArchivosBasicosDiaElectoralCOngreso2026.zip") as zb:
        hashes = texto(zb.read(next(n for n in zb.namelist() if n.endswith("HASH.txt"))))
        arch = next(n for n in zb.namelist() if "PARTIDOS" in n.upper())
        crudo = zb.read(arch)
        bloque = hashes.split(Path(arch).name, 1)[1]
        if hashlib.sha256(crudo).hexdigest() != hash_esperado(bloque):
            sys.exit("Congreso 2026: SHA-256 de PARTIDOS no coincide con HASH.txt")
        partidos = {l[:5]: l[5:205].strip() for l in crudo.decode("latin-1").splitlines() if len(l) > 5}
    # corporación 001 Senado circunscripción 0 (nacional); 002 Cámara circunscripción 1 (departamental).
    # Se excluyen indígenas (4), afro (5), CITREP y consultas, igual que en 2022.
    corp = {("001", "0"): "SENADO", ("002", "1"): "CAMARA"}
    votos = defaultdict(int)
    crudo_tot = defaultdict(int)
    with gzip.open(extracto, "rt", encoding="latin-1", newline="") as f:
        for linea in f:
            p = linea.rstrip("\r\n").split(";")
            c = corp.get((p[7], p[8]))
            if not c:
                continue
            partido, cand, v = p[9].zfill(5), p[10], int(p[11])
            if cand in ESP:
                op = ESP[cand]
            elif partido in partidos:
                op = partidos[partido]
            else:
                sys.exit(f"Congreso 2026: partido sin nombre {partido}")
            votos[(c, por_cod[p[2]], op)] += v
            crudo_tot[c] += v
    for c, t in sorted(crudo_tot.items()):
        if sum(v for (cc, _, _), v in votos.items() if cc == c) != t:
            sys.exit("Congreso 2026: agregado distinto del crudo")
        especiales = sum(v for (cc, _, op), v in votos.items() if cc == c and op.startswith("__"))
        print(f"OK Congreso 2026 {c} (escrutinio, SHA-256 verificado): {t} votos, {especiales} en blanco, nulos o no marcados")
    for (c, cod, op), v in votos.items():
        salida.append((f"c2026_{c}", 2026, c, cod, op, v))


def presidencial2022(por_cod, salida, nacional):
    for vuelta in ("1v", "2v"):
        votos = defaultdict(int)
        with zipfile.ZipFile(CRUDOS / "presidencial" / f"MMV_NACIONAL_PRESIDENTE_2022_{vuelta}.zip") as z:
            with z.open(z.namelist()[0]) as f:
                for r in csv.DictReader(io.TextIOWrapper(f, encoding="latin-1"), delimiter=";"):
                    cc = r["CAN"].lstrip("0")
                    op = ESP.get(cc) or f"{r['CANNOMBRE'].strip()}|{r['PARNOMBRE'].strip()}"
                    nacional[(f"p2022_{vuelta}", op)] += int(r["VOTOS"])
                    if r["DEP"] != "19":
                        continue
                    votos[(por_cod[r["MUN"]], op)] += int(r["VOTOS"])
        if len({k[0] for k in votos}) != 37:
            sys.exit(f"Presidencial 2022 {vuelta}: municipios distintos de 37")
        print(f"OK Presidencial 2022 {vuelta}: {sum(votos.values()):,} votos en el Huila".replace(",", "."))
        for (cod, op), v in votos.items():
            salida.append((f"p2022_{vuelta}", 2022, f"PRESIDENTE {vuelta.upper()}", cod, op, v))


def presidencial2026(por_cod, salida, nacional):
    for vuelta, archivo in (("1v", "MMV_Presidente1V_2026.zip"), ("2v", "MMV_Presidente2V_2026.zip")):
        with zipfile.ZipFile(CRUDOS / "presidencial" / archivo) as z:
            nombres = z.namelist()
            esc = next(n for n in nombres if n.endswith("ESCRUTINIO.csv") and "HASH" not in n)
            esperado = hash_esperado(texto(z.read(next(n for n in nombres if n.endswith("HASH_ficheros_MMV_4_MMV_9999_ESCRUTINIO.txt")))))
            with z.open(esc) as f:
                if sha_stream(f) != esperado:
                    sys.exit(f"SHA-256 del escrutinio 2026 {vuelta} no coincide")
            interno = next(n for n in nombres if re.search(r"(?i)archivosbasicos.*\.zip$", n))
            with zipfile.ZipFile(io.BytesIO(z.read(interno))) as zb:
                arch = next(n for n in zb.namelist() if "CANDIDATOS" in n.upper())
                nombres_cand = {}
                for linea in zb.read(arch).decode("latin-1").splitlines():
                    if len(linea) < 120:
                        continue
                    # corporación 3, circunscripción 1, depto 2, municipio 3, comuna 2, partido 5, candidato 3,
                    # preferente 1, nombre 50, apellido 50 (Estructuras Básicas, Registraduría)
                    partido, cand = linea[11:16], linea[16:19]
                    nombres_cand[(partido, cand)] = f"{linea[20:70].strip()} {linea[70:120].strip()}"
                arch = next(n for n in zb.namelist() if "PARTIDOS" in n.upper())
                partidos = {l[:5]: l[5:205].strip() for l in zb.read(arch).decode("latin-1").splitlines() if len(l) > 5}
            votos = defaultdict(int)
            with z.open(esc) as f:
                for linea in io.TextIOWrapper(f, encoding="latin-1"):
                    p = linea.rstrip("\r\n").split(";")
                    partido, cand = p[9].zfill(5), p[10]
                    if cand in ESP:
                        op = ESP[cand]
                    else:
                        if (partido, cand) not in nombres_cand:
                            sys.exit(f"Candidato 2026 sin nombre: {partido} {cand}")
                        op = f"{nombres_cand[(partido, cand)]}|{partidos.get(partido, '')}"
                    nacional[(f"p2026_{vuelta}", op)] += int(p[11])
                    if p[1] != "19":
                        continue
                    votos[(por_cod[p[2]], op)] += int(p[11])
        if len({k[0] for k in votos}) != 37:
            sys.exit(f"Presidencial 2026 {vuelta}: municipios distintos de 37")
        print(f"OK Presidencial 2026 {vuelta}: SHA-256 verificado; {sum(votos.values()):,} votos en el Huila".replace(",", "."))
        for (cod, op), v in votos.items():
            salida.append((f"p2026_{vuelta}", 2026, f"PRESIDENTE {vuelta.upper()}", cod, op, v))


def territoriales_existentes(salida):
    esp = {"00996": "__BLANCO__", "00997": "__NULOS__", "00998": "__NO_MARCADOS__"}
    for anio in (2019, 2023):
        votos = defaultdict(int)
        with (RAIZ / "datos" / "salida" / f"territoriales_{anio}_municipio_candidato.csv").open(encoding="utf-8") as f:
            for r in csv.DictReader(f):
                c, cc = r["corporacion"], r["cod_candidato"]
                if cc in esp:
                    op = esp[cc]
                elif c in ("GOBERNADOR", "ALCALDE"):
                    if cc == "00000":
                        continue  # no hay voto solo por partido en cargos uninominales
                    op = f"{r['candidato']}|{r['partido']}"
                else:
                    op = r["partido"]
                votos[(c, r["cod_divipola"], op)] += int(r["votos"])
        for (c, cod, op), v in votos.items():
            salida.append((f"t{anio}_{c}", anio, c, cod, op, v))


def main():
    por_cod, por_nombre = catalogo()
    salida = []
    t2015(por_nombre, salida)
    territoriales_existentes(salida)
    congreso2022(por_cod, salida)
    congreso2026(por_cod, salida)
    nacional = defaultdict(int)
    presidencial2022(por_cod, salida, nacional)
    presidencial2026(por_cod, salida, nacional)
    # Control del total nacional: escrutinio de la 2.ª vuelta 2022 anunciado por el registrador al entregar
    # la credencial (EFE, 23-jun-2022): Petro 11.292.758 y Hernández 10.604.656. Ojo: 11.281.013 es el preconteo.
    for e, cand, oficial in (("p2022_2v", "GUSTAVO PETRO", 11292758), ("p2022_2v", "RODOLFO HERNANDEZ", 10604656)):
        obt = sum(v for (ee, op), v in nacional.items() if ee == e and norm(op.split("|")[0]).startswith(cand))
        if obt != oficial:
            sys.exit(f"{e} {cand}: total nacional {obt} != escrutinio oficial {oficial}")
    print("OK total nacional 2.ª vuelta 2022 = escrutinio oficial (Petro y Hernández)")
    with (RAIZ / "datos" / "salida" / "presidencial_colombia.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["eleccion", "opcion", "votos"])
        w.writerows(sorted((e, op, v) for (e, op), v in nacional.items()))
    for e in sorted({s[0] for s in salida}):
        n = len({s[3] for s in salida if s[0] == e})
        if n != 37:
            sys.exit(f"{e}: {n} municipios")
    salida.sort()
    with (RAIZ / "datos" / "salida" / "elecciones_huila_municipio.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.writer(f)
        w.writerow(["eleccion", "anio", "corporacion", "cod_divipola", "opcion", "votos"])
        w.writerows(salida)
    print(f"OK {len(salida)} filas, {len({s[0] for s in salida})} elecciones")


if __name__ == "__main__":
    main()
