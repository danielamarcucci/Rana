#!/usr/bin/env node
// Administración de cuentas de acceso desde la línea de comandos (procedimiento
// administrativo). Requiere la conexión del propietario de la base de datos.
//
//   npm run cuenta -- listar
//   npm run cuenta -- crear <usuario> tesoreria|consulta "Nombre completo"
//   npm run cuenta -- restablecer <usuario>
//   npm run cuenta -- desactivar <usuario>
//   npm run cuenta -- activar <usuario>
//
// Las contraseñas se piden por teclado (sin mostrarse) y nunca se guardan en
// texto plano ni quedan en el historial de la terminal.
import { randomBytes, scrypt as _scrypt } from "node:crypto";
import { promisify } from "node:util";
import readline from "node:readline";
import pg from "pg";

const scrypt = promisify(_scrypt);
const url = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL;
if (!url) {
  console.error("Defina DATABASE_URL con la conexión del propietario de la base de datos.");
  process.exit(1);
}

async function hash(clave) {
  const salt = randomBytes(16);
  const h = await scrypt(clave.normalize("NFC"), salt, 32, { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  return `scrypt$32768$8$1$${salt.toString("base64")}$${h.toString("base64")}`;
}

function preguntarOculto(texto) {
  return new Promise((res) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = (s) => { if (s.includes(texto)) rl.output.write(s); };
    rl.question(texto, (r) => { rl.close(); process.stdout.write("\n"); res(r); });
  });
}

async function nuevaClave(usuario) {
  const a = await preguntarOculto("Nueva contraseña (mínimo 12 caracteres): ");
  const b = await preguntarOculto("Repita la contraseña: ");
  if (a !== b) throw new Error("Las contraseñas no coinciden.");
  if (a.length < 12) throw new Error("La contraseña debe tener al menos 12 caracteres.");
  if (a.toLowerCase().includes(usuario.toLowerCase())) throw new Error("La contraseña no debe contener el usuario.");
  return hash(a);
}

const [cmd, usuarioArg, rol, ...nombre] = process.argv.slice(2);
const usuario = (usuarioArg || "").toLowerCase();
const db = new pg.Client({ connectionString: url });
await db.connect();
try {
  switch (cmd) {
    case "listar": {
      const { rows } = await db.query("SELECT usuario, nombre, rol, activo, ultimo_acceso FROM usuarios ORDER BY rol, usuario");
      console.table(rows);
      break;
    }
    case "crear": {
      if (!/^[a-z0-9._-]{3,40}$/.test(usuario)) throw new Error("Usuario no válido (3-40: minúsculas, números, punto, guion).");
      if (!["tesoreria", "consulta"].includes(rol)) throw new Error("El rol debe ser tesoreria o consulta.");
      if (!nombre.join(" ").trim()) throw new Error('Indique el nombre entre comillas: "Nombre completo".');
      const h = await nuevaClave(usuario);
      await db.query("INSERT INTO usuarios (usuario, nombre, rol, clave_hash) VALUES ($1, $2, $3, $4)", [usuario, nombre.join(" ").trim(), rol, h]);
      console.log(`Cuenta ${usuario} (${rol}) creada.`);
      break;
    }
    case "restablecer": {
      const h = await nuevaClave(usuario);
      await db.query("BEGIN");
      const r = await db.query("UPDATE usuarios SET clave_hash = $2, clave_cambiada_en = now() WHERE usuario = $1 RETURNING id", [usuario, h]);
      if (!r.rowCount) throw new Error("No existe esa cuenta.");
      await db.query("DELETE FROM sesiones WHERE usuario_id = $1", [r.rows[0].id]);
      await db.query("COMMIT");
      console.log(`Contraseña de ${usuario} actualizada; se cerraron sus sesiones.`);
      break;
    }
    case "desactivar":
    case "activar": {
      const r = await db.query("UPDATE usuarios SET activo = $2 WHERE usuario = $1 RETURNING id", [usuario, cmd === "activar"]);
      if (!r.rowCount) throw new Error("No existe esa cuenta.");
      if (cmd === "desactivar") await db.query("DELETE FROM sesiones WHERE usuario_id = $1", [r.rows[0].id]);
      console.log(`Cuenta ${usuario} ${cmd === "activar" ? "activada" : "desactivada"}.`);
      break;
    }
    default:
      console.log("Uso: npm run cuenta -- listar | crear <usuario> <tesoreria|consulta> \"Nombre\" | restablecer <usuario> | desactivar <usuario> | activar <usuario>");
  }
} catch (e) {
  await db.query("ROLLBACK").catch(() => {});
  console.error("Error:", e.message);
  process.exitCode = 1;
} finally {
  await db.end();
}
