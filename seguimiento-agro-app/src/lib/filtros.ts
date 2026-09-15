import type { FiltrosActuaciones } from "./actuaciones";
import type { EstadoActuacion, TipoActuacion } from "./types";

export function parseFiltros(params: URLSearchParams): FiltrosActuaciones {
  const filtros: FiltrosActuaciones = {};

  const tipo = params.getAll("tipo").filter(Boolean);
  if (tipo.length) filtros.tipo = tipo as TipoActuacion[];

  const estado = params.getAll("estado").filter(Boolean);
  if (estado.length) filtros.estado = estado as EstadoActuacion[];

  const dependenciaIds = params.getAll("dependenciaId").filter(Boolean).map(Number).filter((n) => !isNaN(n));
  if (dependenciaIds.length) filtros.dependenciaIds = dependenciaIds;

  const departamento = params.get("departamento");
  if (departamento) filtros.departamento = departamento;

  const municipio = params.get("municipio");
  if (municipio) filtros.municipio = municipio;

  const q = params.get("q");
  if (q) filtros.q = q;

  const avanceMin = params.get("avanceMin");
  if (avanceMin) filtros.avanceMin = Number(avanceMin);

  const avanceMax = params.get("avanceMax");
  if (avanceMax) filtros.avanceMax = Number(avanceMax);

  return filtros;
}
