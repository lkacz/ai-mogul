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

// rule helpers returning { txt, pts, max } — pts may go negative (the traps)
const R = {
  near: (a, b, per, max, txt) => (g) => {
    const n = Math.min(g.list(a).filter(i => g.adj(i, b, true) > 0).length * per, max);
    return { txt, pts: n, max };
  },
  trap: (a, b, per, txt) => (g) => {
    let n = 0;
    for (const i of g.list(a)) n += g.adj(i, b, true);
    return { txt, pts: -Math.min(n * per, per * 4), max: 0, trap: n > 0 };
  },
  hotspot: (a, per, max, txt) => (g) => {
    const crowded = g.list(a).filter(i => g.adj(i, a, true) >= 3).length;
    return { txt, pts: -Math.min(crowded * per, max), max: 0, trap: crowded > 0 };
  },
  edge: (a, side, per, max, txt) => (g) => {
    const ok = g.list(a).filter(i => g.onEdge(i, side)).length;
    const all = g.list(a).length;
    return { txt, pts: Math.min(ok * per, max) - (all - ok) * per, max };
  },
  ratio: (a, b, perB, per, max, txt) => (g) => {
    const need = Math.ceil(g.list(a).length / perB);
    const have = g.list(b).length;
    const pts = have >= need ? max : Math.max(0, max - (need - have) * per);
    return { txt: txt + ` (need ${need}, have ${have})`, pts, max };
  },
  overkill: (a, b, perB, per, txt) => (g) => {
    const extra = Math.max(0, g.list(b).length - Math.ceil(Math.max(1, g.list(a).length) / perB) - 1);
    return { txt, pts: -Math.min(extra * per, per * 3), max: 0, trap: extra > 0 };
  },
  link: (a, via, b, per, max, txt) => (g) => {
    const ok = g.list(a).filter(i => g.connected(i, [via], b)).length;
    return { txt: txt + ` (${ok}/${g.list(a).length})`, pts: Math.min(ok * per, max), max };
  },
  placed: (a, per, max, txt) => (g) => ({ txt, pts: Math.min(g.list(a).length * per, max), max }),
};

export const DESIGNS = {
  1: {
    name: 'Server Closet', icon: '🏢',
    blurb: 'A real closet build: racks want a cold-air path, people want quiet, and the UPS buys you the seconds the grid won\'t.',
    parts: {
      rack: { n: 6, name: 'Server rack', icon: '🗄️', tip: 'Wants a CRAC or vent next to it — ASHRAE says keep inlets below ~27 °C.' },
      crac: { n: 2, name: 'CRAC unit', icon: '❄️', tip: 'Computer-room air conditioner. Each handles ~3 racks.' },
      vent: { n: 2, name: 'Outside vent', icon: '🪟', tip: 'Free cooling — only works on an outside wall (grid edge).' },
      ups: { n: 1, name: 'UPS', icon: '🔋', tip: 'Rides through grid blips. Wants to sit next to the racks it protects.' },
      desk: { n: 3, name: 'Desk', icon: '🪑', tip: 'Humans. They claim 60 dB of rack whine is "fine". It is not fine.' },
    },
    rules: [
      R.near('rack', 'crac', 5, 20, 'Racks with a CRAC airflow path'),
      R.near('rack', 'vent', 3, 9, 'Racks using free outside air'),
      R.edge('vent', null, 5, 10, 'Vents on an outside wall'),
      R.ratio('rack', 'crac', 3, 6, 12, 'Cooling capacity vs heat load'),
      R.near('ups', 'rack', 6, 6, 'UPS adjacent to the racks it protects'),
      R.hotspot('rack', 4, 12, 'HOTSPOT: racks packed ≥3-together overheat (looks tidy, runs hot)'),
      R.trap('desk', 'rack', 3, 'NOISE: desks beside racks tank morale'),
    ],
  },
  2: {
    name: 'Colo Cage', icon: '🗄️',
    blurb: 'The hot/cold-aisle game: containment panels cut cooling energy ~30% in real datacenters — and overcooling wastes every watt it saves.',
    parts: {
      rack: { n: 10, name: 'Rack row', icon: '🗄️', tip: 'Arrange in rows: cold air in the front, hot exhaust out the back.' },
      panel: { n: 8, name: 'Containment panel', icon: '🧱', tip: 'Seals a hot aisle so exhaust can\'t mix back into the cold supply.' },
      crah: { n: 4, name: 'CRAH unit', icon: '❄️', tip: 'Chilled-water air handler — ~4 rack rows each. More is NOT better.' },
      pdu: { n: 2, name: 'PDU', icon: '🔌', tip: 'Power distribution. Short cable runs lose less and trip less.' },
    },
    rules: [
      R.placed('rack', 2, 20, 'Rack rows deployed'),
      R.near('rack', 'panel', 3, 18, 'Rows with aisle containment (≈30% cooling savings, for real)'),
      R.near('rack', 'crah', 2, 10, 'Rows with a chilled-air path'),
      R.ratio('rack', 'crah', 4, 5, 10, 'CRAH capacity vs heat load'),
      R.overkill('rack', 'crah', 4, 4, 'OVERCOOLING: surplus CRAHs burn energy for nothing'),
      R.near('pdu', 'rack', 4, 8, 'PDUs close to the load'),
      R.hotspot('rack', 3, 9, 'HOTSPOT: blob layouts trap exhaust — rows beat blobs'),
    ],
  },
  3: {
    name: 'Hyperscale Hall', icon: '🏭',
    blurb: 'Evaporative towers on the wall, air handlers bridging them to the racks — and never, ever let the diesel exhaust drift into your intakes.',
    parts: {
      rack: { n: 12, name: 'Rack row', icon: '🗄️', tip: 'The 60 MW of load all this exists for.' },
      tower: { n: 3, name: 'Evap cooling tower', icon: '🌫️', tip: 'Evaporates water to dump heat — needs outside air (grid edge).' },
      ahu: { n: 4, name: 'Air handler', icon: '🌀', tip: 'Moves cool air from the tower side to the racks: best between both.' },
      sub: { n: 1, name: 'Substation', icon: '⚡', tip: 'Central to the load = shorter bus runs = lower losses.' },
      gen: { n: 2, name: 'Backup genset', icon: '🛢️', tip: 'Diesel ride-through. Real DC failure mode: exhaust recirculating into intakes.' },
    },
    rules: [
      R.edge('tower', null, 5, 15, 'Towers on an outside wall'),
      R.near('ahu', 'tower', 3, 12, 'Air handlers fed by towers'),
      R.near('rack', 'ahu', 2, 14, 'Rack rows on conditioned air'),
      R.near('rack', 'sub', 1, 6, 'Load close to the substation'),
      R.near('gen', 'sub', 4, 8, 'Gensets wired into the substation'),
      R.trap('gen', 'tower', 5, 'EXHAUST RECIRCULATION: genset fumes in the wet-cooling intake'),
      R.trap('gen', 'ahu', 5, 'EXHAUST RECIRCULATION: genset fumes in the air handlers'),
      R.hotspot('rack', 3, 9, 'HOTSPOT: unbroken rack blocks choke airflow'),
    ],
  },
  4: {
    name: 'AI Factory', icon: '🌆',
    blurb: 'Direct-to-chip liquid cooling: draw the pipe loop from each CDU to the dry coolers. Gas turbines firm the power — keep their heat plume away from the coolers.',
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
      R.link('cdu', 'pipe', 'cooler', 8, 24, 'CDUs plumbed to a dry cooler'),
      R.near('pod', 'cdu', 2, 10, 'Pods on a CDU manifold'),
      R.near('pod', 'pipe', 1, 8, 'Pods along the coolant loop'),
      R.edge('cooler', null, 5, 10, 'Dry coolers on outside air'),
      R.near('turbine', 'sub', 3, 6, 'Turbines feeding the substation'),
      R.near('battery', 'turbine', 4, 4, 'Battery firming the turbines'),
      R.trap('turbine', 'cooler', 6, 'HEAT ISLAND: turbine plume cooks the dry coolers'),
      R.trap('turbine', 'pod', 3, 'Turbine vibration & heat next to pods'),
      R.hotspot('pod', 3, 9, 'Pod blocks beyond the loop\'s reach'),
    ],
  },
  5: {
    name: 'Orbital Platform', icon: '🛰️',
    blurb: 'In vacuum there is no air to carry heat away — every watt must leave as σT⁴ radiation. Radiators are the whole game. The Sun is to the LEFT.',
    parts: {
      solar: { n: 6, name: 'Solar wing', icon: '🟨', tip: 'Wants the sunward (left) edge, square to the light.' },
      pod: { n: 8, name: 'Compute pod', icon: '🟩', tip: 'Generates heat that has exactly one exit: a radiator.' },
      radiator: { n: 6, name: 'Radiator panel', icon: '🟥', tip: 'Sheds heat as infrared (σT⁴). Must face cold space — never the Sun, never each other (view factor!).' },
      laser: { n: 2, name: 'Laser link', icon: '🔆', tip: 'Optical crosslinks to the rest of the constellation.' },
    },
    rules: [
      R.edge('solar', 'left', 4, 16, 'Solar wings square to the Sun (left edge)'),
      R.edge('radiator', 'right', 4, 16, 'Radiators facing deep space (right edge)'),
      R.near('pod', 'radiator', 3, 18, 'Pods with a heat path to a radiator'),
      R.trap('radiator', 'radiator', 3, 'VIEW FACTOR: radiators facing each other re-absorb each other\'s heat'),
      R.trap('radiator', 'solar', 4, 'Radiator in the solar wings\' light & shadow — useless'),
      R.near('laser', 'pod', 3, 6, 'Crosslinks beside the compute'),
      R.hotspot('pod', 3, 9, 'Pod cluster with no room to reject heat'),
    ],
  },
  6: {
    name: 'Dyson Shells', icon: '☀️',
    blurb: 'A Matrioshka layout: the Sun is to the LEFT. Collectors sunward, compute in the middle, radiators outward — each shell works on the waste heat of the one inside it.',
    parts: {
      collector: { n: 8, name: 'Collector tile', icon: '🟨', tip: 'Closer to the Sun = more flux (left half of the grid).' },
      compute: { n: 7, name: 'Compute shell', icon: '🟩', tip: 'Lives between light and dark — too sunward and it cooks (T ∝ 1/√r).' },
      radiator: { n: 6, name: 'Radiator shell', icon: '🟥', tip: 'The outermost layer, radiating to interstellar cold.' },
      foundry: { n: 1, name: 'Mercury foundry', icon: '🏭', tip: 'The self-replicating fab. It lives on Mercury — leftmost column.' },
      driver: { n: 1, name: 'Mass driver', icon: '🚀', tip: 'Launches finished tiles off Mercury. Wants the foundry beside it.' },
    },
    rules: [
      (g) => { // collectors sunward (left half)
        const ok = g.list('collector').filter(i => g.xOf(i) < GRID_W / 2).length;
        return { txt: 'Collectors in the high-flux zone (sunward half)', pts: Math.min(ok * 2, 16), max: 16 };
      },
      (g) => { // Matrioshka nesting: each compute shell with a radiator somewhere to its right
        const rads = g.list('radiator');
        const ok = g.list('compute').filter(i =>
          rads.some(r => g.yOf(r) === g.yOf(i) && g.xOf(r) > g.xOf(i))).length;
        return { txt: 'Matrioshka nesting: compute radiates outward to a cooler shell', pts: Math.min(ok * 3, 21), max: 21 };
      },
      (g) => { // overheating trap: compute in the two sunmost columns
        const hot = g.list('compute').filter(i => g.xOf(i) <= 1).length;
        return { txt: 'OVERHEAT: compute parked at Mercury flux (T ∝ 1/√r)', pts: -hot * 4, max: 0, trap: hot > 0 };
      },
      R.edge('foundry', 'left', 8, 8, 'Foundry on Mercury (leftmost column)'),
      R.near('driver', 'foundry', 8, 8, 'Mass driver at the foundry door'),
      R.near('compute', 'collector', 1, 7, 'Compute fed by adjacent collectors'),
      R.hotspot('collector', 2, 6, 'SELF-SHADING: stacked collectors eclipse each other'),
    ],
  },
  7: {
    name: 'Omega Lattice Node', icon: '🌌',
    blurb: 'Landauer\'s principle: erasing a bit costs kT·ln2 — so compute against the coldest sink you can find (the 2.7 K void), and draw power from the black hole\'s spin without falling into its tides.',
    parts: {
      bh: { n: 1, name: 'Black-hole battery', icon: '⚫', tip: 'A Penrose engine drinking rotational energy. Respect the tidal zone.' },
      core: { n: 8, name: 'Compute core', icon: '🟪', tip: 'Wants black-hole power (via links) AND a cold sink to dump entropy into.' },
      sink: { n: 4, name: 'Cold sink', icon: '🟦', tip: 'Faces the intergalactic void (any edge): erasing bits at 2.7 K is as cheap as physics allows.' },
      link: { n: 12, name: 'Power link', icon: '➕', tip: 'Carries Penrose power from the hole to the cores.' },
      shield: { n: 2, name: 'Tidal shield', icon: '🛡️', tip: 'Buffers cores that must sit near the hole.' },
    },
    rules: [
      R.link('core', 'link', 'bh', 4, 24, 'Cores wired to the black-hole battery'),
      R.near('core', 'sink', 3, 18, 'Cores erasing bits against a cold sink (Landauer)'),
      R.edge('sink', null, 3, 12, 'Sinks open to the 2.7 K void'),
      R.trap('core', 'bh', 6, 'TIDAL ZONE: cores beside the hole get spaghettified schedules'),
      R.near('shield', 'bh', 4, 8, 'Shields buffering the tidal zone'),
      R.hotspot('core', 2, 6, 'Core cluster sharing one sink'),
    ],
  },
};

// Score a layout: returns { score 0-100, lines[], fx {pue,mfu,elec} }.
export function scoreDesign(phase, cells) {
  const def = DESIGNS[phase];
  if (!def) return null;
  const g = ctxOf(cells || {});
  const lines = def.rules.map(r => r(g));
  let pts = 0, max = 0;
  for (const l of lines) { pts += l.pts; max += l.max; }
  const score = max > 0 ? clamp(Math.round(50 + (pts / max) * 50), 0, 100) : 50;
  const f = designFraction(score);
  const fx = {
    pue: DESIGN_MAX_FX.pue * f,
    mfu: DESIGN_MAX_FX.mfu * f,
    elec: 1 + DESIGN_MAX_FX.elec * f,
  };
  return { score, lines, fx, pts, max };
}

// count placed parts of a type
export function placedCount(cells, type) {
  return Object.values(cells || {}).filter(p => p === type).length;
}
