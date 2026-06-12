// Live architecture visualization for the Training tab.
// Science-based: a dense transformer follows N ≈ 12·L·d² with the canonical
// aspect d ≈ 128·L (plug in GPT-3: 96 layers × 12,288 width × 96 heads — exact).
// Researched advancements change the drawing the way they changed the field:
// MoE → sparse expert grids with top-2 routing · multimodal → fused encoder
// streams · reasoning → an output loop (think before answering) · pipeline →
// stages · world models → an inner simulator · photonic/quantum substrates
// tint the compute. Past ~10¹⁵ params no single stack makes sense — it becomes
// a society of trillion-parameter expert modules (the real "mixture of a
// million experts" research direction).

import { clamp, fmtNum } from '../core/util.js';

const W = 560, H = 250;

// closest real-world counterpart per scale band (year anchors, no brand names)
const CLASSES = [
  [0, 'a tiny toy transformer (weekend-project territory)'],
  [3e7, '2019-era small text model-class (~124M)'],
  [7e8, '2019-era XL-class (~1.5B)'],
  [6e9, 'mid-size 13B-class'],
  [8e10, '2020-frontier 175B / dense-class'],
  [5e11, 'frontier sparse-MoE-class'],
  [1e13, 'super-frontier system'],
  [1e15, 'planetary-scale model society'],
  [5e17, 'stellar-scale mind'],
  [5e19, 'matrioshka-scale mind'],
];

// Architecture descriptor from parameter count + researched techniques.
function describe(N, s) {
  const has = (id) => s.research.includes(id);
  // dense backbone: N = 12·L·d², d = 128·L → L = ∛(N/196608); depth saturates
  // in practice, so past L≈128 the extra params go to width / experts
  let L = Math.round(Math.cbrt(N / 196608));
  L = clamp(L, 2, 128);
  const d = Math.round(Math.sqrt(N / (12 * L)) / 64) * 64 || 64;
  const heads = Math.max(2, Math.round(d / 128));
  const moe = has('moe') && N >= 5e10;
  const experts = moe ? clamp(Math.pow(2, Math.round(Math.log2(N / 1.5e10))), 8, 256) : 1;
  const system = N >= 1e15;                       // society of expert modules
  const modules = system ? N / 1e12 : 1;          // ~1T params each
  const stages = has('pipeline') && L >= 48 ? clamp(Math.round(L / 48), 1, 4) : 1;
  let substrate = 'silicon';
  if (has('lloydCore')) substrate = 'lloyd';
  else if (has('quantumAI')) substrate = 'quantum';
  else if (has('optical')) substrate = 'photonic';
  const cls = CLASSES.reduce((acc, [min, label]) => N >= min ? label : acc, CLASSES[0][1]);
  return {
    N, L, d, heads, moe, experts, system, modules, stages, substrate, cls,
    multimodal: has('multimodalR'), reasoning: has('reasoning'),
    world: has('worldmodel'), recursion: has('recursion') || has('omega'),
  };
}

function label(a) {
  if (a.system) {
    return `society of ${fmtNum(a.modules)} expert modules (~1T params each) · learned router · ` +
      `${a.substrate === 'silicon' ? 'silicon' : a.substrate === 'photonic' ? 'photonic substrate' : a.substrate === 'quantum' ? 'hybrid quantum substrate' : 'Lloyd-limit substrate'} · ${a.cls}`;
  }
  let txt = `≈ ${a.L} layers · d_model ${fmtNum(a.d)} · ${a.heads} attention heads`;
  if (a.moe) txt += ` · ${a.experts} experts, top-2 routing (~${fmtNum(a.N * 2 / a.experts)} active)`;
  if (a.stages > 1) txt += ` · ${a.stages} pipeline stages`;
  if (a.multimodal) txt += ' · multimodal';
  if (a.reasoning) txt += ' · reasoning loop';
  return txt + ` · ${a.cls}`;
}

const SUBSTRATE = {
  silicon: { pulse: '#34d399', link: 'rgba(52,211,153,', accent: '#22d3ee' },
  photonic: { pulse: '#fde68a', link: 'rgba(253,230,138,', accent: '#fff7e0' },
  quantum: { pulse: '#22d3ee', link: 'rgba(167,139,250,', accent: '#f0abfc' },
  lloyd: { pulse: '#e9d5ff', link: 'rgba(233,213,255,', accent: '#ffffff' },
};

const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

let cv = null, raf = 0, arch = null;

export function setModelViz(N, s) {
  arch = describe(N, s);
  const el = document.getElementById('mv-label');
  if (el) el.textContent = label(arch);
}

export function initModelViz(el) {
  cv = el;
  if (!cv || !cv.getContext) return;
  if (!raf) raf = requestAnimationFrame(frame);
}

function frame() {
  raf = 0;
  if (!cv || !cv.isConnected) { cv = null; return; }
  const ctx = cv.getContext('2d');
  const t = performance.now() / 1000;
  ctx.clearRect(0, 0, W, H);
  ctx.fillStyle = '#0a0d14';
  ctx.fillRect(0, 0, W, H);
  if (arch) (arch.system ? drawSystem : drawStack)(ctx, t, arch);
  raf = requestAnimationFrame(frame);
}

const P = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const TOKEN_COLORS = ['#34d399', '#22d3ee', '#fbbf24', '#f472b6', '#a78bfa', '#f87171'];

// ── a single (possibly sparse, staged, multimodal) transformer ──────
function drawStack(ctx, t, a) {
  const sub = SUBSTRATE[a.substrate];
  const vis = Math.min(a.L, 11);                       // slabs drawn individually
  const slabW = clamp(120 + Math.log10(a.d) * 38, 150, 320);
  const cx = W / 2;
  const stackBot = H - 44, stackTop = 36;
  const slabH = Math.min(13, (stackBot - stackTop) / vis - 3);
  const step = (stackBot - stackTop) / vis;
  const pulse = (t * 0.55) % 1.3;                      // forward pass sweep (with pause)
  const activeI = Math.floor(pulse / 1.3 * (vis + 2)); // which slab is computing

  // depth fog: the layers we don't draw individually
  if (a.L > vis) {
    for (let g = 3; g >= 1; g--) {
      ctx.strokeStyle = `rgba(70,85,110,${0.14 * g})`;
      ctx.strokeRect(cx - slabW / 2 + g * 5, stackTop - g * 5, slabW, stackBot - stackTop);
    }
    ctx.fillStyle = '#5d6478';
    ctx.font = '10px Consolas, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`× ${a.L} layers`, cx + slabW / 2 + 10, stackTop + 12);
  }
  // recursion: the model holds a sketch of its own redesign
  if (a.recursion) {
    ctx.save();
    ctx.translate(cx, (stackTop + stackBot) / 2);
    ctx.rotate(Math.sin(t * 0.7) * 0.04);
    ctx.strokeStyle = `rgba(216,180,254,${0.18 + 0.1 * Math.sin(t * 2)})`;
    ctx.strokeRect(-slabW / 2 - 8, -(stackBot - stackTop) / 2 - 6, slabW + 16, stackBot - stackTop + 12);
    ctx.restore();
  }

  // residual stream: the spine every layer reads from and writes to
  ctx.strokeStyle = sub.link + '0.35)';
  ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(cx, stackBot + 14); ctx.lineTo(cx, stackTop - 8); ctx.stroke();
  ctx.lineWidth = 1;

  // input: token stream (and other modalities, if the model learned to see)
  const tokY = stackBot + 22;
  const flow = (t * 24) % 16;
  for (let i = 0; i < 9; i++) {
    const x = cx - 72 + i * 16 + flow - 16;
    if (x < cx - 80 || x > cx + 72) continue;
    P(ctx, x, tokY, 9, 9, TOKEN_COLORS[(i + Math.floor(t * 1.5)) % TOKEN_COLORS.length]);
  }
  ctx.fillStyle = '#5d6478'; ctx.font = '9px Consolas, monospace'; ctx.textAlign = 'center';
  ctx.fillText('tokens', cx, tokY + 20);
  if (a.multimodal) {
    // vision patches
    for (let i = 0; i < 9; i++) {
      P(ctx, cx - 160 + (i % 3) * 7, tokY - 2 + ((i / 3) | 0) * 7,
        6, 6, `hsl(${200 + hash(i, 1) * 80},60%,${35 + hash(i, (t * 2) | 0) * 30}%)`);
    }
    ctx.fillText('pixels', cx - 152, tokY + 26);
    // audio waveform
    ctx.strokeStyle = '#f472b6';
    ctx.beginPath();
    for (let i = 0; i < 18; i++) {
      const x = cx + 110 + i * 3;
      const y = tokY + 8 + Math.sin(t * 6 + i * 0.9) * 6 * (0.4 + hash(i) * 0.6);
      i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
    ctx.fillStyle = '#5d6478';
    ctx.fillText('audio', cx + 136, tokY + 26);
    // encoder funnels into the residual stream
    ctx.strokeStyle = sub.link + '0.3)';
    ctx.beginPath(); ctx.moveTo(cx - 150, tokY + 2); ctx.quadraticCurveTo(cx - 60, tokY + 16, cx - 6, stackBot + 6); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(cx + 136, tokY + 6); ctx.quadraticCurveTo(cx + 60, tokY + 16, cx + 6, stackBot + 6); ctx.stroke();
  }

  // the layer slabs
  for (let i = 0; i < vis; i++) {
    const y = stackBot - (i + 1) * step + (step - slabH) / 2;
    const active = i === activeI;
    const x0 = cx - slabW / 2;
    P(ctx, x0, y, slabW, slabH, active ? '#1c2a3a' : '#141a26');
    ctx.strokeStyle = active ? sub.link + '0.9)' : 'rgba(60,75,100,.5)';
    ctx.strokeRect(x0 + 0.5, y + 0.5, slabW, slabH);

    if (a.moe) {
      // sparse experts: a router lights two per token (top-2 routing)
      const cells = Math.min(16, a.experts);
      const cw = (slabW - 34) / cells;
      const e1 = Math.floor(hash(i, (t * 2.4) | 0) * cells);
      const e2 = (e1 + 1 + Math.floor(hash(i + 7, (t * 2.4) | 0) * (cells - 1))) % cells;
      for (let e = 0; e < cells; e++) {
        const lit = active && (e === e1 || e === e2);
        P(ctx, x0 + 26 + e * cw + 1, y + 2, cw - 2, slabH - 4,
          lit ? sub.pulse : 'rgba(55,70,95,.55)');
      }
      P(ctx, x0 + 6, y + 2, 14, slabH - 4, active ? sub.accent : '#2a3548'); // router
      if (active) {
        ctx.strokeStyle = sub.link + '0.8)';
        for (const e of [e1, e2]) {
          ctx.beginPath();
          ctx.moveTo(x0 + 20, y + slabH / 2);
          ctx.lineTo(x0 + 26 + e * cw + cw / 2, y + slabH / 2);
          ctx.stroke();
        }
      }
    } else {
      // dense layer: attention heads | MLP
      const hn = Math.min(a.heads, 24);
      const hw = (slabW * 0.55 - 8) / hn;
      for (let h2 = 0; h2 < hn; h2++) {
        const on = active && hash(h2, (t * 6) | 0) > 0.3;
        P(ctx, x0 + 6 + h2 * hw, y + 3, Math.max(1.5, hw - 1.5), slabH - 6,
          on ? sub.pulse : 'rgba(58,74,100,.7)');
      }
      P(ctx, x0 + slabW * 0.55 + 6, y + 3, slabW * 0.45 - 12, slabH - 6,
        active ? sub.link + '0.5)' : 'rgba(45,58,80,.5)');           // the MLP
    }
    // attention arcs under the active slab: tokens attending to tokens
    if (active && !a.moe) {
      ctx.strokeStyle = sub.link + '0.45)';
      for (let k = 0; k < 4; k++) {
        const p1 = hash(k, (t * 3) | 0) * 120 - 60;
        const p2 = hash(k + 9, (t * 3) | 0) * 120 - 60;
        ctx.beginPath();
        ctx.moveTo(cx + p1, y + slabH + 2);
        ctx.quadraticCurveTo(cx + (p1 + p2) / 2, y + slabH + 14 + Math.abs(p1 - p2) / 7, cx + p2, y + slabH + 2);
        ctx.stroke();
      }
    }
  }
  // pipeline stage cuts
  for (let st = 1; st < a.stages; st++) {
    const y = stackBot - (stackBot - stackTop) * st / a.stages;
    ctx.setLineDash([5, 4]);
    ctx.strokeStyle = 'rgba(251,191,36,.4)';
    ctx.beginPath(); ctx.moveTo(cx - slabW / 2 - 14, y); ctx.lineTo(cx + slabW / 2 + 14, y); ctx.stroke();
    ctx.setLineDash([]);
  }
  // world model: an inner simulator the net consults
  if (a.world) {
    const wx = cx + slabW / 2 + 38, wy = (stackTop + stackBot) / 2;
    ctx.strokeStyle = 'rgba(34,211,238,.6)';
    ctx.beginPath(); ctx.arc(wx, wy, 11, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(wx, wy, 16, 5, t * 0.6, 0, Math.PI * 2); ctx.stroke();
    P(ctx, wx - 2, wy - 2, 4, 4, '#22d3ee');
    ctx.strokeStyle = 'rgba(34,211,238,.25)';
    ctx.beginPath(); ctx.moveTo(cx + slabW / 2, wy); ctx.lineTo(wx - 17, wy); ctx.stroke();
    ctx.fillStyle = '#5d6478'; ctx.font = '9px Consolas, monospace';
    ctx.fillText('world model', wx, wy + 30);
  }
  // output distribution: next-token softmax
  const outY = stackTop - 12;
  for (let i = 0; i < 13; i++) {
    const hgt = 3 + hash(i, (t * 2.2) | 0) * 9;
    const best = hash(i, (t * 2.2) | 0) > 0.86;
    P(ctx, cx - 39 + i * 6, outY - hgt, 4, hgt, best ? '#fbbf24' : sub.link + '0.7)');
  }
  ctx.fillStyle = '#5d6478'; ctx.font = '9px Consolas, monospace'; ctx.textAlign = 'center';
  ctx.fillText('p(next token)', cx, outY - 18);
  // reasoning: the output loops back to be thought about again
  if (a.reasoning) {
    ctx.strokeStyle = 'rgba(244,114,182,.5)';
    ctx.beginPath();
    ctx.moveTo(cx + 45, outY - 6);
    ctx.bezierCurveTo(cx + slabW / 2 + 58, outY, cx + slabW / 2 + 58, stackBot + 10, cx + 60, tokY + 4);
    ctx.stroke();
    const lp = (t * 0.4) % 1;
    const lx = bez(cx + 45, cx + slabW / 2 + 58, cx + slabW / 2 + 58, cx + 60, lp);
    const ly = bez(outY - 6, outY, stackBot + 10, tokY + 4, lp);
    P(ctx, lx - 2, ly - 2, 4, 4, '#f472b6');
    ctx.fillStyle = 'rgba(244,114,182,.7)'; ctx.textAlign = 'left';
    ctx.fillText('chain of thought', cx + slabW / 2 + 8, (stackTop + stackBot) / 2 + 44);
  }
  // quantum substrate: entangled sampling sparkles
  if (a.substrate === 'quantum' || a.substrate === 'lloyd') {
    for (let i = 0; i < 7; i++) {
      if (hash(i, (t * 4) | 0) > 0.5) continue;
      const x = cx + (hash(i, 3) - 0.5) * slabW * 1.2;
      const y = stackTop + hash(i, 4) * (stackBot - stackTop);
      P(ctx, x, y, 2, 2, sub.accent);
      P(ctx, x + 5, y - 4, 1, 1, sub.accent);
    }
  }
}

function bez(p0, p1, p2, p3, t) {
  const u = 1 - t;
  return u * u * u * p0 + 3 * u * u * t * p1 + 3 * u * t * t * p2 + t * t * t * p3;
}

// ── past 10¹⁵ params: a society of expert minds, routed, not stacked ─
function drawSystem(ctx, t, a) {
  const sub = SUBSTRATE[a.substrate];
  const n = clamp(5 + Math.floor(Math.log10(a.modules)) * 2, 5, 13);
  const cx = W / 2, cy = H / 2 + 6;
  // router core
  const pulse = 0.6 + 0.4 * Math.sin(t * 2.4);
  const g = ctx.createRadialGradient(cx, cy, 1, cx, cy, 34);
  g.addColorStop(0, `rgba(255,255,255,${0.8 * pulse})`);
  g.addColorStop(0.4, sub.link + '0.5)');
  g.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = g; ctx.fillRect(cx - 34, cy - 34, 68, 68);
  ctx.fillStyle = '#5d6478'; ctx.font = '9px Consolas, monospace'; ctx.textAlign = 'center';
  ctx.fillText('learned router', cx, cy + 46);
  // expert modules in orbit, each a tiny transformer stack
  const litA = Math.floor(hash(1, (t * 1.8) | 0) * n);
  const litB = (litA + 1 + Math.floor(hash(2, (t * 1.8) | 0) * (n - 1))) % n;
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + t * 0.05;
    const rx = 215, ry = 88;
    const x = cx + Math.cos(ang) * rx, y = cy + Math.sin(ang) * ry;
    const lit = i === litA || i === litB;
    // routing beams: top-2 expert modules answer this query
    ctx.strokeStyle = sub.link + (lit ? '0.8)' : '0.12)');
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(x, y); ctx.stroke();
    // mini stack
    for (let l = 0; l < 5; l++) {
      P(ctx, x - 16, y - 12 + l * 5, 32, 3.4, lit && l === Math.floor((t * 6) % 5) ? sub.pulse : lit ? '#22304a' : '#161d2b');
    }
    ctx.strokeStyle = lit ? sub.link + '0.9)' : 'rgba(60,75,100,.4)';
    ctx.strokeRect(x - 17.5, y - 13.5, 35, 27);
    if (a.recursion && lit) {
      ctx.strokeStyle = 'rgba(216,180,254,.4)';
      ctx.strokeRect(x - 20.5, y - 16.5, 41, 33);
    }
  }
  // a few queries flying through the router
  for (let q = 0; q < 4; q++) {
    const ph = (t * 0.5 + q * 0.25) % 1;
    const ang = hash(q, Math.floor(t * 0.5 + q * 0.25)) * Math.PI * 2;
    const x = cx + Math.cos(ang) * 215 * (1 - ph), y = cy + Math.sin(ang) * 88 * (1 - ph);
    P(ctx, x - 1.5, y - 1.5, 3, 3, TOKEN_COLORS[q]);
  }
  ctx.fillStyle = '#5d6478'; ctx.font = '10px Consolas, monospace';
  ctx.fillText(`${fmtNum(a.modules)} expert modules · ~1T params each · top-2 routed`, cx, H - 8);
}
