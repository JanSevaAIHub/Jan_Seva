export function JanSevaLogo({ size = 32, showText = true, className = '' }) {
  return (
    <div className={`flex items-center gap-2.5 ${className}`}>
      {/* Exact Dual Wave Ribbon Logo Mark */}
      <svg
        width={size}
        height={(size * 24) / 32}
        viewBox="0 0 44 28"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="flex-none drop-shadow-sm"
      >
        <defs>
          <linearGradient id="logoSaffron" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFA64D" />
            <stop offset="50%" stopColor="#F58B30" />
            <stop offset="100%" stopColor="#E26D16" />
          </linearGradient>
          <linearGradient id="logoCyan" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#5EEAD4" />
            <stop offset="50%" stopColor="#14B8A6" />
            <stop offset="100%" stopColor="#0D9488" />
          </linearGradient>
        </defs>

        {/* Top Wave (Saffron / Orange) */}
        <path
          d="M 4 11 C 9 4, 19 3, 27 8 C 34 12, 39 10, 42 7 C 40 12, 34 16, 26 13 C 18 10, 10 11, 4 14 C 3.2 13.2, 3.2 11.8, 4 11 Z"
          fill="url(#logoSaffron)"
        />

        {/* Bottom Wave (Cyan / Teal) */}
        <path
          d="M 4 20 C 9 13, 19 12, 27 17 C 34 21, 39 19, 42 16 C 40 21, 34 25, 26 22 C 18 19, 10 20, 4 23 C 3.2 22.2, 3.2 20.8, 4 20 Z"
          fill="url(#logoCyan)"
        />
      </svg>

      {showText && (
        <span className="text-[19px] font-bold text-white tracking-tight flex items-baseline gap-1 select-none">
          <span>JanSeva</span>
          <span className="font-semibold text-slate-100">AI</span>
        </span>
      )}
    </div>
  )
}

