import { db } from "./db";

function todayKey(d = new Date()) {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, "0");
  const dd = String(d.getDate()).padStart(2, "0");
  return `${yyyy}${mm}${dd}`;
}

/** Generates a sequential daily radicado like 20260805#0001, matching the
 * download filename convention AAAAMMDD_#NUMERO-DE-RADICADO.docx. */
export function generarRadicado(): string {
  const dia = todayKey();
  const tx = db.transaction((d: string) => {
    const row = db
      .prepare("SELECT seq FROM radicado_counters WHERE dia = ?")
      .get(d) as { seq: number } | undefined;
    const next = (row?.seq ?? 0) + 1;
    db.prepare(
      `INSERT INTO radicado_counters (dia, seq) VALUES (?, ?)
       ON CONFLICT(dia) DO UPDATE SET seq = excluded.seq`
    ).run(d, next);
    return next;
  });
  const seq = tx(dia);
  return `${dia}#${String(seq).padStart(4, "0")}`;
}

export function nombreArchivoCaso(radicado: string) {
  return `${radicado.replace("#", "_#")}.docx`;
}
