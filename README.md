# 🧠 AI Mogul

**From a garage GPU to a gigawatt AI factory — a realistic browser simulation of building an AI lab.**

San Mateo, January 2025. **Mario Damodei** quits his big-lab job with $1,500, a gaming PC with a
used GTX 1070, and a conviction that the scaling laws aren't done. Train language models, sell
fine-tuning gigs, ship an API, raise funding, build datacenters — and race three rival labs to
**capability 100: AGI**.

No build step, no dependencies, no backend. Pure HTML/CSS/ES-modules — runs anywhere,
deploys on GitHub Pages, saves to `localStorage`.

## ▶ Play

Open the GitHub Pages URL of this repo, or locally:

```bash
npx http-server -p 8080        # any static server works (ES modules need http://)
# → http://localhost:8080
```

## The simulation is real(istic)

The numbers are compressed for playability, but the *mechanics* are the real thing:

| Mechanic | Reality it models |
|---|---|
| `C = 6·N·D` | Training FLOPs for N parameters on D tokens |
| ~20 tokens/param optimal | Chinchilla scaling laws (deviating costs you quality) |
| ~18 bytes/param of VRAM | Adam optimizer states + gradients + weights cap your model size |
| MFU (18%→62%) | Model FLOPs Utilization — kernels, FlashAttention and engineers raise it |
| Batch-size limit | A run can only absorb so many FLOP/s per parameter — why frontier runs take months |
| Algorithmic efficiency | Research multiplies *effective* compute (the real ~10×/decade-of-progress effect) |
| PUE & $/kWh | Cooling overhead and power contracts dominate datacenter economics |
| Market adoption lag | Capability ≠ instant revenue; enterprises adopt over months, sales staff help |
| Funding round gates | Investors fund traction over time — seed → Series A/B/C → sovereign megaround |
| AI research feedback | Past capability 50, your models accelerate your own algorithmic progress |

Capability is a log-scale index of effective training compute: ~12 is a GPT-2-era model,
~28 the ChatGPT moment, ~38 GPT-4-era, 100 = AGI.

## The lab is alive 🕹️

The Lab tab renders your facility as a living pixel-art scene, drawn procedurally on canvas
(no sprite assets, zero dependencies): Mario Damodei wanders the garage among GPU shelves and
pizza boxes; hired scientists, engineers, ops and sales walk around and work at standing desks;
racks blink with LEDs that track your real GPU count and training activity; monitors show the
live loss curve of the current run. Click anyone — including the cat — for a quip.
Each facility is its own scene: garage → startup office → colo cage → hyperscale hall →
the gigawatt Factory with its glowing core that pulses faster as you approach AGI.
Milestones rain confetti on everyone.

## How to play

- **Lab** — watch your lab live; allocate compute between training, inference (revenue) and research; do gigs early.
- **Training** — pick parameters & tokens, watch the predicted capability, hit start.
- **Hardware** — buy GPUs (GTX 1070 → H100 → B200 → your own custom silicon); mind power & slots; upgrade the facility: garage → office → colo → hyperscale DC → 6 GW AI factory.
- **Research** — 32 real techniques across 4 eras, from BPE tokenization to recursive self-improvement.
- **Company** — hire staff, buy datasets, publish papers, raise five rounds of funding.
- **Goals** — a 25-step quest line from "first training run" to AGI, plus achievements.

1 real second ≈ 1 sim hour at 1× (up to 500×). Space pauses. Progress accrues while you're away.

## Development

```
js/core/   pure simulation (no DOM): balance, engine, state, catalogs
js/ui/     rendering + input (scene.js = procedural pixel-art lab scene)
test/      bot.mjs     — scripted full playthrough, asserts AGI is reachable & paced
           smoke.mjs   — imports everything under a DOM stub, builds all tabs
           browser.mjs — boots the real game in headless Chrome/Edge via playwright-core
```

```bash
npm test           # balance bot + smoke
npm run test:browser
```

## Deploy on GitHub Pages

Settings → Pages → deploy from branch → `main` / root. That's it (`.nojekyll` included).

---
*Made with Claude Code. Any resemblance to real lab founders, living or scaling, is affectionate parody.*
