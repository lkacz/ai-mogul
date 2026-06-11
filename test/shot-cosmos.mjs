// One-off: capture the Dyson Swarm and Omega Lattice scenes.
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
await new Promise(r => server.listen(8749, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8749/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

await page.addInitScript(() => {
  const s = JSON.parse(localStorage.getItem('aimogul_save_v1') || '{}');
  Object.assign(s, {
    phase: 6, gpus: { dysonNode: 6e8 }, money: 8e13, rep: 100, bestCap: 226, integrity: 70,
    won: true, wonAt: 6000, wonShown: true, simHours: 9500, lastReal: Date.now(),
    staff: { researcher: 5, engineer: 3, ops: 3, sales: 2 }, paused: false, speed: 1,
    runs: [{ id: 'r1', name: 'Mogul-71', N: 1.6e17, D: 3.2e18, dataQ: 2.4, physNeed: 3.1e36, physDone: 2e36, startH: 9000 }],
  });
  localStorage.setItem('aimogul_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#scene-canvas');
await page.waitForTimeout(2400);
await page.screenshot({ path: join(ROOT, 'test', 'shot_scene_dyson.png') });
console.log('shot dyson');

await page.addInitScript(() => {
  const s = JSON.parse(localStorage.getItem('aimogul_save_v1') || '{}');
  Object.assign(s, {
    phase: 7, gpus: { omegaCore: 8e11 }, money: 5e15, bestCap: 281,
    simHours: 13000, lastReal: Date.now(), paused: false, speed: 1,
    runs: [{ id: 'r2', name: 'Mogul-77', N: 4e19, D: 8e20, dataQ: 2.7, physNeed: 1.9e41, physDone: 1.2e41, startH: 12800 }],
  });
  localStorage.setItem('aimogul_save_v1', JSON.stringify(s));
});
await page.reload({ waitUntil: 'networkidle' });
await page.waitForSelector('#scene-canvas');
await page.waitForTimeout(2400);
await page.screenshot({ path: join(ROOT, 'test', 'shot_scene_lattice.png') });
console.log('shot lattice');

await browser.close();
server.close();
