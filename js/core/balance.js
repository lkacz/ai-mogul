// All tunable constants + core formulas in one place.
// The simulation uses real ML scaling relationships:
//   training compute  C = 6·N·D  (FLOPs for N params on D tokens)
//   Chinchilla-optimal data: D* ≈ 20·N tokens
//   capability grows with log10 of *effective* compute
//   effective compute = physical FLOPs × algorithmic efficiency × data quality

import { clamp, log10 } from './util.js';

export const BAL = {
  START_MONEY: 1500,

  // Capability index: 100 = AGI. cap = (log10(effC) - CAP_BASE) * CAP_SLOPE
  CAP_BASE: 15.3,
  CAP_SLOPE: 6.0,
  AGI_CAP: 100,
  SINGULARITY_CAP: 300,       // the true ending — fed by a star, then a galaxy

  CHINCHILLA_RATIO: 20,       // optimal tokens per parameter
  CHIN_SIGMA: 0.45,           // tolerance (in log10 of D/D*) before quality degrades
  BYTES_PER_PARAM: 18,        // optimizer states + grads + weights (mixed precision Adam)

  MFU_BASE: 0.18,             // model FLOPs utilization before research/engineers
  MFU_MAX: 0.62,
  MFU_PER_ENGINEER: 0.004,
  MFU_ENG_CAP: 0.10,          // engineers can add at most this much MFU

  INF_UTIL: 0.45,             // utilization of compute allocated to serving
  TOKENS_PER_REQ: 400,        // avg generated tokens per request
  // request price ($) = PRICE_BASE * (cap/10)^PRICE_EXP
  PRICE_BASE: 0.0008,
  PRICE_EXP: 2.2,
  // demand ($/s) = DEMAND_BASE * 10^(cap/DEMAND_DIV) * (1+rep/REP_DEMAND_DIV) * mults
  DEMAND_BASE: 0.0005,
  DEMAND_DIV: 12.5,
  REP_DEMAND_DIV: 60,
  DEMAND_HARDCAP: 5e7,        // $/s — total addressable market

  RP_FOUNDER: 0.4,            // Mario researches too (RP per sim-hour, always)
  RP_PER_RESEARCHER: 1.2,     // RP per researcher per sim-hour
  RP_COMPUTE_COEF: 3e-8,      // RP/h per sqrt(FLOP/s) of research compute

  REP_PER_CAP: 0.25,          // rep gained per point of new-best capability

  SELL_RATIO: 0.45,           // GPU resale value

  GIG_BASE: 20,               // freelance gig pay = GIG_BASE + cap² · GIG_CAP_COEF
  GIG_CAP_COEF: 0.6,
  GIG_COOLDOWN_S: 8,          // real seconds between gigs

  PAPER_BASE_RP: 40,          // publishing cost grows ×1.6 each paper
  PAPER_GROWTH: 1.6,
  PAPER_REP: 2.5,

  OPEN_SOURCE_REP: 0.25,      // rep gained = cap × this

  EVENT_CHANCE_PER_H: 0.008,

  // Moral dilemmas are paced in REAL player time (one per 3–5 minutes, see
  // main.js) so sim speed never floods them. Integrity starts at 70
  // (neutral: all factors exactly 1.0 there — the balance bot never answers
  // dilemmas, so pacing is untouched).
  INTEGRITY_START: 70,
  INTEGRITY_DEMAND_K: 0.004,   // demand ×(1 + (integrity−70)·K) → 0.72…1.12
  INTEGRITY_RP_K: 0.002,       // researcher morale → RP ×(0.86…1.06)

  // Market adoption: actual demand chases potential demand with a lag.
  // Early adopters move fast (up to ADOPT_FLOOR $/s); the enterprise mass
  // market diffuses slowly. Sales staff speed both up.
  ADOPT_RATE: 0.0006,         // ≈ 48-day half-life toward full potential
  ADOPT_FAST: 0.02,           // rate while below the early-adopter floor
  ADOPT_FLOOR: 0.05,          // $/s reachable quickly (hobbyists, tinkerers)
  ADOPT_SALES_K: 0.35,        // rate × (1 + K·log10(1+sales))

  OPS_ELEC_EACH: 0.015,       // each ops hire: -1.5% electricity, capped
  OPS_ELEC_CAP: 0.45,

  // Rival demand factor: clamp(1 + lead*0.02, 0.5, 1.35)
  RIVAL_FACTOR_MIN: 0.5,
  RIVAL_FACTOR_MAX: 1.35,

  OFFLINE_CAP_H: 2160,        // max sim-hours granted for time away (90 sim-days)

  // AI helping AI: research feedback loop once models pass capability 50.
  // algoEff ×= 1 + (max(0, cap−50)/50)² · SELF_IMPROVE_K
  SELF_IMPROVE_K: 9,
  SELF_IMPROVE_MIN_CAP: 50,

  // Intelligence explosion: past AGI the model improves itself directly.
  // algoEff ×= 10^((cap − 100) / SUPER_FB_DIV). Each retrain closes most of
  // the gap to a fixed point — pushing the fixed point past 200 requires
  // Beyond-Silicon hardware (photonic/quantum) and the orbital constellation.
  SUPER_FB_DIV: 8,

  // Critical-batch-size limit: a single run can only absorb
  // N × PP_BASE FLOP/s (× research ppMult) no matter how big the cluster.
  // This is why real frontier runs take months.
  PP_BASE: 3e6,

  // The time wall: a run's minimum duration is 6·D / ppRate seconds even
  // with an infinite cluster. Real labs never commit to multi-year runs —
  // hardware and algorithms obsolete them first (the "compute Osborne
  // effect"). Slider stops at the soft cap; the engine refuses past hard.
  RUN_SOFT_CAP_Y: 2,
  RUN_HARD_CAP_Y: 5,
};

export function trainCompute(N, D) { return 6 * N * D; }
export function optimalTokens(N) { return BAL.CHINCHILLA_RATIO * N; }

// Gaussian (in log-space) penalty for straying from Chinchilla-optimal data budget.
export function chinchillaPenalty(N, D) {
  if (N <= 0 || D <= 0) return 0;
  const r = log10(D / optimalTokens(N));
  return Math.exp(-(r * r) / (2 * BAL.CHIN_SIGMA * BAL.CHIN_SIGMA));
}

export function capabilityFor(physC, algoEff, dataQ, N, D) {
  const effC = physC * algoEff * dataQ * chinchillaPenalty(N, D);
  if (effC <= 0) return 0.5;
  return Math.max(0.5, (log10(effC) - BAL.CAP_BASE) * BAL.CAP_SLOPE);
}

export const CAP_TIERS = [
  [0,   'Markov babble'],
  [6,   'Coherent sentences'],
  [12,  'Rambling essayist (2019-era text model)'],
  [20,  'Few-shot learner (2020-era frontier)'],
  [28,  'Helpful assistant (the chatbot moment)'],
  [38,  'Expert reasoner (2023-era frontier)'],
  [50,  'PhD-level agent'],
  [62,  'Superhuman coder'],
  [75,  'Autonomous researcher'],
  [88,  'Transformative AI'],
  [100, 'AGI'],
  [112, 'Artificial superintelligence'],
  [125, 'Nobel committee, as one mind'],
  [140, 'Civilization-scale intellect'],
  [160, 'Planetary mind'],
  [180, 'Beyond human comprehension'],
  [200, 'Star-fed mind — Kardashev II'],
  [240, 'Galactic intellect — Kardashev III'],
  [270, 'Computing at the Lloyd limit'],
  [300, 'The Singularity'],
];

export function capTier(cap) {
  let label = CAP_TIERS[0][1];
  for (const [min, l] of CAP_TIERS) if (cap >= min) label = l;
  return label;
}
