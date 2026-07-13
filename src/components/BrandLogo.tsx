import { useState, useEffect } from 'react';

// Company monogram, tinted to the active highlight colour via CSS mask.
// Drop the logo at `public/logo-nnh.png` (transparent background) to show it.
export function BrandLogo() {
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
