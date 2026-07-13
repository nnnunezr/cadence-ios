// ── Small shared formatting + file helpers ───────────────────────────────────

export function fmtDay(d: string) {
  return new Date(d + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

// Each profile gets a stable colour + initial so they read as distinct.
const PROFILE_COLORS = ['#10b981', '#3b82f6', '#f59e0b', '#ef4444', '#a855f7', '#ec4899', '#14b8a6', '#f97316'];
export function profileColor(id: string) {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return PROFILE_COLORS[h % PROFILE_COLORS.length];
}
export function initial(name: string) {
  return (name.trim()[0] || '?').toUpperCase();
}

export function fileToDataUrl(file: File): Promise<string> {
  return new Promise((res) => {
    const r = new FileReader();
    r.onload = () => res(String(r.result));
    r.readAsDataURL(file);
  });
}
