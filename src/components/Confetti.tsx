import { useEffect } from 'react';

const CONFETTI_COLORS = ['#10b981', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];

export function Confetti({ onDone }: { onDone: () => void }) {
  useEffect(() => {
    const t = setTimeout(onDone, 1700);
    return () => clearTimeout(t);
  }, [onDone]);

  return (
    <div className="confetti" aria-hidden>
      {Array.from({ length: 44 }, (_, i) => (
        <span
          key={i}
          className="confetti-piece"
          style={{
            left: `${Math.random() * 100}%`,
            background: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
            animationDelay: `${Math.random() * 0.25}s`,
            animationDuration: `${1 + Math.random() * 0.6}s`,
          }}
        />
      ))}
    </div>
  );
}
