export interface CajaGeometria {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/**
 * Calcula la caja delimitadora de un path SVG generado por
 * scripts/generar-mapa-colombia.py, que solo usa comandos M/L/Z (líneas
 * rectas, sin curvas): basta con extraer todos los números del string y
 * emparejarlos en orden como (x, y). Si algún día el path incluye curvas
 * (Q/C), este cálculo dejaría de ser exacto y habría que ajustarlo.
 */
export function cajaDePath(path: string): CajaGeometria {
  const numeros = path.match(/-?\d+(?:\.\d+)?/g)?.map(Number) ?? [];
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (let i = 0; i + 1 < numeros.length; i += 2) {
    const x = numeros[i];
    const y = numeros[i + 1];
    if (x < minX) minX = x;
    if (x > maxX) maxX = x;
    if (y < minY) minY = y;
    if (y > maxY) maxY = y;
  }
  return { minX, minY, maxX, maxY };
}
