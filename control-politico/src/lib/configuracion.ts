import { db } from "./db";

export type Configuracion = {
  concejo: string;
  municipio: string;
  concejal: string;
  diasAnticipacionCitacion: number;
  diasRespuestaAntesDebate: number;
  minutosIntervencion: number;
};

export const CONFIG_POR_DEFECTO: Configuracion = {
  concejo: "Concejo Municipal",
  municipio: "",
  concejal: "",
  // Constitución, art. 313 num. 11: citación con anticipación no menor de 5 días.
  diasAnticipacionCitacion: 5,
  // Depende del reglamento interno de cada concejo.
  diasRespuestaAntesDebate: 2,
  minutosIntervencion: 20,
};

export async function obtenerConfiguracion(): Promise<Configuracion> {
  const filas = await db.all<{ clave: string; valor: string }>("SELECT clave, valor FROM configuracion");
  const guardado = Object.fromEntries(filas.map((f) => [f.clave, f.valor]));
  const numero = (clave: keyof Configuracion) => {
    const n = Number(guardado[clave]);
    return Number.isFinite(n) && guardado[clave] !== undefined ? n : (CONFIG_POR_DEFECTO[clave] as number);
  };
  return {
    concejo: guardado.concejo ?? CONFIG_POR_DEFECTO.concejo,
    municipio: guardado.municipio ?? CONFIG_POR_DEFECTO.municipio,
    concejal: guardado.concejal ?? CONFIG_POR_DEFECTO.concejal,
    diasAnticipacionCitacion: numero("diasAnticipacionCitacion"),
    diasRespuestaAntesDebate: numero("diasRespuestaAntesDebate"),
    minutosIntervencion: numero("minutosIntervencion"),
  };
}

export async function guardarConfiguracion(c: Configuracion) {
  await db.batch(
    Object.entries(c).map(([clave, valor]) => ({
      sql: `INSERT INTO configuracion (clave, valor) VALUES (?, ?)
            ON CONFLICT(clave) DO UPDATE SET valor = excluded.valor`,
      args: [clave, String(valor)],
    }))
  );
}
