import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { useLiveQuery } from 'dexie-react-hooks';
import { Plus, Trash2, RotateCcw, Timer, X, ImagePlus, FileDown } from 'lucide-react';
import {
  db,
  addNote,
  saveNote,
  delNote,
  restoreNote,
  purgeNote,
  daysLeft,
  getSettings,
  addNoteImage,
  removeNoteImage,
  inProfile,
} from '../data';
import { fileToDataUrl } from '../lib/format';
import { downloadPDF } from '../lib/pdf';

export function Notes({ active }: { active: string }) {
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
