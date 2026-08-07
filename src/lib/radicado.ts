import { db } from "./db";

function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/** Genera un radicado diario secuencial como 20260805#0001, coincidiendo
 * con el nombre de archivo de descarga AAAAMMDD_#NUMERO-DE-RADICADO.docx.
 * El UPSERT con RETURNING es atómico: no hay condición de carrera entre
 * solicitudes concurrentes. */
export async function generarRadicado(): Promise<string> {
  const dia = todayKey();
  const fila = await db.get<{ seq: number }>(
    `INSERT INTO radicado_counters (dia, seq) VALUES (?, 1)
     ON CONFLICT(dia) DO UPDATE SET seq = seq + 1
     RETURNING seq`,
    [dia]
  );
  const seq = fila?.seq ?? 1;
  return `${dia}#${String(seq).padStart(4, "0")}`;
}

export function nombreArchivoCaso(radicado: string) {
  return `${radicado.replace("#", "_#")}.docx`;
}
