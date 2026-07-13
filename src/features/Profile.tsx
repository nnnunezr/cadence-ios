import { useState, useEffect, useRef } from 'react';
import type { ChangeEvent } from 'react';
import { ImagePlus, Users, ChevronDown, Check, Trash2, Plus } from 'lucide-react';
import { saveProfile, addProfile, delProfile, type Profile as ProfileData } from '../data';
import { profileColor, initial, fileToDataUrl } from '../lib/format';

export function Profile({
  profiles,
  active,
  onSwitch,
}: {
  profiles: ProfileData[];
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
