import confetti from 'canvas-confetti';

export const useConfetti = () => {
  // Confete na tela inteira (original)
  const triggerConfetti = () => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    setTimeout(() => {
      confetti({
        particleCount: 50,
        angle: 60,
        spread: 55,
        origin: { x: 0, y: 0.6 }
      });
      confetti({
        particleCount: 50,
        angle: 120,
        spread: 55,
        origin: { x: 1, y: 0.6 }
      });
    }, 150);

    setTimeout(() => {
      confetti({
        particleCount: 75,
        spread: 100,
        origin: { y: 0.7 }
      });
    }, 300);
  };

  // Confete dentro de um elemento específico
  const triggerConfettiInElement = (canvas: HTMLCanvasElement | null) => {
    if (!canvas) return;
    
    const myConfetti = confetti.create(canvas, {
      resize: true,
      useWorker: true,
    });

    // Explosão central
    myConfetti({
      particleCount: 80,
      spread: 60,
      origin: { y: 0.5, x: 0.5 },
      colors: ['#ef4444', '#dc2626', '#ffffff', '#fecaca', '#b91c1c'],
    });

    // Canhões laterais
    setTimeout(() => {
      myConfetti({
        particleCount: 40,
        angle: 60,
        spread: 50,
        origin: { x: 0.1, y: 0.6 },
        colors: ['#ef4444', '#ffffff', '#dc2626'],
      });
      myConfetti({
        particleCount: 40,
        angle: 120,
        spread: 50,
        origin: { x: 0.9, y: 0.6 },
        colors: ['#ef4444', '#ffffff', '#dc2626'],
      });
    }, 100);

    // Segunda onda
    setTimeout(() => {
      myConfetti({
        particleCount: 50,
        spread: 80,
        origin: { y: 0.4, x: 0.5 },
        colors: ['#ef4444', '#ffffff', '#fecaca', '#b91c1c'],
      });
    }, 200);
  };

  return { triggerConfetti, triggerConfettiInElement };
};
