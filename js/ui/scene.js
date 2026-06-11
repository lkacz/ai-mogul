// Living pixel-art scene: the lab interior, rendered procedurally on canvas.
// Reflects real game state (racks = GPUs, characters = staff, monitors = runs)
// and lets the player poke the inhabitants.

import { game } from './ui.js';
import { MARIO_QUOTES, FOUNDERS } from '../core/data.js';
import { fmtNum, clamp } from '../core/util.js';

const founderDef = () => FOUNDERS[game.s?.founder] || FOUNDERS.mario;

const W = 480, H = 200;          // internal pixel resolution
const FLOOR_Y = 142;             // top of walkable floor band
const FLOOR_B = 196;             // bottom of walkable floor band

// ── tiny helpers ──────────────────────────────────────────────────
const P = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x | 0, y | 0, w, h); };
const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};
const pick = (arr, r) => arr[Math.floor(r * arr.length) % arr.length];

// ── role styling + quips ──────────────────────────────────────────
const QUIPS = {
  mario: MARIO_QUOTES,
  researcher: [
    'The ablation finished. It made it worse.',
    'Loss went down. Mood went up.',
    'What if we just… add more layers?',
    'p < 0.05 if you squint.',
    'The model rhymed. Unprompted. I\'m scared.',
    'I dreamt in tensors again.',
    'Eval is up 0.3! Don\'t touch ANYTHING.',
    'Reviewer 2 strikes again.',
    'My seed was lucky. I\'m citing the seed.',
    'It\'s not overfitting, it\'s specializing.',
    'The baseline beat us. Burying the baseline.',
    'Day 40: the curve is still log-linear. Send snacks.',
    'I asked it to prove a lemma. It asked for a raise.',
    'Two GPUs walk into a bar. The bar OOMs.',
    'I significance-tested my horoscope. It replicated.',
    'The model passed the eval. The eval failed the vibe check.',
    'Citation needed. Citation found. Citation retracted.',
    'We don\'t say "it broke". We say "negative result".',
    'My ablation ablated the wrong thing. New paper, though.',
    'Epoch 1: hope. Epoch 2: hubris. Epoch 3: NaN.',
    'Reviewers want more baselines. The baselines want lawyers.',
    'I taught it chain-of-thought. Now it overthinks like me.',
    'Correlation isn\'t causation, but it IS a NeurIPS paper.',
    'My learning rate and my sleep schedule: both cosine.',
    'It memorized the test set. Honestly? Relatable.',
    'Grad student descent: stochastic, poorly paid.',
    'The loss spiked. So did my heart rate. Same chart.',
    'I whisper "please" before every run. Effect size: small but real.',
    'New SOTA! For the next eleven minutes.',
    'The model says it\'s sure. The logits say it\'s lying.',
    'I plotted my life. Log-scale, and still flat.',
    'Tokenizer bug. Three weeks. TOKENIZER bug.',
    'It proves theorems but can\'t count the r\'s in strawberry.',
    'Our data is clean. Our code is… seasoned.',
    'Hypothesis: no. Conclusion: also no. Funding: somehow yes.',
    'Emergent abilities! (We lowered the threshold.)',
    'I dream of a benchmark nobody has overfit. A meadow.',
    'The intern\'s "small fix" improved everything. Investigating.',
    'Asked it for novel ideas. It suggested my own thesis. Rude.',
    'Attention is all you need. Attention, and forty billion dollars.',
    'My favorite hyperparameter is denial.',
    'The curves crossed! …the axes were mislabeled.',
    'Half my job is naming things. Today: Mogul-Final-v2-REAL.',
    'Peer review: where dreams become "minor revisions".',
    'It wrote a better related-work section than me. I\'m fine.',
    'I reran it with seed 42. The universe noticed.',
    'Eval suite green. Deploying fear.',
    'It hallucinated a citation to a paper I WISH existed.',
    'We beat the baseline! The baseline was a coin.',
    'My desk plant is also overfit to this environment.',
  ],
  engineer: [
    'I fused the kernels. All of them.',
    'MFU is up 2%! I am unstoppable.',
    'Rebooting node 7. Again.',
    'It\'s not a memory leak, it\'s a memory feature.',
    'NCCL timeout. NCCL timeout. NCC—',
    'The cluster speaks to me. It says "buy more".',
    'Off by one. It\'s always off by one.',
    'I profiled it. The bottleneck is physics.',
    'Works on my node.',
    'The fix was a sleep(1). I\'m not proud.',
    'Deleted 400 lines today. Best commit of my life.',
    'The cluster is fine. The dashboard about the cluster is on fire.',
    '99 little bugs in the code… take one down… 127 little bugs.',
    'I don\'t always test. But when I do, it\'s in prod.',
    'CUDA out of memory. Same.',
    'Renamed "temp_fix" to "permanent_fix". Done.',
    'The race condition only happens on Tuesdays. It\'s Tuesday.',
    'No bugs here. Only undocumented stochasticity.',
    'Kubernetes? I barely know-eties.',
    'Latency budget: 10ms. Latency actual: yes.',
    'I bisected the regression. It was me. Three months ago.',
    'The fix is one character. Finding it was one weekend.',
    'Logs say everything\'s fine. The logs are gaslighting me.',
    'We cache everything now. Including this sentence.',
    'Restarted it. It works. I hate that it works.',
    'GPU at 100%! …utilization or temperature? Yes.',
    'A TODO from 2025 is load-bearing now.',
    'Wrote a script to write scripts. It unionized.',
    'Our uptime has an asterisk. The asterisk has a postmortem.',
    'Don\'t touch the network config. It remembers.',
    'I speak four languages: Python, CUDA, YAML, apology.',
    'Profiler says the slow part is "everything".',
    'Not technical debt — technical compound interest.',
    'The checkpoint is 4 TB. The bug is 4 bytes.',
    'Who needs sleep when you have retry loops?',
    'Disk full. Deleted my feelings. Still full.',
    'NCCL error 13: communication breakdown. Same, NCCL. Same.',
    'The all-reduce is neither all nor reduced.',
    'Monitoring the monitoring. Monitorings all the way down.',
    'Pushed at 4:59 PM Friday. I contain multitudes.',
    'Two hard problems: cache invalidation, and node 7.',
    'My rubber duck asked for equity.',
    'Benchmarked it twice. Got three numbers.',
    'The flag was --force. It forced.',
    'I alphabetized the chaos. Organized chaos now.',
    'Rollback plan: cry, then rollback.',
    'Quantized my coffee to 4-bit. Tastes the same.',
    'Bug report says "it\'s weird sometimes". Accurate.',
    'Migrated everything. Nothing moved. Everything changed.',
    'Step time down 3%. I will be insufferable about this.',
  ],
  ops: [
    'Rack 12 is making the noise again.',
    'PUE is looking spicy today.',
    'Who unplugged the— oh no.',
    'Hot aisle\'s at sauna spec. Towels are extra.',
    'I named the chillers. Don\'t judge me.',
    'Cable management is self-care.',
    'The UPS beeped once. ONCE.',
    'New ticket: "server is wet". Closing as won\'t-fix.',
    'I can tell which rack it is by the smell.',
    'Forklift certified, by the way.',
    'Humidity is 45%. I will fight to keep it 45%.',
    'A bird got in. It has a badge now.',
    'Diesel tank\'s full. My patience is the backup.',
    'Someone labeled this cable "important". WHICH END?',
    'Hot-aisle yoga at six. Bring electrolytes.',
    'The BMS sent 4,000 alerts. One mattered. Guess which.',
    'Tightened 600 screws today. Zen.',
    'New guy plugged A into B. We don\'t have a B.',
    'Chiller 3 sings in E-flat when it\'s happy.',
    'PUE 1.09. Personal best. Framed it.',
    'The raised floor has a civilization under it now.',
    'Fire suppression test Friday. NOT a drill drill.',
    'The forklift\'s name is Susan. Susan eats pallets.',
    'I hear a failing fan from 40 meters. A gift. A curse.',
    'Cable tray\'s full. Starting a second story.',
    'Generator test at noon. Earplugs in the bowl.',
    'Someone microwaved fish in the NOC. Incident declared.',
    'Rack 47 runs warm. Don\'t mention it. It gets self-conscious.',
    'My step counter thinks I ran a marathon. Just patch day.',
    'UPS batteries swapped. The old ones retire to a farm upstate.',
    'Lost my multimeter. Found three older multimeters.',
    'The blinky light means it works. The OTHER blinky light…',
    'Badge denied to my own office. Character building.',
    'Found the roof leak. It was sweat. Mine.',
    'They name hurricanes; I name power events. This one\'s Kevin.',
    'The dust filter looked like a full sheep.',
    'If it hums wrong, I know. Everything here hums.',
    'Coffee machine is on the UPS. Priorities are correct.',
    'Crash cart got new wheels. Fastest cart in the region.',
    'I waxed the cold aisle. Don\'t ask. It\'s beautiful.',
  ],
  sales: [
    'Just closed a seven-figure logo!',
    'Customer asked if the model dreams. Billed them for the answer.',
    'The demo was perfect until it started rhyming.',
    'Pipeline\'s looking THICC this quarter.',
    'I sold an SLA on vibes.',
    'The customer wants it on-prem. In a submarine.',
    'Renewal closed! They never even logged in.',
    'Procurement said Q3. Their Q3, of next year.',
    'I put "AGI-ready" on the slide. Legal is typing…',
    'The POC became a P-O-Yes.',
    'Client wants "AGI but cheaper". Quoted them "later".',
    'My quota grows faster than the model. Explain THAT scaling law.',
    'Demo gods were kind. It cost two dongles.',
    'They said "send a one-pager". One page. Six-point font.',
    '"Per token" confuses them. "Per magic" closes.',
    'The customer churned, then un-churned. Butter market.',
    'Legal redlined my emoji. The emoji stays.',
    'I CC\'d their CEO. Bold? Yes. Effective? Also yes.',
    'Q4 pipeline is 40% hope by volume.',
    'They want SOC 2, ISO, and a pinky promise. Done.',
    'Discovery call #9. Discovered: they like calls.',
    'My CRM has feelings for me. All of them red.',
    'Closed-won! Rang the gong. The gong is resting now.',
    '"Strategic partnership" means nobody pays. Yet.',
    'The RFP had 400 questions. Question 7 was a trap.',
    'I sold the roadmap. Engineering is drawing the road.',
    'We made the customer TOO successful. They left.',
    'Renewal at 3×. Dedicating this one to my CRM.',
    'They benchmarked us against a spreadsheet. We won. Barely.',
    'Travel policy says economy. My back says invoice them.',
    'Our champion left the company. Recruiting a new champion.',
    'Asked for budget, got "alignment". Can\'t deposit alignment.',
    'Their procurement portal wants a password from 2019.',
    'I whispered "multi-year discount" and a deal appeared.',
    'NDA signed! Now I can finally say… nothing.',
    'The logo wall gained a logo. The logo wall is my bio.',
    'Upsold the upsell. Upsells all the way up.',
    'Competitor called us "niche". We\'re "focused". Sending tweet.',
    'My ringtone is the deal-closed sound. Pavlov, but money.',
    'Forecast: cloudy with a chance of commit.',
  ],
  cat: ['mrrp.', 'purrs at 3.2 kW.', '…', 'meow (this means "scale").',
    'sits on the warm rack. claims it.', 'mlem.', 'knocks a GPU off the shelf. slowly.',
    'stares at the cable. the cable blinks first.',
    'mrrrp. (translation: deploy it.)',
    'sits on the keyboard. ships to prod.',
    'the red dot is a hallucination. pursue it anyway.',
    '*slow blink at the loss curve*',
    'purrs at 16 kHz. the fans harmonize.',
    'naps through the all-hands. correct.',
    'whiskers detect a 0.2 °C drift. unacceptable.',
    'bats the mouse off the desk. QA complete.',
    'meows at the server. the server listens. fix confirmed.',
    'the warm rack is mine. the cold aisle is also mine.',
    'demands treats per token.',
    'judges the architecture. silently. forever.',
    '*knocks over the good GPU* oops.',
    'attention is all i need. provide it.',
    'chases the cursor. catches the bug.',
    'sleeps 18 hours a day. peak efficiency.',
    'tail flick = code review rejected.',
    'loafs on the CRAC. quality assurance.',
    'has never once hallucinated. unlike SOME models.',
  ],
};

// ── no-repeat quips: every pool is dealt like a shuffled deck — nothing
// repeats until the whole pool is exhausted, and the next shuffle never
// opens with the line that just closed the last one.
const quipBags = new WeakMap();
export function drawQuip(arr) {
  let st = quipBags.get(arr);
  if (!st || st.i >= st.order.length) {
    const order = arr.map((_, k) => k);
    for (let k = order.length - 1; k > 0; k--) {       // Fisher–Yates
      const j = Math.floor(Math.random() * (k + 1));
      [order[k], order[j]] = [order[j], order[k]];
    }
    if (st && order.length > 1 && order[0] === st.last) {
      const j = 1 + Math.floor(Math.random() * (order.length - 1));
      [order[0], order[j]] = [order[j], order[0]];
    }
    st = { order, i: 0, last: st ? st.last : -1 };
    quipBags.set(arr, st);
  }
  st.last = st.order[st.i++];
  return arr[st.last];
}

const ROLES = {
  // 'mario' is the founder slot — its look & lines come from FOUNDERS at draw time
  mario:      { top: '#46555f', pants: '#2c333d', hair: '#241a12', skin: '#e6b486', glasses: true },
  researcher: { top: '#e8ecf2', pants: '#5a6a85', hair: '#5b4630', skin: '#e6b486' },
  engineer:   { top: '#3a6ea5', pants: '#33394a', hair: '#1e1a18', skin: '#c98e62' },
  ops:        { top: '#e0903a', pants: '#3d4250', hair: '#3c2f24', skin: '#8d5d3f' },
  sales:      { top: '#6d5a9e', pants: '#2f2a3d', hair: '#84561e', skin: '#e6b486' },
};
const roleStyle = (role) => role === 'mario' ? founderDef().sprite : ROLES[role];
const roleQuips = (role) => role === 'mario' ? founderDef().quotes : QUIPS[role];

// what people say when you pick them up and put them somewhere else
const DROP_QUIPS = [
  'Hey!', 'I was walking there.', 'Management by relocation, huh.',
  'Wheee— okay.', 'HR will hear about this.', 'Put me down— oh. You did.',
  'Is this a re-org?', 'I needed the steps, actually.',
];
const DESK_DROP_QUIPS = [
  'Fine, I\'ll run the ablations.', 'Working, working.',
  'You could have just asked.', 'Straight to the loss curves, then.',
];
const CAT_DROP_QUIPS = ['mrrp?!', 'hisss.', '…acceptable.', 'this is MY spot now.'];

// ── progressive augmentation: the humans keep up with the machines ──
// colo: AR glasses · DC: neural implant · Factory: chrome arm · Orbital:
// exo-legs + visor · Dyson: chrome body · Lattice: full chassis — and only
// the eyes are still, unmistakably, human.
const CHROME = '#94a1b5', CHROME_D = '#5f6a82';
const augStage = () => Math.max(0, (game.s?.phase ?? 0) - 1);

// ── characters ────────────────────────────────────────────────────
const chars = [];   // persists across tab rebuilds
let cat = null;
let confetti = [];
let lastFrame = 0;

function spawn(role) {
  return {
    role, x: 40 + Math.random() * (W - 80), y: FLOOR_Y + 14 + Math.random() * (FLOOR_B - FLOOR_Y - 22),
    tx: 0, ty: 0, dir: 1, state: 'idle', think: 0, walkT: Math.random() * 10,
    speech: null, deskSeat: -1, seed: Math.random() * 1e4,
  };
}

function syncPopulation(s) {
  const want = { mario: 1 };
  if (s.phase >= 1) {
    want.researcher = clamp(s.staff.researcher, 0, 4);
    want.engineer = clamp(s.staff.engineer, 0, 3);
    want.ops = clamp(s.staff.ops, 0, 2);
    want.sales = clamp(s.staff.sales, 0, 2);
  }
  for (const [role, n] of Object.entries(want)) {
    let have = chars.filter(c => c.role === role);
    while (have.length < n) { chars.push(spawn(role)); have = chars.filter(c => c.role === role); }
    while (have.length > n) { chars.splice(chars.indexOf(have.pop()), 1); }
  }
  for (let i = chars.length - 1; i >= 0; i--) {
    if (!(chars[i].role in want)) chars.splice(i, 1);
  }
  if (!cat) cat = { x: 200, y: FLOOR_B - 6, tx: 200, dir: 1, state: 'sit', think: 0, walkT: 0, speech: null };
}

function say(c, text, dur = 3.6) { c.speech = { text, until: performance.now() / 1000 + dur }; }

function thinkChar(c, dt, t, layout) {
  if (c.state === 'held') {       // dangling from the player's cursor
    if (c.speech && t > c.speech.until) c.speech = null;
    return;
  }
  c.think -= dt;
  if (c.state === 'walk') {
    const dx = c.tx - c.x, dy = c.ty - c.y;
    const d = Math.hypot(dx, dy);
    if (d < 2) { c.state = c.deskSeat >= 0 ? 'work' : 'idle'; c.think = 2 + Math.random() * 6; }
    else {
      const sp = 14 * dt;
      c.x += dx / d * sp; c.y += dy / d * sp;
      c.dir = dx >= 0 ? 1 : -1;
      c.walkT += dt * 9;
    }
  } else if (c.think <= 0) {
    // choose next activity
    const desks = layout.desks || [];
    if (desks.length && Math.random() < 0.45 && c.role !== 'ops') {
      const idx = Math.floor(Math.random() * desks.length);
      c.deskSeat = idx;
      c.tx = desks[idx][0]; c.ty = desks[idx][1];
    } else {
      c.deskSeat = -1;
      c.tx = layout.x0 + Math.random() * (layout.x1 - layout.x0);
      c.ty = FLOOR_Y + 16 + Math.random() * (FLOOR_B - FLOOR_Y - 24);
    }
    c.state = 'walk';
  }
  // idle chatter
  if (!c.speech && Math.random() < dt / 26) say(c, drawQuip(roleQuips(c.role)));
  if (c.speech && t > c.speech.until) c.speech = null;
}

// ── drawing: people ───────────────────────────────────────────────
function drawPerson(ctx, c, t) {
  const r = roleStyle(c.role);
  const aug = augStage();
  const x = c.x | 0, fy = c.y | 0;       // fy = feet
  const working = c.state === 'work';
  const walking = c.state === 'walk';
  const held = c.state === 'held';
  const bob = walking ? Math.round(Math.sin(c.walkT * 2) * 1) : 0;
  const legA = walking ? Math.round(Math.sin(c.walkT) * 2)
    : held ? Math.round(Math.sin(t * 9) * 2) : 0;   // dangling legs
  const y0 = fy - 20 + bob;               // top of head

  // bodies turn chrome as the eras pass
  const pants = aug >= 4 ? CHROME_D : r.pants;
  const top = aug >= 5 ? CHROME : r.top;

  // shadow (not while airborne in the player's grip)
  if (!held) P(ctx, x - 4, fy - 1, 9, 2, 'rgba(0,0,0,.30)');
  // legs
  P(ctx, x - 3 + legA, fy - 6, 2, 6, pants);
  P(ctx, x + 1 - legA, fy - 6, 2, 6, pants);
  if (aug >= 4) { P(ctx, x - 3 + legA, fy - 4, 2, 1, '#2c3445'); P(ctx, x + 1 - legA, fy - 4, 2, 1, '#2c3445'); } // exo joints
  // torso (lab coat is longer)
  const coatLen = c.role === 'researcher' ? 10 : 8;
  P(ctx, x - 3, y0 + 6, 7, coatLen, top);
  if (aug < 5) {
    if (c.role === 'ops') P(ctx, x - 3, y0 + 7, 7, 2, '#f7c948'); // hi-vis stripe
    if (c.role === 'sales') P(ctx, x - 1, y0 + 7, 1, 4, '#d8315b'); // tie
  } else {
    P(ctx, x - 3, y0 + 10, 7, 1, '#39455c');                       // chassis seam
    P(ctx, x - 1, y0 + 12, 3, 1, '#39455c');
  }
  if (aug >= 3) P(ctx, x - 1, y0 + 8, 1, 1,
    Math.sin(t * 3 + c.seed) > 0 ? '#22d3ee' : '#155e6b');          // chest light
  // arms: swing when walking, type when working; one goes chrome first
  const armA = working ? Math.round(Math.sin(t * 14 + c.seed) * 1) : (walking || held) ? legA : 0;
  P(ctx, x - 4, y0 + 7 + (working ? 2 : 0), 1, 5 + armA, top);
  P(ctx, x + 4, y0 + 7 + (working ? 2 : 0), 1, 5 - armA, aug >= 3 ? CHROME : top);
  // head
  P(ctx, x - 2, y0, 5, 6, aug >= 6 ? CHROME : r.skin);
  // hair: founder styles vary — Mario's famous curls, Al's hoodie.
  // Past Dyson scale a brushed-metal cranial shell replaces it (founders
  // keep their trademark on top — you can still tell who's who).
  if (aug >= 5) {
    P(ctx, x - 3, y0 - 2, 7, 3, CHROME_D);
    P(ctx, x + 0, y0 - 4, 1, 2, CHROME_D);                          // antenna
    P(ctx, x + 0, y0 - 5, 1, 1, Math.sin(t * 5 + c.seed) > 0 ? '#a78bfa' : '#4c3a6b');
    if (r.curls) { P(ctx, x - 2, y0 - 3, 2, 1, r.hair); P(ctx, x + 1, y0 - 3, 2, 1, r.hair); }
  } else if (r.curls) {
    P(ctx, x - 3, y0 - 2, 7, 3, r.hair);
    P(ctx, x - 3, y0 + 1, 1, 2, r.hair);
    P(ctx, x + 3, y0 + 1, 1, 2, r.hair);
    P(ctx, x - 2, y0 - 3, 2, 1, r.hair); P(ctx, x + 1, y0 - 3, 2, 1, r.hair); // curl bumps
  } else if (r.hoodie) {
    P(ctx, x - 2, y0 - 1, 5, 2, r.hair);          // short hair
    P(ctx, x - 4, y0 - 1, 1, 7, r.top);           // hood draped
    P(ctx, x + 4, y0 - 1, 1, 7, r.top);
    P(ctx, x - 3, y0 - 2, 7, 1, r.top);           // hood over the crown
    P(ctx, x - 2, y0 + 9, 5, 2, '#79828f');       // kangaroo pocket
  } else {
    P(ctx, x - 2, y0 - 1, 5, 2, r.hair);
  }
  // eyes & face tech, era by era
  if (aug >= 6) {
    // full chassis — but the eyes are still human. They blink.
    P(ctx, x - 2, y0 + 2, 5, 2, '#1a2130');                         // face plate slit
    if (Math.sin(t * 0.9 + c.seed) > -0.92) {                       // blink
      P(ctx, x - 1, y0 + 2, 1, 1, '#f4e8dc'); P(ctx, x - 1, y0 + 3, 1, 1, r.skin);
      P(ctx, x + 1, y0 + 2, 1, 1, '#f4e8dc'); P(ctx, x + 1, y0 + 3, 1, 1, r.skin);
    }
  } else if (aug >= 4) {
    P(ctx, x - 2, y0 + 2, 5, 1, '#22d3ee');                         // full AR visor
  } else if (aug >= 1) {
    P(ctx, x - 2, y0 + 2, 5, 1, 'rgba(34,211,238,.75)');            // AR glasses
  } else if (r.glasses) {
    P(ctx, x - 2, y0 + 2, 5, 1, '#1c2430');
  }
  if (aug >= 2 && aug < 6) P(ctx, x + 3, y0 + 1, 1, 1,
    Math.sin(t * 2.2 + c.seed) > 0 ? '#a78bfa' : '#574a7a');        // neural implant
}

function drawCat(ctx, c, t) {
  const x = c.x | 0, y = c.y | 0;
  P(ctx, x - 3, y - 1, 7, 2, 'rgba(0,0,0,.25)');
  P(ctx, x - 3, y - 4, 7, 4, '#2d2a33');               // body
  P(ctx, x + 3, y - 6, 3, 3, '#2d2a33');               // head
  P(ctx, x + 3, y - 7, 1, 1, '#2d2a33'); P(ctx, x + 5, y - 7, 1, 1, '#2d2a33'); // ears
  const tail = Math.round(Math.sin(t * 2.5) * 2);
  P(ctx, x - 4, y - 5 + tail, 1, 3, '#2d2a33');        // tail flick
  P(ctx, x + 4, y - 5, 1, 1, '#7ce0b3');               // eye
}

// ── drawing: furniture ────────────────────────────────────────────
function drawRack(ctx, x, y, t, idx, activity, h = 34) {
  P(ctx, x, y, 14, h, '#10141d');                       // cabinet
  P(ctx, x + 1, y + 1, 12, h - 2, '#1a2030');           // face
  for (let row = 0; row < (h - 6) / 4; row++) {
    P(ctx, x + 2, y + 3 + row * 4, 8, 2, '#222b3f');    // server slots
    const on = hash(idx, row + ((t * (1 + activity * 5)) | 0)) < 0.25 + activity * 0.65;
    P(ctx, x + 11, y + 3 + row * 4, 1, 1, on ? (activity > 0.4 ? '#39e6a3' : '#e6c739') : '#27314a');
  }
}

function drawDesk(ctx, x, y, t, runProgress) {
  // standing desk (it's an AI startup) + monitor with a live loss curve
  P(ctx, x - 9, y - 9, 19, 2, '#5a4634');               // desktop
  P(ctx, x - 8, y - 7, 2, 7, '#3c3026'); P(ctx, x + 7, y - 7, 2, 7, '#3c3026');
  P(ctx, x - 6, y - 17, 11, 8, '#11151f');              // monitor
  P(ctx, x - 5, y - 16, 9, 6, '#0c1f1c');               // screen
  // descending loss curve
  ctx.fillStyle = '#39e6a3';
  for (let i = 0; i < 8; i++) {
    const prog = runProgress >= 0 ? runProgress : (t * 0.05 % 1);
    const yy = 2.5 - Math.log(1 + (i / 8 + prog * 3)) * 1.6 + Math.sin(t * 7 + i) * 0.4;
    ctx.fillRect(x - 5 + i + 1, (y - 16 + clamp(yy + 3, 0, 5)) | 0, 1, 1);
  }
  P(ctx, x - 1, y - 9 + (-1), 2, 1, '#2a3142');         // keyboard
}

function drawWhiteboard(ctx, x, y) {
  P(ctx, x, y, 34, 18, '#dde3ea'); P(ctx, x - 1, y - 1, 36, 1, '#4a5468'); P(ctx, x - 1, y + 18, 36, 1, '#4a5468');
  P(ctx, x + 3, y + 3, 18, 1, '#d8315b');               // "SCALE"
  P(ctx, x + 3, y + 6, 24, 1, '#3a6ea5');               // "IS ALL"
  P(ctx, x + 3, y + 9, 14, 1, '#3a6ea5');               // "YOU NEED"
  P(ctx, x + 3, y + 13, 10, 2, '#39a36b');              // up-and-to-the-right
  P(ctx, x + 13, y + 11, 8, 2, '#39a36b');
  P(ctx, x + 21, y + 8, 6, 2, '#39a36b');
}

function drawCoffee(ctx, x, y, t) {
  P(ctx, x, y - 12, 8, 12, '#3a3f4d'); P(ctx, x + 1, y - 10, 6, 4, '#11151f');
  P(ctx, x + 2, y - 5, 4, 3, '#d8d3c8');
  if (Math.sin(t * 3) > 0) P(ctx, x + 3, y - 14 - (t * 8 % 3), 1, 1, 'rgba(220,220,220,.5)'); // steam
}

function drawPizza(ctx, x, y, n) {
  for (let i = 0; i < n; i++) P(ctx, x - i, y - 2 - i * 2, 12, 2, i % 2 ? '#b08968' : '#9c7754');
}

// A rack on fire (shown for 24h after the fire event, while the cleanup buff runs)
function drawFireFx(ctx, x, y, t) {
  const glow = ctx.createRadialGradient(x + 6, y - 6, 1, x + 6, y - 6, 26);
  glow.addColorStop(0, `rgba(251,146,60,${0.30 + Math.sin(t * 9) * 0.10})`);
  glow.addColorStop(1, 'rgba(251,146,60,0)');
  ctx.fillStyle = glow; ctx.fillRect(x - 20, y - 32, 52, 40);
  for (let i = 0; i < 9; i++) {
    const fx = x + hash(i, (t * 8) | 0) * 14 - 3;
    const fh = 4 + hash(i + 9, (t * 10) | 0) * 13;
    P(ctx, fx, y - fh, 2, fh, i % 2 ? '#f59e0b' : '#ef4444');
    if (hash(i, (t * 6) | 0) > 0.5) P(ctx, fx, y - fh - 3, 1, 3, '#fde68a');
  }
  for (let i = 0; i < 6; i++) {  // smoke drifting up
    const sx = x + 5 + Math.sin(t * 1.5 + i * 2) * 5;
    const sy = y - 16 - ((t * 9 + i * 13) % 46);
    P(ctx, sx, sy, 3 + (i % 2), 2, `rgba(125,125,135,${0.55 - i * 0.08})`);
  }
}
// where the burning rack sits in each scene (fires only happen ≤ phase 4,
// but the cleanup buff can outlive an upgrade)
const FIRE_POS = [[50, 100], [378, 136], [50, 140], [39, 140], [35, 140], [448, 192], [240, 190], [240, 190]];

// ── per-phase scenes ──────────────────────────────────────────────
function sceneCommon(ctx, wall, wallLo, floorA, floorB) {
  P(ctx, 0, 0, W, FLOOR_Y, wall);
  P(ctx, 0, FLOOR_Y - 26, W, 26, wallLo);
  for (let y = FLOOR_Y; y < H; y += 2) {
    P(ctx, 0, y, W, 2, (y / 2 | 0) % 2 ? floorA : floorB);
  }
}

function layoutGarage(s, sel) { return { x0: 30, x1: 300, desks: [[120, 176]] }; }
function drawGarage(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#5b5048', '#4a413a', '#6a625b', '#645c55');
  // garage door (right) — brushed metal, clearly not wall
  P(ctx, 326, 14, 138, 128, '#3f4651');
  P(ctx, 330, 18, 130, 124, '#79828f');
  for (let i = 0; i < 6; i++) P(ctx, 330, 18 + i * 21, 130, 2, '#5d6571');
  P(ctx, 380, 30, 34, 10, '#d8e4f2');                   // little window — dawn light
  P(ctx, 388, 130, 14, 3, '#39404a');                   // handle
  // breaker box (the famous 3 kW breaker)
  P(ctx, 18, 44, 14, 20, '#8c939e'); P(ctx, 20, 48, 10, 3, '#d8315b');
  const powerFrac = sel.powerUsed / sel.powerCap;
  if (powerFrac > 0.9 && Math.sin(t * 6) > 0) P(ctx, 20, 48, 10, 3, '#ff6b6b'); // breaker sweating
  // shelf with bought GPUs
  P(ctx, 40, 70, 90, 3, '#4a3c2e'); P(ctx, 40, 100, 90, 3, '#4a3c2e');
  let gi = 0;
  for (const n of Object.values(s.gpus)) {
    for (let k = 0; k < n && gi < 12; k++, gi++) {
      const sx = 44 + (gi % 6) * 14, sy = gi < 6 ? 61 : 91;
      P(ctx, sx, sy, 11, 8, '#1c2230'); P(ctx, sx + 1, sy + 1, 9, 2, '#2c3850');
      P(ctx, sx + 8, sy + 5, 2, 2, Math.sin(t * 4 + gi) > 0 ? '#39e6a3' : '#1c4734'); // fan LED
    }
  }
  drawPizza(ctx, 200, 190, clamp(1 + ((s.stats.runsStarted / 3) | 0), 1, 4));
  // poster
  P(ctx, 150, 40, 22, 28, '#23303f'); P(ctx, 153, 46, 16, 2, '#39e6a3'); P(ctx, 153, 52, 16, 10, '#1a4456');
}

function layoutOffice() { return { x0: 24, x1: 330, desks: [[70, 172], [130, 184], [190, 172]] }; }
function drawOffice(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#3d4754', '#333c48', '#4d5663', '#475061');
  for (let x = 0; x < W; x += 60) P(ctx, x, 10, 34, 4, '#e8ecda');  // ceiling lights
  drawWhiteboard(ctx, 30, 36);
  // window with skyline
  P(ctx, 150, 30, 60, 34, '#1c2940');
  for (let i = 0; i < 6; i++) P(ctx, 154 + i * 9, 42 + hash(i) * 10, 5, 22, '#283d5c');
  drawCoffee(ctx, 240, 140, t);                          // coffee corner at wall base
  P(ctx, 278, 144, 7, 5, '#7a4b2c');                     // office plant: pot…
  P(ctx, 280, 128, 3, 16, '#39754f'); P(ctx, 276, 122, 11, 9, '#3f9c63'); // …and leaves
  // server closet on the right fills with racks
  P(ctx, 350, 34, 120, 108, '#262e3d');
  P(ctx, 352, 36, 116, 104, '#1b212e');
  const racks = clamp(Math.ceil(sel.gpuCount / 12), 1, 6);
  const act = s.runs.length ? 0.8 : 0.15;
  for (let i = 0; i < racks; i++) drawRack(ctx, 360 + i * 18, 56, t, i, act, 80);
}

function layoutColo() { return { x0: 24, x1: 440, desks: [[400, 186]] }; }
function drawColo(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#252c3a', '#1f2531', '#2c3443', '#28303f');
  // cage fence backdrop
  for (let x = 0; x < W; x += 8) P(ctx, x, 26, 1, 100, '#39455c');
  for (let y = 30; y < 126; y += 12) P(ctx, 0, y, W, 1, '#39455c');
  const racks = clamp(Math.ceil(sel.gpuCount / 60), 2, 14);
  const act = s.runs.length ? 0.85 : 0.2;
  for (let i = 0; i < racks; i++) drawRack(ctx, 26 + i * 24, 84, t, i, act, 56);
  // overhead cable tray
  P(ctx, 0, 70, W, 4, '#161b26');
  for (let x = 6; x < W; x += 17) P(ctx, x, 74, 2, 8, '#e0903a');
}

function layoutDc() { return { x0: 24, x1: 440, desks: [[60, 188]] }; }
function drawDc(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#1d2330', '#181d28', '#242b3a', '#202736');
  // far row (parallax silhouettes)
  for (let i = 0; i < 22; i++) P(ctx, 8 + i * 21, 52, 13, 38, '#222a3c');
  // cooling ducts
  P(ctx, 0, 20, W, 10, '#2c3242'); for (let x = 0; x < W; x += 40) P(ctx, x + 10, 30, 6, 14, '#2c3242');
  const racks = clamp(Math.ceil(sel.gpuCount / 2500), 4, 18);
  const act = s.runs.length ? 0.9 : 0.25;
  for (let i = 0; i < racks; i++) drawRack(ctx, 14 + i * 25, 92, t, i + 40, act, 48);
  // yellow safety line
  P(ctx, 0, 168, W, 2, '#caa53d'); for (let x = 0; x < W; x += 14) P(ctx, x, 168, 7, 2, '#171c26');
}

function layoutFactory() { return { x0: 24, x1: 440, desks: [[240, 188]] }; }
function drawFactory(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#161a26', '#12151f', '#1d2331', '#191f2c');
  // the glowing core — pulse follows AGI progress
  const pr = clamp(s.bestCap / 100, 0, 1);
  const pulse = 0.6 + Math.sin(t * (1 + pr * 3)) * 0.4;
  const cg = ctx.createRadialGradient(240, 56, 2, 240, 56, 40 + pr * 26);
  cg.addColorStop(0, `rgba(167,139,250,${0.85 * pulse})`);
  cg.addColorStop(1, 'rgba(167,139,250,0)');
  ctx.fillStyle = cg; ctx.fillRect(160, 0, 160, 120);
  P(ctx, 234, 44, 12, 24, '#0d0f18'); P(ctx, 236, 46, 8, 20, `rgba(216,180,254,${pulse})`);
  // gantry + far rack rows
  P(ctx, 0, 14, W, 6, '#232a3a');
  for (let i = 0; i < 26; i++) P(ctx, 4 + i * 19, 44, 11, 44, '#1e2536');
  for (let i = 0; i < 26; i++) P(ctx, 12 + i * 19, 70, 11, 30, '#232c40');
  const racks = clamp(Math.ceil(sel.gpuCount / 3e5), 6, 19);
  const act = s.runs.length ? 0.95 : 0.3;
  for (let i = 0; i < racks; i++) drawRack(ctx, 10 + i * 25, 96, t, i + 90, act, 44);
  // robot arm tending racks
  const ra = Math.sin(t * 0.8) * 30;
  P(ctx, 330 + ra, 20, 4, 26, '#5b6478'); P(ctx, 326 + ra, 44, 12, 5, '#e0903a');
  if (s.won) { // golden hour
    ctx.fillStyle = `rgba(251,191,36,${0.08 + Math.sin(t) * 0.04})`; ctx.fillRect(0, 0, W, H);
  }
}

function layoutOrbital() { return { x0: 24, x1: 420, desks: [[110, 184], [350, 188]] }; }
function drawOrbital(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#04060d', '#101524', '#2b3142', '#272d3c');
  // panoramic window onto space (frame, then contents clipped inside)
  P(ctx, 6, 6, W - 12, 110, '#39455c');
  ctx.save();
  ctx.beginPath(); ctx.rect(10, 10, W - 20, 102); ctx.clip();
  P(ctx, 10, 10, W - 20, 102, '#020308');
  // stars
  for (let i = 0; i < 90; i++) {
    const x = 12 + hash(i, 1) * (W - 24), y = 11 + hash(i, 2) * 100;
    const tw = 0.5 + 0.5 * Math.sin(t * (0.6 + hash(i, 3) * 2) + i);
    P(ctx, x, y, 1, 1, `rgba(210,220,240,${0.2 + 0.55 * tw})`);
  }
  // Earth, lower left — night side with city lights, day-lit rim
  ctx.fillStyle = '#0d2748';
  ctx.beginPath(); ctx.arc(76, 196, 110, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#143a66';
  ctx.beginPath(); ctx.arc(60, 206, 110, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(120,190,255,.8)'; ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(76, 196, 110, -Math.PI * 0.78, -Math.PI * 0.22); ctx.stroke();
  for (let i = 0; i < 26; i++) {  // city lights
    const a = -Math.PI * (0.25 + hash(i, 7) * 0.5), rr = 96 + hash(i, 8) * 10;
    P(ctx, 76 + Math.cos(a) * rr, 196 + Math.sin(a) * rr, 1, 1,
      Math.sin(t * 2 + i * 1.7) > -0.4 ? '#f7d488' : '#9a7b3c');
  }
  // compute satellites drift by: body + solar wings + blinking laser links
  const sats = clamp(Math.ceil(sel.gpuCount / 4e6), 4, 12);
  const act = s.runs.length ? 0.9 : 0.3;
  const sx = [], sy = [];
  for (let i = 0; i < sats; i++) {
    const x = 12 + ((hash(i, 4) * (W - 24) + t * (2.5 + (i % 3))) % (W - 28));
    const y = 18 + hash(i, 5) * 64;
    sx.push(x); sy.push(y);
  }
  ctx.strokeStyle = 'rgba(124,224,179,.28)'; ctx.lineWidth = 0.6;   // laser mesh
  for (let i = 1; i < sats; i++) {
    if (hash(i, 9) < act) {
      ctx.beginPath(); ctx.moveTo(sx[i - 1] + 3, sy[i - 1] + 1); ctx.lineTo(sx[i] + 3, sy[i] + 1); ctx.stroke();
    }
  }
  for (let i = 0; i < sats; i++) {
    P(ctx, sx[i] - 6, sy[i], 5, 2, '#1d3a5e'); P(ctx, sx[i] + 7, sy[i], 5, 2, '#1d3a5e'); // wings
    P(ctx, sx[i], sy[i] - 1, 6, 4, '#262e3d'); P(ctx, sx[i] + 1, sy[i], 4, 2, '#39455c');
    if (Math.sin(t * (3 + i) + i * 9) > 0.2) P(ctx, sx[i] + 5, sy[i], 1, 1, act > 0.5 ? '#39e6a3' : '#e6c739');
  }
  // the approach to the Singularity: a knot of light that tightens past cap 100
  const pr = clamp((s.bestCap - 100) / 100, 0, 1);
  if (pr > 0) {
    const px = 360, py = 42;
    const pulse = 0.5 + Math.sin(t * (2 + pr * 8)) * 0.5;
    const cg = ctx.createRadialGradient(px, py, 0, px, py, 8 + pr * 26);
    cg.addColorStop(0, `rgba(255,255,255,${0.5 + 0.5 * pulse * pr})`);
    cg.addColorStop(0.4, `rgba(216,180,254,${0.5 * pulse})`);
    cg.addColorStop(1, 'rgba(167,139,250,0)');
    ctx.fillStyle = cg; ctx.fillRect(px - 36, py - 36, 72, 72);
    P(ctx, px - 1, py - 1, 2, 2, '#fff');
  }
  ctx.restore();
  // window struts
  for (let x = 100; x < W - 20; x += 96) P(ctx, x, 6, 3, 110, '#39455c');
  // console strip under the window: blinking telemetry
  P(ctx, 6, 118, W - 12, 6, '#161b26');
  for (let i = 0; i < 30; i++) {
    const on = hash(i, 6) < 0.5 ? Math.sin(t * 3 + i) > 0 : Math.sin(t * 1.7 + i * 2) > 0.3;
    P(ctx, 14 + i * 15, 120, 3, 2, on ? (i % 3 ? '#39e6a3' : '#22d3ee') : '#27314a');
  }
  // a couple of local racks + the crash-cart desks
  drawRack(ctx, 444, 148, t, 7, s.runs.length ? 0.9 : 0.2, 44);
  drawRack(ctx, 462, 148, t, 8, s.runs.length ? 0.9 : 0.2, 44);
  if (s.singularity) {  // afterglow of the new universe
    ctx.fillStyle = `rgba(216,180,254,${0.05 + Math.sin(t * 0.8) * 0.03})`;
    ctx.fillRect(0, 0, W, H);
  }
}

function layoutDyson() { return { x0: 24, x1: 420, desks: [[90, 186], [330, 190]] }; }
function drawDyson(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#02030a', '#0c1020', '#262c3b', '#222837');
  // observation gallery: open vista above the deck
  P(ctx, 0, 0, W, 132, '#010208');
  for (let i = 0; i < 110; i++) {
    const tw = 0.4 + 0.6 * Math.sin(t * (0.5 + hash(i, 3) * 2) + i);
    P(ctx, hash(i, 1) * W, hash(i, 2) * 126, 1, 1, `rgba(205,215,240,${0.15 + 0.5 * tw})`);
  }
  // THE SUN — and the swarm slowly winning against it
  const sx = 330, sy = 62, R = 46;
  const glow = ctx.createRadialGradient(sx, sy, R * 0.4, sx, sy, R * 2.4);
  glow.addColorStop(0, 'rgba(255,210,120,.55)');
  glow.addColorStop(1, 'rgba(255,160,60,0)');
  ctx.fillStyle = glow; ctx.fillRect(sx - R * 2.4, sy - R * 2.4, R * 4.8, R * 4.8);
  const core = ctx.createRadialGradient(sx, sy, 1, sx, sy, R);
  core.addColorStop(0, '#fff8e8');
  core.addColorStop(0.55, '#ffd778');
  core.addColorStop(1, '#f0903a');
  ctx.fillStyle = core;
  ctx.beginPath(); ctx.arc(sx, sy, R, 0, Math.PI * 2); ctx.fill();
  // swarm coverage: collector tiles occlude the disk as the fleet grows
  const cover = clamp((s.gpus.dysonNode || 0) / 1e9, 0, 0.85);
  const tiles = Math.round(cover * 230);
  for (let i = 0; i < tiles; i++) {
    const a = hash(i, 11) * Math.PI * 2 + t * 0.015 * (1 + (i % 5) * 0.1);
    const rr = Math.sqrt(hash(i, 12)) * (R - 2);
    const tx = sx + Math.cos(a) * rr, ty = sy + Math.sin(a) * rr;
    P(ctx, tx - 1.5, ty - 1, 3, 2, '#1a1206');
    if (hash(i, 13) > 0.7) P(ctx, tx - 1.5, ty - 1, 1, 1, '#ffe9b0'); // glint
  }
  // collector convoys streaming sunward from the Mercury foundries (left)
  P(ctx, 18, 96, 26, 10, '#3a3026'); P(ctx, 22, 92, 18, 4, '#5a4634'); // foundry silhouette
  for (let i = 0; i < 9; i++) {
    const fr = ((t * 0.022 * (1 + (i % 3) * 0.15)) + hash(i, 21)) % 1;
    const cx = 44 + fr * (sx - R - 50), cy = 100 - fr * 30 + Math.sin(i * 2.4) * 8;
    P(ctx, cx, cy, 2, 1, '#9fb4d8');
  }
  // beamed power: faint lances from swarm edge to the deck
  ctx.strokeStyle = `rgba(124,224,179,${0.18 + 0.1 * Math.sin(t * 2)})`;
  ctx.lineWidth = 0.7;
  ctx.beginPath(); ctx.moveTo(sx - R - 4, sy + 14); ctx.lineTo(120, 134); ctx.stroke();
  ctx.beginPath(); ctx.moveTo(sx - R - 2, sy + 26); ctx.lineTo(300, 134); ctx.stroke();
  // deck rail + consoles
  P(ctx, 0, 132, W, 3, '#39455c');
  for (let i = 0; i < 24; i++) {
    const on = Math.sin(t * (2 + (i % 4)) + i * 1.8) > 0.1;
    P(ctx, 12 + i * 19, 136, 4, 2, on ? (i % 3 ? '#39e6a3' : '#ffd778') : '#27314a');
  }
}

function layoutLattice() { return { x0: 24, x1: 420, desks: [[120, 188], [300, 184]] }; }
function drawLattice(ctx, t, s, sel, runProg) {
  sceneCommon(ctx, '#010107', '#0a0c18', '#1e2333', '#1a1f2e');
  P(ctx, 0, 0, W, 132, '#000005');
  // a galaxy, far off — the lattice's next meal
  for (let i = 0; i < 90; i++) {
    const fr = i / 90, arm = (i % 2) * Math.PI;
    const a = arm + fr * 5 + t * 0.01;
    const rr = 26 * Math.pow(fr, 0.7);
    P(ctx, 70 + Math.cos(a) * rr * 1.2, 40 + Math.sin(a) * rr * 0.55, 1, 1,
      `hsla(${220 + fr * 60},70%,${75 - fr * 30}%,${(1 - fr) * 0.8})`);
  }
  for (let i = 0; i < 120; i++) {
    const tw = 0.4 + 0.6 * Math.sin(t * (0.4 + hash(i, 5) * 1.6) + i);
    P(ctx, hash(i, 1) * W, hash(i, 2) * 126, 1, 1, `rgba(200,210,245,${0.12 + 0.45 * tw})`);
  }
  // the lattice itself: a luminous grid warping toward the black hole
  const bx = 350, by = 58;
  ctx.strokeStyle = 'rgba(167,139,250,.22)'; ctx.lineWidth = 0.6;
  for (let gx = 0; gx <= W; gx += 40) {
    ctx.beginPath();
    for (let gy = 0; gy <= 130; gy += 6) {
      const dx = gx - bx, dy = gy - by;
      const d = Math.max(18, Math.hypot(dx, dy));
      const pull = 360 / (d * d);
      const px = gx - dx * pull, py = gy - dy * pull;
      gy === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  for (let gy = 0; gy <= 130; gy += 26) {
    ctx.beginPath();
    for (let gx = 0; gx <= W; gx += 8) {
      const dx = gx - bx, dy = gy - by;
      const d = Math.max(18, Math.hypot(dx, dy));
      const pull = 360 / (d * d);
      const px = gx - dx * pull, py = gy - dy * pull;
      gx === 0 ? ctx.moveTo(px, py) : ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  // node lights on the lattice intersections
  for (let i = 0; i < 26; i++) {
    const on = Math.sin(t * (1.5 + (i % 5) * 0.7) + i * 2.4) > 0.4;
    if (on) P(ctx, 20 + hash(i, 31) * (W - 40), 8 + hash(i, 32) * 116, 1, 1, '#d8b4fe');
  }
  // the black hole battery: shadow, photon ring, accretion disk (Penrose engine)
  const spin = t * 1.6;
  ctx.strokeStyle = 'rgba(255,190,110,.85)'; ctx.lineWidth = 2.2;
  ctx.beginPath(); ctx.ellipse(bx, by, 26, 7, -0.3, spin % (Math.PI * 2), (spin % (Math.PI * 2)) + Math.PI * 1.55); ctx.stroke();
  const bhGlow = ctx.createRadialGradient(bx, by, 8, bx, by, 30);
  bhGlow.addColorStop(0, 'rgba(255,200,130,.5)');
  bhGlow.addColorStop(1, 'rgba(255,150,80,0)');
  ctx.fillStyle = bhGlow; ctx.fillRect(bx - 30, by - 30, 60, 60);
  ctx.fillStyle = '#000';
  ctx.beginPath(); ctx.arc(bx, by, 9, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(255,236,200,.9)'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.arc(bx, by, 10.5, 0, Math.PI * 2); ctx.stroke();
  // singularity progress: the lattice pulses harder as cap → 300
  const pr = clamp((s.bestCap - 200) / 100, 0, 1);
  if (pr > 0) {
    ctx.fillStyle = `rgba(216,180,254,${0.04 + 0.07 * pr * (0.5 + 0.5 * Math.sin(t * (2 + pr * 6)))})`;
    ctx.fillRect(0, 0, W, 132);
  }
  // deck rail + consoles
  P(ctx, 0, 132, W, 3, '#2b3142');
  for (let i = 0; i < 24; i++) {
    const on = Math.sin(t * (2 + (i % 4)) + i * 2.1) > 0.15;
    P(ctx, 12 + i * 19, 136, 4, 2, on ? (i % 3 ? '#a78bfa' : '#22d3ee') : '#1d2433');
  }
  if (s.singularity) {
    ctx.fillStyle = `rgba(216,180,254,${0.05 + Math.sin(t * 0.8) * 0.03})`;
    ctx.fillRect(0, 0, W, H);
  }
}

const SCENES = [
  { draw: drawGarage, layout: layoutGarage },
  { draw: drawOffice, layout: layoutOffice },
  { draw: drawColo, layout: layoutColo },
  { draw: drawDc, layout: layoutDc },
  { draw: drawFactory, layout: layoutFactory },
  { draw: drawOrbital, layout: layoutOrbital },
  { draw: drawDyson, layout: layoutDyson },
  { draw: drawLattice, layout: layoutLattice },
];

// ── confetti ──────────────────────────────────────────────────────
export function celebrate(n = 50) {
  for (let i = 0; i < n; i++) {
    confetti.push({
      x: Math.random() * W, y: -6 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 14, vy: 18 + Math.random() * 26,
      c: pick(['#39e6a3', '#22d3ee', '#fbbf24', '#f472b6', '#a78bfa'], Math.random()),
      life: 3 + Math.random() * 2,
    });
  }
  for (const c of chars) if (Math.random() < Math.min(0.6, n / 80)) say(c, '🎉', 2.2);
}

// ── main loop ─────────────────────────────────────────────────────
let canvas = null, raf = 0;
const buf = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null;

export function initScene(el) {
  canvas = el;
  if (!canvas || !buf || !buf.getContext) return;
  buf.width = W; buf.height = H;
  canvas.addEventListener('pointerdown', onPointerDown);
  canvas.addEventListener('pointermove', onPointerMove);
  canvas.addEventListener('pointerup', onPointerUp);
  canvas.addEventListener('pointercancel', onPointerUp);
  if (!raf) { lastFrame = performance.now() / 1000; raf = requestAnimationFrame(frame); }
}

// the player-rearranged layout: desk overrides live in the save
function effectiveLayout(s, sel, phase) {
  const lay = SCENES[phase].layout(s, sel);
  const ov = s.deskPos && s.deskPos[phase];
  if (ov && lay.desks) {
    lay.desks = lay.desks.map((d, i) => ov[i] ? [ov[i][0], ov[i][1]] : d);
  }
  return lay;
}

// ── drag & drop: pick up the people, the cat, the desks ──────────
let drag = null;   // { kind: 'char'|'cat'|'desk', ref?, idx?, moved, t0 }

function evtPos(e) {
  const r = canvas.getBoundingClientRect();
  return { mx: (e.clientX - r.left) / r.width * W, my: (e.clientY - r.top) / r.height * H };
}

function onPointerDown(e) {
  const { mx, my } = evtPos(e);
  const s = game.s, sel = game.sel;
  if (!s || !sel) return;
  for (let i = chars.length - 1; i >= 0; i--) {
    const c = chars[i];
    if (Math.abs(mx - c.x) < 8 && my > c.y - 24 && my < c.y + 2) {
      drag = { kind: 'char', ref: c, moved: 0, t0: Date.now(), x0: mx, y0: my };
      c.state = 'held'; c.deskSeat = -1;
      break;
    }
  }
  const phase = clamp(s.phase, 0, SCENES.length - 1);
  if (!drag && cat && phase <= 1 && Math.abs(mx - cat.x) < 9 && Math.abs(my - cat.y + 4) < 8) {
    drag = { kind: 'cat', ref: cat, moved: 0, t0: Date.now(), x0: mx, y0: my };
    cat.state = 'held';
  }
  if (!drag) {
    const desks = effectiveLayout(s, sel, phase).desks || [];
    for (let i = 0; i < desks.length; i++) {
      if (Math.abs(mx - desks[i][0]) < 12 && Math.abs(my - (desks[i][1] - 12)) < 14) {
        drag = { kind: 'desk', idx: i, moved: 0, t0: Date.now(), x0: mx, y0: my, pos: [desks[i][0], desks[i][1]] };
        break;
      }
    }
  }
  if (drag) { try { canvas.setPointerCapture(e.pointerId); } catch (err) { /* older browsers */ } }
}

function onPointerMove(e) {
  if (!drag) return;
  const { mx, my } = evtPos(e);
  drag.moved = Math.max(drag.moved, Math.hypot(mx - drag.x0, my - drag.y0));
  if (drag.kind === 'desk') {
    drag.pos = [clamp(mx, 22, W - 22), clamp(my + 12, FLOOR_Y + 14, FLOOR_B - 2)];
    const s = game.s;
    const phase = clamp(s.phase, 0, SCENES.length - 1);
    const desks = SCENES[phase].layout(s, game.sel).desks || [];
    if (!s.deskPos) s.deskPos = {};
    if (!s.deskPos[phase]) s.deskPos[phase] = desks.map(d => [d[0], d[1]]);
    s.deskPos[phase][drag.idx] = drag.pos;
  } else {
    drag.ref.x = clamp(mx, 14, W - 14);
    drag.ref.y = clamp(my + 10, 30, FLOOR_B - 2);   // lift them right off the floor
  }
}

function onPointerUp() {
  if (!drag) return;
  const quick = drag.moved < 5 && Date.now() - drag.t0 < 400;   // displacement in scene px
  const s = game.s;
  if (drag.kind === 'char') {
    const c = drag.ref;
    c.y = clamp(c.y, FLOOR_Y + 10, FLOOR_B - 2);    // back onto the floor
    if (quick) {                                     // it was just a poke
      c.state = 'idle'; c.think = 2 + Math.random() * 4;
      say(c, drawQuip(roleQuips(c.role)));
    } else {
      // dropped on a desk? straight to work
      const phase = clamp(s.phase, 0, SCENES.length - 1);
      const desks = effectiveLayout(s, game.sel, phase).desks || [];
      const seat = desks.findIndex(d => Math.abs(c.x - d[0]) < 10 && Math.abs(c.y - d[1]) < 10);
      if (seat >= 0 && c.role !== 'ops') {
        c.deskSeat = seat; c.x = desks[seat][0]; c.y = desks[seat][1];
        c.state = 'work'; c.think = 6 + Math.random() * 6;
        say(c, drawQuip(DESK_DROP_QUIPS));
      } else {
        c.state = 'idle'; c.think = 2 + Math.random() * 4;
        say(c, drawQuip(DROP_QUIPS));
      }
    }
  } else if (drag.kind === 'cat') {
    cat.y = clamp(cat.y, FLOOR_Y + 8, FLOOR_B - 2);
    cat.tx = cat.x; cat.state = 'sit';
    say(cat, quick ? drawQuip(QUIPS.cat) : drawQuip(CAT_DROP_QUIPS), 2.4);
  }
  drag = null;
}

function frame() {
  raf = 0;
  if (!canvas || !canvas.isConnected) { canvas = null; return; }   // tab switched away
  const s = game.s, sel = game.sel;
  if (!s || !sel) { raf = requestAnimationFrame(frame); return; }

  const t = performance.now() / 1000;
  let dt = Math.min(0.1, t - lastFrame); lastFrame = t;

  const phase = clamp(s.phase, 0, SCENES.length - 1);
  const scene = SCENES[phase];
  const layout = effectiveLayout(s, sel, phase);
  const runProg = s.runs.length ? s.runs[0].physDone / s.runs[0].physNeed : -1;

  syncPopulation(s);
  for (const c of chars) thinkChar(c, dt, t, layout);
  // cat lives in the garage & office only
  if (cat && phase <= 1 && cat.state !== 'held') {
    if (cat.state === 'walk') {
      const dx = cat.tx - cat.x;
      if (Math.abs(dx) < 2) cat.state = 'sit';
      else { cat.x += Math.sign(dx) * 22 * dt; cat.dir = Math.sign(dx); }
    } else if (Math.random() < dt / 14) { cat.tx = 60 + Math.random() * 280; cat.state = 'walk'; }
    if (cat.speech && t > cat.speech.until) cat.speech = null;
  }

  const ctx = buf.getContext('2d');
  ctx.clearRect(0, 0, W, H);
  scene.draw(ctx, t, s, sel, runProg);
  // desks come from the layout so the player can rearrange them
  for (const [dx2, dy2] of layout.desks || []) drawDesk(ctx, dx2, dy2 - 4, t, runProg);
  if (s.buffs.some(b => b.id === 'fireCleanup')) drawFireFx(ctx, ...FIRE_POS[phase], t);

  // draw entities back-to-front; whoever the player is carrying rides on top
  const heldChar = drag && drag.kind === 'char' ? drag.ref : null;
  const ents = chars.filter(c => c !== heldChar);
  ents.sort((a, b) => a.y - b.y);
  for (const c of ents) drawPerson(ctx, c, t);
  if (cat && phase <= 1) drawCat(ctx, cat, t);
  if (heldChar) drawPerson(ctx, heldChar, t);

  // confetti
  for (let i = confetti.length - 1; i >= 0; i--) {
    const f = confetti[i];
    f.x += f.vx * dt; f.y += f.vy * dt; f.life -= dt;
    if (f.life <= 0 || f.y > H) { confetti.splice(i, 1); continue; }
    P(ctx, f.x, f.y, 2, 2, f.c);
  }

  // blit, pixel-crisp, then overlay text at native resolution
  const dw = canvas.clientWidth || 600;
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  const cw = Math.max(64, Math.round(dw * dpr)), ch = Math.round(cw * H / W);
  if (canvas.width !== cw || canvas.height !== ch) { canvas.width = cw; canvas.height = ch; }
  const out = canvas.getContext('2d');
  out.imageSmoothingEnabled = false;
  out.clearRect(0, 0, cw, ch);
  out.drawImage(buf, 0, 0, cw, ch);

  const k = cw / W;
  // status chip
  out.font = `${Math.max(9, 5 * k)}px Consolas, monospace`;
  const chips = [];
  chips.push(`${fmtNum(sel.gpuCount)} GPU${sel.gpuCount === 1 ? '' : 's'}`);
  if (s.runs.length) chips.push(`▶ training ${s.runs[0].name} ${(runProg * 100).toFixed(0)}%`);
  if (sel.revenue > 0) chips.push(`$${fmtNum(sel.revenue * 3600)}/h`);
  const chipTxt = chips.join('  ·  ');
  out.fillStyle = 'rgba(8,10,16,.55)';
  out.fillRect(6 * k, 3 * k, out.measureText(chipTxt).width + 8 * k, 9 * k);
  out.fillStyle = '#8be8c4';
  out.fillText(chipTxt, 10 * k, 9.6 * k);

  // speech bubbles
  const bubbles = [...chars, ...(cat && phase <= 1 ? [cat] : [])].filter(c => c.speech);
  out.font = `${Math.max(9, 4.6 * k)}px 'Segoe UI', sans-serif`;
  for (const c of bubbles) {
    const txt = c.speech.text;
    const tw = out.measureText(txt).width;
    const bx = clamp(c.x * k - tw / 2 - 5 * k, 2, cw - tw - 12 * k);
    const by = clamp((c.y - 30) * k, 10 * k, ch - 12 * k);
    out.fillStyle = 'rgba(244,247,252,.94)';
    out.beginPath();
    out.roundRect(bx, by - 8 * k, tw + 10 * k, 10.5 * k, 3 * k);
    out.fill();
    out.fillStyle = '#1a2130';
    out.fillText(txt, bx + 5 * k, by);
  }

  raf = requestAnimationFrame(frame);
}
