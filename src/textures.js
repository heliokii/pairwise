// Every surface is drawn on a canvas at runtime, so the page ships no images or models.
import * as THREE from 'three';

const F = {
  sans: '"Inter Tight", system-ui, sans-serif',
  serif: '"Instrument Serif", Georgia, serif',
  mono: '"JetBrains Mono", ui-monospace, monospace',
};

export function loadFonts() {
  // the text argument pulls in the latin-ext subset that holds ₱
  return Promise.all([
    document.fonts.load(`700 100px ${F.sans}`, '$₱pairwise'),
    document.fonts.load(`500 40px ${F.mono}`, 'ABC₱$•0'),
  ]).catch(() => {});
}

function canvas(w, h = w) {
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  return [c, c.getContext('2d')];
}

function tex(c, { srgb = true, rotate = false, repeatX = 1 } = {}) {
  const t = new THREE.CanvasTexture(c);
  if (srgb) t.colorSpace = THREE.SRGBColorSpace;
  t.anisotropy = 8;
  if (rotate) { t.center.set(0.5, 0.5); t.rotation = Math.PI; }
  if (repeatX !== 1) { t.wrapS = THREE.RepeatWrapping; t.repeat.x = repeatX; }
  return t;
}

// deterministic noise so textures look the same on every load
function rng(seed) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
}

/* ---------------- coins ---------------- */

const COINS = {
  usd: {
    metal: ['#f8e2a0', '#d9ad55', '#a77a26'], metalDeep: '#5f430f',
    enamel: ['#1b1914', '#0d0c0a'], enamelLine: 'rgba(214, 172, 84, 0.16)',
    symbol: '$', ring: 'ONE DOLLAR · PAIRWISE · SERIES 26 · ',
  },
  php: {
    metal: ['#f4f6fb', '#c9cfdd', '#8f97ad'], metalDeep: '#2b3146',
    enamel: ['#3a48ff', '#1520a6'], enamelLine: 'rgba(255, 255, 255, 0.13)',
    symbol: '₱', ring: 'ISANG PISO · PAIRWISE · SERIES 26 · ',
  },
};
const REVERSE_RING = "HEADS, IT'S DOLLARS · TAILS, IT'S PESOS · MMXXVI · ";

// One drawing routine, three passes: color, metal/rough (G = roughness, B = metalness), and bump height.
const PASS = {
  mr: { metal: 'rgb(0,70,255)', metalDeep: 'rgb(0,150,255)', enamel: 'rgb(0,28,0)', enamelLine: 'rgb(0,40,0)' },
  bump: { metal: '#ffffff', metalDeep: '#8a8a8a', enamel: '#5a5a5a', enamelLine: '#626262' },
};

function drawCoin(ctx, S, spec, pass, side) {
  const c = S / 2;
  const P = PASS[pass];
  const radial = (stops, r) => {
    if (P) return null;
    const g = ctx.createRadialGradient(c - r * 0.3, c - r * 0.35, r * 0.05, c, c, r);
    stops.forEach((s, i) => g.addColorStop(i / (stops.length - 1), s));
    return g;
  };
  const fill = (role, stops, r) => P ? P[role] : (Array.isArray(stops) ? radial(stops, r) : stops);
  const circle = (r) => { ctx.beginPath(); ctx.arc(c, c, r, 0, Math.PI * 2); };

  // metal body + ring band
  ctx.fillStyle = fill('metal', spec.metal, c); circle(c); ctx.fill();
  ctx.strokeStyle = P ? P.metalDeep : spec.metalDeep; ctx.lineWidth = S * 0.006;
  circle(c * 0.975); ctx.stroke();
  circle(c * 0.8); ctx.stroke();

  // engraved ring text
  const text = side === 'back' ? REVERSE_RING : spec.ring;
  ctx.fillStyle = P ? P.metalDeep : spec.metalDeep;
  ctx.font = `500 ${S * 0.062}px ${F.mono}`;
  ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
  const R = c * 0.885;
  let a = -Math.PI / 2;
  const chars = [...text];
  const total = chars.reduce((s, ch) => s + ctx.measureText(ch).width, 0);
  const k = (Math.PI * 2 * R) / total; // stretch so the text closes the circle
  for (const ch of chars) {
    const w = ctx.measureText(ch).width * k;
    a += w / 2 / R;
    ctx.save(); ctx.translate(c + Math.cos(a) * R, c + Math.sin(a) * R); ctx.rotate(a + Math.PI / 2);
    ctx.fillText(ch, 0, 0); ctx.restore();
    a += w / 2 / R;
  }

  // enamel field with guilloche
  ctx.fillStyle = fill('enamel', spec.enamel, c * 0.78); circle(c * 0.78); ctx.fill();
  ctx.save(); circle(c * 0.78); ctx.clip();
  ctx.strokeStyle = P ? P.enamelLine : spec.enamelLine; ctx.lineWidth = S * 0.0012;
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    for (let t = 0; t <= 720; t++) {
      const th = (t / 720) * Math.PI * 2;
      const r = c * (0.56 + 0.13 * Math.sin(14 * th + (i / 24) * Math.PI * 2 / 14 * 3));
      const x = c + Math.cos(th) * r, y = c + Math.sin(th) * r;
      t ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
    }
    ctx.stroke();
  }
  ctx.restore();

  // centre: currency symbol on the front, the pairwise mark on the back
  const deep = P ? P.metalDeep : spec.metalDeep;
  const metal = fill('metal', spec.metal, c * 0.5);
  if (side === 'front') {
    ctx.font = `700 ${S * 0.56}px ${F.sans}`;
    ctx.textBaseline = 'alphabetic';
    const y = c + S * 0.2;
    if (!P) { ctx.fillStyle = deep; ctx.fillText(spec.symbol, c + S * 0.008, y + S * 0.012); }
    ctx.fillStyle = metal; ctx.fillText(spec.symbol, c, y);
  } else {
    const r = c * 0.24, dx = c * 0.13;
    ctx.fillStyle = metal; ctx.beginPath(); ctx.arc(c - dx, c, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = metal; ctx.lineWidth = S * 0.022;
    ctx.beginPath(); ctx.arc(c + dx, c, r * 0.94, 0, Math.PI * 2); ctx.stroke();
  }

  // stardust specks in the enamel, color pass only
  if (!P) {
    const rand = rng(side === 'front' ? 7 : 11);
    for (let i = 0; i < 26; i++) {
      const th = rand() * Math.PI * 2, r = c * (0.2 + rand() * 0.55);
      ctx.fillStyle = `rgba(255,255,255,${0.25 + rand() * 0.5})`;
      ctx.beginPath(); ctx.arc(c + Math.cos(th) * r, c + Math.sin(th) * r, S * (0.0015 + rand() * 0.003), 0, Math.PI * 2); ctx.fill();
    }
  }
}

const coinCache = {};
/** Returns { map, mr, bump } canvases for a coin face. */
function coinCanvases(kind, side) {
  const key = kind + side;
  if (coinCache[key]) return coinCache[key];
  const S = 1024, out = {};
  for (const pass of ['color', 'mr', 'bump']) {
    const [c, ctx] = canvas(S);
    drawCoin(ctx, S, COINS[kind], pass, side);
    out[pass] = c;
  }
  return (coinCache[key] = out);
}

/** Textures for one coin face. `back` faces are rotated so they read upright after a flip about Y. */
export function coinFace(kind, side, { back = false } = {}) {
  const c = coinCanvases(kind, side);
  return {
    map: tex(c.color, { rotate: back }),
    mr: tex(c.mr, { srgb: false, rotate: back }),
    bump: tex(c.bump, { srgb: false, rotate: back }),
  };
}

/** Reeded edge. */
export function coinRim(kind) {
  const [c, ctx] = canvas(256, 32);
  const m = COINS[kind].metal;
  ctx.fillStyle = m[1]; ctx.fillRect(0, 0, 256, 32);
  ctx.fillStyle = COINS[kind].metalDeep;
  for (let x = 0; x < 256; x += 4) ctx.fillRect(x, 0, 1.5, 32);
  return tex(c, { repeatX: 8 });
}

/* ---------------- card ---------------- */

export const FINISHES = {
  graphite: { base: '#1b1c21', streak: [255, 255, 255, 0.05], ink: '#c9ccd6', faint: 'rgba(255,255,255,0.3)', metalness: 0.85, roughness: 0.42, clearcoat: 0.3 },
  ivory: { base: '#efe7d6', streak: [60, 40, 10, 0.035], ink: '#3a342b', faint: 'rgba(58,52,43,0.28)', metalness: 0, roughness: 0.5, clearcoat: 0.7 },
  gold: { base: '#c99d45', streak: [255, 240, 200, 0.08], ink: '#3d2c08', faint: 'rgba(61,44,8,0.35)', metalness: 1, roughness: 0.32, clearcoat: 0.2 },
};

function brushed(ctx, W, H, f, seed) {
  ctx.fillStyle = f.base; ctx.fillRect(0, 0, W, H);
  const rand = rng(seed);
  const [r, g, b, a] = f.streak;
  for (let i = 0; i < 2600; i++) {
    const y = rand() * H, x = rand() * W * 0.6 - W * 0.1, len = W * (0.3 + rand() * 0.9);
    ctx.strokeStyle = `rgba(${r},${g},${b},${a * (0.4 + rand())})`;
    ctx.lineWidth = 0.6 + rand();
    ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + len, y + (rand() - 0.5) * 2); ctx.stroke();
  }
}

const cardCache = {};
/** Portrait card face and back for a finish. */
export function cardTextures(name) {
  if (cardCache[name]) return cardCache[name];
  const f = FINISHES[name];
  const W = 640, H = 1016;

  const [c, ctx] = canvas(W, H);
  brushed(ctx, W, H, f, 3);

  // rosette, top right
  const rx = W - 128, ry = 128;
  ctx.strokeStyle = f.faint; ctx.lineWidth = 1;
  for (let i = 0; i < 22; i++) { ctx.beginPath(); ctx.arc(rx, ry, 18 + i * 4, 0, Math.PI * 2); ctx.stroke(); }
  for (let i = 0; i < 24; i++) {
    ctx.beginPath();
    for (let t = 0; t <= 360; t++) {
      const th = (t / 360) * Math.PI * 2;
      const r = 70 + 26 * Math.sin(9 * th + i * 0.26);
      t ? ctx.lineTo(rx + Math.cos(th) * r, ry + Math.sin(th) * r) : ctx.moveTo(rx + Math.cos(th) * r, ry + Math.sin(th) * r);
    }
    ctx.stroke();
  }
  ctx.fillStyle = f.ink; ctx.beginPath(); ctx.arc(rx, ry, 12, 0, Math.PI * 2); ctx.fill();

  // pairwise mark, top left
  ctx.fillStyle = f.ink; ctx.beginPath(); ctx.arc(76, 104, 24, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = f.ink; ctx.lineWidth = 4; ctx.beginPath(); ctx.arc(104, 104, 22, 0, Math.PI * 2); ctx.stroke();

  // chip
  const cx = 64, cy = 300, cw = 116, ch = 88;
  const g = ctx.createLinearGradient(cx, cy, cx + cw, cy + ch);
  g.addColorStop(0, '#f3d98f'); g.addColorStop(0.5, '#c79a3e'); g.addColorStop(1, '#e8c66f');
  ctx.fillStyle = g; ctx.beginPath(); ctx.roundRect(cx, cy, cw, ch, 14); ctx.fill();
  ctx.strokeStyle = 'rgba(90,60,10,0.55)'; ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(cx, cy + ch / 3); ctx.lineTo(cx + cw, cy + ch / 3);
  ctx.moveTo(cx, cy + (ch * 2) / 3); ctx.lineTo(cx + cw, cy + (ch * 2) / 3);
  ctx.moveTo(cx + cw / 2, cy); ctx.lineTo(cx + cw / 2, cy + ch);
  ctx.stroke();
  ctx.strokeRect(cx + cw * 0.3, cy + ch * 0.28, cw * 0.4, ch * 0.44);

  // contactless
  ctx.strokeStyle = f.ink; ctx.lineWidth = 4; ctx.lineCap = 'round';
  for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.arc(214, cy + ch / 2, 14 + i * 12, -0.7, 0.7); ctx.stroke(); }

  // number and label
  ctx.fillStyle = f.ink; ctx.textBaseline = 'alphabetic'; ctx.textAlign = 'left';
  ctx.font = `500 20px ${F.mono}`; ctx.fillText('DEBIT', 64, H - 132);
  ctx.font = `500 30px ${F.mono}`; ctx.fillText('•••• 0408', 64, H - 84);

  // vertical wordmark, bottom right
  ctx.save(); ctx.translate(W - 64, H - 64); ctx.rotate(-Math.PI / 2);
  ctx.font = `700 76px ${F.sans}`; ctx.fillText('pairwise', 0, 0);
  ctx.restore();

  // stardust
  const rand = rng(5);
  for (let i = 0; i < 36; i++) {
    ctx.fillStyle = `rgba(255,255,255,${0.15 + rand() * 0.5})`;
    ctx.beginPath(); ctx.arc(rand() * W, 200 + rand() * (H - 400), 1 + rand() * 2, 0, Math.PI * 2); ctx.fill();
  }

  // back
  const [b, bctx] = canvas(W, H);
  brushed(bctx, W, H, f, 9);
  bctx.fillStyle = 'rgba(0,0,0,0.55)'; bctx.fillRect(0, 120, W, 96);
  bctx.fillStyle = f.ink; bctx.textAlign = 'center';
  bctx.font = `500 18px ${F.mono}`; bctx.fillText('PAIRWISE · A DESIGN CONCEPT · NOT A REAL CARD', W / 2, H - 72);

  return (cardCache[name] = { front: tex(c), back: tex(b) });
}

/* ---------------- light ---------------- */

export function glow() {
  const [c, ctx] = canvas(256);
  const g = ctx.createRadialGradient(128, 128, 0, 128, 128, 128);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.25, 'rgba(255,255,255,0.35)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 256, 256);
  return tex(c);
}

export function dot() {
  const [c, ctx] = canvas(64);
  const g = ctx.createRadialGradient(32, 32, 0, 32, 32, 32);
  g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.4, 'rgba(255,255,255,0.6)'); g.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = g; ctx.fillRect(0, 0, 64, 64);
  return tex(c);
}

export function beam() {
  const [c, ctx] = canvas(64, 512);
  const gx = ctx.createLinearGradient(0, 0, 64, 0);
  gx.addColorStop(0, 'rgba(255,255,255,0)'); gx.addColorStop(0.5, 'rgba(255,255,255,1)'); gx.addColorStop(1, 'rgba(255,255,255,0)');
  ctx.fillStyle = gx; ctx.fillRect(0, 0, 64, 512);
  ctx.globalCompositeOperation = 'destination-in';
  const gy = ctx.createLinearGradient(0, 0, 0, 512);
  gy.addColorStop(0, 'rgba(0,0,0,0)'); gy.addColorStop(0.2, 'rgba(0,0,0,1)'); gy.addColorStop(0.8, 'rgba(0,0,0,1)'); gy.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = gy; ctx.fillRect(0, 0, 64, 512);
  return tex(c);
}
