export function AuthBackground() {
  return (
    <>
      {/* Base gradient - suavizado */}
      <div className="absolute inset-0 bg-gradient-to-br from-gray-950 via-black to-red-950/20" />
      
      {/* Gradient orbs - mais suaves, sem animação */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow - top right */}
        <div 
          className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.15) 0%, transparent 70%)',
            filter: 'blur(120px)'
          }} 
        />
        
        {/* Secondary glow - bottom left */}
        <div 
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.1) 0%, transparent 70%)',
            filter: 'blur(150px)'
          }} 
        />
        
        {/* Center accent glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-20" 
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.08) 0%, transparent 60%)',
            filter: 'blur(80px)'
          }} 
        />
        
        {/* Linhas sutis */}
        <div className="absolute inset-0 opacity-[0.02]">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-1/3 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
        </div>
        
        {/* Partículas reduzidas e mais sutis */}
        <div className="absolute top-20 right-[15%] w-1 h-1 bg-primary/20 rounded-full animate-float" />
        <div className="absolute bottom-[25%] left-[10%] w-1 h-1 bg-primary/15 rounded-full animate-float-slow" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] right-[25%] w-1.5 h-1.5 bg-primary/10 rounded-full animate-drift" style={{ animationDelay: '2s' }} />
        
        {/* Elemento geométrico sutil */}
        <div className="absolute top-[20%] left-[8%] w-20 h-20 border border-primary/5 rounded-full animate-spin-slow" />
      </div>
    </>
  );
}
