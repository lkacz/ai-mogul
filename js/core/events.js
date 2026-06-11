// Random events. Each: weight, minPhase, and either `buff` (timed multiplier)
// or `apply(s, sel)` for instant effects. `text(s)` builds the news line.

import { fmtMoney } from './util.js';

// Amounts scale with phase so events stay relevant.
const scaledMoney = (s, base) => base * Math.pow(25, s.phase);
const scaledRp = (s, base) => base * Math.pow(8, s.phase);

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
      const lostH = guard ? 1 : 6;
      for (const r of s.runs) {
        const rate = sel.trainRate / Math.max(1, s.runs.length);
        r.physDone = Math.max(0, r.physDone - rate * 3600 * lostH);
      }
      // offer the Node Hunt minigame (consumed by the UI if the player is around)
      if (s.runs.length) s.lastIncident = { lostH, realAt: Date.now() };
      return lostH;
    },
    text: (s, h) => h <= 1
      ? '🔌 Power blip — auto-resume restores training from checkpoint (−1h progress).'
      : '🔌 Power outage! Training runs lose 6 hours of progress. (Research checkpointing!)' },
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
  { id: 'qHype', weight: 5, minPhase: 4,
    buff: { label: 'Quantum-AI hype', demand: 1.8, hours: 48 },
    text: () => '🪐 "Quantum AI" trends worldwide after your keynote — demand +80% for 48h.' },
  { id: 'flare', weight: 6, minPhase: 5,
    apply: (s, sel) => {
      const lostH = sel.fx.outageGuard ? 1 : 4;
      for (const r of s.runs) {
        const rate = sel.trainRate / Math.max(1, s.runs.length);
        r.physDone = Math.max(0, r.physDone - rate * 3600 * lostH);
      }
      if (s.runs.length) s.lastIncident = { lostH, realAt: Date.now() };
      return lostH;
    },
    text: (s, h) => h <= 1
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
