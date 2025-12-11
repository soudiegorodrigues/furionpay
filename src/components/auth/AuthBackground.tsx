export function AuthBackground() {
  return (
    <>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-black to-red-950/40" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow - top right */}
        <div 
          className="absolute -top-32 -right-32 w-[700px] h-[700px] rounded-full animate-pulse" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.4) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }} 
        />
        
        {/* Secondary glow - bottom left */}
        <div 
          className="absolute -bottom-48 -left-48 w-[600px] h-[600px] rounded-full animate-pulse" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.3) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animationDelay: '1.5s'
          }} 
        />
        
        {/* Center accent glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[400px] rounded-full opacity-30" 
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.2) 0%, transparent 60%)',
            filter: 'blur(60px)'
          }} 
        />
        
        {/* Animated lines */}
        <div className="absolute inset-0 opacity-[0.04]">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>
        
        {/* Floating particles */}
        <div className="absolute top-20 right-[15%] w-1.5 h-1.5 bg-primary/60 rounded-full animate-float" />
        <div className="absolute top-[30%] left-[10%] w-1 h-1 bg-primary/40 rounded-full animate-float-slow" style={{ animationDelay: '0.5s' }} />
        <div className="absolute bottom-[25%] right-[20%] w-2 h-2 bg-primary/50 rounded-full animate-drift" style={{ animationDelay: '1s' }} />
        <div className="absolute top-[60%] left-[15%] w-1.5 h-1.5 bg-primary/30 rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute bottom-20 left-[30%] w-1 h-1 bg-primary/50 rounded-full animate-float-slow" style={{ animationDelay: '1.5s' }} />
        <div className="absolute top-[15%] right-[30%] w-2 h-2 bg-primary/40 rounded-full animate-drift" style={{ animationDelay: '0.8s' }} />
        
        {/* Geometric accents */}
        <div className="absolute top-[20%] left-[8%] w-20 h-20 border border-primary/10 rounded-full animate-spin-slow" />
        <div className="absolute bottom-[15%] right-[8%] w-32 h-32 border border-primary/5 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-[40%] right-[5%] w-16 h-16 border border-primary/10 rotate-45 animate-float-slow" />
      </div>
    </>
  );
}
