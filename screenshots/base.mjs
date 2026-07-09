// ── Screenshot framing engine (Cal-AI-style base) ─────────────────────────────
// Reads config.mjs and turns screenshots/raw/*.png into finished App Store slides
// in screenshots/final/<size>/. Layout is fully proportional, so every export size
// (6.7", 6.5", iPad…) is rendered from the same design.
// Run indirectly via `npm run shots`, or directly: node screenshots/base.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { project, theme, slides } from './config.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(DIR, 'raw');
const FINAL = path.join(DIR, 'final');

const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;');
const headlineHtml = (s) => esc(s).replace(/\*(.+?)\*/g, '<span class="acc">$1</span>');
const b64 = (f) => 'data:image/png;base64,' + fs.readFileSync(path.join(RAW, f)).toString('base64');

// Build one slide's HTML at canvas W×H. k scales the 1290-baseline design to any size.
const html = (slide, W, H) => {
  const k = W / 1290;
  const px = (v) => (v * k).toFixed(2) + 'px';
  const phoneW = theme.phoneWidth;
  const bezel = 20, screenR = 96, phoneR = 118;
  const screenW = phoneW - bezel * 2;
  const screenH = screenW * (2796 / 1290);         // raw screens are 1290×2796
  return `<!doctype html><html><head><meta charset="utf-8">
<style>
  @import url('https://fonts.googleapis.com/css2?family=${theme.font}:wght@600;700;800&display=swap');
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:${W}px;height:${H}px;overflow:hidden}
  .stage{position:relative;width:${W}px;height:${H}px;background:${slide.bg};
    font-family:'${theme.font}',system-ui,sans-serif}
  .cap{position:absolute;left:0;right:0;top:${px(theme.headlineTop)};padding:0 ${px(96)};
    text-align:center;color:${theme.headlineColor};font-weight:800;
    font-size:${px(theme.headlineSize)};line-height:1.04;letter-spacing:-0.02em}
  .cap .acc{color:${theme.accentColor}}
  .phone{position:absolute;left:50%;top:${px(theme.phoneTop)};transform:translateX(-50%);
    width:${px(phoneW)};padding:${px(bezel)};border-radius:${px(phoneR)};
    background:linear-gradient(160deg,#26292c,${theme.bezel});
    box-shadow:0 ${px(48)} ${px(90)} ${theme.shadow}, 0 0 0 ${px(2)} rgba(255,255,255,0.05) inset}
  .screen{width:${px(screenW)};height:${px(screenH)};border-radius:${px(screenR)};
    overflow:hidden;background:#000}
  .screen img{width:${px(screenW)};display:block}
</style></head>
<body><div class="stage">
  <div class="cap">${headlineHtml(slide.headline)}</div>
  <div class="phone"><div class="screen"><img src="${b64(slide.raw)}"/></div></div>
</div></body></html>`;
};

const run = async () => {
  // sanity: every referenced raw file must exist
  const missing = slides.filter(s => !fs.existsSync(path.join(RAW, s.raw))).map(s => s.raw);
  if (missing.length) { console.error('Missing raw screenshots:', missing.join(', '), '\nRun capture first (npm run shots).'); process.exit(1); }

  const browser = await chromium.launch();
  const made = [];
  for (const size of project.exportSizes) {
    const outDir = path.join(FINAL, size.name);
    fs.mkdirSync(outDir, { recursive: true });
    const page = await browser.newPage({ viewport: { width: size.w, height: size.h }, deviceScaleFactor: 1 });
    for (let i = 0; i < slides.length; i++) {
      const s = slides[i];
      await page.setContent(html(s, size.w, size.h), { waitUntil: 'load' });
      await page.waitForTimeout(700); // webfont settle
      const name = `${String(i + 1).padStart(2, '0')}-${s.raw}`;
      const out = path.join(outDir, name);
      await page.screenshot({ path: out, clip: { x: 0, y: 0, width: size.w, height: size.h } });
      made.push(`${size.name}/${name}`);
    }
    await page.close();
  }
  console.log('rendered:\n  ' + made.join('\n  '));
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
