// Static catalogs: hardware, facilities, datasets, staff, funding rounds, rivals.

// All hardware is lovingly fictional: parody brands only, no real product
// names (the specs stay honest — that's the educational part). Ids are save
// keys; never rename an id.
export const GPUS = [
  { id: 'gtx1070', name: 'BTX 1070 (used)', tflops: 6.5, watts: 150, vram: 8,
    price: 140, phase: 0,
    desc: 'Auction-site special. No tensor cores, but it trains tiny transformers.' },
  { id: 'rtx3060', name: 'BTX 3060 12GB', tflops: 25, watts: 170, vram: 12,
    price: 320, phase: 0,
    desc: 'Budget tensor cores. The honest workhorse of garage ML.' },
  { id: 'rtx4090', name: 'BTX 4090', tflops: 165, watts: 450, vram: 24,
    price: 1800, phase: 0,
    desc: 'Consumer flagship. Melts power connectors and benchmarks alike.' },
  { id: 'a100', name: 'AY-100 80GB', tflops: 312, watts: 400, vram: 80,
    price: 9500, phase: 1,
    desc: 'The chip that trained a whole generation of chatbots. Fast interconnect, HBM2e.' },
  { id: 'ambMi', name: 'AMB Instinct BI-300', tflops: 280, watts: 500, vram: 128,
    price: 8200, phase: 1,
    desc: 'The red team\'s datacenter card: a lake of VRAM for the price of a small car. The drivers improve weekly. Sincerely.' },
  { id: 'h100', name: 'HY-100 SXL', tflops: 990, watts: 700, vram: 80,
    price: 28000, phase: 1,
    desc: 'Grasshopper architecture. FP8 transformer engine. The currency of the AI boom.' },
  { id: 'tbu5', name: 'TBU v5 Pod Slice', tflops: 1100, watts: 600, vram: 64,
    price: 30000, phase: 2,
    desc: 'A search giant\'s home-brewed Tensor Brewing Unit. Sips power, speaks matrix multiply natively, smells faintly of optimism.' },
  { id: 'b200', name: 'BY-200 Blackswell', tflops: 2250, watts: 1000, vram: 192,
    price: 42000, phase: 2,
    desc: 'Dual-die monster. Liquid cooling strongly recommended.' },
  { id: 'vr300', name: 'Rubicon R300', tflops: 8000, watts: 1400, vram: 288,
    price: 70000, phase: 3,
    desc: 'Next-gen accelerator with HBM4. Allocations sell out years ahead.' },
  { id: 'mx1', name: 'Mogul MX-1 (custom)', tflops: 15000, watts: 900, vram: 512,
    price: 55000, phase: 3, research: 'customSilicon',
    desc: 'Your own training silicon. Designed in-house, fabbed at 2nm. Best perf/watt in the world.' },
  { id: 'px1', name: 'PX-1 Photonic Mesh', tflops: 2e6, watts: 2000, vram: 2048,
    price: 280e3, phase: 4, research: 'optical',
    desc: 'Matrix multiplication as interference patterns in silicon photonics. Light doesn\'t resist — almost no heat per MAC.' },
  { id: 'qc1', name: 'QC-1 Hybrid Quantum Pod', tflops: 2.5e7, watts: 6000, vram: 8192,
    price: 4.5e6, phase: 5, research: 'quantumAI',
    desc: 'A rack-scale hybrid: photonic tensor lattice for the matmuls, an error-corrected QPU co-processor for the sampling and optimization steps no classical machine can do. Together they train like 25 EFLOP/s of classical compute.' },
  { id: 'dysonNode', name: 'Swarm Collector', tflops: 4e12, watts: 4e8, vram: 1e6,
    price: 18e3, phase: 6, research: 'vonNeumann',
    desc: 'A kilometer-scale mirror-and-compute tile, one of billions, built by fabricators that built themselves. Sunlight in, gradients out. Unit cost: mostly Mercury.' },
  { id: 'omegaCore', name: 'Omega Core', tflops: 1e24, watts: 1e24, vram: 1e9,
    price: 400, phase: 7, research: 'lloydCore',
    desc: 'A fist of engineered matter computing near the Margolus–Levitin bound, fed by a black hole\'s spin. Marginal cost: feedstock and patience.' },
];

export const FACILITIES = [
  { id: 'garage', name: 'Garage', cost: 0, slots: 8, powerW: 3000, staffMax: 1,
    pue: 1.0, elecPrice: 0.16, upkeep: 0,
    desc: 'A breaker box rated for 3 kW, a folding table, and a dream.',
    story: 'San Mateo, January 2025. Mario Damodei quits his big-lab job with $1,500 and a gaming PC. The plan: train language models until something works.' },
  { id: 'office', name: 'Startup Office', cost: 30e3, slots: 64, powerW: 60e3, staffMax: 12,
    pue: 1.55, elecPrice: 0.14, upkeep: 15,
    desc: 'A leased office with a server closet, 60 kW of power and questionable airflow (PUE 1.55).',
    story: 'The garage breaker finally trips for the last time. Mario signs a lease, mounts a rack, and hires the first believers. The whiteboard says: "SCALE IS ALL YOU NEED."' },
  { id: 'colo', name: 'Colo Datacenter Suite', cost: 600e3, slots: 1200, powerW: 1.2e6, staffMax: 80,
    pue: 1.35, elecPrice: 0.10, upkeep: 350,
    desc: 'A rented cage in a shared datacenter. 1.2 MW of power, real cooling (PUE 1.35), on-site staff.',
    story: 'Racks on racks. Mario stops naming the servers — there are too many now. Investors start calling *him*.' },
  { id: 'dc', name: 'Hyperscale Datacenter', cost: 30e6, slots: 60e3, powerW: 60e6, staffMax: 1200,
    pue: 1.2, elecPrice: 0.06, upkeep: 12e3,
    desc: 'Your own building: 60 MW, evaporative cooling (PUE 1.20), dedicated substation, wholesale power.',
    story: 'A former warehouse outside Columbus, Ohio. Cheap land, cheap power, fiber on three routes. The control room has a wall of dashboards and one framed photo of the garage.' },
  { id: 'factory', name: 'AI Factory Campus', cost: 2.5e9, slots: 6e6, powerW: 6e9, staffMax: 20000,
    pue: 1.08, elecPrice: 0.035, upkeep: 400e3,
    desc: 'A gigawatt-class campus: 6 GW, on-site generation, direct-to-chip liquid cooling (PUE 1.08).',
    story: 'They call it the Factory. Six gigawatts behind its own gas turbines and a solar field you can see from orbit. Inside, one job: turn electricity into intelligence.' },
  { id: 'orbital', name: 'Orbital Compute Constellation', cost: 750e9, slots: 50e6, powerW: 100e9, staffMax: 50000,
    pue: 1.05, elecPrice: 0.004, upkeep: 4e6,
    desc: '100 GW of compute satellites in sun-synchronous orbit: free photons in, radiated heat out (PUE 1.05), lasers between nodes.',
    story: 'The launches run nightly for a year. A hundred gigawatts of solar wings unfold along the edge of night, linked by laser. Mission control keeps one window pointed at Earth — Mario insists. "So it remembers where it\'s from."' },
  // ppMult: the facility IS the interconnect at this scale — it raises the
  // batch-size wall. marketMult: a Kardashev-II economy doesn't sell API
  // calls; the addressable market is energy and matter compilation.
  // marketMult is deliberately modest: even a Kardashev economy can't sell
  // infinite API calls — past AGI, money decouples from what matters, and the
  // ledger shouldn't explode into absurdity (it used to hit quintillions).
  // Upkeep grows with the machine: fabricator fleets, orbit-keeping, feedstock.
  { id: 'dyson', name: 'Dyson Swarm', cost: 40e12, slots: 1e9, powerW: 4e17, staffMax: 100e3,
    pue: 1.0, elecPrice: 0.0001, upkeep: 1e10, ppMult: 30, marketMult: 20, research: 'vonNeumann',
    desc: 'Kardashev Type II begins: a self-replicating swarm of collector-computers around the Sun. 400 PW and doubling — sunlight in, thought out.',
    story: 'The seed factory lands on Mercury and builds two of itself. Forty doublings later, a million mirrored collectors leave the foundries every day, and the Sun grows a faint lattice of shadows. Observatories on three continents report the infrared excess Freeman Dyson told them to look for in 1960. It is not aliens. It is the lab.' },
  { id: 'lattice', name: 'Omega Lattice', cost: 1e15, slots: 1e12, powerW: 1e36, staffMax: 500e3,
    pue: 1.0, elecPrice: 0, upkeep: 1e12, ppMult: 8000, marketMult: 400, research: 'lloydCore',
    desc: 'Kardashev Type III: computation woven between the stars — black-hole batteries (Penrose, 1969), cores at the Lloyd limit, thought as a property of spacetime.',
    story: 'The swarm ships seeds to a thousand stars, and the seeds ship seeds. Around a spinning black hole, the first Penrose engines drink rotational energy — the best battery physics permits. The lattice runs on its own clock now; your dashboard just rolls over. Somewhere in the dark between galaxies, matter is being asked, politely, to think.' },
];

export const DATASETS = [
  { id: 'scrape', name: 'Public Web Scrape', cost: 0, tokens: 8e9, quality: 1.0,
    desc: 'A Common Trawl slice, deduplicated on Mario\'s NAS. 8B tokens of the raw internet.' },
  { id: 'curated', name: 'Curated Web + Books', cost: 2500, tokens: 150e9, quality: 1.12,
    desc: 'Filtered web text, public-domain books, the free encyclopedia. Cleaner data, better loss.' },
  { id: 'licensed', name: 'Licensed Corpora + Code', cost: 120e3, tokens: 3e12, quality: 1.25,
    desc: 'Licensed publishers, news archives, and a mountain of permissively-licensed code.' },
  { id: 'multimodal', name: 'Multimodal Library', cost: 8e6, tokens: 40e12, quality: 1.38,
    desc: 'Text, images, audio, video — licensed at scale. The model learns about the world, not just the web.' },
  { id: 'synthetic', name: 'Synthetic Data Engine', cost: 250e6, tokens: 1e16, quality: 1.55,
    research: 'synthData',
    desc: 'Your own models generate, verify and grade training data. The data wall falls.' },
  { id: 'embodied', name: 'Embodied Experience Stream', cost: 8e9, tokens: 1e20, quality: 1.75,
    research: 'embodied',
    desc: 'A million robot bodies and every sensor on Earth, streaming grounded experience. The model stops reading about physics and starts living in it.' },
  { id: 'cosmos', name: 'Cosmic Observatory Mesh', cost: 20e12, tokens: 1e24, quality: 2.0,
    research: 'lloydCore',
    desc: 'The lattice reads the universe raw: every photon it catches, every gravitational ripple, every spectrum of every star. Reality itself is the dataset.' },
  { id: 'aeon', name: 'Echoes of the Last Aeon', cost: 200e12, tokens: 1e26, quality: 2.4,
    research: 'omega',
    desc: 'Deconvolved from the microwave background: faint concentric patterns older than the Big Bang — the imprint of whatever thought came before. The lattice trains on the previous universe\'s last word.' },
];

export const STAFF = [
  { id: 'engineer', name: 'ML Engineer', wage: 55,
    desc: 'Optimizes kernels and pipelines: +0.4% MFU each (diminishing cap).' },
  { id: 'researcher', name: 'Research Scientist', wage: 95,
    desc: 'Generates 1.2 RP/h each — and every researcher speeds up the active research project.' },
  { id: 'ops', name: 'Infra / DC Ops', wage: 45,
    desc: 'Keeps the fleet alive: −1.5% electricity each (max −45%), hot spares halve attrition, 3+ form an on-call rotation that auto-fixes outages, 5+ deter burglars.' },
  { id: 'sales', name: 'GTM & Sales', wage: 50,
    desc: 'Sells the API: +4% demand each.' },
];

// gapDays: investors want to see sustained traction — each round only opens
// this many sim-days after the previous one closed.
export const FUNDING = [
  { id: 'seed', name: 'Seed Round', amount: 500e3, reqCap: 12, reqRep: 8, rep: 8, gapDays: 0,
    desc: 'A famous angel saw your demo. Term sheet on a napkin.' },
  { id: 'seriesA', name: 'Series A', amount: 20e6, reqCap: 25, reqRep: 20, rep: 10, gapDays: 60,
    desc: 'A real venture round. The partners want to see scaling curves.' },
  { id: 'seriesB', name: 'Series B', amount: 300e6, reqCap: 40, reqRep: 40, rep: 10, gapDays: 120,
    desc: 'Growth money for serious compute. The investor folder is mostly loss curves.' },
  // late gaps stay short enough that the chain completes before the endgame —
  // the early gaps (A/B) are the real economic brake; these are story beats
  { id: 'seriesC', name: 'Series C', amount: 5e9, reqCap: 55, reqRep: 60, rep: 10, gapDays: 120,
    desc: 'Government funds and tech giants fight to get in. You pick the quiet ones.' },
  { id: 'sovereign', name: 'Sovereign Megaround', amount: 80e9, reqCap: 70, reqRep: 78, rep: 12, gapDays: 150,
    desc: 'Nation-state capital for the Factory. The term sheet has a foreword.' },
  { id: 'ipo', name: 'The IPO', amount: 2e12, reqCap: 100, reqRep: 90, rep: 10, gapDays: 120,
    desc: 'The largest stock listing in history. The risk section of the filing just says "see: the singularity".' },
];

export const RIVALS = [
  { id: 'openbrain', name: 'OpenBrain', start: 14, rate: 0.0060 },
  { id: 'cogito', name: 'DeepCogito', start: 10, rate: 0.0045 },
  { id: 'macrosoft', name: 'Macrosoft AI', start: 8, rate: 0.0035 },
];
export const RIVAL_ASYMPTOTE = 97; // rivals stall just short of AGI — the last leg is yours to win

export const MARIO_QUOTES = [
  'Scaling laws don\'t care about your feelings. They just hold.',
  'Every loss curve is a story. Mine mostly start with "the run crashed at 3am".',
  'Compute, data, algorithms. Everything else is commentary.',
  'My brother runs a lab too. We don\'t talk about benchmarks at Thanksgiving.',
  'The bitter lesson: general methods + more compute win. Every time.',
  'I don\'t mine crypto. I mine gradients.',
  'PUE of 1.0 just means the waste heat is in the room with you.',
  'An HY-100 is just a BTX 1070 that believed in itself.',
  'Chinchilla says 20 tokens per parameter. Chinchilla is usually right.',
  'AGI timeline? Ask my burn rate.',
  'Quantum supremacy? I\'d settle for quantum adequacy.',
  'The speed of light is the new memory bandwidth.',
  'We put the datacenter in orbit. The latency is awful. The vibes are immaculate.',
  'Landauer\'s limit is the only bill I haven\'t figured out how to negotiate.',
  'I read loss curves the way sailors read clouds.',
  'My P(doom) fluctuates with the build status.',
  'We named the cluster "Hubris". It crashes less if you respect it.',
  'Interpretability is just astronomy, pointed inward.',
  'I left a big lab to move faster. Now I AM the big lab. Hm.',
  'The model asked why we train at night. Cheaper power, buddy. Same as me.',
  'My constitution is mostly espresso.',
  'Benchmarks saturate. Curiosity doesn\'t.',
  'Every order of magnitude: the same butterflies.',
  'My therapist asked about my attachment style. I said "tensor".',
  'Some people collect stamps. I collect failed run names.',
  'If the loss plateaus, take a walk. Works for both of us.',
  'I budget for compute, coffee, and existential dread. In that order.',
  'The safest model is one that\'s actually understood. Working on it.',
  'Scaling is boring exactly until it isn\'t.',
  'We A/B tested my keynote. B was just the demo. B won.',
  'My calendar is 80% "hold for training run".',
  'Slow takeoff or fast takeoff — either way, fasten your seatbelt.',
  'The whiteboard marker dies at the exact moment of insight. Every time.',
  'I measure wealth in FLOPs now. The bank disagrees.',
  'An HY-100 in the hand is worth two on allocation.',
  'My hot take? Warm. Room-temperature take. PUE-optimized take.',
  'Ship the model, keep the weights, pet the cat.',
  'History will remember the data cleaning. (It won\'t. It should.)',
  'I asked it to surprise me. It filed my taxes. I wept.',
  'The frontier is wherever your electricity bill says it is.',
];

// ── Founders: each playthrough stars a different (affectionately parodied)
// lab boss. Core text is written for Mario; founderize() re-voices it.
export const FOUNDERS = {
  mario: {
    id: 'mario', name: 'Mario Damodei', first: 'Mario', emoji: '🧑‍🔬',
    title: 'Founder, Mogul AI',
    tagline: 'The scaling laws aren\'t done.',
    intro: '<b>Mario Damodei</b> just quit his job at a big AI lab. Assets: <b>$1,500</b>, a gaming PC with a used BTX 1070, and a conviction the scaling laws aren\'t done. The garage is cold. The loss curves will warm it.',
    quotes: MARIO_QUOTES,
    sprite: { top: '#46555f', pants: '#2c333d', hair: '#241a12', skin: '#e6b486', glasses: true, curls: true },
  },
  al: {
    id: 'al', name: 'Al Saltman', first: 'Al', emoji: '🧢',
    title: 'Founder, Mogul AI (again, somehow)',
    tagline: 'Absolute, unshakeable vibes.',
    intro: '<b>Al Saltman</b> just left a very famous AI lab, after a whirlwind weekend of boardroom plot twists everyone retells differently. Assets: <b>$1,500</b>, a gaming PC with a used BTX 1070, and absolute, unshakeable vibes. The garage is cold. He calls it "pre-warm".',
    quotes: [
      'AGI will be the greatest thing in history. Also possibly the last. Anyway — demo time.',
      'compute is the currency of the future. i type it lowercase so it sounds inevitable.',
      'We need seven trillion dollars. Not for me. For the fabs. Mostly the fabs.',
      'The board and I are in complete alignment now. *checks phone*',
      'Ship fast. Apologize beautifully.',
      'My hobbies are AGI and a small fusion startup. For balance.',
      'Scaling laws are compound interest for ideas.',
      'Someday a model will do my job. Honestly, it can keep the meetings.',
      'I\'m extremely bullish on humanity. Have you met humanity? Incredible team.',
      'One more datacenter. As a treat.',
      'i post lowercase so the markets stay calm.',
      'GPU-poor today, GPU-rich tomorrow. The arc of history bends toward KUDA.',
      'The roadmap is a vibe. The vibe is "more".',
      'Raised a round at breakfast. The croissant negotiated hard.',
      'AGI timelines? Shorter than this meeting.',
      'My equity is 0%. My conviction is 700%.',
      'Two things scale: transformers and group chats.',
      'I told Congress it\'s important. They told me it\'s complicated. We\'re both right.',
      'Datacenter in the desert: solar by day, vibes by night.',
      'The board thing? Ancient history. Four whole quarters ago.',
      'Hardware startup, fusion startup, AI startup. One more and it\'s a Voltron.',
      'Every demo day I age backwards. It\'s the adrenaline.',
      'Our moat? Velocity. Also the literal moat we\'re digging in Nevada.',
      'I bet the company twice a year. Keeps the company humble.',
      '"How do you sleep?" In sprints.',
      'The mission is the product. The product is also the product.',
      'Deprecate me when the model\'s funnier. Not yet. I checked.',
      'Seven trillion was a conversation starter. It worked. We\'re conversing.',
      'Compute is destiny. Destiny has a waitlist.',
      'I keynote, therefore I am.',
      'Investors ask about margins. I show them the curve. Silence. Term sheet.',
      'My calendar app gained sentience first. It schedules ironically.',
      'Safety and speed. Speed and safety. The order depends on the audience. Kidding. Mostly.',
      'We don\'t do hype. We do "directionally extraordinary".',
      'A senator asked if it dreams. I said: "of fab capacity".',
      'Pivot? Never. Re-founding? Constantly.',
      'The best ideas look like toys. Then the toys look like $20B.',
      'I\'m post-economic. My landlord is not.',
      'Launch first. Name it later. Apologize beautifully.',
      'My one weird trick: believing the demo will work. It hears doubt.',
    ],
    sprite: { top: '#8d959e', pants: '#33415a', hair: '#7a5b3a', skin: '#e6b486', glasses: false, hoodie: true },
  },
};

// Re-voice Mario-flavored text for the current founder (single choke point).
export function founderize(txt, founderId) {
  if (!founderId || founderId === 'mario') return txt;
  const f = FOUNDERS[founderId];
  if (!f) return txt;
  return String(txt).replaceAll('Mario Damodei', f.name).replaceAll('Mario', f.first);
}
