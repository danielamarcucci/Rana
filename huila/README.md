# Tablero electoral del Huila

Tablero territorial de los 37 municipios del Huila, con filtro de territorio
(todo el Huila, subregión o municipio) en la parte superior y cuatro pestañas:

1. **Elecciones**: Gobernación, Asamblea, Alcaldía y Concejo 2019 y 2023
   (Registraduría, mesa a mesa): más votado por municipio, % de cada opción,
   comparación con la otra elección o con todo el Huila.
2. **Problemas**: 41 indicadores (salud, seguridad, economía, educación y
   servicios) de TerriData/DNP. Cada uno compara el territorio con Colombia,
   los 32 departamentos, la mediana de la región Andina y los ~1.100
   municipios del país (mapa por quintiles, evolución e histograma).
3. **Caracterización**: población, densidad, ruralidad, edad y pertenencia
   étnica (contexto, sin juicio de bueno o malo).
4. **Transferencia del voto**: pendiente de los resultados 2015 y de Congreso.

Es independiente del resto del repositorio (no usa Next.js ni dependencias):
abrir `web/index.html` en el navegador.

```
datos/crudos/      Archivos oficiales tal como se descargan (no se editan)
datos/catalogos/   Homologación Registraduría ↔ DIVIPOLA, subregiones, catálogo de indicadores
datos/geo/         Límites municipales (DANE MGN 2025, simplificados)
datos/salida/      Tablas procesadas y validadas
scripts/           Construcción y validación (01 → 04, 06, 07 y al final 05)
documentacion/     fuentes.md, metodologia.md
web/               App estática (index.html, app.js, datos/tablero.js generado)
```

Fuentes y validación: `documentacion/fuentes.md` y `documentacion/metodologia.md`.
