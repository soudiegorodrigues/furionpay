import confetti from 'canvas-confetti';

export const useConfetti = () => {
  const triggerConfetti = () => {
    // Explosão central
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 }
    });

    // Canhões laterais para efeito mais impactante
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

    // Segunda onda
    setTimeout(() => {
      confetti({
        particleCount: 75,
        spread: 100,
        origin: { y: 0.7 }
      });
    }, 300);
  };

  return { triggerConfetti };
};
