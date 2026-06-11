// One-off: drag a desk + verify augmentation stages visually.
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
await new Promise(r => server.listen(8752, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8752/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

// drag the garage desk from (120,176) to (300,180) in internal coords
const box = await page.locator('#scene-canvas').boundingBox();
const fx = box.width / 480, fy = box.height / 200;
await page.mouse.move(box.x + 120 * fx, box.y + 164 * fy);
await page.mouse.down();
await page.mouse.move(box.x + 300 * fx, box.y + 176 * fy, { steps: 8 });
await page.mouse.up();
await page.waitForTimeout(400);
const deskPos = await page.evaluate(() => window.AIMOGUL.s.deskPos);
console.log('deskPos after drag:', JSON.stringify(deskPos));
await page.screenshot({ path: join(ROOT, 'test', 'shot_drag_desk.png'),
  clip: { x: box.x, y: box.y, width: box.width, height: box.height } });

// augmentation stages: factory (chrome arm) and lattice (eyes-only humans)
for (const [name, phase, staff] of [['aug_factory', 4, 4], ['aug_lattice', 7, 5]]) {
  await page.evaluate(({ phase, staff }) => {
    const s = window.AIMOGUL.s;
    s.phase = phase; s.paused = true;
    s.gpus = phase >= 7 ? { omegaCore: 5e11 } : { mx1: 2e6 };
    s.staff = { researcher: staff, engineer: 3, ops: 2, sales: 2 };
    s.bestCap = phase >= 7 ? 280 : 85;
  }, { phase, staff });
  await page.click('[data-act=tab][data-arg=train]');
  await page.click('[data-act=tab][data-arg=lab]');
  await page.waitForTimeout(2200);
  const b2 = await page.locator('#scene-canvas').boundingBox();
  await page.screenshot({ path: join(ROOT, 'test', `shot_${name}.png`),
    clip: { x: b2.x, y: b2.y, width: b2.width, height: b2.height } });
  console.log('shot', name);
}
await browser.close();
server.close();
