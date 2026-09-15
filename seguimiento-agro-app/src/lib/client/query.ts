export interface FiltrosUI {
  tipo: string[];
  estado: string[];
  dependenciaId: string[];
  departamento: string;
  municipio: string;
  q: string;
  avanceMin: string;
  avanceMax: string;
}

export const FILTROS_VACIOS: FiltrosUI = {
  tipo: [],
  estado: [],
  dependenciaId: [],
  departamento: "",
  municipio: "",
  q: "",
  avanceMin: "",
  avanceMax: "",
};

export function construirQuery(filtros: Partial<FiltrosUI>): string {
  const params = new URLSearchParams();
  filtros.tipo?.forEach((t) => params.append("tipo", t));
  filtros.estado?.forEach((e) => params.append("estado", e));
  filtros.dependenciaId?.forEach((d) => params.append("dependenciaId", d));
  if (filtros.departamento) params.set("departamento", filtros.departamento);
  if (filtros.municipio) params.set("municipio", filtros.municipio);
  if (filtros.q) params.set("q", filtros.q);
  if (filtros.avanceMin) params.set("avanceMin", filtros.avanceMin);
  if (filtros.avanceMax) params.set("avanceMax", filtros.avanceMax);
  return params.toString();
}
