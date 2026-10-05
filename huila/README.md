# Tablero electoral del Huila

Comparativo entre los 37 municipios del Huila con dos módulos:

1. **Indicadores**: 22 indicadores municipales (población, pobreza, educación,
   vivienda y servicios, seguridad), con mapa, ranking de los 37 municipios,
   ficha por municipio y comparación entre dos municipios.
2. **Panorama electoral**: Gobernación, Asamblea, Alcaldía y Concejo 2019 y
   2023 por municipio (Registraduría, mesa a mesa), quién ganó dónde, % de
   cada opción y su cambio entre elecciones.

Es independiente del resto del repositorio (no usa Next.js ni dependencias):
abrir `web/index.html` en el navegador.

```
datos/crudos/      Archivos oficiales tal como se descargan (no se editan)
datos/catalogos/   Homologación Registraduría ↔ DIVIPOLA
datos/geo/         Límites municipales (DANE MGN 2025, simplificados)
datos/salida/      Tablas procesadas y validadas
scripts/           Construcción y validación, en orden 01 → 05
documentacion/     fuentes.md, metodologia.md
web/               App estática (index.html, app.js, datos/tablero.js generado)
```

Fuentes y validación: `documentacion/fuentes.md` y `documentacion/metodologia.md`.
