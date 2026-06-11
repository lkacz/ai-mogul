// Animated pixel-art renderers for the facility designer. Every part is
// drawn to resemble the real object — racks with blinking servers, CRACs
// with spinning fans, evaporative towers shedding mist, gas turbines with
// combustor flicker, pipes that join into real runs with flowing coolant,
// radiators pulsing infrared into space, a black hole with a turning
// accretion ring. The grid itself is the diagram: airflow, heat shimmer
// and status glows show the system working (or failing).

import { GRID_W, GRID_H } from '../core/design.js';

export const CELL = 40;                       // internal px per cell
export const DZ_W = GRID_W * CELL, DZ_H = GRID_H * CELL;

const P = (ctx, x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };
const hash = (a, b = 0) => {
  let h = (a * 374761393 + b * 668265263) | 0;
  h = ((h ^ (h >>> 13)) * 1274126177) | 0;
  return ((h ^ (h >>> 16)) >>> 0) / 4294967295;
};

// a spinning fan: hub + rotating blades inside radius r
function fan(ctx, cx, cy, r, t, speed, color = '#9fb4d8') {
  ctx.strokeStyle = color;
  ctx.lineWidth = 2;
  for (let b = 0; b < 3; b++) {
    const a = t * speed + b * Math.PI * 2 / 3;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r);
    ctx.stroke();
  }
  ctx.lineWidth = 1;
  P(ctx, cx - 1.5, cy - 1.5, 3, 3, '#2c3445');
  ctx.strokeStyle = 'rgba(60,75,100,.8)';
  ctx.beginPath(); ctx.arc(cx, cy, r + 2, 0, Math.PI * 2); ctx.stroke();
}

// a steel cabinet with a darker face panel
function cabinet(ctx, x, y, w, h, body = '#1c2230', face = '#141a26') {
  P(ctx, x, y, w, h, body);
  P(ctx, x + 2, y + 2, w - 4, h - 4, face);
}

// rising particles (mist, smoke, heat) above a point
function plume(ctx, x, y, t, n, color, spread = 8, speed = 9, life = 16) {
  for (let i = 0; i < n; i++) {
    const ph = (t * speed / life + hash(i, 31)) % 1;
    const px = x + Math.sin(t * 1.4 + i * 2.2) * spread * ph;
    const py = y - ph * life;
    ctx.fillStyle = color.replace('AL', String((1 - ph) * 0.55));
    ctx.fillRect(px, py, 2 + ph * 2, 2);
  }
}

// ── the parts ────────────────────────────────────────────────────────
// each: (ctx, x, y, t, env { cells, i, sun }) — x,y is the cell's top-left
export const PART_DRAW = {
  rack(ctx, x, y, t, env) {
    cabinet(ctx, x + 8, y + 3, 24, 34);
    for (let r = 0; r < 7; r++) {
      P(ctx, x + 11, y + 6 + r * 4.4, 14, 3, '#222b3f');
      const on = hash(env.i, r + ((t * 4) | 0)) < 0.6;
      P(ctx, x + 26, y + 6 + r * 4.4, 2, 2, on ? '#39e6a3' : '#27314a');
    }
  },
  crac(ctx, x, y, t) {
    cabinet(ctx, x + 6, y + 4, 28, 32, '#22303f', '#182431');
    fan(ctx, x + 20, y + 16, 8, t, 6, '#8fd8e8');
    P(ctx, x + 10, y + 29, 20, 4, '#11202a');
    for (let i = 0; i < 4; i++) P(ctx, x + 11 + i * 5, y + 30, 3, 2, '#1d4456');
    // cold breath
    plume(ctx, x + 20, y + 38, t, 3, 'rgba(140,220,240,AL)', 6, 7, 8);
  },
  crah(ctx, x, y, t) { PART_DRAW.crac(ctx, x, y, t); },
  vent(ctx, x, y, t) {
    P(ctx, x + 6, y + 8, 28, 24, '#39455c');
    for (let i = 0; i < 5; i++) P(ctx, x + 9, y + 11 + i * 4.4, 22, 2, '#202a3c');
    // air streaming in
    for (let i = 0; i < 3; i++) {
      const ph = (t * 0.9 + i * 0.33) % 1;
      P(ctx, x + 8 + ph * 22, y + 13 + i * 7, 5, 1, `rgba(160,220,240,${(1 - ph) * 0.5})`);
    }
  },
  ups(ctx, x, y, t) {
    cabinet(ctx, x + 8, y + 6, 24, 28, '#26303d', '#1b2330');
    const lvl = 3 + ((t * 0.8) % 1) * 0;
    for (let i = 0; i < 4; i++) {
      P(ctx, x + 12, y + 26 - i * 5, 16, 3, i < lvl ? '#39e6a3' : '#1d3a2c');
    }
    P(ctx, x + 17, y + 8, 6, 3, Math.sin(t * 2) > 0 ? '#fbbf24' : '#6b5a1e');
  },
  desk(ctx, x, y, t) {
    P(ctx, x + 6, y + 20, 28, 3, '#5a4634');
    P(ctx, x + 8, y + 23, 3, 12, '#3c3026'); P(ctx, x + 29, y + 23, 3, 12, '#3c3026');
    P(ctx, x + 13, y + 8, 14, 11, '#11151f');
    P(ctx, x + 15, y + 10, 10, 7, '#0c1f1c');
    ctx.fillStyle = '#39e6a3';
    for (let i = 0; i < 8; i++) {
      const yy = 3 - Math.log(1 + (i / 8 + (t * 0.05 % 1) * 3)) * 1.8;
      ctx.fillRect(x + 15 + i + 1, y + 10 + Math.max(0, Math.min(5, yy + 3)), 1, 1);
    }
  },
  panel(ctx, x, y, t) {
    P(ctx, x + 14, y + 4, 12, 32, '#3a4254');
    P(ctx, x + 16, y + 6, 8, 28, '#4a5468');
    for (let i = 0; i < 4; i++) P(ctx, x + 16, y + 7 + i * 7, 8, 1, '#39455c');
  },
  pdu(ctx, x, y, t) {
    cabinet(ctx, x + 12, y + 6, 16, 28, '#2a2f3c', '#1d2230');
    for (let i = 0; i < 5; i++) P(ctx, x + 17, y + 9 + i * 5, 6, 3, '#0d1118');
    P(ctx, x + 18, y + 31, 4, 2, Math.sin(t * 3) > -0.5 ? '#39e6a3' : '#1d3a2c');
  },
  tower(ctx, x, y, t) {
    // hyperboloid silhouette
    P(ctx, x + 10, y + 14, 20, 22, '#3d4654');
    P(ctx, x + 12, y + 20, 16, 10, '#333b48');
    P(ctx, x + 8, y + 10, 24, 5, '#4a5468');
    P(ctx, x + 13, y + 34, 14, 3, '#2c3340');
    plume(ctx, x + 20, y + 10, t, 6, 'rgba(220,228,238,AL)', 7, 8, 18);
  },
  ahu(ctx, x, y, t) {
    cabinet(ctx, x + 4, y + 10, 32, 20, '#28313f', '#1d2532');
    fan(ctx, x + 14, y + 20, 6, t, 7);
    // duct arrows
    for (let i = 0; i < 2; i++) {
      const ph = (t * 1.4 + i * 0.5) % 1;
      P(ctx, x + 22 + ph * 9, y + 18, 4, 1, `rgba(160,220,240,${(1 - ph) * 0.7})`);
      P(ctx, x + 22 + ph * 9, y + 22, 4, 1, `rgba(160,220,240,${(1 - ph) * 0.7})`);
    }
  },
  sub(ctx, x, y, t) {
    P(ctx, x + 8, y + 16, 24, 18, '#39414f');
    P(ctx, x + 10, y + 18, 20, 14, '#2a313d');
    for (let i = 0; i < 3; i++) {                    // bushings
      P(ctx, x + 12 + i * 7, y + 8, 3, 9, '#8c939e');
      P(ctx, x + 11 + i * 7, y + 6, 5, 2, '#b9c2cc');
    }
    if (hash(1, (t * 3) | 0) > 0.8) P(ctx, x + 18, y + 4, 2, 3, '#fde68a');   // arc snap
    P(ctx, x + 12, y + 22, 4, 4, Math.sin(t * 2) > 0 ? '#fbbf24' : '#6b5a1e');
  },
  gen(ctx, x, y, t) {
    cabinet(ctx, x + 4, y + 16, 30, 18, '#3d4250', '#2e3340');
    P(ctx, x + 28, y + 6, 4, 12, '#262c38');         // exhaust stack
    plume(ctx, x + 30, y + 6, t, 4, 'rgba(120,120,130,AL)', 5, 8, 14);
    P(ctx, x + 8, y + 20, 10, 10, '#222835');        // engine block
    const v = Math.sin(t * 22) * 0.8;                // vibration
    P(ctx, x + 8, y + 20 + v, 10, 2, '#4a5160');
  },
  pod(ctx, x, y, t, env) {
    cabinet(ctx, x + 5, y + 5, 30, 30, '#15241c', '#0f1d15');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      const heat = 0.5 + 0.5 * Math.sin(t * 3 + hash(env.i, r * 4 + c) * 6);
      P(ctx, x + 8 + c * 6.4, y + 8 + r * 6.4, 5, 5, `rgba(57,230,163,${0.25 + heat * 0.6})`);
    }
  },
  cdu(ctx, x, y, t) {
    cabinet(ctx, x + 7, y + 5, 26, 30, '#1d2c40', '#16233a');
    fan(ctx, x + 20, y + 15, 6, t, 9, '#6db8e8');    // pump impeller
    P(ctx, x + 11, y + 26, 18, 5, '#0e1726');
    const ph = (t * 2) % 1;
    P(ctx, x + 11 + ph * 14, y + 27, 4, 3, 'rgba(110,190,240,.8)');  // flow gauge
  },
  pipe(ctx, x, y, t, env) {
    drawConduit(ctx, x, y, t, env, ['pipe', 'cdu', 'cooler'], '#2c4a66', 'rgba(110,190,240,.9)');
  },
  cooler(ctx, x, y, t) {
    cabinet(ctx, x + 4, y + 8, 32, 26, '#2c3441', '#202833');
    fan(ctx, x + 13, y + 21, 7, t, 5, '#9fb4d8');
    fan(ctx, x + 27, y + 21, 7, t, 5.6, '#9fb4d8');
    plume(ctx, x + 20, y + 8, t, 4, 'rgba(255,170,90,AL)', 8, 7, 12);   // heat shimmer
  },
  turbine(ctx, x, y, t) {
    P(ctx, x + 4, y + 14, 32, 14, '#3a4250');                // casing
    P(ctx, x + 4, y + 16, 6, 10, '#28303d');                 // intake
    fan(ctx, x + 7, y + 21, 4, t, 14, '#8fa2bc');            // compressor
    const fl = 0.5 + 0.5 * Math.sin(t * 17);                 // combustor flicker
    P(ctx, x + 16, y + 17, 8, 8, `rgba(255,${140 + fl * 80},60,${0.7 + fl * 0.3})`);
    P(ctx, x + 30, y + 17, 6, 8, '#262c38');                 // exhaust
    plume(ctx, x + 35, y + 16, t, 5, 'rgba(255,160,80,AL)', 4, 11, 13);
  },
  battery(ctx, x, y, t) {
    cabinet(ctx, x + 6, y + 8, 28, 26, '#2c3340', '#222a36');
    const lvl = 0.5 + 0.45 * Math.sin(t * 0.7);
    for (let i = 0; i < 5; i++) {
      P(ctx, x + 10, y + 28 - i * 4, 20, 3, i / 5 < lvl ? '#39e6a3' : '#1d3a2c');
    }
  },
  solar(ctx, x, y, t, env) {
    P(ctx, x + 4, y + 6, 32, 28, '#0e1a33');
    for (let r = 0; r < 4; r++) for (let c = 0; c < 4; c++) {
      P(ctx, x + 6 + c * 7.6, y + 8 + r * 6.6, 6.4, 5.4, '#16305c');
    }
    // glint sweeping across the cells, sunward side brighter
    const gph = ((t * 0.5 + hash(env.i)) % 1) * 32;
    P(ctx, x + 4 + gph, y + 6, 3, 28, 'rgba(255,238,170,.35)');
    P(ctx, x + 4, y + 6, 3, 28, 'rgba(255,238,170,.25)');
  },
  radiator(ctx, x, y, t, env) {
    P(ctx, x + 6, y + 4, 6, 32, '#3a4254');                  // spine
    const heat = 0.5 + 0.5 * Math.sin(t * 1.6 + hash(env.i) * 4);
    for (let i = 0; i < 7; i++) {                            // glowing fins
      P(ctx, x + 12, y + 5 + i * 4.5, 22, 3, `rgba(${200 + heat * 55},${70 + heat * 60},50,${0.55 + heat * 0.4})`);
    }
    // infrared leaving as expanding arcs
    const ph = (t * 0.8 + hash(env.i, 2)) % 1;
    ctx.strokeStyle = `rgba(255,140,90,${(1 - ph) * 0.5})`;
    ctx.beginPath(); ctx.arc(x + 20, y + 20, 12 + ph * 14, -0.7, 0.7); ctx.stroke();
  },
  laser(ctx, x, y, t) {
    P(ctx, x + 16, y + 18, 8, 16, '#39455c');
    P(ctx, x + 14, y + 12, 12, 8, '#4a5468');
    const on = Math.sin(t * 2.4) > 0.2;
    if (on) {
      P(ctx, x + 19, y + 2, 2, 11, 'rgba(120,240,255,.85)');
      P(ctx, x + 18, y + 1, 4, 2, '#dffaff');
    }
    P(ctx, x + 18, y + 14, 4, 4, on ? '#7ce0ff' : '#27414a');
  },
  collector(ctx, x, y, t, env) {
    // mirrored tile angled at the sun (left)
    ctx.fillStyle = '#caa53d';
    ctx.beginPath();
    ctx.moveTo(x + 6, y + 10); ctx.lineTo(x + 34, y + 6);
    ctx.lineTo(x + 34, y + 30); ctx.lineTo(x + 6, y + 34); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#f5d878';
    ctx.beginPath();
    ctx.moveTo(x + 8, y + 12); ctx.lineTo(x + 32, y + 9);
    ctx.lineTo(x + 32, y + 27); ctx.lineTo(x + 8, y + 31); ctx.closePath(); ctx.fill();
    if (hash(env.i, (t * 2) | 0) > 0.6) P(ctx, x + 10 + hash(env.i, (t * 3) | 0) * 18, y + 12 + hash(env.i, (t * 5) | 0) * 14, 3, 3, '#fffbe8');
  },
  compute(ctx, x, y, t, env) { PART_DRAW.pod(ctx, x, y, t, env); },
  foundry(ctx, x, y, t) {
    P(ctx, x + 4, y + 18, 32, 18, '#4a4136');
    P(ctx, x + 6, y + 20, 28, 14, '#3a332b');
    P(ctx, x + 8, y + 8, 5, 12, '#2e2922');           // chimney
    const glow = 0.5 + 0.5 * Math.sin(t * 5);
    P(ctx, x + 14, y + 24, 12, 8, `rgba(255,${120 + glow * 80},50,${0.6 + glow * 0.4})`);   // forge mouth
    plume(ctx, x + 10, y + 8, t, 4, 'rgba(150,140,130,AL)', 4, 7, 12);
  },
  driver(ctx, x, y, t) {
    // electromagnetic rail launching tiles
    ctx.strokeStyle = '#8c939e'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.moveTo(x + 4, y + 32); ctx.lineTo(x + 34, y + 10); ctx.stroke();
    ctx.lineWidth = 1;
    for (let i = 0; i < 4; i++) P(ctx, x + 7 + i * 8, y + 29 - i * 5.7, 3, 6, '#39455c');
    const ph = (t * 1.1) % 1;
    P(ctx, x + 5 + ph * 28, y + 30 - ph * 21, 4, 3, '#f5d878');   // payload away!
    if (ph > 0.85) P(ctx, x + 33, y + 8, 3, 3, '#fffbe8');
  },
  bh(ctx, x, y, t) {
    const cx = x + 20, cy = y + 20;
    const g = ctx.createRadialGradient(cx, cy, 4, cx, cy, 18);
    g.addColorStop(0, 'rgba(255,200,130,.0)');
    g.addColorStop(0.7, 'rgba(255,180,100,.35)');
    g.addColorStop(1, 'rgba(255,150,80,0)');
    ctx.fillStyle = g; ctx.fillRect(x + 2, y + 2, 36, 36);
    ctx.strokeStyle = 'rgba(255,200,130,.95)'; ctx.lineWidth = 2.5;
    const spin = t * 2.2;
    ctx.beginPath(); ctx.ellipse(cx, cy, 14, 4.5, -0.4, spin % (Math.PI * 2), (spin % (Math.PI * 2)) + Math.PI * 1.5); ctx.stroke();
    ctx.lineWidth = 1;
    ctx.fillStyle = '#000';
    ctx.beginPath(); ctx.arc(cx, cy, 7, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = 'rgba(255,236,200,.95)';
    ctx.beginPath(); ctx.arc(cx, cy, 8.2, 0, Math.PI * 2); ctx.stroke();
  },
  core(ctx, x, y, t, env) {
    cabinet(ctx, x + 6, y + 6, 28, 28, '#241a38', '#1b1230');
    const pulse = 0.5 + 0.5 * Math.sin(t * 3 + hash(env.i) * 6);
    P(ctx, x + 13, y + 13, 14, 14, `rgba(186,140,255,${0.4 + pulse * 0.55})`);
    P(ctx, x + 17, y + 17, 6, 6, '#f4ecff');
  },
  sink(ctx, x, y, t, env) {
    P(ctx, x + 6, y + 6, 28, 28, '#0d1b33');
    P(ctx, x + 8, y + 8, 24, 24, '#122443');
    // frost crystals
    for (let i = 0; i < 6; i++) {
      const fx = x + 10 + hash(env.i, i) * 20, fy = y + 10 + hash(env.i, i + 9) * 20;
      P(ctx, fx, fy, 2, 2, 'rgba(190,230,255,.8)');
      P(ctx, fx - 1, fy + 1, 4, 1, 'rgba(190,230,255,.4)');
    }
    const ph = (t * 0.6 + hash(env.i, 3)) % 1;
    ctx.strokeStyle = `rgba(140,200,255,${(1 - ph) * 0.4})`;
    ctx.beginPath(); ctx.arc(x + 20, y + 20, 14 + ph * 10, 0, Math.PI * 2); ctx.stroke();
  },
  link(ctx, x, y, t, env) {
    drawConduit(ctx, x, y, t, env, ['link', 'bh', 'core'], '#3c2f5e', 'rgba(216,180,254,.95)');
  },
  shield(ctx, x, y, t) {
    ctx.fillStyle = '#3a4254';
    ctx.beginPath();
    ctx.moveTo(x + 20, y + 4); ctx.lineTo(x + 34, y + 12); ctx.lineTo(x + 34, y + 26);
    ctx.lineTo(x + 20, y + 36); ctx.lineTo(x + 6, y + 26); ctx.lineTo(x + 6, y + 12);
    ctx.closePath(); ctx.fill();
    ctx.strokeStyle = `rgba(140,200,255,${0.4 + 0.3 * Math.sin(t * 2)})`;
    ctx.stroke();
    P(ctx, x + 17, y + 16, 6, 8, '#202a3c');
  },
};

// pipes & power links: join up with compatible neighbours, animate the flow
function drawConduit(ctx, x, y, t, env, mates, body, flow) {
  const { cells, i } = env;
  const cx = x + CELL / 2, cy = y + CELL / 2;
  const gx = i % GRID_W, gy = Math.floor(i / GRID_W);
  const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]];
  let any = false;
  for (const [dx, dy] of dirs) {
    const nx = gx + dx, ny = gy + dy;
    if (nx < 0 || ny < 0 || nx >= GRID_W || ny >= GRID_H) continue;
    const p = cells[ny * GRID_W + nx];
    if (!p || !mates.includes(p)) continue;
    any = true;
    // arm toward the neighbour
    ctx.strokeStyle = body; ctx.lineWidth = 7;
    ctx.beginPath(); ctx.moveTo(cx, cy); ctx.lineTo(cx + dx * CELL / 2, cy + dy * CELL / 2); ctx.stroke();
    ctx.lineWidth = 1;
    // flow dashes
    for (let k = 0; k < 2; k++) {
      const ph = (t * 1.6 + k * 0.5 + hash(i, dx * 3 + dy)) % 1;
      ctx.fillStyle = flow;
      ctx.fillRect(cx + dx * ph * CELL / 2 - 1.5, cy + dy * ph * CELL / 2 - 1.5, 3, 3);
    }
  }
  // the joint itself
  P(ctx, cx - 5, cy - 5, 10, 10, body);
  P(ctx, cx - 3, cy - 3, 6, 6, any ? flow.replace('.95', '.5').replace('.9', '.45') : '#27314a');
  if (!any) {   // a stub waiting to be connected
    ctx.strokeStyle = 'rgba(150,160,180,.4)';
    ctx.strokeRect(cx - 7.5, cy - 7.5, 15, 15);
  }
}

// ── the whole scene ─────────────────────────────────────────────────
export function drawDesignScene(ctx, phase, cells, marks, t, hoverI, selPart) {
  // backdrop per facility
  ctx.clearRect(0, 0, DZ_W, DZ_H);
  if (phase <= 1) {
    P(ctx, 0, 0, DZ_W, DZ_H, '#191d28');
    for (let x = 0; x < DZ_W; x += 16) P(ctx, x, 0, 1, DZ_H, 'rgba(60,68,88,.16)');
  } else if (phase <= 3) {
    P(ctx, 0, 0, DZ_W, DZ_H, '#161a24');
    for (let y = 0; y < DZ_H; y += 16) P(ctx, 0, y, DZ_W, 1, 'rgba(60,68,88,.14)');
    P(ctx, 0, 0, DZ_W, 3, '#caa53d'); P(ctx, 0, DZ_H - 3, DZ_W, 3, '#caa53d');   // safety lines
  } else if (phase === 4) {
    P(ctx, 0, 0, DZ_W, DZ_H, '#141822');
    for (let x = 0; x < DZ_W; x += CELL) for (let y = 0; y < DZ_H; y += CELL) {
      if ((x / CELL + y / CELL) % 2 === 0) P(ctx, x, y, CELL, CELL, 'rgba(255,255,255,.015)');
    }
    P(ctx, 0, 0, 3, DZ_H, '#caa53d'); P(ctx, DZ_W - 3, 0, 3, DZ_H, '#caa53d');
  } else {
    // space: stars; for sunward designs the Sun blazes on the left
    P(ctx, 0, 0, DZ_W, DZ_H, '#04060d');
    for (let i = 0; i < 90; i++) {
      const tw = 0.4 + 0.6 * Math.sin(t * (0.5 + hash(i, 3)) + i);
      P(ctx, hash(i, 1) * DZ_W, hash(i, 2) * DZ_H, 1.5, 1.5, `rgba(205,215,240,${0.2 + tw * 0.4})`);
    }
    if (phase === 5 || phase === 6) {
      const g = ctx.createLinearGradient(0, 0, DZ_W * 0.45, 0);
      g.addColorStop(0, `rgba(255,200,90,${0.4 + 0.06 * Math.sin(t * 1.2)})`);
      g.addColorStop(1, 'rgba(255,200,90,0)');
      ctx.fillStyle = g; ctx.fillRect(0, 0, DZ_W * 0.45, DZ_H);
      P(ctx, 0, 0, 4, DZ_H, '#ffd778');
      for (let i = 0; i < 5; i++) {     // sun rays
        const ph = (t * 0.5 + i * 0.2) % 1;
        P(ctx, 4 + ph * 60, 10 + i * (DZ_H - 20) / 4, 10, 1.5, `rgba(255,220,140,${(1 - ph) * 0.5})`);
      }
    }
    if (phase === 7) {
      ctx.strokeStyle = 'rgba(167,139,250,.12)';
      for (let x = 0; x <= DZ_W; x += CELL) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, DZ_H); ctx.stroke(); }
      for (let y = 0; y <= DZ_H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(DZ_W, y); ctx.stroke(); }
    }
  }
  // grid
  ctx.strokeStyle = 'rgba(90,100,130,.22)';
  for (let x = 0; x <= DZ_W; x += CELL) { ctx.beginPath(); ctx.moveTo(x + 0.5, 0); ctx.lineTo(x + 0.5, DZ_H); ctx.stroke(); }
  for (let y = 0; y <= DZ_H; y += CELL) { ctx.beginPath(); ctx.moveTo(0, y + 0.5); ctx.lineTo(DZ_W, y + 0.5); ctx.stroke(); }

  // conduits first (so cabinets sit on top of pipe arms), then the rest
  const draw = (filter) => {
    for (const [iStr, part] of Object.entries(cells)) {
      const i = +iStr;
      const isConduit = part === 'pipe' || part === 'link';
      if (filter !== isConduit) continue;
      const fn = PART_DRAW[part];
      if (!fn) continue;
      fn(ctx, (i % GRID_W) * CELL, Math.floor(i / GRID_W) * CELL, t, { cells, i });
    }
  };
  draw(true); draw(false);

  // status glows + heat shimmer on mistakes
  for (const [iStr, st] of Object.entries(marks || {})) {
    const i = +iStr;
    const x = (i % GRID_W) * CELL, y = Math.floor(i / GRID_W) * CELL;
    const c = st === 'ok' ? '57,230,163' : st === 'warn' ? '251,191,36' : '248,113,113';
    const pulse = st === 'bad' ? 0.55 + 0.3 * Math.sin(t * 5) : 0.5;
    ctx.strokeStyle = `rgba(${c},${pulse})`;
    ctx.lineWidth = 2;
    ctx.strokeRect(x + 1.5, y + 1.5, CELL - 3, CELL - 3);
    ctx.lineWidth = 1;
    if (st === 'bad') plume(ctx, x + CELL / 2, y + 6, t, 4, 'rgba(255,110,90,AL)', 9, 10, 14);
  }

  // hover highlight + ghost of the selected part
  if (hoverI != null && hoverI >= 0) {
    const x = (hoverI % GRID_W) * CELL, y = Math.floor(hoverI / GRID_W) * CELL;
    ctx.strokeStyle = 'rgba(220,230,250,.8)';
    ctx.strokeRect(x + 0.5, y + 0.5, CELL - 1, CELL - 1);
    if (!cells[hoverI] && selPart && PART_DRAW[selPart]) {
      ctx.globalAlpha = 0.35;
      PART_DRAW[selPart](ctx, x, y, t, { cells, i: hoverI });
      ctx.globalAlpha = 1;
    }
  }
}
