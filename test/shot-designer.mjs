// One-off: the facility designer at factory + orbital tiers.
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
await new Promise(r => server.listen(8753, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page.goto('http://127.0.0.1:8753/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

// AI Factory: build the liquid-cooling loop on the animated canvas
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.phase = 4; s.paused = true;
  s.facDesign = {};
});
await page.click('[data-act=tab][data-arg=hw]');
await page.click('[data-act=designOpen]');
await page.waitForSelector('#dz-canvas');
const box = await page.locator('#dz-canvas').boundingBox();
const cw = box.width / 12, ch = box.height / 6;
const place = async (part, cellList) => {
  await page.click(`[data-act=dzPick][data-arg=${part}]`);
  for (const c of cellList) {
    await page.mouse.click(box.x + (c % 12 + 0.5) * cw, box.y + (Math.floor(c / 12) + 0.5) * ch);
  }
};
await place('pod', [25, 26, 27, 37, 38, 39]);
await place('cdu', [28, 40]);
await place('pipe', [29, 30, 31, 32, 33, 34, 41, 42, 43, 44, 45, 46]);
await place('cooler', [35, 47]);
await place('turbine', [60, 61]);
await place('battery', [62]);
await place('sub', [49]);
await page.waitForTimeout(600);
await page.screenshot({ path: join(ROOT, 'test', 'shot_designer_factory.png') });
console.log('shot factory designer');

// orbital: the radiator lesson
await page.click('[data-act=closeModal]');
await page.evaluate(() => { window.AIMOGUL.s.phase = 5; window.AIMOGUL.s.facDesign = {}; });
await page.click('[data-act=tab][data-arg=lab]');
await page.click('[data-act=tab][data-arg=hw]');
await page.click('[data-act=designOpen]');
await page.waitForSelector('#dz-canvas');
const b2 = await page.locator('#dz-canvas').boundingBox();
const cw2 = b2.width / 12, ch2 = b2.height / 6;
const place2 = async (part, cellList) => {
  await page.click(`[data-act=dzPick][data-arg=${part}]`);
  for (const c of cellList) {
    await page.mouse.click(b2.x + (c % 12 + 0.5) * cw2, b2.y + (Math.floor(c / 12) + 0.5) * ch2);
  }
};
await place2('solar', [12, 24, 36]);
await place2('pod', [27, 28, 39, 40]);
await place2('radiator', [29, 41, 23, 35]);
await place2('laser', [16]);
await page.waitForTimeout(600);
await page.screenshot({ path: join(ROOT, 'test', 'shot_designer_orbital.png') });
console.log('shot orbital designer');

await browser.close();
server.close();
