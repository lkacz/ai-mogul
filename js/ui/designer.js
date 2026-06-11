// Facility designer UI: the Factorio corner of AI Mogul. Pick a part from
// the palette, click cells to place it (click again to remove), watch the
// score panel explain — in real engineering terms — why the layout works
// or doesn't. Apply to commission it.

import { game, showModal, closeModal, toast, esc, renderAll } from './ui.js';
import { DESIGNS, GRID_W, GRID_H, scoreDesign, placedCount } from '../core/design.js';
import { applyFacilityDesign } from '../core/engine.js';

let dz = null;   // { phase, cells, sel }

export function openDesigner() {
  const s = game.s;
  const def = DESIGNS[s.phase];
  if (!def) { toast('The garage is beyond optimization. It has a vibe.', 'err'); return; }
  dz = {
    phase: s.phase,
    cells: { ...((s.facDesign && s.facDesign[s.phase]) || {}) },
    sel: Object.keys(def.parts)[0],
  };
  render();
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
    cellsHtml += `<button class="dz-cell ${part ? 'filled' : ''}" data-act="dzCell" data-arg="${i}"
      ${part ? `title="${esc(def.parts[part]?.name || part)} — click to remove"` : ''}>${part ? def.parts[part].icon : ''}</button>`;
  }

  const lines = res.lines.map(l => {
    const cls = l.trap ? 'bad' : l.pts > 0 ? 'good' : 'faint';
    return `<div class="stat-row"><span class="k small">${l.trap ? '⚠ ' : ''}${esc(l.txt)}</span>
      <span class="stat-v ${cls}">${l.pts > 0 ? '+' : ''}${l.pts}${l.max ? ` / ${l.max}` : ''}</span></div>`;
  }).join('');

  const f = res.score >= 50 ? (res.score - 50) / 50 : (res.score - 50) / 50;
  const fxTxt = `PUE ${res.fx.pue <= 0 ? '' : '+'}${res.fx.pue.toFixed(2)} · MFU ${res.fx.mfu >= 0 ? '+' : ''}${(res.fx.mfu * 100).toFixed(1)}% · power bill ×${res.fx.elec.toFixed(2)}`;

  showModal(`<h2>🏗️ ${def.icon} ${esc(def.name)} — floor plan</h2>
    <p class="muted small">${esc(def.blurb)}</p>
    <div class="row" style="gap:5px; flex-wrap:wrap; margin-bottom:8px">${palette}</div>
    ${sunward ? '<div class="small" style="display:flex; justify-content:space-between"><span class="gold">☀️ SUN — high flux</span><span class="cyan">deep space, 2.7 K →</span></div>' : ''}
    <div class="dz-grid">${cellsHtml}</div>
    <div class="row" style="justify-content:space-between; margin-top:8px">
      <span>Design score: <b class="${res.score >= 65 ? 'good' : res.score >= 45 ? '' : 'bad'}" style="font-size:18px">${res.score}</b> / 100</span>
      <span class="faint small">${fxTxt}</span>
    </div>
    <div style="max-height:170px; overflow-y:auto; margin-top:4px; padding:6px 8px; background:var(--card2); border-radius:8px">${lines}</div>
    <div class="actions">
      <button class="act sub" data-act="dzClear">Clear</button>
      <button class="act sub" data-act="closeModal">Cancel</button>
      <button class="act big" data-act="dzApply">✔ Commission this layout</button>
    </div>`, 'wide');
  void f;
}

export const dzHandlers = {
  designOpen: () => openDesigner(),
  dzPick: (id) => { if (dz) { dz.sel = id; render(); } },
  dzCell: (arg) => {
    if (!dz) return;
    const i = +arg;
    const def = DESIGNS[dz.phase];
    if (dz.cells[i]) delete dz.cells[i];
    else if (dz.sel && placedCount(dz.cells, dz.sel) < def.parts[dz.sel].n) dz.cells[i] = dz.sel;
    else toast('No more of those — remove one first, or pick another part.', 'err');
    render();
  },
  dzClear: () => { if (dz) { dz.cells = {}; render(); } },
  dzApply: () => {
    if (!dz) return;
    const r = applyFacilityDesign(game.s, dz.phase, dz.cells);
    toast(r.msg, r.ok ? 'mile' : 'err');
    if (r.ok) { closeModal(); dz = null; renderAll(); }
  },
};
