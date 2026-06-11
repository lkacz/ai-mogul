// One-off: capture the burning-rack effect in the office scene.
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
await new Promise(r => server.listen(8746, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8746/', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.phase = 1; s.money = 4e5; s.gpus = { a100: 24 };
  s.staff = { researcher: 2, engineer: 1, ops: 1, sales: 1 };
  s.buffs.push({ id: 'fireCleanup', label: '🔥 Fire cleanup', untilH: s.simHours + 24 });
});
await page.waitForTimeout(2500);
await page.screenshot({ path: join(ROOT, 'test', 'shot_fire.png') });
console.log('shot fire');
await browser.close();
server.close();
