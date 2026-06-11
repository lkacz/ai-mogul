// One-off: research tab with an active project + hardware progressive disclosure.
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
await new Promise(r => server.listen(8747, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8747/', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.phase = 1; s.money = 5e5; s.rp = 300; s.bestCap = 22;
  s.staff = { researcher: 3, engineer: 1, ops: 1, sales: 1 };
  s.research = ['bpe', 'mixedprec'];
  s.resProj = { id: 'kernels', done: 4, need: 6.6 };
});
await page.click('[data-act=tab][data-arg=res]');
await page.waitForTimeout(900);
await page.screenshot({ path: join(ROOT, 'test', 'shot_res_proj.png') });
await page.click('[data-act=tab][data-arg=hw]');
await page.waitForTimeout(500);
await page.screenshot({ path: join(ROOT, 'test', 'shot_hw_hidden.png') });
console.log('shots done');
await browser.close();
server.close();
