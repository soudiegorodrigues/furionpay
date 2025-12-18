export function AuthBackground() {
  return (
    <>
      {/* Base gradient - darker and more intense */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-red-950/40" />
      
      {/* Hexagonal grid pattern */}
      <div className="absolute inset-0 opacity-[0.03]">
        <svg className="w-full h-full" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="hexagons" width="50" height="43.4" patternUnits="userSpaceOnUse" patternTransform="scale(2)">
              <polygon 
                points="25,0 50,14.4 50,43.4 25,57.7 0,43.4 0,14.4" 
                fill="none" 
                stroke="hsl(var(--primary))" 
                strokeWidth="0.5"
              />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#hexagons)" />
        </svg>
      </div>
      
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Central shield glow - intense */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full animate-pulse"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, hsl(var(--primary) / 0.1) 30%, transparent 60%)',
            filter: 'blur(60px)'
          }}
        />
        
        {/* Central Shield SVG */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-[0.08]">
          <svg 
            width="500" 
            height="580" 
            viewBox="0 0 100 116" 
            fill="none" 
            xmlns="http://www.w3.org/2000/svg"
            className="animate-pulse"
            style={{ animationDuration: '4s' }}
          >
            {/* Shield outer glow */}
            <defs>
              <filter id="shieldGlow" x="-50%" y="-50%" width="200%" height="200%">
                <feGaussianBlur stdDeviation="3" result="coloredBlur"/>
                <feMerge>
                  <feMergeNode in="coloredBlur"/>
                  <feMergeNode in="SourceGraphic"/>
                </feMerge>
              </filter>
              <linearGradient id="shieldGradient" x1="50%" y1="0%" x2="50%" y2="100%">
                <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity="1"/>
                <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity="0.3"/>
              </linearGradient>
            </defs>
            
            {/* Main shield shape */}
            <path 
              d="M50 2L95 20V52C95 80 75 100 50 114C25 100 5 80 5 52V20L50 2Z" 
              stroke="url(#shieldGradient)" 
              strokeWidth="2"
              fill="none"
              filter="url(#shieldGlow)"
            />
            
            {/* Inner shield detail */}
            <path 
              d="M50 12L85 26V52C85 74 69 90 50 102C31 90 15 74 15 52V26L50 12Z" 
              stroke="hsl(var(--primary))" 
              strokeWidth="1"
              strokeOpacity="0.5"
              fill="none"
            />
            
            {/* Checkmark inside shield */}
            <path 
              d="M35 55L45 65L65 45" 
              stroke="hsl(var(--primary))" 
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
              fill="none"
            />
            
            {/* Top accent */}
            <circle cx="50" cy="8" r="3" fill="hsl(var(--primary))" fillOpacity="0.6"/>
          </svg>
        </div>
        
        {/* Circuit lines emanating from center */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.04]" xmlns="http://www.w3.org/2000/svg">
          {/* Horizontal lines */}
          <line x1="0" y1="50%" x2="35%" y2="50%" stroke="hsl(var(--primary))" strokeWidth="1"/>
          <line x1="65%" y1="50%" x2="100%" y2="50%" stroke="hsl(var(--primary))" strokeWidth="1"/>
          
          {/* Diagonal lines */}
          <line x1="0" y1="30%" x2="30%" y2="45%" stroke="hsl(var(--primary))" strokeWidth="0.5"/>
          <line x1="70%" y1="45%" x2="100%" y2="30%" stroke="hsl(var(--primary))" strokeWidth="0.5"/>
          <line x1="0" y1="70%" x2="30%" y2="55%" stroke="hsl(var(--primary))" strokeWidth="0.5"/>
          <line x1="70%" y1="55%" x2="100%" y2="70%" stroke="hsl(var(--primary))" strokeWidth="0.5"/>
          
          {/* Connection nodes */}
          <circle cx="35%" cy="50%" r="3" fill="hsl(var(--primary))" fillOpacity="0.3"/>
          <circle cx="65%" cy="50%" r="3" fill="hsl(var(--primary))" fillOpacity="0.3"/>
          <circle cx="30%" cy="45%" r="2" fill="hsl(var(--primary))" fillOpacity="0.2"/>
          <circle cx="70%" cy="45%" r="2" fill="hsl(var(--primary))" fillOpacity="0.2"/>
          <circle cx="30%" cy="55%" r="2" fill="hsl(var(--primary))" fillOpacity="0.2"/>
          <circle cx="70%" cy="55%" r="2" fill="hsl(var(--primary))" fillOpacity="0.2"/>
        </svg>
        
        {/* Primary glow - top right - more intense */}
        <div 
          className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full animate-pulse" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }} 
        />
        
        {/* Secondary glow - bottom left - more intense */}
        <div 
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-pulse" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animationDelay: '1.5s'
          }} 
        />
        
        {/* Additional accent glow - top left */}
        <div 
          className="absolute -top-24 -left-24 w-[400px] h-[400px] rounded-full animate-pulse" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 60%)',
            filter: 'blur(60px)',
            animationDelay: '2s'
          }} 
        />
        
        {/* Grid lines - enhanced */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute top-1/2 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>
        
        {/* Floating particles - enhanced with more particles */}
        <div className="absolute top-16 right-[12%] w-2 h-2 bg-primary/60 rounded-full animate-float" />
        <div className="absolute top-[25%] left-[8%] w-1.5 h-1.5 bg-primary/40 rounded-full animate-float-slow" style={{ animationDelay: '0.3s' }} />
        <div className="absolute bottom-[20%] right-[15%] w-2.5 h-2.5 bg-primary/50 rounded-full animate-drift" style={{ animationDelay: '0.8s' }} />
        <div className="absolute top-[55%] left-[12%] w-1.5 h-1.5 bg-primary/35 rounded-full animate-float" style={{ animationDelay: '1.5s' }} />
        <div className="absolute bottom-16 left-[25%] w-1 h-1 bg-primary/50 rounded-full animate-float-slow" style={{ animationDelay: '1.2s' }} />
        <div className="absolute top-[12%] right-[25%] w-2 h-2 bg-primary/45 rounded-full animate-drift" style={{ animationDelay: '0.6s' }} />
        <div className="absolute top-[40%] right-[8%] w-1 h-1 bg-primary/55 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-[35%] left-[20%] w-1.5 h-1.5 bg-primary/30 rounded-full animate-float-slow" style={{ animationDelay: '1.8s' }} />
        <div className="absolute top-[70%] right-[30%] w-1 h-1 bg-primary/40 rounded-full animate-drift" style={{ animationDelay: '0.4s' }} />
        <div className="absolute bottom-[45%] right-[5%] w-2 h-2 bg-primary/35 rounded-full animate-float" style={{ animationDelay: '1s' }} />
        
        {/* Orbiting particles around shield area */}
        <div className="absolute top-[35%] left-[40%] w-1.5 h-1.5 bg-primary/60 rounded-full animate-orbit" />
        <div className="absolute top-[45%] right-[38%] w-1 h-1 bg-primary/50 rounded-full animate-orbit" style={{ animationDelay: '1s' }} />
        <div className="absolute bottom-[40%] left-[42%] w-1.5 h-1.5 bg-primary/55 rounded-full animate-orbit" style={{ animationDelay: '2s' }} />
        <div className="absolute top-[50%] right-[42%] w-1 h-1 bg-primary/45 rounded-full animate-orbit" style={{ animationDelay: '3s' }} />
        
        {/* Geometric accents - enhanced */}
        <div className="absolute top-[18%] left-[6%] w-24 h-24 border border-primary/10 rounded-full animate-spin-slow" />
        <div className="absolute bottom-[12%] right-[6%] w-32 h-32 border border-primary/8 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-[60%] left-[4%] w-16 h-16 border border-primary/5 rounded-full animate-spin-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[10%] right-[10%] w-20 h-20 border border-primary/6 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse', animationDelay: '2s' }} />
        
      </div>
    </>
  );
}
