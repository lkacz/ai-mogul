// Living pixel-art scene: the lab interior, rendered procedurally on canvas.
// Reflects real game state (racks = GPUs, characters = staff, monitors = runs)
// and lets the player poke the inhabitants.

import { game } from './ui.js';
import { MARIO_QUOTES } from '../core/data.js';
import { fmtNum, clamp } from '../core/util.js';

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
  ],
  engineer: [
    'I fused the kernels. All of them.',
    'MFU is up 2%! I am unstoppable.',
    'Rebooting node 7. Again.',
    'It\'s not a memory leak, it\'s a memory feature.',
    'NCCL timeout. NCCL timeout. NCC—',
    'The cluster speaks to me. It says "buy more".',
  ],
  ops: [
    'Rack 12 is making the noise again.',
    'PUE is looking spicy today.',
    'Who unplugged the— oh no.',
    'Hot aisle\'s at sauna spec. Towels are extra.',
    'I named the chillers. Don\'t judge me.',
  ],
  sales: [
    'Just closed a seven-figure logo!',
    'Customer asked if the model dreams. Billed them for the answer.',
    'The demo was perfect until it started rhyming.',
    'Pipeline\'s looking THICC this quarter.',
    'I sold an SLA on vibes.',
  ],
  cat: ['mrrp.', 'purrs at 3.2 kW.', '…', 'meow (this means "scale").'],
};

const ROLES = {
  mario:      { top: '#46555f', pants: '#2c333d', hair: '#241a12', skin: '#e6b486', glasses: true },
  researcher: { top: '#e8ecf2', pants: '#5a6a85', hair: '#5b4630', skin: '#e6b486' },
  engineer:   { top: '#3a6ea5', pants: '#33394a', hair: '#1e1a18', skin: '#c98e62' },
  ops:        { top: '#e0903a', pants: '#3d4250', hair: '#3c2f24', skin: '#8d5d3f' },
  sales:      { top: '#6d5a9e', pants: '#2f2a3d', hair: '#84561e', skin: '#e6b486' },
};

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
  if (!c.speech && Math.random() < dt / 26) say(c, pick(QUIPS[c.role], Math.random()));
  if (c.speech && t > c.speech.until) c.speech = null;
}

// ── drawing: people ───────────────────────────────────────────────
function drawPerson(ctx, c, t) {
  const r = ROLES[c.role];
  const x = c.x | 0, fy = c.y | 0;       // fy = feet
  const working = c.state === 'work';
  const walking = c.state === 'walk';
  const bob = walking ? Math.round(Math.sin(c.walkT * 2) * 1) : 0;
  const legA = walking ? Math.round(Math.sin(c.walkT) * 2) : 0;
  const y0 = fy - 20 + bob;               // top of head

  // shadow
  P(ctx, x - 4, fy - 1, 9, 2, 'rgba(0,0,0,.30)');
  // legs
  P(ctx, x - 3 + legA, fy - 6, 2, 6, r.pants);
  P(ctx, x + 1 - legA, fy - 6, 2, 6, r.pants);
  // torso (lab coat is longer)
  const coatLen = c.role === 'researcher' ? 10 : 8;
  P(ctx, x - 3, y0 + 6, 7, coatLen, r.top);
  if (c.role === 'ops') P(ctx, x - 3, y0 + 7, 7, 2, '#f7c948'); // hi-vis stripe
  if (c.role === 'sales') P(ctx, x - 1, y0 + 7, 1, 4, '#d8315b'); // tie
  // arms: swing when walking, type when working
  const armA = working ? Math.round(Math.sin(t * 14 + c.seed) * 1) : walking ? legA : 0;
  P(ctx, x - 4, y0 + 7 + (working ? 2 : 0), 1, 5 + armA, r.top);
  P(ctx, x + 4, y0 + 7 + (working ? 2 : 0), 1, 5 - armA, r.top);
  // head
  P(ctx, x - 2, y0, 5, 6, r.skin);
  // hair (Mario gets the famous curls)
  if (c.role === 'mario') {
    P(ctx, x - 3, y0 - 2, 7, 3, r.hair);
    P(ctx, x - 3, y0 + 1, 1, 2, r.hair);
    P(ctx, x + 3, y0 + 1, 1, 2, r.hair);
    P(ctx, x - 2, y0 - 3, 2, 1, r.hair); P(ctx, x + 1, y0 - 3, 2, 1, r.hair); // curl bumps
  } else {
    P(ctx, x - 2, y0 - 1, 5, 2, r.hair);
  }
  if (r.glasses) P(ctx, x - 2, y0 + 2, 5, 1, '#1c2430');
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
  drawDesk(ctx, 120, 176 - 4, t, runProg);
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
  drawDesk(ctx, 70, 168, t, runProg); drawDesk(ctx, 130, 180, t, runProg); drawDesk(ctx, 190, 168, t, runProg);
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
  drawDesk(ctx, 400, 182, t, runProg);                  // crash cart
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
  drawDesk(ctx, 60, 184, t, runProg);
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
  drawDesk(ctx, 240, 184, t, runProg);
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
  drawDesk(ctx, 110, 180, t, runProg);
  drawDesk(ctx, 350, 184, t, runProg);
  if (s.singularity) {  // afterglow of the new universe
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
];

// ── confetti ──────────────────────────────────────────────────────
export function celebrate() {
  for (let i = 0; i < 50; i++) {
    confetti.push({
      x: Math.random() * W, y: -6 - Math.random() * 30,
      vx: (Math.random() - 0.5) * 14, vy: 18 + Math.random() * 26,
      c: pick(['#39e6a3', '#22d3ee', '#fbbf24', '#f472b6', '#a78bfa'], Math.random()),
      life: 3 + Math.random() * 2,
    });
  }
  for (const c of chars) if (Math.random() < 0.6) say(c, '🎉', 2.2);
}

// ── main loop ─────────────────────────────────────────────────────
let canvas = null, raf = 0;
const buf = (typeof document !== 'undefined' && document.createElement) ? document.createElement('canvas') : null;

export function initScene(el) {
  canvas = el;
  if (!canvas || !buf || !buf.getContext) return;
  buf.width = W; buf.height = H;
  canvas.addEventListener('click', onClick);
  if (!raf) { lastFrame = performance.now() / 1000; raf = requestAnimationFrame(frame); }
}

function onClick(e) {
  const r = canvas.getBoundingClientRect();
  const mx = (e.clientX - r.left) / r.width * W;
  const my = (e.clientY - r.top) / r.height * H;
  for (const c of chars) {
    if (Math.abs(mx - c.x) < 8 && my > c.y - 24 && my < c.y + 2) {
      say(c, pick(QUIPS[c.role], Math.random()));
      return;
    }
  }
  if (cat && Math.abs(mx - cat.x) < 9 && Math.abs(my - cat.y + 4) < 8) {
    say(cat, pick(QUIPS.cat, Math.random()), 2.2);
    cat.tx = clamp(mx + (Math.random() - 0.5) * 120, 30, W - 30);
    cat.state = 'walk';
  }
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
  const layout = scene.layout(s, sel);
  const runProg = s.runs.length ? s.runs[0].physDone / s.runs[0].physNeed : -1;

  syncPopulation(s);
  for (const c of chars) thinkChar(c, dt, t, layout);
  // cat lives in the garage & office only
  if (cat && phase <= 1) {
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

  // draw entities back-to-front
  const ents = [...chars];
  ents.sort((a, b) => a.y - b.y);
  for (const c of ents) drawPerson(ctx, c, t);
  if (cat && phase <= 1) drawCat(ctx, cat, t);

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
