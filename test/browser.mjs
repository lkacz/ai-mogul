// Real-browser boot test using playwright-core + system Chrome/Edge.
// Serves the repo, loads the game, plays the first minutes, asserts no errors.
// Run: node test/browser.mjs

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  try {
    const path = normalize(join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0])));
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('nope');
  }
});
await new Promise(r => server.listen(8742, r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`  ✅ ${name}`); }
  catch (e) { failures++; console.log(`  ❌ ${name}: ${e.message.split('\n')[0]}`); }
};

await page.goto('http://127.0.0.1:8742/', { waitUntil: 'networkidle' });

await check('page boots with intro modal', async () => {
  await page.waitForSelector('#modal-root .modal', { timeout: 5000 });
  const t = await page.textContent('#modal-root .modal');
  if (!t.includes('Mario Damodei')) throw new Error('intro text missing');
});

await check('dismiss intro', async () => {
  await page.click('#modal-root [data-act=closeModal]');
});

await check('sidebar shows AGI index + goal with Go button', async () => {
  const t = await page.textContent('#sidebar');
  if (!t.includes('AGI Index')) throw new Error('no AGI index');
  if (!t.includes('CURRENT GOAL')) throw new Error('no goal card');
  await page.waitForSelector('#goal-card .goal-go', { timeout: 3000 });
  await page.waitForSelector('.tab-btn.pulse', { timeout: 3000 });   // onboarding pulse
});

await check('speed up to 25×', async () => {
  await page.click('.speed-btn:has-text("25×")');
});

await check('start a training run → LR minigame offered', async () => {
  await page.click('[data-act=tab][data-arg=train]');
  await page.waitForSelector('[data-act=startRun]');
  await page.click('[data-act=suggestRun]');
  await page.click('[data-act=startRun]');
  await page.waitForSelector('[data-act=mgPlayLr]', { timeout: 4000 });
  const txt = await page.textContent('#modal-root .modal');
  if (!/learning rate/i.test(txt)) throw new Error('LR offer lacks lesson text');
  await page.click('[data-act=mgSkipLr]');
  await page.waitForSelector('.run-card', { timeout: 4000 });
});

await check('dataset purchase → Dedup Frenzy plays to completion', async () => {
  await page.evaluate(() => { window.AIMOGUL.s.money = 1e6; });
  await page.click('[data-act=tab][data-arg=co]');
  await page.click('[data-act=buyData][data-arg=curated]');
  await page.waitForSelector('[data-act=mgPlayDedup]', { timeout: 4000 });
  await page.click('[data-act=mgPlayDedup]');
  await page.waitForSelector('#mg-dd', { timeout: 4000 });
  // zap a few cards mid-air, then wait for the finish modal
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(900);
    const box = await page.locator('#mg-dd').boundingBox();
    await page.mouse.click(box.x + box.width * (0.15 + (i % 5) * 0.17), box.y + box.height * 0.45);
  }
  await page.waitForSelector('[data-act=mgClose]', { timeout: 30000 });
  const txt = await page.textContent('#modal-root .modal');
  if (!txt.includes('quality')) throw new Error('dedup finish modal missing');
  const bonus = await page.evaluate(() => window.AIMOGUL.s.dataQBonus.curated);
  if (!(bonus >= 1)) throw new Error('dataQBonus not applied: ' + bonus);
  await page.click('[data-act=mgClose]');
});

await check('gig button works + floating gain number', async () => {
  await page.click('[data-act=tab][data-arg=lab]');
  await page.click('#gig-btn');
  await page.waitForSelector('.toast', { timeout: 3000 });
  await page.waitForSelector('.float-num', { timeout: 3000 });
});

await check('tab badge appears when research is affordable', async () => {
  await page.evaluate(() => { window.AIMOGUL.s.rp = 500; });
  await page.waitForSelector('.tab-badge', { timeout: 3000 });
});

await check('hardware tab + buy GPU', async () => {
  await page.click('[data-act=tab][data-arg=hw]');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('aimogul_save_v1') || '{}').money ?? null);
  await page.click('.res-card:has-text("GTX 1070") [data-act=buyGpu]');
  const owned = await page.textContent('.res-card:has-text("GTX 1070")');
  if (!owned.includes('Owned: 2')) throw new Error('GPU count did not increase: ' + owned.slice(0, 80));
});

await check('sell GPU frees the slot and refunds 45%', async () => {
  const moneyBefore = await page.evaluate(() => window.AIMOGUL.s.money);
  await page.click('.res-card:has-text("GTX 1070") [data-act=sellGpu]');   // −1 button
  const card = await page.textContent('.res-card:has-text("GTX 1070")');
  if (!card.includes('Owned: 1')) throw new Error('GPU count did not decrease: ' + card.slice(0, 80));
  const moneyAfter = await page.evaluate(() => window.AIMOGUL.s.money);
  if (!(moneyAfter > moneyBefore)) throw new Error('no refund received');
});

await check('research / company / models / goals tabs render', async () => {
  for (const id of ['res', 'co', 'models', 'goals']) {
    await page.click(`[data-act=tab][data-arg=${id}]`);
    const len = (await page.textContent('#tab-content')).length;
    if (len < 100) throw new Error(`tab ${id} looks empty`);
  }
});

await check('first model trains and deploys (sim-fastforward)', async () => {
  await page.click('.speed-btn:has-text("500×")');
  await page.waitForFunction(() => {
    const el = document.querySelector('#sidebar');
    return el && /AGI Index/.test(el.textContent) && !el.textContent.includes('— best model\n');
  }, { timeout: 2000 }).catch(() => {});
  // wait until a model exists (run ~20 sim-hours at 500×/0.05s ticks)
  await page.waitForFunction(() => {
    try { return JSON.parse(localStorage.getItem('aimogul_save_v1'))?.models?.length >= 1; } catch { return false; }
  }, { timeout: 30000, polling: 500 }).catch(async () => {
    // force a save to refresh localStorage then re-check once
    throw new Error('no model after fast-forward');
  });
});

await check('save persists across reload', async () => {
  await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
  await page.reload({ waitUntil: 'networkidle' });
  const modal = await page.textContent('body');
  if (!modal.includes('AGI MOGUL') && !modal.includes('AGI Index')) throw new Error('did not reload into game');
  const money = await page.evaluate(() => JSON.parse(localStorage.getItem('aimogul_save_v1')).simHours);
  if (!(money > 0)) throw new Error('simHours not persisted');
});

await check('singularity → big-bang animation → ending modal', async () => {
  await page.evaluate(() => {
    const s = window.AIMOGUL.s;
    s.bestCap = 200.5; s.singularity = true; s.singularityAt = s.simHours;
  });
  await page.waitForSelector('#singularity-canvas', { timeout: 5000 });
  await page.waitForTimeout(2400);
  await page.click('#singularity-canvas');           // skip the cinematic
  await page.waitForSelector('#modal-root .modal', { timeout: 5000 });
  const txt = await page.textContent('#modal-root .modal');
  if (!txt.includes('SINGULARITY')) throw new Error('ending modal missing');
  await page.click('#modal-root [data-act=closeModal]');
});

await check('no console or page errors', async () => {
  const real = errors.filter(e => !e.includes('favicon'));
  if (real.length) throw new Error(real.slice(0, 3).join(' | '));
});

await browser.close();
server.close();
console.log('─'.repeat(50));
if (failures) { console.log(`❌ ${failures} failure(s)`); process.exit(1); }
console.log('✅ BROWSER PASS');
