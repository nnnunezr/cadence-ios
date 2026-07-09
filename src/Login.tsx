// ── Quick email login (local-only gate; no password, no network) ─────────────
import { useState } from 'react';
import type { FormEvent } from 'react';
import { signIn, isValidEmail } from './data';
import { CadenceMark } from './CadenceMark';

export function Login({ onAuthed }: { onAuthed: (email: string) => void }) {
  const [email, setEmail] = useState('');
  const [err, setErr] = useState('');

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const v = email.trim().toLowerCase();
    if (!isValidEmail(v)) {
      setErr('Enter a valid email address.');
      return;
    }
    signIn(v);
    onAuthed(v);
  };

  return (
    <div className="login">
      <div className="login-card">
        <div className="login-brand">
          <CadenceMark className="brand-mark" /> Cadence
        </div>
        <p className="login-sub">Keep your daily rhythm — tasks, goals, streaks.</p>
        <form className="login-form" onSubmit={submit}>
          <input
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setErr('');
            }}
            placeholder="you@email.com"
          />
          {err && <p className="login-err">{err}</p>}
          <button className="btn wide" type="submit">
            Continue
          </button>
        </form>
        <p className="login-fine">No password · local-only — nothing leaves your device.</p>
      </div>
    </div>
  );
}
