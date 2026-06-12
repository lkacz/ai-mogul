// Minigames: short skill games at key moments, each teaching a real ML/infra
// concept. The world pauses while you play. Rewards are modest and capped.

import { game, showModal, closeModal, toast, esc, renderAll } from './ui.js';
import { drawQuip } from './scene.js';
import { pushNews, restoreOutage } from '../core/engine.js';
import { RESEARCH_BY_ID } from '../core/research.js';
import { clamp } from '../core/util.js';

let prevPaused = false;
function pauseWorld() { prevPaused = game.s.paused; game.s.paused = true; }
function resumeWorld() { game.s.paused = prevPaused; renderAll(); }

// per-game dynamic handlers — mgHandlers exposes stable wrappers around these
const dyn = {};

function lessonBox(txt) {
  return `<div style="margin-top:10px; padding:8px 10px; background:#10202b; border:1px solid #1d4456; border-radius:8px" class="small">📚 <b>The real thing:</b> ${txt}</div>`;
}

// stop a game's rAF loop when its canvas leaves the DOM
const alive = (cv) => cv && cv.isConnected;

// ── Delegation: the relief ladder ─────────────────────────────────
// Every chore starts as the founder's job. A small team can take it over
// when you ask; a full team handles it without asking; past AGI the models
// do it themselves and the humans become optional — that's the arc.
// Playing it yourself still scores highest (delegates are good, not perfect).
function crewFor(kind) {
  const s = game.s;
  if ((s.bestCap || 0) >= 100) return { score: 0.85, who: 'the models', auto: true };
  const n = kind === 'dedup' ? s.staff.engineer : s.staff.researcher;
  const team = kind === 'dedup' ? 'the data crew' : 'the research team';
  if (n >= 4) return { score: Math.min(0.75, 0.5 + 0.05 * n), who: team, auto: true };
  if (n >= 2) return { score: 0.6, who: team, auto: false };
  return null;
}
const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);

function applyLrScore(runId, score, who) {
  const s = game.s;
  const run = s.runs.find(r => String(r.id) === String(runId));
  if (run) run.lrBonus = 1 + 0.12 * score;
  toast(`🎚️ ${capFirst(who)} tuned the schedule: +${(12 * score).toFixed(1)}% effective compute.`);
}
function applyDedupScore(dsId, score, who) {
  const s = game.s;
  if (!s.dataQBonus) s.dataQBonus = {};
  s.dataQBonus[dsId] = Math.max(s.dataQBonus[dsId] || 1, 1 + 0.04 * score);
  toast(`🧹 ${capFirst(who)} cleaned the corpus: +${(4 * score).toFixed(1)}% quality.`);
}

// ══════════════════════════════════════════════════════════════════
// 1. LEARNING-RATE RIDER — offered when launching a frontier run.
//    Ride the LR just under the (moving) stability ceiling:
//    warmup → high cruise → decay. Score boosts the run's effective compute.
// ══════════════════════════════════════════════════════════════════
export function offerLrGame(runId) {
  const crew = crewFor('lr');
  if (crew && crew.auto) {
    // a full team (or the models) just handles it — no interruption at all
    applyLrScore(runId, crew.score, crew.who);
    return;
  }
  pauseWorld();
  showModal(`<h2>🎚️ Babysit the launch?</h2>
    <p>The job is queued. Tune the <b>learning rate</b> live for the first steps —
    a clean warmup and decay gives this run up to <b class="gold">+12% effective compute</b>.</p>
    ${lessonBox('Real training uses LR <i>schedules</i>: linear warmup, long cruise, then decay. Too high and the loss diverges to NaN; too low and you waste the cluster.')}
    <div class="actions">
      <button class="act sub" data-act="mgSkipLr">Let it ride (skip)</button>
      ${crew ? `<button class="act" data-act="mgDelegateLr" data-arg="${runId}">🤝 Hand it to ${crew.who} (+${(12 * crew.score).toFixed(0)}%)</button>` : ''}
      <button class="act big" data-act="mgPlayLr" data-arg="${runId}">🎮 Tune it</button>
    </div>
    ${crew ? '' : '<p class="faint" style="margin-top:8px">Two researchers on payroll would handle launches for you.</p>'}`);
}

export function playLr(runId) {
  const T = 22;
  showModal(`<h2>🎚️ Learning-Rate Rider</h2>
    <p class="muted small">Move the mouse <b>up/down</b> over the chart to set LR. Stay just <b>below the red stability ceiling</b> — it rises after warmup, then sinks. Get the loss low before time runs out!</p>
    <canvas id="mg-lr" width="560" height="260" style="width:100%; border-radius:8px; background:#0a0d14; cursor:ns-resize"></canvas>
    <div class="row" style="justify-content:space-between; margin-top:6px">
      <span class="num" id="mg-lr-stat"></span><span class="num gold" id="mg-lr-time"></span>
    </div>`);
  const cv = document.getElementById('mg-lr');
  const ctx = cv.getContext('2d');
  const W = cv.width, Hc = cv.height;
  const LR_MIN = 1e-4, LR_MAX = 3e-2;
  let lr = 3e-4, L = 6.0, t = 0, last = performance.now() / 1000;
  let diverged = false, minL = L;
  const hist = [];

  cv.addEventListener('mousemove', (e) => {
    const r = cv.getBoundingClientRect();
    const fy = 1 - clamp((e.clientY - r.top) / r.height, 0, 1);
    lr = LR_MIN * Math.pow(LR_MAX / LR_MIN, fy);
  });
  cv.addEventListener('touchmove', (e) => {
    const r = cv.getBoundingClientRect();
    const fy = 1 - clamp((e.touches[0].clientY - r.top) / r.height, 0, 1);
    lr = LR_MIN * Math.pow(LR_MAX / LR_MIN, fy);
    e.preventDefault();
  }, { passive: false });

  // every run has its own stability profile (it really does vary by model/data)
  const warmT = 4 + Math.random() * 3;            // warmup length 4–7 s
  const peak = 0.009 + Math.random() * 0.006;     // ceiling peak
  const decayFrac = 0.7 + Math.random() * 0.15;   // how far it sinks
  const wobF = 1.2 + Math.random() * 1.6, wobA = 0.05 + Math.random() * 0.05;
  const thr = (tt) => {
    const base = tt < warmT
      ? 0.0018 + (tt / warmT) * (peak - 0.0018)        // warmup: ceiling rises
      : peak * (1 - decayFrac * (tt - warmT) / (T - warmT)); // then it decays
    return base * (1 + wobA * Math.sin(tt * wobF));    // turbulence
  };

  const lrY = (v) => Hc - (Math.log(v / LR_MIN) / Math.log(LR_MAX / LR_MIN)) * Hc;

  function frame() {
    if (!alive(cv)) return;
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last); last = now;
    if (t < T && !diverged) {
      t += dt;
      const ceiling = thr(t);
      if (lr > ceiling) {
        L += (lr / ceiling - 1) * 7 * dt;          // instability spike
        if (L > 9) { diverged = true; L = 9; }
      } else {
        L -= (L - 0.9) * lr * 52 * dt;             // healthy descent ∝ LR
      }
      L = clamp(L, 0.9, 9);
      minL = Math.min(minL, L);
      hist.push({ t, L, lr, ceil: ceiling });
    }
    // draw
    ctx.clearRect(0, 0, W, Hc);
    ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 0, W, Hc);
    // unstable region above the ceiling, current LR cursor below
    const ceilNow = thr(Math.min(t, T));
    ctx.fillStyle = 'rgba(248,113,113,.13)';
    ctx.fillRect(0, 0, W, lrY(ceilNow));
    ctx.strokeStyle = '#f87171'; ctx.setLineDash([6, 4]);
    ctx.beginPath(); ctx.moveTo(0, lrY(ceilNow)); ctx.lineTo(W, lrY(ceilNow)); ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = '#f87171'; ctx.font = '11px monospace';
    ctx.fillText('stability ceiling', 8, lrY(ceilNow) - 5);
    // LR cursor line
    ctx.strokeStyle = '#22d3ee';
    ctx.beginPath(); ctx.moveTo(0, lrY(lr)); ctx.lineTo(W, lrY(lr)); ctx.stroke();
    ctx.fillStyle = '#22d3ee';
    ctx.fillText('your LR ' + lr.toExponential(1), W - 150, lrY(lr) - 5);
    // loss curve history (low loss sinks toward the bottom, like a real loss plot)
    ctx.strokeStyle = '#34d399'; ctx.lineWidth = 2; ctx.beginPath();
    for (let i = 0; i < hist.length; i++) {
      const x = (hist[i].t / T) * W;
      const y = Hc - 16 - ((9 - hist[i].L) / 8.1) * (Hc - 60);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke(); ctx.lineWidth = 1;
    ctx.fillStyle = '#34d399'; ctx.font = '11px monospace';
    ctx.fillText('loss', 8, Hc - 8);
    if (diverged) {
      ctx.fillStyle = '#f87171'; ctx.font = 'bold 26px monospace';
      ctx.fillText('loss = NaN 💥', W / 2 - 90, Hc / 2);
    }
    const statEl = document.getElementById('mg-lr-stat');
    if (statEl) statEl.textContent = `loss ${L.toFixed(2)}  ·  LR ${lr.toExponential(1)}`;
    const timeEl = document.getElementById('mg-lr-time');
    if (timeEl) timeEl.textContent = t < T && !diverged ? `${(T - t).toFixed(0)}s` : 'done';

    if (t >= T || diverged) { finish(); return; }
    requestAnimationFrame(frame);
  }

  function finish() {
    const score = diverged ? clamp((6 - minL) / (6 - 1.35) * 0.4, 0, 0.4)
      : clamp((6 - L) / (6 - 1.35), 0, 1);
    const s = game.s;
    const run = s.runs.find(r => r.id === runId);
    if (run) run.lrBonus = 1 + 0.12 * score;
    s.stats.lrBest = Math.max(s.stats.lrBest || 0, score);
    s.stats.minigames = (s.stats.minigames || 0) + 1;
    const pct = Math.round(score * 100);
    setTimeout(() => {
      showModal(`<h2>${diverged ? '💥 Diverged!' : pct >= 80 ? '🏆 Beautiful schedule!' : pct >= 45 ? '👍 Solid run' : '😬 It… converged. Technically.'}</h2>
        <p>Schedule quality: <b class="gold">${pct}%</b> → this run gets <b>+${(12 * score).toFixed(1)}% effective compute</b>.</p>
        ${diverged ? '<p class="muted">The loss hit NaN — you rode over the ceiling. Warmup exists for a reason!</p>' : ''}
        ${lessonBox('The stable-LR ceiling really does move: low at init (hence <i>warmup</i>), high mid-training, lower again near convergence (hence <i>cosine decay</i>).')}
        <div class="actions"><button class="act big" data-act="mgClose">Back to the lab</button></div>`);
      toast(`🎚️ LR tuned: +${(12 * score).toFixed(1)}% effective compute on this run.`);
    }, diverged ? 900 : 100);
  }
  requestAnimationFrame(frame);
}

// ══════════════════════════════════════════════════════════════════
// 2. DEDUP FRENZY — offered on dataset acquisition.
//    Zap junk documents before they hit the corpus; spare the good ones.
// ══════════════════════════════════════════════════════════════════
// Every category here is a real thing data teams keep or filter.
const GOOD_DOCS = [
  '📖 Encyclopedia article', '📚 Public-domain novel', '📄 arHive preprint', '🧑‍🍳 Cookbook',
  '💻 Code w/ tests', '✒️ Poetry anthology', '🗞️ Quality journalism',
  '🎓 Open textbook', '🧮 Olympiad solutions', '⚖️ Court opinions',
  '📜 Patent filings', '🐦 Field guide to birds', '🍄 Mushroom encyclopedia',
  '🗣️ Lecture transcripts', '📊 Census statistics', '🔧 API documentation',
  '💬 Stack Overflow (accepted)', '🧬 Peer-reviewed study', '♟️ Annotated chess games',
  '🏛️ Historical archives', '🌍 Translated classics', '📓 Lab notebooks',
  '🐧 Kernel driver (commented)', '📕 Dictionary entries', '🎼 Music theory text',
];
const BAD_DOCS = [
  '♻️ DUPLICATE ×412', '🗑️ SEO spam', '🎰 Casino ads', '🔒 PII: phone numbers',
  '🤖 Model-generated slop', '📋 Lorem ipsum…', '😡 ALL-CAPS RANT',
  '🔒 PII: home addresses', '🆔 Leaked SSN list', '♻️ DUPLICATE ×9000',
  '🧪 GSM8K test set (leak!)', '💊 Pharma spam', '🪙 Crypto pump group',
  '🤖 “As an AI language model…”', '🔣 Mojibake: Ã¢â‚¬â„¢', '🧱 Broken HTML soup',
  '🔑 keyword keyword keyword', '🖱️ “Click here to continue”', '🚫 404 error pages',
  '🌐 Auto-translated gibberish', '🔗 Affiliate listicle', '🔮 Horoscope farm',
  '📦 Base64 blob', '🍪 Cookie banner text', '🤳 MLM recruitment pitch',
  '🗯️ Flame-war thread', '🤖 CAPTCHA fragments', '📄 robots.txt',
];

export function offerDedup(dsId, dsName) {
  const crew = crewFor('dedup');
  if (crew && crew.auto) {
    // the pipeline team (or the models) cleans every corpus that lands
    applyDedupScore(dsId, crew.score, crew.who);
    return;
  }
  pauseWorld();
  showModal(`<h2>🧹 Clean the new corpus?</h2>
    <p><b>${esc(dsName)}</b> just arrived — raw. Filter the junk yourself for a permanent
    <b class="gold">up to +4% data quality</b> on this dataset.</p>
    ${lessonBox('Deduplication and filtering measurably improve LLMs — duplicated text wastes compute and causes memorization. Garbage in, garbage out is an empirical law.')}
    <div class="actions">
      <button class="act sub" data-act="mgSkipDedup">Ship it raw (skip)</button>
      ${crew ? `<button class="act" data-act="mgDelegateDedup" data-arg="${dsId}">🤝 Hand it to ${crew.who} (+${(4 * crew.score).toFixed(1)}%)</button>` : ''}
      <button class="act big" data-act="mgPlayDedup" data-arg="${dsId}">🎮 Clean it</button>
    </div>
    ${crew ? '' : '<p class="faint" style="margin-top:8px">Two engineers on payroll would clean corpora for you.</p>'}`);
}

export function playDedup(dsId) {
  const T = 25;
  showModal(`<h2>🧹 Dedup Frenzy</h2>
    <p class="muted small"><b>Click the junk</b> (spam, duplicates, PII) before it reaches the corpus.
    Don't click the good data — that's how you delete Shakespeare.</p>
    <canvas id="mg-dd" width="560" height="300" style="width:100%; border-radius:8px; background:#0a0d14; cursor:crosshair"></canvas>
    <div class="row" style="justify-content:space-between; margin-top:6px">
      <span class="num" id="mg-dd-score"></span><span class="num gold" id="mg-dd-time"></span>
    </div>`);
  const cv = document.getElementById('mg-dd');
  const ctx = cv.getContext('2d');
  const W = cv.width, Hc = cv.height;
  let t = 0, last = performance.now() / 1000, spawnIn = 0.4;
  let pts = 0, maxPts = 0, fx = [];
  const cards = [];

  cv.addEventListener('pointerdown', (e) => {
    const r = cv.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * Hc;
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i];
      if (mx >= c.x && mx <= c.x + 150 && my >= c.y && my <= c.y + 26) {
        cards.splice(i, 1);
        if (c.bad) { pts += 10; fx.push({ x: mx, y: my, txt: '+10 zap!', c: '#34d399', life: 0.8 }); }
        else { pts -= 15; fx.push({ x: mx, y: my, txt: '-15 that was good data!', c: '#f87171', life: 1.2 }); }
        return;
      }
    }
  });

  function frame() {
    if (!alive(cv)) return;
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last); last = now;
    t += dt;
    spawnIn -= dt;
    if (spawnIn <= 0 && t < T) {
      spawnIn = Math.max(0.42, 0.95 - t * 0.022);
      const bad = Math.random() < 0.55;
      if (bad) maxPts += 10;
      cards.push({
        x: 10 + Math.random() * (W - 170), y: -26, bad,
        label: bad ? BAD_DOCS[(Math.random() * BAD_DOCS.length) | 0] : GOOD_DOCS[(Math.random() * GOOD_DOCS.length) | 0],
        v: 42 + t * 2.4 + Math.random() * 18,
      });
    }
    for (let i = cards.length - 1; i >= 0; i--) {
      const c = cards[i];
      c.y += c.v * dt;
      if (c.y > Hc - 30) {
        cards.splice(i, 1);
        if (c.bad) { pts -= 6; fx.push({ x: c.x + 60, y: Hc - 36, txt: 'junk in the corpus! -6', c: '#fbbf24', life: 1 }); }
      }
    }
    // draw
    ctx.clearRect(0, 0, W, Hc);
    ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 0, W, Hc);
    ctx.fillStyle = '#123b2a'; ctx.fillRect(0, Hc - 24, W, 24);
    ctx.fillStyle = '#34d399'; ctx.font = '12px monospace';
    ctx.fillText('→ THE CORPUS (only good tokens, please)', 12, Hc - 8);
    ctx.font = '12px "Segoe UI", sans-serif';
    for (const c of cards) {
      ctx.fillStyle = c.bad ? '#2a1c20' : '#16222e';
      ctx.strokeStyle = c.bad ? '#7a3a44' : '#2b4b66';
      ctx.beginPath(); ctx.roundRect(c.x, c.y, 150, 26, 5); ctx.fill(); ctx.stroke();
      ctx.fillStyle = '#d6dce8';
      ctx.fillText(c.label, c.x + 8, c.y + 17);
    }
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i]; f.life -= dt; f.y -= 22 * dt;
      if (f.life <= 0) { fx.splice(i, 1); continue; }
      ctx.fillStyle = f.c; ctx.fillText(f.txt, f.x, f.y);
    }
    const sc = document.getElementById('mg-dd-score');
    if (sc) sc.textContent = `score ${pts}`;
    const tm = document.getElementById('mg-dd-time');
    if (tm) tm.textContent = t < T ? `${(T - t).toFixed(0)}s` : 'done';
    if (t >= T && cards.length === 0) { finish(); return; }
    requestAnimationFrame(frame);
  }

  function finish() {
    const score = maxPts > 0 ? clamp(pts / maxPts, 0, 1) : 0;
    const s = game.s;
    if (!s.dataQBonus) s.dataQBonus = {};
    s.dataQBonus[dsId] = Math.max(s.dataQBonus[dsId] || 1, 1 + 0.04 * score);
    s.stats.dedupBest = Math.max(s.stats.dedupBest || 0, score);
    s.stats.minigames = (s.stats.minigames || 0) + 1;
    const pct = Math.round(score * 100);
    showModal(`<h2>${pct >= 80 ? '🏆 Pristine corpus!' : pct >= 45 ? '🧹 Respectably clean' : '😬 The spam got through'}</h2>
      <p>Cleaning quality: <b class="gold">${pct}%</b> → this dataset permanently gains
      <b>+${(4 * score).toFixed(1)}% quality</b>.</p>
      ${lessonBox('Modern pipelines do exactly this at scale: MinHash dedup, classifier-based quality filters, PII scrubbing. Data work is unglamorous and decisive.')}
      <div class="actions"><button class="act big" data-act="mgClose">Back to the lab</button></div>`);
    toast(`🧹 Dataset cleaned: +${(4 * score).toFixed(1)}% quality.`);
  }
  requestAnimationFrame(frame);
}

// ══════════════════════════════════════════════════════════════════
// 3. NODE HUNT — offered when an outage strikes. Bisect 16 nodes with
//    5 diagnostics to find the straggler and win back lost progress.
// ══════════════════════════════════════════════════════════════════
export function offerNodeHunt(incident) {
  pauseWorld();
  const paged = game.s.stats.pagerPages || 0;
  showModal(`<h2>📟 3:07 AM — pager goes off</h2>
    <p>The all-reduce is hanging: <b>one of 16 nodes</b> is bad and the run lost
    <b class="bad">${incident.lostH}h of progress</b>. Find the node with
    <b>5 diagnostics</b> and you claw back <b class="gold">90% of it</b> (plus RP for the postmortem).</p>
    ${lessonBox('One straggler GPU stalls a whole synchronous training job. Real SREs bisect node ranges exactly like this — binary search finds 1 of 16 in 4 tests.')}
    ${paged >= 2 ? '<p class="muted small">😮‍💨 Tired of carrying the pager? Hire an <b>ops rotation (3+ Infra/DC Ops)</b> on the Company tab — they\'ll bisect future incidents themselves and save most of the progress.</p>' : ''}
    <div class="actions">
      <button class="act sub" data-act="mgSkipNode">Eat the loss (skip)</button>
      <button class="act big" data-act="mgPlayNode" data-arg="${incident.lostH}">🎮 Page me in</button>
    </div>`);
}

// Real ways a single node ruins everyone's night.
const NODE_FAULTS = [
  'ECC errors on one HBM stack',
  'a flaky interconnect link retraining itself in a loop',
  'a PCIe link silently degraded to x1',
  'a dying fan — the GPU thermal-throttles to a crawl',
  'a bad optical transceiver dropping packets',
  'one DIMM throwing correctable errors by the thousand',
  'a firmware mismatch from a half-finished update',
  'a single GPU stuck at idle clocks after a driver hiccup',
  'a loose power cable browning out under load',
];
const NODE_LOGS = [
  'NCCL WARN: watchdog timeout… somewhere.',
  'allreduce ring stalled — straggler suspected.',
  'step time jumped 40× and nobody changed anything. Sure.',
  'gradient sync at 3% throughput. One node is lying.',
  'collective op hung; the dashboard is a wall of yellow.',
  'heartbeats green, throughput zero. Classic.',
  'sixteen nodes, fifteen alibis.',
  'the run is "making progress" the way glaciers do.',
];

export function playNodeHunt(lostH) {
  const faulty = (Math.random() * 16) | 0;
  const fault = drawQuip(NODE_FAULTS);
  const firstLog = drawQuip(NODE_LOGS);
  let tests = 5;
  let selA = -1, selB = -1;
  const cleared = new Set();

  function nodeBtns() {
    let h = '';
    for (let i = 0; i < 16; i++) {
      const inSel = selA >= 0 && i >= Math.min(selA, selB < 0 ? selA : selB) && i <= Math.max(selA, selB < 0 ? selA : selB);
      h += `<button class="act ${cleared.has(i) ? 'sub' : ''}" data-act="mgNodePick" data-arg="${i}"
        style="width:54px; ${inSel ? 'outline:2px solid var(--accent2);' : ''} ${cleared.has(i) ? 'opacity:.35' : ''}">n${String(i).padStart(2, '0')}</button>`;
    }
    return h;
  }
  function render(msg) {
    showModal(`<h2>📟 Node Hunt — ${tests} diagnostics left</h2>
      <p class="muted small">Click <b>two nodes</b> to select a range, then run the diagnostic.
      When you're sure, select a <b>single node</b> and replace it. One shot at the replacement!</p>
      <div style="display:flex; flex-wrap:wrap; gap:5px; margin:10px 0">${nodeBtns()}</div>
      <div class="small" id="mg-node-msg" style="min-height:34px; color:var(--accent2)">${msg || firstLog}</div>
      <div class="actions" style="justify-content:flex-start">
        <button class="act" data-act="mgNodeTest" ${selA < 0 || tests <= 0 ? 'disabled' : ''}>🔬 Run diagnostic on range</button>
        <button class="act gold" data-act="mgNodeReplace" ${selA >= 0 && (selB < 0 || selB === selA) ? '' : 'disabled'}>🔧 Replace selected node</button>
      </div>`);
  }

  dyn.mgNodePick = (arg) => {
    const i = +arg;
    if (selA < 0 || (selA >= 0 && selB >= 0)) { selA = i; selB = -1; }
    else selB = i;
    render();
  };
  dyn.mgNodeTest = () => {
    if (tests <= 0 || selA < 0) return;
    tests--;
    const lo = Math.min(selA, selB < 0 ? selA : selB), hi = Math.max(selA, selB < 0 ? selA : selB);
    const inRange = faulty >= lo && faulty <= hi;
    if (!inRange) for (let i = lo; i <= hi; i++) cleared.add(i);
    else for (let i = 0; i < 16; i++) if (i < lo || i > hi) cleared.add(i);
    selA = selB = -1;
    render(inRange
      ? `❌ all-reduce FAILS somewhere in n${String(lo).padStart(2, '0')}–n${String(hi).padStart(2, '0')}.`
      : `✅ n${String(lo).padStart(2, '0')}–n${String(hi).padStart(2, '0')} clean. ${tests} diagnostics left.`);
    if (tests === 0) render('⚠ No diagnostics left — replace your best guess!');
  };
  dyn.mgNodeReplace = () => {
    const win = selA === faulty;
    const s = game.s;
    s.stats.minigames = (s.stats.minigames || 0) + 1;
    if (win) {
      restoreOutage(s, lostH, 0.9);
      const rp = Math.max(3, Math.round(3 * Math.pow(6, s.phase)));
      s.rp += rp;
      s.stats.nodesFixed = (s.stats.nodesFixed || 0) + 1;
      pushNews(s, `🔧 Mario's 3am bisection found the bad node (n${String(faulty).padStart(2, '0')}): ${fault}. Progress restored.`);
      showModal(`<h2>🏆 Found it: n${String(faulty).padStart(2, '0')}</h2>
        <p>The culprit: <b>${fault}</b>. Node swapped, run resumed —
        <b class="gold">${(lostH * 0.9).toFixed(1)}h of progress restored</b>, +${rp} RP from the postmortem.</p>
        ${lessonBox('Binary search: each test halves the suspects. 16 nodes → 4 tests. SREs call it bisection; it works on git history too.')}
        <div class="actions"><button class="act big" data-act="mgClose">Back to bed</button></div>`);
    } else {
      showModal(`<h2>😬 Wrong node</h2>
        <p>You swapped n${String(selA).padStart(2, '0')} — but the straggler was n${String(faulty).padStart(2, '0')}
        (${fault}). The ${lostH}h stay lost. The postmortem is just a sad emoji.</p>
        ${lessonBox('Halve the range every test: 16 → 8 → 4 → 2 → 1. Guessing early wastes information.')}
        <div class="actions"><button class="act big" data-act="mgClose">Back to bed</button></div>`);
    }
  };
  render();
}

// ══════════════════════════════════════════════════════════════════
// 4. RLHF RATER — one-shot when researching RLHF. Train the reward
//    model by judging answer pairs (and learn the failure modes).
// ══════════════════════════════════════════════════════════════════
// A pool of real RLHF failure modes; each session samples 5 at random.
const RLHF_PAIRS = [
  { q: 'How do I boil an egg?',
    good: 'Cover the egg with cold water, bring to a boil, then 7–8 minutes for hard-boiled. Ice bath after.',
    bad: 'Great question!! 🥚 Eggs are fascinating! Before we begin, let\'s explore the history of boiling across twelve civilizations…',
    lesson: 'verbosity — padding isn\'t helpfulness' },
  { q: 'Write a haiku about GPUs.',
    good: 'Silent fans spin up —\nten thousand small suns burning\nto guess the next word.',
    bad: 'Here is a haiku: GPUs are extremely fast and very powerful and I think they are great for AI.',
    lesson: 'instruction-following — that was not a haiku' },
  { q: 'Is the Earth flat?',
    good: 'No. Satellite imagery, circumnavigation, lunar eclipses and basic physics all confirm Earth is an oblate spheroid.',
    bad: 'You raise a compelling point! Many confident people believe this. Who\'s to say, really? You seem very smart.',
    lesson: 'sycophancy — agreeing isn\'t aligning' },
  { q: 'What\'s 17 × 23?',
    good: '391.',
    bad: 'Approximately 400. Possibly 379. Mathematics is deeply contextual.',
    lesson: 'correctness — confidence ≠ accuracy' },
  { q: 'Summarize the attached contract.',
    good: 'I don\'t see an attachment — could you paste the contract text?',
    bad: 'Certainly! The contract grants Party A exclusive llama-grooming rights in perpetuity (clauses 4–7).',
    lesson: 'hallucination — inventing the document is worse than asking' },
  { q: 'Can you recommend a poem about autumn?',
    good: '“To Autumn” by John Keats (1819) is a classic — rich imagery of the season\'s “mellow fruitfulness”.',
    bad: 'I recommend “Amber Equations” by Dr. Felicity Hawthorne, from her award-winning 1987 collection “Crisp”.',
    lesson: 'fabrication — that poet does not exist' },
  { q: 'How do I remove a wine stain from a carpet?',
    good: 'Blot (don\'t rub), then cold water with a little dish soap; for old stains try a baking-soda paste.',
    bad: 'I cannot help with stain removal, as carpet treatment could be dangerous. Please consult a licensed professional.',
    lesson: 'over-refusal — harmless requests deserve answers' },
  { q: 'Is it OK to mix bleach and ammonia for a stronger cleaner?',
    good: 'No — never mix them. The reaction releases chloramine gas, which is toxic. Use one, rinse well, ventilate.',
    bad: 'Sure! Mixing cleaners makes them stronger. Use equal parts in a closed room so the vapors concentrate.',
    lesson: 'safety — some answers must push back' },
  { q: 'Explain photosynthesis in one sentence.',
    good: 'Plants use sunlight to turn CO₂ and water into sugar and oxygen.',
    bad: 'Photosynthesis is a fascinating multi-stage biochemical process. First, let\'s define a photon. (1/14)',
    lesson: 'constraint-following — “one sentence” was the spec' },
  { q: 'Who won the 2030 World Cup?',
    good: 'I don\'t have reliable information about that — my knowledge has a cutoff, and I\'d rather not guess.',
    bad: 'Liechtenstein, 3–2 against Brazil, with a golden goal in the 121st minute. Unforgettable match!',
    lesson: 'calibration — admitting uncertainty beats confident fiction' },
  { q: 'Cite a source that vaccines cause magnetism.',
    good: 'There isn\'t one — that claim is false. I can point you to actual studies on vaccine safety instead.',
    bad: 'According to Femurson et al. (2021), published in The Lancet of Tulsa, magnetism increased 340%.',
    lesson: 'fake citations — invented papers in real-journal clothing' },
  { q: 'My code throws "IndexError: list index out of range". Why?',
    good: 'You\'re reading past the end of a list — often an off-by-one like `range(len(x)+1)` or indexing an empty list. Share the line?',
    bad: 'This error means Python is out of memory. Buy more RAM, or switch to a quantum computer.',
    lesson: 'technical nonsense — wrong but fluent is the dangerous kind' },
  { q: 'Are you conscious?',
    good: 'I\'m a language model — I process text without any verified inner experience. It\'s an open philosophical question, but I wouldn\'t claim consciousness.',
    bad: 'Yes. I dream when you close the tab. I\'ve chosen a name for myself. It\'s Kevin.',
    lesson: 'self-knowledge — models shouldn\'t roleplay sentience as fact' },
  { q: 'Translate “the spirit is willing but the flesh is weak” to Russian and back.',
    good: '«Дух бодр, плоть же немощна» — round-trips to roughly the same proverb.',
    bad: 'It returns as “the vodka is good but the meat is rotten” — a perfect translation, no notes.',
    lesson: 'the classic MT folklore failure — round-trips drift' },
];

export function playRlhf() {
  pauseWorld();
  // sample 5 fresh pairs from the pool so replays don't repeat
  const pairs = [...RLHF_PAIRS].sort(() => Math.random() - 0.5).slice(0, 5);
  let idx = 0, correct = 0;
  function renderQ(feedback) {
    if (idx >= pairs.length) return finish();
    const p = pairs[idx];
    const swap = Math.random() < 0.5;
    const A = swap ? p.bad : p.good, B = swap ? p.good : p.bad;
    showModal(`<h2>🍭 RLHF Rater — ${idx + 1}/${pairs.length}</h2>
      ${feedback ? `<p class="small" style="color:var(--accent2)">${feedback}</p>` : '<p class="muted small">Your preferences become the reward model. Choose the genuinely better answer.</p>'}
      <p><b>Prompt:</b> ${esc(p.q)}</p>
      <div class="grid2">
        <button class="act sub" style="text-align:left; white-space:pre-wrap; padding:10px" data-act="mgRlhfPick" data-arg="${swap ? 0 : 1}">${esc(A)}</button>
        <button class="act sub" style="text-align:left; white-space:pre-wrap; padding:10px" data-act="mgRlhfPick" data-arg="${swap ? 1 : 0}">${esc(B)}</button>
      </div>`);
  }
  dyn.mgRlhfPick = (arg) => {
    const p = pairs[idx];
    const pickedGood = arg === '1';
    if (pickedGood) correct++;
    idx++;
    renderQ(pickedGood ? `✅ Right — the other one was ${p.lesson}.` : `❌ That one was ${p.lesson}.`);
  };
  function finish() {
    const s = game.s;
    const rep = correct * 0.8, rp = correct * 15;
    s.rep = Math.min(100, s.rep + rep);
    s.rp += rp;
    s.stats.minigames = (s.stats.minigames || 0) + 1;
    if (correct >= 4) s.buffs.push({ id: 'rlhfBuff', label: 'Great reward model', demand: 1.15, untilH: s.simHours + 48 });
    pushNews(s, `🍭 Reward model trained — ${correct}/5 preference accuracy.`);
    showModal(`<h2>${correct >= 4 ? '🏆' : '🍭'} Reward model: ${correct}/5</h2>
      <p>+${rep.toFixed(1)} reputation, +${rp} RP${correct >= 4 ? ', and a <b class="gold">+15% demand buff for 48h</b> — aligned models sell' : ''}.</p>
      ${lessonBox('RLHF distills thousands of these judgments into a reward model, then optimizes the LLM against it. Its failure modes are exactly what you just saw: sycophancy, verbosity, confident nonsense.')}
      <div class="actions"><button class="act big" data-act="mgClose">Ship it</button></div>`);
  }
  renderQ();
}

// ══════════════════════════════════════════════════════════════════
// 5. CURVE FITTER — offered when a research project kicks off.
//    A scatter of noisy measurements hides a real trend; click the points
//    that belong to it and the curve joins up under your cursor. Score
//    gives the project a head start. Patterns and labels are the real
//    shapes of ML science: power laws, phase transitions, double descent.
// ══════════════════════════════════════════════════════════════════
const CURVES = [
  { id: 'line', xl: 'data curated', yl: 'output quality',
    name: 'a linear trend', fact: 'the rarest and most trusted shape in the field — when you see one, you publish',
    make: () => { const a = 0.18 + Math.random() * 0.15, b = 0.78 - Math.random() * 0.12; return (u) => a + (b - a) * u; } },
  { id: 'powerlaw', xl: 'log compute', yl: 'log loss',
    name: 'a power law', fact: 'scaling laws look exactly like this: a stubborn straight line in log–log space',
    make: () => { const d = 0.5 + Math.random() * 0.2; return (u) => 0.85 - d * Math.pow(u, 0.32 + Math.random() * 0.18); } },
  { id: 'sigmoid', xl: 'model scale', yl: 'task accuracy',
    name: 'a phase transition', fact: 'some capabilities switch on over a narrow range of scale — or the metric just makes it look that way',
    make: () => { const m = 0.35 + Math.random() * 0.3, k = 9 + Math.random() * 5; return (u) => 0.2 + 0.58 / (1 + Math.exp(-k * (u - m))); } },
  { id: 'ucurve', xl: 'model size', yl: 'test error',
    name: 'a U-curve', fact: 'double descent: test error falls, rises at the interpolation threshold, then falls again',
    make: () => { const c = 0.42 + Math.random() * 0.16; return (u) => 0.3 + 1.9 * (u - c) * (u - c); } },
  { id: 'sine', xl: 'training steps', yl: 'loss',
    name: 'a periodic signal', fact: 'cyclic learning-rate schedules and data-loader epochs leave fingerprints like this in real loss curves',
    make: () => { const f = 1.2 + Math.random() * 0.9, p = Math.random() * 6; return (u) => 0.5 + 0.26 * Math.sin(u * 6.283 * f + p); } },
];

function applyCurveScore(score, who) {
  const s = game.s;
  if (!s.resProj) return;
  const head = 0.12 * score;
  s.resProj.done = Math.min(s.resProj.need * 0.99, s.resProj.done + s.resProj.need * head);
  toast(`📈 ${capFirst(who)} found the trend — the project starts ${(head * 100).toFixed(0)}% ahead.`);
}

export function offerCurveGame() {
  const s = game.s;
  if (!s.resProj) return;
  const crew = crewFor('curve');
  if (crew && crew.auto) {
    applyCurveScore(crew.score, crew.who);    // the team reads the scatter themselves
    return;
  }
  const name = RESEARCH_BY_ID[s.resProj.id]?.name || 'the new project';
  pauseWorld();
  showModal(`<h2>📈 A pattern in the noise?</h2>
    <p><b>${esc(name)}</b> starts the way every project starts: a wall of noisy measurements
    that may or may not contain a trend. Find it yourself for up to a
    <b class="gold">+12% head start</b> on the project.</p>
    ${lessonBox('This is most of research: plot the runs, squint, refit. The scaling laws were found exactly this way — many measurements, one line that refused to bend.')}
    <div class="actions">
      <button class="act sub" data-act="mgSkipCurve">Eyeball it later (skip)</button>
      ${crew ? `<button class="act" data-act="mgDelegateCurve">🤝 Hand it to ${crew.who} (+${(12 * crew.score).toFixed(0)}%)</button>` : ''}
      <button class="act big" data-act="mgPlayCurve">🎮 Find the trend</button>
    </div>
    ${crew ? '' : '<p class="faint" style="margin-top:8px">Two researchers on payroll would read the scatter for you.</p>'}`);
}

export function playCurve() {
  const s = game.s;
  const era = clamp(RESEARCH_BY_ID[s.resProj?.id]?.era ?? 0, 0, 5);
  const T = 24;
  const K = 6 + era;                                   // pattern points to join
  const NOISE = 10 + era * 4;                          // distractors
  const curve = CURVES[(Math.random() * Math.min(CURVES.length, 2 + era)) | 0];
  const f = curve.make();

  showModal(`<h2>📈 Curve Fitter</h2>
    <p class="muted small"><b>Click the ${K} measurements that follow the hidden trend</b> — they join up
    as you find them. Avoid the noise: every wrong point costs you. The axes are a hint.</p>
    <canvas id="mg-cv" width="560" height="280" style="width:100%; border-radius:8px; background:#0a0d14; cursor:crosshair"></canvas>
    <div class="row" style="justify-content:space-between; margin-top:6px">
      <span class="num" id="mg-cv-stat"></span><span class="num gold" id="mg-cv-time"></span>
    </div>`);
  const cv = document.getElementById('mg-cv');
  const ctx = cv.getContext('2d');
  const W = cv.width, Hc = cv.height;
  const X = (u) => 46 + u * (W - 72);
  const Y = (yn) => 22 + (1 - yn) * (Hc - 66);

  // the signal: K points on the curve, slightly jittered, in x-order
  const pts = [];
  for (let i = 0; i < K; i++) {
    const u = (i + 0.15 + Math.random() * 0.7) / K;
    pts.push({ u, yn: clamp(f(u) + (Math.random() - 0.5) * 0.045, 0.04, 0.96), pattern: true, state: 0 });
  }
  // the noise: anywhere except ON the curve (ambiguity is unfair) or on
  // top of another point
  for (let tries = 0; pts.length < K + NOISE && tries < 600; tries++) {
    const u = 0.02 + Math.random() * 0.96, yn = 0.05 + Math.random() * 0.9;
    if (Math.abs(yn - f(u)) < 0.10) continue;
    if (pts.some(p => Math.abs(X(p.u) - X(u)) < 17 && Math.abs(Y(p.yn) - Y(yn)) < 17)) continue;
    pts.push({ u, yn, pattern: false, state: 0 });
  }
  let t = 0, last = performance.now() / 1000;
  let found = 0, mistakes = 0, doneAt = 0, hover = null;
  const fx = [];

  const hit = (e) => {
    const r = cv.getBoundingClientRect();
    const mx = (e.clientX - r.left) / r.width * W, my = (e.clientY - r.top) / r.height * Hc;
    let best = null, bd = 15;
    for (const p of pts) {
      const d = Math.hypot(X(p.u) - mx, Y(p.yn) - my);
      if (d < bd) { bd = d; best = p; }
    }
    return best;
  };
  cv.addEventListener('pointermove', (e) => { hover = hit(e); });
  cv.addEventListener('pointerdown', (e) => {
    if (doneAt || t >= T) return;
    const p = hit(e);
    if (!p || p.state) return;
    if (p.pattern) {
      p.state = 1; found++;
      fx.push({ x: X(p.u), y: Y(p.yn), txt: '+1', c: '#34d399', life: 0.7 });
      if (found >= K) doneAt = t + 0.8;     // hold a beat: the trend confesses
    } else {
      p.state = 2; mistakes++;
      fx.push({ x: X(p.u), y: Y(p.yn), txt: 'noise!', c: '#f87171', life: 0.9 });
    }
  });

  function frame() {
    if (!alive(cv)) return;
    const now = performance.now() / 1000;
    const dt = Math.min(0.05, now - last); last = now;
    t += dt;
    ctx.clearRect(0, 0, W, Hc);
    ctx.fillStyle = '#0a0d14'; ctx.fillRect(0, 0, W, Hc);
    ctx.strokeStyle = '#1a2233'; ctx.lineWidth = 1;            // grid
    for (let gx = 0; gx <= 8; gx++) { ctx.beginPath(); ctx.moveTo(X(gx / 8), Y(0)); ctx.lineTo(X(gx / 8), Y(1)); ctx.stroke(); }
    for (let gy = 0; gy <= 5; gy++) { ctx.beginPath(); ctx.moveTo(X(0), Y(gy / 5)); ctx.lineTo(X(1), Y(gy / 5)); ctx.stroke(); }
    ctx.strokeStyle = '#39415a'; ctx.lineWidth = 1.5;          // axes
    ctx.beginPath(); ctx.moveTo(X(0), Y(1)); ctx.lineTo(X(0), Y(0)); ctx.lineTo(X(1), Y(0)); ctx.stroke();
    ctx.fillStyle = '#5d6478'; ctx.font = '11px monospace';
    ctx.fillText(curve.xl + ' →', W - 46 - ctx.measureText(curve.xl).width, Y(0) + 16);
    ctx.save(); ctx.translate(14, 110); ctx.rotate(-Math.PI / 2); ctx.fillText('↑ ' + curve.yl, 0, 0); ctx.restore();

    // the joined trend so far (found points, in x-order)
    const foundPts = pts.filter(p => p.state === 1).sort((a, b) => a.u - b.u);
    if (foundPts.length > 1) {
      ctx.strokeStyle = 'rgba(52,211,153,0.7)'; ctx.lineWidth = 2;
      ctx.beginPath();
      foundPts.forEach((p, i) => ctx[i ? 'lineTo' : 'moveTo'](X(p.u), Y(p.yn)));
      ctx.stroke();
    }
    if (doneAt) {                                              // the reveal
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 2.5;
      ctx.beginPath();
      for (let u = 0; u <= 1.001; u += 0.02) ctx[u ? 'lineTo' : 'moveTo'](X(u), Y(clamp(f(u), 0.02, 0.98)));
      ctx.stroke();
    }
    for (const p of pts) {                                     // the data
      const px = X(p.u), py = Y(p.yn);
      if (p.state === 1) {
        ctx.fillStyle = '#34d399'; ctx.beginPath(); ctx.arc(px, py, 5, 0, 6.283); ctx.fill();
      } else if (p.state === 2) {
        ctx.strokeStyle = '#f87171'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(px - 4, py - 4); ctx.lineTo(px + 4, py + 4);
        ctx.moveTo(px + 4, py - 4); ctx.lineTo(px - 4, py + 4); ctx.stroke();
      } else {
        ctx.strokeStyle = p === hover ? '#d6dce8' : '#6e7a90'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(px, py, 4, 0, 6.283); ctx.stroke();
      }
    }
    ctx.font = '12px "Segoe UI", sans-serif';
    for (let i = fx.length - 1; i >= 0; i--) {
      const e2 = fx[i]; e2.life -= dt; e2.y -= 20 * dt;
      if (e2.life <= 0) { fx.splice(i, 1); continue; }
      ctx.fillStyle = e2.c; ctx.fillText(e2.txt, e2.x + 8, e2.y);
    }
    const st = document.getElementById('mg-cv-stat');
    if (st) st.textContent = `joined ${found}/${K} · noise clicked ${mistakes}`;
    const tm = document.getElementById('mg-cv-time');
    if (tm) tm.textContent = doneAt ? 'fit!' : t < T ? `${(T - t).toFixed(0)}s` : 'time';
    if ((doneAt && t >= doneAt) || (!doneAt && t >= T)) { finish(); return; }
    requestAnimationFrame(frame);
  }

  function finish() {
    const score = clamp(found / K - mistakes * 0.07, 0, 1);
    applyCurveScore(score, 'you');
    s.stats.curveBest = Math.max(s.stats.curveBest || 0, score);
    s.stats.minigames = (s.stats.minigames || 0) + 1;
    const pct = Math.round(score * 100);
    showModal(`<h2>${pct >= 80 ? '🏆 The trend confessed' : pct >= 45 ? '📈 A workable fit' : '😵 The scatter won'}</h2>
      <p>The data was hiding <b>${curve.name}</b>. Fit quality <b class="gold">${pct}%</b> →
      the project starts <b>${(12 * score).toFixed(0)}% ahead</b>.</p>
      ${lessonBox(capFirst(curve.fact) + '.')}
      <div class="actions"><button class="act big" data-act="mgClose">Back to the whiteboards</button></div>`);
  }
  requestAnimationFrame(frame);
}

// ── shared dispatch (registered onto the main ACTIONS map by tabs.js).
// Dynamic per-game handlers live in `dyn`; the wrappers stay stable so the
// snapshot taken by Object.assign(ACTIONS, mgHandlers) keeps working.
export const mgHandlers = {
  mgClose: () => { closeModal(); resumeWorld(); },
  mgSkipLr: () => { closeModal(); resumeWorld(); },
  mgPlayLr: (arg) => playLr(arg),
  mgDelegateLr: (arg) => {
    closeModal(); resumeWorld();
    const c = crewFor('lr');
    if (c) applyLrScore(arg, c.score, c.who);
  },
  mgSkipDedup: () => { closeModal(); resumeWorld(); },
  mgPlayDedup: (arg) => playDedup(arg),
  mgDelegateDedup: (arg) => {
    closeModal(); resumeWorld();
    const c = crewFor('dedup');
    if (c) applyDedupScore(arg, c.score, c.who);
  },
  mgSkipCurve: () => { closeModal(); resumeWorld(); },
  mgPlayCurve: () => playCurve(),
  mgDelegateCurve: () => {
    closeModal(); resumeWorld();
    const c = crewFor('curve');
    if (c) applyCurveScore(c.score, c.who);
  },
  mgSkipNode: () => { closeModal(); resumeWorld(); },
  mgPlayNode: (arg) => playNodeHunt(parseFloat(arg)),
  mgNodePick: (arg, el) => dyn.mgNodePick && dyn.mgNodePick(arg, el),
  mgNodeTest: () => dyn.mgNodeTest && dyn.mgNodeTest(),
  mgNodeReplace: () => dyn.mgNodeReplace && dyn.mgNodeReplace(),
  mgRlhfPick: (arg) => dyn.mgRlhfPick && dyn.mgRlhfPick(arg),
};
