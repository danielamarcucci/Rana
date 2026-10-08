// Verificaciones exigidas, contra PostgreSQL real con los mismos roles que usa la aplicación.
//   TEST_DATABASE_URL=postgres://…/base_desechable npm test
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import type pg from "pg";
import { como, falla, prepararBase, URL_PRUEBAS } from "./ayuda";
import { saldosCuentas, fondosEstado, gastosPendientes, resumenFinanciero } from "../src/lib/datos/finanzas";

const PDF = Buffer.from("%PDF-1.4\n%%EOF\n");

describe.skipIf(!URL_PRUEBAS)("reglas en la base de datos", () => {
  let pool: pg.Pool;
  let T = 0, C = 0, cuenta = 0, caja = 0, ana = 0, org = 0, esqC = 0, esqM = 0, adh = 0, catAporte = 0, catEgreso = 0;
  const tes = <R>(fn: (c: pg.PoolClient) => Promise<R>) => como(pool, "tes_tesoreria", T, fn);
  const con = <R>(fn: (c: pg.PoolClient) => Promise<R>) => como(pool, "tes_consulta", C, fn);
  const uno = async (c: pg.PoolClient, sql: string, p: unknown[] = []) => (await c.query(sql, p)).rows[0];
  const ingreso = (c: pg.PoolClient, valor: number, fecha: string, estado = "verificado", extra: Record<string, unknown> = {}) =>
    uno(c, `INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, miembro_id, concepto, categoria_id, valor, estado, excedente_destino)
            VALUES ($1, 'ingreso', $2, $3, 'Aporte', $4, $5, $6, $7) RETURNING id`,
      [fecha, extra.cuenta ?? cuenta, extra.miembro ?? ana, catAporte, valor, estado, extra.excedente ?? null]);
  const situacion = (c: pg.PoolClient, id: number) => uno(c, "SELECT abonado, saldo, situacion FROM v_compromisos_estado WHERE id = $1", [id]);

  beforeAll(async () => {
    pool = await prepararBase();
    await como(pool, "tes_auth", null, (c) => c.query("SELECT fn_configuracion_inicial('tesoreria', 'Tesorería', 'x', 'consulta', 'Consulta', 'y')"));
    const ids = (await pool.query("SELECT id, rol FROM usuarios")).rows;
    T = ids.find((r) => r.rol === "tesoreria").id;
    C = ids.find((r) => r.rol === "consulta").id;
    await tes(async (c) => {
      cuenta = (await uno(c, "INSERT INTO cuentas (nombre, tipo) VALUES ('Banco', 'banco') RETURNING id")).id;
      caja = (await uno(c, "INSERT INTO cuentas (nombre, tipo) VALUES ('Caja', 'caja') RETURNING id")).id;
      ana = (await uno(c, "INSERT INTO miembros (nombre, vinculo) VALUES ('Ana', 'asociado') RETURNING id")).id;
      org = (await uno(c, "INSERT INTO miembros (nombre, vinculo, tipo_persona) VALUES ('Organización', 'aportante', 'organizacion') RETURNING id")).id;
      await c.query("INSERT INTO miembros_contacto (miembro_id, telefono) VALUES ($1, '3000000000')", [ana]);
      catAporte = (await uno(c, "SELECT id FROM categorias WHERE nombre = 'Aportes de miembros'")).id;
      catEgreso = (await uno(c, "SELECT id FROM categorias WHERE nombre = 'Funcionamiento'")).id;
      esqC = (await uno(c, `INSERT INTO esquemas_aporte (tipo, nombre, estado, organo, referencia_acuerdo, fecha_acuerdo)
                            VALUES ('constitucion', 'Constitución', 'aprobado', 'asamblea', 'Acta 1', '2026-05-01') RETURNING id`)).id;
      esqM = (await uno(c, "INSERT INTO esquemas_aporte (tipo, nombre) VALUES ('mensual', 'Mensualidad') RETURNING id")).id;
      adh = (await uno(c, `INSERT INTO adhesiones (esquema_id, miembro_id, monto, mes_inicio, referencia_aceptacion, fecha_aceptacion)
                           VALUES ($1, $2, 5000000, '2026-07-01', 'Formato firmado', '2026-06-20') RETURNING id`, [esqM, ana])).id;
    });
  });
  afterAll(async () => pool?.end());

  describe("1. Consulta no puede modificar datos, ni con solicitudes directas", () => {
    it("rechaza escrituras en todas las tablas", async () => {
      await falla(con((c) => c.query("INSERT INTO cuentas (nombre, tipo) VALUES ('x', 'caja')")), "42501");
      await falla(con((c) => c.query("UPDATE cuentas SET nombre = 'x'")), "42501");
      await falla(con((c) => c.query("DELETE FROM categorias")), "42501");
      await falla(con((c) => c.query("INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, valor) VALUES ('2026-08-01', 'egreso', $1, 'x', $2, 1)", [cuenta, catEgreso])), "42501");
      await falla(con((c) => c.query("UPDATE configuracion SET dia_pago_mensual = 5")), "42501");
      await falla(con((c) => c.query("INSERT INTO historial (tabla, accion) VALUES ('x', 'y')")), "42501");
      await falla(con((c) => c.query("SELECT fn_crear_usuario('otro', 'Otro', 'consulta', 'h')")), "42501");
    });
    it("no ve contactos, miembros, detalle individual de compromisos ni el historial", async () => {
      await falla(con((c) => c.query("SELECT * FROM miembros_contacto")), "42501");
      await falla(con((c) => c.query("SELECT * FROM miembros")), "42501");
      await falla(con((c) => c.query("SELECT * FROM compromisos")), "42501");
      await falla(con((c) => c.query("SELECT * FROM v_compromisos_estado")), "42501");
      await falla(con((c) => c.query("SELECT * FROM aplicaciones")), "42501");
      await falla(con((c) => c.query("SELECT * FROM movimientos")), "42501");
      await falla(con((c) => c.query("SELECT * FROM historial")), "42501");
      await falla(con((c) => c.query("SELECT clave_hash FROM usuarios")), "42501");
    });
    it("no ve comprobantes con datos personales; sí los marcados sin datos personales", async () => {
      const [a, b] = await tes(async (c) => [
        (await uno(c, "INSERT INTO comprobantes (nombre_archivo, tipo_mime, tamano, sha256, contenido) VALUES ('a.pdf', 'application/pdf', $1, 'x', $2) RETURNING id", [PDF.length, PDF])).id,
        (await uno(c, "INSERT INTO comprobantes (nombre_archivo, tipo_mime, tamano, sha256, contenido, datos_personales) VALUES ('b.pdf', 'application/pdf', $1, 'x', $2, false) RETURNING id", [PDF.length, PDF])).id,
      ]);
      const vistos = await con(async (c) => (await c.query("SELECT id FROM comprobantes WHERE id = ANY($1)", [[a, b]])).rows.map((r) => r.id));
      expect(vistos).toEqual([b]);
    });
    it("la vista de movimientos para consulta oculta el nombre del aportante", async () => {
      const m = await tes((c) => uno(c, `INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, miembro_id, tercero, concepto, categoria_id, valor)
                                          VALUES ('2026-08-02', 'ingreso', $1, $2, 'Ana Pérez', 'Pago de Ana Pérez', $3, 100) RETURNING id`, [cuenta, ana, catAporte]));
      const v = await con((c) => uno(c, "SELECT concepto, tercero FROM v_movimientos_consulta WHERE id = $1", [m.id]));
      expect(v.tercero).toBeNull();
      expect(v.concepto).not.toContain("Ana");
      await tes((c) => c.query("DELETE FROM movimientos WHERE id = $1", [m.id]));
    });
  });

  describe("2. Sin sesión no se accede a información", () => {
    it("el rol previo al ingreso no lee datos financieros ni comprobantes", async () => {
      await falla(como(pool, "tes_auth", null, (c) => c.query("SELECT * FROM v_movimientos_consulta")), "42501");
      await falla(como(pool, "tes_auth", null, (c) => c.query("SELECT * FROM comprobantes")), "42501");
      await falla(como(pool, "tes_auth", null, (c) => c.query("SELECT * FROM cuentas")), "42501");
      await falla(como(pool, "tes_auth", null, (c) => c.query("SELECT fn_cambiar_mi_clave('x')")), "42501");
    });
    it("la configuración inicial no se puede repetir", async () => {
      await falla(como(pool, "tes_auth", null, (c) => c.query("SELECT fn_configuracion_inicial('a1a', 'A', 'x', 'b1b', 'B', 'y')")), "P0001");
    });
  });

  describe("3. Abonos parciales, anticipos y pagos de varios meses", () => {
    it("una propuesta no genera compromisos", async () => {
      await falla(tes((c) => c.query(
        "INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, periodo, adhesion_id, monto, fecha_acordada) VALUES ($1, $2, 'mensual', 'sostenimiento', '2026-07-01', $3, 5000000, '2026-07-10')",
        [esqM, ana, adh])), "P0001");
    });
    it("calcula estados, evita duplicados y no deja asignar más de lo recibido", async () => {
      await tes((c) => c.query("UPDATE esquemas_aporte SET estado = 'aprobado', organo = 'junta', referencia_acuerdo = 'Acta 4', fecha_acuerdo = '2026-06-15' WHERE id = $1", [esqM]));
      const meses = ["2026-07-01", "2026-08-01", "2026-09-01", "2026-10-01"];
      const ids: number[] = await tes(async (c) => {
        const out = [];
        for (const p of meses) out.push((await uno(c,
          "INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, periodo, adhesion_id, monto, fecha_acordada) VALUES ($1, $2, 'mensual', 'sostenimiento', $3, $4, 5000000, $3::date + 9) RETURNING id",
          [esqM, ana, p, adh])).id);
        return out;
      });
      // Duplicado para la misma persona y periodo
      await falla(tes((c) => c.query(
        "INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, periodo, adhesion_id, monto, fecha_acordada) VALUES ($1, $2, 'mensual', 'sostenimiento', '2026-07-01', $3, 5000000, '2026-07-10')",
        [esqM, ana, adh])), "23505");

      // Una transferencia de $120.000 cubre julio, agosto y la mitad de septiembre (anticipo incluido).
      const mov = await tes((c) => ingreso(c, 12000000, "2026-07-05"));
      await tes(async (c) => {
        await c.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, 5000000), ($1, $3, 5000000), ($1, $4, 2000000)", [mov.id, ids[0], ids[1], ids[2]]);
      });
      await tes(async (c) => {
        expect(await situacion(c, ids[0])).toMatchObject({ abonado: 5000000, saldo: 0, situacion: "completo" });
        expect(await situacion(c, ids[1])).toMatchObject({ abonado: 5000000, situacion: "completo" });
        expect((await situacion(c, ids[2])).saldo).toBe(3000000);
        expect((await situacion(c, ids[3])).abonado).toBe(0);
      });
      // No se puede asignar más de lo recibido…
      await falla(tes((c) => c.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, 1)", [mov.id, ids[3]])), "P0001");
      // …ni más que el saldo de un compromiso.
      const otro = await tes((c) => ingreso(c, 9000000, "2026-07-06", "verificado", { excedente: "saldo_a_favor" }));
      await falla(tes((c) => c.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, 6000000)", [otro.id, ids[3]])), "P0001");
      // El ingreso se cuenta una sola vez, sin importar en cuántos meses se distribuya.
      const total = await tes((c) => uno(c, "SELECT sum(valor)::bigint AS s FROM v_movimientos_consulta WHERE tipo = 'ingreso' AND estado = 'verificado'"));
      expect(total.s).toBe(21000000);
      // Saldo a favor: 90.000 por aplicar; al aplicar 50.000 a octubre quedan 40.000.
      await tes((c) => c.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, 5000000)", [otro.id, ids[3]]));
      const favor = await tes((c) => uno(c, "SELECT disponible FROM v_saldos_a_favor WHERE movimiento_id = $1", [otro.id]));
      expect(favor.disponible).toBe(4000000);
      // Abono parcial y un ingreso por verificar que no cuenta como recaudado.
      const parcial = await tes((c) => ingreso(c, 1000000, "2026-09-12", "pendiente"));
      await tes((c) => c.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, 1000000)", [parcial.id, ids[2]]));
      const s = await tes((c) => uno(c, "SELECT abonado, por_verificar, situacion FROM v_compromisos_estado WHERE id = $1", [ids[2]]));
      expect(s).toMatchObject({ abonado: 2000000, por_verificar: 1000000 });
      expect(["parcial", "vencido"]).toContain(s.situacion);
    });
  });

  describe("4. Anulación y corrección ajustan saldos y conservan historial", () => {
    it("un verificado no se edita ni se borra; al anularlo deja de sumar", async () => {
      const m = await tes((c) => uno(c,
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, valor, estado) VALUES ('2026-09-01', 'egreso', $1, 'Papelería', $2, 4000000, 'verificado') RETURNING id",
        [caja, catEgreso]));
      const antes = await tes((c) => saldosCuentas(c, "2026-12-31"));
      await falla(tes((c) => c.query("UPDATE movimientos SET valor = 1 WHERE id = $1", [m.id])), "P0001");
      await falla(tes((c) => c.query("DELETE FROM movimientos WHERE id = $1", [m.id])), "P0001");
      await falla(tes((c) => c.query("UPDATE movimientos SET estado = 'anulado' WHERE id = $1", [m.id])), "23514"); // exige motivo
      await tes((c) => c.query("UPDATE movimientos SET estado = 'anulado', motivo_anulacion = 'Valor equivocado' WHERE id = $1", [m.id]));
      const correccion = await tes((c) => uno(c,
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, valor, estado, corrige_a) VALUES ('2026-09-01', 'egreso', $1, 'Papelería', $2, 3500000, 'verificado', $3) RETURNING id",
        [caja, catEgreso, m.id]));
      const despues = await tes((c) => saldosCuentas(c, "2026-12-31"));
      const s = (x: typeof antes) => x.find((r) => r.cuenta_id === caja)!.saldo;
      expect(s(despues) - s(antes)).toBe(500000);
      const h = await tes((c) => c.query("SELECT accion, usuario_id FROM historial WHERE tabla = 'movimientos' AND registro_id = $1 ORDER BY id", [String(m.id)]));
      expect(h.rows.map((r) => r.accion)).toEqual(["insert", "update"]);
      expect(h.rows.every((r) => r.usuario_id === T)).toBe(true);
      await falla(tes((c) => c.query("UPDATE movimientos SET motivo_anulacion = 'x' WHERE id = $1", [m.id])), "P0001");
      expect(correccion.id).toBeGreaterThan(m.id);
    });
    it("anular un ingreso distribuido devuelve el saldo a los compromisos", async () => {
      const comp = await tes((c) => uno(c,
        "INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, monto, fecha_acordada) VALUES ($1, $2, 'constitucion', 'patrimonio_inicial', 20000000, '2026-07-15') RETURNING id",
        [esqC, org]));
      const m = await tes((c) => ingreso(c, 20000000, "2026-07-20", "verificado", { miembro: org }));
      await tes((c) => c.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, 20000000)", [m.id, comp.id]));
      expect((await tes((c) => situacion(c, comp.id))).situacion).toBe("completo");
      await tes((c) => c.query("UPDATE movimientos SET estado = 'anulado', motivo_anulacion = 'Transferencia devuelta' WHERE id = $1", [m.id]));
      expect(await tes((c) => situacion(c, comp.id))).toMatchObject({ abonado: 0, saldo: 20000000 });
      // La distribución se conserva como historial
      expect((await tes((c) => uno(c, "SELECT count(*)::int AS n FROM aplicaciones WHERE movimiento_id = $1", [m.id]))).n).toBe(1);
      // El historial no se puede alterar ni siquiera por tesorería
      await falla(tes((c) => c.query("DELETE FROM historial")), "42501");
      await falla(tes((c) => c.query("UPDATE historial SET accion = 'x'")), "42501");
    });
  });

  describe("5. El saldo inicial no duplica ingresos históricos", () => {
    it("los movimientos anteriores al corte no se suman al saldo, pero sí al recaudo", async () => {
      const nueva = await tes((c) => uno(c, "INSERT INTO cuentas (nombre, tipo) VALUES ('Ahorros', 'banco') RETURNING id"));
      const comp = await tes((c) => uno(c,
        "INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, monto, fecha_acordada) VALUES ($1, $2, 'constitucion', 'gastos_constitucion', 30000000, '2026-03-01') RETURNING id",
        [esqC, ana]));
      // Aporte recibido el 10 de marzo, antes del corte del 31 de marzo.
      const viejo = await tes((c) => ingreso(c, 30000000, "2026-03-10", "verificado", { cuenta: nueva.id }));
      await tes((c) => c.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, 30000000)", [viejo.id, comp.id]));
      const sop = await tes((c) => uno(c, "INSERT INTO comprobantes (nombre_archivo, tipo_mime, tamano, sha256, contenido) VALUES ('e.pdf', 'application/pdf', $1, 'x', $2) RETURNING id", [PDF.length, PDF]));
      // Sin soporte no se confirma un saldo inicial
      await falla(tes((c) => c.query("INSERT INTO saldos_iniciales (cuenta_id, fecha_corte, valor, referencia) VALUES ($1, '2026-03-31', 100000000, 'Extracto')", [nueva.id])), "23514");
      await tes((c) => c.query("INSERT INTO saldos_iniciales (cuenta_id, fecha_corte, valor, referencia, comprobante_id) VALUES ($1, '2026-03-31', 100000000, 'Extracto marzo', $2)", [nueva.id, sop.id]));
      await tes((c) => ingreso(c, 1000000, "2026-04-02", "verificado", { cuenta: nueva.id }));
      const s = (await tes((c) => saldosCuentas(c, "2026-12-31"))).find((x) => x.cuenta_id === nueva.id)!;
      expect(s.saldo).toBe(101000000); // no 131.000.000
      const r = await con((c) => uno(c, "SELECT historico FROM v_movimientos_consulta WHERE id = $1", [viejo.id]));
      expect(r.historico).toBe(true);
      expect((await tes((c) => situacion(c, comp.id))).situacion).toBe("completo");
      // Un segundo saldo inicial confirmado para la misma cuenta no se admite
      await falla(tes((c) => c.query("INSERT INTO saldos_iniciales (cuenta_id, fecha_corte, valor, referencia, comprobante_id) VALUES ($1, '2026-04-30', 1, 'x', $2)", [nueva.id, sop.id])), "23505");
      // El patrimonio declarado en los estatutos no se carga como saldo
      const conf = await con((c) => uno(c, "SELECT patrimonio_estado FROM configuracion"));
      expect(conf.patrimonio_estado).toBe("por_confirmar");
    });
  });

  describe("6. Gastos pendientes, reservas y pagos no se descuentan dos veces", () => {
    it("el disponible no cambia al pagar un gasto cubierto por una reserva", async () => {
      const fondo = await tes((c) => uno(c, "INSERT INTO fondos (nombre, tipo) VALUES ('Defensa jurídica', 'reserva') RETURNING id"));
      await tes((c) => c.query("INSERT INTO fondo_asignaciones (fondo_id, fecha, valor, motivo) VALUES ($1, '2026-09-01', 50000000, 'Decisión de Junta')", [fondo.id]));
      const ob = await tes((c) => uno(c,
        "INSERT INTO obligaciones (descripcion, categoria_id, fondo_id, monto, fecha_compromiso) VALUES ('Honorarios', $1, $2, 30000000, '2026-09-02') RETURNING id",
        [catEgreso, fondo.id]));
      const sinFondo = await tes((c) => uno(c,
        "INSERT INTO obligaciones (descripcion, categoria_id, monto, fecha_compromiso) VALUES ('Arriendo salón', $1, 10000000, '2026-09-02') RETURNING id", [catEgreso]));
      const r0 = await con((c) => resumenFinanciero(c, "2026-01-01", "2026-12-31"));
      const f0 = r0.fondos.find((f) => f.id === fondo.id)!;
      expect(f0).toMatchObject({ saldo: 50000000, pendiente: 30000000 });
      expect(r0.disponible).toBe(r0.caja - r0.retenido - 10000000);

      // Pago parcial (verificado) de la obligación con cargo al fondo, y pago total de la otra.
      await tes((c) => c.query(
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, fondo_id, obligacion_id, valor, estado) VALUES ('2026-09-10', 'egreso', $1, 'Pago honorarios', $2, $3, $4, 20000000, 'verificado')",
        [cuenta, catEgreso, fondo.id, ob.id]));
      await tes((c) => c.query(
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, obligacion_id, valor, estado) VALUES ('2026-09-10', 'egreso', $1, 'Arriendo', $2, $3, 10000000, 'verificado')",
        [cuenta, catEgreso, sinFondo.id]));
      const r1 = await con((c) => resumenFinanciero(c, "2026-01-01", "2026-12-31"));
      expect(r1.caja).toBe(r0.caja - 30000000);
      expect(r1.disponible).toBe(r0.disponible);
      const f1 = (await con((c) => fondosEstado(c, "2026-12-31"))).find((f) => f.id === fondo.id)!;
      expect(f1).toMatchObject({ saldo: 30000000, pendiente: 10000000 });
      expect((await con((c) => gastosPendientes(c))).gastos_pendientes).toBe(10000000);
      // No se puede pagar más que el gasto comprometido
      await falla(tes((c) => c.query(
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, obligacion_id, valor) VALUES ('2026-09-11', 'egreso', $1, 'Exceso', $2, $3, 10000001)",
        [cuenta, catEgreso, ob.id])), "P0001");
    });
    it("un reembolso disminuye el gasto original y no cuenta como ingreso", async () => {
      const r0 = await con((c) => resumenFinanciero(c, "2026-01-01", "2026-12-31"));
      const eg = await tes((c) => uno(c,
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, valor, estado) VALUES ('2026-09-15', 'egreso', $1, 'Pasajes', $2, 8000000, 'verificado') RETURNING id", [cuenta, catEgreso]));
      await tes((c) => c.query(
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, valor, reembolsa_a, estado) VALUES ('2026-09-20', 'ingreso', $1, 'Reembolso pasajes', 3000000, $2, 'verificado')", [cuenta, eg.id]));
      const r1 = await con((c) => resumenFinanciero(c, "2026-01-01", "2026-12-31"));
      expect(r1.flujos.ingresos).toBe(r0.flujos.ingresos);
      expect(r1.flujos.egresos_netos - r0.flujos.egresos_netos).toBe(5000000);
      await falla(tes((c) => c.query(
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, valor, reembolsa_a) VALUES ('2026-09-21', 'ingreso', $1, 'Exceso', 5000001, $2)", [cuenta, eg.id])), "P0001");
    });
    it("un traslado entre cuentas propias no es ingreso ni egreso", async () => {
      const r0 = await con((c) => resumenFinanciero(c, "2026-01-01", "2026-12-31"));
      await tes((c) => c.query(
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, cuenta_destino_id, concepto, valor, estado) VALUES ('2026-09-25', 'traslado', $1, $2, 'Retiro para caja', 2000000, 'verificado')", [cuenta, caja]));
      const r1 = await con((c) => resumenFinanciero(c, "2026-01-01", "2026-12-31"));
      expect(r1.flujos).toEqual(r0.flujos);
      expect(r1.caja).toBe(r0.caja);
    });
  });

  describe("cierre mensual", () => {
    it("un mes cerrado no admite movimientos nuevos en esa cuenta", async () => {
      await tes((c) => c.query("INSERT INTO cierres (periodo, cuenta_id, saldo_calculado, saldo_observado) VALUES ('2026-09-01', $1, 0, 0)", [caja]));
      await falla(tes((c) => c.query(
        "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, valor) VALUES ('2026-09-30', 'egreso', $1, 'Tarde', $2, 1)", [caja, catEgreso])), "P0001");
      await falla(tes((c) => c.query("INSERT INTO cierres (periodo, cuenta_id, saldo_calculado, saldo_observado) VALUES ('2026-08-01', $1, 0, 5)", [caja])), "23514");
    });
  });
});
