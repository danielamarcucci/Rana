import { describe, expect, it } from "vitest";
import { disponibleEstimado, distribuir } from "../src/lib/calculos";
import { leerPesos, pesos } from "../src/lib/dinero";

describe("dinero en centavos", () => {
  it("interpreta formato colombiano sin flotantes", () => {
    expect(leerPesos("1.234.567")).toBe(123456700);
    expect(leerPesos("$ 20.000")).toBe(2000000);
    expect(leerPesos("85.000,50")).toBe(8500050);
    expect(leerPesos("0,1")).toBe(10);
    expect(leerPesos("150000")).toBe(15000000);
  });
  it("rechaza valores inválidos", () => {
    for (const v of ["", "abc", "1,234", "1.23", "12,345", "-5", "1.2.3"]) expect(leerPesos(v)).toBeNull();
  });
  it("suma 0,10 + 0,20 exactamente", () => {
    expect(leerPesos("0,10")! + leerPesos("0,20")!).toBe(leerPesos("0,30"));
  });
  it("formatea en pesos colombianos", () => {
    expect(pesos(123456700).replace(/\s/g, " ")).toBe("$ 1.234.567");
    expect(pesos(8500050).replace(/\s/g, " ")).toBe("$ 85.000,50");
    expect(pesos(-5).replace(/\s/g, " ")).toBe("-$ 0,05");
  });
});

describe("distribución de un pago entre compromisos", () => {
  it("cubre varios meses en orden y deja el excedente", () => {
    const r = distribuir(250, [{ id: 1, saldo: 100 }, { id: 2, saldo: 100 }, { id: 3, saldo: 100 }]);
    expect(r.asignaciones).toEqual([{ compromiso_id: 1, valor: 100 }, { compromiso_id: 2, valor: 100 }, { compromiso_id: 3, valor: 50 }]);
    expect(r.excedente).toBe(0);
    const r2 = distribuir(350, [{ id: 1, saldo: 100 }, { id: 2, saldo: 200 }]);
    expect(r2.excedente).toBe(50);
    expect(r2.asignaciones.reduce((a, x) => a + x.valor, 0) + r2.excedente).toBe(350);
  });
});

describe("disponible estimado sin doble descuento (verificación 6)", () => {
  it("un gasto pendiente cubierto por una reserva no se descuenta dos veces", () => {
    // Caja 1000; reserva 500 con un gasto pendiente de 300 a su cargo.
    expect(disponibleEstimado(1000, [{ fondo_id: 1, saldo: 500, pendiente: 300 }], 0).disponible).toBe(500);
    // Si el pendiente supera la reserva, el exceso sale de recursos libres.
    expect(disponibleEstimado(1000, [{ fondo_id: 1, saldo: 200, pendiente: 300 }], 0).disponible).toBe(700);
    // Gastos sin fondo se restan una vez.
    expect(disponibleEstimado(1000, [], 400).disponible).toBe(600);
  });
  it("pagar el gasto no cambia el disponible", () => {
    const antes = disponibleEstimado(1000, [{ fondo_id: 1, saldo: 500, pendiente: 300 }], 100).disponible;
    // Se paga 300 con cargo al fondo y 100 sin fondo: caja −400, saldo del fondo −300, pendientes en 0.
    const despues = disponibleEstimado(600, [{ fondo_id: 1, saldo: 200, pendiente: 0 }], 0).disponible;
    expect(despues).toBe(antes);
  });
});
