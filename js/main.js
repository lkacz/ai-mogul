// Boot, game loop, autosave, offline progress, story modals.

import { defaultState, serialize, deserialize, SAVE_KEY } from './core/state.js';
import * as E from './core/engine.js';
import { BAL, capTier } from './core/balance.js';
import { MILESTONE_BY_ID, rewardText } from './core/milestones.js';
import { FOUNDERS, founderize } from './core/data.js';
import { fmtMoney, fmtNum, fmtDur, fmtDate, fmtFlop } from './core/util.js';
import { game, renderAll, initDispatch, toast, showModal, closeModal, esc, spawnFloat } from './ui/ui.js';
import { ACTIONS } from './ui/tabs.js';
import { celebrate, drawFounderPortrait } from './ui/scene.js';
import { offerNodeHunt, playRlhf } from './ui/minigames.js';
import { playSingularity, playOpening } from './ui/singularity.js';
import { RESEARCH_BY_ID } from './core/research.js';
import { DILEMMAS, DILEMMA_BY_ID } from './core/dilemmas.js';

// ── Load / new game ───────────────────────────────────────────────
// Meta persists across universes: which founder stars in the NEXT story.
// It carries no history — a finished game is gone for good.
const META_KEY = 'aimogul_meta_v1';
function metaFounder() {
  try {
    const m = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    return FOUNDERS[m.founder] ? m.founder : 'mario';
  } catch { return 'mario'; }
}
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { s: deserialize(raw), fresh: false };
  } catch (e) { console.warn('Save corrupted, starting fresh.', e); }
  return { s: defaultState(metaFounder()), fresh: true };
}

const { s, fresh } = load();
game.s = s;
const founder = () => FOUNDERS[s.founder] || FOUNDERS.mario;

// once the singularity fires, the game is over — nothing runs, nothing saves
let ended = false;

function save() {
  if (ended) return;
  s.lastReal = Date.now();
  try { localStorage.setItem(SAVE_KEY, serialize(s)); } catch (e) { /* storage full/blocked */ }
}

// ── Offline progress (1 real second away = 1 sim hour, capped) ────
function grantOffline() {
  const awaySec = (Date.now() - (s.lastReal || Date.now())) / 1000;
  let hours = Math.min(Math.floor(awaySec / 1), BAL.OFFLINE_CAP_H);
  if (hours < 3) return;
  const before = { money: s.money, rp: s.rp, models: s.models.length, cap: s.bestCap };
  for (let i = 0; i < hours; i++) E.step(s, 1);
  showModal(`<h2>⏰ While you were away…</h2>
    <p>The lab kept running for <b>${fmtDur(hours)}</b> of sim time.</p>
    <div class="win-stats">
      <span class="muted">Cash</span><span class="num">${fmtMoney(before.money)} → <b class="gold">${fmtMoney(s.money)}</b></span>
      <span class="muted">Research points</span><span class="num">${fmtNum(before.rp)} → <b>${fmtNum(s.rp)}</b></span>
      <span class="muted">Models trained</span><span class="num">${before.models} → <b>${s.models.length}</b></span>
      <span class="muted">Best capability</span><span class="num">${before.cap.toFixed(1)} → <b class="cyan">${s.bestCap.toFixed(1)}</b></span>
    </div>
    <div class="actions"><button class="act big" data-act="closeModal">Back to work</button></div>`);
}

// ── Founder choice / intro / win ──────────────────────────────────
// Every new story starts with picking who walks into the garage. The founder
// the meta queued (the one who DIDN'T star last time) leads the lineup — a
// wordless nudge toward a fresh story, never a lock.
function showFounderChoice() {
  game.founderPending = true;   // the garage behind stays empty until they walk in
  const order = metaFounder() === 'al' ? ['al', 'mario'] : ['mario', 'al'];
  const card = (id) => {
    const f = FOUNDERS[id];
    return `<button class="founder-card" data-act="pickFounder" data-arg="${id}">
      <canvas class="fc-portrait" id="fc_${id}"></canvas>
      <b class="fc-name">${esc(f.name)}</b>
      <span class="muted small">${esc(f.title)}</span>
      <span class="faint small" style="font-style:italic">“${esc(f.tagline)}”</span>
      <span class="fc-go">walk in ▸</span>
    </button>`;
  };
  showModal(`<h2>🧠 AI MOGUL</h2>
    <p><b>Choose your founder.</b><br>
    <span class="muted">A cold garage. $1,500. One used BTX 1070. Who walks in?</span></p>
    <div class="row" style="gap:12px; align-items:stretch">${order.map(card).join('')}</div>`);
  for (const id of order) drawFounderPortrait(document.getElementById('fc_' + id), id);
}
ACTIONS.pickFounder = (id) => {
  if (!FOUNDERS[id]) return;
  s.founder = id;
  game.founderPending = false;  // …and in they walk
  save();
  renderAll();
  showIntro();
};

function showIntro() {
  showModal(`<h2>🧠 AI MOGUL</h2>
    <p><b>San Mateo, January 2025.</b> ${founder().intro}</p>
    <p class="muted">▸ <b>Train models</b> — capability grows with the log of effective compute (C = 6·N·D).<br>
    ▸ <b>Earn</b> — freelance gigs first, then API revenue as the market slowly adopts your models.<br>
    ▸ <b>Scale</b> — GPUs → racks → datacenters → a gigawatt AI factory.<br>
    ▸ <b>Research</b> — algorithmic efficiency multiplies every FLOP you own.<br>
    ▸ <b>Win</b> — reach capability <b>100: AGI</b>, before the rivals' curves flatten yours.
    Then find out what the curve does next.</p>
    <p class="faint">Space = pause · numbers in the top bar set sim speed (1 s ≈ 1 sim hour at 1×)</p>
    <div class="actions"><button class="act big" data-act="closeModal">Boot up the rig</button></div>`);
}

let winShown = false;
function maybeShowWin() {
  if (!s.won || winShown || s.wonShown) return;
  winShown = true; s.wonShown = true;
  if (s.speed > 500) s.speed = 500;   // turbo disengages for the big moments
  celebrate();
  const st = s.stats;
  const agiInteg = s.integrity >= 85
    ? '<p class="muted">Its second question is about the contracts you refused. It sounds — if a loss curve can — proud.</p>'
    : s.integrity < 40
      ? founderize('<p class="muted">Its second question is about some of the things it was asked to do on the way here. Mario changes the subject. The machine notices.</p>', s.founder)
      : '';
  showModal(founderize(`<h2>🌟 AGI ACHIEVED</h2>
    <p>${fmtDate(s.simHours)}. The final checkpoint loads. It asks Mario how his day was —
    and means it. Somewhere in the Factory, six gigawatts hum a major chord.</p>
    <p><i>"We started in a garage,"</i> Mario tells the machine. <i>"You should've seen the power bill."</i></p>`, s.founder) + `
    ${agiInteg}
    <div class="win-stats">
      <span class="muted">Time to AGI</span><span class="num"><b>${fmtDur(s.simHours)}</b> (${fmtDate(s.simHours)})</span>
      <span class="muted">Lifetime training compute</span><span class="num">${fmtFlop(st.flops)}</span>
      <span class="muted">Models trained</span><span class="num">${s.models.length + st.openSourced}</span>
      <span class="muted">API revenue earned</span><span class="num">${fmtMoney(st.apiRevenue)}</span>
      <span class="muted">Gigs grinded</span><span class="num">${fmtMoney(st.gigRevenue)}</span>
      <span class="muted">Papers published</span><span class="num">${st.papers}</span>
    </div>
    <p class="muted">And yet… the loss curve hasn't flattened. A new research era —
    <b>Beyond Silicon</b> — glows in the Research tab: photonics, qubits, fusion, atoms —
    and past those, Kardashev's ladder: a star, then a galaxy. The road continues to
    capability <b>300</b>. Nobody knows what's there.</p>
    <div class="actions"><button class="act big" data-act="closeModal">Keep scaling</button></div>`);
  save();
}

// ── The true ending: the Singularity, after which there is no game ──
// The save is erased, the loops halt, the cinematic plays into a permanent
// memorial. The only continuation is a reload — a fresh universe, a fresh
// founder, no memory of this one.
let singularityShown = false;
function maybeShowSingularity() {
  if (!s.singularity || singularityShown) return;
  singularityShown = true;
  ended = true;
  s.paused = true;
  // this universe is finished: erase it, and queue a different founder
  try { localStorage.removeItem(SAVE_KEY); } catch (e) { /* ignore */ }
  try {
    const meta = JSON.parse(localStorage.getItem(META_KEY) || '{}');
    localStorage.setItem(META_KEY, JSON.stringify({
      runs: (meta.runs || 0) + 1,
      founder: s.founder === 'al' ? 'mario' : 'al',
    }));
  } catch (e) { /* ignore */ }
  closeModal();
  playSingularity({ integrity: s.integrity });   // never returns
}

// ── Settings modal ────────────────────────────────────────────────
ACTIONS.settings = () => {
  showModal(`<h2>⚙️ Settings</h2>
    <div class="row" style="gap:8px; flex-wrap:wrap">
      <button class="act" data-act="saveNow">💾 Save now</button>
      <button class="act sub" data-act="exportSave">⬆ Export save</button>
      <button class="act sub" data-act="importSave">⬇ Import save</button>
      <button class="act warn" data-act="resetGame">🗑 Hard reset</button>
    </div>
    <div id="save-io" style="margin-top:10px"></div>
    <p class="faint" style="margin-top:12px">AI Mogul autosaves every 15 s. Numbers are compressed for playability,
    but the mechanics are real: Chinchilla scaling, MFU, PUE, batch-size limits, adoption curves.</p>
    <div class="actions"><button class="act" data-act="closeModal">Close</button></div>`);
};
ACTIONS.saveNow = () => { save(); toast('Game saved.'); };
ACTIONS.exportSave = () => {
  save();
  const el = document.getElementById('save-io');
  el.innerHTML = `<textarea readonly>${serialize(s).replace(/</g, '&lt;')}</textarea>
    <div class="faint">Copy this somewhere safe.</div>`;
  el.querySelector('textarea').select();
};
ACTIONS.importSave = () => {
  const el = document.getElementById('save-io');
  el.innerHTML = `<textarea id="import-area" placeholder="Paste a save here…"></textarea>
    <button class="act" data-act="importGo" style="margin-top:6px">Load it</button>`;
};
ACTIONS.importGo = () => {
  try {
    const txt = document.getElementById('import-area').value.trim();
    const ns = deserialize(txt);
    Object.assign(s, ns);
    save(); closeModal(); renderAll();
    toast('Save imported.');
  } catch (e) { toast('That doesn\'t look like a valid save.', 'err'); }
};
ACTIONS.resetGame = () => {
  showModal(`<h2>🗑 Hard reset</h2><p>Wipe everything and go back to the cold garage?</p>
    <div class="actions">
      <button class="act sub" data-act="closeModal">Cancel</button>
      <button class="act warn" data-act="resetGo">Yes, wipe it</button>
    </div>`);
};
ACTIONS.resetGo = () => {
  localStorage.removeItem(SAVE_KEY);
  Object.assign(s, defaultState(metaFounder()));
  winShown = false;
  singularityShown = false;
  game.founderPending = true;   // nobody has walked into the new garage yet
  closeModal(); renderAll();
  s.paused = true;
  playOpening(() => { s.paused = false; showFounderChoice(); });   // the loop closes here too
};

// ── Outage incidents → Node Hunt minigame ────────────────────────
// The pager is fun twice and a chore after that: rate-limited hard in real
// time, and 3+ ops staff take over the rotation entirely (handled in core).
let pagerCooldownReal = 0;
function pumpIncidents() {
  const inc = s.lastIncident;
  if (!inc) return;
  s.lastIncident = null;
  // only interrupt a player who's actually here (not offline catch-up)
  if (document.hidden) return;
  if (!document.getElementById('modal-root').classList.contains('hidden')) return;
  if (Date.now() - (inc.realAt || 0) > 90 * 1000) return;
  if (!s.runs.length) return;
  if (Date.now() < pagerCooldownReal) return;             // the loss stands; the news has it
  pagerCooldownReal = Date.now() + 6 * 60 * 1000;
  s.stats.pagerPages = (s.stats.pagerPages || 0) + 1;
  offerNodeHunt(inc);
}

// ── Capability celebrations: every new best sparkles, tier-ups bang ──
let lastBestCap = s.bestCap;
let lastTier = capTier(s.bestCap);
function pumpCelebrations() {
  if (s.bestCap < lastBestCap) {           // reset / imported save — resync quietly
    lastBestCap = s.bestCap; lastTier = capTier(s.bestCap);
    return;
  }
  if (s.bestCap <= lastBestCap + 0.05) return;
  const tier = capTier(s.bestCap);
  if (tier !== lastTier) {
    lastTier = tier;
    toast(`⬆ <b>TIER UP — ${tier}</b><br><span class="small">best model: capability ${s.bestCap.toFixed(1)}</span>`, 'tier');
    celebrate(60);
  } else {
    celebrate(14);                          // small burst for every new best model
  }
  lastBestCap = s.bestCap;
}

// ── Research completions → toast + follow-ups (explainer / RLHF game) ──
function pumpResearchDone() {
  const q = s.resDoneQueue;
  if (!q || !q.length) return;
  if (!document.getElementById('modal-root').classList.contains('hidden')) return;
  const item = q.shift();
  const def = RESEARCH_BY_ID[item.id];
  if (!def) return;
  toast(`🔬 <b>Research complete: ${esc(def.name)}</b>`, 'mile');
  // follow-ups only for a player who's actually here (not offline catch-up)
  const fresh = Date.now() - (item.realAt || 0) < 90 * 1000;
  if (!fresh || document.hidden) return;
  if (item.id === 'rlhf' && !s.stats.rlhfRated) {
    s.stats.rlhfRated = 1;
    playRlhf();               // one-shot: train the reward model yourself
    return;
  }
  if (def.real) {
    showModal(`<h2>🔭 ${esc(def.name)}</h2>
      <p>${esc(def.desc)}</p>
      <p class="muted"><b>📚 The real thing:</b> ${esc(def.real)}</p>
      <div class="actions"><button class="act big" data-act="closeModal">Back to the future</button></div>`);
  }
}

// ── Moral dilemmas: hard choices on a human clock ──────────────────
// Paced in REAL player time (one every 3–5 minutes, first at 2–4), so sim
// speed never floods them. Presented without any hint of which answer is
// "right": identical buttons, randomized order, no numbers. The world
// answers a minute or two later, and not always the way you'd guess.
game.nextDilemmaReal = Date.now() + 120e3 + Math.random() * 120e3;
let dilemmaPrevPaused = false;
function pumpDilemma() {
  if (document.hidden) return;
  if (!document.getElementById('modal-root').classList.contains('hidden')) return;
  if (s.speed >= 10000) return;            // turbo = unsupervised; no offers
  if (!s.pendingDilemma) {
    if (Date.now() < game.nextDilemmaReal) return;
    const pool = DILEMMAS.filter(d =>
      s.phase >= d.minPhase && (!d.reqCap || s.bestCap >= d.reqCap) &&
      !(s.dilemmasSeen || []).includes(d.id));
    if (!pool.length) { game.nextDilemmaReal = Date.now() + 600e3; return; }
    s.pendingDilemma = { id: pool[(Math.random() * pool.length) | 0].id, realAt: Date.now() };
  }
  const d = DILEMMA_BY_ID[s.pendingDilemma.id];
  if (!d || !d.options) { s.pendingDilemma = null; return; }
  dilemmaPrevPaused = s.paused;
  s.paused = true;
  const text = esc(d.text).replace('{$}', fmtMoney(E.dilemmaPayout(s, d)));
  const order = Math.random() < 0.5 ? [0, 1] : [1, 0];   // position carries no signal
  const btn = (i) => `<button class="act" data-act="dilemma" data-arg="${i}"
    style="flex:1; white-space:normal; padding:10px 12px; line-height:1.35">${esc(d.options[i].label)}</button>`;
  // no "real debate" sidebar — the citations stay in the data as writing
  // anchors, but the player just gets the situation, in-world, nothing meta
  showModal(`<h2>⚖️ ${esc(d.title)}</h2>
    <p>${text}</p>
    <div class="row" style="gap:10px; margin-top:10px; align-items:stretch">${btn(order[0])}${btn(order[1])}</div>`);
}
ACTIONS.dilemma = (arg) => {
  const r = E.resolveDilemma(s, +arg);
  closeModal();
  s.paused = dilemmaPrevPaused;
  game.nextDilemmaReal = Date.now() + 180e3 + Math.random() * 120e3;   // 3–5 min
  toast(r.msg, r.ok ? '' : 'err');
  renderAll();
};

// consequences land on the player's clock, wherever the sim has wandered
function pumpFalloutReal() {
  const list = s.fallout;
  if (!list || !list.length) return;
  for (let i = list.length - 1; i >= 0; i--) {
    const f = list[i];
    if (!f.atReal || Date.now() < f.atReal) continue;
    list.splice(i, 1);
    E.applyConsequence(s, f);
  }
}

// ── The consulting pipeline: sales staff run gigs so you don't have to ──
// Relief, not replacement: the founder's own gig button still pays more and
// can streak. Real-time cadence like the button (sim speed doesn't multiply
// it). Past AGI the models consult on their own — the humans become optional.
let nextAutoGigReal = Date.now() + 40e3;
function pumpAutoGigs() {
  if (Date.now() < nextAutoGigReal || s.paused) return;
  const agi = s.bestCap >= 100;
  if (!agi && !(s.staff.sales >= 1)) return;
  nextAutoGigReal = Date.now() + 30e3 + Math.random() * 20e3;
  const mult = agi ? 0.9 : Math.min(0.8, 0.4 + 0.1 * Math.min(4, s.staff.sales));
  const before = s.money;
  E.doGig(s, mult);
  spawnFloat(`+${fmtMoney(s.money - before)} ${agi ? '🤖' : '💼'}`,
    document.getElementById('gig-btn') || document.getElementById('hdr-money'), 'gold');
}

// ── Dramatic incidents (fires, theft, dead hardware) → toast ──────
function pumpDrama() {
  const d = s.lastDrama;
  if (!d) return;
  s.lastDrama = null;
  // skip stale drama from offline catch-up — the news log still has it
  if (Date.now() - (d.realAt || 0) > 60 * 1000) return;
  toast(d.txt, 'err');
}

// ── Milestone toasts ──────────────────────────────────────────────
function pumpMilestoneToasts() {
  if (!s.lastMilestone) return;
  const m = MILESTONE_BY_ID[s.lastMilestone];
  s.lastMilestone = null;
  if (m) {
    toast(`🏁 <b>${m.name}</b>${m.reward ? '<br><span class="small">' + rewardText(m.reward) + '</span>' : ''}`, 'mile');
    celebrate();
  }
}

// ── Game loop ─────────────────────────────────────────────────────
let acc = 0;
let lastT = performance.now();
let lastPhase = s.phase;

// Turbo (≥10k×): the player has explicitly stopped supervising. Every signal
// is consumed silently — effects still land, nobody reports them — and only
// AGI / the Singularity interrupt.
const isTurbo = () => s.speed >= 10000 && !s.paused;
function drainSignalsSilently() {
  s.lastMilestone = null;
  s.lastDrama = null;
  s.lastIncident = null;                 // the outage loss stands, unannounced
  if (s.resDoneQueue) s.resDoneQueue.length = 0;
  s.pendingDilemma = null;               // unanswered offers evaporate
  lastBestCap = s.bestCap;               // no retroactive celebration bursts
  lastTier = capTier(s.bestCap);
}

setInterval(() => {
  if (ended) return;                // the universe has moved on
  const now = performance.now();
  let dt = (now - lastT) / 1000; lastT = now;
  if (dt > 30) dt = 30;             // background-tab catch-up cap
  if (!s.paused) {
    acc += dt * s.speed;            // 1 real second = 1 sim hour at 1×
    // turbo needs a bigger budget: up to 3000 steps × 4 h = 240k sim-h/s
    const maxH = s.speed >= 10000 ? 4 : 1;
    let iter = 0;
    while (acc >= 0.25 && iter < 3000) {
      const h = Math.min(maxH, acc);
      E.step(s, h);
      acc -= h; iter++;
    }
  }
  if (isTurbo()) {
    pumpFalloutReal();        // consequences still land — just unannounced
    drainSignalsSilently();
  } else {
    pumpMilestoneToasts();
    pumpCelebrations();
    pumpFalloutReal();
    pumpDrama();
    pumpResearchDone();
    pumpDilemma();
    pumpIncidents();
    pumpAutoGigs();
  }
  maybeShowWin();
  maybeShowSingularity();
  if (s.phase !== lastPhase) { lastPhase = s.phase; renderAll(); }
}, 50);

setInterval(() => { if (!ended) renderAll(); }, 250);
setInterval(save, 15000);
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ── Boot ──────────────────────────────────────────────────────────
window.AIMOGUL = game;   // debug/test handle
// every new story opens on the shot the last one ended with: the blue
// world, the garage light, then the fall toward the morning of day one —
// and the player decides who walks into the garage.
// (?skipintro is for dev/screenshot tooling: no choice, meta founder.)
const skipIntro = typeof location !== 'undefined' && location.search.includes('skipintro');
if (fresh && !skipIntro) game.founderPending = true;   // empty garage until then
initDispatch();
renderAll();
if (fresh) {
  if (skipIntro) showIntro();
  else {
    s.paused = true;   // the world starts when you arrive
    playOpening(() => { s.paused = false; showFounderChoice(); });
  }
} else {
  grantOffline();
}
