import type { Caso } from "../types";
import type { ContenidoInfografia } from "../infografias";
import { labelesDe, IDENTIFICACION, tipologiaLabel } from "../catalogos";

/**
 * Construye el contenido inicial sugerido para la ficha gráfica a partir del
 * anexo aprobado (versión final) y del caso. Deliberadamente NO incluye
 * nombre, apellido, número de identificación, matrícula/catastro,
 * coordenadas ni medidas de autoprotección: esos datos reservados quedan
 * excluidos por diseño y nunca se usan para prellenar la pieza pública.
 * El equipo de la Red debe además revisar el texto libre antes de generar
 * la versión definitiva.
 */
export function sugeridosInfografia(
  caso: Caso,
  anexoValores: Record<string, string> | null
): ContenidoInfografia {
  const d = caso.data;
  const territorio = [d.municipio, d.departamento].filter(Boolean).join(", ");

  const tipologias = (d.tipologiaHecho || [])
    .map((t) => tipologiaLabel(t))
    .filter(Boolean) as { derecho: string; label: string }[];
  const tipoHecho = anexoValores?.calificacionHechos || tipologias[0]?.label || "";

  const identificaciones = labelesDe(IDENTIFICACION, d.identificacion);
  const poblacionAfectada = identificaciones.length
    ? identificaciones.join(", ")
    : "Comunidad beneficiaria de la Reforma Agraria";

  const descripcionBreve = anexoValores?.resumenHecho || anexoValores?.relatoHechos || d.quePasoNarracion || "";

  const solicitudes = [anexoValores?.derechosEnRiesgo, anexoValores?.descripcionAmenaza]
    .filter(Boolean)
    .join(". ");

  const fecha = anexoValores?.fechaHoraHecho || anexoValores?.fechaPublicacion || "";

  return {
    tipoHecho,
    fecha,
    territorio,
    poblacionAfectada,
    descripcionBreve,
    solicitudes,
  };
}
