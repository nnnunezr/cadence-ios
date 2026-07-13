import { useState } from 'react';
import type { FormEvent } from 'react';
import { Check, Plus, Target, Calendar, Trash2 } from 'lucide-react';
import { addTask, toggleTask, delTask, todayStr, type Task, type Goal } from '../data';
import { toast } from '../components/ui';
import { DatePicker } from '../components/DatePicker';
import { fmtDay } from '../lib/format';

export function Tasks({ tasks, goals }: { tasks: Task[]; goals: Goal[] }) {
  const [title, setTitle] = useState('');
  const [deadline, setDeadline] = useState('');
  const [goalId, setGoalId] = useState('');
  const today = todayStr();

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    const ok = await addTask(title.trim(), deadline || null, goalId || null);
    if (!ok) {
      toast('Deadline already passed — pick today or later.');
      return;
    }
    setTitle('');
    setDeadline('');
    setGoalId('');
  };

  const done = tasks.filter((t) => t.done).length;
  const pct = tasks.length ? Math.round((done / tasks.length) * 100) : 0;
  // incomplete first; completed sink to the bottom (stable within each group)
  const sorted = [...tasks].sort((a, b) => Number(a.done) - Number(b.done));

  return (
    <section className="tasks">
      <form className="composer" onSubmit={submit}>
        <div className="composer-top">
          <input
            className="input"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="What needs doing?"
          />
          <button className="btn" type="submit" aria-label="Add task">
            <Plus size={16} />
            <span className="btn-label">Add</span>
          </button>
        </div>
        <div className="composer-meta">
          <DatePicker value={deadline} onChange={setDeadline} />
          {goals.length > 0 && (
            <select className="input sel" value={goalId} onChange={(e) => setGoalId(e.target.value)} title="Link a goal">
              <option value="">No goal</option>
              {goals.map((g) => (
                <option key={g.id} value={g.id}>
                  {g.title}
                </option>
              ))}
            </select>
          )}
        </div>
      </form>

      {tasks.length > 0 && (
        <div className="progress-head">
          <div className="progress-track">
            <div className="progress-fill" style={{ width: `${pct}%` }} />
          </div>
          <span className="progress-label">
            {done}<span className="progress-sep">/</span>{tasks.length}
          </span>
        </div>
      )}

      <ul className="list">
        {sorted.map((t) => {
          const overdue = !!t.deadline && !t.done && t.deadline < today;
          const dueToday = t.deadline === today && !t.done;
          const goal = t.goalId ? goals.find((g) => g.id === t.goalId) : undefined;
          return (
            <li key={t.id} className={`item ${t.done ? 'done' : ''}`}>
              <button className="check" onClick={() => void toggleTask(t)} aria-label="Toggle">
                {t.done ? <Check size={13} /> : null}
              </button>
              <span className="item-title">{t.title}</span>
              {goal && (
                <span className="due goal-tag">
                  <Target size={11} /> {goal.title}
                </span>
              )}
              {t.deadline && (
                <span className={`due ${overdue ? 'overdue' : dueToday ? 'today' : ''}`}>
                  <Calendar size={11} /> {fmtDay(t.deadline)}
                </span>
              )}
              <button className="icon-btn" onClick={() => void delTask(t.id)} aria-label="Delete">
                <Trash2 size={14} />
              </button>
            </li>
          );
        })}
        {tasks.length === 0 && (
          <li className="empty-state">
            <span className="empty-mark">◇</span>
            <p>No tasks yet</p>
            <small>Add your first one above to start a streak.</small>
          </li>
        )}
      </ul>
    </section>
  );
}
