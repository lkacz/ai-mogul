// One-off: New Game+ with Al Saltman in the garage.
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
await new Promise(r => server.listen(8750, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.addInitScript(() => {
  localStorage.removeItem('aimogul_save_v1');
  localStorage.setItem('aimogul_meta_v1', JSON.stringify({ runs: 1, founder: 'al' }));
});
await page.goto('http://127.0.0.1:8750/?skipintro', { waitUntil: 'networkidle' });
await page.screenshot({ path: join(ROOT, 'test', 'shot_al_intro.png') });
await page.click('#modal-root [data-act=closeModal]');
await page.waitForTimeout(2600);
await page.screenshot({ path: join(ROOT, 'test', 'shot_al_garage.png') });
console.log('shot al');
await browser.close();
server.close();
