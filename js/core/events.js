// Random events. Each: weight, minPhase (and optional maxPhase), and either
// `buff` (timed multiplier) or `apply(s, sel)` for instant effects.
// `text(s, result)` builds the news line. `dramatic: true` also pops a toast.

import { fmtMoney, fmtNum } from './util.js';
import { GPU_BY_ID } from './state.js';

// Amounts scale with phase so events stay relevant.
const scaledMoney = (s, base) => base * Math.pow(25, s.phase);
const scaledRp = (s, base) => base * Math.pow(8, s.phase);

// Destroy ~frac of the fleet (at least minN units), spread proportionally
// across owned types. Never takes the last GPU — the sim must stay playable.
// Returns { n, value, desc } or null if nothing could be destroyed.
export function destroyGpus(s, frac, minN = 1) {
  const total = Object.values(s.gpus).reduce((a, b) => a + b, 0);
  const toKill = Math.min(total - 1, Math.max(minN, Math.round(total * frac)));
  if (toKill <= 0) return null;
  const lost = {};
  let killed = 0, value = 0;
  for (const [id, n] of Object.entries(s.gpus)) {
    if (!n) continue;
    const share = Math.min(n, Math.floor(toKill * n / total));
    if (share > 0) { lost[id] = share; killed += share; }
  }
  // remainder comes off the biggest pile
  while (killed < toKill) {
    const id = Object.keys(s.gpus).reduce((a, b) =>
      (s.gpus[a] - (lost[a] || 0)) >= (s.gpus[b] - (lost[b] || 0)) ? a : b);
    if (!(s.gpus[id] - (lost[id] || 0) > 0)) break;
    lost[id] = (lost[id] || 0) + 1; killed++;
  }
  for (const [id, n] of Object.entries(lost)) {
    s.gpus[id] -= n;
    if (s.gpus[id] <= 0) delete s.gpus[id];
    value += (GPU_BY_ID[id]?.price || 0) * n;
  }
  s.stats.gpusLost = (s.stats.gpusLost || 0) + killed;
  const desc = Object.entries(lost)
    .map(([id, n]) => `${fmtNum(n)}× ${GPU_BY_ID[id]?.name || id}`).join(', ');
  return { n: killed, value, desc };
}

// Human-error flavor — every one of these is somebody's real war story.
const OOPS_TEXTS = [
  'A migration script points the cluster at the wrong checkpoint bucket.',
  'An intern unplugs rack 7 to charge a phone.',
  'Someone pushes a config with learning rate 10. Ten.',
  'The new hire runs the cleanup cron against prod storage.',
  'A firmware update reboots every node. Alphabetically. Slowly.',
  'Someone deploys to prod instead of staging. The environments were one letter apart.',
  'A keyboard, a sleeping engineer, and the Enter key conspire at 4 AM.',
  'The load test runs against the live cluster. It passes! Everything else fails.',
  'Two engineers "fix" the same bug simultaneously. The fixes fight.',
  'A calendar reminder titled "DO NOT DEPLOY FRIDAY" fires on Friday, after the deploy.',
  'Someone renames a config key. Forty services disagree about its old name.',
  'The retry logic retries the thing that should never, ever be retried.',
];

export const EVENTS = [
  { id: 'demandSurge', weight: 10, minPhase: 0,
    buff: { label: 'Viral demand', demand: 1.6, hours: 36 },
    text: () => '📈 Your model went viral on social media — API demand surges (+60% for 36h).' },
  { id: 'regulation', weight: 6, minPhase: 1,
    buff: { label: 'Regulatory chill', demand: 0.7, hours: 48 },
    text: () => '🏛️ New AI regulations spook enterprise customers (−30% demand for 48h).' },
  { id: 'elecSpike', weight: 7, minPhase: 0,
    buff: { label: 'Grid stress', elec: 1.8, hours: 48 },
    text: () => '⚡ Heat wave stresses the grid — electricity prices spike (+80% for 48h).' },
  { id: 'chipShortage', weight: 6, minPhase: 1,
    buff: { label: 'Chip shortage', gpuPrice: 1.4, hours: 72 },
    text: () => '📦 Packaging capacity sells out — accelerator prices +40% for 72h.' },
  { id: 'gpuDeal', weight: 7, minPhase: 0,
    buff: { label: 'GPU deal', gpuPrice: 0.75, hours: 24 },
    text: () => '🏷️ A crypto-mining farm liquidates — GPUs 25% off for 24h!' },
  { id: 'grant', weight: 6, minPhase: 0,
    apply: (s) => { const amt = scaledMoney(s, 1500); s.money += amt; return amt; },
    text: (s, amt) => `🎓 A compute grant comes through: +${fmtMoney(amt)}.` },
  { id: 'breakthrough', weight: 6, minPhase: 0,
    apply: (s) => { const rp = Math.max(5, Math.round(scaledRp(s, 4))); s.rp += rp; return rp; },
    text: (s, rp) => `💡 A late-night ablation pays off: +${rp} research points.` },
  { id: 'outage', weight: 7, minPhase: 0,
    apply: (s, sel) => {
      const guard = sel.fx.outageGuard;
      // 3+ ops = an on-call rotation: they bisect the bad node themselves
      // and you keep 70% of what would have been lost. No 3 AM pager for you.
      const covered = s.staff.ops >= 3;
      const lostH = (guard ? 1 : 6) * (covered ? 0.3 : 1);
      for (const r of s.runs) {
        // loss can't exceed the run's real accrual rate (batch-size limit)
        const rate = Math.min(sel.trainRate / Math.max(1, s.runs.length), r.N * sel.ppRate);
        r.physDone = Math.max(0, r.physDone - rate * 3600 * lostH);
      }
      // page the player only when there's no rotation to take it
      if (s.runs.length && !covered) s.lastIncident = { lostH, realAt: Date.now() };
      return { lostH, covered };
    },
    text: (s, r) => r.covered
      ? `🔌 Node failure at 3 AM — your ops rotation bisects it before coffee. Only ${r.lostH.toFixed(1)}h lost.`
      : r.lostH <= 1
        ? '🔌 Power blip — auto-resume restores training from checkpoint (−1h progress).'
        : '🔌 Power outage! Training runs lose 6 hours of progress. (Research checkpointing! Or hire an ops rotation.)' },
  { id: 'poach', weight: 4, minPhase: 1,
    apply: (s) => {
      const ids = Object.keys(s.staff).filter(k => s.staff[k] > 0);
      if (!ids.length) return null;
      const k = ids[Math.floor(Math.random() * ids.length)];
      s.staff[k]--; return k;
    },
    text: (s, k) => k ? `🎣 A rival lab poaches one of your ${k === 'ops' ? 'ops engineers' : k + 's'} with a comp package you'd rather not see.` : '🎣 A rival recruiter sniffs around but leaves empty-handed.' },
  { id: 'rivalRelease', weight: 8, minPhase: 0,
    apply: (s) => {
      if (!s.rivals.length) return null;
      const r = s.rivals[Math.floor(Math.random() * s.rivals.length)];
      r.cap = Math.min(96, r.cap + 1.5); return r.name;
    },
    text: (s, name) => `🚀 ${name} ships a new frontier model. The leaderboard shuffles.` },
  { id: 'media', weight: 5, minPhase: 0,
    apply: (s) => { s.rep = Math.min(100, s.rep + 2); return 2; },
    text: () => '📰 A glossy magazine profiles Mario Damodei: "The Gradient Whisperer" (+2 rep).' },
  { id: 'enterprise', weight: 5, minPhase: 1,
    apply: (s) => { const amt = scaledMoney(s, 3000); s.money += amt; return amt; },
    text: (s, amt) => `🤝 An enterprise signs an annual API contract upfront: +${fmtMoney(amt)}.` },
  // ── Hardware drama: failures, fires, theft, human error ─────────
  // All grounded in real incidents; losses are capped and never take the
  // last GPU, so the early game can't soft-lock.
  { id: 'hwFail', weight: 7, minPhase: 0, dramatic: true,
    apply: (s) => destroyGpus(s, s.staff.ops > 0 ? 0.004 : 0.008),
    text: (s, r) => `💀 Overnight attrition: ${r.desc} dead — ECC errors, cooked HBM. ${s.staff.ops > 0 ? 'Ops swap in hot spares for the rest.' : 'No ops staff, no hot spares.'} (Real: Meta logged 466 training interruptions in 54 days on 16k GPUs.)` },
  { id: 'fire', weight: 2, minPhase: 1, maxPhase: 4, dramatic: true,
    apply: (s, sel) => {
      const r = destroyGpus(s, 0.03, 2);
      if (!r) return null;
      const payout = r.value * 0.35;
      s.money += payout;
      s.stats.fires = (s.stats.fires || 0) + 1;
      const lostH = 8;
      for (const run of s.runs) {
        // loss can't exceed the run's real accrual rate (batch-size limit)
        const rate = Math.min(sel.trainRate / Math.max(1, s.runs.length), run.N * sel.ppRate);
        run.physDone = Math.max(0, run.physDone - rate * 3600 * lostH);
      }
      s.buffs.push({ id: 'fireCleanup', label: '🔥 Fire cleanup', untilH: s.simHours + 24 });
      return { ...r, payout };
    },
    text: (s, r) => `🔥 FIRE! Thermal runaway in a rack — ${r.desc} destroyed before suppression kicked in. Runs lose 8h; insurance pays ${fmtMoney(r.payout)}. (Datacenter fires are rare but real — ask OVH, 2021.)` },
  { id: 'heist', weight: 3, minPhase: 0, maxPhase: 3, dramatic: true,
    apply: (s) => {
      if (s.staff.ops >= 5) return { saved: true };
      return destroyGpus(s, 0.015);
    },
    text: (s, r) => r.saved
      ? '🚨 Burglars hit the loading dock at 2 AM — your ops crew and the cameras chase them off. Nothing lost.'
      : `🥷 Burglary! ${r.desc} stolen overnight. GPUs are the new copper. (Real: accelerator shipments get hijacked; that's why datacenters look like banks.)` },
  { id: 'coffee', weight: 4, minPhase: 0, dramatic: true,
    apply: (s) => destroyGpus(s, 0, 1),
    text: (s, r) => `☕ A researcher sets a flat white on the test bench. ${r.desc} dies instantly, heroically. A "NO LIQUIDS" sign goes up, again.` },
  { id: 'oops', weight: 5, minPhase: 0,
    apply: (s, sel) => {
      if (!s.runs.length) return null;
      const lostH = sel.fx.outageGuard ? 1 : 3;
      for (const run of s.runs) {
        // loss can't exceed the run's real accrual rate (batch-size limit)
        const rate = Math.min(sel.trainRate / Math.max(1, s.runs.length), run.N * sel.ppRate);
        run.physDone = Math.max(0, run.physDone - rate * 3600 * lostH);
      }
      return { lostH, txt: OOPS_TEXTS[(Math.random() * OOPS_TEXTS.length) | 0] };
    },
    text: (s, r) => `🤦 ${r.txt} Training loses ${r.lostH}h${r.lostH <= 1 ? ' — auto-resume saves the night' : ''}.` },

  // ── Conscience has consequences (gated on the integrity score) ──
  { id: 'whistle', weight: 5, minPhase: 1, dramatic: true,
    cond: (s) => (s.integrity ?? 70) < 40,
    apply: (s) => { s.rep = Math.max(0, s.rep - 6); return true; },
    text: () => '📢 A whistleblower walks internal docs to the press: "What Mogul does when nobody is looking." −6 rep.' },
  { id: 'exodus', weight: 4, minPhase: 1, dramatic: true,
    cond: (s) => (s.integrity ?? 70) < 30 && Object.values(s.staff).some(n => n > 2),
    apply: (s) => {
      let left = 0;
      for (const k of Object.keys(s.staff)) {
        const n = Math.floor(s.staff[k] * 0.1);
        s.staff[k] -= n; left += n;
      }
      return left || null;
    },
    text: (s, n) => `🚪 ${n} employees resign in protest over the lab's choices. The open letter is very well written.` },
  { id: 'mission', weight: 5, minPhase: 1,
    cond: (s) => (s.integrity ?? 70) >= 85,
    apply: (s) => { const rp = Math.max(10, Math.round(scaledRp(s, 6))); s.rp += rp; return rp; },
    text: (s, rp) => `🌟 A star researcher turns down a bigger offer to join Mogul — "I read what you refused to build." +${rp} RP.` },

  { id: 'qHype', weight: 5, minPhase: 4,
    buff: { label: 'Quantum-AI hype', demand: 1.8, hours: 48 },
    text: () => '🪐 "Quantum AI" trends worldwide after your keynote — demand +80% for 48h.' },
  { id: 'flare', weight: 6, minPhase: 5,
    apply: (s, sel) => {
      const covered = s.staff.ops >= 3;
      const lostH = (sel.fx.outageGuard ? 1 : 4) * (covered ? 0.3 : 1);
      for (const r of s.runs) {
        // loss can't exceed the run's real accrual rate (batch-size limit)
        const rate = Math.min(sel.trainRate / Math.max(1, s.runs.length), r.N * sel.ppRate);
        r.physDone = Math.max(0, r.physDone - rate * 3600 * lostH);
      }
      if (s.runs.length && !covered) s.lastIncident = { lostH, realAt: Date.now() };
      return { lostH, covered };
    },
    text: (s, r) => r.covered
      ? `☀️ Solar flare — mission ops ride it out by the book. Only ${r.lostH.toFixed(1)}h lost.`
      : r.lostH <= 1
        ? '☀️ Solar flare! Rad-hardened checkpoints hold — the constellation loses only 1h.'
        : '☀️ Solar flare! The constellation safes itself for 4 hours of training while the particle storm passes.' },
];

// Real, checkable facts — surfaced occasionally in the news ticker.
export const FACTS = [
  '💡 Real fact: GPT-3 (2020) trained on ~300B tokens with ~3.1e23 FLOPs — about 10,000× more compute than GPT-1 two years earlier.',
  '💡 Real fact: the Chinchilla paper (2022) showed most large models were undertrained — compute-optimal is ~20 tokens per parameter.',
  '💡 Real fact: "MFU" (model FLOPs utilization) above 50% is excellent; naive training code often idles GPUs below 20%.',
  '💡 Real fact: training Adam keeps ~16–18 bytes of state per parameter — VRAM, not FLOPs, often caps model size.',
  '💡 Real fact: algorithmic efficiency for image models doubled roughly every 16 months (OpenAI, 2020) — progress isn\'t just hardware.',
  '💡 Real fact: a single H100 draws ~700W — a 100k-GPU cluster needs its own power-plant-scale substation.',
  '💡 Real fact: PUE (power usage effectiveness) of 1.1 means 10% overhead for cooling; the global average is ~1.5.',
  '💡 Real fact: FlashAttention computes exact attention faster by minimizing memory reads — IO, not math, was the bottleneck.',
  '💡 Real fact: deduplicating training data measurably reduces memorization and improves loss (Lee et al., 2021).',
  '💡 Real fact: in synchronous training, one slow GPU ("straggler") stalls all of them — finding it is literal binary search.',
  '💡 Real fact: RLHF tunes models against a reward model trained from human preference pairs — typical failure mode: sycophancy.',
  '💡 Real fact: frontier training runs take months; a mid-run loss spike can mean restarting from a checkpoint days back.',
  '💡 Real fact: photonic chips multiply matrices with light interference — near-zero heat per operation; optical interconnects already link AI racks.',
  '💡 Real fact: Google\'s Willow chip (2024) showed error-corrected qubits improving as you add more — the key threshold for scalable quantum computing.',
  '💡 Real fact: your brain runs on ~20 watts. Neuromorphic chips (Intel Loihi 2, IBM NorthPole) chase that efficiency by computing only on "spikes".',
  '💡 Real fact: Landauer\'s principle — erasing one bit costs at least kT·ln2 ≈ 3×10⁻²¹ J. Today\'s chips run ~1000× above that floor.',
  '💡 Real fact: memristor crossbars compute matrix products in physics itself: Ohm\'s law multiplies, Kirchhoff\'s current law adds.',
  '💡 Real fact: fusion ignition was achieved at NIF in Dec 2022 — more energy out of the fuel than the laser put in, for the first time.',
  '💡 Real fact: superconducting logic switches in picoseconds at zero resistance, but needs ~4 K cooling — cryostats eat most of the gain on small machines.',
  '💡 Real fact: DNA can store ~215 petabytes per gram and lasts millennia — synthesis cost, not density, is what keeps it out of datacenters.',
  '💡 Real fact: launch costs fell ~10× with reusable rockets; orbital datacenters with free solar power and radiative cooling are now seriously proposed.',
  '💡 Real fact: I. J. Good (1965): an ultraintelligent machine could design better machines — "an intelligence explosion". Takeoff speed is still debated.',
  '💡 Real fact: the Kardashev scale (1964) ranks civilizations by energy use — Type I: a planet (~10¹⁶ W), Type II: a star (~4×10²⁶ W), Type III: a galaxy (~4×10³⁷ W).',
  '💡 Real fact: Freeman Dyson (1960) proposed detecting alien megastructures by their waste-heat infrared glow — and that a "Dyson sphere" would really be a swarm of independent collectors.',
  '💡 Real fact: a Matrioshka brain (Robert Bradbury) is a nested Dyson swarm where each shell computes on the waste heat of the one inside it.',
  '💡 Real fact: Seth Lloyd (Nature, 2000): a 1 kg "ultimate laptop" could perform 5.4×10⁵⁰ ops/s — and the observable universe has done ~10¹²⁰ operations since the Big Bang.',
  '💡 Real fact: the Penrose process (1969) extracts energy from a spinning black hole — up to 29% of its mass-energy, the densest battery physics allows.',
  '💡 Real fact: building at stellar scale requires self-replicating factories (von Neumann, 1940s): one seed fab doubling ~40 times outproduces every factory ever built on Earth.',
  '💡 Real fact: the cosmic microwave background is the oldest light there is, released ~380,000 years after the Big Bang — a baby picture of the universe\'s initial conditions.',
  '💡 Real fact: Penrose\'s conformal cyclic cosmology proposes (controversially) that faint concentric "Hawking points" in the microwave background are traces of an aeon before our Big Bang.',
];

export const NEWS_FLAVOR = [
  'Nvidia announces another accelerator. It is, again, sold out.',
  'Senate holds a hearing on AI. A senator asks if the model can feel love.',
  'A new benchmark drops; every lab claims state of the art within the hour.',
  'Prompt engineering is declared dead for the fourth time this year.',
  'A datacenter in Texas briefly becomes the state\'s largest electricity consumer.',
  'Researchers find scaling laws hold for the 9th order of magnitude in a row.',
  'An open-source group fine-tunes a model to do taxes. It hallucinates deductions.',
  'GPU cloud prices hit a new high. Mining rigs everywhere get a second life.',
  'A think tank publishes AGI timelines. Error bars span three decades.',
  'Another "transformer killer" architecture debuts; transformers remain unbothered.',
];
