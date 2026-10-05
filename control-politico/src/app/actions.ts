"use server";

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { guardarConfiguracion } from "@/lib/configuracion";
import * as repo from "@/lib/debates";
import { cargarEjemplo } from "@/lib/ejemplo";
import { COOKIE_SESION, claveConfigurada, igualSeguro, tokenEsperado } from "@/lib/sesion";
import {
  ESTADOS_DEBATE,
  ESTADOS_PETICION,
  EVALUACIONES,
  INSTANCIAS,
  TIPOS_FUENTE,
  TIPOS_PETICION,
  type EstadoDebate,
} from "@/lib/types";

// --- Utilidades para leer formularios ------------------------------------

function texto(fd: FormData, campo: string, max = 20000): string {
  return String(fd.get(campo) ?? "").trim().slice(0, max);
}

function requerido(fd: FormData, campo: string, max?: number): string {
  const v = texto(fd, campo, max);
  if (!v) throw new Error(`Falta el campo obligatorio: ${campo}`);
  return v;
}

function fecha(fd: FormData, campo: string): string | null {
  const v = texto(fd, campo, 10);
  return /^\d{4}-\d{2}-\d{2}$/.test(v) ? v : null;
}

function entero(fd: FormData, campo: string): number {
  const n = Number(fd.get(campo));
  if (!Number.isInteger(n) || n <= 0) throw new Error(`Valor inválido: ${campo}`);
  return n;
}

function opcional(fd: FormData, campo: string): number | undefined {
  const n = Number(fd.get(campo));
  return Number.isInteger(n) && n > 0 ? n : undefined;
}

function opcion<T extends string>(fd: FormData, campo: string, opciones: { valor: T }[], porDefecto: T): T {
  const v = texto(fd, campo);
  return opciones.some((o) => o.valor === v) ? (v as T) : porDefecto;
}

function refrescar(debateId?: number) {
  revalidatePath("/");
  if (debateId) revalidatePath(`/debates/${debateId}`, "layout");
}

// --- Debates -----------------------------------------------------------------

function leerDebate(fd: FormData): repo.DatosDebate {
  return {
    titulo: requerido(fd, "titulo", 300),
    tema: texto(fd, "tema", 1000),
    municipio: texto(fd, "municipio", 200),
    instancia: opcion(fd, "instancia", INSTANCIAS, "plenaria"),
    instancia_otra: texto(fd, "instancia_otra", 200),
    citantes: texto(fd, "citantes", 2000),
    bancada: texto(fd, "bancada", 200),
    justificacion: texto(fd, "justificacion"),
    objetivo: texto(fd, "objetivo"),
    fecha_radicacion: fecha(fd, "fecha_radicacion"),
    fecha_aprobacion: fecha(fd, "fecha_aprobacion"),
    fecha_debate: fecha(fd, "fecha_debate"),
    estado: opcion<EstadoDebate>(fd, "estado", ESTADOS_DEBATE, "borrador"),
  };
}

export async function crearDebateAccion(fd: FormData) {
  const id = await repo.crearDebate(leerDebate(fd));
  refrescar();
  redirect(`/debates/${id}`);
}

export async function actualizarDebateAccion(fd: FormData) {
  const id = entero(fd, "debateId");
  await repo.actualizarDebate(id, leerDebate(fd));
  refrescar(id);
}

export async function cambiarEstadoAccion(fd: FormData) {
  const id = entero(fd, "debateId");
  await repo.cambiarEstado(id, opcion<EstadoDebate>(fd, "estado", ESTADOS_DEBATE, "borrador"));
  refrescar(id);
}

export async function eliminarDebateAccion(fd: FormData) {
  const id = entero(fd, "debateId");
  if (texto(fd, "confirmacion").toUpperCase() !== "ELIMINAR") {
    throw new Error("Escriba ELIMINAR para confirmar");
  }
  await repo.eliminarDebate(id);
  refrescar();
  redirect("/");
}

export async function cargarEjemploAccion() {
  const id = await cargarEjemplo();
  refrescar();
  redirect(`/debates/${id}`);
}

// --- Citados y preguntas ----------------------------------------------------

export async function guardarCitadoAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.guardarCitado(
    debateId,
    {
      nombre: texto(fd, "nombre", 200),
      cargo: requerido(fd, "cargo", 300),
      entidad: texto(fd, "entidad", 300),
      tipo: texto(fd, "tipo") === "invitado" ? "invitado" : "citado",
    },
    opcional(fd, "id")
  );
  refrescar(debateId);
}

export async function eliminarCitadoAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.eliminarCitado(debateId, entero(fd, "id"));
  refrescar(debateId);
}

function leerPregunta(fd: FormData) {
  return {
    citado_id: opcional(fd, "citado_id") ?? null,
    eje: texto(fd, "eje", 300),
    texto: requerido(fd, "texto", 4000),
    proposito: texto(fd, "proposito", 2000),
  };
}

export async function crearPreguntaAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.crearPregunta(debateId, leerPregunta(fd));
  refrescar(debateId);
}

export async function actualizarPreguntaAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.actualizarPregunta(debateId, entero(fd, "id"), leerPregunta(fd));
  refrescar(debateId);
}

export async function moverPreguntaAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.moverPregunta(debateId, entero(fd, "id"), texto(fd, "direccion") === "arriba" ? "arriba" : "abajo");
  refrescar(debateId);
}

export async function eliminarPreguntaAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.eliminarPregunta(debateId, entero(fd, "id"));
  refrescar(debateId);
}

export async function registrarRespuestaAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.registrarRespuesta(debateId, entero(fd, "id"), {
    respuesta: texto(fd, "respuesta"),
    evaluacion: opcion(fd, "evaluacion", EVALUACIONES, "pendiente"),
    repregunta: texto(fd, "repregunta", 4000),
  });
  refrescar(debateId);
}

// --- Fuentes y peticiones -------------------------------------------------

export async function guardarFuenteAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  const url = texto(fd, "url", 2000);
  await repo.guardarFuente(
    debateId,
    {
      tipo: opcion(fd, "tipo", TIPOS_FUENTE, "documento"),
      titulo: requerido(fd, "titulo", 500),
      descripcion: texto(fd, "descripcion", 4000),
      url: /^https?:\/\//i.test(url) ? url : "",
      hallazgo: texto(fd, "hallazgo", 4000),
      verificada: fd.get("verificada") ? 1 : 0,
    },
    opcional(fd, "id")
  );
  refrescar(debateId);
}

export async function eliminarFuenteAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.eliminarFuente(debateId, entero(fd, "id"));
  refrescar(debateId);
}

export async function guardarPeticionAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  const fechaEnvio = fecha(fd, "fecha_envio");
  if (!fechaEnvio) throw new Error("Falta la fecha de envío");
  await repo.guardarPeticion(
    debateId,
    {
      entidad: requerido(fd, "entidad", 300),
      asunto: texto(fd, "asunto", 1000),
      radicado: texto(fd, "radicado", 100),
      tipo: opcion(fd, "tipo", TIPOS_PETICION, "informacion"),
      fecha_envio: fechaEnvio,
      estado: opcion(fd, "estado", ESTADOS_PETICION, "enviada"),
      notas: texto(fd, "notas", 4000),
    },
    opcional(fd, "id")
  );
  refrescar(debateId);
}

export async function eliminarPeticionAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.eliminarPeticion(debateId, entero(fd, "id"));
  refrescar(debateId);
}

// --- Guion -------------------------------------------------------------------

export async function guardarSeccionAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  const minutos = Math.max(0, Math.min(120, Math.round(Number(fd.get("minutos")) || 0)));
  await repo.guardarSeccion(
    debateId,
    { titulo: requerido(fd, "titulo", 300), contenido: texto(fd, "contenido"), minutos },
    opcional(fd, "id")
  );
  refrescar(debateId);
}

export async function moverSeccionAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.moverSeccion(debateId, entero(fd, "id"), texto(fd, "direccion") === "arriba" ? "arriba" : "abajo");
  refrescar(debateId);
}

export async function eliminarSeccionAccion(fd: FormData) {
  const debateId = entero(fd, "debateId");
  await repo.eliminarSeccion(debateId, entero(fd, "id"));
  refrescar(debateId);
}

// --- Configuración y sesión ----------------------------------------------

export async function guardarConfiguracionAccion(fd: FormData) {
  const dias = (campo: string, min: number, max: number) =>
    Math.max(min, Math.min(max, Math.round(Number(fd.get(campo)) || 0)));
  await guardarConfiguracion({
    concejo: texto(fd, "concejo", 200) || "Concejo Municipal",
    municipio: texto(fd, "municipio", 200),
    concejal: texto(fd, "concejal", 500),
    diasAnticipacionCitacion: dias("diasAnticipacionCitacion", 1, 30),
    diasRespuestaAntesDebate: dias("diasRespuestaAntesDebate", 0, 30),
    minutosIntervencion: dias("minutosIntervencion", 1, 180),
  });
  revalidatePath("/", "layout");
  redirect("/?guardado=1");
}

export async function iniciarSesionAccion(_prev: string | null, fd: FormData): Promise<string | null> {
  const clave = claveConfigurada();
  const esperado = await tokenEsperado();
  if (!clave || !esperado) redirect("/");
  if (!igualSeguro(String(fd.get("clave") ?? ""), clave)) {
    await new Promise((r) => setTimeout(r, 800));
    return "Clave incorrecta";
  }
  (await cookies()).set(COOKIE_SESION, esperado, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
  });
  redirect("/");
}

export async function cerrarSesionAccion() {
  (await cookies()).delete(COOKIE_SESION);
  redirect("/login");
}
