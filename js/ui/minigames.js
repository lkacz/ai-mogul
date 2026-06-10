// Minigames: short skill games at key moments, each teaching a real ML/infra
// concept. The world pauses while you play. Rewards are modest and capped.

import { game, showModal, closeModal, toast, esc, renderAll } from './ui.js';
import { pushNews, restoreOutage } from '../core/engine.js';
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

// ══════════════════════════════════════════════════════════════════
// 1. LEARNING-RATE RIDER — offered when launching a frontier run.
//    Ride the LR just under the (moving) stability ceiling:
//    warmup → high cruise → decay. Score boosts the run's effective compute.
// ══════════════════════════════════════════════════════════════════
export function offerLrGame(runId) {
  pauseWorld();
  showModal(`<h2>🎚️ Babysit the launch?</h2>
    <p>The job is queued. Tune the <b>learning rate</b> live for the first steps —
    a clean warmup and decay gives this run up to <b class="gold">+12% effective compute</b>.</p>
    ${lessonBox('Real training uses LR <i>schedules</i>: linear warmup, long cruise, then decay. Too high and the loss diverges to NaN; too low and you waste the cluster.')}
    <div class="actions">
      <button class="act sub" data-act="mgSkipLr">Let it ride (skip)</button>
      <button class="act big" data-act="mgPlayLr" data-arg="${runId}">🎮 Tune it</button>
    </div>`);
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

  const thr = (tt) => tt < 5
    ? 0.0018 + (tt / 5) * 0.0102          // warmup: ceiling rises
    : 0.012 * (1 - 0.78 * (tt - 5) / (T - 5)); // then it decays

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
const GOOD_DOCS = ['📖 Wikipedia', '📚 Public-domain novel', '📄 arXiv paper', '🧑‍🍳 Cookbook', '💻 Code w/ tests', '✒️ Poetry anthology', '🗞️ Quality journalism'];
const BAD_DOCS = ['♻️ DUPLICATE ×412', '🗑️ SEO spam', '🎰 Casino ads', '🔒 PII: phone numbers', '🤖 Model-generated slop', '📋 Lorem ipsum…', '😡 ALL-CAPS RANT'];

export function offerDedup(dsId, dsName) {
  pauseWorld();
  showModal(`<h2>🧹 Clean the new corpus?</h2>
    <p><b>${esc(dsName)}</b> just arrived — raw. Filter the junk yourself for a permanent
    <b class="gold">up to +4% data quality</b> on this dataset.</p>
    ${lessonBox('Deduplication and filtering measurably improve LLMs — duplicated text wastes compute and causes memorization. Garbage in, garbage out is an empirical law.')}
    <div class="actions">
      <button class="act sub" data-act="mgSkipDedup">Ship it raw (skip)</button>
      <button class="act big" data-act="mgPlayDedup" data-arg="${dsId}">🎮 Clean it</button>
    </div>`);
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
  showModal(`<h2>📟 3:07 AM — pager goes off</h2>
    <p>The all-reduce is hanging: <b>one of 16 nodes</b> is bad and the run lost
    <b class="bad">${incident.lostH}h of progress</b>. Find the node with
    <b>5 diagnostics</b> and you claw back <b class="gold">90% of it</b> (plus RP for the postmortem).</p>
    ${lessonBox('One straggler GPU stalls a whole synchronous training job. Real SREs bisect node ranges exactly like this — binary search finds 1 of 16 in 4 tests.')}
    <div class="actions">
      <button class="act sub" data-act="mgSkipNode">Eat the loss (skip)</button>
      <button class="act big" data-act="mgPlayNode" data-arg="${incident.lostH}">🎮 Page me in</button>
    </div>`);
}

export function playNodeHunt(lostH) {
  const faulty = (Math.random() * 16) | 0;
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
      <div class="small" id="mg-node-msg" style="min-height:34px; color:var(--accent2)">${msg || 'NCCL WARN: watchdog timeout… somewhere.'}</div>
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
      pushNews(s, `🔧 Mario's 3am bisection found the bad node (n${String(faulty).padStart(2, '0')}). Progress restored.`);
      showModal(`<h2>🏆 Found it: n${String(faulty).padStart(2, '0')}</h2>
        <p>ECC errors on one HBM stack. Node swapped, run resumed —
        <b class="gold">${(lostH * 0.9).toFixed(1)}h of progress restored</b>, +${rp} RP from the postmortem.</p>
        ${lessonBox('Binary search: each test halves the suspects. 16 nodes → 4 tests. SREs call it bisection; it works on git history too.')}
        <div class="actions"><button class="act big" data-act="mgClose">Back to bed</button></div>`);
    } else {
      showModal(`<h2>😬 Wrong node</h2>
        <p>You swapped n${String(selA).padStart(2, '0')} — but the straggler was n${String(faulty).padStart(2, '0')}.
        The ${lostH}h stay lost. The postmortem is just a sad emoji.</p>
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
];

export function playRlhf() {
  pauseWorld();
  let idx = 0, correct = 0;
  function renderQ(feedback) {
    if (idx >= RLHF_PAIRS.length) return finish();
    const p = RLHF_PAIRS[idx];
    const swap = Math.random() < 0.5;
    const A = swap ? p.bad : p.good, B = swap ? p.good : p.bad;
    showModal(`<h2>🍭 RLHF Rater — ${idx + 1}/${RLHF_PAIRS.length}</h2>
      ${feedback ? `<p class="small" style="color:var(--accent2)">${feedback}</p>` : '<p class="muted small">Your preferences become the reward model. Choose the genuinely better answer.</p>'}
      <p><b>Prompt:</b> ${esc(p.q)}</p>
      <div class="grid2">
        <button class="act sub" style="text-align:left; white-space:pre-wrap; padding:10px" data-act="mgRlhfPick" data-arg="${swap ? 0 : 1}">${esc(A)}</button>
        <button class="act sub" style="text-align:left; white-space:pre-wrap; padding:10px" data-act="mgRlhfPick" data-arg="${swap ? 1 : 0}">${esc(B)}</button>
      </div>`);
  }
  dyn.mgRlhfPick = (arg) => {
    const p = RLHF_PAIRS[idx];
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

// ── shared dispatch (registered onto the main ACTIONS map by tabs.js).
// Dynamic per-game handlers live in `dyn`; the wrappers stay stable so the
// snapshot taken by Object.assign(ACTIONS, mgHandlers) keeps working.
export const mgHandlers = {
  mgClose: () => { closeModal(); resumeWorld(); },
  mgSkipLr: () => { closeModal(); resumeWorld(); },
  mgPlayLr: (arg) => playLr(arg),
  mgSkipDedup: () => { closeModal(); resumeWorld(); },
  mgPlayDedup: (arg) => playDedup(arg),
  mgSkipNode: () => { closeModal(); resumeWorld(); },
  mgPlayNode: (arg) => playNodeHunt(parseFloat(arg)),
  mgNodePick: (arg, el) => dyn.mgNodePick && dyn.mgNodePick(arg, el),
  mgNodeTest: () => dyn.mgNodeTest && dyn.mgNodeTest(),
  mgNodeReplace: () => dyn.mgNodeReplace && dyn.mgNodeReplace(),
  mgRlhfPick: (arg) => dyn.mgRlhfPick && dyn.mgRlhfPick(arg),
};
