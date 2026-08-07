import type { AnexoTipo, Caso } from "../types";
import { sugeridosPara } from "./sugeridos";
import { generarDerechoPeticionDocx } from "./derechoPeticion";
import { generarDenunciaPublicaDocx, generarAlertaAgrariaDocx } from "./denunciaAlerta";

export function valoresResueltos(tipo: AnexoTipo, caso: Caso, overrides: Record<string, string>) {
  return { ...sugeridosPara(tipo, caso), ...overrides };
}

export async function generarAnexoDocx(
  tipo: AnexoTipo,
  caso: Caso,
  overrides: Record<string, string>
): Promise<Buffer> {
  const valores = valoresResueltos(tipo, caso, overrides);
  if (tipo === "derecho_peticion") return generarDerechoPeticionDocx(caso, valores);
  if (tipo === "denuncia_publica") return generarDenunciaPublicaDocx(caso, valores);
  return generarAlertaAgrariaDocx(caso, valores);
}
