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
4. **Transferencia del voto**: cómo cambió la votación de cada partido por
   municipio entre 18 elecciones (territoriales 2015-2023, Congreso 2022,
   presidenciales 2022 y 2026), con mapa de cambio y relación con el voto
   presidencial. Compara territorios, no personas.

Es independiente del resto del repositorio (no usa Next.js ni dependencias):
abrir `web/index.html` en el navegador.

```
datos/crudos/      Archivos oficiales tal como se descargan (no se editan)
datos/catalogos/   Homologación Registraduría ↔ DIVIPOLA, subregiones, catálogo de indicadores
datos/geo/         Límites municipales (DANE MGN 2025, simplificados)
datos/salida/      Tablas procesadas y validadas
scripts/           Construcción y validación (01 → 04, 06 → 08 y al final 05)
documentacion/     fuentes.md, metodologia.md
web/               App estática (index.html, app.js, datos/tablero.js generado)
```

Fuentes y validación: `documentacion/fuentes.md` y `documentacion/metodologia.md`.

## Publicar con usuario y contraseña (Vercel)

`web/middleware.js` pide usuario y contraseña (autenticación básica del
navegador) antes de servir cualquier archivo del sitio. Las credenciales
**no están en el repositorio**: se leen de variables de entorno del proyecto
de Vercel. Si faltan, el sitio responde 503 y no muestra nada.

1. Vercel → Add New → Project → importar este repositorio.
2. Root Directory: `huila/web`. Framework Preset: Other. Sin comando de build.
3. Environment Variables: `HUILA_USUARIO` y `HUILA_CLAVE` (Production y Preview).
4. Settings → Deployment Protection → desactivar Vercel Authentication para
   que el visitante vea solo el cuadro de usuario y contraseña del tablero.
5. Production Branch: la rama donde esté el tablero (o fusionar el PR).

Para cambiar la contraseña basta con editar `HUILA_CLAVE` en Vercel y volver
a desplegar. Mientras el repositorio sea público, el código y los datos
(oficiales y públicos) se pueden ver en GitHub aunque el sitio pida clave.
