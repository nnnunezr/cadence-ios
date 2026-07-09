// ── One-command screenshot pipeline ───────────────────────────────────────────
// Starts the Vite dev server, captures fresh app screens, frames them, stops the
// server. Invoked by `npm run shots`.
import { spawn } from 'node:child_process';
import net from 'node:net';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(DIR, '..');
const PORT = 5173;

const portOpen = () => new Promise((res) => {
  const s = net.connect(PORT, '127.0.0.1');
  s.on('connect', () => { s.destroy(); res(true); });
  s.on('error', () => res(false));
});
const waitPort = async (up, timeoutMs = 60000) => {
  const t0 = Date.now();
  while (Date.now() - t0 < timeoutMs) { if ((await portOpen()) === up) return true; await new Promise(r => setTimeout(r, 500)); }
  return false;
};
const runNode = (script) => new Promise((res, rej) => {
  const p = spawn(process.execPath, [path.join(DIR, script)], { cwd: ROOT, stdio: 'inherit' });
  p.on('exit', (code) => code === 0 ? res() : rej(new Error(script + ' exited ' + code)));
});

const main = async () => {
  const alreadyUp = await portOpen();
  let server;
  if (!alreadyUp) {
    console.log('› starting dev server…');
    server = spawn('npm', ['run', 'dev', '--', '--port', String(PORT), '--strictPort', '--host'], { cwd: ROOT, stdio: 'ignore' });
    if (!(await waitPort(true))) { server.kill('SIGKILL'); throw new Error('dev server did not start on ' + PORT); }
  } else {
    console.log('› reusing dev server already on ' + PORT);
  }
  try {
    await runNode('capture.mjs');
    await runNode('base.mjs');
  } finally {
    if (server) { server.kill('SIGKILL'); console.log('› stopped dev server'); }
  }
  console.log('✓ done → screenshots/final/');
};
main().catch(e => { console.error(e); process.exit(1); });
