// ── In-app dialogs + toast (no browser confirm/alert) ────────────────────────
import { useSyncExternalStore } from 'react';

type ConfirmReq = {
  type: 'confirm';
  title: string;
  message?: string;
  danger?: boolean;
  resolve: (v: boolean) => void;
};
type ChooseReq = {
  type: 'choose';
  title: string;
  options: { label: string; value: string }[];
  resolve: (v: string | null) => void;
};
type UiReq = ConfirmReq | ChooseReq;

let current: UiReq | null = null;
const subs = new Set<() => void>();
const emit = () => subs.forEach((f) => f());
const set = (r: UiReq | null) => {
  current = r;
  emit();
};

export function confirmDialog(
  title: string,
  opts?: { message?: string; danger?: boolean },
): Promise<boolean> {
  return new Promise((resolve) =>
    set({
      type: 'confirm',
      title,
      message: opts?.message,
      danger: opts?.danger,
      resolve: (v) => {
        set(null);
        resolve(v);
      },
    }),
  );
}

export function chooseDialog(
  title: string,
  options: { label: string; value: string }[],
): Promise<string | null> {
  return new Promise((resolve) =>
    set({
      type: 'choose',
      title,
      options,
      resolve: (v) => {
        set(null);
        resolve(v);
      },
    }),
  );
}

// Toast
let toastMsg: string | null = null;
const tsubs = new Set<() => void>();
let toastTimer: ReturnType<typeof setTimeout> | undefined;
export function toast(msg: string) {
  toastMsg = msg;
  tsubs.forEach((f) => f());
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastMsg = null;
    tsubs.forEach((f) => f());
  }, 2400);
}

export function UiRoot() {
  const req = useSyncExternalStore(
    (cb) => {
      subs.add(cb);
      return () => subs.delete(cb);
    },
    () => current,
  );
  const tmsg = useSyncExternalStore(
    (cb) => {
      tsubs.add(cb);
      return () => tsubs.delete(cb);
    },
    () => toastMsg,
  );

  return (
    <>
      {req && (
        <div
          className="modal-backdrop"
          onClick={() => (req.type === 'confirm' ? req.resolve(false) : req.resolve(null))}
        >
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3 className="modal-title">{req.title}</h3>
            {req.type === 'confirm' ? (
              <>
                {req.message && <p className="muted">{req.message}</p>}
                <div className="modal-actions">
                  <button className="btn ghost" onClick={() => req.resolve(false)}>
                    Cancel
                  </button>
                  <button
                    className={`btn ${req.danger ? 'danger' : ''}`}
                    onClick={() => req.resolve(true)}
                  >
                    Confirm
                  </button>
                </div>
              </>
            ) : (
              <div className="modal-actions">
                {req.options.map((o) => (
                  <button className="btn" key={o.value} onClick={() => req.resolve(o.value)}>
                    {o.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
      {tmsg && <div className="toast">{tmsg}</div>}
    </>
  );
}
