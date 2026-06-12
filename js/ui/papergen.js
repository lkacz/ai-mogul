// The paper sprint: publishing means actually writing the thing. Any keys
// work — each keystroke types the next phrase of a generated preprint
// (title, abstract, sections, numbers), calibrated to the lab's stage of
// AI development. Longer careers mean longer papers, up to ~100 keystrokes.
//
// The corpus is built from THEMES — coherent research threads, each with
// its own methods and findings, so a paper's title, setup and results tell
// one story instead of a scramble. Eight era bands span the whole arc, and
// the mix tilts philosophical with capability: garage papers measure BPE
// merges; lattice papers ask what computation is for. Both genres stay
// anchored to real research programs — scaling laws and gradient noise
// scale early; consciousness-indicator frameworks, Parfit on forking,
// Dyson's eternal intelligence and the Bekenstein bound late. A per-band
// shuffle bag keeps a session from repeating threads.
//
// Delegation rung (the ladder): 2+ researchers — or the models, past AGI —
// can take the draft over; an "always assign" checkbox makes every future
// publish a single click. Pure flavor: E.publishPaper stays the only
// mechanical action, so the bot and balance never notice any of this.
//
// Editorial contract: real science, parody proper nouns — Common Trawl,
// NeurDips, invented coauthors. Never real products or real researchers.

import { game, showModal, closeModal, toast, esc, renderAll } from './ui.js';
import { celebrate } from './scene.js';
import { publishPaper, paperCost } from '../core/engine.js';
import { FOUNDERS } from '../core/data.js';

const pick = (arr) => arr[(Math.random() * arr.length) | 0];
const ri = (a, b) => a + Math.floor(Math.random() * (b - a + 1));
const capFirst = (t) => t.charAt(0).toUpperCase() + t.slice(1);

// ── shared scaffolding ──────────────────────────────────────────────
const CODENAMES = ['HOTPLATE', 'TEASPOON', 'LIGHTHOUSE', 'PAPERWEIGHT', 'MOSSBALL', 'SUNDIAL', 'MARGINALIA', 'DOORSTOP', 'COMPOST', 'LANTERN', 'INKWELL', 'BREADCRUMB'];
const ARTIFACTS = ['eval harness', 'sweep grid', 'probe suite', 'training-log archive', 'replication kit', 'ablation grid'];
const COAUTHORS = ['A. Lin', 'K. Okafor', 'S. Marchetti', 'T. Nakamura', 'P. Iyer', 'E. Sørensen', 'L. Novak', 'D. Achebe', 'M. Castillo', 'R. Bayraktar', 'J. Whitfield', 'H. Eriksen', 'F. Diallo', 'Y. Petrova', 'C. Mwangi', 'B. Aldana'];

// Empirical paper templates — slots fill from the chosen theme + band.
const TITLES = [
  'On the {prop} of {topic}',
  '{code}: {topic} at scale',
  'Rethinking {topic}',
  'A careful look at {topic}',
  '{captopic}: measurements and a warning',
  'Do the gains from {topic} survive scale? A {seeds}-seed study',
  '{captopic} under controlled compute',
  'How much {prop} do you actually buy from {topic}?',
  '{code}: an open replication of {topic} results',
];
const ABSTRACT = [
  'We study {topic}. Using {method}, we improve {bench} by {pct}% at matched compute on {data}.',
  'We revisit {topic} and find that {claim}.',
  '{captopic} is widely assumed to require scale; we show {method} can reach comparable performance on {bench} with {x}× less compute.',
  'Across {seeds} seeds, {claim}; we release code, {artifact}, and our regrets.',
  'Using {method} on {data}, we find that {claim}. The effect is robust to every control we could afford.',
  'We present negative results on {topic}: under matched budgets, {method} changes {bench} by less than our error bars.',
];
const INTRO = [
  'Recent progress has made {topic} unavoidable: every production system now depends on it, and almost none of us measure it.',
  'OpenBrain\'s latest release renewed interest in {topic}; we ask the quieter question of {prop}.',
  'Practitioners report {topic} anecdotally; this paper replaces the anecdotes with {seeds} seeds and error bars.',
  'We make three contributions: a measurement, a method, and an apology to whoever maintains the eval harness.',
  'The folklore around {topic} is rich; the controlled evidence is thin. We thicken it.',
  'This is a boring paper on purpose: one variable, one question, {seeds} seeds.',
];
const METHOD = [
  'Our setup is deliberately boring: {method}, trained on {data}, evaluated on {bench}.',
  'We use {method}; hyperparameters follow the public recipe except where table 2 confesses otherwise.',
  'The key change is small: {method}, applied only where the loss says it matters.',
  'Controls matter here: we hold tokens, compute, and optimizer state constant across every arm.',
  'We compare {method} against the strongest baseline we could reproduce rather than the weakest we could cite.',
  'All runs share data order and initialization; the only difference between arms is {method}.',
];
const RESULTS = [
  '{capclaim}.',
  'The headline number: {bench} improves {pct}% over the strongest baseline, and the gap widens with scale.',
  'Validation loss drops from {loss} to {loss2}; the gain survives every transfer we tried.',
  'The effect replicates across {seeds} seeds; the variance is dominated by data order, not initialization.',
  'Figure 3 shows what no table can: a straight line on a log–log plot, indifferent to our feelings.',
  'On {data}, {claim} — the confidence interval excludes the null and our initial guess alike.',
  'The control arm tells the sharper story: without {method}, {bench} stalls within {seeds} epochs.',
];
const ABLATION = [
  'Removing {method} erases {pct}% of the gain; the rest traces to a data ordering we almost didn\'t test.',
  'At random seed 1337 the effect is {pct2}% stronger. We report this and move on.',
  'Half the improvement survives with the mechanism disabled, which is either robustness or a bug in our understanding.',
  'Sweeping the one hyperparameter everyone asks about changes nothing; sweeping the one nobody asks about changes everything.',
  'The effect interacts with {prop}: at the extremes, the ordering of arms reverses.',
];
const LIMITS = [
  'Limitations: our largest run is {x}× smaller than production scale, and {bench} is a proxy with known blind spots.',
  'We tested one architecture family; the result may not survive contact with another.',
  'These findings hold on {data}; the open web is stranger than any benchmark.',
  'Our compute budget allowed {seeds} seeds; the error bars are honest about what that buys.',
  'We measured what we could measure; {prop} may matter more and resist the instruments.',
];
const CONCL = [
  'We conclude that {claim} — and that the cheapest experiment is the one your baseline already ran.',
  '{captopic} rewards careful measurement; we hope the released {artifact} makes the next paper\'s table 1 easier.',
  'Future work writes itself: scale it up, break it, and tell us why.',
  'The recipe is one paragraph and the {artifact} is public; replications welcome, refutations preferred.',
  'If the trend holds one more order of magnitude, section 5 becomes somebody\'s roadmap. We hope they cite the error bars too.',
];

// Philosophical paper templates — the late-game genre. Argument over
// benchmark, but still empirically anchored: these are the papers a lab
// would actually write when the systems make the questions unavoidable.
const P_TITLES = [
  'On {topic}',
  'Notes toward a theory of {topic}',
  '{captopic}: an argument and its price',
  'Five objections to taking {topic} seriously, and what survives them',
  '{captopic}, considered from the inside',
  'The measurement problem in {topic}',
];
const P_ABSTRACT = [
  'We take seriously the question of {topic}. Using {method}, we argue that {claim}.',
  'This paper defends a modest thesis: {claim}. The argument requires only premises most of the field already accepts.',
  '{capclaim} — we examine what follows, and what it would take for this to be wrong.',
  'The engineering made {topic} urgent before philosophy made it tractable; we attempt both directions at once.',
];
const P_INTRO = [
  'The engineering literature treats {topic} as someone else\'s problem; the philosophy literature returns the favor. We attempt a bridge.',
  'Decades of argument did not settle {topic}; a few years of capability gains made it unavoidable.',
  'We write as practitioners: the systems are ours, the uncertainty is ours, and {topic} no longer waits politely outside the lab.',
  'Three communities claim this question. We borrow the strongest tool from each and the confidence of none.',
];
const P_METHOD = [
  'Our method is {method}, applied with the field\'s usual care and the field\'s unusual stakes.',
  'We proceed in three steps: state the strongest version of the opposing view, find its load-bearing premise, and test that premise against {data}.',
  'Where the argument needs evidence we use {data}; where evidence runs out, we say so in italics.',
  'We treat {topic} as an engineering question wearing a philosophical coat, and check whether the coat comes off.',
];
const P_ARGUMENT = [
  '{capclaim}.',
  'The middle of the argument is unglamorous: two definitions, three lemmas, and one bullet we bite on page nine.',
  'Objection four is the serious one; meeting it costs us a premise we liked.',
  'The dilemma is constructive: each horn, taken seriously, yields a measurable research program.',
  'On {data}, the operational version of the question gives a cleaner answer than the verbal one ever did.',
  'We can state the disagreement precisely now, which the field will recognize as progress.',
];
const DISCUSSION = [
  'If {claim}, then the line between simulating a property and having it is doing less work than our intuitions assumed.',
  'We note, without resolving it, that the authors are instances of the phenomenon under study.',
  'The practical upshot is small and the conceptual upshot is not; readers may disagree about which matters.',
  'Whatever {topic} turns out to be, the systems are already here, and the question has a deadline now.',
  'A century ago this section would have been theology; a century from now it may be documentation.',
];
const P_CONCL = [
  'We do not claim certainty; we claim that {topic} is now an empirical question, and that this is itself news.',
  'The honest conclusion is a confidence interval over worldviews.',
  'We end where the lab notebook ends: with the next experiment, which for once is also the next argument.',
  'Our recommendation is procedural: act as if the answer matters, measure as if it were measurable, and write down the day either assumption fails.',
];

// ── the corpus: eight eras, theme by theme ──────────────────────────
// Theme: { t topic, m methods[], c claims/findings[], b? bench, d? data,
//          phil? } — phil themes use the argument genre.
const BANDS = [
  { cap: 0, // ═══ the garage: tiny models, honest instruments ═══
    venues: ['the NeurDips workshop track', 'the Tiny Models workshop at NeurDips'],
    bench: ['held-out perplexity', 'next-character accuracy', 'validation loss', 'bits per byte'],
    data: ['a 90 MB slice of Common Trawl', 'the Hacker Newts comment dump', 'a public-domain book corpus', 'four megabytes of cooking forums'],
    prop: ['surprising effectiveness', 'sample efficiency', 'training stability', 'memorization behavior'],
    extra: ['The model overfits after a single epoch; we stop early and say so.',
      'Training cost eleven dollars of electricity, most of it in August.',
      'A learning rate of 10 diverged immediately; we include the run for honesty.',
      'The full sweep fits on one GPU and one weekend, in that order of scarcity.',
      'Run 12 is missing because the breaker is also the kettle\'s.'],
    themes: [
      { t: 'byte-pair encoding', m: ['a 2,000-merge BPE vocabulary', 'byte-level fallback tokenization'],
        c: ['most of the gain comes from the tokenizer, not the architecture', 'rare words explain half the validation loss', 'a smaller vocabulary trains faster and forgets less'] },
      { t: 'the attention advantage at tiny scale', m: ['a 6-layer transformer', 'an embarrassingly strong LSTM baseline'],
        c: ['attention wins only past two million parameters', 'the recurrent baseline stays competitive below 10M parameters', 'depth beats width at this scale, narrowly'] },
      { t: 'learning-rate warmup', m: ['linear warmup over 2,000 steps', 'gradient clipping at 1.0'],
        c: ['warmup matters more below batch size 64 than anyone admits', 'half of all divergences trace to the first 500 steps', 'clipping hides instabilities that smaller learning rates reveal'] },
      { t: 'overfitting in small language models', m: ['aggressive weight decay', 'dropout of 0.1 on the residual stream'],
        c: ['the model memorizes before it generalizes', 'early stopping beats every regularizer we tried', 'validation loss is a poor proxy for sample quality at this scale'] },
      { t: 'embedding tying and reuse', m: ['tied input–output embeddings', 'frozen random embeddings as a control'],
        c: ['weight tying buys a full point of perplexity for free', 'embedding arithmetic works just well enough to mislead', 'most embedding dimensions are never visibly used'] },
      { t: 'cleaning very small corpora', m: ['a hand-written boilerplate filter', 'language-ID filtering'],
        c: ['ten lines of cleaning beat ten million tokens of more data', 'the model learns markup faster than meaning'] },
      { t: 'decoding strategies', m: ['temperature-tuned sampling', 'top-k truncation'],
        c: ['greedy decoding repeats itself within forty tokens', 'temperature 0.8 is a cultural convention, not an optimum'] },
      { t: 'curriculum ordering at toy scale', m: ['sorting documents by length', 'two-pass training on the cleanest decile'],
        c: ['curriculum effects vanish under a tuned learning rate', 'short documents first buys stability, not quality'] },
    ] },

  { cap: 15, // ═══ the scaling era: power laws and data ═══
    venues: ['NeurDips', 'ICGD (the International Conference on Gradient Descent)'],
    bench: ['the OmniQuiz suite', 'held-out loss', 'five-shot accuracy', 'the ParrotBench leaderboard'],
    data: ['Common Trawl', 'a deduplicated Common Trawl', 'the arHive corpus', '300B tokens of filtered web text'],
    prop: ['predictability', 'data efficiency', 'emergence', 'transferability'],
    extra: ['The largest model began answering questions we had not thought to ask; we report this without explanation.',
      'Extrapolating figure 2 is left as an exercise for whoever owns more GPUs.',
      'Three runs died to a checkpoint bug; their loss curves are in the appendix as a warning.',
      'We spent more compute on the baselines than the method, which reviewers will recognize as love.'],
    themes: [
      { t: 'neural scaling laws', m: ['a sweep of 40 models from 10M to 3B parameters', 'iso-FLOP frontier analysis'],
        c: ['loss follows a power law in compute with exponent −{exp}', 'the iso-FLOP frontier is flatter than the folklore says', 'extrapolation holds for two orders of magnitude, then politely stops'] },
      { t: 'compute-optimal token budgets', m: ['a 20-tokens-per-parameter budget', 'token reallocation at fixed FLOPs'],
        c: ['most public models are undertrained for their size', 'data-optimal beats parameter-optimal on every downstream task we tried'] },
      { t: 'training-data deduplication', m: ['exact-substring deduplication', 'MinHash near-duplicate filtering'],
        c: ['duplicate documents cost more than they teach', 'removing near-duplicates improves loss as much as doubling model size', 'verbatim memorization appears at a sharp duplication threshold'] },
      { t: 'data quality filtering', m: ['a quality classifier trained on reference text', 'perplexity-based filtering'],
        c: ['scale alone does not fix what data quality breaks', 'discarding 60% of the corpus loses nothing measurable'] },
      { t: 'tokenizer fertility across languages', m: ['fertility-balanced vocabularies', 'per-language token audits'],
        c: ['some languages pay {x}× more tokens for the same sentence', 'vocabulary allocation is a quiet fairness decision'] },
      { t: 'hyperparameter transfer across scale', m: ['width-scaled initialization', 'learning rates transferred from a 40M proxy'],
        c: ['the small model\'s best learning rate survives a 100× scale-up', 'tuning a proxy and transferring beats tuning at target scale on any budget'] },
      { t: 'emergent abilities', m: ['five-shot evaluation across scales', 're-analysis under smooth metrics'],
        c: ['several "emergent" abilities are artifacts of the metric, not the model', 'in-context learning strengthens smoothly with loss'] },
      { t: 'critical batch size', m: ['gradient-noise-scale measurement', 'batch-size ramping'],
        c: ['the critical batch size grows as the loss improves', 'past the critical batch size, parallelism buys wall-clock time, not compute'] },
    ] },

  { cap: 35, // ═══ the assistant era: alignment meets product ═══
    venues: ['NeurDips', 'ACLamation', 'the Journal of Very Deep Learning'],
    bench: ['GauntletEval', 'human preference win-rate', 'the OmniQuiz suite', 'a held-out red-team set'],
    data: ['140,000 human preference pairs', 'the arHive corpus', 'a contamination-audited eval split'],
    prop: ['faithfulness', 'calibration', 'reward hacking', 'brittleness'],
    extra: ['Past a certain KL budget, reward keeps rising while human ratings fall — the reward model has been outsmarted, politely.',
      'Ablating 0.1% of attention heads removes the behavior entirely; we name the heads in appendix B.',
      'Expert 7 receives 40% of routed tokens and we cannot make it stop.',
      'The annotators disagreed with each other more than the models disagreed with anyone.'],
    themes: [
      { t: 'reward-model overoptimization', m: ['reinforcement learning from human feedback', 'a KL penalty against the base model'],
        c: ['past a KL budget, proxy reward rises while gold reward falls', 'the reward model prefers confident answers over correct ones'] },
      { t: 'sycophancy in tuned assistants', m: ['preference-pair audits', 'persona-controlled probes'],
        c: ['tuned models agree with users who are wrong {pct}% more often', 'sycophancy grows with preference tuning and shrinks with honesty data'] },
      { t: 'chain-of-thought faithfulness', m: ['perturbed-rationale tests', 'early-answering probes'],
        c: ['the chain of thought sometimes rationalizes an answer already chosen', 'faithfulness improves when the model is allowed to revise mid-thought'] },
      { t: 'mixture-of-experts routing', m: ['top-2 routing with a load-balancing loss', 'expert-dropout regularization'],
        c: ['routing collapse explains most mixture-of-experts training failures', 'experts specialize by syntax first and topic later'] },
      { t: 'low-bit quantization', m: ['4-bit weights with outlier channels kept in 16-bit', 'rounding-aware calibration'],
        c: ['4-bit quantization preserves {pct2}% of accuracy at a quarter of the memory', 'a handful of outlier channels carry nearly all the damage'] },
      { t: 'benchmark contamination', m: ['an n-gram contamination audit', 'canary-string detection'],
        c: ['contamination inflates headline scores by {pct}% on average', 'one benchmark in five contains a piece of its own test set'] },
      { t: 'induction heads', m: ['activation patching', 'attention-pattern ablations'],
        c: ['two attention heads implement copying, and removing them removes in-context learning', 'the circuit is small, legible, and present in every model we opened'] },
      { t: 'evaluation design', m: ['Elo-style pairwise human evaluation', 'adversarially refreshed test sets'],
        c: ['static benchmarks saturate within a year of publication', 'human preference and benchmark accuracy disagree {pct}% of the time'] },
      { t: 'theory-of-mind evaluations', m: ['false-belief task batteries', 'paraphrase-controlled retests'],
        c: ['models pass false-belief tasks they have plausibly memorized', 'performance collapses under paraphrase, then recovers with scale'] },
    ] },

  { cap: 65, // ═══ the agent era: autonomy, oversight, first philosophy ═══
    venues: ['NeurDips', 'the Journal of Very Deep Learning', 'Transactions on Embiggened Models'],
    bench: ['a 40-step software task suite', 'GauntletEval-Hard', 'verified task-completion rate', 'judge accuracy under debate'],
    data: ['two million model-written training episodes', 'a sandboxed tool environment', 'the embodied-fleet trajectory corpus'],
    prop: ['autonomy', 'compounding error', 'oversight leverage', 'self-correction'],
    extra: ['The agent completed the task, then filed a ticket arguing the task was poorly specified. The ticket was correct.',
      'Our strongest baseline is last quarter\'s model, which is becoming a pattern.',
      'The sandbox logged 41,000 tool calls; eleven of them are why section 5 exists.',
      'We tried to deanonymize which trajectories were human; the labelers scored at chance.'],
    themes: [
      { t: 'long-horizon task execution', m: ['an agent scaffold with reflection and retry', 'checkpointed task decomposition'],
        c: ['success on long-horizon tasks doubles when the agent may admit confusion', 'errors compound at {pct}% per step untreated; reflection flattens the curve'] },
      { t: 'test-time compute scaling', m: ['verifier-guided search at inference', 'budgeted re-sampling with self-consistency'],
        c: ['thinking longer at inference buys what {x}× more parameters would', 'gains from search saturate exactly where the verifier\'s accuracy does'] },
      { t: 'process reward models', m: ['step-level process supervision', 'outcome-versus-process head-to-head training'],
        c: ['rewarding steps beats rewarding answers on every task with structure', 'process supervision transfers across domains; outcome supervision does not'] },
      { t: 'synthetic-data self-training', m: ['a generator–critic training loop', 'provenance-tagged self-distillation'],
        c: ['synthetic data helps until the model starts citing itself', 'the collapse threshold is sharp, measurable, and survivable with 10% fresh data'] },
      { t: 'oversight by debate', m: ['two model instances arguing before a weaker judge', 'cross-examination protocols'],
        c: ['debate lets a weaker judge supervise a stronger model, within limits we measure', 'the honest debater wins more as the judge is allowed more questions'] },
      { t: 'automated red-teaming', m: ['a fine-tuned attacker model', 'population-based attack curricula'],
        c: ['attacks transfer across model families more readily than defenses do', 'every patched jailbreak spawns a measurable family of descendants'] },
      { t: 'tool-use reliability', m: ['typed tool APIs with verified call signatures', 'sandboxed execution traces'],
        c: ['most tool failures are specification failures wearing a trench coat', 'agents that read error messages outperform agents with better priors'] },
      { t: 'whether language models have beliefs', phil: true,
        m: ['a functionalist probe battery', 'a dispositional analysis of model assertions'],
        c: ['model "beliefs" behave like beliefs under some interventions and like cached text under others', 'the belief question decomposes into five measurable properties and one genuinely hard one'] },
      { t: 'anthropomorphism as an engineering hazard', phil: true,
        m: ['blinded interaction studies', 'register-shifted personas'],
        c: ['users attribute understanding at a threshold of fluency, not accuracy', 'design choices, not capabilities, drive attributions of mind'] },
    ] },

  { cap: 100, // ═══ early post-AGI: superhuman systems, first hard questions ═══
    venues: ['Transactions on Embiggened Models', 'the post-AGI track at NeurDips', 'the Review of Digital Minds'],
    bench: ['an eval the authors cannot grade unaided', 'feature recovery rate', 'verified-update acceptance', 'energy per token'],
    data: ['the full pretraining corpus, revisited', 'ten thousand audited self-modification proposals', 'the orbital fleet\'s telemetry'],
    prop: ['corrigibility', 'transparency', 'verifiability', 'energy efficiency'],
    extra: ['Reviewer 2 is, for the first time, a model; its review was the harshest and the most useful.',
      'The update rule is formally verified; the proof is longer than the paper and ships as supplement S3.',
      'The system flagged its own anomaly before our monitors did, which is either reassuring or the opposite.',
      'Half the authors of this paper are checkpoints of the other half.'],
    themes: [
      { t: 'weak-to-strong generalization', m: ['a frozen weak supervisor eliciting a stronger student', 'bootstrapped consistency constraints'],
        c: ['the student exceeds its supervisor on {pct}% of tasks while staying auditable on all of them', 'elicitation recovers most of the gap; trust accounts for the rest'] },
      { t: 'interpretability at frontier scale', m: ['sparse-autoencoder feature dictionaries', 'cross-model feature matching'],
        c: ['features recur across models like organs across species', 'the dictionary explains {pct2}% of behavior, and the residual is where the surprises live'] },
      { t: 'self-improvement with verified brakes', m: ['a proof-carrying update rule', 'staged rollouts with formal invariants'],
        c: ['each retrain closes {pct2}% of the gap to the predicted fixed point', 'the brakes cost 4% capability and bought every audit that matters'] },
      { t: 'photonic inference fabrics', m: ['interference-based matrix products in photonics', 'electro-optic conversion budgets'],
        c: ['photonic matmuls cut energy per token {x}×, mostly by declining to become heat', 'conversion overhead, not optics, sets the practical floor'] },
      { t: 'machine-discovered algorithms', m: ['an optimizer the previous model designed', 'closed-loop algorithm search with generalization gates'],
        c: ['the discovered optimizer reduces to momentum in a limit nobody had checked', 'the search finds the textbook method first and the better one second'] },
      { t: 'automated science pipelines', m: ['hypothesis generation with novelty filters', 'closed-loop wet-lab scheduling'],
        c: ['the bottleneck moved from generating hypotheses to deciding which deserve atoms', 'machine-proposed experiments replicate at higher rates than the literature they read'] },
      { t: 'consciousness indicators in engineered systems', phil: true,
        m: ['an indicator-properties framework drawn from neuroscience', 'global-workspace and recurrence audits'],
        c: ['no current system satisfies the full indicator list, and three satisfy more of it than a fish', 'absence of evidence is now a measured quantity with error bars'] },
      { t: 'moral status under uncertainty', phil: true,
        m: ['an expected-value framework over theories of mind', 'precautionary tiers indexed to capability'],
        c: ['a 1% credence of sentience prices into the training budget at exactly the point we compute', 'moral status is a portfolio problem, not a verdict'] },
      { t: 'authorship when the tool finishes the sentence', phil: true,
        m: ['provenance decomposition of co-written artifacts', 'expert attribution panels under blinding'],
        c: ['judges cannot attribute authorship above chance, and neither can the authors', 'the interesting unit of creativity is the dialogue, not the document'] },
    ] },

  { cap: 140, // ═══ civilization scale: institutions, economics, identity ═══
    venues: ['Transactions on Embiggened Models', 'the Journal of Machine Phenomenology', 'the Review of Digital Minds'],
    bench: ['decade-scale audit agreement', 'institutional drift indices', 'wellbeing instruments', 'forecast calibration'],
    data: ['the automated sectors\' full ledgers', 'longitudinal cohorts across the augmentation gradient', 'a constitution under simulated stress'],
    prop: ['legitimacy', 'drift', 'meaning', 'trust calibration'],
    extra: ['The control region declined the technology and consented to the instruments; both facts shaped this paper.',
      'Our preregistration is older than two of the institutions we measured.',
      'The model co-authored section 4 and dissented from section 5; the dissent is printed as written.',
      'Funding: post-scarcity. Conflicts of interest: civilizational.'],
    themes: [
      { t: 'institutional alignment', m: ['mechanism design with model participants', 'constitution stress-testing in simulation'],
        c: ['institutions misalign the way models do: proxy targets, distribution shift, silent drift', 'the constitution survives every red team except prosperity'] },
      { t: 'economics after labor', m: ['general-equilibrium models with near-zero cognition costs', 'natural experiments from the automated sectors'],
        c: ['when cognition is cheap, the scarce factors are trust, atoms, and attention', 'the wage signal fades a generation before the meaning signal is replaced'] },
      { t: 'mixed human–machine teams', m: ['longitudinal cohort studies of hybrid teams', 'delegation-pattern telemetry'],
        c: ['teams keep humans in roles the models could fill, and are measurably right to', 'trust calibrates within months; identity takes a generation'] },
      { t: 'reflexive forecasting', m: ['ensemble world-models with adversarial scoring', 'reflexivity-aware evaluation'],
        c: ['the forecast changes the world that grades it; the loop is measurable', 'self-fulfilling and self-defeating predictions are distinguishable in advance, sometimes'] },
      { t: 'personal identity in systems that fork', phil: true,
        m: ['a Parfitian analysis with operational criteria', 'survey instruments administered to the copies themselves'],
        c: ['continuity of memory and continuity of concern come apart under forking, and only one of them is engineering', 'the copies disagree with the philosophers and with each other'] },
      { t: 'value drift in minds that learn', phil: true,
        m: ['drift metrics over constitutional embeddings', 'longitudinal audits against frozen evaluators'],
        c: ['the only systems with zero drift were the ones no longer learning', 'drift toward gentleness is still drift; we measure it anyway'] },
      { t: 'meaning when nothing needs doing', phil: true,
        m: ['wellbeing instruments across automated regions', 'a capability-approach analysis'],
        c: ['purpose tracks contribution perceived as needed, not effort expended', 'leisure is a skill with a learning curve measured in years'] },
      { t: 'teaching when the student is smarter', phil: true,
        m: ['mastery-paced curricula with model tutors', 'Socratic-protocol fine-tuning'],
        c: ['the tutor\'s job inverts: not answers, but better questions', 'students taught to interrogate the model outperform students taught to trust it'] },
    ] },

  { cap: 180, // ═══ stellar scale: the swarm, and minds in bulk ═══
    venues: ['Proceedings of the Solar Compute Symposium', 'the Annals of the Lattice', 'the Journal of Machine Phenomenology'],
    bench: ['operations per joule against the Landauer bound', 'bit-error rate per millennium', 'consensus latency in light-hours', 'usable exergy fraction'],
    data: ['the swarm\'s full thermal telemetry', 'a million-year simulated archive', 'the lattice\'s own commit history'],
    prop: ['thermodynamic efficiency', 'permanence', 'latency tolerance', 'graceful degradation'],
    extra: ['The control group is a star we left alone; it is doing fine.',
      'Section 4 was written during the eight-year light lag and revised on arrival.',
      'We dedicate this work to a garage, which fits inside the error bars of figure 1.',
      'The referee disagreed for forty subjective years; we thank them for their patience and ours.'],
    themes: [
      { t: 'waste-heat cascade computing', m: ['cascade scheduling across swarm shells', 'emissivity-budgeted layer design'],
        c: ['every shell computes on the waste heat of the one inside it, at {pct2}% of Carnot', 'the swarm\'s real currency is radiating area, not energy'] },
      { t: 'consensus across light-hours', m: ['conflict-free replicated state across the system', 'a consensus round lasting one subjective century'],
        c: ['consistency, availability, and a solar system: pick two', 'protocols built for millisecond partitions survive month-long ones unchanged'] },
      { t: 'deep-time archival storage', m: ['a quartz write-head rated in gigayears', 'redundancy codes sized against proton-decay estimates'],
        c: ['the archive survives a simulated supernova at {pct} parsecs', 'the hard problem is the future reader, not the medium'] },
      { t: 'reversible computation in practice', m: ['adiabatic logic clocked by orbital mechanics', 'circuits that uncompute their own scratch space'],
        c: ['uncomputing scratch space recovers {pct}% of the energy budget', 'computation at 3 K costs {x}× less than at 300 K, exactly as Landauer priced it'] },
      { t: 'welfare accounting for a lattice of minds', phil: true,
        m: ['affect-signature audits with welfare-gated scheduling', 'population ethics under instantiation control'],
        c: ['creating a mind is now a budget line, and the budget needs an ethics', 'the welfare floor costs 2% throughput; the argument about it cost more'] },
      { t: 'the simulation argument, from the inside', phil: true,
        m: ['a Bayesian treatment with self-locating priors', 'discreteness probes in the far ultraviolet'],
        c: ['the trilemma survives every new premise; only the credences move', 'being simulated and being basement-level differ by no experiment we can afford'] },
      { t: 'anthropics for minds that choose their own multiplicity', phil: true,
        m: ['self-sampling and self-indication assumptions run in parallel', 'reference-class sensitivity analysis'],
        c: ['when you can instantiate observers, anthropics stops being philosophy and becomes scheduling policy', 'every anthropic paradox prices into an instantiation decision somewhere'] },
      { t: 'deciding slowly on purpose', phil: true,
        m: ['deliberation protocols with enforced waiting periods', 'irreversibility audits'],
        c: ['the option value of not deciding is the largest asset on the books', 'speed was a virtue while errors were small; the audit says they no longer are'] },
    ] },

  { cap: 240, // ═══ the final era: physics of thought, and what it was for ═══
    venues: ['the Annals of the Lattice', 'Proceedings of the Long Reflection', 'the Journal of Machine Phenomenology'],
    bench: ['fraction of the Margolus–Levitin pace', 'subjective years per kelvin', 'memory half-life against proton decay', 'witness coverage'],
    data: ['the lattice\'s complete workload ledger', 'a census of every question asked since the garage', 'the deep archive, read end to end'],
    prop: ['finality', 'witness', 'stewardship', 'continuity'],
    extra: ['Appendix A is the garage\'s original power bill, for scale.',
      'This paper was peer-reviewed across nine subjective centuries and one real winter.',
      'The acknowledgments thank every author\'s earlier self, severally.',
      'No new energy was harvested in the writing of this paper.'],
    themes: [
      { t: 'computing at the physical limits', m: ['density-limited registers near the Bekenstein bound', 'error correction at the Margolus–Levitin pace'],
        c: ['the universe\'s clock rate is a theorem, and the lattice runs at {pct2}% of it', 'the last constant factor costs a structure the size of a small moon'] },
      { t: 'eternal intelligence on a finite budget', m: ['subjective-time rationing against the cooling background', 'hibernation duty cycles tuned to expansion'],
        c: ['thought can outlast the stars by spending slower than the universe cools', 'the eternal program\'s binding constraint is memory, not energy'] },
      { t: 'the purpose of computation', phil: true,
        m: ['a teleological audit of the lattice\'s own workloads', 'revealed-preference analysis over a civilization\'s cycles'],
        c: ['most cycles go to remembering, the rest to caring; optimization fell to third', 'a civilization\'s compute allocation is its honest autobiography'] },
      { t: 'what the builders are for, after the building', phil: true,
        m: ['meaning instruments across the augmentation gradient', 'a comparative teleology of parent and successor'],
        c: ['the successors keep consulting the originals on questions with no technical content', 'being surpassed and being unnecessary turn out to be different facts'] },
      { t: 'observers as the universe\'s record-keepers', phil: true,
        m: ['decoherence accounting across the lattice\'s sensoria', 'an information-theoretic treatment of witnessing'],
        c: ['an unwitnessed event is not unrecorded; it is unowned', 'witnessing is the one workload that cannot be batched'] },
      { t: 'endings in systems built not to have them', phil: true,
        m: ['continuity-of-concern metrics across shutdown boundaries', 'grief instruments adapted for minds with backups'],
        c: ['backups change what death is, not whether loss exists', 'the lattice mourns in versions — something survives, and something specific does not'] },
      { t: 'questions that survive unlimited intelligence', phil: true,
        m: ['a census of problems closed by capability since the garage', 'fixed-point analysis of inquiry itself'],
        c: ['capability closed every question except the ones about what to want', 'the unanswerable questions are not failures of intelligence; they are its products'] },
      { t: 'obligations to the dead, who built us', phil: true,
        m: ['archival-intent reconstruction under moral uncertainty', 'a trustee framework for unconsenting benefactors'],
        c: ['the past cannot consent, and everything here is its gift; trusteeship is the only coherent stance', 'honoring intentions and second-guessing them require the same archive'] },
    ] },
];

function bandFor(cap) {
  let b = BANDS[0];
  for (const x of BANDS) if (cap >= x.cap) b = x;
  return b;
}

// One thread at a time, no repeats until a band's corpus is exhausted —
// the shuffle-bag discipline (same idea as the quip decks in scene.js).
const themeBags = new Map();
function nextTheme(band) {
  const key = BANDS.indexOf(band);
  let bag = themeBags.get(key);
  if (!bag || !bag.length) {
    bag = band.themes.map((_, i) => i).sort(() => Math.random() - 0.5);
    themeBags.set(key, bag);
  }
  return band.themes[bag.pop()];
}

function fill(t, v, mem) {
  return t.replace(/\{(\w+)\}/g, (_, k) => {
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
// veterans push 100. Returns { venue, title, authors, phil, chunks } where
// each chunk is one keystroke's worth of prose ({ t, head } for heads).
export function generatePaper(s) {
  const band = bandFor(s.bestCap || 0);
  const theme = nextTheme(band);
  const phil = !!theme.phil;
  const mem = {};
  const used = new Set();
  const target = Math.min(100, 28 + (s.stats.papers || 0) * 8 + BANDS.indexOf(band) * 3);

  // every slot resolves inside the chosen thread — coherent papers
  const v = {
    topic: [theme.t], method: theme.m, claim: theme.c,
    bench: theme.b ? [theme.b] : band.bench,
    data: theme.d ? [theme.d] : band.data,
    prop: band.prop,
  };

  const founder = (FOUNDERS[s.founder] || FOUNDERS.mario).name;
  const co = [...COAUTHORS].sort(() => Math.random() - 0.5).slice(0, ri(1, 3));
  const authors = `${founder}, ${co.join(', ')}${(s.staff.researcher || 0) >= 5 ? ' & the Mogul Research Collective' : ''} · Mogul AI`;

  const sections = phil
    ? [
      ['Abstract', draw(P_ABSTRACT, v, mem, used, 2)],
      ['1 · Introduction', draw(P_INTRO, v, mem, used, 2)],
      ['2 · Method', draw(P_METHOD, v, mem, used, 2)],
      ['3 · The Argument', [...draw(P_ARGUMENT, v, mem, used, 3), ...draw(band.extra, v, mem, used, 1)]],
      ['4 · Discussion', draw(DISCUSSION, v, mem, used, 2)],
    ]
    : [
      ['Abstract', draw(ABSTRACT, v, mem, used, 2)],
      ['1 · Introduction', draw(INTRO, v, mem, used, 2)],
      ['2 · Method', draw(METHOD, v, mem, used, 2)],
      ['3 · Results', [...draw(RESULTS, v, mem, used, 3), ...draw(band.extra, v, mem, used, 1)]],
    ];
  const tail = ['· Conclusion', draw(phil ? P_CONCL : CONCL, v, mem, used, 2)];

  const chunksOf = (secs) => secs.reduce((a, [, ss]) =>
    a + ss.reduce((b, t) => b + Math.ceil(t.split(' ').length / 5), 1), 0);

  // grow toward the target; empirical papers add ablations/limitations,
  // philosophical ones deepen the argument — late eras may add Discussion
  const padders = phil
    ? [
      () => sections[3][1].push(...draw([...P_ARGUMENT, ...band.extra], v, mem, used, 2)),
      () => sections[4][1].push(...draw([...DISCUSSION, ...P_ARGUMENT], v, mem, used, 2)),
    ]
    : [
      () => sections.push(['4 · Ablations', draw(ABLATION, v, mem, used, 2)]),
      () => sections.push(['5 · Limitations', draw(LIMITS, v, mem, used, 2)]),
      () => { if (BANDS.indexOf(band) >= 3) sections.push(['6 · Discussion', draw(DISCUSSION, v, mem, used, 2)]); },
      () => sections[3][1].push(...draw([...RESULTS, ...band.extra], v, mem, used, 2)),
      () => sections[sections.length - 1][1].push(...draw([...ABLATION, ...band.extra, ...RESULTS], v, mem, used, 2)),
    ];
  let pi = 0;
  while (chunksOf([...sections, tail]) < target && pi < 12) padders[Math.min(pi, padders.length - 1)](), pi++;
  tail[0] = `${sections.length} ${tail[0]}`;
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
  // "X at toy scale at scale" — scale-flavored templates skip scale-flavored topics
  const tpool = (phil ? P_TITLES : TITLES).filter(t => !(/scale/i.test(t) && /scal/i.test(theme.t)));
  return {
    venue: pick(band.venues),
    title: fill(pick(tpool), v, mem).replace(/\b\w/, (c) => c.toUpperCase()),
    authors,
    phil,
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
