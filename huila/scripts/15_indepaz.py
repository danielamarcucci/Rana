"""Indicadores de conflicto a partir del Observatorio de DDHH y Conflictividades
de Indepaz (Instituto de Estudios para el Desarrollo y la Paz), https://indepaz.org.co/

Fuentes (se guardan tal cual en datos/crudos/indepaz/, con SHA-256 en
datos/crudos/indepaz/manifiesto.csv; si el archivo ya existe NO se vuelve a
descargar, porque las páginas de Indepaz se actualizan en el mismo URL y el
dato debe quedar fijo en la versión consultada):

  lideres_2023.html            "Líderes sociales, defensores de DD.HH y firmantes de
                               acuerdo asesinados en 2023" (tabla HTML)
  lideres_2024_2025_2026.html  idem 2024, 2025 y 2026 (tres tablas de líderes y tres
                               de firmantes; 2026 con corte al 10/09/2026)
  masacres_2020_2026.html      "Masacres en Colombia durante el 2020 ... 2026"
                               (una tabla por año, con encabezado "N masacres en el AAAA")
  corredores_de_la_muerte_2025.pdf  "Los corredores de la muerte", Leonardo
                               González Perafán, agosto de 2025 (13 tablas
                               "Municipios y territorios clave", una por corredor)
  balance_2025.pdf             "Comunidades en medio de la violencia: balance 2025"
                               (solo para contrastar los totales anuales publicados)

Indicadores (datos/salida/conflicto/):

1. lideres_tierra_2023_2026: suma 2023-2026 de asesinatos de líderes sociales
   cuyo "Sector social" en la tabla de Indepaz es CAMPESINO, COMUNAL (juntas de
   acción comunal) o RECLAMANTE DE TIERRAS. Decisiones:
   - No se incluyen COMUNITARIO/COMUNITARIA (Indepaz lo distingue de COMUNAL),
     ni los firmantes del Acuerdo (tablas aparte, no son líderes sociales).
   - El año es el de la tabla de Indepaz; se verifica que coincida con la fecha.
   - Ausente = 0: el registro de Indepaz es nacional y solo lista municipios con casos.
   - Detalle auditable sin nombres de personas: lideres_indepaz_detalle.csv
     (todas las filas de líderes, con en_subconjunto si/no).
   - Se contrasta el número de filas por año con el total publicado por Indepaz
     (balance 2025: 2023=188, 2024=173, 2025=187). 2026 no tiene total
     publicado aparte; se informa el número de filas de la lista.

2. masacres_2024_2026: número de masacres (no de víctimas) 2024-2026. Se
   contrasta con el encabezado de cada año ("76 masacres en el 2024...",
   "78 ... 2025", "89 ... 2026 corte 11/09/2026"). En 2026 la página repite,
   debajo de la tabla completa, una tabla antigua con las 21 primeras masacres
   del año (columnas en otro orden); se verifica que esté contenida en la
   primera y se descarta. Ausente = 0 (registro nacional).

3. corredores_indepaz_2025: número de corredores (de los 13 del informe) en
   cuya tabla "Municipios y territorios clave" aparece el municipio. La
   transcripción de las tablas está en CORREDORES (abajo) con el texto de cada
   celda tal como sale del PDF; el script verifica que cada celda aparezca
   literalmente en el texto del PDF. Decisiones (no se aproxima):
   - Se excluyen entradas que no son municipios colombianos: El Plateado
     (corregimiento; El Tambo ya está en la misma celda), cuencas y cordilleras,
     Apure (Venezuela), Darién (Panamá), litoral ecuatoriano, Santa Rita (Vichada,
     no es municipio).
   - Se excluyen por ambiguas: "Pueblo Nuevo" (Magdalena no tiene un municipio
     con ese nombre; Pueblonuevo es de Córdoba y Puebloviejo de Magdalena) y
     "Santa Rosa" en Bolívar (corredor 3.12: existen Santa Rosa y Santa Rosa del Sur).
   - "Medio y litoral San Juan" (Chocó) = Medio San Juan + El Litoral del San Juan.
   - Calificativos como "(zona rural)", "(rural)", "(influencia)" cuentan el municipio.
   - Piamonte aparece en la fila de Putumayo pero es municipio del Cauca (único
     con ese nombre); Yondó aparece en la fila "Santander y Magdalena Medio" y es
     de Antioquia; Génova está en la fila "Risaralda – Quindío" y es del Quindío.
   - Ausente = 0 con la advertencia del propio informe: las tablas listan
     municipios clave, "no agotan la totalidad del fenómeno".

Solo librería estándar; requiere pdftotext (poppler) para el corredor.
"""
import csv
import hashlib
import html
import json
import re
import subprocess
import sys
import unicodedata
from collections import Counter, defaultdict
from pathlib import Path

RAIZ = Path(__file__).resolve().parent.parent
CRUDOS = RAIZ / "datos" / "crudos" / "indepaz"
SALIDA = RAIZ / "datos" / "salida" / "conflicto"
UNIVERSO = RAIZ / "datos" / "salida" / "poblacion_municipal_nacional.csv"
FECHA_CONSULTA = "2026-10-06"

FUENTES = {
    "lideres_2023.html": "https://indepaz.org.co/lideres-sociales-defensores-de-dd-hh-y-firmantes-de-acuerdo-asesinados-en-2023/",
    "lideres_2024_2025_2026.html": "https://indepaz.org.co/lideres-sociales-defensores-de-dd-hh-y-firmantes-de-acuerdo-asesinados-en-2024/",
    "masacres_2020_2026.html": "https://indepaz.org.co/informe-de-masacres-en-colombia-durante-el-2020-2021/",
    "corredores_de_la_muerte_2025.pdf": "https://indepaz.org.co/wp-content/uploads/2025/08/CORREDORES-DE-LA-MUERTE-.-Leonardo-Gonzalez-P.-Agosto-2025-1.pdf",
    "balance_2025.pdf": "https://indepaz.org.co/wp-content/uploads/2026/01/Comunidades-en-medio-de-la-violencia-balance-2025-2_compressed.pdf",
}
SHA_ESPERADO = {}  # se llena desde manifiesto.csv si existe

# Totales anuales publicados por Indepaz (balance 2025, serie 2016-2025; y
# encabezados de la página de masacres).
TOTAL_LIDERES_PUBLICADO = {2023: 188, 2024: 173, 2025: 187}
TOTAL_MASACRES_PUBLICADO = {2024: 76, 2025: 78, 2026: 89}

SUBCONJUNTO = {"CAMPESINO", "COMUNAL", "RECLAMANTE DE TIERRAS"}

# Alias de nombre de municipio (normalizado) -> nombre DANE (normalizado), por
# departamento DANE normalizado. Solo equivalencias inequívocas.
ALIAS = {
    ("norte de santander", "cucuta"): "san jose de cucuta",
    ("valle del cauca", "santiago de cali"): "cali",
    ("bolivar", "cartagena"): "cartagena de indias",
    ("narino", "tumaco"): "san andres de tumaco",
    ("narino", "magui payan"): "magui",
    ("tolima", "san sebastian de mariquita"): "mariquita",
    ("choco", "litoral del san juan"): "el litoral del san juan",
    ("choco", "el litoral del san juan"): "el litoral del san juan",
    ("bolivar", "carmen de bolivar"): "el carmen de bolivar",
    ("antioquia", "itagui"): "itagui",
    ("antioquia", "santa barbara"): "santa barbara",
    ("tolima", "lerida"): "lerida",
    ("tolima", "ibague"): "ibague",
    ("cauca", "patia"): "patia",
    ("cauca", "patia el bordo"): "patia",
    ("cundinamarca", "ubate"): "villa de san diego de ubate",
    ("valle del cauca", "buga"): "guadalajara de buga",
    ("sucre", "tolu"): "santiago de tolu",
    ("putumayo", "valle del guamuez"): "valle del guamuez",
    ("narino", "andes sotomayor"): "los andes",
    ("bogota d c", "bogota dc"): "bogota d c",
    ("bogota d c", "bogota"): "bogota d c",
    ("antioquia", "san andres de cuerquia"): "san andres de cuerquia",
    ("bolivar", "mompox"): "mompos",
    ("caldas", "risaralda"): "risaralda",
    ("antioquia", "carmen de viboral"): "el carmen de viboral",
    ("putumayo", "villa garzon"): "villagarzon",
    ("meta", "san luis de cubarral"): "cubarral",
    ("cauca", "piendamo"): "piendamo tunia",
    ("meta", "vista hermosa"): "vistahermosa",
    ("narino", "santa barbara iscuande"): "santa barbara",
    ("amazonas", "la pedrera"): "la pedrera anm",
    ("magdalena", "pueblo viejo"): "puebloviejo",
    ("magdalena", "cienega"): "cienaga",
    ("antioquia", "santa fe de antioquia"): "santafe de antioquia",
    # Localidad de Bogotá: el hecho ocurrió en el Distrito Capital.
    ("bogota d c", "ciudad bolivar"): "bogota d c",
}
# Departamento de la fuente (normalizado) -> departamento DANE (normalizado)
ALIAS_DPTO = {"bogota dc": "bogota d c", "bogota": "bogota d c"}
# Correcciones de departamento explícitas (municipio con nombre único en el país,
# asignado en la fuente a un departamento vecino que no lo tiene).
CORRIGE_DPTO = {("norte de santander", "cimitarra"): "santander"}

# ---------------------------------------------------------------- corredores
# (número de sección, nombre, [(fila "Departamento" del PDF, texto de la celda tal
#  cual en el PDF, [(departamento DANE, municipio DANE), ...])])
CORREDORES = [
    ("3.1", "Putumayo – Cauca – Micay – Pacífico", [
        ("Putumayo", "Puerto Asís, Puerto Guzmán, Villagarzón, Piamonte",
         [("Putumayo", "Puerto Asís"), ("Putumayo", "Puerto Guzmán"), ("Putumayo", "Villagarzón"), ("Cauca", "Piamonte")]),
        ("Cauca", "Argelia, El Plateado (corregimiento de El Tambo), Balboa, El Tambo, Patía, Sucre",
         [("Cauca", "Argelia"), ("Cauca", "Balboa"), ("Cauca", "El Tambo"), ("Cauca", "Patía"), ("Cauca", "Sucre")]),
        ("Cauca – Pacífico", "López de Micay, Timbiquí, Guapi",
         [("Cauca", "López de Micay"), ("Cauca", "Timbiquí"), ("Cauca", "Guapi")]),
        ("Nariño", "Policarpa, Barbacoas, El Charco",
         [("Nariño", "Policarpa"), ("Nariño", "Barbacoas"), ("Nariño", "El Charco")]),
        ("Intersección Cauca–Nariño– Putumayo", "Cordilleras y cuencas del río Caquetá, río Putumayo, río Micay y río Naya", []),
    ]),
    ("3.2", "Chocó – Eje Cafetero – Tolima (Cañón de las Garrapatas)", [
        ("Chocó", "Nóvita, San José del Palmar, Sipí, Medio y litoral San Juan",
         [("Chocó", "Nóvita"), ("Chocó", "San José del Palmar"), ("Chocó", "Sipí"), ("Chocó", "Medio San Juan"), ("Chocó", "El Litoral del San Juan")]),
        ("Valle del Cauca", "Bolívar, Trujillo, Riofrío, Roldanillo, El Dovio",
         [("Valle del Cauca", "Bolívar"), ("Valle del Cauca", "Trujillo"), ("Valle del Cauca", "Riofrío"), ("Valle del Cauca", "Roldanillo"), ("Valle del Cauca", "El Dovio")]),
        ("Risaralda – Quindío", "La Celia, Apía, Balboa, Belén de Umbría, Génova",
         [("Risaralda", "La Celia"), ("Risaralda", "Apía"), ("Risaralda", "Balboa"), ("Risaralda", "Belén de Umbría"), ("Quindío", "Génova")]),
        ("Tolima", "Líbano, Murillo, Venadillo, Mariquita",
         [("Tolima", "Líbano"), ("Tolima", "Murillo"), ("Tolima", "Venadillo"), ("Tolima", "Mariquita")]),
    ]),
    ("3.3", "Bajo Cauca – Nordeste antioqueño – Magdalena Medio", [
        ("Antioquia (Bajo Cauca)", "Tarazá, Cáceres, Valdivia, Caucasia, Ituango, Briceño, Nechí",
         [("Antioquia", m) for m in ("Tarazá", "Cáceres", "Valdivia", "Caucasia", "Ituango", "Briceño", "Nechí")]),
        ("Antioquia (Nordeste)", "Segovia, Remedios, Amalfi, Anorí, El Bagre, Yondó, Zaragoza",
         [("Antioquia", m) for m in ("Segovia", "Remedios", "Amalfi", "Anorí", "El Bagre", "Yondó", "Zaragoza")]),
        ("Bolívar (Magdalena Medio)", "Santa Rosa del Sur, Morales, Arenal, Cantagallo, Simití.",
         [("Bolívar", m) for m in ("Santa Rosa del Sur", "Morales", "Arenal", "Cantagallo", "Simití")]),
        ("Santander y Magdalena Medio", "Barrancabermeja, Yondó, Puerto Wilches",
         [("Santander", "Barrancabermeja"), ("Antioquia", "Yondó"), ("Santander", "Puerto Wilches")]),
    ]),
    ("3.4", "Sierra Nevada – La Guajira – Magdalena – Cesar (Caribe)", [
        ("Magdalena", "Santa Marta (zona rural), Ciénaga, Fundación, Sitionuevo y Pueblo Nuevo",
         [("Magdalena", "Santa Marta"), ("Magdalena", "Ciénaga"), ("Magdalena", "Fundación"), ("Magdalena", "Sitionuevo")]),
        ("La Guajira", "Dibulla, Riohacha, Maicao (influencia)",
         [("La Guajira", "Dibulla"), ("La Guajira", "Riohacha"), ("La Guajira", "Maicao")]),
        ("Cesar", "Valledupar, San Diego, La Paz",
         [("Cesar", "Valledupar"), ("Cesar", "San Diego"), ("Cesar", "La Paz")]),
    ]),
    ("3.5", "Catatumbo – Norte de Santander – Frontera con Venezuela", [
        ("Norte de Santander", "Tibú, El Tarra, Convención, Teorama, San Calixto, Hacarí",
         [("Norte de Santander", m) for m in ("Tibú", "El Tarra", "Convención", "Teorama", "San Calixto", "Hacarí")]),
        ("Norte de Santander", "Puerto Santander, Cúcuta (rural)",
         [("Norte de Santander", "Puerto Santander"), ("Norte de Santander", "San José de Cúcuta")]),
        ("Frontera binacional", "Apure (Estado de Amazonas de Venezuela)", []),
    ]),
    ("3.6", "Orinoquía – Casanare – Meta – Vichada – Frontera con Brasil/Venezuela", [
        ("Casanare", "Paz de Ariporo, Orocué, Hato Corozal",
         [("Casanare", "Paz de Ariporo"), ("Casanare", "Orocué"), ("Casanare", "Hato Corozal")]),
        ("Meta", "Puerto Gaitán, Puerto López", [("Meta", "Puerto Gaitán"), ("Meta", "Puerto López")]),
        ("Vichada", "Cumaribo, La Primavera, Puerto Carreño",
         [("Vichada", "Cumaribo"), ("Vichada", "La Primavera"), ("Vichada", "Puerto Carreño")]),
    ]),
    ("3.7", "Urabá – Tapón del Darién – Fronteras con Panamá y el Caribe", [
        ("Antioquia", "Turbo, Apartadó, Necoclí, Carepa, Chigorodó",
         [("Antioquia", m) for m in ("Turbo", "Apartadó", "Necoclí", "Carepa", "Chigorodó")]),
        ("Chocó", "Riosucio, Unguía, Acandí, Carmen del Darién, Quibdó",
         [("Chocó", m) for m in ("Riosucio", "Unguía", "Acandí", "Carmen del Darién", "Quibdó")]),
        ("Frontera Panamá", "Darién (Yaviza, Bajo Chiquito)", []),
    ]),
    ("3.8", "Tolima – Huila – Caguán – Caquetá – Guaviare", [
        ("Tolima", "Planadas, Rioblanco, Chaparral", [("Tolima", m) for m in ("Planadas", "Rioblanco", "Chaparral")]),
        ("Huila", "Algeciras, Colombia, Baraya", [("Huila", m) for m in ("Algeciras", "Colombia", "Baraya")]),
        ("Caquetá", "San Vicente del Caguán, Cartagena del Chairá",
         [("Caquetá", "San Vicente del Caguán"), ("Caquetá", "Cartagena del Chairá")]),
        ("Guaviare", "Calamar, El Retorno, San José del Guaviare",
         [("Guaviare", m) for m in ("Calamar", "El Retorno", "San José del Guaviare")]),
    ]),
    ("3.9", "Huila – Norte del Cauca – Costa Pacífica", [
        ("Huila", "Algeciras, Colombia, Baraya", [("Huila", m) for m in ("Algeciras", "Colombia", "Baraya")]),
        ("Cauca", "Corinto, Toribío, Miranda, Jambaló, Caloto, Suárez, El Tambo, Argelia, Patía",
         [("Cauca", m) for m in ("Corinto", "Toribío", "Miranda", "Jambaló", "Caloto", "Suárez", "El Tambo", "Argelia", "Patía")]),
        ("Cauca", "Buenos Aires, López de Micay, Timbiquí, Guapi",
         [("Cauca", m) for m in ("Buenos Aires", "López de Micay", "Timbiquí", "Guapi")]),
    ]),
    ("3.10", "Chocó – Medio Atrato – Litoral Pacífico", [
        ("Chocó", "Quibdó, Riosucio, Bojayá, Carmen del Darién",
         [("Chocó", m) for m in ("Quibdó", "Riosucio", "Bojayá", "Carmen del Darién")]),
        ("Chocó", "Bahía Solano, Nuquí, Juradó", [("Chocó", m) for m in ("Bahía Solano", "Nuquí", "Juradó")]),
        ("Chocó", "Medio Baudó, Bajo Baudó, Litoral del San Juan",
         [("Chocó", "Medio Baudó"), ("Chocó", "Bajo Baudó"), ("Chocó", "El Litoral del San Juan")]),
    ]),
    ("3.11", "Arauca – Casanare – Vichada – Frontera binacional con Venezuela", [
        ("Arauca", "Arauquita, Saravena, Tame, Fortul, Arauca",
         [("Arauca", m) for m in ("Arauquita", "Saravena", "Tame", "Fortul", "Arauca")]),
        ("Casanare", "Hato Corozal, Paz de Ariporo, La Salina",
         [("Casanare", m) for m in ("Hato Corozal", "Paz de Ariporo", "La Salina")]),
        ("Vichada", "Cumaribo, Santa Rita, Puerto Carreño", [("Vichada", "Cumaribo"), ("Vichada", "Puerto Carreño")]),
    ]),
    ("3.12", "Norte de Santander – Cesar – Bolívar – Antioquia (corredor nororiental de expansión)", [
        ("Norte de Santander", "Tibú, Sardinata, El Tarra, Convención, Ocaña",
         [("Norte de Santander", m) for m in ("Tibú", "Sardinata", "El Tarra", "Convención", "Ocaña")]),
        ("Cesar", "Aguachica, La Gloria, Pelaya, Río de Oro",
         [("Cesar", m) for m in ("Aguachica", "La Gloria", "Pelaya", "Río de Oro")]),
        ("Bolívar", "Morales, Santa Rosa, Arenal, Simití",
         [("Bolívar", "Morales"), ("Bolívar", "Arenal"), ("Bolívar", "Simití")]),
        ("Antioquia", "Caucasia, Tarazá, El Bagre, Zaragoza",
         [("Antioquia", m) for m in ("Caucasia", "Tarazá", "El Bagre", "Zaragoza")]),
    ]),
    ("3.13", "Costa Pacífica nariñense – caucana (incluyendo costa de Ecuador)", [
        ("Cauca", "Guapi, López de Micay, Timbiquí", [("Cauca", m) for m in ("Guapi", "López de Micay", "Timbiquí")]),
        ("Nariño", "Santa Bárbara, La Tola, El Charco, Olaya Herrera, Mosquera, Francisco Pizarro (Salahonda), "
                   "Roberto Payán, Magüí Payán, Tumaco, Barbacoas",
         [("Nariño", m) for m in ("Santa Bárbara", "La Tola", "El Charco", "Olaya Herrera", "Mosquera",
                                  "Francisco Pizarro", "Roberto Payán", "Magüí", "San Andrés de Tumaco", "Barbacoas")]),
        ("Internacional", "Litoral ecuatoriano (Esmeraldas, San Lorenzo, Borbón)", []),
    ]),
]
EXCLUIDOS_CORREDOR = [
    ("3.1", "El Plateado", "corregimiento de El Tambo (El Tambo ya está en la misma celda)"),
    ("3.1", "Cordilleras y cuencas del río Caquetá, río Putumayo, río Micay y río Naya", "no es municipio"),
    ("3.4", "Pueblo Nuevo", "ambiguo: no hay municipio con ese nombre en Magdalena"),
    ("3.5", "Apure (Estado de Amazonas de Venezuela)", "fuera de Colombia"),
    ("3.7", "Darién (Yaviza, Bajo Chiquito)", "fuera de Colombia (Panamá)"),
    ("3.11", "Santa Rita", "no es municipio (Vichada)"),
    ("3.12", "Santa Rosa", "ambiguo: Bolívar tiene Santa Rosa y Santa Rosa del Sur"),
    ("3.13", "Litoral ecuatoriano (Esmeraldas, San Lorenzo, Borbón)", "fuera de Colombia"),
]


def norm(s: str) -> str:
    s = unicodedata.normalize("NFD", s or "")
    s = "".join(c for c in s if unicodedata.category(c) != "Mn").lower()
    s = re.sub(r"[^a-z0-9 ]+", " ", s)
    return " ".join(s.split())


def sha256(p: Path) -> str:
    return hashlib.sha256(p.read_bytes()).hexdigest()


def asegurar_crudos() -> dict:
    """Descarga solo lo que falta; devuelve {archivo: sha256} y escribe el manifiesto."""
    CRUDOS.mkdir(parents=True, exist_ok=True)
    man = CRUDOS / "manifiesto.csv"
    previo = {}
    if man.exists():
        with man.open(encoding="utf-8") as f:
            previo = {r["archivo"]: r for r in csv.DictReader(f)}
    filas, hashes = [], {}
    for nombre, url in FUENTES.items():
        p = CRUDOS / nombre
        if not p.exists():
            subprocess.run(["curl", "-sS", "-f", "-L", "-m", "300", "-A", "Mozilla/5.0",
                            "-o", str(p), url], check=True)
            fecha = None
        else:
            fecha = previo.get(nombre, {}).get("fecha_consulta")
        h = sha256(p)
        if nombre in previo and previo[nombre]["sha256"] != h:
            sys.exit(f"SHA-256 de {nombre} no coincide con el manifiesto: el crudo cambió")
        hashes[nombre] = h
        filas.append({"archivo": nombre, "url": url, "fecha_consulta": fecha or FECHA_CONSULTA,
                      "sha256": h, "bytes": p.stat().st_size})
    with man.open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(filas[0]))
        w.writeheader()
        w.writerows(filas)
    return hashes


def universo():
    """{(dpto_norm, muni_norm): cod}, lista de códigos, nombres."""
    idx, codigos, nombres = {}, [], {}
    with UNIVERSO.open(encoding="utf-8") as f:
        for r in csv.DictReader(f):
            if r["anio"] != "2025":
                continue
            k = (norm(r["departamento"]), norm(r["municipio"]))
            if k in idx:
                sys.exit(f"Clave duplicada en universo: {k}")
            idx[k] = r["cod_divipola"]
            codigos.append(r["cod_divipola"])
            nombres[r["cod_divipola"]] = (r["departamento"], r["municipio"])
    if len(codigos) != 1123:
        sys.exit(f"Universo con {len(codigos)} municipios (se esperaban 1.123)")
    return idx, sorted(codigos), nombres


def homologar(idx, dpto: str, muni: str):
    """Devuelve (cod, nota) o (None, motivo)."""
    d, m = norm(dpto), norm(muni)
    d = ALIAS_DPTO.get(d, d)
    for dd, mm, nota in ((d, m, ""), (norm(muni), norm(dpto), "departamento y municipio invertidos en la fuente")):
        dd = ALIAS_DPTO.get(dd, dd)
        if (dd, mm) in CORRIGE_DPTO:
            dd, nota = CORRIGE_DPTO[(dd, mm)], f"departamento corregido ({dpto} -> Santander)"
        mm = ALIAS.get((dd, mm), mm)
        if (dd, mm) in idx:
            return idx[(dd, mm)], nota
    return None, f"sin homologar: {dpto} / {muni}"


# ------------------------------------------------------------------ HTML
def celdas(tr: str) -> list:
    return [" ".join(html.unescape(re.sub(r"<[^>]+>", " ", c)).split())
            for c in re.findall(r"<t[dh][^>]*>(.*?)</t[dh]>", tr, flags=re.S)]


def tablas_con_titulo(texto: str, patron_titulo: str):
    """[(titulo_match, [filas de celdas])] asignando a cada tabla el último título previo."""
    titulos = [(m.start(), m) for m in re.finditer(patron_titulo, texto)]
    out = []
    for t in re.finditer(r"<table.*?</table>", texto, flags=re.S):
        previos = [m for pos, m in titulos if pos < t.start()]
        if not previos:
            continue
        filas = [celdas(tr) for tr in re.findall(r"<tr.*?</tr>", t.group(0), flags=re.S)]
        out.append((previos[-1], filas))
    return out


def texto_plano(fragmento: str) -> str:
    return " ".join(html.unescape(re.sub(r"<[^>]+>", " ", fragmento)).split())


def anio_fecha(f: str):
    m = re.match(r"\s*(\d{1,2})/(\d{1,2})/(\d{2,4})", f)
    if not m:
        return None
    a = int(m.group(3))
    return a + 2000 if a < 100 else a


def leer_lideres(omitidas: list) -> list:
    filas = []
    for nombre in ("lideres_2023.html", "lideres_2024_2025_2026.html"):
        t = (CRUDOS / nombre).read_text(encoding="utf-8")
        t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
        # Títulos de sección: "LÍDERES SOCIALES ASESINADOS EN AAAA" / "FIRMANTES ... AAAA".
        # La página de 2023 no tiene subtítulo de líderes: su primera tabla es la de líderes.
        patron = r"(L[ÍI]DERES SOCIALES ASESINADOS EN|FIRMANTES DE ACUERDO DE PAZ[^<]*?ASESINADOS EN|en lo corrido del año)\s*(\d{4})"
        for m, tabla in tablas_con_titulo(t, patron):
            anio = int(m.group(2))
            cab = [norm(c) for c in tabla[0]]
            if "sector social" not in cab:
                # Tablas de firmantes del Acuerdo: 5 columnas, sin "Sector social".
                if len(cab) == 5 and "municipio" in cab and any(c.startswith("nombre") for c in cab):
                    omitidas.append(f"{nombre}: tabla de firmantes ({len(tabla) - 1} filas) omitida")
                    continue
                sys.exit(f"{nombre} {anio}: encabezado inesperado {tabla[0]}")
            i_f = next(i for i, c in enumerate(cab) if c.startswith("fecha"))
            i_d, i_m, i_s = cab.index("departamento"), cab.index("municipio"), cab.index("sector social")
            for c in tabla[1:]:
                if len(c) != len(cab) or not any(c):
                    sys.exit(f"{nombre} {anio}: fila irregular {len(c)} celdas")
                filas.append({"anio": anio, "fecha": c[i_f], "departamento": c[i_d],
                              "municipio": c[i_m], "sector": c[i_s], "archivo": nombre})
    return filas


def leer_masacres() -> list:
    t = (CRUDOS / "masacres_2020_2026.html").read_text(encoding="utf-8")
    t = re.sub(r"<script.*?</script>|<style.*?</style>", "", t, flags=re.S)
    patron = r"(\d+)\s+masacres en el (\d{4})"
    por_anio = defaultdict(list)
    for m, tabla in tablas_con_titulo(t, patron):
        por_anio[int(m.group(2))].append((int(m.group(1)), tabla))
    filas, notas = [], []
    for anio in (2024, 2025, 2026):
        bloques = por_anio[anio]
        publicado, principal = bloques[0][0], bloques[0][1]
        cab = [norm(c) for c in principal[0]]
        idx = {k: next(i for i, c in enumerate(cab) if c.startswith(k)) for k in ("fecha", "departamento", "municipio", "de victimas")}
        regs = [{"anio": anio, "fecha": c[idx["fecha"]], "departamento": c[idx["departamento"]],
                 "municipio": c[idx["municipio"]], "victimas": c[idx["de victimas"]]} for c in principal[1:]]
        claves = Counter((r["fecha"].lstrip("0"), norm(r["municipio"]), r["victimas"]) for r in regs)
        for _, extra in bloques[1:]:
            cab2 = [norm(c) for c in extra[0]]
            j = {k: next(i for i, c in enumerate(cab2) if c.startswith(k)) for k in ("fecha", "municipio", "de victimas")}
            for c in extra[1:]:
                k = (c[j["fecha"]].lstrip("0"), norm(c[j["municipio"]]), c[j["de victimas"]])
                if k not in claves:
                    sys.exit(f"Masacres {anio}: tabla adicional con fila no contenida en la principal: {c}")
            notas.append(f"{anio}: tabla adicional de {len(extra) - 1} filas descartada (duplica filas de la principal)")
        filas += regs
        if len(regs) != publicado or publicado != TOTAL_MASACRES_PUBLICADO[anio]:
            sys.exit(f"Masacres {anio}: {len(regs)} filas vs encabezado {publicado} vs esperado {TOTAL_MASACRES_PUBLICADO[anio]}")
    return filas, notas


# ------------------------------------------------------------------ salida
def escribir(id_: str, filas: list, meta: dict) -> None:
    SALIDA.mkdir(parents=True, exist_ok=True)
    with (SALIDA / f"{id_}.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=["cod_divipola", "anio", "valor", "numerador", "denominador"])
        w.writeheader()
        w.writerows(filas)
    (SALIDA / f"{id_}.meta.json").write_text(json.dumps(meta, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def conteo_a_filas(codigos, conteo, periodo):
    return [{"cod_divipola": c, "anio": periodo, "valor": conteo.get(c, 0), "numerador": "", "denominador": ""}
            for c in codigos]


def main() -> None:
    hashes = asegurar_crudos()
    idx, codigos, nombres = universo()
    informe = []

    # 1. Líderes
    omitidas = []
    lideres = leer_lideres(omitidas)
    informe += omitidas
    por_anio = Counter(r["anio"] for r in lideres)
    informe.append(f"Líderes, filas por año: {dict(sorted(por_anio.items()))}")
    for a, tot in TOTAL_LIDERES_PUBLICADO.items():
        if por_anio[a] != tot:
            sys.exit(f"Líderes {a}: {por_anio[a]} filas vs {tot} publicado por Indepaz")
    sin_hom, detalle, conteo = [], [], Counter()
    for r in lideres:
        a_f = anio_fecha(r["fecha"])
        if a_f != r["anio"]:
            informe.append(f"  aviso: fecha {r['fecha']} en tabla {r['anio']}")
        cod, nota = homologar(idx, r["departamento"], r["municipio"])
        if cod is None:
            sin_hom.append(nota)
        elif nota:
            informe.append(f"  {nota}: {r['departamento']} / {r['municipio']} -> {cod}")
        sub = r["sector"].upper().strip() in SUBCONJUNTO
        detalle.append({"anio": r["anio"], "fecha": r["fecha"], "departamento_original": r["departamento"],
                        "municipio_original": r["municipio"], "cod_divipola": cod or "",
                        "sector_original": r["sector"], "en_subconjunto": "si" if sub else "no"})
        if sub and 2023 <= r["anio"] <= 2026:
            if cod is None:
                informe.append(f"  SUBCONJUNTO sin homologar (no se cuenta): {r['anio']} {r['fecha']} {r['departamento']} / {r['municipio']} / {r['sector']}")
                continue
            conteo[cod] += 1
    if len(sin_hom) > 10:
        sys.exit(f"Demasiadas filas sin homologar: {sin_hom}")
    informe += [f"  líderes sin homologar: {s}" for s in sin_hom]
    with (SALIDA / "lideres_indepaz_detalle.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(detalle[0]))
        w.writeheader()
        w.writerows(detalle)
    sub_anio = Counter(d["anio"] for d in detalle if d["en_subconjunto"] == "si")
    informe.append(f"Líderes subconjunto por año: {dict(sorted(sub_anio.items()))}; total {sum(conteo.values())}")
    corte_l = max((r["fecha"] for r in lideres if r["anio"] == 2026), key=lambda f: tuple(reversed([int(x) for x in f.split('/')])))
    escribir("lideres_tierra_2023_2026", conteo_a_filas(codigos, conteo, "2023-2026"), {
        "id": "lideres_tierra_2023_2026",
        "etiqueta": "Líderes campesinos, comunales y de tierras asesinados",
        "descripcion": "Número de asesinatos de líderes sociales registrados por Indepaz en 2023-2026 cuyo sector social es campesino, comunal (juntas de acción comunal) o reclamante de tierras, por municipio del hecho.",
        "unidad": "asesinatos",
        "sentido": "peor",
        "periodo": "2023-01-01 a {}-{}-{} (2026 parcial)".format(*reversed([x.zfill(2) for x in corte_l.split("/")])),
        "institucion": "Indepaz – Instituto de Estudios para el Desarrollo y la Paz, Observatorio de DDHH y Conflictividades",
        "base": "Líderes sociales, defensores de DD.HH y firmantes de acuerdo asesinados (listados anuales 2023, 2024, 2025 y 2026)",
        "enlace": FUENTES["lideres_2023.html"] + " ; " + FUENTES["lideres_2024_2025_2026.html"],
        "fecha_consulta": FECHA_CONSULTA,
        "agregable": "suma",
        "factor": None,
        "nota": ("Registro de una organización de la sociedad civil, no oficial del Estado; la categoría la asigna Indepaz (columna 'Sector social'). "
                 "Se cuentan CAMPESINO, COMUNAL y RECLAMANTE DE TIERRAS; no se cuenta COMUNITARIO ni los firmantes del Acuerdo (tabla aparte). "
                 f"2026 es parcial (último caso listado {corte_l}); las listas se actualizan y pueden cambiar. "
                 "Totales de filas por año contrastados con el balance anual de Indepaz (2023=188, 2024=173, 2025=187). "
                 "Ausente = 0 porque el registro es nacional y solo lista municipios con casos. Detalle auditable sin nombres en lideres_indepaz_detalle.csv."),
        "sha256": {k: hashes[k] for k in ("lideres_2023.html", "lideres_2024_2025_2026.html", "balance_2025.pdf")},
    })

    # 2. Masacres
    masacres, notas_m = leer_masacres()
    informe += notas_m
    conteo_m, det_m, sin_m = Counter(), [], []
    for r in masacres:
        cod, nota = homologar(idx, r["departamento"], r["municipio"])
        if cod is None:
            sin_m.append(nota)
        else:
            if nota:
                informe.append(f"  masacre {r['fecha']}: {nota} -> {cod}")
            conteo_m[cod] += 1
        det_m.append({"anio": r["anio"], "fecha": r["fecha"], "departamento_original": r["departamento"],
                      "municipio_original": r["municipio"], "cod_divipola": cod or "", "victimas": r["victimas"]})
    if len(sin_m) > 3:
        sys.exit(f"Masacres sin homologar: {sin_m}")
    informe += [f"  masacre {n} (no se cuenta en municipio)" for n in sin_m]
    with (SALIDA / "masacres_2024_2026.detalle.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(det_m[0]))
        w.writeheader()
        w.writerows(det_m)
    informe.append(f"Masacres por año: {dict(sorted(Counter(r['anio'] for r in masacres).items()))}; total {sum(conteo_m.values())}")
    corte_m = re.search(r"89 masacres en el 2026[^<]*?corte al ([^<]+?)<", (CRUDOS / "masacres_2020_2026.html").read_text(encoding="utf-8"))
    corte_m = corte_m.group(1).strip() if corte_m else "sin dato"
    escribir("masacres_2024_2026", conteo_a_filas(codigos, conteo_m, "2024-2026"), {
        "id": "masacres_2024_2026",
        "etiqueta": "Masacres (Indepaz)",
        "descripcion": "Número de masacres registradas por Indepaz en 2024-2026 por municipio del hecho; Indepaz define masacre como el homicidio intencional y simultáneo de 3 o más personas en estado de indefensión, por un mismo autor y en iguales circunstancias de modo, tiempo y lugar.",
        "unidad": "masacres",
        "sentido": "contexto",
        "periodo": f"2024-01-01 a {corte_m} (2026 parcial)",
        "institucion": "Indepaz – Instituto de Estudios para el Desarrollo y la Paz, Observatorio de DDHH y Conflictividades",
        "base": "Masacres en Colombia durante el 2020, 2021, 2022, 2023, 2024, 2025 y 2026",
        "enlace": FUENTES["masacres_2020_2026.html"],
        "fecha_consulta": FECHA_CONSULTA,
        "agregable": "suma",
        "factor": None,
        "nota": ("Registro de una organización de la sociedad civil con definición propia de masacre (3 o más víctimas); no coincide con cifras oficiales. "
                 "Cuenta hechos, no víctimas (las víctimas están en masacres_2024_2026.detalle.csv). "
                 f"Totales contrastados con los encabezados de Indepaz: 2024=76, 2025=78, 2026=89 (corte {corte_m}). "
                 "En 2026 la página repite una tabla antigua con las 21 primeras masacres; se verificó que está contenida en la principal y se descartó. "
                 "Ausente = 0 porque el registro es nacional. Se muestra como contexto, sin ranking."),
        "sha256": {"masacres_2020_2026.html": hashes["masacres_2020_2026.html"], "balance_2025.pdf": hashes["balance_2025.pdf"]},
    })

    # 3. Corredores
    pdf_txt = subprocess.run(["pdftotext", str(CRUDOS / "corredores_de_la_muerte_2025.pdf"), "-"],
                             capture_output=True, text=True, check=True).stdout
    plano = " ".join(pdf_txt.split())
    if plano.count("MUNICIPIOS Y TERRITORIOS CLAVE") != len(CORREDORES):
        sys.exit("El PDF no tiene una tabla de municipios por cada corredor transcrito")
    conteo_c, det_c = Counter(), []
    for sec, nombre_c, filas in CORREDORES:
        vistos = set()
        for dep_pdf, celda, munis in filas:
            if " ".join(celda.split()) not in plano:
                sys.exit(f"Corredor {sec}: la celda transcrita no aparece en el PDF: {celda}")
            for dep, mun in munis:
                cod = idx.get((norm(dep), norm(mun)))
                if cod is None:
                    sys.exit(f"Corredor {sec}: {dep}/{mun} no está en el universo DANE")
                det_c.append({"corredor": sec, "nombre_corredor": nombre_c, "departamento_tabla": dep_pdf,
                              "celda_original": celda, "cod_divipola": cod, "municipio": mun})
                vistos.add(cod)
        for cod in vistos:
            conteo_c[cod] += 1
    with (SALIDA / "corredores_indepaz_2025.detalle.csv").open("w", newline="", encoding="utf-8") as f:
        w = csv.DictWriter(f, fieldnames=list(det_c[0]))
        w.writeheader()
        w.writerows(det_c)
    informe.append(f"Corredores: {len(CORREDORES)}; municipios con ≥1 corredor: {len(conteo_c)}; "
                   f"distribución {dict(sorted(Counter(conteo_c.values()).items()))}")
    informe += [f"  excluido {s}: {t} ({m})" for s, t, m in EXCLUIDOS_CORREDOR]
    escribir("corredores_indepaz_2025", conteo_a_filas(codigos, conteo_c, "2025"), {
        "id": "corredores_indepaz_2025",
        "etiqueta": "Corredores armados (Indepaz 2025)",
        "descripcion": "Número de corredores de grupos armados identificados por Indepaz en 'Los corredores de la muerte' (agosto de 2025) en cuya tabla 'Municipios y territorios clave' aparece el municipio (0 a 13).",
        "unidad": "corredores",
        "sentido": "contexto",
        "periodo": "2025 (análisis 2022-2025, publicado en agosto de 2025)",
        "institucion": "Indepaz – Instituto de Estudios para el Desarrollo y la Paz, Observatorio de DDHH y Conflictividades",
        "base": "Los corredores de la muerte (Leonardo González Perafán, agosto de 2025)",
        "enlace": FUENTES["corredores_de_la_muerte_2025.pdf"],
        "fecha_consulta": FECHA_CONSULTA,
        "agregable": "no",
        "factor": None,
        "nota": ("Informe analítico, no registro estadístico: las tablas listan municipios 'clave' de cada corredor y el propio informe advierte que no agotan "
                 "la totalidad del fenómeno ni son una división fija; un 0 significa 'no listado como municipio clave', no ausencia de grupos armados. "
                 "Se excluyeron corregimientos, ríos, territorios extranjeros, Santa Rita (Vichada) y dos nombres ambiguos ('Pueblo Nuevo' en Magdalena, "
                 "'Santa Rosa' en Bolívar). 'Medio y litoral San Juan' = Medio San Juan + El Litoral del San Juan. Detalle en corredores_indepaz_2025.detalle.csv."),
        "sha256": {"corredores_de_la_muerte_2025.pdf": hashes["corredores_de_la_muerte_2025.pdf"]},
    })

    # Resumen de revisión
    for id_, cnt in (("lideres", conteo), ("masacres", conteo_m), ("corredores", conteo_c)):
        huila = sum(v for c, v in cnt.items() if c.startswith("41"))
        muestra = {c: cnt.get(c, 0) for c in ("41001", "41020", "41078", "41206", "41551", "41298", "41770")}
        informe.append(f"{id_}: Colombia {sum(cnt.values())}, Huila {huila}, {muestra}")
    print("\n".join(informe))


if __name__ == "__main__":
    main()
