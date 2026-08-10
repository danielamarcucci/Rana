import { db } from "./db";
import { SERVICIOS_SEMILLA } from "./seed-data";

async function main() {
  const existentes = await db.all<{ id: number }>("SELECT id FROM servicios LIMIT 1");
  if (existentes.length > 0) {
    console.log("La tabla servicios ya tiene datos, no se vuelve a sembrar.");
    return;
  }

  for (let i = 0; i < SERVICIOS_SEMILLA.length; i++) {
    const s = SERVICIOS_SEMILLA[i];
    await db.run(
      `INSERT INTO servicios (concepto, detalle, inmueble, tipo_cuenta, numero_cuenta, link_pago, orden, activo)
       VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
      [s.concepto, s.detalle, s.inmueble, s.tipo_cuenta, s.numero_cuenta, s.link_pago, i]
    );
  }
  console.log(`Se sembraron ${SERVICIOS_SEMILLA.length} servicios.`);
}

main()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
