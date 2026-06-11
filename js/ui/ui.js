// UI core: render loop glue, header/sidebar/ticker, modals, toasts, dispatch.

import { selectors } from '../core/state.js';
import { FACILITIES, FUNDING } from '../core/data.js';
import { RESEARCH } from '../core/research.js';
import { capTier, BAL } from '../core/balance.js';
import { currentGoal, rewardText, MILESTONE_BY_ID, GOAL_TAB } from '../core/milestones.js';
import { fundingWaitH } from '../core/engine.js';
import { fmtMoney, fmtNum, fmtFlops, fmtPower, fmtDate, fmtPct, clamp } from '../core/util.js';
import { TABS, ACTIONS, INPUTS } from './tabs.js';

export const game = {
  s: null,            // game state (set by main.js)
  sel: null,          // selectors(s), refreshed each render
  activeTab: 'lab',
  builtTab: null,
  builtSig: null,
  gigReadyAt: 0,      // real-time gig cooldown
  speeds: [1, 5, 25, 100, 500, 10000, 100000],   // ≥10k = turbo: notifications muted
  holdActive: false,  // press-and-hold auto-repeat in progress
  holdMult: 1,        // its accelerating quantity multiplier
  swallowClick: false,
};

const $ = (id) => document.getElementById(id);
export const esc = (t) => String(t).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
export const set = (id, txt) => { const el = $(id); if (el && el.textContent !== String(txt)) el.textContent = txt; };
export const setHtml = (id, h) => { const el = $(id); if (el) el.innerHTML = h; };
export const setBar = (id, frac, warn = false) => {
  const el = $(id); if (!el) return;
  const i = el.firstElementChild; if (!i) return;
  i.style.width = (clamp(frac, 0, 1) * 100).toFixed(1) + '%';
  i.className = warn ? 'warnfill' : '';
};
export const bar = (id, extra = '') => `<div class="bar ${extra}" id="${id}"><i style="width:0%"></i></div>`;

// ── Toasts ────────────────────────────────────────────────────────
export function toast(msg, cls = '') {
  const root = $('toast-root');
  const el = document.createElement('div');
  el.className = 'toast ' + cls;
  el.innerHTML = msg;
  root.appendChild(el);
  while (root.children.length > 5) root.firstChild.remove();
  setTimeout(() => { el.style.opacity = '0'; el.style.transition = 'opacity .4s'; }, 3400);
  setTimeout(() => el.remove(), 3900);
}

// ── Floating gain numbers (juice) ─────────────────────────────────
export function spawnFloat(text, anchorEl, cls = '') {
  let root = $('float-root');
  if (!root) {
    root = document.createElement('div');
    root.id = 'float-root';
    document.body.appendChild(root);
  }
  const el = document.createElement('span');
  el.className = 'float-num ' + cls;
  el.textContent = text;
  let x = innerWidth / 2, y = innerHeight / 2;
  if (anchorEl && anchorEl.getBoundingClientRect) {
    const r = anchorEl.getBoundingClientRect();
    x = r.left + r.width * (0.25 + Math.random() * 0.5);
    y = r.top;
  }
  el.style.left = x + 'px';
  el.style.top = y + 'px';
  root.appendChild(el);
  while (root.children.length > 12) root.firstChild.remove();
  setTimeout(() => el.remove(), 1300);
}

// ── Modals ────────────────────────────────────────────────────────
export function showModal(html) {
  const root = $('modal-root');
  root.innerHTML = `<div class="modal">${html}</div>`;
  root.classList.remove('hidden');
}
export function closeModal() { $('modal-root').classList.add('hidden'); }

// ── Header ────────────────────────────────────────────────────────
// Money display rolls toward the real value at 60 fps — number-go-up you can feel.
let dispMoney = null;
function moneyRoll() {
  const s = game.s;
  if (s) {
    if (dispMoney === null) dispMoney = s.money;
    const diff = s.money - dispMoney;
    dispMoney = Math.abs(diff) < Math.max(0.5, Math.abs(s.money) * 2e-4)
      ? s.money : dispMoney + diff * 0.12;
    const el = $('hdr-money');
    if (el) {
      const txt = fmtMoney(dispMoney);
      if (el.textContent !== txt) el.textContent = txt;
      el.style.color = s.money < 0 ? 'var(--red)' : 'var(--gold)';
    }
  }
  requestAnimationFrame(moneyRoll);
}

function renderHeader() {
  const { s, sel } = game;
  set('hdr-phase', sel.fac.name);
  set('hdr-date', fmtDate(s.simHours));
  const sc = $('speed-controls');
  const want = 'p' + (s.paused ? 1 : 0) + 's' + s.speed;
  if (sc.dataset.sig !== want) {
    sc.dataset.sig = want;
    const lbl = (v) => v >= 1000 ? (v / 1000) + 'k×' : v + '×';
    sc.innerHTML =
      `<button class="speed-btn ${s.paused ? 'on' : ''}" data-act="pause">⏸</button>` +
      game.speeds.map(v =>
        `<button class="speed-btn ${!s.paused && s.speed === v ? 'on' : ''} ${v >= 10000 ? 'turbo' : ''}" data-act="speed" data-arg="${v}" ${v >= 10000 ? 'title="Turbo: the lab runs itself — incidents and offers resolve silently (usually not in your favor); only AGI and the Singularity interrupt."' : ''}>${lbl(v)}</button>`
      ).join('');
  }
}

// ── Sidebar ───────────────────────────────────────────────────────
function renderSidebar() {
  const { s, sel } = game;
  const goal = currentGoal(s);
  let goalHtml = '';
  if (goal) {
    let progHtml = '';
    if (goal.prog) {
      const [cur, target] = goal.prog(s);
      progHtml = `<div class="bar thin"><i style="width:${clamp(cur / target, 0, 1) * 100}%"></i></div>
        <div class="bar-label"><span>${fmtNum(Math.min(cur, target))}</span><span>${fmtNum(target)}</span></div>`;
    }
    const goalTab = GOAL_TAB[goal.id];
    const tabDef = goalTab && TABS.find(t => t.id === goalTab);
    const goBtn = tabDef && game.activeTab !== goalTab
      ? `<button class="act goal-go" data-act="tab" data-arg="${goalTab}">Go: ${tabDef.label} →</button>` : '';
    goalHtml = `<div id="goal-card">
      <div class="faint">🎯 CURRENT GOAL</div>
      <div class="gname">${esc(goal.name)}</div>
      <div class="gdesc">${esc(goal.desc)}</div>
      ${progHtml}
      ${goal.reward ? `<div class="greward">Reward: ${rewardText(goal.reward)}</div>` : ''}
      ${goBtn}
    </div>`;
  } else {
    goalHtml = `<div id="goal-card"><div class="gname">🌌 Singularity reached</div>
      <div class="gdesc">You finished AI Mogul. The new universe runs in sandbox — or hard-reset in ⚙️ and race the curve again.</div></div>`;
  }

  const lead = s.bestCap - sel.maxRival;
  const capRow = (r) => `<div class="stat-row"><span class="k">${esc(r.name)}</span><span class="stat-v" style="color:${r.cap > s.bestCap ? 'var(--red)' : 'var(--dim)'}">${r.cap.toFixed(1)}</span></div>`;

  // pre-AGI: race to 100. Post-AGI: the Singularity Index opens, road to 200.
  const post = s.bestCap >= 100;
  const capMax = post ? BAL.SINGULARITY_CAP : 100;
  const capBanner = `
    <div class="side-section agi-banner">
      <h4>${post ? '🌌 Singularity Index — best model' : 'AGI Index — best model'}</h4>
      <div class="cap-big">${s.bestCap.toFixed(1)}<span class="faint" style="font-size:14px"> / ${capMax}</span></div>
      <div class="muted">${capTier(s.bestCap)}</div>
      <div class="bar thin" style="margin-top:6px"><i style="width:${clamp(s.bestCap / capMax, 0, 1) * 100}%; background:${post ? 'linear-gradient(90deg,#f472b6,#fbbf24,#fff)' : 'linear-gradient(90deg,#a78bfa,#f472b6)'}"></i></div>
      <div class="bar-label">${post
        ? `<span>⚡ self-improvement ×${fmtNum(sel.superImprove * sel.selfImprove)}</span><span>singularity at ${BAL.SINGULARITY_CAP}</span>`
        : `<span>${lead >= 0 ? '👑 leading' : '▼ ' + lead.toFixed(1) + ' behind'}</span><span>rival best ${sel.maxRival.toFixed(1)}</span>`}</div>
    </div>`;

  const html = `
    ${goalHtml}
    ${capBanner}
    <div class="side-section">
      <h4>Economy</h4>
      <div class="stat-row"><span class="k">Net / hour</span><span class="stat-v ${sel.netPerHour >= 0 ? 'good' : 'bad'}">${fmtMoney(sel.netPerHour)}</span></div>
      <div class="stat-row"><span class="k">API revenue</span><span class="stat-v">${fmtMoney(sel.revenue)}/s</span></div>
      <div class="stat-row"><span class="k">Market adoption</span><span class="stat-v">${sel.potential > 0 ? fmtPct(clamp(s.adoption / sel.potential, 0, 1)) : '—'}</span></div>
      <div class="stat-row"><span class="k">Costs / hour</span><span class="stat-v">${fmtMoney(sel.costPerHour)}</span></div>
      <div class="stat-row"><span class="k">Reputation</span><span class="stat-v cyan">${s.rep.toFixed(0)} / 100</span></div>
      <div class="stat-row" title="Your choices, remembered: integrity sways enterprise trust (demand), researcher morale (RP), who joins — and who blows the whistle. 70 is neutral.">
        <span class="k">Integrity</span>
        <span class="stat-v" style="color:${(s.integrity ?? 70) >= 70 ? 'var(--accent)' : (s.integrity ?? 70) >= 40 ? 'var(--dim)' : 'var(--red)'}">🧭 ${(s.integrity ?? 70).toFixed(0)} / 100</span>
      </div>
    </div>
    <div class="side-section">
      <h4>Compute</h4>
      <div class="stat-row"><span class="k">Cluster</span><span class="stat-v">${fmtFlops(sel.flops)}</span></div>
      <div class="stat-row"><span class="k">MFU</span><span class="stat-v">${fmtPct(sel.mfu)}</span></div>
      <div class="stat-row"><span class="k">Accelerators</span><span class="stat-v">${fmtNum(sel.gpuCount)} / ${fmtNum(sel.fac.slots)}</span></div>
      <div class="stat-row"><span class="k">Power</span><span class="stat-v ${sel.powerUsed / sel.powerCap > 0.92 ? 'bad' : ''}">${fmtPower(sel.powerUsed)} / ${fmtPower(sel.powerCap)}</span></div>
      <div class="stat-row"><span class="k">Max model (VRAM)</span><span class="stat-v">${fmtNum(sel.maxParams)} params</span></div>
      <div class="stat-row"><span class="k">Algorithmic eff.</span><span class="stat-v cyan">×${fmtNum(sel.algoEff)}</span></div>
    </div>
    <div class="side-section">
      <h4>Research & rivals</h4>
      <div class="stat-row"><span class="k">Research points</span><span class="stat-v">${fmtNum(s.rp)} <span class="faint">+${fmtNum(sel.rpPerHour)}/h</span></span></div>
      ${s.rivals.map(capRow).join('')}
    </div>
    ${s.buffs.length ? `<div class="side-section"><h4>Active effects</h4>${s.buffs.map(b =>
      `<span class="buff-chip">${esc(b.label)} · ${Math.max(0, Math.ceil(b.untilH - s.simHours))}h</span>`).join('')}</div>` : ''}
  `;
  $('sidebar').innerHTML = html;
}

// ── Ticker ────────────────────────────────────────────────────────
let lastNewsShown = '';
function renderTicker() {
  const { s } = game;
  const n = s.news[s.news.length - 1];
  if (!n) return;
  const key = n.h + n.txt;
  if (key !== lastNewsShown) {
    lastNewsShown = key;
    const el = $('ticker-text');
    el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
    el.textContent = n.txt;
  }
}

// ── Tabs ──────────────────────────────────────────────────────────
// Badges: how many things await you behind each tab (buyable research,
// fundable rounds, an affordable facility upgrade). Progress made visible.
function tabBadges(s, sel) {
  const res = s.resProj ? 0 : RESEARCH.filter(r =>
    !s.research.includes(r.id) && r.era <= s.phase && (r.era < 4 || s.won) &&
    (!r.deps || r.deps.every(d => s.research.includes(d))) &&
    (!r.reqCap || s.bestCap >= r.reqCap) &&
    s.rp >= r.rp && (!r.money || s.money >= r.money)).length;
  const co = FUNDING.filter((f, i) =>
    !s.funding.includes(f.id) &&
    (i === 0 || s.funding.includes(FUNDING[i - 1].id)) &&
    s.bestCap >= f.reqCap && s.rep >= f.reqRep && fundingWaitH(s, f) <= 0).length;
  const next = FACILITIES[s.phase + 1];
  const hw = next && s.money >= next.cost ? 1 : 0;
  return { res, co, hw };
}

function renderTabsNav() {
  const nav = $('tabs');
  const { s, sel } = game;
  const badges = tabBadges(s, sel);
  // pulse the goal's tab while onboarding (until the first dollar is earned)
  const goal = currentGoal(s);
  const pulseTab = goal && !s.milestones.firstDollar ? GOAL_TAB[goal.id] : null;
  const sig = [game.activeTab, s.phase, badges.res, badges.co, badges.hw, pulseTab].join(':');
  if (nav.dataset.sig === sig) return;
  nav.dataset.sig = sig;
  nav.innerHTML = TABS.map(t => {
    const n = badges[t.id] || 0;
    const pulse = t.id === pulseTab && game.activeTab !== t.id ? ' pulse' : '';
    return `<button class="tab-btn ${game.activeTab === t.id ? 'on' : ''}${pulse}" data-act="tab" data-arg="${t.id}">${t.label}${n ? `<span class="tab-badge">${n}</span>` : ''}</button>`;
  }).join('');
}

function renderActiveTab() {
  const tab = TABS.find(t => t.id === game.activeTab);
  if (!tab) return;
  const sig = tab.sig ? tab.sig(game.s, game.sel) : '';
  const container = $('tab-content');
  if (game.builtTab !== tab.id || game.builtSig !== sig) {
    container.innerHTML = tab.build(game.s, game.sel);
    game.builtTab = tab.id;
    game.builtSig = sig;
    if (tab.afterBuild) tab.afterBuild(game.s, game.sel);
  }
  if (tab.update) tab.update(game.s, game.sel);
}

// ── Master render ─────────────────────────────────────────────────
export function renderAll() {
  game.sel = selectors(game.s);
  renderHeader();
  renderSidebar();
  renderTicker();
  renderTabsNav();
  renderActiveTab();
}

export function switchTab(id) {
  game.activeTab = id;
  game.builtTab = null;
  renderAll();
}

// ── Event dispatch ────────────────────────────────────────────────
export function initDispatch() {
  requestAnimationFrame(moneyRoll);
  document.addEventListener('click', (e) => {
    if (game.swallowClick) { game.swallowClick = false; return; }  // a hold just ended
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    const fn = ACTIONS[act];
    if (fn) fn(el.dataset.arg, el);
  });

  // Press-and-hold auto-repeat on buy/sell/hire buttons, with acceleration:
  // the multiplier doubles every 0.7 s (up to ×256), so a held +1k button
  // reaches millions without a million clicks. We capture act/arg up front —
  // the button element itself gets rebuilt after every purchase.
  const HOLD_ACTS = new Set(['buyGpu', 'sellGpu', 'hire', 'fire']);
  let holdTo = 0, holdIv = 0;
  const stopHold = () => {
    clearTimeout(holdTo); clearInterval(holdIv);
    holdTo = holdIv = 0;
    game.holdActive = false; game.holdMult = 1;
    // the release-click (if any) fires right after pointerup; don't let a
    // stale swallow eat an unrelated later click
    setTimeout(() => { game.swallowClick = false; }, 60);
  };
  document.addEventListener('pointerdown', (e) => {
    const el = e.target.closest('[data-act]');
    if (!el || el.disabled) return;
    const act = el.dataset.act;
    if (!HOLD_ACTS.has(act)) return;
    const arg = el.dataset.arg;
    const t0 = Date.now();
    stopHold();
    holdTo = setTimeout(() => {
      game.holdActive = true;
      holdIv = setInterval(() => {
        game.holdMult = Math.min(256, Math.pow(2, Math.floor((Date.now() - t0) / 700)));
        game.swallowClick = true;          // eat the click that fires on release
        const fn = ACTIONS[act];
        if (fn) fn(arg, el);
      }, 110);
    }, 400);
  });
  for (const ev of ['pointerup', 'pointercancel']) document.addEventListener(ev, stopHold);
  window.addEventListener('blur', stopHold);
  document.addEventListener('input', (e) => {
    const el = e.target.closest('[data-input]');
    if (!el) return;
    const fn = INPUTS[el.dataset.input];
    if (fn) fn(el.value, el);
  });
  document.addEventListener('keydown', (e) => {
    if (e.code === 'Space' && !e.target.closest('input,textarea,button')) {
      e.preventDefault();
      game.s.paused = !game.s.paused;
      renderAll();
    }
  });
}

// Common built-in actions
ACTIONS.tab = (arg) => switchTab(arg);
ACTIONS.pause = () => { game.s.paused = !game.s.paused; renderAll(); };
ACTIONS.speed = (arg) => {
  const v = +arg;
  const wasTurbo = game.s.speed >= 10000;
  game.s.speed = v; game.s.paused = false;
  if (v >= 10000 && !wasTurbo) {
    toast('⚡ <b>Turbo engaged.</b> Notifications muted — incidents, offers and milestones resolve silently (the world doesn\'t wait for you). Only AGI and the Singularity will interrupt.');
  }
  renderAll();
};
ACTIONS.closeModal = () => closeModal();
