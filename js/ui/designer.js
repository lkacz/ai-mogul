// Facility designer UI: the Factorio corner of AI Mogul. Pick a part from
// the palette, click cells to place it (click again to remove), and watch
// the grid itself answer: green = satisfied, amber = missing something,
// red = an engineering mistake. The score panel explains each line in real
// terms, and the header shows what the layout is worth in $/h.

import { game, showModal, closeModal, toast, esc, renderAll, spawnFloat } from './ui.js';
import { DESIGNS, GRID_W, GRID_H, scoreDesign, placedCount } from '../core/design.js';
import { applyFacilityDesign } from '../core/engine.js';
import { fmtMoney } from '../core/util.js';

let dz = null;   // { phase, cells, sel, lastScore }

export function openDesigner() {
  const s = game.s;
  const def = DESIGNS[s.phase];
  if (!def) { toast('The garage is beyond optimization. It has a vibe.', 'err'); return; }
  // load the saved layout, dropping any parts a newer catalog no longer knows
  const saved = (s.facDesign && s.facDesign[s.phase]) || {};
  const cells = {};
  for (const [i, p] of Object.entries(saved)) if (def.parts[p]) cells[i] = p;
  dz = { phase: s.phase, cells, sel: Object.keys(def.parts)[0], lastScore: null };
  render();
}

// what this layout is worth per hour, vs the undesigned default
function savingsPerHour(fx) {
  const sel = game.sel;
  if (!sel || sel.elecPerHour <= 0) return 0;
  const fac = sel.fac;
  const basePue = fac.pue;
  const newPue = Math.max(1.01, fac.pue + fx.pue);
  // normalize current bill back to the undesigned baseline, then apply the draft
  const baseBill = sel.elecPerHour * (basePue / sel.pue);
  return baseBill * (1 - (newPue / basePue) * fx.elec);
}

function render() {
  const def = DESIGNS[dz.phase];
  const res = scoreDesign(dz.phase, dz.cells);
  const sunward = dz.phase === 5 || dz.phase === 6;

  const palette = Object.entries(def.parts).map(([id, p]) => {
    const left = p.n - placedCount(dz.cells, id);
    return `<button class="act ${dz.sel === id ? 'gold' : 'sub'}" data-act="dzPick" data-arg="${id}"
      title="${esc(p.tip)}" ${left <= 0 && dz.sel !== id ? 'style="opacity:.45"' : ''}>
      ${p.icon} ${esc(p.name)} <span class="num">×${left}</span></button>`;
  }).join('');

  let cellsHtml = '';
  for (let i = 0; i < GRID_W * GRID_H; i++) {
    const part = dz.cells[i];
    const st = res.marks[i] || '';
    cellsHtml += `<button class="dz-cell ${part ? 'filled' : ''} ${st}" data-act="dzCell" data-arg="${i}"
      ${part ? `title="${esc(def.parts[part]?.name || part)} — click to remove"` : ''}>${part ? (def.parts[part]?.icon || '❓') : ''}</button>`;
  }

  const lines = res.lines.map(l => {
    const cls = l.trap ? 'bad' : l.pts > 0 ? 'good' : 'faint';
    return `<div class="stat-row"><span class="k small">${l.trap ? '⚠ ' : ''}${esc(l.txt)}</span>
      <span class="stat-v ${cls}">${l.pts > 0 ? '+' : ''}${l.pts}${l.max ? ` / ${l.max}` : ''}</span></div>`;
  }).join('');

  const save = savingsPerHour(res.fx);
  const fxTxt = `PUE ${res.fx.pue <= 0 ? '' : '+'}${res.fx.pue.toFixed(2)} · MFU ${res.fx.mfu >= 0 ? '+' : ''}${(res.fx.mfu * 100).toFixed(1)}% · power ×${res.fx.elec.toFixed(2)}`;
  const saveTxt = Math.abs(save) > 0.005
    ? ` · ${save >= 0 ? 'saves' : 'WASTES'} ≈ ${fmtMoney(Math.abs(save))}/h at current load`
    : '';

  showModal(`<h2>🏗️ ${def.icon} ${esc(def.name)} — floor plan</h2>
    <p class="muted small">${esc(def.blurb)}</p>
    <div class="row" style="gap:5px; flex-wrap:wrap; margin-bottom:8px">${palette}</div>
    ${sunward ? '<div class="small" style="display:flex; justify-content:space-between"><span class="gold">☀️ SUN — high flux</span><span class="cyan">deep space, 2.7 K →</span></div>' : ''}
    <div class="dz-grid">${cellsHtml}</div>
    <div class="row" style="justify-content:space-between; margin-top:8px; flex-wrap:wrap">
      <span>Design score: <b class="${res.score >= 65 ? 'good' : res.score >= 45 ? '' : 'bad'}" style="font-size:18px">${res.score}</b> / 100 <span class="faint small">(50 = the default mess)</span></span>
      <span class="faint small">${fxTxt}<b class="${save >= 0 ? 'good' : 'bad'}">${saveTxt}</b></span>
    </div>
    <div style="max-height:160px; overflow-y:auto; margin-top:4px; padding:6px 8px; background:var(--card2); border-radius:8px">${lines}</div>
    <div class="faint small" style="margin-top:6px">📚 ${esc(def.fact)}</div>
    <div class="actions">
      <button class="act sub" data-act="dzClear">Clear</button>
      <button class="act sub" data-act="closeModal">Cancel</button>
      <button class="act big" data-act="dzApply">✔ Commission this layout</button>
    </div>`, 'wide');
  dz.lastScore = res.score;
}

export const dzHandlers = {
  designOpen: () => openDesigner(),
  dzPick: (id) => { if (dz) { dz.sel = id; render(); } },
  dzCell: (arg, el) => {
    if (!dz) return;
    const i = +arg;
    const def = DESIGNS[dz.phase];
    if (dz.cells[i]) delete dz.cells[i];
    else if (dz.sel && placedCount(dz.cells, dz.sel) < def.parts[dz.sel].n) dz.cells[i] = dz.sel;
    else { toast('No more of those — remove one first, or pick another part.', 'err'); return; }
    const before = dz.lastScore;
    render();
    // instant feedback: how much did that one move help or hurt?
    if (before !== null && dz.lastScore !== before) {
      const d = dz.lastScore - before;
      spawnFloat(`${d > 0 ? '+' : ''}${d}`, el, d > 0 ? 'gold' : 'bad');
    }
  },
  dzClear: () => { if (dz) { dz.cells = {}; render(); } },
  dzApply: () => {
    if (!dz) return;
    const r = applyFacilityDesign(game.s, dz.phase, dz.cells);
    toast(r.msg, r.ok ? 'mile' : 'err');
    if (r.ok) { closeModal(); dz = null; renderAll(); }
  },
};
