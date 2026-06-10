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
