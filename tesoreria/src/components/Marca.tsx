import Image from "next/image";

/** Logo oficial de la Red (tomado de redagrariacolombia.com) y nombre de la herramienta. */
export function Marca({ grande = false }: { grande?: boolean }) {
  return (
    <span className="flex items-center gap-3 sm:gap-4">
      <Image
        src="/marca/logo-red.webp"
        alt="Red por la Defensa de la Reforma Agraria"
        width={760}
        height={354}
        priority
        className={grande ? "h-16 w-auto sm:h-20" : "h-9 w-auto sm:h-11"}
      />
      <span className={`border-l border-linea ${grande ? "pl-4" : "pl-3 sm:pl-4"}`}>
        <span className={`titular block ${grande ? "text-2xl sm:text-3xl" : "text-lg sm:text-xl"}`}>Tesorería</span>
        <span className={`titular block text-tierra ${grande ? "text-base sm:text-lg" : "text-[13px] sm:text-sm"}`}>de la Red</span>
      </span>
    </span>
  );
}
