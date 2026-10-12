import React, { useState, useEffect, useRef } from 'react';

interface AnimatedScoreCounterProps {
  score: number;
  className?: string;
  showDelta?: boolean;
}

export const AnimatedScoreCounter: React.FC<AnimatedScoreCounterProps> = ({
  score,
  className = '',
  showDelta = true,
}) => {
  const [displayScore, setDisplayScore] = useState(score);
  const [animDirection, setAnimDirection] = useState<'up' | 'down' | null>(null);
  const [delta, setDelta] = useState<number | null>(null);
  const displayScoreRef = useRef(score);
  const prevScoreRef = useRef(score);
  const animationFrameRef = useRef<number | null>(null);
  const fadeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const prev = prevScoreRef.current;
    if (prev === score) return;

    const diff = score - prev;
    prevScoreRef.current = score;

    setAnimDirection(diff > 0 ? 'up' : 'down');
    setDelta(diff);

    // Cancel any previous in-flight animation frame or timeout
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (fadeTimeoutRef.current) {
      clearTimeout(fadeTimeoutRef.current);
    }

    const startValue = displayScoreRef.current;
    const targetValue = score;
    const startTime = performance.now();
    const duration = 650; // duration in ms

    const step = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      // Cubic ease-out: 1 - (1 - t)^3
      const ease = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(startValue + (targetValue - startValue) * ease);

      displayScoreRef.current = current;
      setDisplayScore(current);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
      } else {
        displayScoreRef.current = targetValue;
        setDisplayScore(targetValue);
        fadeTimeoutRef.current = setTimeout(() => {
          setAnimDirection(null);
          setDelta(null);
        }, 900);
      }
    };

    animationFrameRef.current = requestAnimationFrame(step);

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (fadeTimeoutRef.current) {
        clearTimeout(fadeTimeoutRef.current);
      }
    };
  }, [score]);

  return (
    <div className="relative inline-flex items-center justify-center">
      <span
        className={`transition-all duration-200 tabular-nums leading-none select-none ${className} ${
          animDirection === 'up'
            ? 'text-emerald-500 scale-110 drop-shadow-sm font-black'
            : animDirection === 'down'
            ? 'text-rose-500 scale-95 drop-shadow-sm font-black'
            : displayScore < 0
            ? '!text-rose-600 font-black'
            : ''
        }`}
      >
        {displayScore}
      </span>

      {/* Floating Delta Badge when points are increasing or decreasing */}
      {showDelta && delta !== null && (
        <span
          key={`${score}-${delta}`}
          className={`absolute -top-3 sm:-top-3.5 -right-2 sm:-right-3 font-mono font-black text-[10px] sm:text-xs px-1.5 py-0.5 rounded-full shadow-md pointer-events-none transition-all duration-300 animate-bounce ${
            delta > 0
              ? 'bg-emerald-500 text-white ring-2 ring-emerald-200'
              : 'bg-rose-500 text-white ring-2 ring-rose-200'
          }`}
        >
          {delta > 0 ? `+${delta}` : delta}
        </span>
      )}
    </div>
  );
};
