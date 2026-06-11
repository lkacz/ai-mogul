// Screenshots of the four minigames, triggered via their natural paths.
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
await new Promise(r => server.listen(8744, r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1280, height: 800 } });
await page.goto('http://127.0.0.1:8744/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

// 1. LR Rider — start a run, accept the offer, ride for a bit
await page.click('[data-act=tab][data-arg=train]');
await page.click('[data-act=startRun]');
await page.waitForSelector('[data-act=mgPlayLr]');
await page.click('[data-act=mgPlayLr]');
await page.waitForSelector('#mg-lr');
const lrBox = await page.locator('#mg-lr').boundingBox();
for (let i = 0; i < 18; i++) {
  await page.mouse.move(lrBox.x + lrBox.width / 2, lrBox.y + lrBox.height * (0.75 - i * 0.018));
  await page.waitForTimeout(300);
}
await page.screenshot({ path: join(ROOT, 'test', 'shot_mg_lr.png') });
await page.waitForSelector('[data-act=mgClose]', { timeout: 30000 });
await page.screenshot({ path: join(ROOT, 'test', 'shot_mg_lr_done.png') });
await page.click('[data-act=mgClose]');
console.log('lr done');

// 2. Dedup Frenzy
await page.evaluate(() => { window.AIMOGUL.s.money = 1e7; });
await page.click('[data-act=tab][data-arg=co]');
await page.click('[data-act=buyData][data-arg=curated]');
await page.waitForSelector('[data-act=mgPlayDedup]');
await page.click('[data-act=mgPlayDedup]');
await page.waitForTimeout(6000);
await page.screenshot({ path: join(ROOT, 'test', 'shot_mg_dedup.png') });
await page.waitForSelector('[data-act=mgClose]', { timeout: 35000 });
await page.click('[data-act=mgClose]');
console.log('dedup done');

// 3. Node Hunt — synthesize an incident
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.lastIncident = { lostH: 6, realAt: Date.now() };
});
await page.waitForSelector('[data-act=mgPlayNode]', { timeout: 5000 });
await page.click('[data-act=mgPlayNode]');
await page.waitForSelector('[data-act=mgNodeTest]');
// run one diagnostic on the left half for the screenshot
await page.click('[data-act=mgNodePick][data-arg="0"]');
await page.click('[data-act=mgNodePick][data-arg="7"]');
await page.click('[data-act=mgNodeTest]');
await page.screenshot({ path: join(ROOT, 'test', 'shot_mg_node.png') });
await page.click('[data-act=mgClose]') .catch(() => {});
await page.evaluate(() => { document.getElementById('modal-root').classList.add('hidden'); window.AIMOGUL.s.paused = false; });
console.log('node done');

// 4. RLHF Rater — grant prerequisites and research rlhf
await page.evaluate(() => {
  const s = window.AIMOGUL.s;
  s.phase = Math.max(1, s.phase); s.rp = 500; s.research.push('lora', 'instruct');
});
await page.click('[data-act=tab][data-arg=res]');
await page.click('[data-act=research][data-arg=rlhf]');
await page.waitForSelector('[data-act=mgRlhfPick]', { timeout: 5000 });
await page.screenshot({ path: join(ROOT, 'test', 'shot_mg_rlhf.png') });
await browser.close();
server.close();
console.log('rlhf done');
