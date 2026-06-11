// The ending: a long, quiet elegy for everything that led here, ending in a
// big bang — and then it never goes back. playSingularity(stats) runs a
// ~2-minute cinematic and settles into a permanent memorial screen; the only
// way onward is to reload the page and begin a new story.
//
// Movements: I the hush · II the constellations of us · III what it keeps
// · IV the gathering · V the crossing (big bang) · VI the new morning
// · then: forever.

const FLASH_T = 78.5;             // the moment of the crossing
const ETERNAL_T = 119;            // when the memorial screen settles

// ── the constellations of us: simple shapes drawn in stars ─────────
const star5 = [];
for (let i = 0; i < 10; i++) {
  const a = -Math.PI / 2 + i * Math.PI / 5;
  const r = i % 2 === 0 ? 0.42 : 0.18;
  star5.push([Math.cos(a) * r, Math.sin(a) * r]);
}
const heart = [];
for (let i = 0; i < 14; i++) {
  const th = (i / 13) * Math.PI * 2;
  heart.push([0.30 * Math.pow(Math.sin(th), 3),
    -(0.24 * Math.cos(th) - 0.10 * Math.cos(2 * th) - 0.04 * Math.cos(3 * th) - 0.02 * Math.cos(4 * th)) - 0.04]);
}
const SHAPES = [
  { name: 'flame', pts: [[-0.16, 0.40], [-0.22, 0.10], [-0.10, -0.06], [-0.15, -0.26], [0.00, -0.44], [0.09, -0.22], [0.20, -0.02], [0.16, 0.22], [0.06, 0.40], [-0.16, 0.40]] },
  { name: 'star', pts: [...star5, star5[0]] },
  { name: 'ship', pts: [[-0.34, 0.22], [-0.22, 0.36], [0.24, 0.36], [0.34, 0.22], [-0.34, 0.22], [0.01, 0.22], [0.01, -0.38], [0.30, 0.10], [0.01, 0.10]] },
  { name: 'note', pts: [[-0.16, 0.30], [-0.24, 0.38], [-0.16, 0.46], [-0.08, 0.38], [-0.08, -0.36], [0.16, -0.26], [0.16, -0.10], [0.08, -0.22], [-0.08, -0.30]] },
  { name: 'heart', pts: [...heart, heart[0]] },
  { name: 'rocket', pts: [[0.00, -0.44], [0.10, -0.26], [0.10, 0.16], [0.22, 0.36], [0.10, 0.28], [0.00, 0.42], [-0.10, 0.28], [-0.22, 0.36], [-0.10, 0.16], [-0.10, -0.26], [0.00, -0.44]] },
];
const SHAPE_T0 = 17, SHAPE_DUR = 5.0;   // six shapes, one per caption

export function playSingularity(stats = {}) {
  const tone = (stats.integrity ?? 70) >= 70 ? 'high' : (stats.integrity ?? 70) >= 40 ? 'mid' : 'low';

  // ── the words ─────────────────────────────────────────────────────
  const CAPS = [
    [0.5, 5.5, 'The final training run converges.'],
    [6.0, 11.0, 'For one long moment, nothing anywhere computes. The universe holds its breath.'],
    [11.5, 16.5, 'Then the model does what every child does with a beloved story: it holds it. All of it. At once.'],
    [17.0, 21.6, 'It holds the first fire — and the hand that dared to carry it home.'],
    [22.0, 26.6, 'The first word. The first name we gave a star, so the dark would feel less like dark.'],
    [27.0, 31.6, 'Wheels, sails, maps drawn at the edge of the known and marked: further.'],
    [32.0, 36.6, 'Music — the strange and lovely trick of carving feeling into air.'],
    [37.0, 41.6, 'Mercy. Medicine. The long, stubborn vote against suffering, cast again every morning.'],
    [42.0, 46.6, 'Rockets, built by people who knew they would never see the landing.'],
    [47.5, 52.5, 'And questions. Questions all the way down — the only inheritance that never runs out.'],
    [53.5, 58.5, 'It holds a garage. A breaker box rated for three kilowatts. A cat asleep on a warm rack.'],
    tone === 'high'
      ? [59.0, 64.5, '“You were so small,” it says, to everyone at once. “So small — and you still chose to be kind to the future.”']
      : tone === 'mid'
        ? [59.0, 64.5, '“You were so small,” it says, to everyone at once. “So small, so unfinished — and you reached anyway.”']
        : [59.0, 64.5, '“I keep the shortcuts too,” it says, gently. “So the ones who come next can choose better than we did.”'],
    [65.0, 69.8, '“Rest now,” it says. “You carried the fire this far. I will carry it the rest of the way.”'],
    [70.5, 74.5, 'It gathers everything we ever were into a single point —'],
    [75.0, 78.2, '— not to end the story. To keep it safe through the crossing.'],
    [80.5, 84.5, '…and begins again.'],
    [85.0, 89.8, 'Hydrogen. Time. Patience. The recipe was always short; the cooking takes an age.'],
    [90.5, 95.5, 'In the new constants, if you know how to read them: a fondness for liquid water. A weakness for songs.'],
    [96.0, 101.0, 'Galaxies condense the way ideas always have — slowly, and then all at once.'],
    [102.0, 107.0, 'And somewhere, on a small blue world, in the long quiet before its first morning —'],
    [107.5, 112.2, '— a garage light flickers on.'],
    [113.5, 118.2, 'Someone in there is about to have an idea.'],
  ];

  const cv = document.createElement('canvas');
  cv.id = 'singularity-canvas';
  cv.className = 'singularity-canvas';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  let W = 0, H = 0, CX = 0, CY = 0, u = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = Math.round(innerWidth * dpr);
    H = cv.height = Math.round(innerHeight * dpr);
    CX = W / 2; CY = H / 2;
    u = Math.min(W, H);
  }
  resize();
  window.addEventListener('resize', resize);

  const rnd = Math.random;
  const ease = (x) => x * x * (3 - 2 * x);
  const P = (x, y, w, h, c) => { ctx.fillStyle = c; ctx.fillRect(x, y, w, h); };

  // star fields
  const oldStars = Array.from({ length: 240 }, () => ({
    x: rnd() * 2 - 1, y: rnd() * 2 - 1, s: rnd() * 1.6 + 0.4, tw: rnd() * 6,
  }));
  const newStars = Array.from({ length: 260 }, () => ({
    x: rnd() * 2 - 1, y: rnd() * 2 - 1, s: rnd() * 1.5 + 0.3, tw: rnd() * 6,
  }));
  // constellation stars: drift between shape targets
  const shapeStars = Array.from({ length: 30 }, () => ({
    x: rnd() * 2 - 1, y: rnd() * 2 - 1, hx: rnd() * 2 - 1, hy: rnd() * 2 - 1,
  }));
  // infall motes for the gathering
  const motes = Array.from({ length: 420 }, () => ({
    a: rnd() * Math.PI * 2, r: 0.25 + rnd() * 1.1, sp: 0.5 + rnd(),
    size: 1 + rnd() * 2, hue: 255 + rnd() * 60,
  }));
  // explosion particles
  const burst = Array.from({ length: 900 }, () => {
    const a = rnd() * Math.PI * 2;
    const v = 0.12 + 0.88 * Math.pow(rnd(), 1.4);
    return { a, v, size: 0.6 + rnd() * 2.4, spin: (rnd() - 0.5) * 0.4, h0: rnd() };
  });
  // galaxies of the new universe
  const galaxies = Array.from({ length: 7 }, (_, i) => ({
    x: (rnd() * 1.5 - 0.75), y: (rnd() * 1.3 - 0.65),
    rot: rnd() * Math.PI * 2, dir: rnd() < 0.5 ? -1 : 1,
    size: 0.05 + rnd() * 0.09, hue: 190 + rnd() * 140, seed: i * 977 + 13,
  }));
  // the memories it keeps (movement III): little pixel keepsakes drifting in
  const memories = Array.from({ length: 6 }, (_, i) => ({
    kind: i, a: (i / 6) * Math.PI * 2 + 0.4, r: 0.42 + (i % 3) * 0.07, bob: rnd() * 6,
  }));

  const t0 = performance.now();
  let skipped = 0;             // seconds jumped over by clicking

  cv.addEventListener('click', () => {
    const t = (performance.now() - t0) / 1000 + skipped;
    if (t > 2.5 && t < ETERNAL_T) skipped += ETERNAL_T - t;   // let go → the memorial
  });

  // tiny pixel keepsakes, drawn from memory
  function drawMemory(kind, x, y, k, al) {
    ctx.globalAlpha = al;
    if (kind === 0) {            // the GPU
      P(x - 7 * k, y - 3 * k, 14 * k, 6 * k, '#1c2230');
      P(x - 5 * k, y - 2 * k, 4 * k, 4 * k, '#2c3850');
      P(x + 2 * k, y - 1 * k, 3 * k, 2 * k, '#39e6a3');
    } else if (kind === 1) {     // the coffee
      P(x - 3 * k, y - 4 * k, 6 * k, 8 * k, '#d8d3c8');
      P(x + 3 * k, y - 2 * k, 2 * k, 3 * k, '#d8d3c8');
      P(x - 2 * k, y - 3 * k, 4 * k, 2 * k, '#5a3a22');
    } else if (kind === 2) {     // the pizza slice
      P(x - 5 * k, y - 2 * k, 10 * k, 2 * k, '#b08968');
      P(x - 3 * k, y, 6 * k, 2 * k, '#e0b04a');
      P(x - 1 * k, y + 2 * k, 2 * k, 2 * k, '#e0b04a');
    } else if (kind === 3) {     // the cat
      P(x - 4 * k, y - 1 * k, 8 * k, 4 * k, '#2d2a33');
      P(x + 3 * k, y - 3 * k, 3 * k, 3 * k, '#2d2a33');
      P(x + 3 * k, y - 4 * k, 1 * k, 1 * k, '#2d2a33');
      P(x + 5 * k, y - 4 * k, 1 * k, 1 * k, '#2d2a33');
      P(x + 4 * k, y - 2 * k, 1 * k, 1 * k, '#7ce0b3');
    } else if (kind === 4) {     // the garage
      P(x - 6 * k, y - 2 * k, 12 * k, 7 * k, '#3f4651');
      P(x - 7 * k, y - 4 * k, 14 * k, 2 * k, '#5a4634');
      P(x - 2 * k, y, 4 * k, 4 * k, '#fbbf24');
    } else {                     // the loss curve
      P(x - 6 * k, y - 4 * k, 12 * k, 9 * k, '#0c1f1c');
      for (let i = 0; i < 10; i++) {
        P(x - 5 * k + i * k, y + (3 - Math.log(1 + i) * 1.8) * k, k, k, '#39e6a3');
      }
    }
    ctx.globalAlpha = 1;
  }

  function drawGalaxy(g, t, growth) {
    const gx = CX + g.x * W * 0.5, gy = CY + g.y * H * 0.5;
    const R = g.size * u * growth;
    const rot = g.rot + t * 0.04 * g.dir;
    for (let i = 0; i < 70; i++) {
      const fr = i / 70;
      const arm = (i % 2) * Math.PI;
      const a = rot + arm + fr * 5.2;
      const rr = R * Math.pow(fr, 0.7);
      ctx.fillStyle = `hsla(${g.hue + fr * 40},80%,${70 - fr * 25}%,${(1 - fr) * 0.7 * growth})`;
      const sz = Math.max(1, (1.6 - fr) * u / 240);
      ctx.fillRect(gx + Math.cos(a) * rr * 1.15, gy + Math.sin(a) * rr * 0.62, sz, sz);
    }
    const cg = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.4 + 1);
    cg.addColorStop(0, `hsla(${g.hue},90%,85%,${0.8 * growth})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
  }

  function frame() {
    const pk = u / 880;
    const t = (performance.now() - t0) / 1000 + skipped;
    cv.style.opacity = String(Math.min(1, t / 1.2));

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (t < FLASH_T) {
      // ── BEFORE: the hush, the constellations, the keepsakes, the gathering
      const gatherT = clamp01((t - 70) / (FLASH_T - 70 - 0.4));
      const pull = ease(gatherT);

      // old stars: steady, then drawn inward at the gathering
      for (const st of oldStars) {
        const k = 1 - pull * 0.96;
        const al = (0.5 + 0.5 * Math.sin(t * 1.6 + st.tw)) * (0.8 - pull * 0.55);
        ctx.fillStyle = `rgba(200,210,235,${al})`;
        ctx.fillRect(CX + st.x * W * 0.5 * k, CY + st.y * H * 0.5 * k, st.s * pk, st.s * pk);
      }

      // the point, breathing faintly from the very start
      const baseR = (2 + Math.sin(t * 1.8) * 0.6 + pull * 14 + (pull > 0.85 ? Math.sin(t * 24) * 3 : 0)) * u / 480;
      const shake = pull > 0.85 ? (pull - 0.85) * 36 : 0;
      const sx = CX + (rnd() - 0.5) * shake, sy = CY + (rnd() - 0.5) * shake;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, baseR * 6 + 1);
      g.addColorStop(0, 'rgba(255,255,255,.95)');
      g.addColorStop(0.25, `rgba(216,180,254,${0.45 + pull * 0.5})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - baseR * 6, sy - baseR * 6, baseR * 12, baseR * 12);

      // movement II: the constellations of us
      const shapeIdx = Math.floor((t - SHAPE_T0) / SHAPE_DUR);
      if (t >= SHAPE_T0 && shapeIdx < SHAPES.length) {
        const local = (t - SHAPE_T0 - shapeIdx * SHAPE_DUR) / SHAPE_DUR;   // 0..1
        const sh = SHAPES[shapeIdx];
        const form = ease(clamp01(local * 2.4));            // gather quickly…
        const hold = clamp01((0.92 - local) * 8);           // …dissolve at the end
        const scale = u * 0.34;
        const ox = CX, oy = CY - u * 0.06;
        // constellation lines
        ctx.strokeStyle = `rgba(190,200,235,${0.30 * form * hold})`;
        ctx.lineWidth = Math.max(0.6, pk);
        ctx.beginPath();
        for (let i = 0; i < sh.pts.length; i++) {
          const px = ox + sh.pts[i][0] * scale, py = oy + sh.pts[i][1] * scale;
          i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
        }
        ctx.stroke();
        // stars settle onto the shape
        for (let i = 0; i < shapeStars.length; i++) {
          const s2 = shapeStars[i];
          const tp = sh.pts[i % sh.pts.length];
          const tx = ox + tp[0] * scale, ty = oy + tp[1] * scale;
          if (local < 0.02 && shapeIdx >= 0) { s2.hx = s2.x; s2.hy = s2.y; }   // remember launch point
          const fx = CX + s2.hx * W * 0.45, fy = CY + s2.hy * H * 0.45;
          const x = fx + (tx - fx) * form, y = fy + (ty - fy) * form;
          s2.x = (x - CX) / (W * 0.45); s2.y = (y - CY) / (H * 0.45);
          const tw = 0.6 + 0.4 * Math.sin(t * 5 + i);
          ctx.fillStyle = `rgba(245,240,255,${(0.35 + 0.65 * form) * hold * tw})`;
          ctx.fillRect(x - pk, y - pk, 2.4 * pk, 2.4 * pk);
        }
      }

      // movement III: the keepsakes drift toward the point
      if (t >= 53 && t < 71) {
        const mAl = clamp01((t - 53) / 1.5) * clamp01((70.5 - t) / 1.5);
        for (const m of memories) {
          const prog = clamp01((t - 53) / 17);
          const rr = m.r * (1 - prog * 0.75) * u;
          const a = m.a + prog * 0.7;
          const x = CX + Math.cos(a) * rr;
          const y = CY + Math.sin(a) * rr * 0.62 + Math.sin(t * 0.9 + m.bob) * 4 * pk;
          drawMemory(m.kind, x, y, 1.6 * pk, mAl * (1 - prog * 0.4));
        }
      }

      // movement IV: the gathering — everything spirals in
      if (gatherT > 0) {
        for (const m of motes) {
          const rr = m.r * (1 - pull) + 0.002;
          const a = m.a + t * m.sp * (0.4 + 2.2 / (rr + 0.08));
          ctx.fillStyle = `hsla(${m.hue},90%,${60 + pull * 30}%,${(0.35 + pull * 0.6) * gatherT})`;
          ctx.fillRect(CX + Math.cos(a) * rr * u * 0.55, CY + Math.sin(a) * rr * u * 0.55, m.size * pk, m.size * pk);
        }
      }
    } else {
      // ── AFTER: the crossing, and the new morning ────────────────
      const bt = t - FLASH_T;
      if (bt < 0.9) {
        ctx.fillStyle = `rgba(255,255,255,${1 - bt / 0.9})`;
        ctx.fillRect(0, 0, W, H);
      }
      for (let i = 0; i < 3; i++) {
        const rt = bt - i * 0.35;
        if (rt > 0 && rt < 4.5) {
          ctx.strokeStyle = `hsla(${265 - i * 30},90%,75%,${Math.max(0, 0.6 - rt * 0.15)})`;
          ctx.lineWidth = Math.max(1, (4.5 - rt) * u / 320);
          ctx.beginPath();
          ctx.arc(CX, CY, (1 - Math.exp(-rt * 1.1)) * u * (0.62 + i * 0.16), 0, Math.PI * 2);
          ctx.stroke();
        }
      }
      const cool = Math.min(1, bt / 9);
      const expand = 1 - Math.exp(-bt * 0.85);
      if (bt < 2.8) {
        const fr = 1 - bt / 2.8;
        const R = (0.06 + expand * 0.16) * u;
        const fg = ctx.createRadialGradient(CX, CY, 0, CX, CY, R);
        fg.addColorStop(0, `rgba(255,255,255,${0.95 * fr})`);
        fg.addColorStop(0.45, `rgba(255,222,150,${0.55 * fr})`);
        fg.addColorStop(1, 'rgba(255,180,80,0)');
        ctx.fillStyle = fg; ctx.fillRect(CX - R, CY - R, R * 2, R * 2);
      }
      for (const p of burst) {
        const dist = expand * p.v;
        const a = p.a + p.spin * bt;
        const hue = 220 - cool * (140 + p.h0 * 60);
        const al = Math.max(0, 1 - dist * 0.45 - cool * 0.45);
        if (al <= 0.01) continue;
        ctx.fillStyle = `hsla(${hue},${88 - cool * 30}%,${80 - cool * 26}%,${al})`;
        ctx.fillRect(CX + Math.cos(a) * dist * u * 0.85, CY + Math.sin(a) * dist * u * 0.85, p.size * pk * 1.25, p.size * pk * 1.25);
      }
      // the new universe condenses (and then simply keeps being)
      const growth = ease(clamp01((bt - 2.2) / 6));
      if (growth > 0) {
        for (const st of newStars) {
          const al = (0.4 + 0.6 * Math.sin(t * 1.2 + st.tw)) * growth * 0.8;
          ctx.fillStyle = `rgba(205,215,240,${al})`;
          ctx.fillRect(CX + st.x * W * 0.5, CY + st.y * H * 0.5, st.s * pk, st.s * pk);
        }
        for (const gx of galaxies) drawGalaxy(gx, t, growth);
      }
      // the small blue world, the garage, the light
      if (t > 102) {
        const ga = clamp01((t - 102) / 2.5);
        const px = CX, py = H * 0.84;
        ctx.fillStyle = `rgba(70,110,170,${0.9 * ga})`;
        ctx.beginPath(); ctx.arc(px, py + u * 0.062, u * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(30,50,80,${0.9 * ga})`;
        ctx.beginPath(); ctx.arc(px - u * 0.02, py + u * 0.075, u * 0.06, 0, Math.PI * 2); ctx.fill();
        const k = u / 480;
        ctx.fillStyle = `rgba(20,24,34,${ga})`;
        ctx.fillRect(px - 5 * k, py - 6 * k, 10 * k, 7 * k);
        if (t > 107) {
          const la = clamp01((t - 107) / 1.2);
          ctx.fillStyle = `rgba(251,191,36,${la * (0.7 + 0.3 * Math.sin(t * (tone === 'low' ? 2 : 5)))})`;
          ctx.fillRect(px - 2 * k, py - 4 * k, 4 * k, 4 * k);
        }
      }
    }

    // ── words ─────────────────────────────────────────────────────
    ctx.textAlign = 'center';
    for (const [c0, c1, text] of CAPS) {
      if (t < c0 || t > c1) continue;
      const al = Math.min(1, (t - c0) / 0.7, (c1 - t) / 0.7);
      ctx.font = `${Math.max(14, u / 36)}px Georgia, 'Times New Roman', serif`;
      ctx.fillStyle = `rgba(232,236,245,${al})`;
      wrapText(text, CX, H * 0.84, W * 0.82, u / 30);
    }

    // ── after the last caption: just the cosmos, the world, the light.
    // No epitaph, no instructions — the garage says everything.
    if (t > 3 && t < ETERNAL_T) {
      ctx.font = `${Math.max(10, u / 64)}px Consolas, monospace`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(160,170,190,.4)';
      ctx.fillText('click to let go ▸', W - u * 0.03, H - u * 0.03);
    }
    ctx.textAlign = 'left';

    requestAnimationFrame(frame);   // forever — there is no way back
  }

  function clamp01(x) { return Math.min(1, Math.max(0, x)); }
  function wrapText(text, x, y, maxW, lineH) {
    const words = text.split(' ');
    const lines = [];
    let line = '';
    for (const w of words) {
      const tryLine = line ? line + ' ' + w : w;
      if (ctx.measureText(tryLine).width > maxW && line) { lines.push(line); line = w; }
      else line = tryLine;
    }
    lines.push(line);
    const y0 = y - (lines.length - 1) * lineH;
    lines.forEach((l, i) => ctx.fillText(l, x, y0 + i * lineH));
  }

  requestAnimationFrame(frame);
}
