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
const { IMPACTS, IMPACT_BY_ID, queueImpacts, IMPACT_QUEUE_MAX } = await import('../js/core/impacts.js');
const { IMPACT_SCENES, drawBroadcast, drawVeil, DILEMMA_VIZ, dilemmaScene } = await import('../js/ui/impactviz.js');
const { generatePaper } = await import('../js/ui/papergen.js');
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

check('all dilemmas: both options resolve; every outcome applies cleanly', () => {
  for (const d of DILEMMAS) {
    if (!d.options || d.options.length !== 2) throw new Error(`${d.id}: needs exactly 2 options`);
    for (let oi = 0; oi < 2; oi++) {
      const st = defaultState();
      st.phase = d.minPhase; st.bestCap = d.reqCap || 0;
      st.pendingDilemma = { id: d.id, realAt: 0 };
      const r = E.resolveDilemma(st, oi);
      if (!r.ok) throw new Error(`${d.id}[${oi}] failed: ${r.msg}`);
      if (st.fallout.length !== 1 || !st.fallout[0].atReal) throw new Error(`${d.id}[${oi}] no real-time consequence scheduled`);
      if (!Number.isFinite(st.money) || !Number.isFinite(st.integrity)) throw new Error(`${d.id}[${oi}] NaN on resolve`);
      // apply EVERY possible outcome, not just the sampled one
      for (const out of d.options[oi].outcomes) {
        const st2 = defaultState();
        E.applyConsequence(st2, { txt: out.txt, rep: out.rep, integrity: out.integrity,
          money: out.moneyBase || 0, rpGain: out.rpBase || 0, buff: out.buff, atReal: 1 });
        if (!Number.isFinite(st2.money) || !Number.isFinite(st2.rep) || !Number.isFinite(st2.integrity)) {
          throw new Error(`${d.id}[${oi}] outcome breaks state: ${out.txt.slice(0, 40)}`);
        }
        E.step(st2, 1);
      }
    }
  }
});

check('impact news: well-formed, tone-balanced, queue paces correctly', () => {
  const ids = new Set();
  const tones = { good: 0, bad: 0, mixed: 0 };
  for (const n of IMPACTS) {
    if (ids.has(n.id)) throw new Error(`duplicate id ${n.id}`);
    ids.add(n.id);
    if (!(n.cap >= 4 && n.cap <= 290)) throw new Error(`${n.id}: cap out of range`);
    if (!(n.tone in tones)) throw new Error(`${n.id}: bad tone ${n.tone}`);
    tones[n.tone]++;
    if (!IMPACT_SCENES[n.viz]) throw new Error(`${n.id}: no scene renderer "${n.viz}"`);
    for (const f of ['tag', 'title', 'body', 'real']) {
      if (typeof n[f] !== 'string' || n[f].length < (f === 'tag' ? 3 : 4)) throw new Error(`${n.id}: missing ${f}`);
    }
    if (!Array.isArray(n.wire) || n.wire.length < 2 || n.wire.some(w => typeof w !== 'string' || w.length < 6)) {
      throw new Error(`${n.id}: needs 2+ wire crawl lines`);
    }
  }
  // the world answers in all registers — no tone may dominate or vanish
  for (const [tone, c] of Object.entries(tones)) {
    if (c < IMPACTS.length * 0.2) throw new Error(`tone "${tone}" underrepresented: ${c}/${IMPACTS.length}`);
  }
  // queue: only unlocked stories, ascending cap, no dupes on re-queue
  const s = defaultState();
  s.bestCap = 25;
  queueImpacts(s);
  if (!s.impactQueue.length) throw new Error('nothing queued at cap 25');
  if (s.impactQueue.some(id => IMPACT_BY_ID[id].cap > 25)) throw new Error('queued beyond bestCap');
  const caps = s.impactQueue.map(id => IMPACT_BY_ID[id].cap);
  if (caps.some((c, i) => i && c < caps[i - 1])) throw new Error('queue not ascending');
  const len = s.impactQueue.length;
  queueImpacts(s);
  if (s.impactQueue.length !== len) throw new Error('re-queue duplicated entries');
  // seen entries never return; a giant jump banks at most IMPACT_QUEUE_MAX,
  // and what it retires lands in the Chronicle as unaired wire briefs
  s.impactsSeen.push(s.impactQueue.shift());
  s.bestCap = 300;
  queueImpacts(s);
  if (s.impactQueue.length > IMPACT_QUEUE_MAX) throw new Error('queue not trimmed');
  if (s.impactQueue.some(id => s.impactsSeen.includes(id))) throw new Error('seen story re-queued');
  if (!(s.impactLog || []).length) throw new Error('trimmed stories not logged to the Chronicle');
  if (s.impactLog.some(e => e.live !== 0)) throw new Error('retired story logged as live');
  // engine integration: the mid-game bot run queued some world reports
  if (!(states.mid.impactQueue || []).length) throw new Error('mid-state queued no impacts');
});

check('impact scenes: every renderer draws on the 2d-context stub', () => {
  const grad = { addColorStop() {} };
  const ctx = new Proxy({}, {
    get: (o, k) => {
      if (k === 'createRadialGradient' || k === 'createLinearGradient') return () => grad;
      if (k === 'measureText') return () => ({ width: 10 });
      return typeof o[k] !== 'undefined' ? o[k] : () => {};
    },
    set: () => true,
  });
  for (const [key, draw] of Object.entries(IMPACT_SCENES)) {
    for (const tone of ['good', 'bad', 'mixed']) {
      for (const t of [0, 0.7, 3.3, 11.8]) draw(ctx, t, '#34d399', tone);
    }
    if (!key) throw new Error('unreachable');
  }
  // the broadcast post-process (static burst, scanlines, wire crawl) too
  for (const t of [0, 0.05, 0.3, 2.4]) drawBroadcast(ctx, t, 'WIRES: test +++', '#34d399');
  drawVeil(ctx);
});

check('paper generator: well-formed, era-aware, varied, career-length', () => {
  for (const [label, st] of Object.entries(states)) {
    const titles = new Set();
    for (let i = 0; i < 6; i++) {
      const p = generatePaper(st);
      const full = [p.venue, p.title, p.authors, ...p.chunks.map(c => c.t)].join(' ');
      if (/undefined|\[object|\{\w+\}/.test(full)) throw new Error(`${label}: unfilled slot in "${full.slice(0, 120)}"`);
      if (!p.title || p.title.length < 8) throw new Error(`${label}: bad title "${p.title}"`);
      if (!p.venue || !p.authors.includes('Mogul')) throw new Error(`${label}: bad venue/authors`);
      if (p.chunks.length < 22 || p.chunks.length > 110) throw new Error(`${label}: ${p.chunks.length} chunks out of range`);
      if (!p.chunks.some(c => c.head)) throw new Error(`${label}: no section heads`);
      titles.add(p.title);
    }
    if (titles.size < 4) throw new Error(`${label}: titles too repetitive (${titles.size}/6 unique)`);
  }
  // a long career writes long papers, capped at ~100 keystrokes
  const vet = JSON.parse(JSON.stringify(states.mid));
  vet.stats.papers = 30;
  const long = generatePaper(vet);
  if (long.chunks.length < 85) throw new Error(`veteran paper too short: ${long.chunks.length}`);
});

check('dilemma scenes: every dilemma has an explicit, valid establishing shot', () => {
  for (const [id, key] of Object.entries(DILEMMA_VIZ)) {
    if (!IMPACT_SCENES[key]) throw new Error(`mapping ${id} → unknown scene "${key}"`);
  }
  for (const d of DILEMMAS) {
    if (!DILEMMA_VIZ[d.id]) throw new Error(`${d.id}: no explicit scene mapping (add it to DILEMMA_VIZ)`);
    if (!IMPACT_SCENES[dilemmaScene(d)]) throw new Error(`${d.id}: resolves to unknown scene`);
  }
  // the fallback path stays valid for dilemmas added without a mapping
  for (let ph = 0; ph <= 9; ph++) {
    if (!IMPACT_SCENES[dilemmaScene({ id: '__new__', minPhase: ph })]) {
      throw new Error(`phase ${ph} fallback resolves to unknown scene`);
    }
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
