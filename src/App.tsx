import { useState, useEffect } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Flame, CheckSquare, FileText, Target, User } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import {
  db,
  runMaintenance,
  drainQuickNotes,
  checkInToday,
  currentStreak,
  missedDeadlineDays,
  completedToday,
  isMilestone,
  ensureDefaultProfile,
  listProfiles,
  getActiveProfileId,
  setActiveProfileId,
  inProfile,
  getEmail,
  signOut,
  getNavLayout,
  setNavLayout,
  NAV_LAYOUTS,
  todayStr,
  type NavLayout,
} from './data';
import { UiRoot } from './components/ui';
import { Login } from './components/Login';
import { CadenceMark } from './components/CadenceMark';
import { Confetti } from './components/Confetti';
import { Tasks } from './features/Tasks';
import { Notes } from './features/Notes';
import { Goals } from './features/Goals';
import { Streak } from './features/Streak';
import { Profile } from './features/Profile';
import { SettingsView } from './features/Settings';

type Tab = 'tasks' | 'notes' | 'goals' | 'profile';
const TAB_META: { id: Tab; icon: LucideIcon; label: string }[] = [
  { id: 'tasks', icon: CheckSquare, label: 'Tasks' },
  { id: 'notes', icon: FileText, label: 'Notes' },
  { id: 'goals', icon: Target, label: 'Goals' },
  { id: 'profile', icon: User, label: 'You' },
];

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
