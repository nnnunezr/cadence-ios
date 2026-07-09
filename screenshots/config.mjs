// ── Cadence App Store screenshot config ───────────────────────────────────────
// Edit THIS file to change screenshots. Then run:  npm run shots
// (capture pulls fresh app screens → screenshots/raw, then framing → screenshots/final)
//
// Headline syntax: wrap the accent word in *asterisks* → rendered in accentColor.

export const project = {
  appUrl: 'http://127.0.0.1:5173/',
  email: 'demo@cadence.app',            // local-only login used for the demo data
  // App Store export sizes. 6.7" is required; others optional but nice to have.
  exportSizes: [
    { name: '6.7', w: 1290, h: 2796 },  // iPhone 15/16 Pro Max  (required)
    { name: '6.5', w: 1242, h: 2688 },  // iPhone 11 Pro Max / XS Max
    // { name: 'ipad13', w: 2064, h: 2752 }, // iPad 13" (enable if you ship iPad)
  ],
};

// Cal-AI-inspired look: light background, big friendly bold headline, floating phone.
export const theme = {
  font: 'Poppins',                      // rounded, friendly (loaded from Google Fonts)
  headlineColor: '#0e1512',
  accentColor: '#10b981',               // Cadence green
  headlineSize: 128,                    // px at 1290 width; scales with export size
  headlineTop: 150,                     // px from top
  phoneTop: 590,                        // px from top
  phoneWidth: 940,                      // outer device width in px
  bezel: '#0b0d0c',
  shadow: 'rgba(20,40,30,0.28)',
};

// One entry per screenshot. `raw` = filename produced by capture.mjs (screenshots/raw).
export const slides = [
  { raw: 'tasks.png',  headline: 'Plan your *day*',        bg: '#F3EFE7' },
  { raw: 'streak.png', headline: 'Keep the *streak*',      bg: '#E7F6EE' },
  { raw: 'goals.png',  headline: 'Reach every *goal*',     bg: '#F3EFE7' },
  { raw: 'notes.png',  headline: 'Never lose an *idea*',   bg: '#FBF1E6' },
  { raw: 'you.png',    headline: 'Make it *yours*',        bg: '#EFEDFA' },
];
