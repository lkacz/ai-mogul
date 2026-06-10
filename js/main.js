// Boot, game loop, autosave, offline progress, story modals.

import { defaultState, serialize, deserialize, SAVE_KEY } from './core/state.js';
import * as E from './core/engine.js';
import { BAL } from './core/balance.js';
import { MILESTONE_BY_ID, rewardText } from './core/milestones.js';
import { fmtMoney, fmtNum, fmtDur, fmtDate, fmtFlop } from './core/util.js';
import { game, renderAll, initDispatch, toast, showModal, closeModal } from './ui/ui.js';
import { ACTIONS } from './ui/tabs.js';
import { celebrate } from './ui/scene.js';

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
    ▸ <b>Win</b> — reach capability <b>100: AGI</b>, before the rivals' curves flatten yours.</p>
    <p class="faint">Space = pause · numbers in the top bar set sim speed (1 s ≈ 1 sim hour at 1×)</p>
    <div class="actions"><button class="act big" data-act="closeModal">Boot up the rig</button></div>`);
}

let winShown = false;
function maybeShowWin() {
  if (!s.won || winShown || s.wonShown) return;
  winShown = true; s.wonShown = true;
  celebrate();
  const st = s.stats;
  showModal(`<h2>🌟 AGI ACHIEVED</h2>
    <p>${fmtDate(s.simHours)}. The final checkpoint loads. It asks Mario how his day was —
    and means it. Somewhere in the Factory, six gigawatts hum a major chord.</p>
    <p><i>"We started in a garage,"</i> Mario tells the machine. <i>"You should've seen the power bill."</i></p>
    <div class="win-stats">
      <span class="muted">Time to AGI</span><span class="num"><b>${fmtDur(s.simHours)}</b> (${fmtDate(s.simHours)})</span>
      <span class="muted">Lifetime training compute</span><span class="num">${fmtFlop(st.flops)}</span>
      <span class="muted">Models trained</span><span class="num">${s.models.length + st.openSourced}</span>
      <span class="muted">API revenue earned</span><span class="num">${fmtMoney(st.apiRevenue)}</span>
      <span class="muted">Gigs grinded</span><span class="num">${fmtMoney(st.gigRevenue)}</span>
      <span class="muted">Papers published</span><span class="num">${st.papers}</span>
    </div>
    <p class="muted">Sandbox continues — the curve never ends.</p>
    <div class="actions"><button class="act big" data-act="closeModal">Keep scaling</button></div>`);
  save();
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
  Object.assign(s, defaultState());
  winShown = false;
  closeModal(); renderAll(); showIntro();
};

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
  maybeShowWin();
  if (s.phase !== lastPhase) { lastPhase = s.phase; renderAll(); }
}, 50);

setInterval(renderAll, 250);
setInterval(save, 15000);
window.addEventListener('beforeunload', save);
document.addEventListener('visibilitychange', () => { if (document.hidden) save(); });

// ── Boot ──────────────────────────────────────────────────────────
initDispatch();
renderAll();
if (fresh) showIntro();
else grantOffline();
