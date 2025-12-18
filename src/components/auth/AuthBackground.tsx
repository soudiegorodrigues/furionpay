export function AuthBackground() {
  return (
    <div className="fixed inset-0 z-0 bg-black">
      {/* Gradient overlay escuro */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
      
      {/* Shield central com baixa opacidade */}
      <div className="absolute inset-0 flex items-center justify-center">
        <svg
          viewBox="0 0 200 240"
          className="w-[500px] h-[600px] opacity-[0.04]"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Shield shape */}
          <path
            d="M100 10L180 50V130C180 180 140 220 100 235C60 220 20 180 20 130V50L100 10Z"
            fill="currentColor"
            className="text-white"
          />
          {/* Inner shield detail */}
          <path
            d="M100 30L160 60V125C160 165 130 195 100 210C70 195 40 165 40 125V60L100 30Z"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            className="text-white"
          />
          {/* Center checkmark */}
          <path
            d="M70 120L90 140L130 95"
            stroke="currentColor"
            strokeWidth="8"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="text-white"
          />
        </svg>
      </div>
      
      {/* Subtle vignette */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]" />
    </div>
  );
}
