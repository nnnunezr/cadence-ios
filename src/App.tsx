import { useState, useEffect, useRef } from 'react';
import type { FormEvent, ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import html2pdf from 'html2pdf.js';
import {
  Check,
  Flame,
  Plus,
  Minus,
  Target,
  Trash2,
  Calendar,
  CheckSquare,
  FileText,
  User,
  Users,
  Download,
  FileDown,
  ImagePlus,
  RotateCcw,
  X,
  Sun,
  Moon,
  Timer,
  LogOut,
  Heart,
  ChevronDown,
  Palette,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  db,
  addTask,
  toggleTask,
  delTask,
  addGoal,
  bumpGoal,
  delGoal,
  addNote,
  saveNote,
  delNote,
  restoreNote,
  purgeNote,
  runMaintenance,
  drainQuickNotes,
  daysLeft,
  getSettings,
  setSettings,
  addNoteImage,
  removeNoteImage,
  checkInToday,
  currentStreak,
  missedDeadlineDays,
  completedToday,
  isMilestone,
  getTheme,
  setTheme,
  saveProfile,
  ensureDefaultProfile,
  listProfiles,
  addProfile,
  delProfile,
  getActiveProfileId,
  setActiveProfileId,
  inProfile,
  clearCompletedTasks,
  exportAll,
  saveToDevice,
  wipeAll,
  getEmail,
  signOut,
  openExternal,
  getNavLayout,
  setNavLayout,
  NAV_LAYOUTS,
  getAccent,
  setAccent,
  ACCENT_PRESETS,
  todayStr,
  dayOf,
  type Task,
  type Goal,
  type Note,
  type Profile,
  type Horizon,
  type Theme,
  type NavLayout,
  type AppSettings,
} from './data';
import { UiRoot, confirmDialog, chooseDialog, toast } from './ui';
import { DatePicker } from './DatePicker';
import { Login } from './Login';
import { CadenceMark } from './CadenceMark';
import { HexColorPicker } from 'react-colorful';

type Tab = 'tasks' | 'notes' | 'goals' | 'profile';
const TAB_META: { id: Tab; icon: LucideIcon; label: string }[] = [
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'notes', icon: FileText, label: 'Notes' },
  { id: 'goals', icon: Target, label: 'Goals' },
  { id: 'profile', icon: User, label: 'You' },
];

// Donation target — replace `yourname` with your Ko-fi handle.
const DONATE_URL = 'https://ko-fi.com/nnholdings';

function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Each profile gets a stable colour + initial so they read as distinct.
const PROFILE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
function profileColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROFILE_COLORS[h % PROFILE_COLORS.length];
}
function initial(name: string) {
  return (name.trim()[0] || '?').toUpperCase();
}

function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(file);
  });
}

async function downloadPDF(filename: string, innerHTML: string) {
  filename = filename.replace(/[/\\:*?"<>|]+/g, '-'); // keep Filesystem paths flat
  const el = document.createElement('div');
  el.innerHTML = innerHTML;
  el.style.cssText =
    'padding:28px;font-family:Inter,system-ui,sans-serif;color:#111;background:#fff;width:600px';
  document.body.appendChild(el);
  const dataUri = await html2pdf()
    .set({ margin: 8, filename, html2canvas: { scale: 2 }, jsPDF: { unit: 'mm', format: 'a4' } })
    .from(el)
    .outputPdf('datauristring');
  el.remove();
  const base64 = dataUri.split(',')[1] ?? '';
  const res = await saveToDevice(filename, base64, { base64: true, mime: 'application/pdf' });
  if (res.saved) toast(res.location === 'download' ? 'PDF downloaded' : 'Saved to Documents');
  else toast('Storage permission needed to save the PDF.');
}

export function App() {
  const [email, setEmail] = useState<string | null>(getEmail());
  if (!email) return <Login onAuthed={setEmail} />;
  return (
    <Dashboard
      onSignOut={() => {
        signOut();
        setEmail(null);
      }}
    />
  );
}

function Dashboard({ onSignOut }: { onSignOut: () => void }) {
  const [tab, setTab] = useState<Tab>('tasks');
  const [active, setActive] = useState(getActiveProfileId());
  const [navLayout, setNav] = useState<NavLayout>(getNavLayout());

  const layout = NAV_LAYOUTS.find((l) => l.id === navLayout) ?? NAV_LAYOUTS[0];
  const orderedTabs = [
    ...layout.order.map((id) => TAB_META.find((t) => t.id === id)!),
    TAB_META.find((t) => t.id === 'profile')!,
  ];

  useEffect(() => {
    void ensureDefaultProfile();
    void runMaintenance();
    void drainQuickNotes(); // pull anything captured from the home-screen widget
    const onVisible = () => {
      if (document.visibilityState === 'visible') void drainQuickNotes();
    };
    document.addEventListener('visibilitychange', onVisible);
    return () => document.removeEventListener('visibilitychange', onVisible);
  }, []);

  const allTasks = useLiveQuery(() => db.tasks.orderBy('createdAt').reverse().toArray(), [], []);
  const allGoals = useLiveQuery(() => db.goals.toArray(), [], []);
  const allNotes = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [], []);
  const allStreaks = useLiveQuery(() => db.streaks.toArray(), [], []);
  const profiles = useLiveQuery(() => listProfiles(), [], []);

  const tasks = allTasks.filter((t) => inProfile(t.profileId, active));
  const goals = allGoals.filter((g) => inProfile(g.profileId, active));
  const notes = allNotes.filter((n) => inProfile(n.profileId, active) && !n.deletedAt);

  const days = allStreaks.filter((s) => s.profileId === active).map((s) => s.day);
  const missed = missedDeadlineDays(tasks);
  const streak = currentStreak(days, missed);
  const checkedToday = days.includes(todayStr());
  const canCheckIn = completedToday(tasks) && !checkedToday;

  const [confetti, setConfetti] = useState(0);
  const handleCheckIn = async () => {
    if (!canCheckIn) return;
    await checkInToday();
    if (isMilestone(streak + 1)) setConfetti((c) => c + 1);
  };

  const switchTo = (id: string) => {
    setActiveProfileId(id);
    setActive(id);
  };

  return (
    <div className="app">
      <UiRoot />
      {confetti > 0 && <Confetti key={confetti} onDone={() => setConfetti(0)} />}
      <header className="top">
        <div className="brand">
          <CadenceMark className="brand-mark" /> Cadence
        </div>
        <div className={`streak-badge ${checkedToday ? 'on' : ''}`}>
          <Flame size={14} /> {streak}
        </div>
      </header>

      <nav className="nav">
        {orderedTabs.map(({ id, icon: Icon, label }) => (
          <button key={id} className={`tab ${tab === id ? 'active' : ''}`} onClick={() => setTab(id)}>
            <Icon size={18} />
            <span>{label}</span>
          </button>
        ))}
      </nav>

      <main className="main">
        <div className="view" key={tab}>
          {tab === 'tasks' && (
            <>
              <Tasks tasks={tasks} goals={goals} />
              <Streak
                days={days}
                streak={streak}
                checkedToday={checkedToday}
                missed={missed}
                canCheckIn={canCheckIn}
                onCheckIn={handleCheckIn}
              />
            </>
          )}
          {tab === 'notes' && <Notes active={active} />}
          {tab === 'goals' && <Goals goals={goals} />}
          {tab === 'profile' && (
            <>
              <Profile profiles={profiles} active={active} onSwitch={switchTo} />
              <SettingsView
                tasks={tasks}
                goals={goals}
                notes={notes}
                streak={streak}
                activeName={profiles.find((p) => p.id === active)?.name ?? ''}
                onSignOut={onSignOut}
                navLayout={navLayout}
                onNavLayout={(l) => {
                  setNavLayout(l);
                  setNav(l);
                }}
              />
            </>
          )}
        </div>
      </main>
    </div>
  );
}

function Tasks({ tasks, goals }: { tasks: Task[]; goals: Goal[] }) {
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

function Notes({ active }: { active: string }) {
  const all = useLiveQuery(() => db.notes.orderBy('updatedAt').reverse().toArray(), [], []);
  const notes = all.filter((n) => inProfile(n.profileId, active) && !n.deletedAt);
  const trash = all.filter((n) => inProfile(n.profileId, active) && n.deletedAt);

  const [activeId, setActiveId] = useState<string | null>(null);
  const [showTrash, setShowTrash] = useState(false);
  const [draft, setDraft] = useState('');
  const photoRef = useRef<HTMLInputElement>(null);
  const note = notes.find((n) => n.id === activeId) ?? notes[0];

  useEffect(() => {
    setDraft(note?.content ?? '');
  }, [note?.id]);

  const create = async (temporal = false) => {
    const id = await addNote(temporal);
    setActiveId(id);
    setDraft('');
  };
  const blurSave = () => {
    if (note && draft !== note.content) void saveNote(note, draft);
  };
  const onPhoto = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && note) await addNoteImage(note, await fileToDataUrl(file));
    e.target.value = '';
  };
  const exportPdf = () => {
    if (!note) return;
    const imgs = (note.images ?? [])
      .map((src) => `<img src="${src}" style="max-width:100%;border-radius:8px;margin:8px 0"/>`)
      .join('');
    const esc = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const body = esc(note.content).replace(/\n/g, '<br/>');
    void downloadPDF(`${note.title || 'note'}.pdf`, `<h1>${esc(note.title)}</h1><p>${body}</p>${imgs}`);
  };

  if (showTrash) {
    return (
      <section className="notes">
        <div className="notes-bar">
          <button className="set-row mini" onClick={() => setShowTrash(false)}>
            <RotateCcw size={14} /> Back to notes
          </button>
        </div>
        <p className="lbl">Trash · auto-deletes after {getSettings().trashDays} days</p>
        <ul className="list">
          {trash.map((n) => (
            <li key={n.id} className="item">
              <span className="item-title">{n.title}</span>
              <button className="icon-btn" onClick={() => void restoreNote(n.id)} aria-label="Restore">
                <RotateCcw size={14} />
              </button>
              <button className="icon-btn" onClick={() => void purgeNote(n.id)} aria-label="Delete forever">
                <Trash2 size={14} />
              </button>
            </li>
          ))}
          {trash.length === 0 && <li className="empty">Trash is empty.</li>}
        </ul>
      </section>
    );
  }

  return (
    <section className="notes">
      <div className="notes-bar">
        <div className="note-chips">
          {notes.map((n) => (
            <button
              key={n.id}
              className={`note-chip ${note?.id === n.id ? 'active' : ''}`}
              onClick={() => setActiveId(n.id)}
            >
              {n.title}
            </button>
          ))}
        </div>
        <button
          className="btn ghost"
          onClick={() => void create(true)}
          aria-label="New temporal note"
          title={`Temporal note · self-deletes in ${getSettings().temporalDays}d`}
        >
          <Timer size={16} />
        </button>
        <button className="btn" onClick={() => void create()} aria-label="New note">
          <Plus size={16} />
        </button>
      </div>

      {note ? (
        <div className="note-edit">
          {note.expiresAt && (
            <div className="temporal-badge">
              <Timer size={12} /> Temporal · {daysLeft(note.expiresAt)}d left
            </div>
          )}
          <textarea
            className="note-area"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onBlur={blurSave}
            placeholder="Write… (first line becomes the title)"
          />
          {(note.images ?? []).length > 0 && (
            <div className="note-photos">
              {(note.images ?? []).map((src, i) => (
                <div key={i} className="note-photo">
                  <img src={src} alt="" />
                  <button className="photo-del" onClick={() => void removeNoteImage(note, i)} aria-label="Remove photo">
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
          )}
          <div className="note-actions">
            <button className="set-row mini" onClick={() => photoRef.current?.click()}>
              <ImagePlus size={14} /> Photo
            </button>
            <button className="set-row mini" onClick={exportPdf}>
              <FileDown size={14} /> PDF
            </button>
            <button className="set-row mini danger" onClick={() => void delNote(note.id)}>
              <Trash2 size={14} /> Trash
            </button>
          </div>
          <input ref={photoRef} type="file" accept="image/*" hidden onChange={onPhoto} />
        </div>
      ) : (
        <p className="empty">No notes. Tap + to start one.</p>
      )}

      <button className="set-row mini trash-toggle" onClick={() => setShowTrash(true)}>
        <Trash2 size={14} /> Trash {trash.length > 0 && <small>({trash.length})</small>}
      </button>
    </section>
  );
}

function Goals({ goals }: { goals: Goal[] }) {
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

function Streak({
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

function Profile({
  profiles,
  active,
  onSwitch,
}: {
  profiles: Profile[];
  active: string;
  onSwitch: (id: string) => void;
}) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [name, setName] = useState('');
  const [newProfile, setNewProfile] = useState('');
  const [open, setOpen] = useState(false);
  const activeProfile = profiles.find((p) => p.id === active);

  useEffect(() => {
    setName(activeProfile?.name ?? '');
  }, [activeProfile?.id, activeProfile?.name]);

  const onPick = async (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) await saveProfile({ avatar: await fileToDataUrl(file) });
    e.target.value = '';
  };
  const createProfile = async () => {
    if (!newProfile.trim()) return;
    const id = await addProfile(newProfile.trim());
    setNewProfile('');
    setOpen(false);
    onSwitch(id);
  };

  return (
    <section className="profile">
      <button className="avatar-wrap" onClick={() => fileRef.current?.click()} aria-label="Change profile picture">
        {activeProfile?.avatar ? (
          <img src={activeProfile.avatar} alt="" className="avatar-img" />
        ) : (
          <span className="avatar-initial" style={{ background: profileColor(activeProfile?.id ?? 'me') }}>
            {initial(activeProfile?.name ?? '?')}
          </span>
        )}
        <span className="avatar-edit">
          <ImagePlus size={13} />
        </span>
      </button>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onPick} />

      <div className="field">
        <label className="lbl">Display name</label>
        <div className="row">
          <input className="input" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" />
          <button className="btn" onClick={() => void saveProfile({ name: name.trim() || 'Founder' })}>
            Save
          </button>
        </div>
      </div>

      <div className="settings">
        <p className="lbl">
          <Users size={13} /> Profiles
        </p>
        <div className={`prof-dd ${open ? 'open' : ''}`}>
          <button className="set-row prof-current" onClick={() => setOpen((o) => !o)}>
            <span
              className="prof-ava"
              style={activeProfile?.avatar ? undefined : { background: profileColor(active), color: '#fff' }}
            >
              {activeProfile?.avatar ? (
                <img src={activeProfile.avatar} alt="" />
              ) : (
                initial(activeProfile?.name ?? '?')
              )}
            </span>
            <span>{activeProfile?.name ?? 'Profile'}</span>
            <ChevronDown size={16} className="prof-chev" />
          </button>
          {open && (
            <div className="prof-menu">
              {profiles.map((p) => (
                <div key={p.id} className={`set-row prof ${p.id === active ? 'active' : ''}`}>
                  <button
                    className="prof-pick"
                    onClick={() => {
                      onSwitch(p.id);
                      setOpen(false);
                    }}
                  >
                    <span
                      className="prof-ava"
                      style={p.avatar ? undefined : { background: profileColor(p.id), color: '#fff' }}
                    >
                      {p.avatar ? <img src={p.avatar} alt="" /> : initial(p.name)}
                    </span>
                    <span>{p.name}</span>
                    {p.id === active && <Check size={14} />}
                  </button>
                  {p.id !== 'me' && (
                    <button className="icon-btn" onClick={() => void delProfile(p.id)} aria-label="Delete profile">
                      <Trash2 size={14} />
                    </button>
                  )}
                </div>
              ))}
              <div className="row prof-add">
                <input
                  className="input"
                  value={newProfile}
                  onChange={(e) => setNewProfile(e.target.value)}
                  placeholder="New profile name"
                />
                <button className="btn" onClick={() => void createProfile()} aria-label="Add profile">
                  <Plus size={16} />
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function NumRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint: string;
  value: number;
  onChange: (v: number) => void;
}) {
  return (
    <div className="set-row num-row">
      <div className="num-row-text">
        <span>{label}</span>
        <small>{hint}</small>
      </div>
      <div className="num-stepper">
        <button onClick={() => onChange(value - 1)} aria-label="Less">
          <Minus size={14} />
        </button>
        <input
          type="number"
          value={value}
          onChange={(e) => onChange(parseInt(e.target.value, 10) || value)}
        />
        <button onClick={() => onChange(value + 1)} aria-label="More">
          <Plus size={14} />
        </button>
      </div>
    </div>
  );
}

function SettingsView({
  tasks,
  goals,
  notes,
  streak,
  activeName,
  onSignOut,
  navLayout,
  onNavLayout,
}: {
  tasks: Task[];
  goals: Goal[];
  notes: Note[];
  streak: number;
  activeName: string;
  onSignOut: () => void;
  navLayout: NavLayout;
  onNavLayout: (l: NavLayout) => void;
}) {
  const [s, setS] = useState<AppSettings>(getSettings());
  const [theme, setThemeState] = useState<Theme>(getTheme());
  const [accent, setAccentState] = useState<string>(getAccent() ?? ACCENT_PRESETS[0]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const upd = (p: Partial<AppSettings>) => setS(setSettings(p));
  const applyTheme = (t: Theme) => {
    setTheme(t);
    setThemeState(t);
  };
  const chooseAccent = (c: string) => {
    setAccent(c);
    setAccentState(c);
  };

  const exportPdf = () => {
    const esc = (str: string) => str.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const H = (title: string, body: string) =>
      `<h3 style="color:#10b981;border-bottom:2px solid #10b981;padding-bottom:6px;margin:20px 0 8px;font-size:15px">${title}</h3>${body}`;
    const t = tasks
      .map(
        (x) =>
          `<li>${x.done ? '✓' : '○'} ${esc(x.title)}${x.deadline ? ` <span style="color:#999">· ${x.deadline}</span>` : ''}</li>`,
      )
      .join('');
    const gl = goals
      .map(
        (g) =>
          `<li>${esc(g.title)} — <b>${g.current}/${g.target}</b> (${g.target ? Math.round((g.current / g.target) * 100) : 0}%)</li>`,
      )
      .join('');
    const nt = notes
      .map(
        (n) =>
          `<div style="margin:0 0 12px"><b>${esc(n.title)}</b><div style="color:#444;white-space:pre-wrap;font-size:13px">${esc(n.content)}</div>${(n.images ?? [])
            .map((src) => `<img src="${src}" style="max-width:150px;border-radius:8px;margin:6px 6px 0 0"/>`)
            .join('')}</div>`,
      )
      .join('');
    void downloadPDF(
      `cadence-${todayStr()}.pdf`,
      `<div style="background:#0a0a0a;color:#fff;padding:18px 22px;border-radius:14px;display:flex;align-items:center;gap:10px;margin-bottom:18px">
         <span style="color:#10b981;font-size:22px">◇</span>
         <span style="font-size:22px;font-weight:600;letter-spacing:-.02em">Cadence</span>
         <span style="margin-left:auto;color:#10b981;font-weight:600">${streak} day streak</span>
       </div>
       <p style="color:#666;margin:0 0 4px">${esc(activeName)} · ${todayStr()}</p>
       ${H('Tasks', `<ul style="line-height:1.7">${t || '<li>None</li>'}</ul>`)}
       ${H('Goals', `<ul style="line-height:1.7">${gl || '<li>None</li>'}</ul>`)}
       ${H('Notes', nt || '<p style="color:#999">None</p>')}`,
    );
  };

  const handleExport = async () => {
    const choice = await chooseDialog('Export data', [
      { label: 'PDF', value: 'pdf' },
      { label: 'JSON', value: 'json' },
    ]);
    if (choice === 'pdf') exportPdf();
    else if (choice === 'json') {
      const res = await exportAll();
      if (res.saved) toast(res.location === 'download' ? 'Backup downloaded' : 'Saved to Documents');
      else toast('Storage permission needed to save the backup.');
    }
  };

  const signOutFlow = async () => {
    const ok = await confirmDialog('Sign out?', {
      message: 'Your tasks, goals and notes stay saved on this device. You can sign back in anytime.',
    });
    if (ok) onSignOut();
  };

  return (
    <section className="profile">
      <div className="settings">
        <p className="lbl">Account</p>
        <div className="set-row account">
          <User size={16} />
          <span className="account-email">{getEmail()}</span>
        </div>
        <button className="set-row danger" onClick={() => void signOutFlow()}>
          <LogOut size={16} />
          <span>Sign out</span>
          <small>Keeps local data</small>
        </button>
      </div>

      <div className="settings">
        <p className="lbl">Support</p>
        <button className="set-row donate" onClick={() => void openExternal(DONATE_URL)}>
          <Heart size={16} />
          <span>Buy me a coffee</span>
          <small>Ko-fi ↗</small>
        </button>
        <p className="donate-note">Cadence is free and lives on your device. A small tip keeps it growing.</p>
      </div>

      <div className="settings">
        <p className="lbl">Appearance</p>
        <div className="set-row col">
          <div className="set-row-head">
            {theme === 'light' ? <Sun size={16} /> : <Moon size={16} />}
            <span>Theme</span>
          </div>
          <div className="seg seg-3">
            {(['dark', 'light', 'glass'] as Theme[]).map((t) => (
              <button
                key={t}
                type="button"
                className={theme === t ? 'active' : ''}
                onClick={() => applyTheme(t)}
              >
                {t === 'dark' ? 'Dark' : t === 'light' ? 'Light' : 'Glass'}
              </button>
            ))}
          </div>
        </div>
        <div className="set-row col">
          <div className="set-row-head">
            <span>Highlight</span>
            <small>accent color</small>
          </div>
          <div className="swatches">
            {ACCENT_PRESETS.map((c) => (
              <button
                key={c}
                type="button"
                className={`swatch ${accent.toLowerCase() === c ? 'on' : ''}`}
                style={{ background: c }}
                onClick={() => chooseAccent(c)}
                aria-label={`Highlight ${c}`}
              />
            ))}
            <button
              type="button"
              className={`swatch custom ${pickerOpen ? 'on' : ''}`}
              onClick={() => setPickerOpen((o) => !o)}
              title="Customize your color palette"
              aria-label="Customize your color palette"
            >
              <Palette size={14} />
            </button>
          </div>
          {pickerOpen && (
            <div className="color-pop">
              <HexColorPicker color={accent} onChange={chooseAccent} />
              <div className="color-pop-foot">
                <span className="color-hex">{accent.toUpperCase()}</span>
                <button type="button" className="set-row mini" onClick={() => setPickerOpen(false)}>
                  Done
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="set-row col">
          <div className="set-row-head">
            <span>Layout</span>
            <small>bottom bar order</small>
          </div>
          <div className="seg seg-3">
            {NAV_LAYOUTS.map((l) => (
              <button
                key={l.id}
                type="button"
                className={navLayout === l.id ? 'active' : ''}
                onClick={() => onNavLayout(l.id)}
              >
                {l.name}
              </button>
            ))}
          </div>
        </div>
      </div>

      <div className="settings">
        <p className="lbl">Notes &amp; trash</p>
        <NumRow
          label="Trash capacity"
          hint="recoverable deleted notes kept"
          value={s.trashMax}
          onChange={(v) => upd({ trashMax: v })}
        />
        <NumRow
          label="Trash lifetime"
          hint="days a deleted note stays before auto-delete"
          value={s.trashDays}
          onChange={(v) => upd({ trashDays: v })}
        />
        <NumRow
          label="Temporal note lifetime"
          hint="days until a temporal note self-deletes"
          value={s.temporalDays}
          onChange={(v) => upd({ temporalDays: v })}
        />
      </div>

      <div className="settings">
        <p className="lbl">Data</p>
        <button className="set-row" onClick={() => void handleExport()}>
          <Download size={16} />
          <span>Export data</span>
          <small>PDF or JSON</small>
        </button>
        <button className="set-row" onClick={() => void clearCompletedTasks()}>
          <Check size={16} />
          <span>Clear completed tasks</span>
        </button>
        <button
          className="set-row danger"
          onClick={async () => {
            const ok = await confirmDialog('Erase all data?', {
              message: 'Wipes every task, goal, note and profile on this device. Cannot be undone.',
              danger: true,
            });
            if (ok) void wipeAll();
          }}
        >
          <Trash2 size={16} />
          <span>Reset all data</span>
        </button>
      </div>

      <BrandLogo />
    </section>
  );
}

// Company monogram, tinted to the active highlight colour via CSS mask.
// Drop the logo at `public/logo-nnh.png` (transparent background) to show it.
function BrandLogo() {
  const [ok, setOk] = useState(false);
  useEffect(() => {
    const img = new Image();
    img.onload = () => setOk(true);
    img.onerror = () => setOk(false);
    img.src = '/logo-nnh.png';
  }, []);
  return (
    <div className="brand-footer">
      {ok && <span className="brand-logo" role="img" aria-label="N&N Holdings logo" />}
      <small className="brand-footer-copy">© 2026 N&amp;N Holdings™</small>
      <small className="brand-footer-ver">Cadence v1.0.0</small>
    </div>
  );
}

const CONFETTI_COLORS = ['#10b981', '#34d399', '#fbbf24', '#f87171', '#60a5fa', '#a78bfa'];

function Confetti({ onDone }: { onDone: () => void }) {
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
