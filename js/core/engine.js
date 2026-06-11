// Simulation engine: step(state, hours) advances the world; action functions
// mutate state in response to player input. All pure JS — no DOM.

import { BAL, capabilityFor, trainCompute, optimalTokens } from './balance.js';
import { GPUS, FACILITIES, DATASETS, FUNDING, RIVAL_ASYMPTOTE } from './data.js';
import { RESEARCH_BY_ID } from './research.js';
import { MILESTONES, MILESTONE_BY_ID } from './milestones.js';
import { EVENTS, NEWS_FLAVOR, FACTS } from './events.js';
import { selectors, GPU_BY_ID, DATASET_BY_ID, STAFF_BY_ID, gpuPrice } from './state.js';
import { clamp, uid, fmtNum } from './util.js';

export function pushNews(s, txt) {
  s.news.push({ h: s.simHours, txt });
  if (s.news.length > 80) s.news.splice(0, s.news.length - 80);
}

// ── Main tick: advance the sim by `hours` (call with 1 normally) ──
export function step(s, hours = 1) {
  const sel = selectors(s);
  const dt = hours * 3600; // seconds

  // 1. Training progress (each run is capped at N × ppRate FLOP/s —
  //    you can't feed a small model with an arbitrarily large cluster)
  if (s.runs.length > 0 && sel.trainRate > 0) {
    const perRun = sel.trainRate / s.runs.length;
    for (const r of s.runs) {
      const rate = Math.min(perRun, r.N * sel.ppRate);
      r.physDone += rate * dt;
      s.stats.flops += rate * dt;
    }
  }
  // finalize completed runs
  for (let i = s.runs.length - 1; i >= 0; i--) {
    const r = s.runs[i];
    if (r.physDone >= r.physNeed) {
      s.runs.splice(i, 1);
      finalizeRun(s, sel, r);
    }
  }

  // 2. Research points
  s.rp += sel.rpPerHour * hours;

  // 3. Market adoption chases demand potential (sales staff accelerate it)
  s.adoption = Math.max(0,
    s.adoption + (sel.potential - s.adoption) * Math.min(1, sel.adoptRate * hours));

  // 4. Revenue & costs
  const rev = sel.revenue * dt;
  s.money += rev;
  s.stats.apiRevenue += rev;
  s.money -= sel.costPerHour * hours;
  s.stats.elecSpent += sel.elecPerHour * hours;
  s.stats.peakMoney = Math.max(s.stats.peakMoney, s.money);

  // 4. Rivals creep toward (but never reach) AGI
  for (const r of s.rivals) {
    r.cap = Math.min(RIVAL_ASYMPTOTE - 0.5,
      r.cap + r.rate * (1 - r.cap / RIVAL_ASYMPTOTE) * hours);
  }

  // 5. Random events + ambient news/facts
  if (Math.random() < BAL.EVENT_CHANCE_PER_H * hours) fireEvent(s, sel);
  if (Math.random() < 0.002 * hours) {
    const pool = Math.random() < 0.5 ? NEWS_FLAVOR : FACTS;
    pushNews(s, pool[(Math.random() * pool.length) | 0]);
  }

  // 6. Expire buffs
  s.buffs = s.buffs.filter(b => b.untilH > s.simHours);

  // 7. Milestones
  checkMilestones(s);

  s.simHours += hours;
}

function finalizeRun(s, sel, r) {
  const noise = 0.97 + Math.random() * 0.06;
  // lrBonus: earned in the Learning-Rate Rider minigame at launch
  const cap = capabilityFor(r.physNeed * (r.lrBonus || 1), sel.algoEff, r.dataQ, r.N, r.D) * noise;
  const model = {
    id: uid(), name: r.name, N: r.N, D: r.D, cap,
    physC: r.physNeed, deployed: false, trainedH: s.simHours,
  };
  s.models.push(model);
  s.stats.tokens += r.D;
  const isBest = cap > s.bestCap;
  if (isBest) {
    s.rep = Math.min(100, s.rep + Math.max(0, (cap - s.bestCap)) * BAL.REP_PER_CAP);
    s.bestCap = cap;
  }
  pushNews(s, `✅ ${r.name} finished training — capability ${cap.toFixed(1)}${isBest ? ' (new best!)' : ''}.`);
  if (s.autoDeploy && isBest) deployModel(s, model.id);
  if (!s.won && s.bestCap >= BAL.AGI_CAP) {
    s.won = true; s.wonAt = s.simHours;
    pushNews(s, '🌟 AGI ACHIEVED. The world will never be the same. New research glows in the Beyond Silicon era.');
  }
  if (!s.singularity && s.bestCap >= BAL.SINGULARITY_CAP) {
    s.singularity = true; s.singularityAt = s.simHours;
    pushNews(s, '🌌 THE SINGULARITY. The model\'s next thought takes longer to describe than to think.');
  }
  // AutoML: respawn the same config if unlocked & enabled
  if (s.autoRetrain && sel.fx.unlocks.has('autoRetrain')) {
    const res = startRun(s, r.N, r.D, true);
    if (res.ok) pushNews(s, `🔁 AutoML respawned training at ${fmtNum(r.N)} params.`);
  }
}

function fireEvent(s, sel) {
  const pool = EVENTS.filter(e =>
    s.phase >= e.minPhase && (e.maxPhase === undefined || s.phase <= e.maxPhase));
  const total = pool.reduce((a, e) => a + e.weight, 0);
  let roll = Math.random() * total;
  let ev = pool[0];
  for (const e of pool) { roll -= e.weight; if (roll <= 0) { ev = e; break; } }
  let result;
  if (ev.buff) {
    // don't stack the same buff
    if (s.buffs.some(b => b.id === ev.id)) return;
    s.buffs.push({
      id: ev.id, label: ev.buff.label,
      demand: ev.buff.demand, elec: ev.buff.elec, gpuPrice: ev.buff.gpuPrice,
      untilH: s.simHours + ev.buff.hours,
    });
  } else if (ev.apply) {
    result = ev.apply(s, sel);
    if (result === null) return;
  }
  const txt = ev.text(s, result);
  pushNews(s, txt);
  if (ev.dramatic) s.lastDrama = { txt, realAt: Date.now() };  // UI pops a toast
}

function checkMilestones(s) {
  for (const m of MILESTONES) {
    if (s.milestones[m.id]) continue;
    if (!m.check(s)) continue;
    s.milestones[m.id] = s.simHours;
    const r = m.reward || {};
    if (r.money) s.money += r.money;
    if (r.rp) s.rp += r.rp;
    if (r.rep) s.rep = Math.min(100, s.rep + r.rep);
    pushNews(s, m.news ? '🏁 ' + m.news : `🏁 Milestone: ${m.name}.`);
    s.lastMilestone = m.id; // UI hook for toasts
  }
}

// ── Player actions ────────────────────────────────────────────────
const ok = (msg) => ({ ok: true, msg });
const err = (msg) => ({ ok: false, msg });

export function buyGpu(s, id, n = 1) {
  const g = GPU_BY_ID[id]; if (!g) return err('Unknown GPU.');
  const sel = selectors(s);
  if (g.phase > s.phase) return err('Not available at this facility tier.');
  if (g.research && !s.research.includes(g.research)) return err('Requires research.');
  const cost = gpuPrice(s, sel, g) * n;
  if (s.money < cost) return err('Not enough cash.');
  if (sel.gpuCount + n > sel.fac.slots) return err('Not enough rack slots — upgrade your facility.');
  if (sel.watts + g.watts * n > sel.fac.powerW) return err('Power budget exceeded — upgrade your facility.');
  s.money -= cost; s.stats.spent += cost;
  s.gpus[id] = (s.gpus[id] || 0) + n;
  return ok(`Bought ${n}× ${g.name}.`);
}

export function maxAffordableGpu(s, id) {
  const g = GPU_BY_ID[id]; if (!g) return 0;
  const sel = selectors(s);
  const byMoney = Math.floor(s.money / gpuPrice(s, sel, g));
  const bySlots = sel.fac.slots - sel.gpuCount;
  const byPower = Math.floor((sel.fac.powerW - sel.watts) / g.watts);
  return Math.max(0, Math.min(byMoney, bySlots, byPower));
}

export function sellGpu(s, id, n = 1) {
  const g = GPU_BY_ID[id]; if (!g || !(s.gpus[id] >= n)) return err('Not enough units.');
  s.gpus[id] -= n;
  if (s.gpus[id] === 0) delete s.gpus[id];
  const refund = g.price * BAL.SELL_RATIO * n;
  s.money += refund;
  return ok(`Sold ${n}× ${g.name} for ${fmtNum(refund)}.`);
}

export function buyFacility(s, phaseIdx) {
  if (phaseIdx !== s.phase + 1) return err('Upgrade one tier at a time.');
  const f = FACILITIES[phaseIdx]; if (!f) return err('No such facility.');
  if (s.money < f.cost) return err('Not enough cash.');
  s.money -= f.cost; s.stats.spent += f.cost;
  s.phase = phaseIdx;
  pushNews(s, `🏗️ ${f.story}`);
  return ok(`Moved into the ${f.name}!`);
}

export function buyDataset(s, id) {
  const idx = DATASETS.findIndex(d => d.id === id);
  if (idx < 0) return err('Unknown dataset.');
  if (idx <= s.dataTier) return err('Already owned.');
  if (idx !== s.dataTier + 1) return err('Buy the previous tier first.');
  const d = DATASETS[idx];
  if (d.research && !s.research.includes(d.research)) return err('Requires research.');
  if (s.money < d.cost) return err('Not enough cash.');
  s.money -= d.cost; s.stats.spent += d.cost;
  s.dataTier = idx;
  pushNews(s, `📚 Acquired dataset: ${d.name} (${fmtNum(d.tokens)} tokens).`);
  return ok(`Acquired ${d.name}.`);
}

export function hire(s, id, n = 1) {
  if (!STAFF_BY_ID[id]) return err('Unknown role.');
  const sel = selectors(s);
  if (sel.staffCount + n > sel.fac.staffMax) return err('No room — upgrade your facility.');
  s.staff[id] = (s.staff[id] || 0) + n;
  return ok(`Hired ${n} ${STAFF_BY_ID[id].name}.`);
}

export function fire(s, id, n = 1) {
  if (!(s.staff[id] >= n)) return err('Nobody to let go.');
  s.staff[id] -= n;
  return ok('Position eliminated. Exit interviews were awkward.');
}

export function buyResearch(s, id) {
  const r = RESEARCH_BY_ID[id]; if (!r) return err('Unknown research.');
  if (s.research.includes(id)) return err('Already researched.');
  if (r.era > s.phase) return err('Requires a bigger facility (era-gated).');
  if (r.reqCap && s.bestCap < r.reqCap) return err(`Requires capability ${r.reqCap}.`);
  if ((r.deps || []).some(d => !s.research.includes(d))) return err('Missing prerequisite research.');
  if (s.rp < r.rp) return err('Not enough research points.');
  if (r.money && s.money < r.money) return err('Not enough cash.');
  s.rp -= r.rp;
  if (r.money) { s.money -= r.money; s.stats.spent += r.money; }
  s.research.push(id);
  pushNews(s, `🔬 Research complete: ${r.name}.`);
  return ok(`Researched ${r.name}.`);
}

export function startRun(s, N, D, silent = false) {
  const sel = selectors(s);
  if (s.runs.length >= sel.maxRuns) return err('All training slots busy.');
  if (!(N >= 1e6)) return err('Model too small (min 1M params).');
  if (N > sel.maxParams) return err('Not enough VRAM — model won\'t fit (need ~18 B/param).');
  if (!(D > 0)) return err('Need a token budget.');
  if (D > sel.dataset.tokens) return err('Not enough data — buy a bigger dataset.');
  if (sel.flops <= 0) return err('You need at least one GPU.');
  s.modelSeq++;
  const run = {
    id: uid(),
    name: `Mogul-${s.modelSeq}`,
    N, D, dataQ: sel.dataQ,
    physNeed: trainCompute(N, D),
    physDone: 0,
    startH: s.simHours,
  };
  s.runs.push(run);
  s.stats.runsStarted++;
  if (!silent) pushNews(s, `🚂 Training started: ${run.name} — ${fmtNum(N)} params on ${fmtNum(D)} tokens.`);
  return ok(`Training ${run.name}.`);
}

export function cancelRun(s, runId) {
  const i = s.runs.findIndex(r => r.id === runId);
  if (i < 0) return err('No such run.');
  const r = s.runs.splice(i, 1)[0];
  return ok(`Cancelled ${r.name}. The FLOPs are gone forever.`);
}

export function deployModel(s, modelId) {
  const m = s.models.find(x => x.id === modelId);
  if (!m) return err('No such model.');
  if (m.open) return err('That model was open-sourced.');
  for (const x of s.models) x.deployed = false;
  m.deployed = true;
  return ok(`${m.name} is now serving the API.`);
}

export function openSourceModel(s, modelId) {
  const m = s.models.find(x => x.id === modelId);
  if (!m) return err('No such model.');
  if (m.deployed) return err('Undeploy it first (deploy another model).');
  if (m.open) return err('Already open-sourced.');
  m.open = true;
  const gain = m.cap * BAL.OPEN_SOURCE_REP;
  s.rep = Math.min(100, s.rep + gain);
  s.stats.openSourced++;
  pushNews(s, `🌍 ${m.name} released as open weights (+${gain.toFixed(1)} rep).`);
  return ok(`Open-sourced ${m.name}.`);
}

// mult: hot-streak bonus from the UI (capped ×2 there) — active play pays a bit more
export function doGig(s, mult = 1) {
  const sel = selectors(s);
  const pay = (BAL.GIG_BASE + s.bestCap * s.bestCap * BAL.GIG_CAP_COEF) * sel.fx.gigMult * mult;
  s.money += pay;
  s.stats.gigRevenue += pay;
  return ok(`Fine-tuning gig delivered: +$${pay.toFixed(0)}.${mult > 1 ? ` 🔥 streak ×${mult.toFixed(1)}` : ''}`);
}

export function publishPaper(s) {
  const cost = BAL.PAPER_BASE_RP * Math.pow(BAL.PAPER_GROWTH, s.stats.papers);
  if (s.rp < cost) return err(`Needs ${Math.ceil(cost)} RP.`);
  s.rp -= cost;
  s.stats.papers++;
  s.rep = Math.min(100, s.rep + BAL.PAPER_REP);
  pushNews(s, `📄 Paper #${s.stats.papers} published. Citations roll in (+${BAL.PAPER_REP} rep).`);
  return ok('Published.');
}

export function paperCost(s) {
  return Math.ceil(BAL.PAPER_BASE_RP * Math.pow(BAL.PAPER_GROWTH, s.stats.papers));
}

export function fundingWaitH(s, f) {
  // hours until investors consider the round open (0 = open now)
  return Math.max(0, f.gapDays * 24 - (s.simHours - s.lastFundingH));
}

export function takeFunding(s, id) {
  const f = FUNDING.find(x => x.id === id); if (!f) return err('Unknown round.');
  if (s.funding.includes(id)) return err('Round already closed.');
  const idx = FUNDING.indexOf(f);
  if (idx > 0 && !s.funding.includes(FUNDING[idx - 1].id)) return err('Close the previous round first.');
  if (s.bestCap < f.reqCap) return err(`Investors want capability ≥ ${f.reqCap}.`);
  if (s.rep < f.reqRep) return err(`Investors want reputation ≥ ${f.reqRep}.`);
  if (fundingWaitH(s, f) > 0) return err('Investors want to see sustained traction first.');
  s.money += f.amount;
  s.funding.push(id);
  s.lastFundingH = s.simHours;
  s.rep = Math.min(100, s.rep + f.rep);
  pushNews(s, `💰 ${f.name} closed: +${fmtNum(f.amount)} in the bank.`);
  return ok(`${f.name} closed!`);
}

// Node Hunt minigame: give back a fraction of outage-lost training progress
export function restoreOutage(s, lostH, frac) {
  const sel = selectors(s);
  if (!s.runs.length || sel.trainRate <= 0) return;
  const perRun = sel.trainRate / s.runs.length;
  for (const r of s.runs) {
    const rate = Math.min(perRun, r.N * sel.ppRate);
    r.physDone = Math.min(r.physNeed * 0.999, r.physDone + rate * 3600 * lostH * frac);
  }
}

export function setAlloc(s, key, value) {
  const v = clamp(value, 0, 1);
  const keys = ['train', 'inf', 'res'];
  const others = keys.filter(k => k !== key);
  const rest = 1 - v;
  const otherSum = others.reduce((a, k) => a + s.alloc[k], 0);
  for (const k of others) {
    s.alloc[k] = otherSum > 0 ? s.alloc[k] / otherSum * rest : rest / others.length;
  }
  s.alloc[key] = v;
  return ok('Allocation updated.');
}

// Suggest a sensible next training config: biggest Chinchilla-optimal model
// that fits in VRAM, data, and finishes in a reasonable time at current speed.
export function suggestRun(s) {
  const sel = selectors(s);
  const targetH = 24 + s.phase * 40;                  // grows with era
  const tSec = targetH * 3600;
  // If the whole fleet is usable: C = 120·N² = rate·t → N = sqrt(rate·t/120)
  let N = Math.sqrt(Math.max(1e14, sel.trainRate * tSec) / 120);
  // If the batch-size limit binds (N·pp < fleet rate), the rate is N·pp:
  // 120·N² = N·pp·t → N = pp·t/120
  if (N * sel.ppRate < sel.trainRate) {
    N = Math.max(N, sel.ppRate * tSec / 120);
  }
  N = Math.min(N, sel.maxParams, sel.dataset.tokens / BAL.CHINCHILLA_RATIO);
  N = Math.max(1e6, N);
  const D = Math.min(optimalTokens(N), sel.dataset.tokens);
  return { N, D };
}

// ETA in hours for a hypothetical or active run
export function runEtaH(sel, N, remaining, nRuns = 1) {
  const rate = Math.min(sel.trainRate / Math.max(1, nRuns), N * sel.ppRate);
  return rate > 0 ? remaining / rate / 3600 : Infinity;
}
