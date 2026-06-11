// One-off: capture the moral dilemma modal.
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
await new Promise(r => server.listen(8748, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8748/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.phase = 2; s.money = 5e6;
  s.pendingDilemma = { id: 'maven', realAt: Date.now() };
});
await page.waitForSelector('#modal-root .modal');
await page.waitForTimeout(400);
await page.screenshot({ path: join(ROOT, 'test', 'shot_dilemma.png') });
console.log('shot dilemma');
await browser.close();
server.close();
