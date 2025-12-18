export function AuthBackground() {
  return (
    <>
      {/* Base gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-black via-zinc-950 to-red-950/30" />
      
      {/* Animated gradient orbs */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        {/* Primary glow - top right */}
        <div 
          className="absolute -top-32 -right-32 w-[600px] h-[600px] rounded-full animate-pulse" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.35) 0%, transparent 70%)',
            filter: 'blur(80px)'
          }} 
        />
        
        {/* Secondary glow - bottom left */}
        <div 
          className="absolute -bottom-48 -left-48 w-[500px] h-[500px] rounded-full animate-pulse" 
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.25) 0%, transparent 70%)',
            filter: 'blur(100px)',
            animationDelay: '1.5s'
          }} 
        />
        
        {/* Center accent glow */}
        <div 
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[350px] rounded-full opacity-40" 
          style={{
            background: 'radial-gradient(ellipse, hsl(var(--primary) / 0.15) 0%, transparent 60%)',
            filter: 'blur(60px)'
          }} 
        />
        
        {/* Grid lines */}
        <div className="absolute inset-0 opacity-[0.03]">
          <div className="absolute top-0 left-1/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-0 left-1/2 w-px h-full bg-gradient-to-b from-transparent via-primary/50 to-transparent" />
          <div className="absolute top-0 left-3/4 w-px h-full bg-gradient-to-b from-transparent via-primary to-transparent" />
          <div className="absolute top-1/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary to-transparent" />
          <div className="absolute top-3/4 left-0 w-full h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        </div>
        
        {/* Floating particles - enhanced */}
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
        
        {/* Geometric accents */}
        <div className="absolute top-[18%] left-[6%] w-20 h-20 border border-primary/10 rounded-full animate-spin-slow" />
        <div className="absolute bottom-[12%] right-[6%] w-28 h-28 border border-primary/5 rounded-full animate-spin-slow" style={{ animationDirection: 'reverse' }} />
        <div className="absolute top-[45%] right-[3%] w-14 h-14 border border-primary/8 rotate-45 animate-float-slow" />
      </div>
    </>
  );
}