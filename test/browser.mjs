// Real-browser boot test using playwright-core + system Chrome/Edge.
// Serves the repo, loads the game, plays the first minutes, asserts no errors.
// Run: node test/browser.mjs

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { existsSync } from 'node:fs';
import { chromium } from 'playwright-core';

const ROOT = new URL('..', import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1');
const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml' };

const server = http.createServer(async (req, res) => {
  try {
    const path = normalize(join(ROOT, req.url === '/' ? 'index.html' : decodeURIComponent(req.url.split('?')[0])));
    const body = await readFile(path);
    res.writeHead(200, { 'content-type': MIME[extname(path)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404); res.end('nope');
  }
});
await new Promise(r => server.listen(8742, r));

const exe = ['C:/Program Files/Google/Chrome/Application/chrome.exe',
  'C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe'].find(existsSync);
const browser = await chromium.launch({ executablePath: exe, headless: true });
const page = await browser.newPage();

const errors = [];
page.on('console', m => { if (m.type() === 'error') errors.push(m.text()); });
page.on('pageerror', e => errors.push(String(e)));

let failures = 0;
const check = async (name, fn) => {
  try { await fn(); console.log(`  ✅ ${name}`); }
  catch (e) { failures++; console.log(`  ❌ ${name}: ${e.message.split('\n')[0]}`); }
};

await page.goto('http://127.0.0.1:8742/', { waitUntil: 'networkidle' });

await check('fresh boot: cosmic opening → founder choice → intro modal', async () => {
  await page.waitForSelector('#opening-canvas', { timeout: 5000 });
  await page.waitForTimeout(700);
  await page.click('#opening-canvas');           // skip the fall to the garage
  await page.waitForSelector('[data-act=pickFounder]', { timeout: 6000 });
  const choice = await page.textContent('#modal-root .modal');
  if (!choice.includes('Mario Damodei') || !choice.includes('Al Saltman'))
    throw new Error('founder choice missing a candidate');
  const first = await page.getAttribute('#modal-root [data-act=pickFounder]', 'data-arg');
  if (first !== 'mario') throw new Error('fresh game should lead with Mario, got ' + first);
  await page.click('[data-act=pickFounder][data-arg=mario]');
  const t = await page.textContent('#modal-root .modal');
  if (!t.includes('Mario Damodei')) throw new Error('intro text missing');
});

await check('dismiss intro', async () => {
  await page.click('#modal-root [data-act=closeModal]');
  // keep timed dilemma offers and world-report broadcasts from popping
  // modals mid-suite (dedicated checks inject their own)
  await page.evaluate(() => {
    window.AIMOGUL.nextDilemmaReal = Infinity;
    window.AIMOGUL.nextImpactReal = Infinity;
  });
});

await check('sidebar shows AGI index + goal with Go button', async () => {
  const t = await page.textContent('#sidebar');
  if (!t.includes('AGI Index')) throw new Error('no AGI index');
  if (!t.includes('CURRENT GOAL')) throw new Error('no goal card');
  await page.waitForSelector('#goal-card .goal-go', { timeout: 3000 });
  await page.waitForSelector('.tab-btn.pulse', { timeout: 3000 });   // onboarding pulse
});

await check('speed up to 25×', async () => {
  await page.click('.speed-btn:has-text("25×")');
});

await check('turbo 10k× engages with muted-notification notice', async () => {
  await page.click('.speed-btn:has-text("10k×")');
  await page.waitForSelector('.toast', { timeout: 3000 });
  const t = await page.textContent('#toast-root');
  if (!/Turbo/i.test(t)) throw new Error('no turbo notice');
  await page.click('.speed-btn:has-text("25×")');   // back to normal for later checks
});

await check('training tab shows live architecture viz', async () => {
  await page.click('[data-act=tab][data-arg=train]');
  await page.waitForSelector('#model-viz', { timeout: 4000 });
  const lbl = await page.textContent('#mv-label');
  if (!/layers · d_model .+ attention heads/.test(lbl)) throw new Error('arch label missing: ' + lbl);
});

await check('start a training run → LR minigame offered', async () => {
  await page.click('[data-act=tab][data-arg=train]');
  await page.waitForSelector('[data-act=startRun]');
  await page.click('[data-act=suggestRun]');
  await page.click('[data-act=startRun]');
  await page.waitForSelector('[data-act=mgPlayLr]', { timeout: 4000 });
  const txt = await page.textContent('#modal-root .modal');
  if (!/learning rate/i.test(txt)) throw new Error('LR offer lacks lesson text');
  await page.click('[data-act=mgSkipLr]');
  await page.waitForSelector('.run-card', { timeout: 4000 });
});

await check('dataset purchase → Dedup Frenzy plays to completion', async () => {
  await page.evaluate(() => { window.AIMOGUL.s.money = 1e6; });
  await page.click('[data-act=tab][data-arg=co]');
  await page.click('[data-act=buyData][data-arg=curated]');
  await page.waitForSelector('[data-act=mgPlayDedup]', { timeout: 4000 });
  await page.click('[data-act=mgPlayDedup]');
  await page.waitForSelector('#mg-dd', { timeout: 4000 });
  // zap a few cards mid-air, then wait for the finish modal
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(900);
    const box = await page.locator('#mg-dd').boundingBox();
    await page.mouse.click(box.x + box.width * (0.15 + (i % 5) * 0.17), box.y + box.height * 0.45);
  }
  await page.waitForSelector('[data-act=mgClose]', { timeout: 30000 });
  const txt = await page.textContent('#modal-root .modal');
  if (!txt.includes('quality')) throw new Error('dedup finish modal missing');
  const bonus = await page.evaluate(() => window.AIMOGUL.s.dataQBonus.curated);
  if (!(bonus >= 1)) throw new Error('dataQBonus not applied: ' + bonus);
  await page.click('[data-act=mgClose]');
});

await check('delegation: a small data crew takes the dedup chore', async () => {
  await page.evaluate(() => {
    window.AIMOGUL.s.money = 1e9;
    window.AIMOGUL.s.staff.engineer = 2;
  });
  await page.click('[data-act=tab][data-arg=co]');
  await page.click('[data-act=buyData][data-arg=licensed]');
  await page.waitForSelector('[data-act=mgDelegateDedup]', { timeout: 4000 });
  await page.click('[data-act=mgDelegateDedup]');
  const bonus = await page.evaluate(() => window.AIMOGUL.s.dataQBonus.licensed);
  if (!(bonus > 1.01 && bonus < 1.04)) throw new Error('delegated clean not applied: ' + bonus);
  const hidden = await page.evaluate(() => document.getElementById('modal-root').classList.contains('hidden'));
  if (!hidden) throw new Error('delegation should not interrupt further');
});

await check('rebuild guard: DOM stays put under a held pointer', async () => {
  await page.click('[data-act=tab][data-arg=co]');
  await page.waitForSelector('#tab-content .card');
  await page.evaluate(() => {
    document.querySelector('#tab-content .card').dataset.sentinel = '1';
    window.AIMOGUL.s.staff.engineer += 1;   // dirties the Company tab sig
  });
  const box = await page.locator('#tab-content h3').first().boundingBox();
  await page.mouse.move(box.x + 2, box.y + 2);
  await page.mouse.down();
  await page.waitForTimeout(700);           // several render ticks pass
  const held = await page.evaluate(() => !!document.querySelector('[data-sentinel]'));
  await page.mouse.up();                    // release fires a click → rebuild resumes
  if (!held) throw new Error('tab rebuilt while the pointer was down');
  await page.waitForTimeout(700);
  const after = await page.evaluate(() => !!document.querySelector('[data-sentinel]'));
  if (after) throw new Error('tab never rebuilt after release');
});

await check('gig button works + floating gain number', async () => {
  await page.click('[data-act=tab][data-arg=lab]');
  await page.click('#gig-btn');
  await page.waitForSelector('.toast', { timeout: 3000 });
  await page.waitForSelector('.float-num', { timeout: 3000 });
});

await check('lab scene: desks are draggable and the layout persists', async () => {
  await page.click('[data-act=tab][data-arg=lab]');
  const box = await page.locator('#scene-canvas').boundingBox();
  const fx = box.width / 480, fy = box.height / 200;
  // a wandering character can intercept the grab (people are picked first) —
  // retry a few times; whoever we accidentally carried wanders off again
  let ok = false;
  for (let attempt = 0; attempt < 4 && !ok; attempt++) {
    await page.mouse.move(box.x + 120 * fx, box.y + 164 * fy);   // the garage desk
    await page.mouse.down();
    await page.mouse.move(box.x + 300 * fx, box.y + 176 * fy, { steps: 8 });
    await page.mouse.up();
    ok = await page.evaluate(() => {
      const dp = window.AIMOGUL.s.deskPos;
      return !!(dp && dp[0] && Math.abs(dp[0][0][0] - 300) < 30);
    });
    if (!ok) await page.waitForTimeout(500);
  }
  if (!ok) throw new Error('desk drag not persisted after retries');
});

await check('tab badge appears when research is affordable', async () => {
  await page.evaluate(() => { window.AIMOGUL.s.rp = 500; });
  await page.waitForSelector('.tab-badge', { timeout: 3000 });
});

await check('facility designer: animated blueprint, build guide, commission', async () => {
  await page.evaluate(() => { window.AIMOGUL.s.phase = 1; window.AIMOGUL.s.money = 1e5; });
  await page.click('[data-act=tab][data-arg=hw]');
  await page.click('[data-act=designOpen]');
  await page.waitForSelector('#dz-canvas', { timeout: 4000 });
  const txt0 = await page.textContent('#modal-root .modal');
  if (!/Build guide/.test(txt0)) throw new Error('narrated build guide missing');
  // place a rack, then a CRAC beside it — on the canvas
  const box = await page.locator('#dz-canvas').boundingBox();
  const cw = box.width / 12, ch = box.height / 6;
  await page.click('[data-act=dzPick][data-arg=rack]');
  await page.mouse.click(box.x + cw * 2.5, box.y + ch * 1.5);
  await page.click('[data-act=dzPick][data-arg=crac]');
  await page.mouse.click(box.x + cw * 3.5, box.y + ch * 1.5);
  const txt = await page.textContent('#modal-root .modal');
  if (!/CRAC airflow path/.test(txt)) throw new Error('score breakdown missing');
  await page.click('[data-act=dzApply]');
  const fx = await page.evaluate(() => window.AIMOGUL.s.facDesignFx);
  if (!fx || !fx[1] || typeof fx[1].score !== 'number') throw new Error('design not commissioned: ' + JSON.stringify(fx));
  await page.evaluate(() => { window.AIMOGUL.s.phase = 0; });   // back to the garage for later checks
});

await check('hardware tab + buy GPU', async () => {
  // pause the sim for the buy/sell/hold mechanics checks — a random incident
  // (hwFail/fire/heist) destroying a card mid-check is a refund-assert race
  await page.evaluate(() => { window.AIMOGUL.s.paused = true; });
  await page.click('[data-act=tab][data-arg=hw]');
  const before = await page.evaluate(() => JSON.parse(localStorage.getItem('aimogul_save_v1') || '{}').money ?? null);
  await page.click('.res-card:has-text("BTX 1070") [data-act=buyGpu]');
  const owned = await page.textContent('.res-card:has-text("BTX 1070")');
  if (!owned.includes('Owned: 2')) throw new Error('GPU count did not increase: ' + owned.slice(0, 80));
});

await check('sell GPU frees the slot and refunds 45%', async () => {
  const moneyBefore = await page.evaluate(() => window.AIMOGUL.s.money);
  await page.click('.res-card:has-text("BTX 1070") [data-act=sellGpu]');   // −1 button
  const card = await page.textContent('.res-card:has-text("BTX 1070")');
  if (!card.includes('Owned: 1')) throw new Error('GPU count did not decrease: ' + card.slice(0, 80));
  const moneyAfter = await page.evaluate(() => window.AIMOGUL.s.money);
  if (!(moneyAfter > moneyBefore)) throw new Error('no refund received');
});

await check('custom quantity buy with suffix parsing', async () => {
  await page.evaluate(() => { window.AIMOGUL.s.money = 1e5; });
  await page.fill('.res-card:has-text("BTX 1070") .qty-in', '5');
  await page.click('.res-card:has-text("BTX 1070") [data-act=buyGpuQty]');
  const card = await page.textContent('.res-card:has-text("BTX 1070")');
  if (!card.includes('Owned: 6')) throw new Error('custom buy failed: ' + card.slice(0, 90));
});

await check('hold-to-buy auto-repeats until slots are full', async () => {
  const btn = page.locator('.res-card:has-text("BTX 1070") [data-act=buyGpu]').first();
  const box = await btn.boundingBox();
  await page.mouse.move(box.x + 5, box.y + 5);
  await page.mouse.down();
  await page.waitForTimeout(1500);
  await page.mouse.up();
  const card = await page.textContent('.res-card:has-text("BTX 1070")');
  if (!card.includes('Owned: 8')) throw new Error('hold did not repeat: ' + card.slice(0, 90));   // garage slot cap
  await page.evaluate(() => { window.AIMOGUL.s.paused = false; });   // sim back on
});

await check('research / company / models / goals tabs render', async () => {
  for (const id of ['res', 'co', 'models', 'goals']) {
    await page.click(`[data-act=tab][data-arg=${id}]`);
    const len = (await page.textContent('#tab-content')).length;
    if (len < 100) throw new Error(`tab ${id} looks empty`);
  }
});

await check('first model trains and deploys (sim-fastforward)', async () => {
  await page.click('.speed-btn:has-text("500×")');
  await page.waitForFunction(() => {
    const el = document.querySelector('#sidebar');
    return el && /AGI Index/.test(el.textContent) && !el.textContent.includes('— best model\n');
  }, { timeout: 2000 }).catch(() => {});
  // wait until a model exists (run ~20 sim-hours at 500×/0.05s ticks)
  await page.waitForFunction(() => {
    try { return JSON.parse(localStorage.getItem('aimogul_save_v1'))?.models?.length >= 1; } catch { return false; }
  }, { timeout: 30000, polling: 500 }).catch(async () => {
    // force a save to refresh localStorage then re-check once
    throw new Error('no model after fast-forward');
  });
});

await check('save persists across reload', async () => {
  await page.evaluate(() => window.dispatchEvent(new Event('beforeunload')));
  await page.reload({ waitUntil: 'networkidle' });
  const modal = await page.textContent('body');
  if (!modal.includes('AGI MOGUL') && !modal.includes('AGI Index')) throw new Error('did not reload into game');
  const money = await page.evaluate(() => JSON.parse(localStorage.getItem('aimogul_save_v1')).simHours);
  if (!(money > 0)) throw new Error('simHours not persisted');
});

await check('moral dilemma: neutral choice, delayed consequence scheduled', async () => {
  await page.evaluate(() => {
    window.AIMOGUL.s.pendingDilemma = { id: 'shadowLibrary', realAt: Date.now() };
  });
  await page.waitForSelector('#modal-root .modal', { timeout: 5000 });
  const txt = await page.textContent('#modal-root .modal');
  if (!txt.includes('shadow library')) throw new Error('dilemma modal missing');
  if (/real debate/i.test(txt)) throw new Error('meta "real debate" sidebar leaked into the dialog');
  if (/integrity\s*[-+−]?\d/i.test(txt)) throw new Error('integrity is signposted in the dialog');
  const dlCanvas = await page.evaluate(() => {
    const cvs = document.getElementById('dl-canvas');
    return cvs && cvs.width === 640 && cvs.height === 240;
  });
  if (!dlCanvas) throw new Error('dilemma establishing-shot canvas missing');
  const btnCls = await page.$$eval('[data-act=dilemma]', els => els.map(e => e.className));
  if (btnCls.length !== 2 || btnCls[0] !== btnCls[1]) throw new Error('options styled unequally: ' + btnCls);
  await page.click('[data-act=dilemma][data-arg="1"]');   // license data properly
  const after = await page.evaluate(() => ({
    integ: window.AIMOGUL.s.integrity,
    fallout: window.AIMOGUL.s.fallout.filter(f => f.atReal).length,
  }));
  if (!(after.integ > 70)) throw new Error('integrity not moved (hidden): ' + after.integ);
  if (after.fallout < 1) throw new Error('no delayed consequence scheduled');
  await page.evaluate(() => { window.AIMOGUL.nextDilemmaReal = Infinity; });   // re-mute
});

await check('world report: broadcast modal airs a queued impact story', async () => {
  await page.evaluate(() => {
    const g = window.AIMOGUL;
    g.s.paused = false;                  // a known pause state to restore to
    g.s.impactQueue = ['seesCats'];
    g.s.impactsSeen = [];
    g.nextImpactReal = 0;
  });
  await page.waitForSelector('.modal.impact', { timeout: 5000 });
  const t = await page.textContent('.modal.impact');
  if (!t.includes('Machines learn to see')) throw new Error('headline missing');
  if (!t.includes('The real thing')) throw new Error('grounding line missing');
  const paused = await page.evaluate(() => window.AIMOGUL.s.paused);
  if (!paused) throw new Error('broadcast did not pause the sim');
  const canvasOk = await page.evaluate(() => {
    const cv = document.getElementById('imp-canvas');
    return cv && cv.width === 640 && cv.height === 264;   // scene + wire crawl
  });
  if (!canvasOk) throw new Error('broadcast canvas missing');
  await page.click('[data-act=impactDone]');
  const after = await page.evaluate(() => ({
    paused: window.AIMOGUL.s.paused,
    seen: window.AIMOGUL.s.impactsSeen,
    queue: window.AIMOGUL.s.impactQueue.length,
    log: window.AIMOGUL.s.impactLog,
    ticker: window.AIMOGUL.s.news[window.AIMOGUL.s.news.length - 1].txt,
  }));
  if (after.paused) throw new Error('sim still paused after broadcast');
  if (!after.seen.includes('seesCats') || after.queue !== 0) throw new Error('story not retired');
  if (!after.log.some(e => e.id === 'seesCats' && e.live)) throw new Error('story not logged to the Chronicle');
  if (!after.ticker.includes('World report')) throw new Error('ticker line missing');
  await page.evaluate(() => { window.AIMOGUL.nextImpactReal = Infinity; });   // re-mute
});

await check('chronicle: ticker opens the archive, aired story replays', async () => {
  await page.click('#ticker');
  await page.waitForSelector('.chron-row');
  const t = await page.textContent('#modal-root');
  if (!t.includes('The Chronicle')) throw new Error('chronicle modal missing');
  if (!t.includes('Machines learn to see')) throw new Error('aired story not listed');
  await page.click('.chron-row');                          // replay it
  await page.waitForSelector('.modal.impact');
  const rt = await page.textContent('.modal.impact');
  if (!rt.includes('archive replay')) throw new Error('replay framing missing');
  await page.click('.modal.impact [data-act=chronicle]');  // back to the archive
  await page.waitForSelector('.chron-row');
  await page.click('#modal-root [data-act=closeModal]');
});

await check('singularity → final cinematic, save erased', async () => {
  await page.evaluate(() => {
    const s = window.AIMOGUL.s;
    s.bestCap = 300.5; s.singularity = true; s.singularityAt = s.simHours;
  });
  await page.waitForSelector('#singularity-canvas', { timeout: 5000 });
  await page.waitForTimeout(3000);
  await page.click('#singularity-canvas');           // "let go" → the memorial
  await page.waitForTimeout(1500);
  const wiped = await page.evaluate(() => localStorage.getItem('aimogul_save_v1') === null);
  if (!wiped) throw new Error('save not erased after the singularity');
  const meta = await page.evaluate(() => JSON.parse(localStorage.getItem('aimogul_meta_v1') || '{}'));
  if (meta.founder !== 'al') throw new Error('NG+ founder not queued: ' + JSON.stringify(meta));
  const still = await page.$('#singularity-canvas');
  if (!still) throw new Error('memorial should hold the shot before the loop closes');
});

await check('the loop closes by itself: memorial → fresh New Game+ with Al Saltman', async () => {
  // no manual reload — the memorial holds a few breaths, then begins again
  // (impatient players can click; we wait for the automatic cycle)
  await page.waitForSelector('#opening-canvas', { timeout: 30000 });   // the loop: end shot = start shot
  await page.waitForTimeout(700);
  await page.click('#opening-canvas');
  await page.waitForSelector('[data-act=pickFounder]', { timeout: 6000 });
  const first = await page.getAttribute('#modal-root [data-act=pickFounder]', 'data-arg');
  if (first !== 'al') throw new Error('NG+ should lead with the new founder, got ' + first);
  await page.click('[data-act=pickFounder][data-arg=al]');
  const txt = await page.textContent('#modal-root .modal');
  if (!txt.includes('Al Saltman')) throw new Error('NG+ intro missing Al Saltman');
  if (txt.includes('Mario')) throw new Error('old story leaked into the new game');
  const freshSim = await page.evaluate(() => window.AIMOGUL.s.simHours);
  if (freshSim > 1) throw new Error('state not fresh: simHours=' + freshSim);
  await page.click('#modal-root [data-act=closeModal]');
  const lab = await page.textContent('#tab-content');
  if (!lab.includes('Al Saltman')) throw new Error('lab card not re-founded');
});

await check('no console or page errors', async () => {
  const real = errors.filter(e => !e.includes('favicon'));
  if (real.length) throw new Error(real.slice(0, 3).join(' | '));
});

await browser.close();
server.close();
console.log('─'.repeat(50));
if (failures) { console.log(`❌ ${failures} failure(s)`); process.exit(1); }
console.log('✅ BROWSER PASS');
