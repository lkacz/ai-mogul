// Screenshot helper: captures the pixel scene at every facility phase.
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
await new Promise(r => server.listen(8743, r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });

const PHASES = [
  { name: 'garage', patch: { phase: 0, gpus: { gtx1070: 1, rtx3060: 3 }, money: 4000,
      runs: [{ id: 'r1', name: 'Mogul-2', N: 4e7, D: 8e8, dataQ: 1, physNeed: 1.9e17, physDone: 8e16, startH: 0 }] } },
  { name: 'office', patch: { phase: 1, gpus: { a100: 30 }, money: 4e5, rep: 25, bestCap: 28,
      staff: { researcher: 3, engineer: 2, ops: 1, sales: 1 },
      runs: [{ id: 'r1', name: 'Mogul-6', N: 2e9, D: 4e10, dataQ: 1.2, physNeed: 4.8e20, physDone: 2e20, startH: 0 }] } },
  { name: 'colo', patch: { phase: 2, gpus: { h100: 700 }, money: 3e7, rep: 55, bestCap: 45,
      staff: { researcher: 4, engineer: 3, ops: 2, sales: 2 },
      runs: [{ id: 'r1', name: 'Mogul-14', N: 6e10, D: 1.2e12, dataQ: 1.4, physNeed: 4.3e23, physDone: 1e23, startH: 0 }] } },
  { name: 'dc', patch: { phase: 3, gpus: { b200: 40000 }, money: 2e9, rep: 80, bestCap: 62,
      staff: { researcher: 4, engineer: 3, ops: 2, sales: 2 },
      runs: [{ id: 'r1', name: 'Mogul-21', N: 9e11, D: 1.8e13, dataQ: 1.5, physNeed: 9.7e25, physDone: 5e25, startH: 0 }] } },
  { name: 'factory', patch: { phase: 4, gpus: { mx1: 2.4e6 }, money: 8e10, rep: 100, bestCap: 88,
      staff: { researcher: 4, engineer: 3, ops: 2, sales: 2 },
      runs: [{ id: 'r1', name: 'Mogul-30', N: 2e13, D: 4e14, dataQ: 1.9, physNeed: 4.8e28, physDone: 3e28, startH: 0 }] } },
];

await page.goto('http://127.0.0.1:8743/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

for (const ph of PHASES) {
  // init scripts run before the game boots (and after the old page's
  // beforeunload save), so the patch can't be overwritten
  await page.addInitScript((patch) => {
    const s = JSON.parse(localStorage.getItem('aimogul_save_v1') || '{}');
    Object.assign(s, patch, { simHours: 2000, lastReal: Date.now(), paused: false, speed: 1 });
    localStorage.setItem('aimogul_save_v1', JSON.stringify(s));
  }, ph.patch);
  await page.reload({ waitUntil: 'networkidle' });
  await page.waitForSelector('#scene-canvas');
  await page.waitForTimeout(2600);   // let characters wander & bubbles appear
  await page.screenshot({ path: join(ROOT, 'test', `shot_scene_${ph.name}.png`) });
  console.log('shot', ph.name);
}
await browser.close();
server.close();
console.log('done');
