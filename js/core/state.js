// Game state + derived-value selectors (pure, no DOM).

import { BAL } from './balance.js';
import { GPUS, FACILITIES, DATASETS, STAFF, RIVALS } from './data.js';
import { RESEARCH_BY_ID } from './research.js';
import { clamp } from './util.js';

export const SAVE_KEY = 'aimogul_save_v1';

export function defaultState() {
  return {
    version: 1,
    simHours: 0,
    lastReal: Date.now(),
    speed: 1,
    paused: false,

    money: BAL.START_MONEY,
    rp: 0,
    rep: 0,
    adoption: 0,   // current market demand ($/s) — lags behind potential

    phase: 0,                                   // index into FACILITIES
    gpus: { gtx1070: 1 },                       // id -> count
    alloc: { train: 0.7, inf: 0.2, res: 0.1 },  // compute allocation
    staff: { engineer: 0, researcher: 0, ops: 0, sales: 0 },
    dataTier: 0,
    dataQBonus: {},    // dataset id -> quality multiplier from Dedup Frenzy
    research: [],                                // completed research ids
    resProj: null,     // active research project { id, done, need } (lab-hours)
    resDoneQueue: [],  // completed research ids awaiting UI follow-up {id, realAt}
    funding: [],                                 // taken round ids
    lastFundingH: -1e9,                          // sim-hour the last round closed

    runs: [],          // active training runs {id,name,N,D,dataQ,physNeed,physDone,startH}
    models: [],        // {id,name,N,D,cap,effC,physC,deployed,trainedH}
    modelSeq: 0,
    bestCap: 0,
    autoDeploy: true,
    autoRetrain: false,

    rivals: RIVALS.map(r => ({ id: r.id, name: r.name, cap: r.start, rate: r.rate })),

    buffs: [],         // {id,label,demand?,elec?,gpuPrice?,untilH}
    news: [{ h: 0, txt: '👋 Welcome to the garage. Train something.' }],
    milestones: {},    // id -> simHours completed
    won: false,
    wonAt: null,
    singularity: false,   // true ending: capability ≥ SINGULARITY_CAP
    singularityAt: null,

    stats: {
      runsStarted: 0, apiRevenue: 0, gigRevenue: 0, spent: 0,
      flops: 0, tokens: 0, papers: 0, openSourced: 0,
      peakMoney: BAL.START_MONEY, elecSpent: 0,
      lrBest: 0, dedupBest: 0, nodesFixed: 0, minigames: 0, rlhfRated: 0,
      bestStreak: 0, gpusLost: 0, fires: 0, pagerPages: 0,
    },
  };
}

export const GPU_BY_ID = Object.fromEntries(GPUS.map(g => [g.id, g]));
export const DATASET_BY_ID = Object.fromEntries(DATASETS.map(d => [d.id, d]));
export const STAFF_BY_ID = Object.fromEntries(STAFF.map(st => [st.id, st]));

// ── Derived values, recomputed each tick ──────────────────────────
export function selectors(s) {
  const fac = FACILITIES[s.phase];

  // aggregate research effects
  const fx = { algo: 1, mfu: 0, dataQ: 1, memEff: 1, infEff: 1, revMult: 1,
    demandMult: 1, gigMult: 1, rpMult: 1, powerMult: 1, maxRuns: 0, ppMult: 1,
    outageGuard: false, unlocks: new Set() };
  for (const id of s.research) {
    const r = RESEARCH_BY_ID[id]; if (!r) continue;
    const e = r.fx;
    if (e.algo) fx.algo *= e.algo;
    if (e.mfu) fx.mfu += e.mfu;
    if (e.dataQ) fx.dataQ *= e.dataQ;
    if (e.memEff) fx.memEff *= e.memEff;
    if (e.infEff) fx.infEff *= e.infEff;
    if (e.revMult) fx.revMult *= e.revMult;
    if (e.demandMult) fx.demandMult *= e.demandMult;
    if (e.gigMult) fx.gigMult *= e.gigMult;
    if (e.rpMult) fx.rpMult *= e.rpMult;
    if (e.powerMult) fx.powerMult *= e.powerMult;
    if (e.maxRuns) fx.maxRuns += e.maxRuns;
    if (e.ppMult) fx.ppMult *= e.ppMult;
    if (e.outageGuard) fx.outageGuard = true;
    if (e.unlock) fx.unlocks.add(e.unlock);
  }
  // AI research feedback loop: models past cap 50 accelerate algorithmic progress
  const fb = Math.max(0, s.bestCap - BAL.SELF_IMPROVE_MIN_CAP) / BAL.SELF_IMPROVE_MIN_CAP;
  const selfImprove = 1 + fb * fb * BAL.SELF_IMPROVE_K;
  // Intelligence explosion: past AGI the model rewrites itself — exponential feedback
  const superImprove = Math.pow(10, Math.max(0, s.bestCap - BAL.AGI_CAP) / BAL.SUPER_FB_DIV);
  const algoEff = fx.algo * selfImprove * superImprove;

  // hardware totals
  let flops = 0, watts = 0, vramGB = 0, gpuCount = 0;
  for (const [id, n] of Object.entries(s.gpus)) {
    const g = GPU_BY_ID[id]; if (!g || !n) continue;
    flops += g.tflops * 1e12 * n;
    watts += g.watts * n;
    vramGB += g.vram * n;
    gpuCount += n;
  }

  const mfu = clamp(
    BAL.MFU_BASE + fx.mfu +
    Math.min(BAL.MFU_ENG_CAP, s.staff.engineer * BAL.MFU_PER_ENGINEER),
    0.05, BAL.MFU_MAX);

  const effFlops = flops * mfu;
  const trainRate = effFlops * s.alloc.train;            // FLOP/s into training
  const infFlops = flops * s.alloc.inf * BAL.INF_UTIL;   // FLOP/s serving
  const resFlops = effFlops * s.alloc.res;

  const maxParams = (vramGB * 1e9 / BAL.BYTES_PER_PARAM) * fx.memEff;

  // buffs
  let demandBuff = 1, elecBuff = 1, gpuPriceBuff = 1;
  for (const b of s.buffs) {
    if (b.demand) demandBuff *= b.demand;
    if (b.elec) elecBuff *= b.elec;
    if (b.gpuPrice) gpuPriceBuff *= b.gpuPrice;
  }

  // economy
  const ds = DATASETS[s.dataTier];
  const dataQ = ds.quality * fx.dataQ * ((s.dataQBonus && s.dataQBonus[ds.id]) || 1);

  const deployed = s.models.find(m => m.deployed) || null;
  let price = 0, capacity = 0, potential = 0, revenue = 0, served = 0;
  const maxRival = s.rivals.length ? Math.max(...s.rivals.map(r => r.cap)) : 0;
  if (deployed) {
    price = BAL.PRICE_BASE * Math.pow(deployed.cap / 10, BAL.PRICE_EXP) * fx.revMult;
    const flopsPerReq = 2 * deployed.N * BAL.TOKENS_PER_REQ / fx.infEff;
    const reqRate = flopsPerReq > 0 ? infFlops / flopsPerReq : 0;
    capacity = reqRate * price;                          // $/s if fully utilized
    const rivalFactor = clamp(1 + (s.bestCap - maxRival) * 0.02,
      BAL.RIVAL_FACTOR_MIN, BAL.RIVAL_FACTOR_MAX);
    potential = Math.min(BAL.DEMAND_HARDCAP,
      BAL.DEMAND_BASE * Math.pow(10, deployed.cap / BAL.DEMAND_DIV) *
      (1 + s.rep / BAL.REP_DEMAND_DIV) * fx.demandMult * demandBuff * rivalFactor);
    revenue = Math.min(s.adoption, capacity);            // $/s
    served = capacity > 0 ? revenue / capacity : 0;
  }
  const inFastLane = s.adoption < Math.min(potential, BAL.ADOPT_FLOOR);
  const adoptRate = (inFastLane ? BAL.ADOPT_FAST : BAL.ADOPT_RATE) *
    (1 + BAL.ADOPT_SALES_K * Math.log10(1 + s.staff.sales));

  // costs (per hour)
  const opsDiscount = 1 - Math.min(BAL.OPS_ELEC_CAP, s.staff.ops * BAL.OPS_ELEC_EACH);
  const elecPerHour = (watts / 1000) * fac.pue * fac.elecPrice *
    fx.powerMult * elecBuff * opsDiscount;
  let salaries = 0;
  for (const [id, n] of Object.entries(s.staff)) salaries += (STAFF_BY_ID[id]?.wage || 0) * n;
  const costPerHour = elecPerHour + salaries + fac.upkeep;

  const rpPerHour = (BAL.RP_FOUNDER +
    s.staff.researcher * BAL.RP_PER_RESEARCHER +
    Math.sqrt(Math.max(0, resFlops)) * BAL.RP_COMPUTE_COEF) * fx.rpMult;

  const maxRuns = 1 + fx.maxRuns;
  const ppRate = BAL.PP_BASE * fx.ppMult;  // max useful FLOP/s per model param

  return {
    fac, fx, algoEff, selfImprove, superImprove, flops, watts, vramGB, gpuCount, mfu,
    effFlops, trainRate, infFlops, resFlops, maxParams, dataQ, dataset: ds,
    deployed, price, capacity, potential, adoptRate, revenue, served, maxRival,
    elecPerHour, salaries, costPerHour, rpPerHour, maxRuns, ppRate,
    netPerHour: revenue * 3600 - costPerHour,
    gpuPriceBuff, demandBuff,
    powerUsed: watts, powerCap: fac.powerW,
    staffCount: Object.values(s.staff).reduce((a, b) => a + b, 0),
  };
}

export function gpuPrice(s, sel, g) { return g.price * sel.gpuPriceBuff; }

export function serialize(s) { return JSON.stringify(s); }

export function deserialize(json) {
  const d = defaultState();
  const s = JSON.parse(json);
  // shallow-merge with defaults so old saves survive new fields
  const merged = { ...d, ...s };
  merged.stats = { ...d.stats, ...(s.stats || {}) };
  merged.alloc = { ...d.alloc, ...(s.alloc || {}) };
  merged.staff = { ...d.staff, ...(s.staff || {}) };
  return merged;
}
