export type Testimonio = {
  frase: string;
  autor: string;
  organizacion: string;
};

/**
 * Agrega aquí los testimonios reales de clientes a medida que estén
 * disponibles (anonimizados si es necesario). La sección de la página
 * se oculta a un estado "próximamente" mientras esta lista esté vacía,
 * para no publicar citas que no sean reales.
 */
export const testimonios: Testimonio[] = [];
