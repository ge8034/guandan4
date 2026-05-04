'use client';

import { useEffect, useState } from 'react';

const CARDS_PER_PLAYER = 27;
const ANIM_DURATION = 700;
const STAGGER = 50;
const TOTAL_DURATION = ANIM_DURATION + (CARDS_PER_PLAYER - 1) * STAGGER + 100;

const COLORS = [
  'oklch(0.65 0.18 280)',
  'oklch(0.67 0.19 50)',
  'oklch(0.62 0.19 145)',
  'oklch(0.85 0.12 80)',
];

interface DealAnimationProps {
  play: boolean;
  onComplete: () => void;
}

export function DealAnimation({ play, onComplete }: DealAnimationProps) {
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (play && !animating) {
      setAnimating(true);
      const timer = setTimeout(() => {
        setAnimating(false);
        onComplete();
      }, TOTAL_DURATION);
      return () => clearTimeout(timer);
    }
  }, [play, animating, onComplete]);

  if (!animating) return null;

  return (
    <>
      <style>{`
        @keyframes deal-top {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, -460px) scale(0.2); }
        }
        @keyframes deal-left {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-520px, -50%) scale(0.2); }
        }
        @keyframes deal-right {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(520px, -50%) scale(0.2); }
        }
        @keyframes deal-bottom {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.6); }
          15%  { opacity: 1; }
          100% { opacity: 0; transform: translate(-50%, 380px) scale(0.2); }
        }
      `}</style>
      <div className="absolute inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0">
          {Array.from({ length: CARDS_PER_PLAYER }).map((_, i) => (
            <div
              key={`top-${i}`}
              className="absolute left-1/2 top-1/2 w-3 h-4 rounded-sm"
              style={{
                backgroundColor: COLORS[0],
                animation: `deal-top ${ANIM_DURATION}ms var(--ease-out) both`,
                animationDelay: `${i * STAGGER}ms`,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0">
          {Array.from({ length: CARDS_PER_PLAYER }).map((_, i) => (
            <div
              key={`left-${i}`}
              className="absolute left-1/2 top-1/2 w-3 h-4 rounded-sm"
              style={{
                backgroundColor: COLORS[1],
                animation: `deal-left ${ANIM_DURATION}ms var(--ease-out) both`,
                animationDelay: `${i * STAGGER}ms`,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0">
          {Array.from({ length: CARDS_PER_PLAYER }).map((_, i) => (
            <div
              key={`right-${i}`}
              className="absolute left-1/2 top-1/2 w-3 h-4 rounded-sm"
              style={{
                backgroundColor: COLORS[2],
                animation: `deal-right ${ANIM_DURATION}ms var(--ease-out) both`,
                animationDelay: `${i * STAGGER}ms`,
              }}
            />
          ))}
        </div>
        <div className="absolute inset-0">
          {Array.from({ length: CARDS_PER_PLAYER }).map((_, i) => (
            <div
              key={`bottom-${i}`}
              className="absolute left-1/2 top-1/2 w-3 h-4 rounded-sm"
              style={{
                backgroundColor: COLORS[3],
                animation: `deal-bottom ${ANIM_DURATION}ms var(--ease-out) both`,
                animationDelay: `${i * STAGGER}ms`,
              }}
            />
          ))}
        </div>
      </div>
    </>
  );
}
