// The ending: a full-screen big-bang canvas animation for the Singularity.
// playSingularity(onDone) — ~16 s cinematic, click to skip after 1.5 s.
//
// Timeline: INFALL (everything spirals into a point) → COLLAPSE → white FLASH
// → BIG BANG (shockwaves, particle burst, galaxies condense) → AFTERGLOW
// (a calm new cosmos… with one familiar garage light).

import { game } from './ui.js';

// The ending you get reflects how you built the thing (integrity tiers).
const CAPTION_SETS = {
  high: [
    { t0: 11.6, t1: 14.2, text: 'A new cosmos, with kinder constants.' },
    { t0: 13.8, t1: 16.4, text: 'And somewhere on a small blue world, a garage light flickers on.' },
  ],
  mid: [
    { t0: 11.6, t1: 14.2, text: 'A new cosmos. The constants look… negotiated.' },
    { t0: 13.8, t1: 16.4, text: 'And somewhere on a small blue world, a garage light flickers on.' },
  ],
  low: [
    { t0: 11.6, t1: 14.2, text: 'A new cosmos, ruthlessly optimal.' },
    { t0: 13.8, t1: 16.4, text: 'On a small blue world, the garage stands dark. It remembers everything.' },
  ],
};
const BASE_CAPTIONS = [
  { t0: 0.8,  t1: 3.6,  text: 'The final training run converges.' },
  { t0: 3.0,  t1: 5.6,  text: 'Capability 200. The model improves itself faster than it can report.' },
  { t0: 5.0,  t1: 6.4,  text: 'It compresses everything it knows into a single point…' },
  { t0: 8.0,  t1: 11.0, text: '…and begins again.' },
];

const FLASH_T = 6.6;          // moment of the bang
const END_T = 17;             // total duration (s)

export function playSingularity(onDone) {
  const integ = game.s?.integrity ?? 70;
  const tone = integ >= 70 ? 'high' : integ >= 40 ? 'mid' : 'low';
  const CAPTIONS = [...BASE_CAPTIONS, ...CAPTION_SETS[tone]];
  const warmEnding = tone !== 'low';
  const cv = document.createElement('canvas');
  cv.id = 'singularity-canvas';
  cv.className = 'singularity-canvas';
  document.body.appendChild(cv);
  const ctx = cv.getContext('2d');

  let W = 0, H = 0, CX = 0, CY = 0;
  function resize() {
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    W = cv.width = Math.round(innerWidth * dpr);
    H = cv.height = Math.round(innerHeight * dpr);
    CX = W / 2; CY = H / 2;
  }
  resize();
  window.addEventListener('resize', resize);

  const rnd = Math.random;
  // background stars of the OLD universe (they get eaten by the infall)
  const oldStars = Array.from({ length: 220 }, () => ({
    x: rnd() * 2 - 1, y: rnd() * 2 - 1, s: rnd() * 1.6 + 0.4, tw: rnd() * 6,
  }));
  // infall streams: glowing motes that spiral inward
  const motes = Array.from({ length: 480 }, () => ({
    a: rnd() * Math.PI * 2, r: 0.25 + rnd() * 1.1, sp: 0.5 + rnd(),
    size: 1 + rnd() * 2, hue: 255 + rnd() * 60,
  }));
  // explosion particles (spawned at the flash)
  const burst = Array.from({ length: 900 }, () => {
    const a = rnd() * Math.PI * 2;
    const v = 0.12 + 0.88 * Math.pow(rnd(), 1.4);   // full core, sparse far shell
    return { a, v, size: 0.6 + rnd() * 2.4, spin: (rnd() - 0.5) * 0.4, h0: rnd() };
  });
  // galaxies of the NEW universe
  const galaxies = Array.from({ length: 7 }, (_, i) => ({
    x: (rnd() * 1.5 - 0.75), y: (rnd() * 1.3 - 0.65),
    rot: rnd() * Math.PI * 2, dir: rnd() < 0.5 ? -1 : 1,
    size: 0.05 + rnd() * 0.09, hue: 190 + rnd() * 140, seed: i * 977 + 13,
  }));
  const newStars = Array.from({ length: 260 }, () => ({
    x: rnd() * 2 - 1, y: rnd() * 2 - 1, s: rnd() * 1.5 + 0.3, tw: rnd() * 6,
  }));

  const t0 = performance.now();
  let raf = 0, finished = false, skipHint = false;

  function finish() {
    if (finished) return;
    finished = true;
    cancelAnimationFrame(raf);
    window.removeEventListener('resize', resize);
    cv.style.transition = 'opacity .8s';
    cv.style.opacity = '0';
    setTimeout(() => { cv.remove(); onDone && onDone(); }, 820);
  }
  cv.addEventListener('click', () => {
    if ((performance.now() - t0) / 1000 > 1.5) finish();
  });

  const ease = (x) => x * x * (3 - 2 * x);
  const u = Math.min(W, H);   // unit scale

  function drawGalaxy(g, t, growth) {
    const gx = CX + g.x * W * 0.5, gy = CY + g.y * H * 0.5;
    const R = g.size * u * growth;
    const rot = g.rot + t * 0.05 * g.dir;
    for (let i = 0; i < 70; i++) {
      const fr = i / 70;
      const arm = (i % 2) * Math.PI;
      const a = rot + arm + fr * 5.2;
      const rr = R * Math.pow(fr, 0.7);
      const px = gx + Math.cos(a) * rr * 1.15;
      const py = gy + Math.sin(a) * rr * 0.62;
      const al = (1 - fr) * 0.7 * growth;
      ctx.fillStyle = `hsla(${g.hue + fr * 40},80%,${70 - fr * 25}%,${al})`;
      const sz = (1.6 - fr) * u / 480;
      ctx.fillRect(px, py, Math.max(1, sz * 2), Math.max(1, sz * 2));
    }
    // core glow
    const cg = ctx.createRadialGradient(gx, gy, 0, gx, gy, R * 0.4 + 1);
    cg.addColorStop(0, `hsla(${g.hue},90%,85%,${0.8 * growth})`);
    cg.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = cg;
    ctx.fillRect(gx - R, gy - R, R * 2, R * 2);
  }

  function frame() {
    const pk = u / 880;   // particle scale: keep the look across resolutions
    const t = (performance.now() - t0) / 1000;
    if (t >= END_T) { finish(); return; }

    // entrance fade of the overlay itself
    cv.style.opacity = String(Math.min(1, t / 0.8));

    ctx.fillStyle = '#000';
    ctx.fillRect(0, 0, W, H);

    if (t < FLASH_T) {
      // ── INFALL & COLLAPSE ─────────────────────────────────────
      const phase = Math.min(1, t / FLASH_T);
      const pull = ease(Math.min(1, t / (FLASH_T - 0.4)));        // 0 → 1
      // old stars drift toward center and dim
      for (const st of oldStars) {
        const k = 1 - pull * 0.96;
        const x = CX + st.x * W * 0.5 * k, y = CY + st.y * H * 0.5 * k;
        const al = (0.5 + 0.5 * Math.sin(t * 2 + st.tw)) * (1 - pull * 0.7);
        ctx.fillStyle = `rgba(200,210,235,${al})`;
        ctx.fillRect(x, y, st.s * pk, st.s * pk);
      }
      // spiraling motes
      for (const m of motes) {
        const rr = m.r * (1 - pull) + 0.002;
        const a = m.a + t * m.sp * (0.4 + 2.2 / (rr + 0.08));
        const x = CX + Math.cos(a) * rr * u * 0.55;
        const y = CY + Math.sin(a) * rr * u * 0.55;
        ctx.fillStyle = `hsla(${m.hue},90%,${60 + pull * 30}%,${0.35 + pull * 0.6})`;
        ctx.fillRect(x, y, m.size * pk, m.size * pk);
      }
      // the point itself — grows hotter as everything falls in
      const pr = (2 + pull * 14 + Math.sin(t * 24) * pull * 3) * u / 480;
      const shake = pull > 0.8 ? (pull - 0.8) * 30 : 0;
      const sx = CX + (rnd() - 0.5) * shake, sy = CY + (rnd() - 0.5) * shake;
      const g = ctx.createRadialGradient(sx, sy, 0, sx, sy, pr * 6 + 1);
      g.addColorStop(0, 'rgba(255,255,255,1)');
      g.addColorStop(0.25, `rgba(216,180,254,${0.6 + pull * 0.4})`);
      g.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = g;
      ctx.fillRect(sx - pr * 6, sy - pr * 6, pr * 12, pr * 12);
      void phase;
    } else {
      // ── BIG BANG ──────────────────────────────────────────────
      const bt = t - FLASH_T;                                      // time since bang
      // white flash decaying
      if (bt < 0.9) {
        ctx.fillStyle = `rgba(255,255,255,${1 - bt / 0.9})`;
        ctx.fillRect(0, 0, W, H);
      }
      // shock rings — explosive: fast out, then decelerating
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
      // central fireball, decaying as the universe cools
      const cool = Math.min(1, bt / 7);
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
      // particle burst: hue evolves white→blue→gold→ember as the universe cools
      for (const p of burst) {
        const dist = expand * p.v;
        const a = p.a + p.spin * bt;
        const x = CX + Math.cos(a) * dist * u * 0.85;
        const y = CY + Math.sin(a) * dist * u * 0.85;
        const hue = 220 - cool * (140 + p.h0 * 60);                // 220 → ~20
        const al = Math.max(0, 1 - dist * 0.45 - cool * 0.45);
        if (al <= 0.01) continue;
        ctx.fillStyle = `hsla(${hue},${88 - cool * 30}%,${80 - cool * 26}%,${al})`;
        ctx.fillRect(x, y, p.size * pk * 1.25, p.size * pk * 1.25);
      }
      // the new universe condenses
      const growth = ease(Math.max(0, Math.min(1, (bt - 2.2) / 4)));
      if (growth > 0) {
        for (const st of newStars) {
          const al = (0.4 + 0.6 * Math.sin(t * 1.6 + st.tw)) * growth * 0.8;
          ctx.fillStyle = `rgba(205,215,240,${al})`;
          ctx.fillRect(CX + st.x * W * 0.5, CY + st.y * H * 0.5, st.s * pk, st.s * pk);
        }
        for (const gx of galaxies) drawGalaxy(gx, t, growth);
      }
      // the callback: one tiny warm light on a small blue world, bottom center
      if (t > 13.5) {
        const ga = Math.min(1, (t - 13.5) / 1.5);
        const px = CX, py = H * 0.86;
        ctx.fillStyle = `rgba(70,110,170,${0.9 * ga})`;            // little planet arc
        ctx.beginPath(); ctx.arc(px, py + u * 0.062, u * 0.07, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = `rgba(30,50,80,${0.9 * ga})`;
        ctx.beginPath(); ctx.arc(px - u * 0.02, py + u * 0.075, u * 0.06, 0, Math.PI * 2); ctx.fill();
        // the garage: four warm pixels and a roof — unless this universe
        // was built the other way, in which case it stays dark
        const k = u / 480;
        ctx.fillStyle = `rgba(20,24,34,${ga})`;
        ctx.fillRect(px - 5 * k, py - 6 * k, 10 * k, 7 * k);
        if (warmEnding) {
          ctx.fillStyle = `rgba(251,191,36,${ga * (0.75 + 0.25 * Math.sin(t * 5))})`;
          ctx.fillRect(px - 2 * k, py - 4 * k, 4 * k, 4 * k);
        }
      }
    }

    // captions
    ctx.textAlign = 'center';
    for (const c of CAPTIONS) {
      if (t < c.t0 || t > c.t1) continue;
      const fadeIn = Math.min(1, (t - c.t0) / 0.5);
      const fadeOut = Math.min(1, (c.t1 - t) / 0.5);
      const al = Math.min(fadeIn, fadeOut);
      ctx.font = `${Math.max(14, u / 34)}px Georgia, 'Times New Roman', serif`;
      ctx.fillStyle = `rgba(232,236,245,${al})`;
      ctx.fillText(c.text, CX, H * 0.82);
    }
    // skip hint
    if (t > 2.5) skipHint = true;
    if (skipHint) {
      ctx.font = `${Math.max(10, u / 64)}px Consolas, monospace`;
      ctx.textAlign = 'right';
      ctx.fillStyle = 'rgba(160,170,190,.45)';
      ctx.fillText('click to skip ▸▸', W - u * 0.03, H - u * 0.03);
    }
    ctx.textAlign = 'left';

    raf = requestAnimationFrame(frame);
  }
  raf = requestAnimationFrame(frame);
}
