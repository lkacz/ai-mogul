// Facility designer UI: pick a part, click the animated blueprint to place
// it (click again to remove). The canvas draws the real machinery — fans
// spin, mist rises, coolant flows, radiators glow — and paints each part's
// status: green = working, amber = missing something, red = a mistake.
// A narrated build guide walks you through the canonical construction order,
// and hovering anything explains what it is and why it's there.

import { game, showModal, closeModal, toast, esc, renderAll, spawnFloat } from './ui.js';
import { DESIGNS, GRID_W, GRID_H, scoreDesign, placedCount, evalGuide } from '../core/design.js';
import { drawDesignScene, CELL, DZ_W, DZ_H } from './designparts.js';
import { applyFacilityDesign } from '../core/engine.js';
import { fmtMoney } from '../core/util.js';

let dz = null;   // { phase, cells, sel, res, guide, hover, lastScore }
let raf = 0;

export function openDesigner() {
  const s = game.s;
  const def = DESIGNS[s.phase];
  if (!def) { toast('The garage is beyond optimization. It has a vibe.', 'err'); return; }
  const saved = (s.facDesign && s.facDesign[s.phase]) || {};
  const cells = {};
  for (const [i, p] of Object.entries(saved)) if (def.parts[p]) cells[i] = p;
  dz = { phase: s.phase, cells, sel: Object.keys(def.parts)[0], hover: -1, lastScore: null };
  rescore();
  buildModal();
}

function rescore() {
  dz.res = scoreDesign(dz.phase, dz.cells);
  dz.guide = evalGuide(dz.phase, dz.cells);
}

// what this layout is worth per hour, vs the undesigned default
function savingsPerHour(fx) {
  const sel = game.sel;
  if (!sel || sel.elecPerHour <= 0) return 0;
  const basePue = sel.fac.pue;
  const newPue = Math.max(1.01, basePue + fx.pue);
  // normalize the current bill back to the undesigned baseline (undo both
  // the PUE shift AND the elec multiplier of any already-commissioned design)
  const curFx = (game.s.facDesignFx || {})[game.s.phase];
  const baseBill = sel.elecPerHour * (basePue / sel.pue) / (curFx?.elec || 1);
  return baseBill * (1 - (newPue / basePue) * fx.elec);
}

// ── modal scaffold (built once; panels update in place) ─────────────
function buildModal() {
  const def = DESIGNS[dz.phase];
  showModal(`<h2>🏗️ ${def.icon} ${esc(def.name)} — floor plan</h2>
    <p class="muted small">${esc(def.blurb)}</p>
    <div class="row" id="dz-palette" style="gap:5px; flex-wrap:wrap; margin-bottom:6px"></div>
    <canvas id="dz-canvas" width="${DZ_W}" height="${DZ_H}"></canvas>
    <div class="small" id="dz-info" style="min-height:18px; color:var(--accent2)"></div>
    <div class="row" id="dz-scoreline" style="justify-content:space-between; margin-top:2px; flex-wrap:wrap"></div>
    <div id="dz-guide" style="margin-top:6px; padding:7px 9px; background:#13202b; border:1px solid #1d4456; border-radius:8px"></div>
    <div id="dz-lines" style="max-height:120px; overflow-y:auto; margin-top:6px; padding:6px 8px; background:var(--card2); border-radius:8px"></div>
    <div class="faint small" style="margin-top:6px">📚 ${esc(def.fact)}</div>
    <div class="actions">
      <button class="act sub" data-act="dzClear">Clear</button>
      <button class="act sub" data-act="closeModal">Cancel</button>
      <button class="act big" data-act="dzApply">✔ Commission this layout</button>
    </div>`, 'wide');
  const cv = document.getElementById('dz-canvas');
  if (cv && cv.addEventListener) {
    cv.addEventListener('pointermove', (e) => { dz && (dz.hover = cellAt(cv, e)); updateInfo(); });
    cv.addEventListener('pointerleave', () => { if (dz) { dz.hover = -1; updateInfo(); } });
    cv.addEventListener('pointerdown', (e) => placeAt(cv, e));
  }
  updatePanels();
  if (!raf) raf = requestAnimationFrame(frame);
}

function cellAt(cv, e) {
  const r = cv.getBoundingClientRect();
  const x = Math.floor((e.clientX - r.left) / r.width * GRID_W);
  const y = Math.floor((e.clientY - r.top) / r.height * GRID_H);
  if (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) return -1;
  return y * GRID_W + x;
}

function placeAt(cv, e) {
  if (!dz) return;
  const i = cellAt(cv, e);
  if (i < 0) return;
  const def = DESIGNS[dz.phase];
  if (dz.cells[i]) delete dz.cells[i];
  else if (dz.sel && placedCount(dz.cells, dz.sel) < def.parts[dz.sel].n) dz.cells[i] = dz.sel;
  else { toast('No more of those — remove one first, or pick another part.', 'err'); return; }
  const before = dz.res.score;
  rescore();
  updatePanels();
  const d = dz.res.score - before;
  if (d !== 0) spawnFloat(`${d > 0 ? '+' : ''}${d}`, cv, d > 0 ? 'gold' : 'bad');
}

function updateInfo() {
  const el = document.getElementById('dz-info');
  if (!el || !dz) return;
  const def = DESIGNS[dz.phase];
  const part = dz.hover >= 0 ? dz.cells[dz.hover] : null;
  if (part && def.parts[part]) {
    el.textContent = `${def.parts[part].name} — ${def.parts[part].tip}`;
  } else if (dz.sel) {
    el.textContent = `placing: ${def.parts[dz.sel].name} — ${def.parts[dz.sel].tip}`;
  } else el.textContent = '';
}

function updatePanels() {
  const def = DESIGNS[dz.phase];
  const res = dz.res;
  // palette
  const pal = document.getElementById('dz-palette');
  if (pal) pal.innerHTML = Object.entries(def.parts).map(([id, p]) => {
    const left = p.n - placedCount(dz.cells, id);
    return `<button class="act ${dz.sel === id ? 'gold' : 'sub'}" data-act="dzPick" data-arg="${id}"
      title="${esc(p.tip)}" ${left <= 0 && dz.sel !== id ? 'style="opacity:.45"' : ''}>
      ${p.icon} ${esc(p.name)} <span class="num">×${left}</span></button>`;
  }).join('');
  // score line
  const save = savingsPerHour(res.fx);
  const fxTxt = `PUE ${res.fx.pue <= 0 ? '' : '+'}${res.fx.pue.toFixed(2)} · MFU ${res.fx.mfu >= 0 ? '+' : ''}${(res.fx.mfu * 100).toFixed(1)}% · power ×${res.fx.elec.toFixed(2)}`;
  const saveTxt = Math.abs(save) > 0.005
    ? ` · <b class="${save >= 0 ? 'good' : 'bad'}">${save >= 0 ? 'saves' : 'WASTES'} ≈ ${fmtMoney(Math.abs(save))}/h</b>` : '';
  const sl = document.getElementById('dz-scoreline');
  if (sl) sl.innerHTML = `
    <span>Design score: <b class="${res.score >= 65 ? 'good' : res.score >= 45 ? '' : 'bad'}" style="font-size:18px">${res.score}</b> / 100 <span class="faint small">(50 = the default mess)</span></span>
    <span class="faint small">${fxTxt}${saveTxt}</span>`;
  // the narrated build guide: next step front and center
  const gd = document.getElementById('dz-guide');
  if (gd) {
    const next = dz.guide.find(s => !s.done);
    const doneN = dz.guide.filter(s => s.done).length;
    const steps = dz.guide.map((s2, i) =>
      `<span title="${esc(s2.txt)}" style="cursor:default">${s2.done ? '✅' : i === dz.guide.indexOf(next) ? '👉' : '▢'}</span>`).join(' ');
    gd.innerHTML = next
      ? `<div class="row" style="justify-content:space-between"><b class="cyan small">📋 Build guide — step ${doneN + 1}/${dz.guide.length}</b><span>${steps}</span></div>
         <div class="small" style="margin-top:3px">${esc(next.txt)}</div>`
      : `<div class="row" style="justify-content:space-between"><b class="good small">📋 Build guide complete — every system accounted for.</b><span>${steps}</span></div>
         <div class="small muted" style="margin-top:3px">Now chase the score: fix anything glowing amber or red, then commission it.</div>`;
  }
  // rule breakdown
  const lines = document.getElementById('dz-lines');
  if (lines) lines.innerHTML = res.lines.map(l => {
    const cls = l.trap ? 'bad' : l.pts > 0 ? 'good' : 'faint';
    return `<div class="stat-row"><span class="k small">${l.trap ? '⚠ ' : ''}${esc(l.txt)}</span>
      <span class="stat-v ${cls}">${l.pts > 0 ? '+' : ''}${l.pts}${l.max ? ` / ${l.max}` : ''}</span></div>`;
  }).join('');
  updateInfo();
}

function frame() {
  raf = 0;
  const cv = document.getElementById('dz-canvas');
  if (!dz || !cv || !cv.isConnected || !cv.getContext) return;   // modal closed
  const ctx = cv.getContext('2d');
  drawDesignScene(ctx, dz.phase, dz.cells, dz.res.marks, performance.now() / 1000, dz.hover, dz.sel);
  raf = requestAnimationFrame(frame);
}

export const dzHandlers = {
  designOpen: () => openDesigner(),
  dzPick: (id) => { if (dz) { dz.sel = id; updatePanels(); } },
  dzClear: () => { if (dz) { dz.cells = {}; rescore(); updatePanels(); } },
  dzApply: () => {
    if (!dz) return;
    const r = applyFacilityDesign(game.s, dz.phase, dz.cells);
    toast(r.msg, r.ok ? 'mile' : 'err');
    if (r.ok) { closeModal(); dz = null; renderAll(); }
  },
};
