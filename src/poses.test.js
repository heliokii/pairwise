import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as THREE from 'three';
import { OBB } from 'three/examples/jsm/math/OBB.js';
import { POSES, LAG } from './scene.js';

/*
 * Walks every scroll transition the way buildTimeline in main.js does (LAG, mid keyframes, the send path)
 * and checks that no two visible objects pass through each other. Each coin is a box, a little larger
 * than the disc, so the check errs on the side of a clash.
 */
const ORDER = [...readFileSync(new URL('../index.html', import.meta.url), 'utf8').matchAll(/data-pose="(\w+)"/g)].map((m) => m[1]);
const HALF = { card: new THREE.Vector3(0.81, 1.285, 0.0175), coin: new THREE.Vector3(0.62, 0.62, 0.0425) }; // scene.js sizes
const H = 3.44; // half the visible height at z 0: tan(16°) * 12
const LAYOUTS = { // X and Y as in scene.js, at 1440x900 and 390x844
  desktop: { k: 1, X: (x) => x * H * 1.6, Y: (y) => y * H },
  mobile: { k: 0.66, X: (x, ringsX) => (x - ringsX) * H * 0.462 * 1.25, Y: (y) => y * H * 0.62 - H * 0.48 },
};
const OBJECTS = ['card', 'usd', 'php', 'pair'];

const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (1 - Math.cos(Math.PI * t)) / 2; // sine.inOut, the timeline's ease
function at(from, to, mid, t) {
  const out = {};
  for (const key in from) {
    const end = to[key] ?? from[key];
    out[key] = mid && key in mid
      ? (t < 0.5 ? lerp(from[key], mid[key], ease(t * 2)) : lerp(mid[key], end, ease(t * 2 - 1)))
      : lerp(from[key], end, ease(t));
  }
  return out;
}

const dummy = new THREE.Object3D();
function box(name, p, L, ringsX) {
  dummy.position.set(L.X(p.x, ringsX), L.Y(p.y), p.z);
  dummy.rotation.set(p.rx, p.ry, p.rz);
  dummy.scale.setScalar(p.s * L.k);
  dummy.updateMatrix();
  return new OBB(new THREE.Vector3(), (name === 'card' ? HALF.card : HALF.coin).clone()).applyMatrix4(dummy.matrix);
}
// records each clash once per move as "move: a through b, from g to g"
function clashes(S, L, move, g, hits) {
  const names = OBJECTS.filter((n) => S[n].s > 0.01);
  const boxes = names.map((n) => box(n, S[n], L, S.rings.x));
  for (let i = 0; i < names.length; i++) {
    for (let j = i + 1; j < names.length; j++) {
      if (!boxes[i].intersectsOBB(boxes[j])) continue;
      const key = `${move}: ${names[i]} through ${names[j]}`;
      hits.set(key, [hits.get(key)?.[0] ?? g, g]);
    }
  }
}

for (const [layout, L] of Object.entries(LAYOUTS)) {
  test(`no object passes through another while scrolling (${layout})`, () => {
    const S = structuredClone(POSES[ORDER[0]]);
    const hits = new Map();
    for (const name of ORDER.slice(1)) {
      const P = POSES[name], from = structuredClone(S);
      for (let g = 0; g <= 1.0001; g += 0.02) {
        for (const k of [...OBJECTS, 'rings']) {
          if (!P[k]) continue;
          const t = Math.min(1, Math.max(0, (g - (LAG[k] || 0)) / (k in LAG ? 0.84 : 1)));
          S[k] = at(from[k], P[k], P.mid?.[k], t);
        }
        clashes(S, L, `into ${name}`, g, hits);
      }
      if (!P.path) continue;
      // x and y follow the path points, everything else moves straight to the merged end values
      const obj = P.path.target, start = { ...S[obj] }, pts = [start, ...P.path.frames];
      const end = { ...start, ...Object.assign({}, ...P.path.frames) };
      for (let g = 0; g <= 1.0001; g += 0.02) {
        const seg = ease(g) * (pts.length - 1), i = Math.min(Math.floor(seg), pts.length - 2), f = seg - i;
        S[obj] = { ...at(start, end, null, g), x: lerp(pts[i].x, pts[i + 1].x, f), y: lerp(pts[i].y, pts[i + 1].y, f) };
        clashes(S, L, `${name} path`, g, hits);
      }
    }
    assert.deepEqual([...hits].map(([k, [a, b]]) => `${k}, from ${a.toFixed(2)} to ${b.toFixed(2)}`), []);
  });
}
