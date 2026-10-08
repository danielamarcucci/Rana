import { Insignia } from "./ui";

export function EstadoEsquema({ e }: { e: { estado: string } }) {
  if (e.estado === "aprobado") return <Insignia tono="ok">Aprobado</Insignia>;
  if (e.estado === "cerrado") return <Insignia tono="suave">Cerrado</Insignia>;
  return <Insignia tono="aviso">Propuesta · no genera obligaciones</Insignia>;
}
