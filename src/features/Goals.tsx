import { useState } from 'react';
import type { FormEvent } from 'react';
import { Plus, Minus, Target, Trash2 } from 'lucide-react';
import { addGoal, bumpGoal, delGoal, type Goal, type Horizon } from '../data';

export function Goals({ goals }: { goals: Goal[] }) {
  const [title, setTitle] = useState('');
  const [target, setTarget] = useState('');
  const [horizon, setHorizon] = useState<Horizon>('short');
  const submit = (e: FormEvent) => {
    e.preventDefault();
    const n = parseInt(target, 10) || 1;
    if (title.trim()) {
      void addGoal(title.trim(), n, horizon);
      setTitle('');
      setTarget('');
    }
  };

  const shortGoals = goals.filter((g) => (g.horizon ?? 'short') === 'short');
  const longGoals = goals.filter((g) => g.horizon === 'long');

  return (
    <section>
      <form className="row wrap" onSubmit={submit}>
        <input
          className="input"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder="New goal…"
        />
        <input
          className="input num"
          type="number"
          min="1"
          value={target}
          onChange={(e) => setTarget(e.target.value)}
          placeholder="Target"
        />
        <div className="seg">
          <button type="button" className={horizon === 'short' ? 'active' : ''} onClick={() => setHorizon('short')}>
            Short
          </button>
          <button type="button" className={horizon === 'long' ? 'active' : ''} onClick={() => setHorizon('long')}>
            Long
          </button>
        </div>
        <button className="btn" type="submit" aria-label="Add goal">
          <Plus size={16} />
        </button>
      </form>

      <GoalList label="Short-term" goals={shortGoals} />
      <GoalList label="Long-term" goals={longGoals} />
    </section>
  );
}

function GoalList({ label, goals }: { label: string; goals: Goal[] }) {
  return (
    <>
      <p className="lbl section">{label}</p>
      <ul className="list">
        {goals.map((g) => (
          <GoalRow key={g.id} g={g} />
        ))}
        {goals.length === 0 && <li className="empty">None yet.</li>}
      </ul>
    </>
  );
}

function GoalRow({ g }: { g: Goal }) {
  const [amt, setAmt] = useState('');
  const pct = g.target ? Math.round((g.current / g.target) * 100) : 0;
  const addCustom = () => {
    const n = parseInt(amt, 10);
    if (n) void bumpGoal(g, n);
    setAmt('');
  };
  return (
    <li className="goal">
      <div className="goal-head">
        <Target size={14} />
        <span className="item-title">{g.title}</span>
        <button className="icon-btn" onClick={() => void delGoal(g.id)} aria-label="Delete">
          <Trash2 size={14} />
        </button>
      </div>
      <div className="bar">
        <div className="bar-fill" style={{ width: `${Math.min(100, pct)}%` }} />
      </div>
      <div className="goal-foot">
        <button className="icon-btn" onClick={() => void bumpGoal(g, -1)} aria-label="Less">
          <Minus size={14} />
        </button>
        <span className="muted">
          {g.current}/{g.target} · {pct}%
        </span>
        <button className="icon-btn" onClick={() => void bumpGoal(g, 1)} aria-label="More">
          <Plus size={14} />
        </button>
      </div>
      <div className="goal-add">
        <input
          className="input num"
          type="number"
          value={amt}
          onChange={(e) => setAmt(e.target.value)}
          placeholder="+ amount"
        />
        <button className="set-row mini" onClick={addCustom}>
          Add
        </button>
      </div>
    </li>
  );
}
