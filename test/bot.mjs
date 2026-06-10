// Scripted greedy playthrough: validates that the economy never dead-ends and
// AGI is reachable in a reasonable number of sim-hours. Run: node test/bot.mjs

import { defaultState, selectors } from '../js/core/state.js';
import * as E from '../js/core/engine.js';
import { GPUS, FACILITIES, DATASETS, FUNDING, STAFF } from '../js/core/data.js';
import { RESEARCH } from '../js/core/research.js';
import { MAIN_QUEST } from '../js/core/milestones.js';
import { fmtNum, fmtMoney, fmtFlops } from '../js/core/util.js';

const MAX_HOURS = 200_000;
const s = defaultState();
const log = [];
const mark = (txt) => {
  const y = (s.simHours / 8760).toFixed(2);
  log.push(`[t=${String(Math.round(s.simHours)).padStart(6)}h  y${y}] ${txt}`);
};

let seenMilestones = new Set();
let lastPhase = 0;

function bestBuyableGpu() {
  // best FLOPS/$ among available, preferring higher tiers when affordable in bulk
  let best = null;
  for (const g of GPUS) {
    if (g.phase > s.phase) continue;
    if (g.research && !s.research.includes(g.research)) continue;
    if (!best || g.tflops > best.tflops) best = g;
  }
  return best;
}

function botAct(hour) {
  const sel = selectors(s);

  // 1. Gigs: early game, "click" every 3 ticks while poor
  if (s.money < 50_000 && hour % 3 === 0) E.doGig(s);

  // 2. Funding as soon as available
  for (const f of FUNDING) {
    if (!s.funding.includes(f.id)) { E.takeFunding(s, f.id); break; }
  }

  // 3. Facility upgrade when we can afford it + 30% buffer
  const next = FACILITIES[s.phase + 1];
  if (next && s.money > next.cost * 1.3) E.buyFacility(s, s.phase + 1);

  // 4. Datasets when affordable with buffer
  const nd = DATASETS[s.dataTier + 1];
  if (nd && (!nd.research || s.research.includes(nd.research)) && s.money > nd.cost * 1.5)
    E.buyDataset(s, nd.id);

  // 5. Research: buy any affordable item (cheapest first)
  const candidates = RESEARCH
    .filter(r => !s.research.includes(r.id) && r.era <= s.phase &&
      (!r.deps || r.deps.every(d => s.research.includes(d))) &&
      (!r.reqCap || s.bestCap >= r.reqCap))
    .sort((a, b) => a.rp - b.rp);
  for (const r of candidates) {
    if (s.rp >= r.rp && (!r.money || s.money > r.money * 2)) E.buyResearch(s, r.id);
  }

  // 6. GPUs: spend up to 60% of cash on the best available GPU
  const g = bestBuyableGpu();
  if (g) {
    const budget = s.money * 0.6;
    const sel2 = selectors(s);
    const n = Math.min(
      Math.floor(budget / g.price),
      sel2.fac.slots - sel2.gpuCount,
      Math.floor((sel2.fac.powerW - sel2.watts) / g.watts));
    if (n > 0 && g.price * n > s.money * 0.1) E.buyGpu(s, g.id, n);
  }

  // 7. Sell obsolete GPUs when slots are >90% full and a better GPU exists
  const sel3 = selectors(s);
  if (sel3.gpuCount > sel3.fac.slots * 0.9 && g) {
    for (const [id, n] of Object.entries(s.gpus)) {
      const old = GPUS.find(x => x.id === id);
      if (old && old.tflops < g.tflops / 4 && n > 0) E.sellGpu(s, id, n);
    }
  }

  // 8. Staff: keep hiring up to facility cap if net income healthy
  if (sel3.netPerHour > sel3.salaries * 0.5 || s.money > 100 * sel3.salaries + 50000) {
    const cap = sel3.fac.staffMax;
    const want = {
      engineer: Math.ceil(cap * 0.3), researcher: Math.ceil(cap * 0.4),
      ops: Math.ceil(cap * 0.15), sales: Math.ceil(cap * 0.15),
    };
    for (const [role, target] of Object.entries(want)) {
      const wage = STAFF.find(x => x.id === role).wage;
      while (s.staff[role] < target && selectors(s).staffCount < cap &&
             s.money > wage * 400) {
        if (!E.hire(s, role, 1).ok) break;
      }
    }
  }

  // 9. Allocation: training-heavy; more inference once deployed
  const deployed = s.models.some(m => m.deployed);
  s.alloc = deployed ? { train: 0.62, inf: 0.23, res: 0.15 }
                     : { train: 0.85, inf: 0.0, res: 0.15 };

  // 10. Training: keep a run going at the suggested config
  if (s.runs.length < selectors(s).maxRuns) {
    const { N, D } = E.suggestRun(s);
    E.startRun(s, N, D, true);
  }

  // 11. Publish a paper if rep is gating funding
  const nextFund = FUNDING.find(f => !s.funding.includes(f.id));
  if (nextFund && s.rep < nextFund.reqRep && s.rp > E.paperCost(s) * 3) E.publishPaper(s);
}

// ── Run ───────────────────────────────────────────────────────────
let h = 0;
for (; h < MAX_HOURS; h++) {
  botAct(h);
  E.step(s, 1);

  if (!Number.isFinite(s.money) || !Number.isFinite(s.rp) || !Number.isFinite(s.bestCap)) {
    mark(`❌ NaN/Infinity detected! money=${s.money} rp=${s.rp} cap=${s.bestCap}`);
    break;
  }
  for (const m of MAIN_QUEST) {
    if (s.milestones[m.id] && !seenMilestones.has(m.id)) {
      seenMilestones.add(m.id);
      const sel = selectors(s);
      mark(`🏁 ${m.id.padEnd(10)} cap=${s.bestCap.toFixed(1).padStart(5)} $${fmtNum(s.money).padStart(7)} rp=${fmtNum(s.rp).padStart(7)} rep=${s.rep.toFixed(0).padStart(3)} gpus=${fmtNum(sel.gpuCount)} ${fmtFlops(sel.flops)}`);
    }
  }
  if (s.phase !== lastPhase) { lastPhase = s.phase; }
  if (s.won) { mark(`🌟 AGI ACHIEVED`); break; }
}

console.log(log.join('\n'));
console.log('─'.repeat(70));
const sel = selectors(s);
console.log(`End: t=${Math.round(s.simHours)}h (${(s.simHours / 8760).toFixed(2)} sim-years)  won=${s.won}`);
console.log(`cap=${s.bestCap.toFixed(1)} money=${fmtMoney(s.money)} rp=${fmtNum(s.rp)} rep=${s.rep.toFixed(0)}`);
console.log(`phase=${FACILITIES[s.phase].name} gpus=${fmtNum(sel.gpuCount)} flops=${fmtFlops(sel.flops)} algoEff=${fmtNum(sel.algoEff)}`);
console.log(`models=${s.models.length} lifetimeFLOP=${s.stats.flops.toExponential(2)} research=${s.research.length}/${RESEARCH.length}`);
console.log(`milestones: ${Object.keys(s.milestones).length}, main quest: ${seenMilestones.size}/${MAIN_QUEST.length}`);

const failed = [];
if (!s.won) failed.push(`AGI not reached within ${MAX_HOURS} sim-hours`);
if (s.won && s.simHours < 5_000) failed.push(`AGI too fast (${Math.round(s.simHours)}h) — pacing broken`);
if (failed.length) { console.log('❌ FAIL: ' + failed.join('; ')); process.exit(1); }
console.log('✅ PASS');
