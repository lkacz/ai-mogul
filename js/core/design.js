// Facility designer: a Factorio-flavored layout puzzle for every facility
// above the garage. Pure simulation (no DOM) — the UI lives in ui/designer.js.
//
// Every part and rule is the real thing: hot/cold-aisle containment, CRAC
// ratios, generator-exhaust recirculation, liquid-cooling loops, σT⁴
// radiators that must face away from the Sun, Matrioshka shell nesting,
// Landauer-cheap computing against the 2.7 K void. Good layouts earn bounded
// bonuses; tempting-but-wrong ones (pack the racks! turbine next to the
// coolers!) score worse — exactly like life.
//
// Neutral by default: an unopened designer changes nothing, so the tuned
// game balance (and the test bot) are untouched.

import { clamp } from './util.js';

export const GRID_W = 12, GRID_H = 6;

// score 50 = neutral · 100 = full bonus · floor at −30% of the bonus range
export function designFraction(score) { return clamp((score - 50) / 50, -0.3, 1); }
// per-facility maximum effects (applied × fraction)
export const DESIGN_MAX_FX = { pue: -0.12, mfu: 0.025, elec: -0.08 };

const idx = (x, y) => y * GRID_W + x;
const xOf = (i) => i % GRID_W, yOf = (i) => Math.floor(i / GRID_W);

// helper context over a placed-cells map { cellIndex: partId }
function ctxOf(cells) {
  const list = (t) => Object.entries(cells).filter(([, p]) => p === t).map(([i]) => +i);
  const at = (x, y) => (x < 0 || y < 0 || x >= GRID_W || y >= GRID_H) ? null : cells[idx(x, y)] || null;
  const neighbors = (i, diag = false) => {
    const x = xOf(i), y = yOf(i), out = [];
    const dirs = diag ? [[1, 0], [-1, 0], [0, 1], [0, -1], [1, 1], [1, -1], [-1, 1], [-1, -1]]
      : [[1, 0], [-1, 0], [0, 1], [0, -1]];
    for (const [dx, dy] of dirs) { const p = at(x + dx, y + dy); if (p) out.push(p); }
    return out;
  };
  const adj = (i, t, diag = false) => neighbors(i, diag).filter(p => p === t).length;
  const onEdge = (i, side = null) => {
    const x = xOf(i), y = yOf(i);
    if (side === 'left') return x === 0;
    if (side === 'right') return x === GRID_W - 1;
    return x === 0 || y === 0 || x === GRID_W - 1 || y === GRID_H - 1;
  };
  // flood-fill: is cell `from` connected to any `toType` through `viaTypes` cells?
  const connected = (from, viaTypes, toType) => {
    const seen = new Set([from]);
    const q = [from];
    while (q.length) {
      const i = q.pop();
      const x = xOf(i), y = yOf(i);
      for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
        const nx = x + dx, ny = y + dy;
        if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
        const j = idx(nx, ny), p = cells[j];
        if (!p || seen.has(j)) continue;
        if (p === toType) return true;
        if (viaTypes.includes(p)) { seen.add(j); q.push(j); }
      }
    }
    return false;
  };
  return { cells, list, at, adj, onEdge, connected, xOf, yOf };
}

// Rule helpers. Each returns { txt, pts, max, trap?, mark? } — `mark` paints
// grid cells (ok / warn / bad) so the player can SEE which rack is uncooled.
// Coverage rules are proportional (fraction of placed parts satisfied) and
// every design rewards actually deploying its capacity — a tiny perfect
// layout can't beat a big good one.
const asArr = (b) => Array.isArray(b) ? b : [b];
const adjAny = (g, i, bs) => asArr(bs).some(b => g.adj(i, b, true) > 0);

const R = {
  placed: (a, max, txt) => (g, def) => {
    const n = g.list(a).length, cap = def.parts[a].n;
    return { txt: `${txt} (${n}/${cap})`, pts: Math.round(max * n / cap), max };
  },
  coverage: (a, b, max, txt) => (g) => {
    const as = g.list(a);
    if (!as.length) return { txt: `${txt} (none placed)`, pts: 0, max };
    const mark = {}; let ok = 0;
    for (const i of as) { const c = adjAny(g, i, b); if (c) ok++; mark[i] = c ? 'ok' : 'warn'; }
    return { txt: `${txt} (${ok}/${as.length})`, pts: Math.round(max * ok / as.length), max, mark };
  },
  trap: (a, b, per, txt) => (g) => {
    const mark = {}; let n = 0;
    for (const i of g.list(a)) if (adjAny(g, i, b)) { n++; mark[i] = 'bad'; }
    return { txt, pts: -Math.min(n * per, per * 4), max: 0, trap: n > 0, mark };
  },
  hotspot: (a, per, txt) => (g) => {
    const mark = {}; let n = 0;
    for (const i of g.list(a)) if (g.adj(i, a, true) >= 3) { n++; mark[i] = 'bad'; }
    return { txt, pts: -Math.min(n * per, per * 4), max: 0, trap: n > 0, mark };
  },
  edge: (a, side, max, txt) => (g) => {
    const as = g.list(a);
    if (!as.length) return { txt: `${txt} (none placed)`, pts: 0, max };
    const mark = {}; let ok = 0;
    for (const i of as) { const e = g.onEdge(i, side); if (e) ok++; mark[i] = e ? 'ok' : 'bad'; }
    const pts = Math.round(max * ok / as.length) - Math.round(Math.min((as.length - ok) * 2, max / 2));
    return { txt: `${txt} (${ok}/${as.length})`, pts, max, trap: ok < as.length, mark };
  },
  ratio: (a, b, perB, per, max, txt) => (g) => {
    const na = g.list(a).length;
    if (!na) return { txt: `${txt} (no load yet)`, pts: 0, max };
    const need = Math.ceil(na / perB), have = g.list(b).length;
    const pts = have >= need ? max : Math.max(0, max - (need - have) * per);
    return { txt: `${txt} (need ${need}, have ${have})`, pts, max };
  },
  overkill: (a, b, perB, per, txt) => (g) => {
    const extra = Math.max(0, g.list(b).length - Math.ceil(Math.max(1, g.list(a).length) / perB) - 1);
    return { txt, pts: -Math.min(extra * per, per * 3), max: 0, trap: extra > 0 };
  },
  link: (a, via, b, max, txt) => (g) => {
    const as = g.list(a);
    if (!as.length) return { txt: `${txt} (none placed)`, pts: 0, max };
    const mark = {}; let ok = 0;
    for (const i of as) {
      const c = g.adj(i, b, false) > 0 || g.connected(i, [via], b);
      if (c) ok++; mark[i] = c ? 'ok' : 'warn';
    }
    return { txt: `${txt} (${ok}/${as.length})`, pts: Math.round(max * ok / as.length), max, mark };
  },
};

export const DESIGNS = {
  1: {
    name: 'Server Closet', icon: '🏢',
    blurb: 'A real closet build: racks want a cold-air path, people want quiet, and the UPS buys you the seconds the grid won\'t.',
    fact: 'ASHRAE recommends rack inlet air at 18–27 °C — small rooms die by hot-exhaust recirculation, which is why the air path matters more than the AC\'s size.',
    guide: [
      { txt: 'Racks first — the heat source. Everything else in this room exists to feed them power and carry their heat away.', done: (g) => g.list('rack').length >= 4 },
      { txt: 'Now the cold: CRAC units beside the racks. In a closet, conditioned air is your only real cooling.', done: (g) => g.list('rack').some(i => g.adj(i, 'crac', true) > 0) },
      { txt: 'Free cooling: vents on an outside wall. Outside air costs nothing when the weather cooperates.', done: (g) => g.list('vent').some(i => g.onEdge(i)) },
      { txt: 'Protect the work: a UPS beside the racks rides through grid blips long enough to save your checkpoints.', done: (g) => g.list('ups').some(i => g.adj(i, 'rack', true) > 0) },
      { txt: 'And the humans: desks AWAY from the racks. 60 dB of fan whine is a dishwasher that never stops.', done: (g) => g.list('desk').length >= 1 && g.list('desk').every(i => g.adj(i, 'rack', true) === 0) },
    ],
    parts: {
      rack: { n: 6, name: 'Server rack', icon: '🗄️', tip: 'Wants a CRAC or vent next to it — ASHRAE says keep inlets below ~27 °C.' },
      crac: { n: 2, name: 'CRAC unit', icon: '❄️', tip: 'Computer-room air conditioner. Each handles ~3 racks.' },
      vent: { n: 2, name: 'Outside vent', icon: '🪟', tip: 'Free cooling — only works on an outside wall (grid edge).' },
      ups: { n: 1, name: 'UPS', icon: '🔋', tip: 'Rides through grid blips. Wants to sit next to the racks it protects.' },
      desk: { n: 3, name: 'Desk', icon: '🪑', tip: 'Humans. They claim 60 dB of rack whine is "fine". It is not fine.' },
    },
    rules: [
      R.placed('rack', 12, 'Racks deployed'),
      R.coverage('rack', 'crac', 18, 'Racks with a CRAC airflow path'),
      R.coverage('rack', 'vent', 8, 'Racks using free outside air'),
      R.edge('vent', null, 8, 'Vents on an outside wall'),
      R.ratio('rack', 'crac', 3, 5, 10, 'Cooling capacity vs heat load'),
      R.coverage('ups', 'rack', 6, 'UPS adjacent to the racks it protects'),
      R.hotspot('rack', 4, 'HOTSPOT: racks packed ≥3-together overheat (looks tidy, runs hot)'),
      R.trap('desk', 'rack', 3, 'NOISE: desks beside racks tank morale'),
    ],
  },
  2: {
    name: 'Colo Cage', icon: '🗄️',
    blurb: 'The hot/cold-aisle game: containment panels cut cooling energy ~30% in real datacenters — and overcooling wastes every watt it saves.',
    fact: 'Hot-aisle containment is one of the highest-ROI retrofits in the industry; Google\'s fleet-wide PUE of ~1.1 is built on exactly this kind of airflow discipline.',
    guide: [
      { txt: 'Lay rack rows with gaps between them — the gaps become your aisles: cold air in the front, hot exhaust out the back.', done: (g) => g.list('rack').length >= 6 },
      { txt: 'Containment: seal panels along the rows so exhaust can never mix back into the cold supply. This one trick cuts cooling energy ~30%.', done: (g) => g.list('rack').filter(i => g.adj(i, 'panel', true) > 0).length >= 4 },
      { txt: 'CRAH units at the row ends — about one per four rows. Resist adding more: overcooling burns energy for nothing.', done: (g) => g.list('crah').length >= 2 && g.list('rack').some(i => g.adj(i, 'crah', true) > 0) },
      { txt: 'PDUs close to the load: every meter of cable is resistance, loss, and one more thing to trip on.', done: (g) => g.list('pdu').some(i => g.adj(i, 'rack', true) > 0) },
    ],
    parts: {
      rack: { n: 10, name: 'Rack row', icon: '🗄️', tip: 'Arrange in rows: cold air in the front, hot exhaust out the back.' },
      panel: { n: 8, name: 'Containment panel', icon: '🧱', tip: 'Seals a hot aisle so exhaust can\'t mix back into the cold supply.' },
      crah: { n: 4, name: 'CRAH unit', icon: '❄️', tip: 'Chilled-water air handler — ~4 rack rows each. More is NOT better.' },
      pdu: { n: 2, name: 'PDU', icon: '🔌', tip: 'Power distribution. Short cable runs lose less and trip less.' },
    },
    rules: [
      R.placed('rack', 14, 'Rack rows deployed'),
      R.coverage('rack', 'panel', 16, 'Rows with aisle containment (≈30% cooling savings, for real)'),
      R.coverage('rack', 'crah', 10, 'Rows with a chilled-air path'),
      R.ratio('rack', 'crah', 4, 5, 8, 'CRAH capacity vs heat load'),
      R.overkill('rack', 'crah', 4, 4, 'OVERCOOLING: surplus CRAHs burn energy for nothing'),
      R.coverage('pdu', 'rack', 6, 'PDUs close to the load'),
      R.hotspot('rack', 3, 'HOTSPOT: blob layouts trap exhaust — rows beat blobs'),
    ],
  },
  3: {
    name: 'Hyperscale Hall', icon: '🏭',
    blurb: 'Evaporative towers on the wall, air handlers bridging them to the racks — and never, ever let the diesel exhaust drift into your intakes.',
    fact: 'Generator-exhaust re-ingestion during outages is a documented cause of datacenter thermal shutdowns — the backup power kills the cooling it was protecting.',
    guide: [
      { txt: 'Cooling towers on the outside walls — they evaporate water into outdoor air, the cheapest heat rejection on Earth.', done: (g) => g.list('tower').filter(i => g.onEdge(i)).length >= 2 },
      { txt: 'Air handlers bridge the towers to the hall: tower side in, rack side out.', done: (g) => g.list('ahu').some(i => g.adj(i, 'tower', true) > 0) },
      { txt: 'Now the load: rack rows on the conditioned air.', done: (g) => g.list('rack').filter(i => g.adj(i, 'ahu', true) > 0).length >= 4 },
      { txt: 'One substation, central to the load — shorter bus runs, lower losses.', done: (g) => g.list('sub').length >= 1 },
      { txt: 'Backup gensets wired to the substation — but NEVER beside towers or air handlers. Their exhaust will be eaten by your own intakes.', done: (g) => g.list('gen').length >= 1 && g.list('gen').every(i => g.adj(i, 'tower', true) === 0 && g.adj(i, 'ahu', true) === 0) && g.list('gen').some(i => g.adj(i, 'sub', true) > 0) },
    ],
    parts: {
      rack: { n: 12, name: 'Rack row', icon: '🗄️', tip: 'The 60 MW of load all this exists for.' },
      tower: { n: 3, name: 'Evap cooling tower', icon: '🌫️', tip: 'Evaporates water to dump heat — needs outside air (grid edge).' },
      ahu: { n: 4, name: 'Air handler', icon: '🌀', tip: 'Moves cool air from the tower side to the racks: best between both.' },
      sub: { n: 1, name: 'Substation', icon: '⚡', tip: 'Central to the load = shorter bus runs = lower losses.' },
      gen: { n: 2, name: 'Backup genset', icon: '🛢️', tip: 'Diesel ride-through. Real DC failure mode: exhaust recirculating into intakes.' },
    },
    rules: [
      R.placed('rack', 14, 'Rack rows deployed'),
      R.edge('tower', null, 10, 'Towers on an outside wall'),
      R.coverage('ahu', 'tower', 10, 'Air handlers fed by towers'),
      R.coverage('rack', 'ahu', 14, 'Rack rows on conditioned air'),
      R.coverage('gen', 'sub', 6, 'Gensets wired into the substation'),
      R.trap('gen', 'tower', 5, 'EXHAUST RECIRCULATION: genset fumes in the wet-cooling intake'),
      R.trap('gen', 'ahu', 5, 'EXHAUST RECIRCULATION: genset fumes in the air handlers'),
      R.hotspot('rack', 3, 'HOTSPOT: unbroken rack blocks choke airflow'),
    ],
  },
  4: {
    name: 'AI Factory', icon: '🌆',
    blurb: 'Direct-to-chip liquid cooling: draw the pipe loop from each CDU to the dry coolers. Gas turbines firm the power — keep their heat plume away from the coolers.',
    fact: '100 kW+ racks (GB200 NVL72-class) are liquid-cooled, full stop — air physically can\'t carry the heat. Real AI campuses (xAI Memphis) firm their power with on-site gas turbines plus battery banks.',
    guide: [
      { txt: 'GPU pods are the point: each is roughly a megawatt of silicon, and air physically cannot cool it. Place the pods first.', done: (g) => g.list('pod').length >= 4 },
      { txt: 'Every pod cluster needs a CDU — the coolant distribution unit is the heat exchanger that moves chip heat into facility water.', done: (g) => g.list('pod').some(i => g.adj(i, 'cdu', true) > 0) },
      { txt: 'Draw the loop: pipes from each CDU to a dry cooler. Keep runs short — every meter costs pumping power.', done: (g) => g.list('cdu').length > 0 && g.list('cdu').every(i => g.adj(i, 'cooler', false) > 0 || g.connected(i, ['pipe'], 'cooler')) },
      { txt: 'Dry coolers belong on outside walls, where the heat can finally leave the building.', done: (g) => g.list('cooler').some(i => g.onEdge(i)) },
      { txt: 'Power: gas turbines into the substation, with a battery bank to absorb the swing when 100,000 GPUs start a training step in lockstep.', done: (g) => g.list('turbine').some(i => g.adj(i, 'sub', true) > 0) && g.list('battery').some(i => g.adj(i, 'turbine', true) > 0) },
      { txt: 'Final check: keep the turbines\' heat plume away from your dry coolers — a heat island can cost you the cooling you just built.', done: (g) => g.list('turbine').length > 0 && g.list('turbine').every(i => g.adj(i, 'cooler', true) === 0) },
    ],
    parts: {
      pod: { n: 10, name: 'GPU pod', icon: '🟩', tip: 'High-density compute. Air can\'t cool this — it needs the liquid loop.' },
      cdu: { n: 3, name: 'CDU', icon: '🟦', tip: 'Coolant distribution unit. Must connect, via pipes, to a dry cooler.' },
      pipe: { n: 16, name: 'Coolant pipe', icon: '➕', tip: 'Draw the loop. Short runs = less pumping power.' },
      cooler: { n: 2, name: 'Dry cooler', icon: '🌬️', tip: 'Rejects loop heat to outside air — needs a wall (grid edge).' },
      turbine: { n: 2, name: 'Gas turbine', icon: '🔥', tip: 'Firm on-site power (it\'s what real AI campuses install) — but it makes a heat island.' },
      battery: { n: 1, name: 'Battery bank', icon: '🔋', tip: 'Smooths turbine load steps when 100k GPUs start a training step at once.' },
      sub: { n: 1, name: 'Substation', icon: '⚡', tip: 'Where turbines, batteries and grid meet.' },
    },
    rules: [
      R.placed('pod', 14, 'GPU pods deployed'),
      R.link('cdu', 'pipe', 'cooler', 18, 'CDUs plumbed to a dry cooler'),
      R.coverage('pod', ['cdu', 'pipe'], 14, 'Pods on the liquid loop'),
      R.edge('cooler', null, 8, 'Dry coolers on outside air'),
      R.coverage('turbine', 'sub', 6, 'Turbines feeding the substation'),
      R.coverage('battery', 'turbine', 4, 'Battery firming the turbines'),
      R.trap('turbine', 'cooler', 6, 'HEAT ISLAND: turbine plume cooks the dry coolers'),
      R.trap('turbine', 'pod', 3, 'Turbine vibration & heat next to pods'),
      R.hotspot('pod', 3, 'Pod blocks beyond the loop\'s reach'),
    ],
  },
  5: {
    name: 'Orbital Platform', icon: '🛰️',
    blurb: 'In vacuum there is no air to carry heat away — every watt must leave as σT⁴ radiation. Radiators are the whole game. The Sun is to the LEFT.',
    fact: 'The ISS dumps its heat through ammonia-loop radiators held edge-on to the Sun; radiator mass is the single biggest engineering objection to orbital-datacenter proposals.',
    guide: [
      { txt: 'Solar wings on the sunward side (left edge), square to the light. They are the platform\'s only power.', done: (g) => g.list('solar').filter(i => g.onEdge(i, 'left')).length >= 2 },
      { txt: 'Compute pods in the middle. Every watt they draw becomes heat — and in vacuum, heat has exactly one exit…', done: (g) => g.list('pod').length >= 3 },
      { txt: '…radiators. Put them on the deep-space side (right edge): σT⁴ radiation is the ONLY way heat leaves a spacecraft.', done: (g) => g.list('radiator').filter(i => g.onEdge(i, 'right')).length >= 2 },
      { txt: 'Give every pod a path to a radiator, and never let radiators face each other — they just re-absorb each other\'s heat.', done: (g) => g.list('pod').length > 0 && g.list('pod').every(i => g.adj(i, 'radiator', true) > 0) },
      { txt: 'Laser crosslinks beside the pods tie this platform into the constellation.', done: (g) => g.list('laser').some(i => g.adj(i, 'pod', true) > 0) },
    ],
    parts: {
      solar: { n: 6, name: 'Solar wing', icon: '🟨', tip: 'Wants the sunward (left) edge, square to the light.' },
      pod: { n: 8, name: 'Compute pod', icon: '🟩', tip: 'Generates heat that has exactly one exit: a radiator.' },
      radiator: { n: 6, name: 'Radiator panel', icon: '🟥', tip: 'Sheds heat as infrared (σT⁴). Must face cold space — never the Sun, never each other (view factor!).' },
      laser: { n: 2, name: 'Laser link', icon: '🔆', tip: 'Optical crosslinks to the rest of the constellation.' },
    },
    rules: [
      R.placed('pod', 12, 'Compute pods deployed'),
      R.edge('solar', 'left', 12, 'Solar wings square to the Sun (left edge)'),
      R.edge('radiator', 'right', 12, 'Radiators facing deep space (right edge)'),
      R.coverage('pod', 'radiator', 16, 'Pods with a heat path to a radiator'),
      R.trap('radiator', 'radiator', 3, 'VIEW FACTOR: radiators facing each other re-absorb each other\'s heat'),
      R.trap('radiator', 'solar', 4, 'Radiator in the solar wings\' light & shadow — useless'),
      R.coverage('laser', 'pod', 4, 'Crosslinks beside the compute'),
      R.hotspot('pod', 3, 'Pod cluster with no room to reject heat'),
    ],
  },
  6: {
    name: 'Dyson Shells', icon: '☀️',
    blurb: 'A Matrioshka layout: the Sun is to the LEFT. Collectors sunward, compute in the middle, radiators outward — each shell works on the waste heat of the one inside it.',
    fact: 'A swarm element\'s equilibrium temperature falls as 1/√r from the star — Matrioshka brains (Bradbury) exploit that gradient, each cooler shell computing on the inner shell\'s waste heat.',
    guide: [
      { txt: 'The foundry lands on Mercury (leftmost column). The only way anyone builds a swarm is with a factory that builds factories.', done: (g) => g.list('foundry').some(i => g.onEdge(i, 'left')) },
      { txt: 'The mass driver goes at the foundry door — finished tiles get launched electromagnetically, not lifted on rockets.', done: (g) => g.list('driver').some(i => g.adj(i, 'foundry', true) > 0) },
      { txt: 'Collector tiles sunward (left half of the grid), where the flux is thickest.', done: (g) => g.list('collector').filter(i => g.xOf(i) < 6).length >= 4 },
      { txt: 'Compute shells in the middle band — close enough for power, far enough not to cook (equilibrium temperature falls as 1/√r).', done: (g) => g.list('compute').length >= 3 && g.list('compute').every(i => g.xOf(i) > 1) },
      { txt: 'Radiator shells outermost, each layer radiating to the colder one outside it. Congratulations: that\'s a Matrioshka brain.', done: (g) => { const rads = g.list('radiator'); return g.list('compute').length > 0 && g.list('compute').every(i => rads.some(r => g.yOf(r) === g.yOf(i) && g.xOf(r) > g.xOf(i))); } },
    ],
    parts: {
      collector: { n: 8, name: 'Collector tile', icon: '🟨', tip: 'Closer to the Sun = more flux (left half of the grid).' },
      compute: { n: 7, name: 'Compute shell', icon: '🟩', tip: 'Lives between light and dark — too sunward and it cooks (T ∝ 1/√r).' },
      radiator: { n: 6, name: 'Radiator shell', icon: '🟥', tip: 'The outermost layer, radiating to interstellar cold.' },
      foundry: { n: 1, name: 'Mercury foundry', icon: '🏭', tip: 'The self-replicating fab. It lives on Mercury — leftmost column.' },
      driver: { n: 1, name: 'Mass driver', icon: '🚀', tip: 'Launches finished tiles off Mercury. Wants the foundry beside it.' },
    },
    rules: [
      R.placed('compute', 10, 'Compute shells deployed'),
      (g) => { // collectors sunward (left half)
        const cs = g.list('collector');
        if (!cs.length) return { txt: 'Collectors in the high-flux zone (none placed)', pts: 0, max: 14 };
        const mark = {}; let ok = 0;
        for (const i of cs) { const c = g.xOf(i) < GRID_W / 2; if (c) ok++; mark[i] = c ? 'ok' : 'warn'; }
        return { txt: `Collectors in the high-flux zone (${ok}/${cs.length})`, pts: Math.round(14 * ok / cs.length), max: 14, mark };
      },
      (g) => { // Matrioshka nesting: compute radiates outward to a cooler shell
        const cs = g.list('compute'), rads = g.list('radiator');
        if (!cs.length) return { txt: 'Matrioshka nesting (no compute placed)', pts: 0, max: 18 };
        const mark = {}; let ok = 0;
        for (const i of cs) {
          const c = rads.some(r => g.yOf(r) === g.yOf(i) && g.xOf(r) > g.xOf(i));
          if (c) ok++; mark[i] = c ? 'ok' : 'warn';
        }
        return { txt: `Matrioshka nesting: compute radiates outward (${ok}/${cs.length})`, pts: Math.round(18 * ok / cs.length), max: 18, mark };
      },
      (g) => { // overheating trap: compute at Mercury flux
        const mark = {}; let hot = 0;
        for (const i of g.list('compute')) if (g.xOf(i) <= 1) { hot++; mark[i] = 'bad'; }
        return { txt: 'OVERHEAT: compute parked at Mercury flux (T ∝ 1/√r)', pts: -hot * 4, max: 0, trap: hot > 0, mark };
      },
      R.edge('foundry', 'left', 8, 'Foundry on Mercury (leftmost column)'),
      R.coverage('driver', 'foundry', 8, 'Mass driver at the foundry door'),
      R.coverage('compute', 'collector', 7, 'Compute fed by adjacent collectors'),
      R.hotspot('collector', 2, 'SELF-SHADING: stacked collectors eclipse each other'),
    ],
  },
  7: {
    name: 'Omega Lattice Node', icon: '🌌',
    blurb: 'Landauer\'s principle: erasing a bit costs kT·ln2 — so compute against the coldest sink you can find (the 2.7 K void), and draw power from the black hole\'s spin without falling into its tides.',
    fact: 'Landauer (1961): bit erasure costs kT·ln2, so a computer at 3 K pays ~100× less per erased bit than one at 300 K. Penrose (1969): up to 29% of a spinning black hole\'s mass-energy is extractable.',
    guide: [
      { txt: 'The black-hole battery anchors the node — a Penrose engine drinking the hole\'s rotational energy.', done: (g) => g.list('bh').length >= 1 },
      { txt: 'Keep compute cores OUT of the tidal zone. Wire them to the hole with power links instead of parking them beside it.', done: (g) => g.list('core').length >= 3 && g.list('core').every(i => g.adj(i, 'bh', true) === 0) },
      { txt: 'Cold sinks on the edges, facing the intergalactic void: at 2.7 K, erasing a bit costs ~100\u00d7 less than at room temperature (Landauer).', done: (g) => g.list('sink').filter(i => g.onEdge(i)).length >= 2 },
      { txt: 'Every core wants both: a power link back to the hole, and a cold sink at its side to dump entropy into.', done: (g) => { const cs = g.list('core'); return cs.length > 0 && cs.every(i => (g.adj(i, 'bh', false) > 0 || g.connected(i, ['link'], 'bh')) && g.adj(i, 'sink', true) > 0); } },
      { txt: 'Shields buffer anything that absolutely must sit near the hole.', done: (g) => g.list('shield').some(i => g.adj(i, 'bh', true) > 0) },
    ],
    parts: {
      bh: { n: 1, name: 'Black-hole battery', icon: '⚫', tip: 'A Penrose engine drinking rotational energy. Respect the tidal zone.' },
      core: { n: 8, name: 'Compute core', icon: '🟪', tip: 'Wants black-hole power (via links) AND a cold sink to dump entropy into.' },
      sink: { n: 4, name: 'Cold sink', icon: '🟦', tip: 'Faces the intergalactic void (any edge): erasing bits at 2.7 K is as cheap as physics allows.' },
      link: { n: 12, name: 'Power link', icon: '➕', tip: 'Carries Penrose power from the hole to the cores.' },
      shield: { n: 2, name: 'Tidal shield', icon: '🛡️', tip: 'Buffers cores that must sit near the hole.' },
    },
    rules: [
      R.placed('core', 12, 'Compute cores deployed'),
      R.link('core', 'link', 'bh', 18, 'Cores wired to the black-hole battery'),
      R.coverage('core', 'sink', 14, 'Cores erasing bits against a cold sink (Landauer)'),
      R.edge('sink', null, 8, 'Sinks open to the 2.7 K void'),
      R.trap('core', 'bh', 6, 'TIDAL ZONE: cores beside the hole get spaghettified schedules'),
      R.coverage('shield', 'bh', 6, 'Shields buffering the tidal zone'),
      R.hotspot('core', 2, 'Core cluster sharing one sink'),
    ],
  },
};

// Score a layout: { score 0-100, lines[], fx {pue,mfu,elec}, marks {cell:status} }.
export function scoreDesign(phase, cells) {
  const def = DESIGNS[phase];
  if (!def) return null;
  const g = ctxOf(cells || {});
  const lines = def.rules.map(r => r(g, def));
  let pts = 0, max = 0;
  const marks = {};   // cell status for the UI: bad > warn > ok
  const rank = { ok: 1, warn: 2, bad: 3 };
  for (const l of lines) {
    pts += l.pts; max += l.max;
    if (l.mark) for (const [i, m] of Object.entries(l.mark)) {
      if (!marks[i] || rank[m] > rank[marks[i]]) marks[i] = m;
    }
  }
  const score = max > 0 ? clamp(Math.round(50 + (pts / max) * 50), 0, 100) : 50;
  const f = designFraction(score);
  const fx = {
    pue: DESIGN_MAX_FX.pue * f,
    mfu: DESIGN_MAX_FX.mfu * f,
    elec: 1 + DESIGN_MAX_FX.elec * f,
  };
  return { score, lines, fx, pts, max, marks };
}

// the narrated build guide: which steps of the canonical build are done?
export function evalGuide(phase, cells) {
  const def = DESIGNS[phase];
  if (!def || !def.guide) return [];
  const g = ctxOf(cells || {});
  return def.guide.map(st => ({ txt: st.txt, done: !!st.done(g) }));
}

// count placed parts of a type
export function placedCount(cells, type) {
  return Object.values(cells || {}).filter(p => p === type).length;
}
