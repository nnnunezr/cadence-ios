// ── Cadence data layer ────────────────────────────────────────────────────────
// Local-first on Dexie/IndexedDB. Every write enqueues a syncQueue row so cloud
// sync can be wired later. Tasks/goals/notes are scoped per active profile;
// the streak (checkins) is global to the device.

import Dexie, { type Table } from 'dexie';
import { Capacitor } from '@capacitor/core';
import { Preferences } from '@capacitor/preferences';
import { Browser } from '@capacitor/browser';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';

export interface Task {
  id: string;
  title: string;
  done: 0 | 1;
  deadline?: string | null; // YYYY-MM-DD; a missed one breaks the streak
  completedAt?: string | null; // set when marked done; gates the daily check-in
  goalId?: string | null; // linked goal (completing the task advances it)
  profileId?: string;
  createdAt: string;
  updatedAt: string;
}

export type Horizon = 'short' | 'long';

export interface Note {
  id: string;
  title: string;
  content: string;
  images?: string[]; // data URLs
  deletedAt?: string | null; // soft-delete → trash; auto-purged per settings
  expiresAt?: string | null; // temporal note: auto-trashed on/after this day
  profileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface Profile {
  id: string;
  name: string;
  avatar?: string | null; // data URL
  createdAt?: string;
  updatedAt: string;
}

export interface Goal {
  id: string;
  title: string;
  target: number;
  current: number;
  horizon: Horizon; // short-term vs long-term
  profileId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CheckIn {
  day: string; // YYYY-MM-DD (legacy global streak, pre-v4)
  createdAt: string;
}

export interface Streak {
  id: string; // `${profileId}|${day}` — per-profile daily check-in
  profileId: string;
  day: string;
  createdAt: string;
}

export type SyncOp = 'create' | 'update' | 'delete';
export interface SyncRow {
  id?: number;
  table: string;
  op: SyncOp;
  recordId: string;
  data: unknown;
  ts: number;
  synced: 0 | 1;
}

class CadenceDB extends Dexie {
  tasks!: Table<Task, string>;
  goals!: Table<Goal, string>;
  checkins!: Table<CheckIn, string>;
  streaks!: Table<Streak, string>;
  notes!: Table<Note, string>;
  profile!: Table<Profile, string>;
  syncQueue!: Table<SyncRow, number>;

  constructor(name: string) {
    super(name);
    this.version(1).stores({
      tasks: 'id, done, createdAt',
      goals: 'id',
      checkins: 'day',
      syncQueue: '++id, synced, ts',
    });
    this.version(2).stores({ notes: 'id, updatedAt' });
    this.version(3).stores({ profile: 'id' });
    // v4: per-profile streak. Migrate the old global check-ins to 'me'.
    this.version(4)
      .stores({ streaks: 'id, profileId, day' })
      .upgrade(async (tx) => {
        const old = (await tx.table('checkins').toArray()) as CheckIn[];
        if (old.length) {
          await tx.table('streaks').bulkPut(
            old.map((c) => ({ id: `me|${c.day}`, profileId: 'me', day: c.day, createdAt: c.createdAt })),
          );
        }
      });
  }
}

// ── Per-account isolation ──
// Each signed-in Gmail gets its own IndexedDB + active-profile pref, so accounts
// never see each other's data. Switching account reloads the app (see signIn).
function accountKey(): string {
  const e = (localStorage.getItem('cadence-email') || '').trim().toLowerCase();
  return e ? e.replace(/[^a-z0-9]+/g, '_') : 'guest';
}

export const db = new CadenceDB(`cadence_${accountKey()}`);

// ── helpers ──
const now = () => new Date().toISOString();
const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const pad2 = (n: number) => String(n).padStart(2, '0');
/** Local-timezone YYYY-MM-DD — day boundaries follow the user's clock, not UTC. */
export const dayOf = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
export const todayStr = () => dayOf(new Date());
export const MAX_TARGET = 1_000_000_000;

async function enqueue(table: string, op: SyncOp, recordId: string, data: unknown) {
  await db.syncQueue.add({ table, op, recordId, data, ts: Date.now(), synced: 0 });
}

// ── Active profile (scopes tasks/goals/notes; per-account) ──
const ACTIVE_KEY = `cadence-active-profile__${accountKey()}`;
export function getActiveProfileId(): string {
  return localStorage.getItem(ACTIVE_KEY) || 'me';
}
export function setActiveProfileId(id: string): void {
  localStorage.setItem(ACTIVE_KEY, id);
}
/** Treat rows with no profileId as belonging to the default 'me' profile. */
export const inProfile = (p: string | undefined, active: string) => (p ?? 'me') === active;

// ── Tasks ──
/** Returns false (and adds nothing) if the deadline is already in the past. */
export async function addTask(
  title: string,
  deadline?: string | null,
  goalId?: string | null,
): Promise<boolean> {
  if (deadline && deadline < todayStr()) return false;
  const t: Task = {
    id: uid(),
    title,
    done: 0,
    deadline: deadline || null,
    goalId: goalId || null,
    profileId: getActiveProfileId(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db.tasks.put(t);
  await enqueue('tasks', 'create', t.id, t);
  return true;
}
export async function toggleTask(t: Task) {
  const done: 0 | 1 = t.done ? 0 : 1;
  const u: Task = { ...t, done, completedAt: done ? now() : null, updatedAt: now() };
  await db.tasks.put(u);
  await enqueue('tasks', 'update', u.id, u);
  // Linked goal advances/retreats with the task's completion.
  if (t.goalId) {
    const g = await db.goals.get(t.goalId);
    if (g) await bumpGoal(g, done ? 1 : -1);
  }
}
export async function delTask(id: string) {
  await db.tasks.delete(id);
  await enqueue('tasks', 'delete', id, null);
}

// ── Goals ──
export async function addGoal(title: string, target: number, horizon: Horizon = 'short') {
  const tgt = Math.max(1, Math.min(MAX_TARGET, Math.floor(target) || 1));
  const g: Goal = {
    id: uid(),
    title,
    target: tgt,
    current: 0,
    horizon,
    profileId: getActiveProfileId(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db.goals.put(g);
  await enqueue('goals', 'create', g.id, g);
}
/** Clamps current to [0, target] — the target is a hard ceiling. */
export async function bumpGoal(g: Goal, delta: number) {
  const current = Math.max(0, Math.min(g.target, g.current + delta));
  const u: Goal = { ...g, current, updatedAt: now() };
  await db.goals.put(u);
  await enqueue('goals', 'update', u.id, u);
}
export async function delGoal(id: string) {
  await db.goals.delete(id);
  await enqueue('goals', 'delete', id, null);
}

// ── Streak (global) ──
export async function checkInToday() {
  const profileId = getActiveProfileId();
  const day = todayStr();
  const id = `${profileId}|${day}`;
  if (await db.streaks.get(id)) return;
  await db.streaks.put({ id, profileId, day, createdAt: now() });
  await enqueue('streaks', 'create', id, { id, profileId, day });
}

export function missedDeadlineDays(tasks: Task[]): Set<string> {
  const today = todayStr();
  return new Set(
    tasks
      .filter((t) => t.deadline && !t.done && t.deadline < today)
      .map((t) => t.deadline as string),
  );
}

export function currentStreak(days: string[], missed: Set<string> = new Set()): number {
  const set = new Set(days);
  const d = new Date();
  if (!set.has(dayOf(d))) d.setDate(d.getDate() - 1);
  let n = 0;
  for (;;) {
    const s = dayOf(d);
    if (set.has(s) && !missed.has(s)) {
      n++;
      d.setDate(d.getDate() - 1);
    } else break;
  }
  return n;
}

export function completedToday(tasks: Task[]): boolean {
  const d = todayStr();
  return tasks.some((t) => t.done === 1 && !!t.completedAt && dayOf(new Date(t.completedAt)) === d);
}

export const MILESTONES = [3, 7, 14, 30, 60, 100, 365];
export function isMilestone(n: number): boolean {
  return MILESTONES.includes(n);
}

// ── Theme ──
export type Theme = 'dark' | 'light' | 'glass';
const THEMES: Theme[] = ['dark', 'light', 'glass'];
export function getTheme(): Theme {
  const t = localStorage.getItem('cadence-theme') as Theme | null;
  return t && THEMES.includes(t) ? t : 'dark';
}
export function setTheme(t: Theme): void {
  localStorage.setItem('cadence-theme', t);
  document.documentElement.dataset.theme = t;
}

// ── Bottom-nav layout (order of the first three tabs; "You" stays last) ──
export type NavLayout = 'doer' | 'thinker' | 'dreamer';
export const NAV_LAYOUTS: { id: NavLayout; name: string; order: ('tasks' | 'notes' | 'goals')[] }[] = [
  { id: 'doer', name: 'Doer', order: ['tasks', 'notes', 'goals'] },
  { id: 'thinker', name: 'Thinker', order: ['notes', 'tasks', 'goals'] },
  { id: 'dreamer', name: 'Dreamer', order: ['goals', 'tasks', 'notes'] },
];
export function getNavLayout(): NavLayout {
  const v = localStorage.getItem('cadence-nav') as NavLayout | null;
  return v && NAV_LAYOUTS.some((l) => l.id === v) ? v : 'doer';
}
export function setNavLayout(v: NavLayout): void {
  localStorage.setItem('cadence-nav', v);
}

// ── Highlight (accent) color ──
// One chosen base colour drives every accent token (bright/dim/ink/glow/…), so
// it adapts across all three themes — including the Glass gradient.
export const ACCENT_PRESETS = ['#10b981', '#3b82f6', '#8b5cf6', '#f59e0b', '#ef4444', '#ec4899', '#14b8a6', '#f97316'];
const ACCENT_KEY = 'cadence-accent';

export function getAccent(): string | null {
  return localStorage.getItem(ACCENT_KEY);
}
function hexRgb(h: string): number[] {
  const s = h.replace('#', '');
  const f = s.length === 3 ? s.split('').map((c) => c + c).join('') : s;
  const n = parseInt(f, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}
const clamp255 = (x: number) => Math.max(0, Math.min(255, Math.round(x)));
const mixRgb = (a: number[], b: number[], t: number) => a.map((v, i) => clamp255(v + (b[i] - v) * t));
const rgbStr = (c: number[]) => `rgb(${c[0]}, ${c[1]}, ${c[2]})`;
const rgbaStr = (c: number[], a: number) => `rgba(${c[0]}, ${c[1]}, ${c[2]}, ${a})`;

export function applyAccent(hex: string): void {
  const base = hexRgb(hex);
  const s = document.documentElement.style;
  s.setProperty('--accent', rgbStr(base));
  s.setProperty('--accent-bright', rgbStr(mixRgb(base, [255, 255, 255], 0.22)));
  s.setProperty('--accent-dim', rgbStr(mixRgb(base, [0, 0, 0], 0.18)));
  s.setProperty('--accent-ink', rgbStr(mixRgb(base, [0, 0, 0], 0.82)));
  s.setProperty('--accent-glow', rgbaStr(base, 0.22));
  s.setProperty('--accent-soft', rgbaStr(base, 0.1));
  s.setProperty('--border-accent', rgbaStr(base, 0.45));
}
export function setAccent(hex: string): void {
  localStorage.setItem(ACCENT_KEY, hex);
  applyAccent(hex);
}

// ── App settings (note trash + temporal) ──
export interface AppSettings {
  trashMax: number; // max recoverable deleted notes kept in trash
  trashDays: number; // days a deleted note stays before auto-purge
  temporalDays: number; // default lifetime of a temporal note
}
const SETTINGS_DEFAULTS: AppSettings = { trashMax: 50, trashDays: 30, temporalDays: 7 };
const SETTINGS_KEY = 'cadence-settings';

export function getSettings(): AppSettings {
  try {
    return { ...SETTINGS_DEFAULTS, ...JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}') };
  } catch {
    return { ...SETTINGS_DEFAULTS };
  }
}
export function setSettings(patch: Partial<AppSettings>): AppSettings {
  const next = { ...getSettings(), ...patch };
  // clamp to sane ranges
  next.trashMax = Math.max(1, Math.min(999, Math.floor(next.trashMax) || 1));
  next.trashDays = Math.max(1, Math.min(365, Math.floor(next.trashDays) || 1));
  next.temporalDays = Math.max(1, Math.min(365, Math.floor(next.temporalDays) || 1));
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(next));
  return next;
}

// ── Notes (soft-delete trash + photos) ──
const addDays = (n: number) => dayOf(new Date(Date.now() + n * 86_400_000));

export async function addNote(temporal = false): Promise<string> {
  const n: Note = {
    id: uid(),
    title: temporal ? 'Temporal note' : 'Untitled',
    content: '',
    images: [],
    deletedAt: null,
    expiresAt: temporal ? addDays(getSettings().temporalDays) : null,
    profileId: getActiveProfileId(),
    createdAt: now(),
    updatedAt: now(),
  };
  await db.notes.put(n);
  await enqueue('notes', 'create', n.id, n);
  return n.id;
}
export async function saveNote(note: Note, content: string) {
  const u: Note = {
    ...note,
    content,
    title: content.split('\n')[0].trim().slice(0, 50) || 'Untitled',
    updatedAt: now(),
  };
  await db.notes.put(u);
  await enqueue('notes', 'update', u.id, u);
}
export async function addNoteImage(note: Note, dataUrl: string) {
  const u: Note = { ...note, images: [...(note.images ?? []), dataUrl], updatedAt: now() };
  await db.notes.put(u);
  await enqueue('notes', 'update', u.id, u);
}
export async function removeNoteImage(note: Note, idx: number) {
  const u: Note = {
    ...note,
    images: (note.images ?? []).filter((_, i) => i !== idx),
    updatedAt: now(),
  };
  await db.notes.put(u);
  await enqueue('notes', 'update', u.id, u);
}
/** Soft-delete → trash. */
export async function delNote(id: string) {
  const n = await db.notes.get(id);
  if (!n) return;
  const u: Note = { ...n, deletedAt: now(), updatedAt: now() };
  await db.notes.put(u);
  await enqueue('notes', 'update', id, u);
}
export async function restoreNote(id: string) {
  const n = await db.notes.get(id);
  if (!n) return;
  const u: Note = { ...n, deletedAt: null, updatedAt: now() };
  await db.notes.put(u);
  await enqueue('notes', 'update', id, u);
}
/** Permanent delete (from trash). */
export async function purgeNote(id: string) {
  await db.notes.delete(id);
  await enqueue('notes', 'delete', id, null);
}
/**
 * Startup maintenance (settings-driven):
 *  1. expired temporal notes → trash
 *  2. trashed notes older than `trashDays` → purged
 *  3. trash beyond `trashMax` (keep newest) → purged
 */
export async function runMaintenance() {
  const { trashDays, trashMax } = getSettings();
  const today = todayStr();

  const expired = await db.notes
    .filter((n) => !n.deletedAt && !!n.expiresAt && (n.expiresAt as string) <= today)
    .toArray();
  await Promise.all(expired.map((n) => delNote(n.id))); // soft-delete → recoverable in trash

  const cutoff = new Date(Date.now() - trashDays * 86_400_000).toISOString();
  const aged = await db.notes
    .filter((n) => !!n.deletedAt && (n.deletedAt as string) < cutoff)
    .toArray();
  await Promise.all(aged.map((n) => purgeNote(n.id)));

  const trash = (await db.notes.filter((n) => !!n.deletedAt).toArray()).sort((a, b) =>
    (b.deletedAt as string).localeCompare(a.deletedAt as string),
  );
  await Promise.all(trash.slice(trashMax).map((n) => purgeNote(n.id)));
}

/** Days remaining before a temporal note expires (negative = past). */
export function daysLeft(expiresAt: string): number {
  return Math.ceil((new Date(expiresAt + 'T00:00:00').getTime() - Date.now()) / 86_400_000);
}

// ── Profiles (multiple, switchable) ──
export async function ensureDefaultProfile() {
  if ((await db.profile.count()) === 0) {
    await db.profile.put({ id: 'me', name: 'Founder', avatar: null, createdAt: now(), updatedAt: now() });
  }
}
export function listProfiles() {
  return db.profile.toArray();
}
export async function addProfile(name: string): Promise<string> {
  const id = uid();
  const p: Profile = { id, name: name.trim() || 'Profile', avatar: null, createdAt: now(), updatedAt: now() };
  await db.profile.put(p);
  await enqueue('profile', 'create', id, p);
  setActiveProfileId(id);
  return id;
}
export async function delProfile(id: string) {
  if (id === 'me') return; // keep the default
  await db.profile.delete(id);
  await enqueue('profile', 'delete', id, null);
  if (getActiveProfileId() === id) setActiveProfileId('me');
}
export async function saveProfile(patch: { name?: string; avatar?: string | null }) {
  const id = getActiveProfileId();
  const cur = await db.profile.get(id);
  const row: Profile = {
    id,
    name: patch.name ?? cur?.name ?? 'Founder',
    avatar: patch.avatar !== undefined ? patch.avatar : (cur?.avatar ?? null),
    createdAt: cur?.createdAt ?? now(),
    updatedAt: now(),
  };
  await db.profile.put(row);
  await enqueue('profile', 'update', id, row);
}

// ── Settings functions ──
export async function clearCompletedTasks() {
  const active = getActiveProfileId();
  const done = (await db.tasks.where('done').equals(1).toArray()).filter((t) =>
    inProfile(t.profileId, active),
  );
  await Promise.all(
    done.map(async (t) => {
      await db.tasks.delete(t.id);
      await enqueue('tasks', 'delete', t.id, null);
    }),
  );
}

// ── Saving files to the device (with permission on native) ──
export type SaveResult = { saved: boolean; location?: string; reason?: 'permission-denied' | 'error' };

function b64toBlob(b64: string, mime: string): Blob {
  const bin = atob(b64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return new Blob([bytes], { type: mime });
}

async function ensureStoragePermission(): Promise<boolean> {
  try {
    const cur = await Filesystem.checkPermissions();
    if (cur.publicStorage === 'granted') return true;
    const req = await Filesystem.requestPermissions();
    return req.publicStorage === 'granted';
  } catch {
    return true; // platforms without a public-storage permission gate
  }
}

/**
 * Save a file to the device. On native (Android/iOS) it asks for storage
 * permission and writes to the public Documents folder; on web it falls back to
 * a browser download. `base64` must be true for binary payloads (e.g. PDF).
 */
export async function saveToDevice(
  filename: string,
  data: string,
  opts: { mime: string; base64?: boolean },
): Promise<SaveResult> {
  if (!Capacitor.isNativePlatform()) {
    const blob = opts.base64 ? b64toBlob(data, opts.mime) : new Blob([data], { type: opts.mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
    return { saved: true, location: 'download' };
  }
  try {
    if (!(await ensureStoragePermission())) return { saved: false, reason: 'permission-denied' };
    const res = await Filesystem.writeFile({
      path: filename,
      data,
      directory: Directory.Documents,
      encoding: opts.base64 ? undefined : Encoding.UTF8,
      recursive: true,
    });
    return { saved: true, location: res.uri };
  } catch {
    return { saved: false, reason: 'error' };
  }
}

export async function exportAll(): Promise<SaveResult> {
  const data = {
    app: 'cadence',
    exportedAt: now(),
    tasks: await db.tasks.toArray(),
    goals: await db.goals.toArray(),
    notes: await db.notes.toArray(),
    checkins: await db.checkins.toArray(),
    streaks: await db.streaks.toArray(),
    profiles: await db.profile.toArray(),
  };
  return saveToDevice(`cadence-backup-${todayStr()}.json`, JSON.stringify(data, null, 2), {
    mime: 'application/json',
  });
}

export async function wipeAll() {
  await db.delete();
  location.reload();
}

// ── Local session (email gate — data still lives on-device) ──
// Lightweight identity only: no password, no network. Lets the app greet the
// user and gives a stable handle to attach to the sync queue later.
const EMAIL_KEY = 'cadence-email';
export function getEmail(): string | null {
  return localStorage.getItem(EMAIL_KEY);
}
export function signIn(email: string): void {
  localStorage.setItem(EMAIL_KEY, email.trim().toLowerCase());
  location.reload(); // reopen the per-account database
}
export function signOut(): void {
  localStorage.removeItem(EMAIL_KEY);
  location.reload(); // back to the login gate with a fresh db handle
}
export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim());
}

// ── External links (donation page, etc.) ──
// Opens in the system browser / in-app custom tab on native, a new tab on web.
export async function openExternal(url: string): Promise<void> {
  try {
    await Browser.open({ url });
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
}

// ── Quick-note widget bridge ──
// The Android home-screen widget appends captured notes to a JSON queue in the
// same store the Capacitor Preferences plugin uses. Pull them into the notes
// table whenever the app comes to the foreground, then clear the queue.
const QUICKNOTE_QUEUE = 'cadence_quicknote_queue';
export async function drainQuickNotes(): Promise<number> {
  try {
    const { value } = await Preferences.get({ key: QUICKNOTE_QUEUE });
    if (!value) return 0;
    const items = JSON.parse(value) as { text?: string }[];
    if (!Array.isArray(items) || items.length === 0) return 0;
    for (const item of items) {
      const text = (item?.text ?? '').toString().trim();
      if (!text) continue;
      const id = await addNote(false);
      const note = await db.notes.get(id);
      if (note) await saveNote(note, text);
    }
    await Preferences.remove({ key: QUICKNOTE_QUEUE });
    return items.length;
  } catch {
    return 0;
  }
}

// ── Sync seam (local-only for now) ──
export async function processSync(): Promise<number> {
  if (!navigator.onLine) return 0;
  return db.syncQueue.where('synced').equals(0).count();
}
