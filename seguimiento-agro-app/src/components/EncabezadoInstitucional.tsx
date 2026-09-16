export default function EncabezadoInstitucional() {
  return (
    <div className="border-b border-slate-200 bg-white">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4 px-4 py-2.5">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src="/logo-minagricultura.png"
          alt="Ministerio de Agricultura y Desarrollo Rural"
          className="h-8 w-auto sm:h-9"
        />
        <span className="hidden h-8 w-px bg-slate-200 sm:block" aria-hidden />
        <div className="flex items-baseline gap-1.5">
          <span className="text-lg font-extrabold tracking-tight text-azul-800">Campo</span>
          <span className="text-lg font-extrabold tracking-tight text-naranja-500">Milagro</span>
        </div>
      </div>
    </div>
  );
}
