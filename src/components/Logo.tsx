export function LogoMark({ className = "h-10 w-10" }: { className?: string }) {
  return (
    <svg viewBox="0 0 64 64" className={className} aria-hidden="true">
      <circle cx="32" cy="32" r="31" fill="#397a29" />
      <path
        d="M32 6c-9 8-9 20-9 20s12 0 20-9c-1 9-9 17-9 17"
        fill="none"
        stroke="#dcf0d6"
        strokeWidth="0"
      />
      <g fill="#f4ecd6">
        <path d="M32 46V22" stroke="#f4ecd6" strokeWidth="3" strokeLinecap="round" />
        <path d="M32 22c-6-1-10-6-10-13 7 0 12 4 13 10" />
        <path d="M32 22c6-1 10-6 10-13-7 0-12 4-13 10" />
        <path d="M32 30c-5-1-9-5-9-11 6 0 10 3.5 11 9" />
        <path d="M32 30c5-1 9-5 9-11-6 0-10 3.5-11 9" />
        <path d="M32 38c-4-.5-7-4-7-9 5 0 8 3 8 7.5" />
        <path d="M32 38c4-.5 7-4 7-9-5 0-8 3-8 7.5" />
      </g>
      <path
        d="M20 46c2 4 7 7 12 7s10-3 12-7"
        fill="none"
        stroke="#f4ecd6"
        strokeWidth="3"
        strokeLinecap="round"
      />
    </svg>
  );
}

export function Marca({ subtitulo }: { subtitulo?: string }) {
  return (
    <div className="flex items-center gap-3">
      <LogoMark />
      <div className="leading-tight">
        <p className="font-extrabold text-hoja-800 text-base sm:text-lg">
          Red Nacional de Defensa
        </p>
        <p className="font-extrabold text-hoja-800 text-base sm:text-lg -mt-1">
          por la Reforma Agraria
        </p>
        {subtitulo && <p className="text-xs text-tierra-600 mt-0.5">{subtitulo}</p>}
      </div>
    </div>
  );
}
