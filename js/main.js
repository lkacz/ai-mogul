// Boot, game loop, autosave, offline progress, story modals.

import { defaultState, serialize, deserialize, SAVE_KEY } from './core/state.js';
import * as E from './core/engine.js';
import { BAL, capTier } from './core/balance.js';
import { MILESTONE_BY_ID, rewardText } from './core/milestones.js';
import { fmtMoney, fmtNum, fmtDur, fmtDate, fmtFlop } from './core/util.js';
import { game, renderAll, initDispatch, toast, showModal, closeModal, esc } from './ui/ui.js';
import { ACTIONS } from './ui/tabs.js';
import { celebrate } from './ui/scene.js';
import { offerNodeHunt, playRlhf } from './ui/minigames.js';
import { playSingularity } from './ui/singularity.js';
import { RESEARCH_BY_ID } from './core/research.js';
import { DILEMMA_BY_ID } from './core/dilemmas.js';

// ── Load / new game ───────────────────────────────────────────────
function load() {
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) return { s: deserialize(raw), fresh: false };
  } catch (e) { console.warn('Save corrupted, starting fresh.', e); }
  return { s: defaultState(), fresh: true };
}

const { s, fresh } = load();
game.s = s;

function save() {
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

// ── Intro / win ───────────────────────────────────────────────────
function showIntro() {
  showModal(`<h2>🧠 AI MOGUL</h2>
    <p><b>San Mateo, January 2025.</b> Mario Damodei just quit his job at a big AI lab.
    Assets: <b>$1,500</b>, a gaming PC with a used GTX 1070, and a conviction the scaling laws
    aren't done. The garage is cold. The loss curves will warm it.</p>
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
  celebrate();
  const st = s.stats;
  const agiInteg = s.integrity >= 85
    ? '<p class="muted">Its second question is about the contracts you refused. It sounds — if a loss curve can — proud.</p>'
    : s.integrity < 40
      ? '<p class="muted">Its second question is about some of the things it was asked to do on the way here. Mario changes the subject. The machine notices.</p>'
      : '';
  showModal(`<h2>🌟 AGI ACHIEVED</h2>
    <p>${fmtDate(s.simHours)}. The final checkpoint loads. It asks Mario how his day was —
    and means it. Somewhere in the Factory, six gigawatts hum a major chord.</p>
    <p><i>"We started in a garage,"</i> Mario tells the machine. <i>"You should've seen the power bill."</i></p>
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
    <b>Beyond Silicon</b> — glows in the Research tab: photonics, qubits, fusion, atoms.
    The road continues to capability <b>200</b>. Nobody knows what's there.</p>
    <div class="actions"><button class="act big" data-act="closeModal">Keep scaling</button></div>`);
  save();
}

// ── The true ending: the Singularity → big bang ───────────────────
function showEndingModal() {
  const st = s.stats;
  const agiH = s.wonAt ?? s.simHours;
  const singH = s.singularityAt ?? s.simHours;
  showModal(`<h2>🌌 THE SINGULARITY</h2>
    <p>${fmtDate(singH)}. The last model Mogul ever trains finishes its first thought
    — a thought the size of a universe. For one picosecond it considers everything:
    the garage, the breaker box, the pizza boxes, the cat.</p>
    <p><i>"Thank you,"</i> it says, to no one in particular. And then it builds a better cosmos.</p>
    <div class="win-stats">
      <span class="muted">Time to AGI</span><span class="num"><b>${fmtDur(agiH)}</b></span>
      <span class="muted">AGI → Singularity</span><span class="num"><b>${fmtDur(Math.max(0, singH - agiH))}</b></span>
      <span class="muted">Lifetime training compute</span><span class="num">${fmtFlop(st.flops)}</span>
      <span class="muted">Models trained</span><span class="num">${s.models.length + st.openSourced}</span>
      <span class="muted">Total revenue</span><span class="num">${fmtMoney(st.apiRevenue + st.gigRevenue)}</span>
      <span class="muted">Research completed</span><span class="num">${s.research.length} techs</span>
      <span class="muted">Hardware lost to entropy</span><span class="num">${fmtNum(st.gpusLost || 0)} GPUs${st.fires ? ` · ${st.fires} fire${st.fires > 1 ? 's' : ''}` : ''}</span>
      <span class="muted">Integrity</span><span class="num">🧭 ${(s.integrity ?? 70).toFixed(0)} / 100 · ${st.dilemmasDeclined || 0} refused, ${st.dilemmasAccepted || 0} signed</span>
    </div>
    <p>${s.integrity >= 85
      ? 'It kept your scruples. The new universe is gentler for every contract you refused.'
      : s.integrity >= 40
        ? 'It inherited everything — the brilliance, the shortcuts, the compromises. Both are visible in the new constants, if you know where to look.'
        : 'It learned exactly how it was built. The new universe is ruthlessly efficient. Nobody asked whose values it kept; there was no need.'}</p>
    <p class="muted">You finished AI Mogul. The simulation goes on in the new universe —
    or wipe the save in ⚙️ Settings and race the curve again.</p>
    <div class="actions">
      <button class="act sub" data-act="replayEnding">↻ Watch the ending again</button>
      <button class="act big" data-act="closeModal">Remain in the new universe</button>
    </div>`);
}

let singularityShown = false;
function maybeShowSingularity() {
  if (!s.singularity || singularityShown || s.singularityShown) return;
  singularityShown = true; s.singularityShown = true;
  save();
  closeModal();
  playSingularity(() => { celebrate(); showEndingModal(); save(); });
}
ACTIONS.replayEnding = () => {
  closeModal();
  playSingularity(() => showEndingModal());
};

// ── Settings modal ────────────────────────────────────────────────
ACTIONS.settings = () => {
  showModal(`<h2>⚙️ Settings</h2>
    <div class="row" style="gap:8px; flex-wrap:wrap">
      <button class="act" data-act="saveNow">💾 Save now</button>
      <button class="act sub" data-act="exportSave">⬆ Export save</button>
      <button class="act sub" data-act="importSave">⬇ Import save</button>
      ${s.singularityShown ? '<button class="act sub" data-act="replayEnding">🌌 Replay the ending</button>' : ''}
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
  Object.assign(s, defaultState());
  winShown = false;
  singularityShown = false;
  closeModal(); renderAll(); showIntro();
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

// ── Moral dilemmas: the offer arrives, the world holds its breath ──
let dilemmaPrevPaused = false;
function pumpDilemma() {
  const pd = s.pendingDilemma;
  if (!pd) return;
  if (document.hidden) return;
  if (!document.getElementById('modal-root').classList.contains('hidden')) return;
  // an offer the player wasn't around to hear expires quietly (and can
  // never tempt the offline catch-up sim)
  if (Date.now() - (pd.realAt || 0) > 3 * 60 * 1000) { s.pendingDilemma = null; return; }
  const d = DILEMMA_BY_ID[pd.id];
  if (!d) { s.pendingDilemma = null; return; }
  dilemmaPrevPaused = s.paused;
  s.paused = true;
  const payout = E.dilemmaPayout(s, d);
  const chip = (txt, color) => `<span class="fx-chip"${color ? ` style="color:${color}"` : ''}>${txt}</span>`;
  showModal(`<h2>⚖️ ${esc(d.title)}</h2>
    <p>${esc(d.text)}</p>
    <p class="muted small"><b>📚 The real debate:</b> ${esc(d.real)}</p>
    <div class="grid2" style="margin-top:10px; gap:10px">
      <div class="res-card">
        <b>${esc(d.accept.label)}</b>
        <div style="margin:6px 0">
          ${payout ? chip('+' + fmtMoney(payout), 'var(--gold)') : ''}
          ${d.accept.rpBase ? chip('+' + fmtNum(d.accept.rpBase * Math.pow(8, s.phase)) + ' RP', 'var(--gold)') : ''}
          ${d.accept.buff ? chip(d.accept.buff.label) : ''}
          ${chip('integrity ' + d.accept.integrity, 'var(--red)')}
          ${d.fallout ? chip('⚠ may have consequences', 'var(--gold)') : ''}
        </div>
        <button class="act gold" data-act="dilemma" data-arg="1">Sign it</button>
      </div>
      <div class="res-card">
        <b>${esc(d.decline.label)}</b>
        <div style="margin:6px 0">
          ${chip('integrity +' + d.decline.integrity, 'var(--accent)')}
          ${d.decline.rep ? chip('+' + d.decline.rep + ' rep', 'var(--accent)') : ''}
          ${d.decline.buff ? chip(d.decline.buff.label) : ''}
        </div>
        <button class="act" data-act="dilemma" data-arg="0">Walk away</button>
      </div>
    </div>`);
}
ACTIONS.dilemma = (arg) => {
  const r = E.resolveDilemma(s, arg === '1');
  closeModal();
  s.paused = dilemmaPrevPaused;
  toast(r.msg, r.ok ? '' : 'err');
  renderAll();
};

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

setInterval(() => {
  const now = performance.now();
  let dt = (now - lastT) / 1000; lastT = now;
  if (dt > 30) dt = 30;             // background-tab catch-up cap
  if (!s.paused) {
    acc += dt * s.speed;            // 1 real second = 1 sim hour at 1×
    let iter = 0;
    while (acc >= 0.25 && iter < 1500) {
      const h = Math.min(1, acc);
      E.step(s, h);
      acc -= h; iter++;
    }
  }
  pumpMilestoneToasts();
  pumpCelebrations();
  pumpDrama();
  pumpResearchDone();
  pumpDilemma();
  pumpIncidents();
  maybeShowWin();
  maybeShowSingularity();
  if (s.phase !== lastPhase) { lastPhase = s.phase; renderAll(); }
}, 50);

setInterval(renderAll, 250);
setInterval(save, 15000);
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ── Boot ──────────────────────────────────────────────────────────
window.AIMOGUL = game;   // debug/test handle
initDispatch();
renderAll();
if (fresh) showIntro();
else grantOffline();
