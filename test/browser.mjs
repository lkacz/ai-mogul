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

await check('sidebar shows AGI index + goal', async () => {
  const t = await page.textContent('#sidebar');
  if (!t.includes('AGI Index')) throw new Error('no AGI index');
  if (!t.includes('CURRENT GOAL')) throw new Error('no goal card');
});

await check('speed up to 25×', async () => {
  await page.click('.speed-btn:has-text("25×")');
});

await check('start a training run', async () => {
  await page.click('[data-act=tab][data-arg=train]');
  await page.waitForSelector('[data-act=startRun]');
  await page.click('[data-act=suggestRun]');
  await page.click('[data-act=startRun]');
  await page.waitForSelector('.run-card', { timeout: 4000 });
});

await check('gig button works', async () => {
  await page.click('[data-act=tab][data-arg=lab]');
  await page.click('#gig-btn');
  await page.waitForSelector('.toast', { timeout: 3000 });
});

await check('hardware tab + buy GPU', async () => {
  await page.click('[data-act=tab][data-arg=hw]');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('aimogul_save_v1') || '{}').money ?? null);
  await page.click('.res-card:has-text("GTX 1070") [data-act=buyGpu]');
  const owned = await page.textContent('.res-card:has-text("GTX 1070")');
  if (!owned.includes('Owned: 2')) throw new Error('GPU count did not increase: ' + owned.slice(0, 80));
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

await check('no console or page errors', async () => {
  const real = errors.filter(e => !e.includes('favicon'));
  if (real.length) throw new Error(real.slice(0, 3).join(' | '));
});

await browser.close();
server.close();
console.log('─'.repeat(50));
if (failures) { console.log(`❌ ${failures} failure(s)`); process.exit(1); }
console.log('✅ BROWSER PASS');
