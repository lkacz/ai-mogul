// WORLD REPORT — the broadcast layer for future-impact news (core/impacts.js).
// Each story plays over a procedural pixel-art vignette: pure canvas, no
// assets, scene.js style. showImpact() builds the modal and starts a rAF
// loop that stops itself when the modal closes or the canvas is replaced.
//
// IMPACT_SCENES is exported for the smoke test, which renders every scene
// against a no-op 2d-context stub (same contract as designparts).

import { showModal, esc } from './ui.js';

const W = 640, H = 240;
const P = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
// deterministic per-frame "random": stable layouts, no flicker between frames
const R = (i) => { const x = Math.sin(i * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); };
const TAU = Math.PI * 2;
const lerp = (a, b, p) => a + (b - a) * p;
const ACCENT = { good: '#34d399', bad: '#f87171', mixed: '#fbbf24' };

function sky(ctx, top, bottom) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, top); g.addColorStop(1, bottom);
  ctx.fillStyle = g; ctx.fillRect(0, 0, W, H);
}
function stars(ctx, n, t, seed = 0, yMax = H) {
  for (let i = 0; i < n; i++) {
    const a = 0.25 + 0.75 * Math.abs(Math.sin(t * 1.7 + R(seed + i) * 9));
    P(ctx, R(seed + i * 3) * W, R(seed + i * 7) * yMax, R(seed + i * 11) > 0.85 ? 2 : 1, 1, `rgba(214,220,232,${a})`);
  }
}
function person(ctx, x, y, c, s = 1, seed = 0) {
  const skins = ['#e8c39e', '#c68f5e', '#8d5a3a', '#f0d3b3'];
  P(ctx, x + s, y, 3 * s, 3 * s, skins[(R(seed) * skins.length) | 0]);
  P(ctx, x, y + 3 * s, 5 * s, 5 * s, c);
  P(ctx, x + 0.5 * s, y + 8 * s, 1.6 * s, 3 * s, '#1c2230');
  P(ctx, x + 2.9 * s, y + 8 * s, 1.6 * s, 3 * s, '#1c2230');
}
function bot(ctx, x, y, eye, s = 1) {
  P(ctx, x, y, 6 * s, 4 * s, '#9aa6bb');          // head
  P(ctx, x + 1.4 * s, y + 1.2 * s, 1.4 * s, 1.4 * s, eye);
  P(ctx, x + 3.4 * s, y + 1.2 * s, 1.4 * s, 1.4 * s, eye);
  P(ctx, x + 0.6 * s, y + 4 * s, 4.8 * s, 6 * s, '#6e7a90');
  P(ctx, x + 2.2 * s, y + 5.5 * s, 1.6 * s, 1.6 * s, eye);  // chest light
}
function skyline(ctx, yBase, seed, body, win, t, litP = 0.5) {
  let x = -10;
  let i = 0;
  while (x < W + 20) {
    const bw = 18 + R(seed + i) * 30;
    const bh = 30 + R(seed + i * 13) * 80;
    P(ctx, x, yBase - bh, bw, bh, body);
    for (let wx = x + 3; wx < x + bw - 4; wx += 7) {
      for (let wy = yBase - bh + 4; wy < yBase - 6; wy += 9) {
        const k = R(seed + wx * 31 + wy * 17);
        if (k < litP) {
          const flick = R(seed + wx * 7 + wy * 3 + Math.floor(t * 0.5)) > 0.04;
          if (flick) P(ctx, wx, wy, 3, 4, win);
        }
      }
    }
    x += bw + 2 + R(seed + i * 29) * 8;
    i++;
  }
}
function bubble(ctx, x, y, w, h, c, lines = 2) {
  P(ctx, x, y, w, h, '#1c2230');
  ctx.strokeStyle = c; ctx.lineWidth = 1;
  ctx.strokeRect(x + 0.5, y + 0.5, w, h);
  P(ctx, x + 4, y + h, 3, 3, c);   // tail
  for (let i = 0; i < lines; i++) P(ctx, x + 4, y + 4 + i * 5, w - 8 - R(x + i) * (w / 3), 2, '#8b93a7');
}

// ── the scenes ──────────────────────────────────────────────────────
export const IMPACT_SCENES = {

  // photos gaining bounding boxes and labels — the machines learn to see
  recognition(ctx, t, a) {
    sky(ctx, '#0b0e14', '#11151f');
    const subjects = [
      (x, y) => {  // a cat
        P(ctx, x + 14, y + 26, 34, 18, '#6e7a90'); P(ctx, x + 40, y + 14, 16, 16, '#6e7a90');
        P(ctx, x + 41, y + 9, 4, 6, '#6e7a90'); P(ctx, x + 50, y + 9, 4, 6, '#6e7a90');
        P(ctx, x + 6, y + 28, 8, 4, '#6e7a90'); P(ctx, x + 44, y + 19, 2, 2, '#fbbf24'); P(ctx, x + 50, y + 19, 2, 2, '#fbbf24');
      },
      (x, y) => {  // a face, smiling
        P(ctx, x + 18, y + 8, 26, 30, '#e8c39e'); P(ctx, x + 16, y + 4, 30, 8, '#4a3a26');
        P(ctx, x + 24, y + 18, 3, 3, '#11151f'); P(ctx, x + 35, y + 18, 3, 3, '#11151f');
        P(ctx, x + 25, y + 28, 12, 2, '#a04545'); P(ctx, x + 23, y + 26, 2, 2, '#a04545'); P(ctx, x + 37, y + 26, 2, 2, '#a04545');
      },
      (x, y) => {  // a tree with a bird
        P(ctx, x + 28, y + 26, 6, 18, '#4a3a26');
        P(ctx, x + 14, y + 8, 34, 22, '#2f6b4f'); P(ctx, x + 20, y + 2, 22, 12, '#2f6b4f');
        P(ctx, x + 40, y + 4, 5, 3, '#f87171'); P(ctx, x + 44, y + 2, 2, 2, '#f87171');
      },
    ];
    const labels = ['CAT 99.2%', 'JOY 97.4%', 'TREE 98.1%'];
    for (let i = 0; i < 3; i++) {
      const x = 52 + i * 190, y = 52;
      P(ctx, x - 8, y - 8, 80, 84, '#d6dce8');             // polaroid
      P(ctx, x - 4, y - 4, 72, 60, '#232b3d');
      subjects[i](x, y - 2);
      const ph = ((t * 0.45 + i * 0.333) % 1);             // each card takes a turn
      if (ph > 0.25) {
        const k = Math.min(1, (ph - 0.25) * 4);
        ctx.strokeStyle = a; ctx.lineWidth = 2;
        const bx = x + 2, by = y + 0, bw = 60 * k + 4, bh = 48 * k + 4;
        for (const [cx, cy, dx, dy] of [[bx, by, 1, 1], [bx + bw, by, -1, 1], [bx, by + bh, 1, -1], [bx + bw, by + bh, -1, -1]]) {
          P(ctx, cx, cy, 8 * dx, 2 * dy, a); P(ctx, cx, cy, 2 * dx, 8 * dy, a);
        }
        if (ph > 0.5) {
          ctx.font = '9px monospace'; ctx.fillStyle = '#0c6b4a';
          ctx.fillText(labels[i].slice(0, Math.floor((ph - 0.5) * 40)), x + 2, y + 68);
        }
      }
    }
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('vision model · live inference', 14, H - 10);
  },

  // an endless scrolling feed, some of it flagged — the synthetic web
  feed(ctx, t, a) {
    sky(ctx, '#0a0d14', '#0e1220');
    for (let col = 0; col < 3; col++) {
      const x = 45 + col * 195;
      const off = (t * (20 + col * 7)) % 66;
      for (let row = -1; row < 5; row++) {
        const y = row * 66 - off + 14;
        const id = col * 997 + (Math.floor((t * (20 + col * 7)) / 66) + row) * 13;
        const flagged = R(id) < 0.3;
        P(ctx, x, y, 150, 56, '#11151f');
        ctx.strokeStyle = flagged ? '#f87171' : '#262e40'; ctx.lineWidth = 1;
        ctx.strokeRect(x + 0.5, y + 0.5, 150, 56);
        P(ctx, x + 6, y + 6, 12, 12, flagged ? '#3a1820' : '#232b3d');
        for (let l = 0; l < 3; l++) P(ctx, x + 24, y + 8 + l * 7, 100 - R(id + l) * 60, 3, flagged ? '#7a5560' : '#39415a');
        for (let l = 0; l < 2; l++) P(ctx, x + 6, y + 32 + l * 8, 134 - R(id + 9 + l) * 50, 3, flagged ? '#5d4350' : '#2c3450');
        if (flagged) { ctx.font = '9px monospace'; ctx.fillStyle = '#f87171'; ctx.fillText('⚑ synthetic?', x + 86, y + 52); }
      }
    }
    const g = ctx.createLinearGradient(0, H - 70, 0, H);
    g.addColorStop(0, 'rgba(10,13,20,0)'); g.addColorStop(1, 'rgba(10,13,20,1)');
    ctx.fillStyle = g; ctx.fillRect(0, H - 70, W, 70);
    ctx.font = '9px monospace'; ctx.fillStyle = a;
    ctx.fillText('moderation queue: 8,214,772', 14, H - 10);
  },

  // two crowds, one arc of light — the end of the language barrier
  babel(ctx, t, a) {
    sky(ctx, '#0b0e1c', '#131a2c');
    stars(ctx, 40, t, 5, 120);
    ctx.strokeStyle = '#26304a'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, H + 320, 400, -Math.PI * 0.82, -Math.PI * 0.18); ctx.stroke();
    for (let i = 0; i < 4; i++) {
      person(ctx, 60 + i * 22, 168 - (i % 2) * 6, '#3b4a6b', 2, i);
      person(ctx, W - 120 + i * 22 - 60, 168 - (i % 2) * 6, '#5b3b56', 2, 40 + i);
    }
    const ph = (t * 0.5) % 1;
    const talkLeft = Math.floor(t * 0.5) % 2 === 0;
    bubble(ctx, 64, 122, 70, 24, talkLeft ? a : '#39415a');
    bubble(ctx, W - 140, 122, 70, 24, talkLeft ? '#39415a' : a);
    for (let k = 0; k < 7; k++) {                      // pulses along the arc
      const p = (ph + k * 0.14) % 1;
      const x = lerp(120, W - 120, talkLeft ? p : 1 - p);
      const y = 130 - Math.sin(p * Math.PI) * 72;
      P(ctx, x, y, 3, 3, a);
      P(ctx, x, y, 2, 2, '#fff');
    }
    for (let i = 0; i < 18; i++) {                     // the shared waveform
      const h2 = 4 + Math.abs(Math.sin(t * 5 + i * 0.8)) * 14;
      P(ctx, W / 2 - 54 + i * 6, 196 - h2 / 2, 3, h2, i % 3 ? '#39415a' : a);
    }
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('live translation · 41 languages', 14, H - 10);
  },

  // a classroom where the board explains itself, desk by desk
  tutor(ctx, t, a) {
    sky(ctx, '#141925', '#1a2030');
    P(ctx, 0, 196, W, 44, '#11151f');                      // floor
    P(ctx, 170, 18, 300, 88, '#0d1b16');                   // the board
    ctx.strokeStyle = a; ctx.lineWidth = 2; ctx.strokeRect(170, 18, 300, 88);
    const steps = Math.floor((t % 9) / 1.5) + 2;           // proof unfolds line by line
    for (let i = 0; i < Math.min(5, steps); i++) {
      P(ctx, 184, 30 + i * 15, 120 + R(i * 3) * 130, 4, i === Math.min(4, steps - 1) ? a : '#3d6b58');
    }
    if (steps >= 5) { ctx.font = '12px monospace'; ctx.fillStyle = a; ctx.fillText('∎', 448, 98); }
    const focus = Math.floor(t / 2.5) % 6;
    for (let i = 0; i < 6; i++) {
      const dx = 130 + (i % 3) * 150, dy = 142 + Math.floor(i / 3) * 46;
      person(ctx, dx + 18, dy - 8, ['#4a6b9e', '#8a5b80', '#4f7a60'][i % 3], 2.2, i * 7);
      P(ctx, dx, dy + 18, 52, 7, '#39415a');               // desk
      P(ctx, dx + 3, dy + 25, 4, 12, '#262e40'); P(ctx, dx + 45, dy + 25, 4, 12, '#262e40');
      P(ctx, dx + 6, dy + 14, 14, 4, '#22d3ee');           // their slate, glowing
      if (i === focus) {
        const oy = dy - 28 + Math.sin(t * 3) * 3;
        const g = ctx.createRadialGradient(dx + 26, oy, 1, dx + 26, oy, 14);
        g.addColorStop(0, a); g.addColorStop(1, 'rgba(52,211,153,0)');
        ctx.fillStyle = g; ctx.beginPath(); ctx.arc(dx + 26, oy, 14, 0, TAU); ctx.fill();
        P(ctx, dx + 24, oy - 2, 5, 5, '#eafff5');
      }
    }
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('one tutor per learner · mastery 94%', 14, H - 10);
  },

  // a dotted world map under automated attack — and automated defense
  cyber(ctx, t, a) {
    sky(ctx, '#07090f', '#0a0d16');
    for (let ix = 0; ix < 64; ix++) {
      for (let iy = 0; iy < 20; iy++) {
        if (R(ix * 53 + iy * 7) < 0.24) P(ctx, ix * 10 + 4, iy * 10 + 20, 4, 4, '#18222f');
      }
    }
    P(ctx, 0, (t * 60) % H, W, 1, 'rgba(34,211,238,0.06)');   // scanline
    for (let k = 0; k < 4; k++) {
      const wave = Math.floor(t / 2.2) + k * 31;
      const x1 = 60 + R(wave) * 240, y1 = 50 + R(wave + 1) * 140;
      const x2 = 340 + R(wave + 2) * 240, y2 = 50 + R(wave + 3) * 140;
      const p = ((t % 2.2) / 2.2);
      const guarded = R(wave + 4) < 0.55;
      for (let d = 0; d < 8; d++) {                          // red intrusion arc
        const q = Math.max(0, p - d * 0.035);
        const x = lerp(x1, x2, q), y = lerp(y1, y2, q) - Math.sin(q * Math.PI) * 60;
        P(ctx, x, y, 2.5, 2.5, `rgba(248,113,113,${1 - d * 0.12})`);
      }
      if (p > 0.9) {
        const rr = (p - 0.9) * 80;
        ctx.strokeStyle = guarded ? '#22d3ee' : '#f87171'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(x2, y2, rr, 0, TAU); ctx.stroke();
        if (guarded) { ctx.beginPath(); ctx.arc(x2, y2, rr * 0.55, 0, TAU); ctx.stroke(); }
      }
      P(ctx, x1 - 1, y1 - 1, 3, 3, '#f87171');
      P(ctx, x2 - 1, y2 - 1, 3, 3, guarded ? '#22d3ee' : '#8b93a7');
    }
    ctx.font = '9px monospace'; ctx.fillStyle = a;
    ctx.fillText('intrusions/hr: 41,902 · blocked: 41,883', 14, H - 10);
  },

  // old bars sink, new bars rise, people walk across the gap
  jobs(ctx, t, a) {
    sky(ctx, '#0e1220', '#161b27');
    const base = 192;
    P(ctx, 30, base, W - 60, 2, '#262e40');
    const ph = (Math.sin(t * 0.5) + 1) / 2;
    for (let i = 0; i < 5; i++) {
      const h0 = 46 + R(i) * 60, h2 = h0 * (1 - 0.45 * ph);
      P(ctx, 56 + i * 44, base - h2, 30, h2, '#39415a');
      P(ctx, 56 + i * 44, base - h2, 30, 3, '#4a5470');
    }
    for (let i = 0; i < 5; i++) {
      const h0 = 18 + R(i + 9) * 26, h2 = h0 + (40 + R(i + 17) * 50) * ph;
      P(ctx, 374 + i * 44, base - h2, 30, h2, '#1e4f3e');
      P(ctx, 374 + i * 44, base - h2, 30, 3, a);
    }
    for (let i = 0; i < 3; i++) {                          // the walk across
      const x = ((t * 26 + i * 110) % 330) + 150;
      person(ctx, x, base - 24, '#3b4a6b', 2, i * 13);
    }
    person(ctx, 96, base - 22, '#39415a', 2, 99);          // one stays, for now
    ctx.font = '9px monospace';
    ctx.fillStyle = '#5d6478'; ctx.fillText('YESTERDAY', 84, base + 16);
    ctx.fillStyle = a; ctx.fillText('TOMORROW', 412, base + 16);
  },

  // three studios: code, image, sound — humans and cursors sharing screens
  studio(ctx, t, a) {
    sky(ctx, '#10141f', '#171c2a');
    P(ctx, 0, 200, W, 40, '#11151f');
    for (let m = 0; m < 3; m++) {
      const x = 50 + m * 195, y = 50;
      P(ctx, x - 6, y - 6, 152, 104, '#232b3d');
      P(ctx, x, y, 140, 92, '#0a0d14');
      P(ctx, x + 60, y + 98, 20, 14, '#232b3d');
      P(ctx, x + 40, y + 112, 60, 4, '#2c3450');
      if (m === 0) {                                       // code, typing itself
        for (let l = 0; l < 8; l++) {
          const wmax = 30 + R(l * 7) * 90;
          const wNow = Math.min(wmax, Math.max(0, (((t * 0.6) % 1.6) - l * 0.18) * 240));
          P(ctx, x + 8 + (l % 3) * 8, y + 8 + l * 10, wNow, 3, ['#34d399', '#22d3ee', '#a78bfa', '#8b93a7'][l % 4]);
        }
      } else if (m === 1) {                                // a picture painting in
        const prog = (t * 0.25) % 1;
        for (let bx = 0; bx < 10; bx++) for (let by = 0; by < 6; by++) {
          if (R(bx * 31 + by * 17) < prog) {
            const c = by < 2 ? '#2c4a7a' : by < 4 ? '#3d6b58' : '#4a3a26';
            P(ctx, x + 10 + bx * 12, y + 10 + by * 12, 11, 11, c);
          }
        }
      } else {                                             // sound, playing
        for (let i = 0; i < 16; i++) {
          const h2 = 6 + Math.abs(Math.sin(t * 4 + i * 0.7)) * 30;
          P(ctx, x + 10 + i * 8, y + 46 - h2 / 2, 5, h2, i % 4 ? '#39415a' : '#f472b6');
        }
        P(ctx, x + 10 + ((t * 40) % 120), y + 8, 1.5, 76, a);
      }
      const cx = x + 20 + ((Math.sin(t * 1.3 + m * 2) + 1) / 2) * 100;   // the AI cursor
      const cy = y + 14 + ((Math.cos(t * 1.7 + m) + 1) / 2) * 60;
      P(ctx, cx, cy, 5, 5, a); P(ctx, cx + 1.5, cy + 1.5, 2, 2, '#fff');
      person(ctx, x + 56, y + 120, ['#3b4a6b', '#5b3b56', '#3d5a48'][m], 2, m * 5);
    }
  },

  // an apartment block at night: warm windows, cold windows, company
  companion(ctx, t, a) {
    sky(ctx, '#0a0e1c', '#10141f');
    stars(ctx, 50, t, 3, 90);
    ctx.fillStyle = '#d6dce8'; ctx.beginPath(); ctx.arc(560, 42, 16, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0a0e1c'; ctx.beginPath(); ctx.arc(554, 38, 14, 0, TAU); ctx.fill();
    P(ctx, 90, 36, 380, 204, '#161b27');
    for (let i = 0; i < 12; i++) {
      const wx = 110 + (i % 4) * 92, wy = 52 + Math.floor(i / 4) * 62;
      const mood = R(i * 7 + 2);
      if (mood < 0.5) {                                    // warm: not alone
        P(ctx, wx, wy, 72, 46, '#2a2010');
        P(ctx, wx, wy, 72, 46, `rgba(251,191,36,${0.10 + 0.05 * Math.sin(t * 2 + i)})`);
        if (mood < 0.25) {
          P(ctx, wx + 8, wy + 30, 56, 10, '#3a3046');      // couch
          person(ctx, wx + 16, wy + 16, '#5b3b56', 1.6, i);
          bot(ctx, wx + 38, wy + 16, a, 1.4);
          const tv = 0.5 + 0.5 * Math.sin(t * 9 + i * 3);
          P(ctx, wx + 58, wy + 10, 10, 8, `rgba(120,160,220,${0.3 + 0.4 * tv})`);
        } else {
          person(ctx, wx + 20, wy + 18, '#3d5a48', 1.6, i + 30);
          person(ctx, wx + 40, wy + 18, '#3b4a6b', 1.6, i + 60);
        }
      } else if (mood < 0.8) {                             // cold: alone with a glow
        P(ctx, wx, wy, 72, 46, '#101c2c');
        person(ctx, wx + 28, wy + 18, '#2c3450', 1.6, i + 90);
        P(ctx, wx + 44, wy + 26, 8, 6, `rgba(80,120,200,${0.4 + 0.3 * Math.sin(t * 6 + i)})`);
      } else {
        P(ctx, wx, wy, 72, 46, '#0c1018');                 // dark, asleep or out
      }
    }
    P(ctx, 90, 36, 380, 204, 'rgba(0,0,0,0)');
    for (let gx = 0; gx < 5; gx++) P(ctx, 102 + gx * 92, 36, 2, 204, '#11151f');
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('9:41 pm · everyone is talking to someone', 14, H - 10);
  },

  // helix, molecule, flask — biology on fast-forward
  meds(ctx, t, a) {
    sky(ctx, '#0a1018', '#0e1626');
    for (let i = 0; i < 15; i++) {                         // the helix
      const y = 28 + i * 13;
      const x1 = 120 + Math.sin(t * 1.4 + i * 0.55) * 26;
      const x2 = 120 - Math.sin(t * 1.4 + i * 0.55) * 26;
      P(ctx, Math.min(x1, x2), y + 1, Math.abs(x2 - x1), 1, '#26304a');
      P(ctx, x1 - 2, y, 4, 4, '#22d3ee'); P(ctx, x2 - 2, y, 4, 4, '#f472b6');
    }
    const cx = 330, cy = 110;                              // candidate molecule
    const grown = Math.floor((t % 12) / 2) + 5;
    ctx.strokeStyle = '#39415a'; ctx.lineWidth = 2;
    for (let i = 0; i < Math.min(10, grown); i++) {
      const a1 = (i / 10) * TAU - Math.PI / 2, a2 = ((i + 1) / 10) * TAU - Math.PI / 2;
      const r1 = i % 2 ? 46 : 30, r2 = (i + 1) % 2 ? 46 : 30;
      ctx.beginPath();
      ctx.moveTo(cx + Math.cos(a1) * r1, cy + Math.sin(a1) * r1);
      ctx.lineTo(cx + Math.cos(a2) * r2, cy + Math.sin(a2) * r2);
      ctx.stroke();
      const pulse = 3 + Math.sin(t * 3 + i) * 1.2;
      P(ctx, cx + Math.cos(a1) * r1 - pulse / 2, cy + Math.sin(a1) * r1 - pulse / 2, pulse, pulse, i % 3 ? '#8b93a7' : a);
    }
    P(ctx, 488, 88, 4, 30, '#39415a'); P(ctx, 512, 88, 4, 30, '#39415a');   // the flask
    ctx.strokeStyle = '#8b93a7'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(490, 88); ctx.lineTo(478, 160); ctx.lineTo(526, 160); ctx.lineTo(514, 88); ctx.stroke();
    P(ctx, 482, 132, 40, 26, 'rgba(52,211,153,0.5)');
    for (let b = 0; b < 5; b++) {
      const by = 154 - ((t * 26 + b * 17) % 48);
      if (by > 100) P(ctx, 488 + R(b) * 26, by, 3, 3, 'rgba(52,211,153,0.8)');
    }
    ctx.font = '10px monospace'; ctx.fillStyle = a;
    ctx.fillText('candidates screened: ' + (1287000 + Math.floor(t * 1371)).toLocaleString(), 220, 210);
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('structure → function → trial', 220, 226);
  },

  // a ward where the trend line finally points the right way
  hospital(ctx, t, a) {
    sky(ctx, '#101620', '#161d2c');
    P(ctx, 0, 198, W, 42, '#11151f');
    ctx.strokeStyle = a; ctx.lineWidth = 1.5;              // the heartbeat
    ctx.beginPath();
    for (let x = 0; x < 300; x++) {
      const ph = ((x + t * 60) % 75) / 75;
      let y = 36;
      if (ph > 0.30 && ph < 0.34) y = 36 - (ph - 0.30) * 500;
      else if (ph >= 0.34 && ph < 0.40) y = 16 + (ph - 0.34) * 660;
      else if (ph >= 0.40 && ph < 0.44) y = 56 - (ph - 0.40) * 500;
      ctx[x === 0 ? 'moveTo' : 'lineTo'](24 + x, y);
    }
    ctx.stroke();
    for (let i = 0; i < 3; i++) {                          // beds
      const bx = 60 + i * 130, by = 150;
      P(ctx, bx, by, 86, 26, '#232b3d');
      P(ctx, bx, by - 14, 8, 40, '#2c3450'); P(ctx, bx + 80, by - 8, 8, 34, '#2c3450');
      P(ctx, bx + 10, by - 4, 16, 8, '#d6dce8');           // pillow
      P(ctx, bx + 26, by - 2, 54, 8, '#1e4f3e');           // blanket
      P(ctx, bx + 14, by - 8, 8, 6, ['#e8c39e', '#c68f5e', '#8d5a3a'][i]);
      const hb = 1 + 0.3 * Math.sin(t * 5 + i * 2);
      P(ctx, bx + 40, by - 18, 4 * hb, 4 * hb, '#f472b6'); // a small steady heart
    }
    const wx = 480 + Math.sin(t * 0.7) * 40;               // rounds: human + machine
    person(ctx, wx, 162, '#3d5a48', 2, 4);
    bot(ctx, wx + 16, 164, a, 1.6);
    ctx.strokeStyle = '#39415a'; ctx.lineWidth = 1;        // the mortality chart
    ctx.strokeRect(440.5, 40.5, 160, 80);
    ctx.strokeStyle = a; ctx.lineWidth = 2; ctx.beginPath();
    const reveal = Math.min(1, (t % 10) / 7);
    for (let x = 0; x <= 150 * reveal; x += 5) {
      const y = 58 + x * 0.30 + Math.sin(x * 0.18) * 4;    // downward = lives kept
      ctx[x === 0 ? 'moveTo' : 'lineTo'](448 + x, y);
    }
    ctx.stroke();
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('missed diagnoses ↓', 452, 134);
  },

  // dome, podium, two benches, one argument
  forum(ctx, t, a) {
    sky(ctx, '#0e1220', '#181d2c');
    ctx.fillStyle = '#232b3d';
    ctx.beginPath(); ctx.arc(W / 2, 96, 64, Math.PI, 0); ctx.fill();
    P(ctx, W / 2 - 4, 18, 8, 16, '#39415a');
    P(ctx, W / 2 - 78, 96, 156, 12, '#2c3450');
    for (let i = 0; i < 6; i++) P(ctx, W / 2 - 66 + i * 24, 108, 10, 56, '#232b3d');
    P(ctx, W / 2 - 90, 164, 180, 8, '#2c3450');
    P(ctx, W / 2 - 14, 150, 28, 22, '#39415a');            // the podium
    person(ctx, W / 2 - 5, 128, '#5b3b56', 2, 8);
    for (let side = 0; side < 2; side++) {                 // benches
      for (let i = 0; i < 5; i++) {
        const bx = side === 0 ? 60 + i * 28 : W - 200 + i * 28;
        P(ctx, bx - 4, 196, 24, 6, '#232b3d');
        person(ctx, bx, 176, side === 0 ? '#3b4a6b' : '#3d5a48', 2, side * 50 + i);
      }
    }
    const turn = Math.floor(t / 2.2) % 2;                  // the debate
    bubble(ctx, turn === 0 ? 96 : W - 196, 132, 86, 26, turn === 0 ? a : '#fbbf24', 3);
    const tilt = Math.sin(t * 0.7) * 0.22;                 // scales, still moving
    const sx = W - 70, sy = 70;
    P(ctx, sx - 1, sy, 3, 44, '#8b93a7');
    ctx.save(); ctx.translate(sx, sy + 6); ctx.rotate(tilt);
    P(ctx, -34, -2, 68, 3, '#8b93a7');
    P(ctx, -36, 2, 12, 8, '#39415a'); P(ctx, 24, 2, 12, 8, '#39415a');
    ctx.restore();
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('session 412 · amendment 9 · still talking', 14, H - 10);
  },

  // robotic arms over benches, all night, every night
  autolab(ctx, t, a) {
    sky(ctx, '#0c1018', '#121826');
    P(ctx, 0, 168, W, 6, '#2c3450');                       // the bench
    for (let st = 0; st < 3; st++) {
      const bx = 110 + st * 180;
      ctx.save(); ctx.translate(bx, 168);
      const a1 = Math.sin(t * 1.2 + st * 2.1) * 0.7 - 1.9;
      const a2 = Math.sin(t * 1.7 + st) * 0.8 + 0.6;
      P(ctx, -10, -10, 20, 10, '#39415a');                 // base
      ctx.rotate(a1); P(ctx, -3, -44, 6, 44, '#8b93a7');
      ctx.translate(0, -44); ctx.rotate(a2); P(ctx, -2.5, -34, 5, 34, '#9aa6bb');
      ctx.translate(0, -34);
      P(ctx, -4, -4, 8, 6, a);                             // effector
      ctx.restore();
      P(ctx, bx + 30, 142, 4, 22, '#39415a');              // a flask each
      P(ctx, bx + 24, 150, 16, 16, 'rgba(34,211,238,0.4)');
      const bub = 162 - ((t * 30 + st * 19) % 24);
      P(ctx, bx + 30 + R(st) * 5, bub, 2, 2, '#22d3ee');
      if ((t + st * 1.1) % 3 < 0.25) {                     // a discovery!
        const sx = bx, sy = 96;
        for (const [dx, dy] of [[0, -8], [0, 8], [-8, 0], [8, 0], [0, 0]]) P(ctx, sx + dx, sy + dy, 3, 3, '#fbbf24');
      }
    }
    const sq = (t * 36) % 60;                              // the sample conveyor
    P(ctx, 0, 206, W, 4, '#232b3d');
    for (let i = -1; i < 12; i++) P(ctx, i * 60 + sq, 196, 14, 10, i % 3 ? '#39415a' : '#1e4f3e');
    ctx.strokeStyle = '#8b93a7'; ctx.lineWidth = 1.5;      // the clock that never matters
    ctx.beginPath(); ctx.arc(W - 50, 50, 18, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(W - 50, 50);
    ctx.lineTo(W - 50 + Math.cos(t * 3) * 13, 50 + Math.sin(t * 3) * 13); ctx.stroke();
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('experiment #88,107 · humans asleep', 14, H - 10);
  },

  // assembly line on the left; a cup of tea on the right
  robots(ctx, t, a) {
    sky(ctx, '#10141f', '#161c2a');
    P(ctx, 0, 200, W, 40, '#11151f');
    P(ctx, 30, 168, 250, 5, '#2c3450');                    // factory belt
    for (let i = -1; i < 5; i++) P(ctx, ((t * 30 + i * 64) % 256) + 30, 156, 18, 12, '#39415a');
    for (let m = 0; m < 2; m++) {
      ctx.save(); ctx.translate(90 + m * 130, 168);
      ctx.rotate(Math.sin(t * 2 + m * 1.6) * 0.5 - 2.0);
      P(ctx, -3, -40, 6, 40, '#8b93a7'); ctx.translate(0, -40);
      ctx.rotate(Math.sin(t * 2.4 + m) * 0.7 + 0.7); P(ctx, -2, -26, 4, 26, '#9aa6bb');
      const spark = (t * 2 + m) % 1 < 0.12;
      if (spark) { ctx.translate(0, -26); for (const [dx, dy] of [[-5, -4], [4, -6], [0, -9]]) P(ctx, dx, dy, 2, 2, '#fbbf24'); }
      ctx.restore();
    }
    P(ctx, 320, 30, 2, 210, '#262e40');                    // the wall between worlds
    P(ctx, 380, 60, 50, 60, '#101c2c');                    // a window, night outside
    ctx.fillStyle = '#d6dce8'; ctx.beginPath(); ctx.arc(412, 80, 8, 0, TAU); ctx.fill();
    P(ctx, 480, 132, 8, 50, '#4a3a26');                    // lamp
    const g = ctx.createRadialGradient(484, 128, 2, 484, 128, 50);
    g.addColorStop(0, 'rgba(251,191,36,0.35)'); g.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(484, 128, 50, 0, TAU); ctx.fill();
    P(ctx, 520, 168, 56, 30, '#3a3046');                   // armchair
    P(ctx, 514, 152, 10, 46, '#3a3046');
    person(ctx, 534, 146, '#5b3b56', 2.4, 77);             // the elder
    bot(ctx, 436, 152, a, 2.2);                            // the helper
    const reach = 14 + Math.sin(t * 1.4) * 8;
    P(ctx, 448, 168, reach, 4, '#9aa6bb');                 // offering arm
    P(ctx, 448 + reach, 162, 8, 8, '#d6dce8');             // the cup
    P(ctx, 450 + reach, 156 - Math.sin(t * 4) * 2, 2, 4, 'rgba(214,220,232,0.5)');   // steam
    if ((t % 4) < 0.6) P(ctx, 548, 126, 6, 6, '#f472b6');  // a small heart
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('the same hands, both shifts', 14, H - 10);
  },

  // smoke fades, forest grows, the river runs clear again
  eco(ctx, t, a) {
    const p = (t % 10) / 10;
    sky(ctx, '#10202c', '#1c3242');
    ctx.fillStyle = `rgba(251,191,36,${0.5 + p * 0.3})`;
    ctx.beginPath(); ctx.arc(80, 60 - p * 18, 18, 0, TAU); ctx.fill();
    P(ctx, 500, 96, 60, 84, '#232b3d');                    // the old plant
    P(ctx, 514, 60, 12, 40, '#39415a'); P(ctx, 538, 70, 10, 30, '#39415a');
    for (let i = 0; i < 4; i++) {                          // smoke, thinning
      const sy = 54 - i * 12 - ((t * 8) % 12);
      ctx.fillStyle = `rgba(120,130,150,${Math.max(0, 0.4 * (1 - p) - i * 0.07)})`;
      ctx.beginPath(); ctx.arc(520 + Math.sin(t + i) * 4, sy, 7 + i * 2, 0, TAU); ctx.fill();
    }
    P(ctx, 0, 180, W, 60, '#1c2e22');                      // the land
    const rc = [Math.round(lerp(74, 40, p)), Math.round(lerp(58, 90, p)), Math.round(lerp(38, 140, p))];
    P(ctx, 0, 196, W, 18, `rgb(${rc[0]},${rc[1]},${rc[2]})`);   // the river heals
    P(ctx, 0, 196, W, 2, `rgba(255,255,255,${0.1 + p * 0.15})`);
    for (let i = 0; i < 16; i++) {                         // the forest returns
      const show = p > i / 18;
      if (!show) continue;
      const tx = 30 + R(i * 3) * 420, ty = 186 - R(i * 7) * 10;
      const sc = Math.min(1, (p - i / 18) * 9) * (0.8 + R(i) * 0.7);
      P(ctx, tx - 1, ty - 8 * sc, 3, 8 * sc, '#4a3a26');
      ctx.fillStyle = i % 4 ? '#2f6b4f' : a;
      ctx.beginPath(); ctx.moveTo(tx, ty - 22 * sc); ctx.lineTo(tx - 8 * sc, ty - 6 * sc); ctx.lineTo(tx + 9 * sc, ty - 6 * sc); ctx.fill();
    }
    if (p > 0.55) {                                        // and so do the birds
      for (let b = 0; b < 3; b++) {
        const bx = ((t * 34 + b * 80) % 400) + 100, by = 60 + R(b) * 40 + Math.sin(t * 3 + b) * 6;
        P(ctx, bx, by, 5, 1.5, '#d6dce8'); P(ctx, bx + 4, by - 2, 4, 1.5, '#d6dce8');
      }
    }
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('restoration index: net positive', 14, H - 10);
  },

  // a bottled star feeding a city that doesn't notice
  fusion(ctx, t, a) {
    sky(ctx, '#0a0c16', '#10141f');
    const cx = 190, cy = 110, rx = 110, ry = 52;
    const g = ctx.createRadialGradient(cx, cy, 6, cx, cy, 130);
    g.addColorStop(0, 'rgba(244,114,182,0.30)'); g.addColorStop(1, 'rgba(244,114,182,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(cx, cy, 130, 0, TAU); ctx.fill();
    ctx.strokeStyle = '#39415a'; ctx.lineWidth = 7;        // the vessel
    ctx.beginPath(); ctx.ellipse(cx, cy, rx, ry, 0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 10; i++) {                         // the coils
      const an = (i / 10) * TAU;
      P(ctx, cx + Math.cos(an) * rx - 4, cy + Math.sin(an) * ry - 7, 8, 14, '#22d3ee');
    }
    for (let i = 0; i < 30; i++) {                         // the plasma
      const an = t * 4 + i * (TAU / 30);
      const px = cx + Math.cos(an) * (rx - 9), py = cy + Math.sin(an) * (ry - 7);
      const hot = i % 5 === 0;
      P(ctx, px, py, hot ? 4 : 2.5, hot ? 4 : 2.5, hot ? '#fff' : '#f0abfc');
    }
    ctx.font = '10px monospace'; ctx.fillStyle = '#f0abfc';
    ctx.fillText('Q = 11.4', cx - 24, cy + 4);
    skyline(ctx, 226, 9, '#161b27', '#fbbf24', t, 0.55);   // the city, fed
    ctx.strokeStyle = a; ctx.lineWidth = 1.5;              // the line between them
    ctx.beginPath(); ctx.moveTo(cx + rx, cy + 20);
    ctx.quadraticCurveTo(420, 150, 470, 196); ctx.stroke();
    const pp = (t * 0.8) % 1;
    const qx = lerp(cx + rx, 470, pp), qy = lerp(cy + 20, 196, pp) + Math.sin(pp * Math.PI) * 24;
    P(ctx, qx, qy, 4, 4, '#fff');
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('grid price/kWh: ~0', 14, H - 10);
  },

  // the megacity, in whatever mood the story brings
  city(ctx, t, a, tone) {
    sky(ctx, '#0a0e1a', '#141a2c');
    stars(ctx, 36, t, 11, 70);
    skyline(ctx, 240, 31, '#10141f', '#26304a', t, 0.35);  // far layer
    skyline(ctx, 240, 47, '#161b27', tone === 'bad' ? '#7a5560' : '#fbbf24', t * 0.7, tone === 'good' ? 0.6 : 0.42);
    for (let b = 0; b < 2; b++) {                          // billboards
      const bx = 120 + b * 330, by = 90 + b * 22;
      const c = ['#22d3ee', '#f472b6', a][Math.floor(t / 1.5 + b) % 3];
      P(ctx, bx, by, 54, 26, '#0a0d14');
      P(ctx, bx + 3, by + 3, 48, 20, c);
      P(ctx, bx + 3, by + 3, 48, 20, 'rgba(0,0,0,0.55)');
      for (let l = 0; l < 2; l++) P(ctx, bx + 8, by + 8 + l * 7, 38 - R(b + l) * 16, 3, c);
    }
    for (let d = 0; d < 3; d++) {                          // traffic in the air
      const dx = ((t * (26 + d * 9)) % (W + 40)) - 20, dy = 54 + d * 22;
      P(ctx, dx, dy, 7, 2, '#39415a');
      P(ctx, dx + 3, dy - 2, 1.5, 2, '#39415a');
      P(ctx, dx + (d % 2 ? 0 : 6), dy + 1, 1.5, 1.5, (t * 4 + d) % 1 < 0.5 ? '#f87171' : '#34d399');
    }
    if (tone === 'bad') {                                  // the eyes of the state
      for (let s = 0; s < 3; s++) {
        const sx2 = ((t * 24 + s * 210) % (W + 100)) - 50;
        const gg = ctx.createLinearGradient(sx2, 60, sx2 + 26, 240);
        gg.addColorStop(0, 'rgba(248,113,113,0.16)'); gg.addColorStop(1, 'rgba(248,113,113,0)');
        ctx.fillStyle = gg;
        ctx.beginPath(); ctx.moveTo(sx2, 56); ctx.lineTo(sx2 + 60, 240); ctx.lineTo(sx2 + 110, 240); ctx.fill();
        P(ctx, sx2 - 2, 50, 8, 6, '#39415a');
      }
    }
    ctx.font = '9px monospace'; ctx.fillStyle = tone === 'bad' ? '#f87171' : '#5d6478';
    ctx.fillText(tone === 'bad' ? 'cameras online: all of them' : 'the lights stay on by themselves', 14, H - 10);
  },

  // a ring with a town hall in it
  space(ctx, t, a) {
    sky(ctx, '#05070c', '#0a0e1a');
    stars(ctx, 90, t, 21);
    ctx.fillStyle = '#1d2c44';                             // the world below
    ctx.beginPath(); ctx.arc(W / 2, H + 420, 480, 0, TAU); ctx.fill();
    ctx.strokeStyle = 'rgba(122,162,247,0.5)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(W / 2, H + 420, 481, 0, TAU); ctx.stroke();
    P(ctx, 90, H - 36, 70, 10, 'rgba(52,211,153,0.18)');   // aurora hints
    P(ctx, 420, H - 30, 90, 8, 'rgba(34,211,238,0.14)');
    const cx = W / 2, cy = 100, r0 = 74;
    ctx.strokeStyle = '#8b93a7'; ctx.lineWidth = 6;        // the ring
    ctx.beginPath(); ctx.arc(cx, cy, r0, 0, TAU); ctx.stroke();
    for (let i = 0; i < 24; i++) {                         // windows, lit
      const an = t * 0.25 + (i / 24) * TAU;
      if (R(i) < 0.7) P(ctx, cx + Math.cos(an) * r0 - 1.5, cy + Math.sin(an) * r0 - 1.5, 3, 3, '#fbbf24');
    }
    for (let sp = 0; sp < 4; sp++) {                       // spokes + hub
      const an = t * 0.25 + sp * (Math.PI / 2);
      ctx.strokeStyle = '#39415a'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.lineTo(cx + Math.cos(an) * r0, cy + Math.sin(an) * r0); ctx.stroke();
    }
    P(ctx, cx - 7, cy - 7, 14, 14, '#9aa6bb');
    P(ctx, cx - 3, cy - 3, 6, 6, a);
    const sh = (t * 0.12) % 1;                             // the shuttle, commuting
    const sx2 = lerp(-30, W + 30, sh), sy2 = 170 - Math.sin(sh * Math.PI) * 40;
    P(ctx, sx2, sy2, 14, 5, '#d6dce8'); P(ctx, sx2 + 14, sy2 + 1, 4, 3, '#9aa6bb');
    P(ctx, sx2 - 5 - Math.sin(t * 9) * 3, sy2 + 1, 5, 2, '#fbbf24');
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('supply manifest: none required', 14, H - 10);
  },

  // a sail of light leaving the porch lamp of the Sun
  starship(ctx, t, a) {
    sky(ctx, '#03040a', '#070a14');
    for (let i = 0; i < 60; i++) {                         // starfield, streaking
      const sp = 30 + R(i) * 160;
      const x = (R(i * 3) * (W + 200) - ((t * sp) % (W + 200))) + 100;
      const y = R(i * 7) * H;
      P(ctx, x, y, Math.min(22, sp * 0.09), 1.2, `rgba(214,220,232,${0.2 + R(i) * 0.5})`);
    }
    const g = ctx.createRadialGradient(60, 120, 2, 60, 120, 70);   // the Sun astern
    g.addColorStop(0, 'rgba(251,191,36,0.9)'); g.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(60, 120, 70, 0, TAU); ctx.fill();
    P(ctx, 56, 116, 8, 8, '#fff7d6');
    const bx = 300 + Math.sin(t * 0.8) * 6;                // the sail
    ctx.strokeStyle = a; ctx.lineWidth = 1;                // the beam that pushes it
    for (let b = 0; b < 5; b++) {
      ctx.beginPath(); ctx.moveTo(64, 118 + (b - 2) * 3);
      ctx.lineTo(bx - 6, 120 + (b - 2) * 9); ctx.stroke();
    }
    ctx.fillStyle = '#d6dce8';
    ctx.beginPath(); ctx.moveTo(bx, 86); ctx.lineTo(bx + 10, 120); ctx.lineTo(bx, 154); ctx.lineTo(bx - 6, 120); ctx.fill();
    P(ctx, bx + 8, 117, 7, 6, '#9aa6bb');                  // the gram of mind
    P(ctx, bx + 10, 119, 3, 2, a);
    const tx = 560, ty = 70;                               // the destination
    const pulse = 2 + Math.sin(t * 2.5) * 1.4;
    P(ctx, tx - pulse / 2, ty - pulse / 2, pulse, pulse, '#fff');
    ctx.strokeStyle = 'rgba(214,220,232,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(tx, ty, 10 + Math.sin(t * 2.5) * 2, 0, TAU); ctx.stroke();
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('v = 0.19c · t-minus 22 years · it dreams on the way', 14, H - 10);
  },

  // pods fall on a dead world; green follows
  seed(ctx, t, a) {
    sky(ctx, '#05070c', '#0b0d18');
    stars(ctx, 70, t, 33);
    const cx = 420, cy = 150, r = 110;
    ctx.fillStyle = '#5d4a3c';                             // the barren world
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.fill();
    for (let c = 0; c < 8; c++) {                          // craters
      ctx.fillStyle = '#4a3a30';
      ctx.beginPath();
      ctx.arc(cx + (R(c * 3) - 0.5) * r * 1.4, cy + (R(c * 7) - 0.5) * r * 1.4, 5 + R(c) * 12, 0, TAU); ctx.fill();
    }
    ctx.save();                                            // clip the blooms to the disc
    ctx.beginPath(); ctx.arc(cx, cy, r, 0, TAU); ctx.clip();
    const spread = (t % 16) / 16;
    for (const [gx, gy] of [[-40, -20], [30, 40], [-10, 60], [50, -40]]) {
      const gr = spread * 52;
      for (let d = 0; d < 26; d++) {
        const dd = R(d * 13 + gx) * gr, an = R(d * 7 + gy) * TAU;
        const px = cx + gx + Math.cos(an) * dd, py = cy + gy + Math.sin(an) * dd;
        P(ctx, px, py, 2.5, 2.5, d % 4 ? '#2f6b4f' : a);
      }
    }
    ctx.restore();
    ctx.fillStyle = 'rgba(160,200,255,0.10)';              // thin new air
    ctx.beginPath(); ctx.arc(cx, cy, r + 6, 0, TAU); ctx.fill();
    P(ctx, 80, 40, 26, 8, '#9aa6bb');                      // the gardener ship
    P(ctx, 106, 42, 6, 4, '#6e7a90');
    P(ctx, 84, 48, 3, 3, (t * 2) % 1 < 0.5 ? a : '#39415a');
    for (let k = 0; k < 3; k++) {                          // pods descending
      const pp = (t * 0.22 + k / 3) % 1;
      const px = lerp(100, cx - 30 + k * 26, pp), py = lerp(50, cy - 20 + k * 24, pp);
      P(ctx, px, py, 5, 7, '#d6dce8');
      P(ctx, px + 1, py - 4, 3, 3, `rgba(251,191,36,${1 - pp})`);
      for (let tr = 1; tr < 4; tr++) P(ctx, px - tr * 4, py - tr * 3, 2, 2, `rgba(214,220,232,${0.4 - tr * 0.1})`);
    }
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('sol 8,412 · soil pH approaching habitable', 14, H - 10);
  },

  // the founder's desk at 2 a.m. — where the personal calls get made
  desk(ctx, t, a) {
    sky(ctx, '#0a0c12', '#10131c');
    P(ctx, 420, 30, 150, 110, '#0c1322');                  // the window, raining
    ctx.fillStyle = '#d6dce8'; ctx.beginPath(); ctx.arc(530, 58, 11, 0, TAU); ctx.fill();
    ctx.fillStyle = '#0c1322'; ctx.beginPath(); ctx.arc(525, 54, 10, 0, TAU); ctx.fill();
    for (let r = 0; r < 22; r++) {
      const rx = 424 + R(r * 7) * 142, ry = (R(r * 3) * 110 + t * (60 + R(r) * 50)) % 106;
      P(ctx, rx, 32 + ry, 1, 5 + R(r) * 4, 'rgba(140,160,200,0.35)');
    }
    P(ctx, 414, 28, 4, 114, '#1c2230'); P(ctx, 568, 28, 4, 114, '#1c2230');
    P(ctx, 414, 138, 158, 4, '#1c2230'); P(ctx, 490, 28, 3, 114, '#1c2230');
    P(ctx, 60, 168, 320, 8, '#2a2418');                    // the desk
    P(ctx, 70, 176, 8, 50, '#1e1a10'); P(ctx, 360, 176, 8, 50, '#1e1a10');
    const g = ctx.createRadialGradient(120, 120, 4, 120, 120, 90);   // lamp cone
    g.addColorStop(0, 'rgba(251,191,36,0.30)'); g.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = g; ctx.beginPath(); ctx.arc(120, 120, 90, 0, TAU); ctx.fill();
    P(ctx, 96, 120, 5, 48, '#39415a'); P(ctx, 84, 110, 30, 12, '#4a5470');
    P(ctx, 180, 108, 96, 62, '#232b3d');                   // the terminal
    P(ctx, 184, 112, 88, 54, '#0a0f16');
    for (let l = 0; l < 5; l++) {                          // a hard email, half-written
      const wmax = 24 + R(l * 5) * 54;
      const wNow = Math.min(wmax, Math.max(0, ((t * 0.5 % 2.4) - l * 0.36) * 110));
      P(ctx, 189, 118 + l * 9, wNow, 3, l ? '#39415a' : a);
    }
    if ((t * 1.4) % 1 < 0.55) P(ctx, 190 + Math.min(78, ((t * 0.5 % 2.4) - 4 * 0.36) * 110), 154, 5, 7, a);
    P(ctx, 296, 150, 14, 18, '#4a3a26');                   // coffee, long cold
    P(ctx, 310, 154, 5, 8, '#4a3a26');
    P(ctx, 300 + Math.sin(t * 2) * 2, 138 - (t * 14 % 12), 2, 5, 'rgba(214,220,232,0.25)');
    const cb = Math.sin(t * 1.1) * 1.5;                    // the cat, unbothered
    P(ctx, 326, 156 + cb * 0.3, 30, 12, '#39415a');
    P(ctx, 350, 148 + cb * 0.3, 13, 11, '#39415a');
    P(ctx, 351, 144 + cb * 0.3, 4, 5, '#39415a'); P(ctx, 358, 144 + cb * 0.3, 4, 5, '#39415a');
    P(ctx, 320, 160, 8, 4, '#39415a');
    person(ctx, 224, 178, '#3b4a6b', 2.6, 12);             // you, deciding
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('2:13 am · the cursor blinks either way', 60, H - 10);
  },

  // a long table, a glowing offer, the city watching through the glass
  boardroom(ctx, t, a) {
    sky(ctx, '#0b0d14', '#12161f');
    skyline(ctx, 150, 77, '#10141f', '#26304a', t, 0.3);   // the city, through glass
    P(ctx, 0, 24, W, 2, '#1c2230');
    for (let m = 0; m < 5; m++) P(ctx, 64 + m * 128, 24, 3, 126, '#1c2230');   // mullions
    P(ctx, 0, 148, W, 6, '#161b27');
    ctx.fillStyle = '#241d12';                             // the table
    ctx.beginPath(); ctx.moveTo(110, 226); ctx.lineTo(530, 226); ctx.lineTo(470, 162); ctx.lineTo(170, 162); ctx.fill();
    ctx.fillStyle = '#2e2517';
    ctx.beginPath(); ctx.moveTo(110, 226); ctx.lineTo(530, 226); ctx.lineTo(528, 232); ctx.lineTo(112, 232); ctx.fill();
    for (let p2 = 0; p2 < 3; p2++) {                       // them
      person(ctx, 190 + p2 * 100, 128, '#11151f', 2.4, p2 * 9);
      person(ctx, 240 + p2 * 100, 130, '#0e1119', 2.2, p2 * 9 + 4);
    }
    const pulse = 0.5 + 0.5 * Math.sin(t * 1.8);           // the offer, glowing
    const gg = ctx.createRadialGradient(320, 190, 2, 320, 190, 46);
    gg.addColorStop(0, `rgba(251,191,36,${0.20 + pulse * 0.12})`); gg.addColorStop(1, 'rgba(251,191,36,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(320, 190, 46, 0, TAU); ctx.fill();
    P(ctx, 300, 182, 40, 26, '#d6dce8');
    for (let l = 0; l < 4; l++) P(ctx, 304, 186 + l * 5, 32 - R(l) * 14, 2, '#8b93a7');
    P(ctx, 304, 202, 18, 2, a);                            // the signature line
    const tap = (t * 2.2) % 1 < 0.5 ? 0 : 2;               // a pen, tapping
    P(ctx, 392, 186 + tap, 3, 12, '#9aa6bb');
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('page 1 of 41 · the number is real', 110, H - 10);
  },

  // the server aisle where the model actually lives
  rack(ctx, t, a) {
    sky(ctx, '#07090e', '#0b0e15');
    for (let side = 0; side < 2; side++) {                 // two rows, in perspective
      for (let i = 0; i < 5; i++) {
        const depth = i / 5;
        const rw = 86 - depth * 38, rh = 150 - depth * 64;
        const rx = side === 0 ? 30 + i * 78 + depth * 20 : W - 30 - rw - i * 78 - depth * 20;
        const ry = 36 + depth * 30;
        P(ctx, rx, ry, rw, rh, '#11151f');
        P(ctx, rx, ry, rw, 3, '#1c2230'); P(ctx, rx, ry, 3, rh, '#1c2230');
        for (let ly = 0; ly < 9; ly++) {
          for (let lx = 0; lx < 4; lx++) {
            const seed = side * 999 + i * 97 + ly * 13 + lx;
            const on = R(seed + Math.floor(t * (1.5 + R(seed) * 4))) > 0.4;
            if (on) {
              const c = R(seed * 3) < 0.78 ? '#1e4f3e' : R(seed * 7) < 0.5 ? '#22d3ee' : '#fbbf24';
              P(ctx, rx + 8 + lx * ((rw - 16) / 4), ry + 10 + ly * ((rh - 20) / 9), 3, 3, c);
            }
          }
        }
      }
    }
    P(ctx, 0, 196, W, 44, '#0a0d12');                      // the cold aisle
    P(ctx, W / 2 - 70, 198, 140, 2, 'rgba(34,211,238,0.25)');
    P(ctx, W / 2 - 40, 214, 80, 2, 'rgba(34,211,238,0.15)');
    const wx = W / 2 + Math.sin(t * 0.5) * 90;             // the one who has to decide
    const hg = ctx.createRadialGradient(wx + 5, 168, 2, wx + 5, 168, 40);
    hg.addColorStop(0, `rgba(52,211,153,0.18)`); hg.addColorStop(1, 'rgba(52,211,153,0)');
    ctx.fillStyle = hg; ctx.beginPath(); ctx.arc(wx + 5, 168, 40, 0, TAU); ctx.fill();
    person(ctx, wx, 168, '#1c2230', 2.4, 31);
    P(ctx, wx + 2, 170, 8, 3, a);                          // the badge that opens the door
    ctx.font = '9px monospace'; ctx.fillStyle = '#5d6478';
    ctx.fillText('checkpoint 41,206 saved · awaiting instruction', 14, H - 10);
  },

  // the watch that never blinks, and the rock that misses
  shield(ctx, t, a) {
    sky(ctx, '#04060c', '#0a0e1a');
    stars(ctx, 80, t, 41);
    const ex = 510, ey = 120, er = 64;
    ctx.fillStyle = '#1d3a5c';                             // home
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.fill();
    ctx.save();                                            // continents stay on the globe
    ctx.beginPath(); ctx.arc(ex, ey, er, 0, TAU); ctx.clip();
    for (let c = 0; c < 9; c++) {
      const gx = ex + (R(c * 5) - 0.5) * er * 1.7, gy = ey + (R(c * 9) - 0.5) * er * 1.7;
      ctx.fillStyle = '#2f6b4f';
      for (let b = 0; b < 5; b++) {
        ctx.beginPath();
        ctx.arc(gx + (R(c * 7 + b) - 0.5) * 18, gy + (R(c * 11 + b) - 0.5) * 12, 3 + R(c + b) * 7, 0, TAU); ctx.fill();
      }
    }
    ctx.fillStyle = 'rgba(255,255,255,0.10)';              // a little weather
    ctx.beginPath(); ctx.arc(ex - 20, ey - 26, 16, 0, TAU); ctx.fill();
    ctx.beginPath(); ctx.arc(ex + 26, ey + 18, 12, 0, TAU); ctx.fill();
    ctx.restore();
    for (let ring = 0; ring < 3; ring++) {                 // the sensor shells
      ctx.strokeStyle = `rgba(52,211,153,${0.30 - ring * 0.07})`; ctx.lineWidth = 1;
      ctx.beginPath(); ctx.arc(ex, ey, er + 16 + ring * 14, 0, TAU); ctx.stroke();
      for (let nd = 0; nd < 8; nd++) {
        const an = nd * (TAU / 8) + ring;
        if ((t * 2 + nd + ring) % 4 < 0.4) P(ctx, ex + Math.cos(an) * (er + 16 + ring * 14) - 1.5, ey + Math.sin(an) * (er + 16 + ring * 14) - 1.5, 4, 4, a);
      }
    }
    const sweep = t * 1.2;                                 // the radar that audits the sky
    for (let w = 0; w < 7; w++) {
      const an = sweep - w * 0.05;
      ctx.strokeStyle = `rgba(52,211,153,${0.4 - w * 0.055})`; ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(ex + Math.cos(an) * (er + 8), ey + Math.sin(an) * (er + 8));
      ctx.lineTo(ex + Math.cos(an) * (er + 46), ey + Math.sin(an) * (er + 46)); ctx.stroke();
    }
    const p = (t % 7) / 7;                                 // the visitor
    const rx2 = lerp(-30, ex - 20, p);
    const bend = Math.max(0, p - 0.4);
    const ry2 = 150 - bend * bend * 420;                   // nudged, it climbs away
    ctx.strokeStyle = 'rgba(139,147,167,0.35)'; ctx.lineWidth = 1;
    ctx.setLineDash([3, 5]);
    ctx.beginPath(); ctx.moveTo(0, 150);                   // the path it will NOT take
    ctx.lineTo(ex - 10, 140); ctx.stroke();
    ctx.setLineDash([]);
    for (let tr = 1; tr < 6; tr++) P(ctx, rx2 - tr * 7, ry2 + tr * (bend > 0 ? 4 : 1), 2.5, 2.5, `rgba(214,220,232,${0.5 - tr * 0.08})`);
    ctx.fillStyle = '#8d7a64';
    ctx.beginPath(); ctx.arc(rx2, ry2, 7, 0, TAU); ctx.fill();
    P(ctx, rx2 - 3, ry2 - 3, 3, 3, '#6e5a48');
    if (p > 0.38) {                                        // the tug takes hold
      const tx2 = rx2 + 26, ty2 = ry2 - 26;
      P(ctx, tx2, ty2, 12, 6, '#9aa6bb'); P(ctx, tx2 + 3, ty2 - 3, 5, 3, '#6e7a90');
      ctx.strokeStyle = '#fbbf24'; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.moveTo(tx2 + 4, ty2 + 6); ctx.lineTo(rx2 + 2, ry2 - 4); ctx.stroke();
    }
    ctx.font = '9px monospace'; ctx.fillStyle = a;
    ctx.fillText('catalogued: 100% · inbound: 0 · drills: weekly', 14, H - 10);
  },
};

// ── the broadcast treatment: crawl, scanlines, signal acquire ──────
const WIRE_H = 24;                 // the crawl strip below the scene
export const CANVAS_H = H + WIRE_H;

// Post-process the scene into "television": a wire crawl built from the
// story's own micro-headlines, faint scanlines, a vignette, and a burst of
// static while the signal locks in. Exported so the smoke test can run it
// against the 2d stub like any scene.
export function drawBroadcast(ctx, t, wireText, a) {
  if (t < 0.45) {                                          // signal acquiring…
    for (let i = 0; i < 14; i++) {
      const k = R(Math.floor(t * 30) * 17 + i);
      ctx.fillStyle = `rgba(214,220,232,${(0.45 - t) * 0.5 * R(i + t)})`;
      ctx.fillRect(0, k * H, W, 1 + R(i * 3 + Math.floor(t * 30)) * 4);
    }
    if (t < 0.1) { ctx.fillStyle = `rgba(214,220,232,${0.5 - t * 5})`; ctx.fillRect(0, 0, W, H); }
  }
  for (let y = 2; y < H; y += 4) {                         // scanlines
    ctx.fillStyle = 'rgba(0,0,0,0.07)'; ctx.fillRect(0, y, W, 1);
  }
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.45, W / 2, H / 2, W * 0.62);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(0,0,0,0.32)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  ctx.fillStyle = '#06080d'; ctx.fillRect(0, H, W, WIRE_H);   // the crawl strip
  ctx.fillStyle = '#262e40'; ctx.fillRect(0, H, W, 1);
  ctx.font = '11px monospace';
  const tw = Math.max(W, ctx.measureText(wireText).width + 80);
  const x = W - ((t * 55 + 300) % (tw + W));   // pre-advanced: never opens empty
  ctx.fillStyle = '#8b93a7';
  ctx.fillText(wireText, x, H + 16);
  ctx.fillText(wireText, x + tw + W, H + 16);              // seamless loop
  ctx.fillStyle = a; ctx.fillText('⚡', x - 18, H + 16);
}

// ── dilemma headers: the same scenes, without the television ────────
// Hard choices get a quiet establishing shot, not a news show: a neutral
// purple accent (no tone — tone would whisper an answer) and a soft veil
// that settles the scene behind the question. Exported for the smoke stub.
export function drawVeil(ctx) {
  const vg = ctx.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.6);
  vg.addColorStop(0, 'rgba(0,0,0,0)'); vg.addColorStop(1, 'rgba(5,7,12,0.45)');
  ctx.fillStyle = vg; ctx.fillRect(0, 0, W, H);
  const fg = ctx.createLinearGradient(0, H - 50, 0, H);
  fg.addColorStop(0, 'rgba(22,27,39,0)'); fg.addColorStop(1, 'rgba(22,27,39,0.9)');
  ctx.fillStyle = fg; ctx.fillRect(0, H - 50, W, 50);
}

// Which scene sets each dilemma's stage (core data stays untouched —
// presentation is a UI concern). Smoke enforces full coverage; the
// per-phase fallback only catches dilemmas added without a mapping.
export const DILEMMA_VIZ = {
  ghostwriter: 'desk', shadowLibrary: 'desk', confession: 'desk',
  benchmarkLeak: 'rack', openWeights: 'rack', rushLaunch: 'rack',
  recipeTheft: 'boardroom', sovereignSeed: 'boardroom', dataBroker: 'boardroom',
  griefBot: 'companion', user4406: 'companion', ageGate: 'companion', teenFilter: 'companion',
  detector: 'tutor', proctor: 'tutor',
  annotators: 'jobs', layoffModel: 'jobs', picketLine: 'jobs', jobShock: 'jobs',
  corpusRot: 'feed', slopFarm: 'feed', engagementMax: 'feed', persuasion: 'feed',
  voiceClone: 'cyber', maven: 'cyber', backdoor: 'cyber', nc3Advisor: 'cyber',
  eavesdrop: 'city', precrime: 'city', panopticon: 'city', heatwave: 'city',
  cityCharter: 'city', simMinds: 'city',
  votefactory: 'forum', truthEngine: 'forum', docket: 'forum', constitution: 'forum',
  unforgetting: 'forum',
  liarsDividend: 'studio', forkSelf: 'studio',
  babel: 'babel', lastSpeakers: 'babel', latticeMerge: 'babel',
  medTriage: 'hospital', denialEngine: 'hospital', innerVoice: 'hospital',
  cureOrProfit: 'meds', bioUnlock: 'meds', embryoMenu: 'meds',
  buryPaper: 'autolab',
  coalPower: 'eco', aquifer: 'eco', uplift: 'eco', forecast: 'eco',
  climateGeo: 'shield', earthShade: 'shield',
  rivalRun: 'fusion', entropyBudget: 'fusion',
  slowdown: 'space',
  darkForest: 'starship', centauri: 'starship', seam: 'starship',
  mercuryRights: 'seed', secondGenesis: 'seed', ancestorSim: 'seed', thousandGardens: 'seed',
};
const PHASE_FALLBACK = ['desk', 'desk', 'boardroom', 'forum', 'city', 'space', 'seed', 'starship'];
export function dilemmaScene(d) {
  return DILEMMA_VIZ[d.id] || PHASE_FALLBACK[Math.min(PHASE_FALLBACK.length - 1, d.minPhase || 0)];
}

// ── the shared animation loop (broadcast or dilemma header) ─────────
let cv = null, raf = 0, sceneKey = null, tone = 'good', t0 = 0, wireText = '', accent = ACCENT.good, tv = true;

function frame() {
  raf = 0;
  const root = document.getElementById('modal-root');
  if (!cv || !cv.isConnected || !root || root.classList.contains('hidden')) { cv = null; return; }
  const ctx = cv.getContext('2d');
  const t = (performance.now() - t0) / 1000;
  ctx.clearRect(0, 0, W, CANVAS_H);
  const draw = IMPACT_SCENES[sceneKey];
  if (draw) draw(ctx, t, accent, tone);
  if (tv) drawBroadcast(ctx, t, wireText, accent);
  else drawVeil(ctx);
  raf = requestAnimationFrame(frame);
}

export function mountDilemmaScene(el, key) {
  cv = el;
  sceneKey = key;
  tone = 'dilemma';                // no scene reads this — deliberately neutral
  accent = '#a78bfa';
  tv = false;
  t0 = performance.now();
  if (cv && cv.getContext && !raf) raf = requestAnimationFrame(frame);
}

// program name grows with the story's scale — the channel keeps up
function program(cap) {
  return cap >= 200 ? 'DEEP-FIELD REPORT' : cap >= 160 ? 'SYSTEM REPORT' : 'WORLD REPORT';
}

// opts: { rel } names the release this wave follows; { replay } reruns an
// archived story from the Chronicle (different framing, different way back).
export function showImpact(n, dateline, opts = {}) {
  const filed = opts.replay
    ? `archive replay · first aired ${dateline}`
    : opts.rel ? `the wave after the ${opts.rel} release` : '';
  showModal(`
    <div class="imp-head">
      <span class="imp-brand">🛰 ${program(n.cap)}</span>
      <span class="imp-live">${opts.replay ? '◼ REC' : '● LIVE'}</span>
      <span class="spacer"></span>
      <span class="imp-date">${esc(dateline)}</span>
    </div>
    <canvas id="imp-canvas" class="imp-canvas" width="${W}" height="${CANVAS_H}"></canvas>
    <div class="imp-body">
      <span class="imp-tag ${n.tone}">${esc(n.tag)}</span>
      ${filed ? `<span class="imp-filed">${esc(filed)}</span>` : ''}
      <h2 class="imp-title ${n.tone}">${esc(n.title)}</h2>
      <p>${esc(n.body)}</p>
      <p class="imp-real">📚 The real thing: ${esc(n.real)}</p>
      <div class="actions">
        ${opts.replay
    ? '<button class="act" data-act="chronicle">◂ Back to the chronicle</button>'
    : '<button class="act big" data-act="impactDone">Back to the lab</button>'}
      </div>
    </div>`, 'impact');
  cv = document.getElementById('imp-canvas');
  sceneKey = n.viz;
  tone = n.tone;
  accent = ACCENT[n.tone] || ACCENT.good;
  tv = true;
  wireText = (n.wire || []).join('   +++   ') + '   +++   ';
  t0 = performance.now();
  if (cv && cv.getContext && !raf) raf = requestAnimationFrame(frame);
}
