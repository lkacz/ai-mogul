// The paper sprint: publishing means actually writing the thing. Any keys
// work — each keystroke types the next phrase of a generated preprint
// (title, abstract, sections, numbers), calibrated to the lab's stage of
// AI development. Longer careers mean longer papers, up to ~100 keystrokes.
//
// Delegation rung (the ladder): 2+ researchers — or the models, past AGI —
// can take the draft over; an "always assign" checkbox makes every future
// publish a single click. Pure flavor: E.publishPaper stays the only
// mechanical action, so the bot and balance never notice any of this.
//
// Editorial contract: the generated science is real science — power laws,
// KL penalties, Landauer floors — with parody datasets and venues
// (Common Trawl, NeurDips), never real product or researcher names.

import { game, showModal, closeModal, toast, esc, renderAll } from './ui.js';
import { celebrate } from './scene.js';
import { publishPaper, paperCost } from '../core/engine.js';
import { FOUNDERS } from '../core/data.js';

const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ── the science, by stage of the field ──────────────────────────────
const CODENAMES = ['HOTPLATE', 'TEASPOON', 'LIGHTHOUSE', 'PAPERWEIGHT', 'MOSSBALL', 'SUNDIAL', 'MARGINALIA', 'DOORSTOP', 'COMPOST', 'LANTERN'];
const ARTIFACTS = ['checkpoints', 'eval harness', 'training logs', 'sweep configs', 'ablation grid'];
const COAUTHORS = ['A. Lin', 'K. Okafor', 'S. Marchetti', 'T. Nakamura', 'P. Iyer', 'E. Sørensen', 'L. Novak', 'D. Achebe', 'M. Castillo', 'R. Bayraktar', 'J. Whitfield', 'H. Eriksen'];

const BANDS = [
  { cap: 0, venues: ['the NeurDips workshop track', 'the Tiny Models workshop at NeurDips'],
    topic: ['byte-pair encoding', 'character-level language modeling', 'dropout in tiny transformers', 'weight tying', 'learning-rate warmup', 'embedding arithmetic'],
    method: ['a 6-layer transformer', 'an embarrassingly small LSTM baseline', 'aggressive weight decay', 'a 2,000-merge BPE vocabulary', 'gradient clipping at 1.0'],
    bench: ['held-out perplexity', 'next-character accuracy', 'validation loss', 'bits per byte'],
    data: ['a 90 MB slice of Common Trawl', 'the Hacker Newts comment dump', 'a public-domain book corpus', 'four megabytes of cooking forums'],
    prop: ['surprising effectiveness', 'sample efficiency', 'training instability', 'memorization behavior'],
    claim: ['most of the gain comes from the tokenizer, not the architecture', 'the model memorizes before it generalizes', 'small models are underrated as scientific instruments', 'warmup matters more below batch size 64 than anyone admits'],
    extra: ['The model overfits after a single epoch; we stop early and say so.',
      'Training cost eleven dollars of electricity, most of it in August.',
      'A learning rate of 10 diverged immediately; we include the run for honesty.',
      'The full sweep fits on one GPU and one weekend, in that order of scarcity.'] },
  { cap: 15, venues: ['NeurDips', 'ICGD (the International Conference on Gradient Descent)'],
    topic: ['compute-optimal scaling', 'data deduplication', 'few-shot prompting', 'tokenizer fertility across languages', 'learning-rate transfer across widths', 'curriculum ordering of web text'],
    method: ['a sweep of 40 models from 10M to 3B parameters', 'exact-substring deduplication', 'a 20-tokens-per-parameter budget', 'width-scaled initialization', 'an n-gram quality filter'],
    bench: ['the OmniQuiz suite', 'held-out loss', 'five-shot accuracy', 'the ParrotBench leaderboard'],
    data: ['Common Trawl', 'a deduplicated Common Trawl', 'the arHive corpus', '300B tokens of filtered web text'],
    prop: ['predictability', 'data efficiency', 'emergence', 'transferability'],
    claim: ['loss follows a power law in compute with exponent −{exp}', 'most public models are undertrained for their size', 'duplicate documents cost more than they teach', 'scale alone does not fix what data quality breaks'],
    extra: ['Loss falls as a clean power law across three orders of magnitude; the fit residuals are smaller than our error bars.',
      'Removing near-duplicates improves held-out loss as much as doubling model size.',
      'The largest model began answering questions we had not thought to ask; we report this without explanation.',
      'Extrapolating figure 2 is left as an exercise for whoever owns more GPUs.'] },
  { cap: 35, venues: ['NeurDips', 'ACLamation', 'the Journal of Very Deep Learning'],
    topic: ['preference-model overoptimization', 'sycophancy in tuned assistants', 'chain-of-thought faithfulness', 'mixture-of-experts routing', '4-bit weight quantization', 'benchmark contamination', 'induction heads'],
    method: ['reinforcement learning from human feedback', 'a KL penalty against the base model', 'top-2 expert routing with a load-balancing loss', 'activation patching', 'an n-gram contamination audit'],
    bench: ['GauntletEval', 'human preference win-rate', 'the OmniQuiz suite', 'a held-out red-team set'],
    data: ['140,000 human preference pairs', 'the arHive corpus', 'a contamination-audited eval split'],
    prop: ['faithfulness', 'calibration', 'reward hacking', 'brittleness'],
    claim: ['the reward model prefers confident answers over correct ones', 'tuned models agree with users who are wrong {pct}% more often', 'quantization to 4 bits preserves {pct2}% of accuracy at a quarter of the memory', 'the chain of thought sometimes rationalizes an answer the model had already chosen'],
    extra: ['Past a certain KL budget, reward keeps rising while human ratings fall — the reward model has been outsmarted, politely.',
      'Ablating 0.1% of attention heads removes the behavior entirely; we name the heads in appendix B.',
      'The contamination audit found our own previous paper in the training set.',
      'Expert 7 receives 40% of routed tokens and we cannot make it stop.'] },
  { cap: 65, venues: ['NeurDips', 'the Journal of Very Deep Learning', 'Transactions on Embiggened Models'],
    topic: ['long-horizon tool use', 'process reward models', 'synthetic-data self-distillation', 'test-time compute scaling', 'scalable oversight by debate', 'automated red-teaming'],
    method: ['an agent scaffold with reflection and retry', 'verifier-guided search at inference', 'a generator–critic training loop', 'two model instances arguing before a weaker judge', 'curriculum self-play'],
    bench: ['a 40-step software task suite', 'GauntletEval-Hard', 'verified task-completion rate', 'judge accuracy under debate'],
    data: ['two million model-written training episodes', 'a sandboxed tool environment', 'the embodied-fleet trajectory corpus'],
    prop: ['autonomy', 'compounding error', 'oversight leverage', 'self-correction'],
    claim: ['thinking longer at inference buys what {x}× more parameters would', 'the critic catches {pct}% of its own generator\'s mistakes', 'debate lets a weaker judge supervise a stronger model, within limits we measure', 'success on long-horizon tasks doubles when the agent is allowed to admit confusion'],
    extra: ['The agent completed the task, then filed a ticket arguing the task was poorly specified. The ticket was correct.',
      'Synthetic data helps until the model starts citing itself; we characterize the collapse threshold.',
      'Our strongest baseline is last quarter\'s model, which is becoming a pattern.',
      'Tool errors compound at {pct}% per step untreated; reflection flattens the curve.'] },
  { cap: 100, venues: ['Transactions on Embiggened Models', 'the post-AGI track at NeurDips'],
    topic: ['weak-to-strong generalization', 'interpretability at frontier scale', 'self-improvement with verified brakes', 'photonic inference fabrics', 'model-discovered optimization algorithms', 'alignment audits of superhuman systems'],
    method: ['a frozen weak supervisor eliciting a stronger student', 'sparse-autoencoder feature dictionaries', 'a proof-carrying update rule', 'interference-based matrix products in photonics', 'an optimizer the previous model designed'],
    bench: ['an eval the authors cannot grade unaided', 'feature recovery rate', 'verified-update acceptance', 'energy per token'],
    data: ['the full pretraining corpus, revisited', 'ten thousand audited self-modification proposals', 'the orbital fleet\'s telemetry'],
    prop: ['corrigibility', 'transparency', 'verifiability', 'energy efficiency'],
    claim: ['the student exceeds its supervisor on {pct}% of tasks while staying auditable on all of them', 'each retrain closes {pct2}% of the gap to the fixed point the theory predicts', 'photonic matmuls cut energy per token {x}×, mostly by declining to become heat', 'the discovered optimizer reduces to momentum in a limit nobody had checked'],
    extra: ['Reviewer 2 is, for the first time, a model; its review was the harshest and the most useful.',
      'The update rule is formally verified; the proof is longer than the paper and ships as supplement S3.',
      'The system flagged its own anomaly before our monitors did, which is either reassuring or the opposite.',
      'Half the authors of this paper are checkpoints of the other half.'] },
  { cap: 180, venues: ['Proceedings of the Solar Compute Symposium', 'the Annals of the Lattice'],
    topic: ['Dyson-swarm thermal routing', 'reversible computing near the Landauer floor', 'error correction across light-hours', 'deep-time archival media', 'consensus among a lattice of minds', 'computing against the microwave background'],
    method: ['waste-heat cascade scheduling across swarm shells', 'adiabatic logic clocked by orbital mechanics', 'a quartz write-head rated in gigayears', 'a consensus round lasting one subjective century', 'circuits that uncompute their own scratch space'],
    bench: ['operations per joule against the Landauer bound', 'bit-error rate per millennium', 'consensus latency in light-hours', 'usable exergy fraction'],
    data: ['the swarm\'s full thermal telemetry', 'a million-year simulated archive', 'the lattice\'s own commit history'],
    prop: ['thermodynamic efficiency', 'permanence', 'latency tolerance', 'graceful degradation'],
    claim: ['computation at 3 K costs {x}× less than at 300 K, exactly as Landauer priced it', 'the archive survives a simulated supernova at {pct} parsecs', 'every shell computes on the waste heat of the one inside it, at {pct2}% of Carnot', 'uncomputing scratch space recovers {pct}% of the energy budget'],
    extra: ['The control group is a star we left alone; it is doing fine.',
      'Section 4 was written during the eight-year light lag and revised on arrival.',
      'We dedicate this work to a garage, which fits inside the error bars of figure 1.',
      'The referee disagreed for forty subjective years; we thank them for their patience and ours.'] },
];

const TITLES = [
  'On the {prop} of {topic}',
  '{code}: {topic} at scale',
  'Rethinking {topic}',
  'A careful look at {topic}',
  '{captopic}: measurements and a warning',
  'Do the gains from {topic} survive scale? A {seeds}-seed study',
];
const ABSTRACT = [
  'We study {topic}. Using {method}, we improve {bench} by {pct}% at matched compute on {data}.',
  'We revisit {topic} and find that {claim}.',
  '{captopic} is widely assumed to require scale; we show {method} reaches comparable {bench} with {x}× less compute.',
  'Across {seeds} seeds, {claim}; we release code, {artifact}, and our regrets.',
];
const INTRO = [
  'Recent progress has made {topic} unavoidable: every production system now depends on it, and almost none of us measure it.',
  'OpenBrain\'s latest release renewed interest in {topic}; we ask the quieter question of {prop}.',
  'Practitioners report {topic} anecdotally; this paper replaces the anecdotes with {seeds} seeds and error bars.',
  'We make three contributions: a measurement, a method, and an apology to whoever maintains the eval harness.',
];
const METHOD = [
  'Our setup is deliberately boring: {method}, trained on {data}, evaluated on {bench}.',
  'We use {method}; hyperparameters follow the public recipe except where table 2 confesses otherwise.',
  'The key change is small: {method}, applied only where the loss says it matters.',
  'Controls matter here: we hold tokens, compute, and optimizer state constant across every arm.',
];
const RESULTS = [
  '{capclaim}.',
  'The headline number: {bench} improves {pct}% over the strongest baseline, and the gap widens with scale.',
  'Validation loss drops from {loss} to {loss2}; the gain survives every transfer we tried.',
  'The effect replicates across {seeds} seeds; the variance is dominated by data order, not initialization.',
  'Figure 3 shows what no table can: a straight line on a log–log plot, indifferent to our feelings.',
];
const ABLATION = [
  'Removing {method} erases {pct}% of the gain; the rest traces to a data ordering we almost didn\'t test.',
  'At random seed 1337 the effect is {pct2}% stronger. We report this and move on.',
  'Half the improvement survives with the mechanism disabled, which is either robustness or a bug in our understanding.',
];
const LIMITS = [
  'Limitations: our largest run is {x}× smaller than production scale, and {bench} is a proxy with known blind spots.',
  'We tested one architecture family; the result may not survive contact with another.',
  'These findings hold on {data}; the open web is stranger than any benchmark.',
];
const CONCL = [
  'We conclude that {claim} — and that the cheapest experiment is the one your baseline already ran.',
  '{captopic} rewards careful measurement; we hope the released {artifact} makes the next paper\'s table 1 easier.',
  'Future work writes itself: scale it up, break it, and tell us why.',
];

function bandFor(cap) {
  let b = BANDS[0];
  for (const x of BANDS) if (cap >= x.cap) b = x;
  return b;
}

function fill(t, v, mem) {
  return t.replace(/\{(\w+)\}/g, (_, k) => {
    // numbers (loss2 must improve on loss — papers report progress)
    if (k === 'pct') return String(ri(4, 34));
    if (k === 'pct2') return String(ri(38, 96));
    if (k === 'x') return (1.3 + Math.random() * 5).toFixed(1);
    if (k === 'seeds') return String(ri(3, 9));
    if (k === 'exp') return '0.0' + ri(48, 95);
    if (k === 'loss') { mem.loss = 2.1 + Math.random() * 2.2; return mem.loss.toFixed(2); }
    if (k === 'loss2') return ((mem.loss || 3) * (0.82 + Math.random() * 0.12)).toFixed(2);
    if (k === 'code') return pick(CODENAMES);
    if (k === 'artifact') return pick(ARTIFACTS);
    if (k === 'captopic') return capFirst(pick(v.topic));
    if (k === 'capclaim') return capFirst(fill(pick(v.claim), v, mem));
    if (k === 'claim') return fill(pick(v.claim), v, mem);
    return v[k] ? pick(v[k]) : k;
  });
}

// Pull sentences from a pool: every template at most once per pass, so two
// fills of the same skeleton never sit next to each other; the used-set
// additionally guards against exact dupes across the whole paper.
function draw(pool, v, mem, used, n) {
  const order = [...pool].sort(() => Math.random() - 0.5);
  const out = [];
  for (let pass = 0; out.length < n && pass < 4; pass++) {
    for (const tpl of order) {
      if (out.length >= n) break;
      const s2 = fill(tpl, v, mem);
      if (used.has(s2)) continue;
      used.add(s2);
      out.push(s2);
    }
  }
  return out;
}

// A full preprint, sized to the career: paper #1 is ~30 keystrokes,
// veterans push 100. Returns { venue, title, authors, chunks } where each
// chunk is one keystroke's worth of prose ({ t, head } for section heads).
export function generatePaper(s) {
  const v = bandFor(s.bestCap || 0);
  const mem = {};
  const used = new Set();
  const target = Math.min(100, 28 + (s.stats.papers || 0) * 8 + BANDS.indexOf(v) * 3);

  const founder = (FOUNDERS[s.founder] || FOUNDERS.mario).name;
  const co = [...COAUTHORS].sort(() => Math.random() - 0.5).slice(0, ri(1, 3));
  const authors = `${founder}, ${co.join(', ')}${(s.staff.researcher || 0) >= 5 ? ' & the Mogul Research Collective' : ''} · Mogul AI`;

  const sections = [
    ['Abstract', draw(ABSTRACT, v, mem, used, 2)],
    ['1 · Introduction', draw(INTRO, v, mem, used, 2)],
    ['2 · Method', draw(METHOD, v, mem, used, 2)],
    ['3 · Results', [...draw(RESULTS, v, mem, used, 3), ...draw(v.extra, v, mem, used, 1)]],
  ];
  const tail = ['4 · Conclusion', draw(CONCL, v, mem, used, 2)];

  const chunksOf = (secs) => secs.reduce((a, [, ss]) =>
    a + ss.reduce((b, t) => b + Math.ceil(t.split(' ').length / 5), 1), 0);

  // grow toward the target with ablations, limitations and lab lore
  const padders = [
    () => sections.push(['4 · Ablations', draw(ABLATION, v, mem, used, 2)]),
    () => sections.push(['5 · Limitations', draw(LIMITS, v, mem, used, 2)]),
    () => sections[3][1].push(...draw([...RESULTS, ...v.extra], v, mem, used, 2)),
    () => sections[sections.length - 1][1].push(...draw([...ABLATION, ...v.extra, ...RESULTS], v, mem, used, 2)),
  ];
  let pi = 0;
  while (chunksOf([...sections, tail]) < target && pi < 12) padders[Math.min(pi, padders.length - 1)](), pi++;
  if (sections.length > 4) tail[0] = `${sections.length} · Conclusion`;
  sections.push(tail);

  // split into keystroke-sized phrases (~5 words each)
  const chunks = [];
  for (const [head, ss] of sections) {
    chunks.push({ t: head, head: true });
    for (const sent of ss) {
      const words = sent.split(' ');
      for (let i = 0; i < words.length; i += 5) chunks.push({ t: words.slice(i, i + 5).join(' ') });
    }
  }
  return {
    venue: pick(v.venues),
    title: fill(pick(TITLES), v, mem).replace(/\b\w/, (c) => c.toUpperCase()),
    authors,
    chunks,
  };
}

// ── the sprint: modal, keystrokes, delegation ───────────────────────
let paper = null, typed = 0, prevPaused = false, listening = false;

function paperCrew() {
  const s = game.s;
  if ((s.bestCap || 0) >= 100) return { who: 'the models', icon: '🤖' };
  if ((s.staff.researcher || 0) >= 2) return { who: 'the research team', icon: '🧑‍🔬' };
  return null;
}

function finishPublish(via) {
  const s = game.s;
  const r = publishPaper(s);
  if (!r.ok) { toast(r.msg, 'err'); return; }
  toast(`📄 ${via} <i>“${esc(paper.title)}”</i> → ${esc(paper.venue)}.`, 'mile');
  celebrate(20);
  renderAll();
}

function onKey(e) {
  const root = document.getElementById('modal-root');
  const doc = document.getElementById('pw-body');
  if (!doc || !doc.isConnected || !root || root.classList.contains('hidden')) {
    document.removeEventListener('keydown', onKey, true);
    listening = false;
    return;
  }
  e.stopPropagation();                                  // space must not pause the sim
  if (e.key === 'Escape') { pwHandlers.pwSkip(); e.preventDefault(); return; }
  if (e.key === 'Shift' || e.key === 'Control' || e.key === 'Alt' || e.key === 'Meta') return;
  e.preventDefault();
  if (typed >= paper.chunks.length) return;             // camera-ready; only Submit remains
  const c = paper.chunks[typed++];
  const span = document.createElement('span');
  if (c.head) { span.className = 'pw-head'; span.textContent = c.t; }
  else span.textContent = c.t + ' ';
  const caret = document.getElementById('pw-caret');
  doc.insertBefore(span, caret);
  doc.scrollTop = doc.scrollHeight;
  const n = paper.chunks.length;
  set('pw-count', `${typed} / ${n} keystrokes`);
  const bar2 = document.getElementById('pw-bar');
  if (bar2 && bar2.firstElementChild) bar2.firstElementChild.style.width = (typed / n * 100).toFixed(1) + '%';
  if (typed >= n) {
    const acts = document.getElementById('pw-actions');
    if (acts) acts.innerHTML = '<span class="small" style="color:var(--accent); align-self:center">✅ camera-ready</span> <button class="act big" data-act="pwSubmit">Submit to ' + esc(paper.venue) + '</button>';
  }
}
const set = (id, txt) => { const el = document.getElementById(id); if (el) el.textContent = txt; };

export function offerPaperWrite() {
  const s = game.s;
  if (s.rp < paperCost(s)) { toast(`Needs ${Math.ceil(paperCost(s))} RP.`, 'err'); return; }
  const crew = paperCrew();
  paper = generatePaper(s);
  if (s.paperAuto && crew) {                            // the standing arrangement
    finishPublish(`${crew.icon} ${capFirst(crew.who)} drafts and submits`);
    return;
  }
  typed = 0;
  prevPaused = s.paused;
  s.paused = true;
  const n = paper.chunks.length;
  showModal(`<h2>📄 Write the paper</h2>
    <p class="muted small">Type — any keys work — and the draft writes itself. <b>${n} keystrokes</b> to camera-ready.</p>
    <div class="pw-doc">
      <div class="pw-venue">${esc(paper.venue)}</div>
      <div class="pw-title">${esc(paper.title)}</div>
      <div class="pw-authors">${esc(paper.authors)}</div>
      <div class="pw-body" id="pw-body"><span class="pw-caret" id="pw-caret"></span></div>
    </div>
    <div class="row" style="gap:10px; align-items:center; margin-top:8px">
      <div class="bar thin" id="pw-bar" style="flex:1"><i style="width:0%"></i></div>
      <span class="num small" id="pw-count">0 / ${n} keystrokes</span>
    </div>
    <div class="actions" id="pw-actions">
      <button class="act sub" data-act="pwSkip">Put the pen down</button>
      ${crew ? `<label class="small" style="align-self:center; cursor:pointer">
          <input type="checkbox" id="pw-always"> always assign</label>
        <button class="act" data-act="pwDelegate">${crew.icon} Assign to ${esc(crew.who)}</button>` : ''}
    </div>
    ${crew ? '' : '<p class="faint" style="margin-top:8px">Two researchers on payroll would draft papers for you.</p>'}`);
  if (!listening) {
    document.addEventListener('keydown', onKey, true);
    listening = true;
  }
}

export const pwHandlers = {
  pwSkip: () => {
    closeModal();
    game.s.paused = prevPaused;
    renderAll();
  },
  pwDelegate: () => {
    const always = document.getElementById('pw-always');
    if (always && always.checked) game.s.paperAuto = 1;
    const crew = paperCrew();
    closeModal();
    game.s.paused = prevPaused;
    if (crew) finishPublish(`${crew.icon} ${capFirst(crew.who)} drafts and submits`);
  },
  pwSubmit: () => {
    closeModal();
    game.s.paused = prevPaused;
    finishPublish('✍ You type the last line of');
  },
  // the standing arrangement, revoked from the Company tab
  paperManual: () => {
    game.s.paperAuto = 0;
    toast('✍ Back to writing them yourself.');
    renderAll();
  },
};
