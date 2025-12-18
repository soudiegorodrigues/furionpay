export function AuthBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden">
      {/* Base dark gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-black" />
      
      {/* Subtle red undertone */}
      <div className="absolute inset-0 bg-gradient-to-t from-red-950/20 via-transparent to-transparent" />
      
      {/* Shield glow behind */}
      <div 
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[700px]"
        style={{
          background: 'radial-gradient(ellipse at center, hsl(var(--primary) / 0.08) 0%, transparent 60%)',
          filter: 'blur(60px)'
        }}
      />
      
      {/* Shield SVG */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[600px] opacity-[0.06]">
        <svg
          viewBox="0 0 100 120"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full"
        >
          {/* Shield outline */}
          <path
            d="M50 2L8 20V55C8 82 28 105 50 118C72 105 92 82 92 55V20L50 2Z"
            stroke="white"
            strokeWidth="1.5"
            fill="none"
          />
          
          {/* Inner shield layer */}
          <path
            d="M50 8L14 24V55C14 78 32 99 50 111C68 99 86 78 86 55V24L50 8Z"
            stroke="white"
            strokeWidth="0.8"
            fill="white"
            fillOpacity="0.03"
          />
          
          {/* Checkmark inside shield */}
          <path
            d="M35 58L45 68L65 48"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
            fill="none"
          />
          
          {/* Decorative lines */}
          <path
            d="M50 25V35"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M50 85V95"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M25 55H35"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
          <path
            d="M65 55H75"
            stroke="white"
            strokeWidth="1"
            strokeLinecap="round"
            opacity="0.5"
          />
        </svg>
      </div>
      
      {/* Noise texture overlay */}
      <div 
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noise'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noise)'/%3E%3C/svg%3E")`,
          backgroundRepeat: 'repeat'
        }}
      />
      
      {/* Vignette effect */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.4) 100%)'
        }}
      />
    </div>
  );
}
