// One-off: capture WORLD REPORT broadcast modals across the eras.
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
await new Promise(r => server.listen(8754, r));
const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage({ viewport: { width: 1440, height: 880 } });
await page.goto('http://127.0.0.1:8754/?skipintro', { waitUntil: 'networkidle' });
await page.click('#modal-root [data-act=closeModal]');
await page.evaluate(() => {
  window.AIMOGUL.nextDilemmaReal = Infinity;
  window.AIMOGUL.nextImpactReal = Infinity;
});

const SHOTS = [
  ['seesCats', 'shot_impact_recognition.png'],
  ['tutorMillions', 'shot_impact_tutor.png'],
  ['earlierDiagnosis', 'shot_impact_hospital.png'],
  ['fusionViable', 'shot_impact_fusion.png'],
  ['marsTownHall', 'shot_impact_space.png'],
  ['skyShield', 'shot_impact_shield.png'],
];
for (const [id, file] of SHOTS) {
  await page.evaluate((sid) => {
    const g = window.AIMOGUL;
    g.s.lastReleaseName = 'MOISTRAL-70B';
    g.s.impactQueue = [sid];
    g.nextImpactReal = 0;
  }, id);
  await page.waitForSelector('.modal.impact');
  await page.waitForTimeout(1300);   // let the animation settle into motion
  await page.screenshot({ path: join(ROOT, 'test', file) });
  await page.click('[data-act=impactDone]');
  await page.evaluate(() => { window.AIMOGUL.nextImpactReal = Infinity; });
  console.log('shot', file);
}

// the Chronicle, with all six reports filed
await page.click('#ticker');
await page.waitForSelector('.chron-row');
await page.waitForTimeout(300);
await page.screenshot({ path: join(ROOT, 'test', 'shot_impact_chronicle.png') });
console.log('shot shot_impact_chronicle.png');
await browser.close();
server.close();
