import { useState } from 'react';
import {
  User,
  LogOut,
  Heart,
  Sun,
  Moon,
  Palette,
  Download,
  Check,
  Trash2,
  Plus,
  Minus,
} from 'lucide-react';
import { HexColorPicker } from 'react-colorful';
import {
  getSettings,
  setSettings,
  getTheme,
  setTheme,
  getAccent,
  setAccent,
  ACCENT_PRESETS,
  NAV_LAYOUTS,
  exportAll,
  clearCompletedTasks,
  wipeAll,
  getEmail,
  openExternal,
  todayStr,
  type Task,
  type Goal,
  type Note,
  type Theme,
  type NavLayout,
  type AppSettings,
} from '../data';
import { confirmDialog, chooseDialog, toast } from '../components/ui';
import { BrandLogo } from '../components/BrandLogo';
import { downloadPDF } from '../lib/pdf';

// Donation target — replace `yourname` with your Ko-fi handle.
const DONATE_URL = 'https://ko-fi.com/nnholdings';

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

export function SettingsView({
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
