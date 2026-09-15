import type { Dependencia } from "@/lib/types";

export interface OpcionDependencia {
  id: number;
  etiqueta: string;
  grupo: string;
}

export function opcionesDependencia(dependencias: Dependencia[]): OpcionDependencia[] {
  const opciones: OpcionDependencia[] = [];

  const grupos = [
    { tipo: "oficina", titulo: "Despacho y oficinas asesoras" },
    { tipo: "viceministerio", titulo: "Viceministerios y direcciones" },
    { tipo: "entidad_adscrita", titulo: "Entidades adscritas" },
    { tipo: "entidad_vinculada", titulo: "Entidades vinculadas" },
  ] as const;

  for (const grupo of grupos) {
    if (grupo.tipo === "viceministerio") {
      for (const vice of dependencias.filter((d) => d.tipo === "viceministerio")) {
        opciones.push({ id: vice.id, etiqueta: vice.nombre, grupo: grupo.titulo });
        for (const hija of dependencias.filter((d) => d.padreId === vice.id)) {
          opciones.push({ id: hija.id, etiqueta: `— ${hija.nombre}`, grupo: grupo.titulo });
        }
      }
    } else {
      for (const dep of dependencias.filter((d) => d.tipo === grupo.tipo)) {
        opciones.push({ id: dep.id, etiqueta: dep.nombre, grupo: grupo.titulo });
      }
    }
  }
  return opciones;
}
