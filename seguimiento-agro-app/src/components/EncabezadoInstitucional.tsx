export default function EncabezadoInstitucional() {
  return (
    <div className="border-b border-azul-900/40 bg-[#16305e]">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-2">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/sello-campo-milagro.png"
          alt="El Campo Milagro"
          className="h-11 w-auto sm:h-12"
        />
        <span className="hidden h-8 w-px bg-white/25 sm:block" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-agricultura.png"
          alt="Ministerio de Agricultura y Desarrollo Rural"
          className="h-8 w-auto sm:h-9"
        />
      </div>
    </div>
  );
}
