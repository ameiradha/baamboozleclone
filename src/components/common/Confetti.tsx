import confetti from 'canvas-confetti';

export const triggerConfetti = (burstType: 'fireworks' | 'cannon' | 'starburst' = 'cannon') => {
  // Check user preference or game settings
  try {
    if (burstType === 'cannon') {
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#4f46e5', '#10b981', '#f59e0b', '#ec4899', '#06b6d4'],
      });
    } else if (burstType === 'fireworks') {
      const duration = 2.5 * 1000;
      const animationEnd = Date.now() + duration;
      const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 9999 };

      const interval: any = setInterval(() => {
        const timeLeft = animationEnd - Date.now();
        if (timeLeft <= 0) {
          return clearInterval(interval);
        }
        const particleCount = 50 * (timeLeft / duration);
        confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.4 + 0.1, y: Math.random() - 0.2 } });
        confetti({ ...defaults, particleCount, origin: { x: Math.random() * 0.4 + 0.5, y: Math.random() - 0.2 } });
      }, 250);
    } else if (burstType === 'starburst') {
      confetti({
        particleCount: 80,
        spread: 100,
        origin: { y: 0.5 },
        shapes: ['star', 'circle'],
        colors: ['#ffd700', '#ff69b4', '#00ffff', '#7b68ee'],
      });
    }
  } catch (e) {
    console.warn('Confetti trigger skipped', e);
  }
};
