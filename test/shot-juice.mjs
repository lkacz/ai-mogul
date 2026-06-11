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
await new Promise(r => server.listen(8745, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8745/', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');
await page.waitForTimeout(800);
// build a gig streak: 3 clicks with cooldown skips
for (let i = 0; i < 3; i++) {
  await page.evaluate(() => { window.AIMOGUL.gigReadyAt = 0; });
  await page.click('#gig-btn');
  await page.waitForTimeout(250);
}
await page.screenshot({ path: join(ROOT, 'test', 'shot_juice_fresh.png') });
console.log('shot fresh+streak');
await browser.close();
server.close();
