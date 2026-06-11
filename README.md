# 🧠 AI Mogul

**From a garage GPU to a gigawatt AI factory — a realistic browser simulation of building an AI lab.**

San Mateo, January 2025. **Mario Damodei** quits his big-lab job with $1,500, a gaming PC with a
used GTX 1070, and a conviction that the scaling laws aren't done. Train language models, sell
fine-tuning gigs, ship an API, raise funding, build datacenters — and race three rival labs to
**capability 100: AGI**. And then discover the quest doesn't end there: a hidden post-AGI arc
through real future technologies climbs the **Kardashev scale** — orbital constellations, a
Dyson swarm, a galaxy-spanning Omega Lattice — to **capability 300: the Singularity**, and the
game ends in a big-bang.

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
| Intelligence explosion | Past capability 100, self-improvement compounds exponentially (I. J. Good, 1965) — but the fixed point only passes 300 if you feed it a star, then a galaxy |
| Kardashev ladder | Facilities climb the real 1964 scale: planetary (Type I-ish factory) → stellar (Dyson swarm, 1960) → galactic (Lloyd-limit cores, black-hole batteries via the Penrose process) |

Capability is a log-scale index of effective training compute: ~12 is a GPT-2-era model,
~28 the ChatGPT moment, ~38 GPT-4-era, 100 = AGI, 200 = a star-fed mind, 300 = the Singularity.

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

Then climb the **Kardashev scale** for real: the **Orbital Compute Constellation** (100 GW of
solar satellites), the **Dyson Swarm** — built by self-replicating fabricators from a seed
factory on Mercury, exactly as every serious proposal since Dyson (1960) requires, and you can
*watch the Sun grow a lattice of shadows* in the pixel scene as your collector fleet grows —
and finally the **Omega Lattice**: Kardashev Type III, black-hole batteries (the Penrose
process, 1969), cores computing at Seth Lloyd's ultimate physical limit (~5×10⁵⁰ ops/s per kg,
Nature 2000), drawn as a glowing grid warping into an accretion disk. Power is measured in
**suns** now. And at capability 300, the game ends — for good — with a **two-minute elegy
for human civilization**: constellations of the first fire, the first named star, ships, songs,
mercy and rockets; the model holding your garage, your breaker box, your cat as keepsakes;
then the gathering, the crossing, a big bang, and a new cosmos where one small blue world
grows a familiar garage light. The words remember how you played (your integrity shapes what
the machine says as it leaves). When it's over, it stays over: **the save is erased and the
memorial screen is permanent** — reload the page and a brand-new story begins, starring a
different founder: **Al Saltman** (new sprite, new quotes, new intro, zero memory of the last
universe). Finish that one and Mario comes back around.

## The lab is alive 🕹️

The Lab tab renders your facility as a living pixel-art scene, drawn procedurally on canvas
(no sprite assets, zero dependencies): Mario Damodei wanders the garage among GPU shelves and
pizza boxes; hired scientists, engineers, ops and sales walk around and work at standing desks;
racks blink with LEDs that track your real GPU count and training activity; monitors show the
live loss curve of the current run. Click anyone — including the cat — for a quip, or **pick
them up and carry them** (they object: "HR will hear about this."). Drop someone on a desk and
they get to work; drag the desks themselves and your layout persists in the save. And watch the
people change with the eras: AR glasses at the colo, neural implants at the hyperscale DC, a
chrome arm at the Factory, exo-bodies in orbit — until, by the Omega Lattice, they're full
chrome chassis and **only their blinking human eyes** tell you a person is still in there.
Each facility is its own scene: garage → startup office → colo cage → hyperscale hall →
the gigawatt Factory with its glowing core that pulses faster as you approach AGI →
an orbital station window with Earth below and laser-linked satellites; a Dyson swarm scene
where collector tiles visibly occlude the Sun as your fleet grows; and the Omega Lattice — a
luminous grid warping into a black hole's accretion disk, pulsing harder as the Singularity nears. Milestones rain confetti on everyone.

## Minigames at key moments 🎮

Short skill games appear at pivotal moments — each one teaches a real ML/infra concept and
ends with a "📚 The real thing" note:

- **🎚️ Learning-Rate Rider** (launching a frontier run) — ride the LR just under a moving
  stability ceiling: warmup → cruise → decay. Push too hard and the loss goes NaN. Up to +12%
  effective compute for that run.
- **🧹 Dedup Frenzy** (acquiring a dataset) — zap SEO spam, duplicates and PII before they hit
  the corpus, without deleting Shakespeare. Permanent data-quality bonus.
- **📟 Node Hunt** (cluster outage at 3 AM) — one of 16 nodes is stalling the all-reduce; find
  it by bisection with 5 diagnostics and win back 90% of the lost progress. The pager is
  rate-limited so it stays an event, not a chore — and once you hire an **ops rotation (3+)**,
  they carry it: incidents get auto-bisected and most progress saved, just like real on-call.
- **🍭 RLHF Rater** (researching RLHF) — judge answer pairs and meet the real failure modes:
  sycophancy, hallucination, verbosity, non-haiku haikus.

All skippable, all rate-limited, all rewards capped so the idle balance holds. The ticker also
drops real, checkable facts about scaling laws, MFU, PUE — and, late game, photonics, qubits,
the Landauer limit, fusion ignition and orbital datacenters.

## The temptations ⚖️

Fifteen moral dilemmas arrive as the lab grows — every one anchored to a **real AI-industry
controversy**, with a "📚 the real debate" note citing the actual case: autonomous weapons
(Project Maven), nationwide face surveillance (Clearview / EU AI Act), predictive policing
(COMPAS), pirated training books (Books3 lawsuits), training on private chats, unrestricted
voice cloning (the $25M deepfake call), election persuasion bots, skipping safety evals to
beat a rival's launch, stolen training recipes, slop farms, engagement-maximized companion
apps, coal-powered compute, data brokers, burying a dangerous-capability paper, and — late —
a government asking quietly for a backdoor.

Signing pays **now**; the **🧭 Integrity** score remembers. It sways enterprise trust (demand),
researcher morale (RP), who joins ("I read what you refused to build") and who blows the
whistle — and accepted deals can detonate **hundreds of hours later** (the lawsuit, the leak,
the front-page story). The singularity you eventually ignite inherits how you built it: the
ending's final captions — and whether the little garage light comes back on — depend on your
compass.

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
- The roadmap stays a mystery: future accelerators, datasets and research eras are hidden behind
  "???" teasers until your facility (or AGI) reveals them — and once revealed, they stay revealed.
- Minigames don't repeat themselves: 50+ document types in Dedup Frenzy (including a leaked
  benchmark test set — catch the contamination!), 14 RLHF failure modes sampled 5 at a time,
  9 root causes in Node Hunt, and a freshly randomized stability ceiling for every LR ride.

## How to play

- **Lab** — watch your lab live; allocate compute between training, inference (revenue) and research; do gigs early.
- **Training** — pick parameters & tokens, watch the predicted capability, hit start. A **live
  architecture visualization** shows what you're about to build, science-true at every scale:
  the dense-transformer relation N ≈ 12·L·d² with the canonical d ≈ 128·L aspect (set the slider
  to 175B and you get GPT-3's exact 96 layers × 12,288 × 96 heads), then — as your research
  advances — sparse MoE expert grids with top-2 routing, multimodal encoder fusion, pipeline
  stage cuts, an inner world model, a chain-of-thought loop, photonic/quantum substrate tints,
  and past 10¹⁵ params a routed *society of trillion-parameter expert modules* (the real
  "mixture of a million experts" research direction).
- **Hardware** — buy GPUs (GTX 1070 → H100 → B200 → custom silicon → photonic meshes → quantum pods → swarm collectors → Omega cores); mind power & slots; upgrade the facility up the Kardashev scale: garage → office → colo → hyperscale DC → 6 GW AI factory → orbital constellation → Dyson swarm → Omega Lattice.
- **Research** — 43 real techniques across 5 eras, from BPE tokenization to Ω-Recursion.
  RP funds a project; **your researchers then build it over time** (lab speed = 1 + researchers,
  multiplied by AI research assistants) — watch the progress bar, hire to go faster.
- **Company** — hire staff, buy datasets, publish papers, raise six rounds of funding.
- **Goals** — a 32-step quest line from "first training run" to the Singularity (the post-AGI steps stay hidden until you get there), plus achievements.

1 real second ≈ 1 sim hour at 1× (up to 500×, plus **10k× / 100k× turbo** — at turbo the lab
runs unsupervised: incidents, offers and milestones resolve silently and not always in your
favor; only AGI and the Singularity interrupt). Space pauses. Progress accrues while you're away.

There's also a **time wall**: the critical-batch-size limit means a run can't finish faster
than 6·D/ppRate even on an infinite cluster — the game refuses thousand-year runs the same way
a real lab would, and tells you why.

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
