// One-off: the model architecture viz at four scales/eras.
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
await new Promise(r => server.listen(8751, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8751/', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');

const cases = [
  { name: 'tiny', patch: { phase: 0 }, logN: 7.1 },
  { name: 'gpt3', patch: { phase: 3, gpus: { mx1: 60000 }, research: ['bpe','mixedprec','kernels','zero','pipeline','customSilicon','waferscale'], bestCap: 60 }, logN: 11.24 },
  { name: 'moe', patch: { phase: 4, gpus: { px1: 3e6 }, research: ['bpe','mixedprec','zero','pipeline','customSilicon','waferscale','moe','reasoning','rlhf','instruct','lora','multimodalR','worldmodel','optical','recursion','aiResearch','selfplay','agents'], bestCap: 110, dataTier: 4 }, logN: 12.5 },
  { name: 'system', patch: { phase: 7, gpus: { omegaCore: 5e11 }, research: ['bpe','mixedprec','zero','pipeline','customSilicon','waferscale','moe','reasoning','rlhf','instruct','lora','multimodalR','worldmodel','optical','recursion','aiResearch','selfplay','agents','quantumAI','cryo','vonNeumann','nanofab','lloydCore','omega','worldSim','embodied'], bestCap: 280, dataTier: 6 }, logN: 17.5 },
];
for (const c of cases) {
  await page.evaluate(({ patch, logN }) => {
    Object.assign(window.AIMOGUL.s, patch);
    window.AIMOGUL.s.paused = true;
  }, c);
  await page.click('[data-act=tab][data-arg=lab]');
  await page.click('[data-act=tab][data-arg=train]');
  await page.waitForSelector('#model-viz');
  await page.evaluate((logN) => {
    const inp = document.querySelector('[data-input=trN]');
    inp.value = logN; inp.dispatchEvent(new Event('input', { bubbles: true }));
  }, c.logN);
  await page.waitForTimeout(1200);
  const card = await page.locator('#model-viz');
  const box = await card.boundingBox();
  await page.screenshot({ path: join(ROOT, 'test', `shot_viz_${c.name}.png`),
    clip: { x: box.x, y: box.y - 4, width: box.width, height: box.height + 30 } });
  console.log('shot', c.name);
}
await browser.close();
server.close();
