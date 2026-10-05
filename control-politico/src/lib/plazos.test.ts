import { test } from "node:test";
import assert from "node:assert/strict";
import { diasHabilesHasta, domingoDePascua, esDiaHabil, festivosDe, restarDiasHabiles, sumarDiasHabiles } from "./plazos";

test("Pascua", () => {
  assert.equal(domingoDePascua(2025).toISOString().slice(0, 10), "2025-04-20");
  assert.equal(domingoDePascua(2026).toISOString().slice(0, 10), "2026-04-05");
});

test("festivos de Colombia 2026", () => {
  const f = festivosDe(2026);
  for (const d of [
    "2026-01-01", "2026-01-12", "2026-03-23", "2026-04-02", "2026-04-03",
    "2026-05-01", "2026-05-18", "2026-06-08", "2026-06-15", "2026-06-29",
    "2026-07-20", "2026-08-07", "2026-08-17", "2026-10-12", "2026-11-02",
    "2026-11-16", "2026-12-08", "2026-12-25",
  ]) {
    assert.ok(f.has(d), `falta ${d}`);
  }
  assert.equal(f.size, 18);
});

test("días hábiles", () => {
  assert.equal(esDiaHabil("2026-10-10"), false); // sábado
  assert.equal(esDiaHabil("2026-10-12"), false); // festivo
  assert.equal(esDiaHabil("2026-10-13"), true);
  // Viernes 9 oct + 1 hábil salta sábado, domingo y lunes festivo.
  assert.equal(sumarDiasHabiles("2026-10-09", 1), "2026-10-13");
  assert.equal(restarDiasHabiles("2026-10-13", 1), "2026-10-09");
  assert.equal(diasHabilesHasta("2026-10-09", "2026-10-13"), 1);
  assert.equal(diasHabilesHasta("2026-10-13", "2026-10-09"), -1);
});
