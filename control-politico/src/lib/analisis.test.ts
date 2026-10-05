import { test } from "node:test";
import assert from "node:assert/strict";
import { observacionesPregunta } from "./analisis";

test("observaciones de redacción", () => {
  assert.equal(observacionesPregunta({ texto: "¿Existe un plan de contingencia?" }).length, 2);
  assert.equal(observacionesPregunta({ texto: "¿Hubo interrupciones del servicio?" }).length, 2);
  assert.deepEqual(
    observacionesPregunta({ texto: "Indique el valor total de los contratos firmados en 2026, con fecha y contratista." }),
    []
  );
  assert.equal(
    observacionesPregunta({ texto: "¿Cuántos contratos hay? ¿Cuál es su valor?" }).some((o) => o.includes("varias")),
    true
  );
});
