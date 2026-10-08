#!/usr/bin/env node
// Carga datos FICTICIOS para una instalación de DEMOSTRACIÓN.
// Nunca lo ejecute contra la base de datos real. Exige:
//   MODO_DEMO=1 y el argumento --confirmar-demo, y una base sin movimientos reales.
// La aplicación muestra una franja "MODO DE DEMOSTRACIÓN" cuando MODO_DEMO=1.
import pg from "pg";

if (process.env.MODO_DEMO !== "1" || !process.argv.includes("--confirmar-demo")) {
  console.error("Solo para demostración: defina MODO_DEMO=1 y ejecute con --confirmar-demo.");
  process.exit(1);
}
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
const db = new pg.Client({ connectionString: url });
await db.connect();
const uno = async (sql, p = []) => (await db.query(sql, p)).rows[0];
try {
  await db.query("BEGIN");
  await db.query("CREATE TABLE IF NOT EXISTS _demo (cargado_en timestamptz DEFAULT now())");
  const yaDemo = (await uno("SELECT count(*)::int AS n FROM _demo")).n > 0;
  const hayDatos = (await uno("SELECT count(*)::int AS n FROM movimientos")).n > 0;
  if (hayDatos && !yaDemo) throw new Error("La base tiene movimientos que no son de demostración. No se cargan datos ficticios.");
  if (yaDemo) throw new Error("Los datos de demostración ya están cargados.");
  await db.query("INSERT INTO _demo DEFAULT VALUES");

  const pdf = Buffer.from("%PDF-1.4\n% Soporte ficticio de demostración\n%%EOF\n");
  const sop = await uno("INSERT INTO comprobantes (nombre_archivo, tipo_mime, tamano, sha256, contenido, datos_personales, descripcion) VALUES ('demo.pdf', 'application/pdf', $1, 'demo', $2, false, 'Ficticio') RETURNING id", [pdf.length, pdf]);
  const banco = await uno("INSERT INTO cuentas (nombre, tipo, entidad) VALUES ('[Demo] Cuenta de ahorros', 'banco', 'Banco ficticio') RETURNING id");
  const caja = await uno("INSERT INTO cuentas (nombre, tipo) VALUES ('[Demo] Caja menor', 'caja') RETURNING id");
  await db.query("INSERT INTO saldos_iniciales (cuenta_id, fecha_corte, valor, referencia, comprobante_id) VALUES ($1, '2026-06-30', 150000000, '[Demo] Extracto ficticio', $2)", [banco.id, sop.id]);
  await db.query("INSERT INTO saldos_iniciales (cuenta_id, fecha_corte, valor, referencia, comprobante_id) VALUES ($1, '2026-06-30', 20000000, '[Demo] Arqueo ficticio', $2)", [caja.id, sop.id]);
  const nombres = [["[Demo] Persona A", "asociado"], ["[Demo] Persona B", "asociado"], ["[Demo] Organización C", "aportante"], ["[Demo] Persona D", "otro"]];
  const m = [];
  for (const [n, v] of nombres) m.push((await uno("INSERT INTO miembros (nombre, vinculo, fecha_vinculacion) VALUES ($1, $2, '2026-05-01') RETURNING id", [n, v])).id);
  const cat = Object.fromEntries((await db.query("SELECT nombre, id FROM categorias")).rows.map((r) => [r.nombre, r.id]));
  const ec = await uno("INSERT INTO esquemas_aporte (tipo, nombre, estado, organo, referencia_acuerdo, fecha_acuerdo, presupuesto_gastos, meta_gastos, meta_patrimonio) VALUES ('constitucion', '[Demo] Aporte de constitución', 'aprobado', 'asamblea', '[Demo] Acta 1', '2026-05-01', 120000000, 120000000, 200000000) RETURNING id");
  const em = await uno("INSERT INTO esquemas_aporte (tipo, nombre, estado, organo, referencia_acuerdo, fecha_acuerdo, dia_pago, monto_sugerido) VALUES ('mensual', '[Demo] Mensualidad', 'aprobado', 'junta', '[Demo] Acta 3', '2026-06-10', 10, 5000000) RETURNING id");
  for (const [i, monto] of [[0, 40000000], [1, 40000000], [2, 60000000]]) {
    await db.query("INSERT INTO compromisos (esquema_id, miembro_id, tipo, destino, monto, fecha_acordada) VALUES ($1, $2, 'constitucion', 'gastos_constitucion', $3, '2026-07-31')", [ec.id, m[i], monto]);
  }
  for (const [i, monto] of [[0, 5000000], [2, 10000000]]) {
    await db.query("INSERT INTO adhesiones (esquema_id, miembro_id, monto, mes_inicio, referencia_aceptacion, fecha_aceptacion) VALUES ($1, $2, $3, '2026-07-01', '[Demo] Aceptación', '2026-06-20')", [em.id, m[i], monto]);
  }
  console.log("Datos de demostración cargados. Genere las mensualidades desde Aportes → Mensualidades y registre pagos de prueba.");
  await db.query(
    "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, valor, estado, tercero, verificado_en) VALUES ('2026-08-03', 'egreso', $1, '[Demo] Papelería', $2, 8500000, 'verificado', 'Proveedor ficticio', now())",
    [banco.id, cat["Funcionamiento"]]);
  await db.query(
    "INSERT INTO movimientos (fecha_efectiva, tipo, cuenta_id, concepto, categoria_id, valor, estado, tercero, verificado_en) VALUES ('2026-08-15', 'ingreso', $1, '[Demo] Donación', $2, 30000000, 'verificado', 'Donante ficticio', now())",
    [banco.id, cat["Donaciones"]]);
  await db.query("COMMIT");
} catch (e) {
  await db.query("ROLLBACK").catch(() => {});
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
