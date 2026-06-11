# 🧠 AI Mogul

**From a garage GPU to a gigawatt AI factory — a realistic browser simulation of building an AI lab.**

San Mateo, January 2025. **Mario Damodei** quits his big-lab job with $1,500, a gaming PC with a
used GTX 1070, and a conviction that the scaling laws aren't done. Train language models, sell
fine-tuning gigs, ship an API, raise funding, build datacenters — and race three rival labs to
**capability 100: AGI**. And then discover the quest doesn't end there: a hidden post-AGI arc
through real future technologies leads to **capability 200 — the Singularity**, and the game
ends in a big-bang.

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
| Funding round gates | Investors fund traction over time — seed → Series A/B/C → sovereign megaround → IPO |
| AI research feedback | Past capability 50, your models accelerate your own algorithmic progress |
| Hardware entropy | GPUs die at scale (Meta logged 466 interruptions in 54 days on Llama 3); racks catch fire (ask OVH, 2021); thieves like accelerators; humans spill coffee — ops staff and checkpointing mitigate |
| Intelligence explosion | Past capability 100, self-improvement compounds exponentially (I. J. Good, 1965) — but the fixed point only passes 200 if you feed it new physics |

Capability is a log-scale index of effective training compute: ~12 is a GPT-2-era model,
~28 the ChatGPT moment, ~38 GPT-4-era, 100 = AGI, 200 = the Singularity.

## Beyond AGI: the Beyond Silicon era 🛰️

AGI is the twist, not the ending. A fifth research era unlocks at capability 100, built from
**real, plausible future technologies**. The rule the game holds itself to: eras 1–4 are real,
shipped techniques; era 5 may extrapolate, but only along today's published roadmaps — and each
item researched pops a "📚 the real thing" explainer of where it actually stands today:

- **Photonic computing** — matmuls as light interference (unlocks the PX-1 Photonic Mesh)
- **Analog in-memory computing** — memristor crossbars; Ohm's law multiplies, Kirchhoff adds
- **Neuromorphic serving** — spiking chips chasing the brain's 20 W
- **Superconducting & reversible logic** — picosecond Josephson junctions, the Landauer limit
- **Fusion power on-site** — Q>10 tokamaks behind the substation
- **Embodied AI fleets** — robots streaming grounded experience (a 10²⁰-token dataset)
- **Quantum machine learning** — error-corrected QPU co-processors for the sampling and
  optimization classical chips can't do (unlocks the QC-1 *hybrid* quantum pod — the tensor
  math stays classical, as real roadmaps suggest)
- **Full world simulation, atomically precise manufacturing, Ω-Recursion…**

Scale into the **Orbital Compute Constellation** — 100 GW of solar-powered satellites — push the
Singularity Index to 200, and watch the ending: the model compresses everything it knows into a
single point, and the screen plays a **big-bang** — shockwaves, a cooling particle universe,
galaxies condensing, and one small blue world with a familiar garage light.

## The lab is alive 🕹️

The Lab tab renders your facility as a living pixel-art scene, drawn procedurally on canvas
(no sprite assets, zero dependencies): Mario Damodei wanders the garage among GPU shelves and
pizza boxes; hired scientists, engineers, ops and sales walk around and work at standing desks;
racks blink with LEDs that track your real GPU count and training activity; monitors show the
live loss curve of the current run. Click anyone — including the cat — for a quip.
Each facility is its own scene: garage → startup office → colo cage → hyperscale hall →
the gigawatt Factory with its glowing core that pulses faster as you approach AGI →
an orbital station window with Earth below, drifting laser-linked compute satellites, and a
knot of light that tightens as the Singularity nears. Milestones rain confetti on everyone.

## Minigames at key moments 🎮

Short skill games appear at pivotal moments — each one teaches a real ML/infra concept and
ends with a "📚 The real thing" note:

- **🎚️ Learning-Rate Rider** (launching a frontier run) — ride the LR just under a moving
  stability ceiling: warmup → cruise → decay. Push too hard and the loss goes NaN. Up to +12%
  effective compute for that run.
- **🧹 Dedup Frenzy** (acquiring a dataset) — zap SEO spam, duplicates and PII before they hit
  the corpus, without deleting Shakespeare. Permanent data-quality bonus.
- **📟 Node Hunt** (cluster outage at 3 AM) — one of 16 nodes is stalling the all-reduce; find
  it by bisection with 5 diagnostics and win back 90% of the lost progress.
- **🍭 RLHF Rater** (researching RLHF) — judge answer pairs and meet the real failure modes:
  sycophancy, hallucination, verbosity, non-haiku haikus.

All skippable, all rate-limited, all rewards capped so the idle balance holds. The ticker also
drops real, checkable facts about scaling laws, MFU, PUE — and, late game, photonics, qubits,
the Landauer limit, fusion ignition and orbital datacenters.

## It feels alive from minute one ✨

- The goal card has a **Go →** button and the right tab pulses while you're learning the ropes.
- Tab **badges** count what's waiting for you: buyable research, fundable rounds, an affordable facility.
- Gigs build a **🔥 hot streak** — chain them without lapsing for up to ×2 pay (and an achievement at ×10).
- Money **rolls** at 60 fps; gains float up off the buttons; funding rounds rain big gold numbers.
- Every new-best model throws confetti in the lab; crossing a **capability tier**
  ("Coherent sentences" → "GPT-2-era" → … → "The Singularity") gets a purple tier-up banner.
- And entropy fights back: dead HBM, a 2 AM burglary your ops crew can foil, a flat white set on
  the test bench — and the rare rack fire that **actually burns in the pixel scene** for a day
  while insurance pays out. Sell old cards at 45% to clear slots and power for better silicon.

## How to play

- **Lab** — watch your lab live; allocate compute between training, inference (revenue) and research; do gigs early.
- **Training** — pick parameters & tokens, watch the predicted capability, hit start.
- **Hardware** — buy GPUs (GTX 1070 → H100 → B200 → custom silicon → photonic meshes → quantum pods); mind power & slots; upgrade the facility: garage → office → colo → hyperscale DC → 6 GW AI factory → orbital constellation.
- **Research** — 43 real techniques across 5 eras, from BPE tokenization to Ω-Recursion.
- **Company** — hire staff, buy datasets, publish papers, raise six rounds of funding.
- **Goals** — a 32-step quest line from "first training run" to the Singularity (the post-AGI steps stay hidden until you get there), plus achievements.

1 real second ≈ 1 sim hour at 1× (up to 500×). Space pauses. Progress accrues while you're away.

## Development

```
js/core/   pure simulation (no DOM): balance, engine, state, catalogs
js/ui/     rendering + input (scene.js = procedural pixel-art lab scene,
           singularity.js = the big-bang ending cinematic)
test/      bot.mjs     — scripted full playthrough, asserts AGI & Singularity are reachable & paced
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
