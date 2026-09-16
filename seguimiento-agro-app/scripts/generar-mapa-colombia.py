#!/usr/bin/env python3
"""Genera src/data/departamentos-mapa.json a partir de un GeoJSON de los
departamentos de Colombia, para el mapa SVG interactivo de /mapa.

Uso:
    1. Descargar el GeoJSON de departamentos de Colombia (33 features, con
       propiedades DPTO = código DANE y NOMBRE_DPT) y guardarlo en la ruta
       SRC de abajo:
       curl -sSL -o /tmp/colombia.geo.json \
         "https://gist.githubusercontent.com/john-guerra/43c7656821069d00dcbc/raw/be6a6e239cd5b5b803c6e7c2ec405b793a9064dd/Colombia.geo.json"
    2. Ejecutar: python3 generar-mapa-colombia.py
    3. Confirmar visualmente el resultado en /mapa antes de hacer commit
       (ver "Cómo verificar" al final de este archivo).

No se ejecuta en producción ni en el build de Next.js: es una herramienta
de desarrollo que se corre una vez y cuyo resultado (departamentos-mapa.json)
sí se versiona.
"""
import json, math, os

SRC = "/tmp/colombia.geo.json"
OUT = os.path.join(os.path.dirname(__file__), "..", "src", "data", "departamentos-mapa.json")

DECIMATE = 4  # conserva 1 de cada N puntos en anillos largos, para no generar un SVG enorme
SAN_ANDRES_DPTO = "88"  # código DANE de San Andrés, Providencia y Santa Catalina

with open(SRC, encoding="utf-8") as f:
    gj = json.load(f)

LAT0 = 4.5  # latitud media aprox. de Colombia, para una corrección simple de proyección equirectangular
COSLAT0 = math.cos(math.radians(LAT0))

def project(lon, lat):
    return lon * COSLAT0, -lat

def iter_rings(geom):
    t = geom["type"]
    if t == "Polygon":
        for ring in geom["coordinates"]:
            yield ring
    elif t == "MultiPolygon":
        for poly in geom["coordinates"]:
            for ring in poly:
                yield ring

features_mainland = [f for f in gj["features"] if f["properties"]["DPTO"] != SAN_ANDRES_DPTO]
feature_sa = next(f for f in gj["features"] if f["properties"]["DPTO"] == SAN_ANDRES_DPTO)

# --- LECCIÓN APRENDIDA (léase antes de tocar esto) ---------------------
# San Andrés, Providencia y Santa Catalina es un MultiPolygon de 3 anillos
# que en la realidad están separados por ~90 km de mar abierto entre San
# Andrés (al sur) y Providencia+Santa Catalina (al norte). Si se calcula
# UN solo bounding box para las 3 islas juntas y se dibuja en un único
# recuadro (aunque ese recuadro se agrande mucho), casi todo el recuadro
# termina siendo mar vacío entre las islas, y las islas mismas se ven como
# puntos diminutos sin importar cuán grande se haga el recuadro exterior.
#
# La solución (y la que usan los mapas políticos oficiales de Colombia) es
# separarlas en dos grupos geográficos y dibujar CADA UNO en su propio
# recuadro, recortado justo a su propia extensión, a una escala generosa
# y deliberadamente exagerada ("fuera de escala"), no proporcional al
# resto del mapa. Aquí se separan por latitud (< 13° = San Andrés, >= 13°
# = Providencia/Santa Catalina); si el dataset de origen cambia, revisar
# que ese corte siga siendo válido imprimiendo las latitudes medias de
# cada anillo.
sa_polys = feature_sa["geometry"]["coordinates"]
poly_lats = [sum(pt[1] for ring in poly for pt in ring) / sum(len(r) for r in poly) for poly in sa_polys]
group_sanandres = [sa_polys[i] for i in range(len(sa_polys)) if poly_lats[i] < 13]
group_providencia = [sa_polys[i] for i in range(len(sa_polys)) if poly_lats[i] >= 13]

# --- límites del continente (todo excepto San Andrés) ---
minx = miny = 1e18
maxx = maxy = -1e18
for feat in features_mainland:
    for ring in iter_rings(feat["geometry"]):
        for lon, lat in ring:
            x, y = project(lon, lat)
            minx = min(minx, x); maxx = max(maxx, x)
            miny = min(miny, y); maxy = max(maxy, y)

W = maxx - minx
H = maxy - miny
SCALE = 1000.0 / W
VBW = W * SCALE
MAINLAND_H = H * SCALE

def to_svg_mainland(lon, lat):
    x, y = project(lon, lat)
    return (x - minx) * SCALE, (y - miny) * SCALE

def bbox_of_polys(polys):
    xs = []; ys = []
    for poly in polys:
        for ring in poly:
            for lon, lat in ring:
                x, y = to_svg_mainland(lon, lat)
                xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)

sa_bx0, sa_by0, sa_bx1, sa_by1 = bbox_of_polys(group_sanandres)
sa_w, sa_h = sa_bx1 - sa_bx0, sa_by1 - sa_by0
pr_bx0, pr_by0, pr_bx1, pr_by1 = bbox_of_polys(group_providencia)
pr_w, pr_h = pr_bx1 - pr_bx0, pr_by1 - pr_by0

# Una sola escala compartida para ambos grupos (conserva el tamaño relativo
# real entre San Andrés y Providencia), elegida para que San Andrés -- la
# más grande de las dos -- se vea grande y clara. Ajustar este número es
# la forma correcta de pedir "más grande" o "más pequeño" para las islas.
TARGET_SA_WIDTH = 95
scale = TARGET_SA_WIDTH / sa_w

sa_w_s, sa_h_s = sa_w * scale, sa_h * scale
pr_w_s, pr_h_s = pr_w * scale, pr_h * scale

INSET_MARGIN = 18
GAP_BETWEEN_BOXES = 14
INDIVIDUAL_LABEL_HEIGHT = 16
CAPTION_HEIGHT = 30
PAD = 6  # margen entre la forma de cada isla y el borde de su propio recuadro

box_sa_w = sa_w_s + PAD * 2
box_sa_h = sa_h_s + PAD * 2
box_pr_w = pr_w_s + PAD * 2
box_pr_h = pr_h_s + PAD * 2

box_sa_x = INSET_MARGIN
box_pr_x = box_sa_x + box_sa_w + GAP_BETWEEN_BOXES
boxes_top = INSET_MARGIN
boxes_max_h = max(box_sa_h, box_pr_h)

# Los recuadros de las islas viven en una franja PROPIA reservada arriba del
# mapa (el continente se desplaza hacia abajo para dejarle sitio), en vez
# de competir por el hueco libre que quede junto a la costa del Chocó. Así
# se puede hacer el inset tan grande como se quiera sin riesgo de que
# choque visualmente con el resto del mapa.
TOP_MARGIN = round(boxes_top + boxes_max_h + INDIVIDUAL_LABEL_HEIGHT + CAPTION_HEIGHT + INSET_MARGIN)
VBH = MAINLAND_H + TOP_MARGIN
VBW_final = max(VBW, box_pr_x + box_pr_w + INSET_MARGIN)

def to_svg(lon, lat):
    sx, sy = to_svg_mainland(lon, lat)
    return sx, sy + TOP_MARGIN

def build_path_and_centroid(rings_source, transform, is_polys=False):
    path_parts = []
    all_pts = []
    ring_iter = (r for poly in rings_source for r in poly) if is_polys else iter_rings(rings_source)
    for ring in ring_iter:
        pts = ring[::DECIMATE] if len(ring) > DECIMATE * 10 else ring
        if pts[0] != ring[0]:
            pts = [ring[0]] + pts
        if pts[-1] != ring[-1]:
            pts = pts + [ring[-1]]
        svg_pts = []
        for lon, lat in pts:
            x, y = transform(lon, lat)
            svg_pts.append((round(x, 1), round(y, 1)))
        all_pts.extend(svg_pts)
        d = "M" + " L".join(f"{x},{y}" for x, y in svg_pts) + " Z"
        path_parts.append(d)
    path = " ".join(path_parts)
    cx = round(sum(p[0] for p in all_pts) / len(all_pts), 1)
    cy = round(sum(p[1] for p in all_pts) / len(all_pts), 1)
    return path, cx, cy

def transform_mainland(lon, lat):
    return to_svg(lon, lat)

def make_group_transform(bx0, by0, box_x, box_y):
    def transform(lon, lat):
        sx, sy = to_svg_mainland(lon, lat)
        return box_x + PAD + (sx - bx0) * scale, box_y + PAD + (sy - by0) * scale
    return transform

transform_sa = make_group_transform(sa_bx0, sa_by0, box_sa_x, boxes_top)
transform_pr = make_group_transform(pr_bx0, pr_by0, box_pr_x, boxes_top)

features_out = []
for feat in features_mainland:
    path, cx, cy = build_path_and_centroid(feat["geometry"], transform_mainland)
    features_out.append({
        "dpto": feat["properties"]["DPTO"],
        "nombreDpt": feat["properties"]["NOMBRE_DPT"],
        "path": path,
        "cx": cx,
        "cy": cy,
    })

sa_path, sa_cx, sa_cy = build_path_and_centroid(group_sanandres, transform_sa, is_polys=True)
pr_path, pr_cx, pr_cy = build_path_and_centroid(group_providencia, transform_pr, is_polys=True)
# Ambos grupos quedan bajo un solo feature seleccionable/clicable (es el
# mismo departamento), pero se dibujan dos recuadros separados en la UI.
combined_path = sa_path + " " + pr_path
features_out.append({
    "dpto": feature_sa["properties"]["DPTO"],
    "nombreDpt": feature_sa["properties"]["NOMBRE_DPT"],
    "path": combined_path,
    "cx": sa_cx,
    "cy": sa_cy,
    "esInset": True,
})

def rect(x, y, w, h):
    return {"x": round(x, 1), "y": round(y, 1), "width": round(w, 1), "height": round(h, 1)}

out = {
    "viewBox": f"0 0 {round(VBW_final,1)} {round(VBH,1)}",
    "departamentos": features_out,
    "insetSanAndres": {
        "cajaSanAndres": rect(box_sa_x, boxes_top, box_sa_w, box_sa_h),
        "cajaProvidencia": rect(box_pr_x, boxes_top, box_pr_w, box_pr_h),
        "etiquetaY": round(boxes_top + boxes_max_h + 11, 1),
        "captionX": round((box_sa_x + box_pr_x + box_pr_w) / 2, 1),
        "captionY": round(boxes_top + boxes_max_h + INDIVIDUAL_LABEL_HEIGHT + 12, 1),
    },
}

with open(OUT, "w", encoding="utf-8") as f:
    json.dump(out, f, ensure_ascii=False, separators=(",", ":"))

print("Escrito:", os.path.abspath(OUT), "-", round(os.path.getsize(OUT) / 1024), "KB")
print("Escala islas:", round(scale, 2), "| Caja San Andrés:", round(box_sa_w), "x", round(box_sa_h),
      "| Caja Providencia:", round(box_pr_w), "x", round(box_pr_h))
print("Alto reservado para el inset (TOP_MARGIN):", TOP_MARGIN, "| Alto total del mapa:", round(VBH))

# --- Cómo verificar antes de hacer commit -------------------------------
# 1. npm run build && npm run start (o npm run dev) en seguimiento-agro-app.
# 2. Iniciar sesión y abrir /mapa.
# 3. Revisar que: (a) las islas se vean grandes y reconocibles, no puntos;
#    (b) los dos recuadros y su rótulo no se encimen con el continente;
#    (c) el clic sobre cualquiera de las dos islas seleccione el
#    departamento "San Andrés y Providencia" y muestre su panel de detalle.
# Ver el historial de commits de este archivo para los intentos anteriores
# (una sola caja ajustada al hueco libre, etc.) y por qué no funcionaron.
