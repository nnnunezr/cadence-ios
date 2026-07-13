// ── Cadence date picker (themed; past days disabled) ─────────────────────────
import { useState } from 'react';
import { Calendar, ChevronLeft, ChevronRight, X } from 'lucide-react';
import { todayStr } from '../data';

const DOWS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
const iso = (y: number, m: number, d: number) =>
  `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
const shift = (v: { y: number; m: number }, delta: number) => {
  const m = v.m + delta;
  return { y: v.y + Math.floor(m / 12), m: ((m % 12) + 12) % 12 };
};

export function DatePicker({
  value,
  onChange,
}: {
  value: string;
  onChange: (v: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const today = todayStr();
  const base = value ? new Date(value + 'T00:00:00') : new Date();
  const [view, setView] = useState({ y: base.getFullYear(), m: base.getMonth() });

  const startDow = new Date(view.y, view.m, 1).getDay();
  const days = new Date(view.y, view.m + 1, 0).getDate();
  const cells: (number | null)[] = [];
  for (let i = 0; i < startDow; i++) cells.push(null);
  for (let d = 1; d <= days; d++) cells.push(d);

  const label = value
    ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    : 'Deadline';
  const monthLabel = new Date(view.y, view.m, 1).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
  });

  const pick = (d: number) => {
    const ds = iso(view.y, view.m, d);
    if (ds < today) return; // past blocked
    onChange(ds);
    setOpen(false);
  };

  return (
    <div className="dp">
      <button
        type="button"
        className={`input dp-trigger ${value ? 'set' : ''}`}
        onClick={() => setOpen((o) => !o)}
      >
        <Calendar size={14} />
        <span>{label}</span>
        {value && (
          <span
            className="dp-clear"
            onClick={(e) => {
              e.stopPropagation();
              onChange('');
            }}
          >
            <X size={12} />
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="dp-scrim" onClick={() => setOpen(false)} />
          <div className="dp-pop">
            <div className="dp-head">
              <button type="button" onClick={() => setView((v) => shift(v, -1))} aria-label="Prev month">
                <ChevronLeft size={16} />
              </button>
              <span>{monthLabel}</span>
              <button type="button" onClick={() => setView((v) => shift(v, 1))} aria-label="Next month">
                <ChevronRight size={16} />
              </button>
            </div>
            <div className="dp-dows">
              {DOWS.map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
            <div className="dp-grid">
              {cells.map((d, i) => {
                if (d === null) return <span key={i} />;
                const ds = iso(view.y, view.m, d);
                const past = ds < today;
                return (
                  <button
                    key={i}
                    type="button"
                    disabled={past}
                    className={`dp-day ${ds === value ? 'sel' : ''} ${ds === today ? 'today' : ''}`}
                    onClick={() => pick(d)}
                  >
                    {d}
                  </button>
                );
              })}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
