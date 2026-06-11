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
    const p = normalize(join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0])));
    res.writeHead(200, { 'content-type': MIME[extname(p)] || 'application/octet-stream' });
    res.end(await readFile(p));
  } catch { res.writeHead(404); res.end(); }
});
await new Promise(r => server.listen(8753, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 950 } });
await page.goto('http://127.0.0.1:8753/', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

// AI Factory: build a decent liquid-cooling loop layout programmatically
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.phase = 4; s.paused = true;
  // pods row y=2 (cells 24..33), cdu at 34? craft: pods 25-29, cdu 30, pipes 31,32,33→cooler at 35(edge)
  s.facDesign = {};
});
await page.click('[data-act=tab][data-arg=hw]');
await page.click('[data-act=designOpen]');
await page.waitForSelector('.dz-grid');
// place: pods, CDU, pipe run to an edge cooler, turbines+battery+sub
const place = async (part, cells) => {
  await page.click(`[data-act=dzPick][data-arg=${part}]`);
  for (const c of cells) await page.click(`.dz-cell >> nth=${c}`);
};
await place('pod', [25, 26, 27, 37, 38, 39]);
await place('cdu', [28, 40]);
await place('pipe', [29, 30, 31, 32, 41, 42, 43, 44]);
await place('cooler', [33, 45]);   // not edge — wait, col 9 isn't edge; use 35/47
await page.click('.dz-cell >> nth=33'); await page.click('.dz-cell >> nth=45'); // remove
await place('cooler', [35, 47]);   // right edge (col 11)
await place('pipe', [33, 34, 45, 46]);
await place('turbine', [60, 61]);
await place('battery', [62]);
await place('sub', [49]);
await page.waitForTimeout(300);
await page.screenshot({ path: join(ROOT, 'test', 'shot_designer_factory.png') });
console.log('shot factory designer');

await browser.close();
server.close();
