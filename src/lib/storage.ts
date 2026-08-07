import fs from "node:fs/promises";
import path from "node:path";

// Abstracción de almacenamiento de archivos (soportes de denuncias y fotos
// de la ficha gráfica). En Vercel el disco local no es persistente entre
// despliegues ni entre instancias, así que en producción se usa Vercel Blob
// (activo cuando BLOB_READ_WRITE_TOKEN está configurado). En desarrollo
// local, sin ese token, se guarda en disco bajo RANA_DATA_DIR/uploads.

// Igual que en db.ts: en Vercel solo /tmp admite escritura (y es efímero).
const DATA_DIR =
  process.env.RANA_DATA_DIR ||
  (process.env.VERCEL ? "/tmp/rana-data" : path.join(process.cwd(), "data"));
const LOCAL_UPLOADS_DIR = path.join(DATA_DIR, "uploads");

function usaBlob() {
  return !!process.env.BLOB_READ_WRITE_TOKEN;
}

/** Guarda un archivo y devuelve la referencia a almacenar en la base de
 * datos: una URL (Vercel Blob) o una ruta relativa (disco local). */
export async function guardarArchivo(
  carpeta: string,
  nombreArchivo: string,
  buffer: Buffer,
  contentType: string
): Promise<string> {
  if (usaBlob()) {
    const { put } = await import("@vercel/blob");
    // Acceso privado: los soportes y fotos de las denuncias son datos
    // sensibles. Solo puede leerlos esta aplicación (con el token), nunca
    // una URL suelta.
    const resultado = await put(`${carpeta}/${nombreArchivo}`, buffer, {
      access: "private",
      contentType,
      addRandomSuffix: false,
    });
    return resultado.url;
  }

  const destino = path.join(LOCAL_UPLOADS_DIR, carpeta);
  await fs.mkdir(destino, { recursive: true });
  await fs.writeFile(path.join(destino, nombreArchivo), buffer);
  return `local:${carpeta}/${nombreArchivo}`;
}

/** Recupera el contenido de un archivo a partir de la referencia guardada
 * (soporta tanto URLs de Vercel Blob como rutas locales antiguas). */
export async function obtenerArchivo(ref: string): Promise<Buffer | null> {
  try {
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      const { get } = await import("@vercel/blob");
      const resultado = await get(ref, { access: "private" });
      if (!resultado) return null;
      return Buffer.from(await new Response(resultado.stream).arrayBuffer());
    }
    const relativo = ref.startsWith("local:") ? ref.slice("local:".length) : ref;
    const ruta = path.join(LOCAL_UPLOADS_DIR, relativo);
    return await fs.readFile(ruta);
  } catch {
    return null;
  }
}

/** Elimina un archivo previamente guardado (usado al reemplazar una foto). */
export async function eliminarArchivo(ref: string): Promise<void> {
  try {
    if (ref.startsWith("http://") || ref.startsWith("https://")) {
      const { del } = await import("@vercel/blob");
      await del(ref);
      return;
    }
    const relativo = ref.startsWith("local:") ? ref.slice("local:".length) : ref;
    await fs.unlink(path.join(LOCAL_UPLOADS_DIR, relativo));
  } catch {
    // El archivo puede no existir; no es un error crítico.
  }
}
