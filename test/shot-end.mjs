// Screenshot helper: the orbital scene + frames of the big-bang ending.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css' };
const server = http.createServer(async (req, res) => {
  try {
    const p = normalize(join(ROOT, req.url.split('?')[0] === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8744, r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });

await page.goto('http://127.0.0.1:8744/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

// orbital scene, deep post-AGI
await page.addInitScript(() => {
  const s = JSON.parse(localStorage.getItem('aimogul_save_v1') || '{}');
  Object.assign(s, {
    phase: 5, gpus: { px1: 8e6, qc1: 4e6 }, money: 5e12, rep: 100, bestCap: 168,
    won: true, wonAt: 6000, wonShown: true, simHours: 9000, lastReal: Date.now(),
    staff: { researcher: 5, engineer: 3, ops: 2, sales: 2 }, paused: false, speed: 1,
    runs: [{ id: 'r1', name: 'Mogul-58', N: 8e14, D: 1.6e16, dataQ: 2.4, physNeed: 7.7e31, physDone: 5e31, startH: 8800 }],
  });
  localStorage.setItem('aimogul_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#scene-canvas');
await page.waitForTimeout(2600);
await page.screenshot({ path: join(ROOT, 'test', 'shot_scene_orbital.png') });
console.log('shot orbital');

// trigger the ending and capture key moments of the elegy
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.bestCap = 300.5; s.singularity = true; s.singularityAt = s.simHours;
});
await page.waitForSelector('#singularity-canvas', { timeout: 5000 });
await page.waitForTimeout(20000);   // ~20 s — a constellation (the flame/star)
await page.screenshot({ path: join(ROOT, 'test', 'shot_end_constellation.png') });
await page.waitForTimeout(36000);   // ~56 s — the keepsakes drifting in
await page.screenshot({ path: join(ROOT, 'test', 'shot_end_keepsakes.png') });
await page.waitForTimeout(24000);   // ~80 s — just after the crossing
await page.screenshot({ path: join(ROOT, 'test', 'shot_end_bang.png') });
await page.waitForTimeout(29000);   // ~109 s — the garage light
await page.screenshot({ path: join(ROOT, 'test', 'shot_end_afterglow.png') });
await page.waitForTimeout(14000);   // ~123 s — the memorial, forever
await page.screenshot({ path: join(ROOT, 'test', 'shot_end_memorial.png') });
console.log('shot ending frames');

await browser.close();
server.close();
console.log('done');
