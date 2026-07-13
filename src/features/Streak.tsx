import { Flame } from 'lucide-react';
import { dayOf } from '../data';

export function Streak({
  days,
  streak,
  checkedToday,
  missed,
  canCheckIn,
  onCheckIn,
}: {
  days: string[];
  streak: number;
  checkedToday: boolean;
  missed: Set<string>;
  canCheckIn: boolean;
  onCheckIn: () => void;
}) {
  const set = new Set(days);
  const cells = Array.from({ length: 35 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (34 - i));
    const s = dayOf(d);
    return { s, on: set.has(s), miss: missed.has(s) };
  });

  return (
    <section className="streak">
      <div className="streak-big">
        <Flame size={26} />
        <span className="streak-num">{streak}</span>
        <small>day streak</small>
      </div>
      <button className="btn wide" disabled={!canCheckIn} onClick={onCheckIn}>
        {checkedToday ? 'Checked in today ✓' : 'Check in today'}
      </button>
      {!checkedToday && !canCheckIn && (
        <p className="muted center">Complete a task today to unlock check-in.</p>
      )}
      <div className="grid">
        {cells.map((c) => (
          <div
            key={c.s}
            className={`cell ${c.miss ? 'miss' : c.on ? 'on' : ''}`}
            title={c.miss ? `${c.s} — missed deadline` : c.s}
          />
        ))}
      </div>
      <p className="muted center">Green = checked in · Red = missed deadline (breaks streak)</p>
    </section>
  );
}
