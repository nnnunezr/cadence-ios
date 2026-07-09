// ── Capture raw app screens → screenshots/raw ─────────────────────────────────
// Boots the local dev app in headless Chromium at an exact 6.7" device pixel size,
// seeds realistic demo data into IndexedDB, then screenshots each tab.
// Run indirectly via `npm run shots`, or directly: node screenshots/capture.mjs
import { chromium } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { project } from './config.mjs';

const DIR = path.dirname(fileURLToPath(import.meta.url));
const RAW = path.join(DIR, 'raw');
fs.mkdirSync(RAW, { recursive: true });
const dbNameFor = (email) => 'cadence_' + email.toLowerCase().replace(/[^a-z0-9]+/g, '_');

const SEED = (dbName) => new Promise((resolve, reject) => {
  const pad = n => String(n).padStart(2, '0');
  const dayOf = d => `${d.getFullYear()}-${pad(d.getMonth()+1)}-${pad(d.getDate())}`;
  const addD = n => { const d = new Date(); d.setDate(d.getDate()+n); return dayOf(d); };
  const iso = new Date().toISOString();
  const open = () => new Promise((res, rej) => { const r = indexedDB.open(dbName); r.onsuccess = () => res(r.result); r.onerror = () => rej(r.error); });
  (async () => {
    let db;
    for (let i = 0; i < 60; i++) {
      db = await open();
      if (db.objectStoreNames.contains('tasks') && db.objectStoreNames.contains('profile')) break;
      db.close(); await new Promise(r => setTimeout(r, 200));
    }
    const tx = db.transaction(['tasks','goals','notes','streaks','profile'], 'readwrite');
    const put = (s, o) => tx.objectStore(s).put(o);
    put('profile', { id:'me', name:'Natan', avatar:null, createdAt:iso, updatedAt:iso });
    const g1='g_ship', g2='g_books', g3='g_run', g4='g_inbox';
    put('goals',{id:g1,title:'Ship Cadence v1.0',target:10,current:8,horizon:'long',profileId:'me',createdAt:iso,updatedAt:iso});
    put('goals',{id:g2,title:'Read 12 books this year',target:12,current:5,horizon:'long',profileId:'me',createdAt:iso,updatedAt:iso});
    put('goals',{id:g3,title:'Morning runs',target:5,current:3,horizon:'short',profileId:'me',createdAt:iso,updatedAt:iso});
    put('goals',{id:g4,title:'Inbox to zero',target:4,current:2,horizon:'short',profileId:'me',createdAt:iso,updatedAt:iso});
    const T=[
      ['Finish App Store listing',0,addD(0),null,g1],
      ['Design the onboarding flow',1,null,iso,g1],
      ['Review pull requests',0,addD(1),null,null],
      ['Morning run — 5km',1,null,iso,g3],
      ['Draft release notes',1,null,iso,g1],
      ['Call the accountant',0,addD(2),null,null],
      ['Plan next sprint',0,addD(3),null,null],
    ];
    T.forEach((t,i)=>put('tasks',{id:'t_'+i,title:t[0],done:t[1],deadline:t[2],completedAt:t[3],goalId:t[4],profileId:'me',createdAt:new Date(Date.now()-i*3600000).toISOString(),updatedAt:iso}));
    for(let i=0;i<6;i++){const day=addD(-i);put('streaks',{id:'me|'+day,profileId:'me',day,createdAt:iso});}
    put('notes',{id:'n1',title:'Product ideas',content:'Product ideas\n\n• Weekly insights view\n• Streak-freeze token\n• Shared goals with a partner\n• Widget: today at a glance',images:[],deletedAt:null,expiresAt:null,profileId:'me',createdAt:iso,updatedAt:new Date(Date.now()-1000).toISOString()});
    put('notes',{id:'n2',title:'Investor meeting notes',content:'Investor meeting notes\n\nTraction: 1.2k weekly actives.\nRetention D30 at 41%.\nNext: cloud sync + reminders.',images:[],deletedAt:null,expiresAt:null,profileId:'me',createdAt:iso,updatedAt:new Date(Date.now()-2000).toISOString()});
    put('notes',{id:'n3',title:'Grocery run',content:'Grocery run\n\nOat milk, eggs, spinach, coffee, blueberries',images:[],deletedAt:null,expiresAt:addD(3),profileId:'me',createdAt:iso,updatedAt:new Date(Date.now()-3000).toISOString()});
    tx.oncomplete = () => { db.close(); resolve('seeded'); };
    tx.onerror = () => reject(tx.error);
  })().catch(reject);
});

const run = async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({
    viewport: { width: 430, height: 932 }, deviceScaleFactor: 3, colorScheme: 'dark', isMobile: true,
  });
  await ctx.addInitScript((email) => {
    const key = email.toLowerCase().replace(/[^a-z0-9]+/g, '_');
    localStorage.setItem('cadence-email', email);
    localStorage.setItem('cadence-theme', 'dark');
    localStorage.setItem('cadence-accent', '#10b981');
    localStorage.setItem('cadence-nav', 'doer');
    localStorage.setItem('cadence-active-profile__' + key, 'me');
  }, project.email);
  const page = await ctx.newPage();
  await page.goto(project.appUrl, { waitUntil: 'domcontentloaded' });
  await page.evaluate(SEED, dbNameFor(project.email)).catch(e => console.error('seed err', e));
  await page.reload({ waitUntil: 'domcontentloaded' });
  await page.waitForSelector('.item-title', { timeout: 15000 });
  await page.waitForTimeout(1200);

  const shot = (name) => page.screenshot({ path: path.join(RAW, name + '.png') });
  const tab = async (label) => { await page.locator('.nav button', { hasText: label }).first().click(); await page.waitForTimeout(700); };

  await page.evaluate(() => document.querySelector('.main')?.scrollTo(0, 0));
  await page.waitForTimeout(300); await shot('tasks');

  // Streak: scroll the real scroll parent so the flame + heatmap are centered
  await page.evaluate(() => { const el = document.querySelector('.streak'); if (el) el.scrollIntoView({ block: 'end' }); });
  await page.waitForTimeout(500); await shot('streak');

  await tab('Goals');  await shot('goals');
  await tab('Notes');  await page.waitForTimeout(400); await shot('notes');
  await tab('You');    await page.waitForTimeout(400); await shot('you');

  console.log('captured:', fs.readdirSync(RAW).filter(f => f.endsWith('.png')).join(', '));
  await browser.close();
};
run().catch(e => { console.error(e); process.exit(1); });
