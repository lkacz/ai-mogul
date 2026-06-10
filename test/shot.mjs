// Screenshot helper: boots the game, fast-forwards a bit, captures tabs.
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
await new Promise(r => server.listen(8743, r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8743/', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');
await page.click('.speed-btn:has-text("500×")');
await page.click('[data-act=tab][data-arg=train]');
await page.click('[data-act=startRun]');
await page.waitForTimeout(2500);   // let the sim run a while
await page.click('.speed-btn:has-text("5×")');
for (const id of ['lab', 'train', 'hw', 'res', 'co', 'goals']) {
  await page.click(`[data-act=tab][data-arg=${id}]`);
  await page.waitForTimeout(400);
  await page.screenshot({ path: join(ROOT, 'test', `shot_${id}.png`) });
}
await browser.close();
server.close();
console.log('screenshots written');
