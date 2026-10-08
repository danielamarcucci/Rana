"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { escribir } from "@/lib/sesion";
import { ErrorUsuario, mensajeError, type Tx } from "@/lib/db";
import { archivosDe, guardarComprobante } from "@/lib/comprobantes";
import { dinero, entero, fechaCampo, opcion, txt, txtONull } from "@/lib/formulario";
import { leerPesos } from "@/lib/dinero";
import type { EstadoAccion } from "@/lib/tipos";

type Aplicacion = { compromiso_id: number; valor: number };

function leerAplicaciones(d: FormData): Aplicacion[] {
  const out: Aplicacion[] = [];
  for (const [k, v] of d.entries()) {
    const m = /^aplicacion_(\d+)$/.exec(k);
    if (!m || typeof v !== "string" || !v.trim()) continue;
    const valor = leerPesos(v);
    if (valor === null || valor < 0) throw new ErrorUsuario("Revise los valores distribuidos entre compromisos.");
    if (valor > 0) out.push({ compromiso_id: Number(m[1]), valor });
  }
  return out;
}

async function guardarAplicaciones(tx: Tx, movimientoId: number, apps: Aplicacion[], miembroId: number | null) {
  if (!apps.length) return;
  if (!miembroId) throw new ErrorUsuario("Para abonar a compromisos, indique la persona u organización aportante.");
  for (const a of apps) {
    await tx.query("INSERT INTO aplicaciones (movimiento_id, compromiso_id, valor) VALUES ($1, $2, $3)", [movimientoId, a.compromiso_id, a.valor]);
  }
}

async function adjuntar(tx: Tx, d: FormData, campo: { movimiento_id?: number; compromiso_id?: number; obligacion_id?: number; esquema_id?: number }) {
  const datosPersonales = txt(d, "sin_datos_personales") !== "1";
  for (const f of archivosDe(d)) {
    const cid = await guardarComprobante(tx, f, { datosPersonales });
    await tx.query(
      "INSERT INTO soportes (comprobante_id, movimiento_id, compromiso_id, obligacion_id, esquema_id) VALUES ($1, $2, $3, $4, $5)",
      [cid, campo.movimiento_id ?? null, campo.compromiso_id ?? null, campo.obligacion_id ?? null, campo.esquema_id ?? null],
    );
  }
}

/** Registra un movimiento nuevo, edita uno pendiente o registra la corrección de uno existente. */
export async function accionGuardarMovimiento(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  let destino = "";
  try {
    const id = entero(d, "id");
    const corrigeA = entero(d, "corrige_a");
    const tipo = opcion(d, "tipo", ["ingreso", "egreso", "traslado"] as const, { requerido: true, nombre: "el tipo" })!;
    const fecha = fechaCampo(d, "fecha_efectiva", { requerido: true, nombre: "la fecha efectiva" })!;
    const valor = dinero(d, "valor", { requerido: true, nombre: "El valor" })!;
    const cuenta = entero(d, "cuenta_id", { requerido: true, nombre: "la cuenta" })!;
    const cuentaDestino = tipo === "traslado" ? entero(d, "cuenta_destino_id", { requerido: true, nombre: "la cuenta de destino" }) : null;
    const reembolsaA = tipo === "ingreso" ? entero(d, "reembolsa_a") : null;
    const categoria = tipo === "traslado" || reembolsaA ? null : entero(d, "categoria_id", { requerido: true, nombre: "la categoría" });
    const miembro = tipo === "traslado" ? null : entero(d, "miembro_id");
    const obligacion = tipo === "egreso" ? entero(d, "obligacion_id") : null;
    const apps = tipo === "ingreso" && !reembolsaA ? leerAplicaciones(d) : [];
    const totalApps = apps.reduce((a, x) => a + x.valor, 0);
    let excedente = tipo === "ingreso" && !reembolsaA ? opcion(d, "excedente_destino", ["saldo_a_favor", "aporte_adicional"] as const) : null;
    if (totalApps > valor) throw new ErrorUsuario("Lo distribuido entre compromisos supera el valor recibido.");
    if (apps.length && totalApps < valor && !excedente)
      throw new ErrorUsuario("Queda un excedente sin distribuir: indique si es saldo a favor o aporte adicional.");
    if (totalApps === valor) excedente = null;
    if (excedente === "saldo_a_favor" && !miembro) throw new ErrorUsuario("Un saldo a favor debe quedar a nombre de un aportante.");
    const verificar = txt(d, "verificar") === "1";
    const motivoCorreccion = txt(d, "motivo_correccion", 500);
    if (corrigeA && !motivoCorreccion) throw new ErrorUsuario("Indique el motivo de la corrección.");

    const campos = {
      fecha_efectiva: fecha,
      tipo,
      cuenta_id: cuenta,
      cuenta_destino_id: cuentaDestino,
      miembro_id: miembro,
      tercero: tipo === "traslado" ? null : txtONull(d, "tercero", 200),
      concepto: txt(d, "concepto", 300) || null,
      categoria_id: categoria,
      valor,
      medio_pago: txtONull(d, "medio_pago", 60),
      fondo_id: tipo === "traslado" || reembolsaA ? null : entero(d, "fondo_id"),
      referencia_autorizacion: txtONull(d, "referencia_autorizacion", 300),
      obligacion_id: obligacion,
      reembolsa_a: reembolsaA,
      excedente_destino: excedente,
      observaciones: txtONull(d, "observaciones", 1000),
    };
    if (!campos.concepto) throw new ErrorUsuario("Escriba el concepto.");

    const nuevoId = await escribir(async (tx) => {
      if (id) {
        // Edición: solo movimientos pendientes (la base de datos lo exige).
        const { rows } = await tx.query("SELECT estado FROM movimientos WHERE id = $1 FOR UPDATE", [id]);
        if (!rows[0]) throw new ErrorUsuario("El movimiento no existe.");
        if (rows[0].estado !== "pendiente")
          throw new ErrorUsuario("Solo se editan movimientos por verificar. Para uno verificado, registre una corrección.");
        await tx.query("DELETE FROM aplicaciones WHERE movimiento_id = $1", [id]);
        const claves = Object.keys(campos);
        await tx.query(
          `UPDATE movimientos SET ${claves.map((k, i) => `${k} = $${i + 2}`).join(", ")}${verificar ? ", estado = 'verificado'" : ""} WHERE id = $1`,
          [id, ...Object.values(campos)],
        );
        await guardarAplicaciones(tx, id, apps, miembro);
        await adjuntar(tx, d, { movimiento_id: id });
        return id;
      }
      if (corrigeA) {
        const { rows } = await tx.query("SELECT estado FROM movimientos WHERE id = $1 FOR UPDATE", [corrigeA]);
        if (!rows[0] || rows[0].estado === "anulado") throw new ErrorUsuario("El movimiento a corregir no existe o ya está anulado.");
        await tx.query("UPDATE movimientos SET estado = 'anulado', motivo_anulacion = $2 WHERE id = $1", [
          corrigeA, `Corrección: ${motivoCorreccion}`,
        ]);
      }
      const claves = [...Object.keys(campos), "corrige_a", "estado"];
      const valores = [...Object.values(campos), corrigeA, verificar ? "verificado" : "pendiente"];
      const { rows } = await tx.query(
        `INSERT INTO movimientos (${claves.join(", ")}) VALUES (${claves.map((_, i) => `$${i + 1}`).join(", ")}) RETURNING id`,
        valores,
      );
      const nid = Number(rows[0].id);
      await guardarAplicaciones(tx, nid, apps, miembro);
      // Los soportes del movimiento corregido también respaldan la corrección.
      if (corrigeA && txt(d, "conservar_soportes") === "1") {
        await tx.query(
          "INSERT INTO soportes (comprobante_id, movimiento_id) SELECT comprobante_id, $2 FROM soportes WHERE movimiento_id = $1",
          [corrigeA, nid],
        );
      }
      await adjuntar(tx, d, { movimiento_id: nid });
      return nid;
    });
    destino = `/movimientos/${nuevoId}?guardado=1`;
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  redirect(destino);
}

export async function accionVerificar(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    await escribir(async (tx) => {
      const r = await tx.query("UPDATE movimientos SET estado = 'verificado' WHERE id = $1 AND estado = 'pendiente'", [id]);
      if (!r.rowCount) throw new ErrorUsuario("El movimiento ya no está pendiente de verificación.");
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Movimiento verificado. Ya afecta el saldo confirmado." };
}

export async function accionAnular(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const motivo = txt(d, "motivo", 500);
    if (motivo.length < 5) throw new ErrorUsuario("Explique el motivo de la anulación.");
    await escribir(async (tx) => {
      const r = await tx.query(
        "UPDATE movimientos SET estado = 'anulado', motivo_anulacion = $2 WHERE id = $1 AND estado <> 'anulado'",
        [id, motivo],
      );
      if (!r.rowCount) throw new ErrorUsuario("El movimiento ya está anulado.");
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Movimiento anulado. Se conserva en el historial y dejó de afectar los saldos." };
}

export async function accionEliminarPendiente(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    await escribir(async (tx) => {
      const { rows } = await tx.query("SELECT estado FROM movimientos WHERE id = $1 FOR UPDATE", [id]);
      if (rows[0]?.estado !== "pendiente") throw new ErrorUsuario("Solo se eliminan registros por verificar.");
      await tx.query("DELETE FROM aplicaciones WHERE movimiento_id = $1", [id]);
      const sop = await tx.query("DELETE FROM soportes WHERE movimiento_id = $1 RETURNING comprobante_id", [id]);
      await tx.query("DELETE FROM movimientos WHERE id = $1", [id]);
      for (const s of sop.rows) {
        await tx.query(
          `DELETE FROM comprobantes c WHERE c.id = $1 AND NOT EXISTS (SELECT 1 FROM soportes WHERE comprobante_id = c.id)
             AND NOT EXISTS (SELECT 1 FROM saldos_iniciales WHERE comprobante_id = c.id)`,
          [s.comprobante_id],
        );
      }
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  redirect("/movimientos?eliminado=1");
}

export async function accionAgregarSoporte(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const campo = opcion(d, "campo", ["movimiento_id", "compromiso_id", "obligacion_id", "esquema_id"] as const, { requerido: true })!;
    const id = entero(d, "id", { requerido: true })!;
    if (!archivosDe(d).length) throw new ErrorUsuario("Seleccione un archivo PDF, JPG o PNG.");
    await escribir((tx) => adjuntar(tx, d, { [campo]: id }));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Soporte cargado." };
}

export async function accionMarcaDatosPersonales(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = txt(d, "comprobante_id");
    const valor = txt(d, "datos_personales") === "1";
    await escribir((tx) => tx.query("UPDATE comprobantes SET datos_personales = $2 WHERE id = $1", [id, valor]));
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Visibilidad del soporte actualizada." };
}

/** Distribuye (o redistribuye) un ingreso existente entre compromisos, p. ej. para aplicar un saldo a favor. */
export async function accionDistribuir(_: EstadoAccion, d: FormData): Promise<EstadoAccion> {
  try {
    const id = entero(d, "id", { requerido: true })!;
    const apps = leerAplicaciones(d);
    let excedente = opcion(d, "excedente_destino", ["saldo_a_favor", "aporte_adicional"] as const);
    await escribir(async (tx) => {
      const { rows } = await tx.query(
        "SELECT tipo, valor, miembro_id, estado, reembolsa_a, excedente_destino FROM movimientos WHERE id = $1 FOR UPDATE", [id]);
      const m = rows[0];
      if (!m || m.tipo !== "ingreso" || m.reembolsa_a) throw new ErrorUsuario("Solo se distribuyen ingresos.");
      if (m.estado === "anulado") throw new ErrorUsuario("El ingreso está anulado.");
      // En un ingreso verificado, el destino del excedente ya se decidió al registrarlo y no cambia.
      if (m.estado === "verificado") excedente = m.excedente_destino;
      const total = apps.reduce((a, x) => a + x.valor, 0);
      if (total > m.valor) throw new ErrorUsuario("La distribución supera el valor recibido.");
      if (total < m.valor && apps.length && !excedente)
        throw new ErrorUsuario(m.estado === "verificado"
          ? "Este ingreso verificado no tiene destino para un excedente; distribúyalo completo o registre una corrección."
          : "Indique qué hacer con el excedente.");
      await tx.query("DELETE FROM aplicaciones WHERE movimiento_id = $1", [id]);
      await guardarAplicaciones(tx, id, apps, m.miembro_id);
      if (m.estado === "pendiente") {
        await tx.query("UPDATE movimientos SET excedente_destino = $2 WHERE id = $1", [id, total === m.valor ? null : excedente]);
      }
    });
  } catch (e) {
    return { error: mensajeError(e) };
  }
  revalidatePath("/", "layout");
  return { ok: "Distribución guardada." };
}
