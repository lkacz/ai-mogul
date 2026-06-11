// Smoke test: import all modules (incl. UI) under a minimal DOM stub,
// exercise tab builders against real game states, check for crashes.
// Run: node test/smoke.mjs

// ── Minimal DOM stub ──────────────────────────────────────────────
const fakeEl = () => ({
  innerHTML: '', textContent: '', style: {}, dataset: {}, classList: {
    add() {}, remove() {}, contains() { return false; },
  },
  appendChild() {}, remove() {}, querySelector() { return null; },
  querySelectorAll() { return []; }, addEventListener() {},
  firstElementChild: null, children: [], disabled: false, value: '',
  select() {},
});
globalThis.document = {
  getElementById: () => fakeEl(),
  createElement: () => fakeEl(),
  addEventListener() {},
  querySelectorAll: () => [],
  hidden: false,
};
globalThis.window = { addEventListener() {} };
globalThis.localStorage = { getItem: () => null, setItem() {}, removeItem() {} };
globalThis.performance = { now: () => Date.now() };

let failures = 0;
const check = (name, fn) => {
  try { fn(); console.log(`  ✅ ${name}`); }
  catch (e) { failures++; console.log(`  ❌ ${name}: ${e.message}\n${e.stack.split('\n')[1]}`); }
};

console.log('Importing modules…');
const { defaultState, selectors, serialize, deserialize } = await import('../js/core/state.js');
const { DILEMMAS } = await import('../js/core/dilemmas.js');
const { DESIGNS, scoreDesign } = await import('../js/core/design.js');
const { drawDesignScene, PART_DRAW } = await import('../js/ui/designparts.js');
const sceneMod = await import('../js/ui/scene.js');
const E = await import('../js/core/engine.js');
const ui = await import('../js/ui/ui.js');
const { TABS, ACTIONS } = await import('../js/ui/tabs.js');
console.log(`  ✅ all modules imported (${TABS.length} tabs, ${Object.keys(ACTIONS).length} actions)`);

// ── Build every tab against several game states ───────────────────
const states = { fresh: defaultState() };

// mid-game state: simulate 1500h with light bot play
{
  const s = defaultState();
  for (let h = 0; h < 1500; h++) {
    if (h % 3 === 0 && s.money < 50000) E.doGig(s);
    if (s.runs.length === 0) { const { N, D } = E.suggestRun(s); E.startRun(s, N, D, true); }
    if (s.money > 3000 && h < 100) E.buyGpu(s, 'rtx3060', 1);
    E.takeFunding(s, 'seed');
    if (s.money > 50e3) E.buyFacility(s, 1);
    if (s.money > 30e3) E.buyGpu(s, 'a100', 2);
    if (s.phase >= 1) { E.hire(s, 'researcher', 1); E.hire(s, 'sales', 1); }
    if (s.money > 10e3 && s.dataTier === 0) E.buyDataset(s, 'curated');
    for (const id of ['bpe', 'mixedprec', 'kernels', 'lora', 'zero', 'flash']) E.buyResearch(s, id);
    E.step(s, 1);
  }
  states.mid = s;
  if (!(s.models.length > 0)) { failures++; console.log('  ❌ mid-state has no models'); }
}

// won state
{
  const s = JSON.parse(JSON.stringify(states.mid));
  s.bestCap = 101; s.won = true;
  s.models.push({ id: 'agi1', name: 'Mogul-AGI', N: 1e13, D: 2e14, cap: 101, physC: 1e28, deployed: false, trainedH: s.simHours });
  states.won = s;
}

// post-singularity state: Omega Lattice, full tree, cap 300+
{
  const { RESEARCH } = await import('../js/core/research.js');
  const s = JSON.parse(JSON.stringify(states.won));
  s.phase = 7; s.bestCap = 310; s.singularity = true; s.singularityAt = 9000;
  s.wonAt = 6000; s.money = 1e15; s.rp = 1e12;
  s.research = RESEARCH.map(r => r.id);
  s.gpus = { dysonNode: 5e8, omegaCore: 1e9 };
  s.dataTier = 6;
  s.models.push({ id: 'sing1', name: 'Mogul-Ω', N: 1e19, D: 2e20, cap: 310, physC: 1e41, deployed: false, trainedH: 9000 });
  states.post = s;
}

for (const [label, s] of Object.entries(states)) {
  console.log(`Tab builds — ${label} state:`);
  ui.game.s = s;
  const sel = selectors(s);
  ui.game.sel = sel;
  for (const tab of TABS) {
    check(`${label}/${tab.id}.sig+build+update`, () => {
      tab.sig && tab.sig(s, sel);
      const html = tab.build(s, sel);
      if (typeof html !== 'string' || html.length < 50) throw new Error('suspiciously empty build output');
      tab.update && tab.update(s, sel);
    });
  }
}

// ── Save round-trip ───────────────────────────────────────────────
check('save/load round-trip', () => {
  const json = serialize(states.mid);
  const back = deserialize(json);
  if (back.money !== states.mid.money) throw new Error('money mismatch');
  if (back.models.length !== states.mid.models.length) throw new Error('models mismatch');
  // sim continues after load
  E.step(back, 1);
});

// ── Engine guards ─────────────────────────────────────────────────
check('engine rejects bad input', () => {
  const s = defaultState();
  if (E.startRun(s, 1e20, 2e21).ok) throw new Error('VRAM check failed');
  if (E.buyGpu(s, 'h100', 1).ok) throw new Error('phase gate failed');
  if (E.buyGpu(s, 'rtx4090', 99).ok) throw new Error('money check failed');
  if (E.takeFunding(s, 'seriesA').ok) throw new Error('funding order check failed');
  if (E.buyResearch(s, 'moe').ok) throw new Error('era gate failed');
  // the time wall: a run that needs millennia even at the batch-size limit
  const st = defaultState();
  st.dataTier = 5; st.gpus = { px1: 1e6 };
  const r = E.startRun(st, 1e15, 2e16);
  if (r.ok || !/batch-size wall/.test(r.msg)) throw new Error('time-wall check failed: ' + r.msg);
});

check('all dilemmas resolve both ways, fallout fires cleanly', () => {
  for (const d of DILEMMAS) {
    // accept path + fast-forward the fallout
    const sa = defaultState();
    sa.phase = d.minPhase; sa.bestCap = d.reqCap || 0;
    sa.pendingDilemma = { id: d.id, realAt: 0 };
    if (!E.resolveDilemma(sa, true).ok) throw new Error(`${d.id} accept failed`);
    sa.simHours = 1e6; E.step(sa, 1);
    if (sa.fallout.length) throw new Error(`${d.id} fallout did not fire`);
    if (!Number.isFinite(sa.money) || !Number.isFinite(sa.rep)) throw new Error(`${d.id} NaN after fallout`);
    if (!(sa.integrity < 70)) throw new Error(`${d.id} accept should cost integrity`);
    // decline path
    const sd = defaultState();
    sd.pendingDilemma = { id: d.id, realAt: 0 };
    if (!E.resolveDilemma(sd, false).ok) throw new Error(`${d.id} decline failed`);
    if (!(sd.integrity > 70)) throw new Error(`${d.id} decline should build integrity`);
  }
});

check('facility designs: all tiers score, fx bounded, neutral when unset', () => {
  for (const phase of Object.keys(DESIGNS).map(Number)) {
    const empty = scoreDesign(phase, {});
    if (!(empty.score >= 0 && empty.score <= 100)) throw new Error(`phase ${phase} empty score broken`);
    // a deliberately decent layout: scatter parts near their friends
    const def = DESIGNS[phase];
    const cells = {};
    let i = 13;
    for (const [pid, p] of Object.entries(def.parts)) {
      for (let k = 0; k < Math.min(p.n, 3); k++) { cells[i] = pid; i += 1; }
      i += 2;
    }
    const res = scoreDesign(phase, cells);
    if (!Number.isFinite(res.score)) throw new Error(`phase ${phase} score NaN`);
    if (res.fx.pue < -0.13 || res.fx.mfu > 0.026 || res.fx.elec < 0.91)
      throw new Error(`phase ${phase} fx out of bounds: ${JSON.stringify(res.fx)}`);
    // apply through the engine
    const st = defaultState(); st.phase = phase;
    const r = E.applyFacilityDesign(st, phase, cells);
    if (!r.ok) throw new Error(`phase ${phase} apply failed: ${r.msg}`);
    if (!st.facDesignFx[phase]) throw new Error(`phase ${phase} fx not stored`);
    E.step(st, 1);
  }
  // neutrality: an undesigned state computes identical economics
  const a = defaultState(), b = defaultState();
  b.facDesignFx = {};
  if (selectors(a).elecPerHour !== selectors(b).elecPerHour) throw new Error('undesigned state not neutral');
});

check('designer canvas renderers: every part of every facility draws', () => {
  // canvas code otherwise only runs in a real browser — exercise all part
  // renderers and the scene composer against a no-op 2d-context stub
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get: (o, k) => {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      return typeof o[k] !== 'undefined' ? o[k] : () => {};
    },
    set: () => true,
  });
  for (const phase of Object.keys(DESIGNS).map(Number)) {
    const def = DESIGNS[phase];
    const cells = {};
    let i = 13;
    for (const pid of Object.keys(def.parts)) {
      if (!PART_DRAW[pid]) throw new Error(`phase ${phase}: no renderer for part "${pid}"`);
      cells[i] = pid; i += 2;
    }
    const res = scoreDesign(phase, cells);
    for (const t of [0, 0.7, 3.3]) {
      drawDesignScene(ctx, phase, cells, res.marks, t, 13, Object.keys(def.parts)[0]);
    }
  }
});

check('quip decks: no repeats until a pool is exhausted, no boundary repeat', () => {
  const arr = Array.from({ length: 37 }, (_, i) => 'line' + i);
  let last = null;
  for (let cycle = 0; cycle < 5; cycle++) {
    const seen = new Set();
    for (let i = 0; i < arr.length; i++) {
      const q = sceneMod.drawQuip(arr);
      if (seen.has(q)) throw new Error(`repeat within a cycle: ${q}`);
      if (i === 0 && q === last) throw new Error('new shuffle opened with the previous line');
      seen.add(q);
      last = q;
    }
    if (seen.size !== arr.length) throw new Error('cycle did not exhaust the pool');
  }
});

check('fractional steps are stable', () => {
  const s = defaultState();
  E.startRun(s, 1e7, 2e8, true);
  for (let i = 0; i < 4000; i++) E.step(s, 0.25);
  if (!Number.isFinite(s.money) || !Number.isFinite(s.rp)) throw new Error('NaN after fractional steps');
  if (s.models.length < 1) throw new Error('run never completed');
});

console.log('─'.repeat(50));
if (failures) { console.log(`❌ ${failures} failure(s)`); process.exit(1); }
console.log('✅ SMOKE PASS');
process.exit(0);  // module-level intervals (quote rotation) would keep node alive
