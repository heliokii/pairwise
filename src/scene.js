import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import gsap from 'gsap';
import * as T from './textures.js';

const TAU = Math.PI * 2;
const o = (p = {}) => ({ x: 0, y: 0, z: 0, rx: 0, ry: 0, rz: 0, s: 1, ...p });
const OFF = (p = {}) => o({ x: 2.3, y: 0.2, z: -1.5, s: 0.8, ...p });

/*
 * One pose per section. x and y are fractions of the half-viewport (x 0.5 = middle of the right half).
 * `k` holds scalar effects: coin stacks (earn), dark-section light (fx) and the card's light beam.
 * `mid` adds a halfway keyframe so objects arc around each other instead of passing through.
 * `path` replaces a straight move with a curve across the whole section.
 */
export const POSES = {
  hero: {
    card: o({ x: 0.42, y: 0.06, rx: 0.06, ry: -0.38, rz: 0.05, s: 1.2 }),
    usd: o({ x: 0.27, y: -0.42, z: 1, rx: 0.12, ry: 0.45, rz: -0.05, s: 1.15 }),
    php: o({ x: 0.74, y: -0.12, z: 0.6, rx: 0.08, ry: -0.5, s: 1.05 }),
    pair: o({ x: 0.45, y: 1.6, s: 0 }), // waits above, drops in for the CTA
    rings: { x: 0.45, y: 0, s: 1, o: 1 },
    k: { stacks: 0, fx: 0, beam: 0 },
  },
  card: {
    card: o({ x: 0.5, y: -0.02, z: 0.4, ry: -0.15, rz: -0.03, s: 1.32 }),
    // in front of the card: on phones there is no room to pass round its edges to get behind it
    usd: o({ x: 0.2, y: 0.08, z: 1.3, ry: 1.5, rz: 0.15, s: 1 }),
    php: o({ x: 0.82, y: 0.05, z: 1.3, ry: -1.45, rz: -0.1, s: 0.9 }),
    rings: { x: 0.5, y: 0, s: 1.1, o: 1 },
  },
  swap: {
    card: OFF({ ry: -1, rz: 0.2 }),
    usd: o({ x: 0.32, y: 0.12, z: 0.4, rx: 0.05, ry: Math.PI + 0.28, s: 1.45 }),
    php: o({ x: 0.66, y: 0.06, z: -0.7, rx: 0.05, ry: Math.PI - 0.32, s: 1.3 }),
    rings: { x: 0.5, y: 0.08, s: 1.15, o: 1 },
  },
  settle: {
    usd: o({ x: 0.68, y: 0.1, ry: TAU + 0.3, s: 1.3 }),
    php: o({ x: 0.34, y: 0.14, z: 0.4, ry: TAU - 0.3, s: 1.45 }),
    // the coins trade places, dollars over the top and pesos underneath, swapping depth at the widest point
    mid: { usd: { y: 0.62, z: 0.2 }, php: { y: -0.42, z: 0.2 } },
  },
  earn: {
    usd: o({ x: 0.56, y: 0.04, z: 1.2, rx: 0.35, ry: TAU + 0.2, s: 0.75 }),
    php: o({ x: 0.4, y: 0.32, z: -0.5, ry: TAU - 0.2, s: 0.6 }),
    rings: { x: 0.5, y: -0.05, s: 1, o: 0.8 },
    k: { stacks: 1 },
    mid: { usd: { y: -0.35, z: 0.3 }, php: { y: 0.7, z: 0.3 } }, // one dips, one rises, so they pass at the widest point
  },
  send: {
    card: o({ x: 0.92, y: 0.3, z: -0.6, rx: 0.1, ry: -0.6, rz: 0.15, s: 0.8 }),
    usd: o({ x: 0.1, y: 0.72, z: -1, ry: TAU + 0.6, s: 0.6 }),
    path: {
      target: 'php',
      frames: [
        { x: 0.16, y: -0.1, z: 0.6, ry: TAU, s: 0.9 },
        { x: 0.38, y: 0.34, ry: TAU + 1.6 },
        { x: 0.6, y: -0.26, ry: TAU + 3.2 },
        { x: 0.72, y: 0.06, ry: TAU * 2, s: 0.8 },
      ],
    },
    rings: { x: 0.5, y: 0, s: 1, o: 0.7 },
    k: { stacks: 0 },
    mid: { usd: { x: 0.05, y: 0.3, z: 0.4 } }, // left of the pesos first, then up and back
  },
  security: {
    card: o({ x: 0.55, y: 0, z: 0, ry: 1.32, s: 1.5 }), // ~edge-on to the camera at this x
    usd: o({ x: 0.64, y: 0.04, z: 0.7, ry: TAU + 0.25, s: 0.85 }),
    php: o({ x: 0.3, y: -0.32, z: 0.8, ry: TAU * 2 - 0.5, s: 0.6 }),
    rings: { x: 0.55, y: 0, s: 1.35, o: 1 },
    k: { fx: 1, beam: 1 },
    // dollars come over the top, pesos swing toward the camera, both clear of the edge-on card
    mid: { usd: { x: 0.8, y: 0.7, z: 1.2 }, php: { x: 0.55, y: -0.1, z: 1.9 } },
  },
  plans: {
    // a quarter turn back to face-on; a full spin here sweeps through both coins
    card: o({ x: 0.66, y: 0, z: 0.4, ry: -0.3, rz: 0.04, s: 1.35 }),
    usd: o({ x: 0.47, y: 0.62, z: -0.8, ry: TAU + 1.1, s: 0.5 }),
    php: o({ x: 0.86, y: -0.66, z: 0.6, ry: TAU * 2 - 0.6, s: 0.45 }),
    rings: { x: 0.66, y: 0, s: 1, o: 0.9 },
    k: { fx: 0, beam: 0 },
    // dollars stay in front until they clear the card's top edge, pesos dip under its bottom one
    mid: { usd: { x: 0.5, y: 0.8, z: 0.9 }, php: { y: -0.75, z: 1.1 } },
  },
  app: {
    card: o({ x: 0.62, y: 0.5, z: -0.6, rx: 0.55, ry: 0.35, rz: 0.5, s: 0.95 }),
    usd: OFF({ s: 0.5 }),
    php: OFF({ y: -0.3, s: 0.5 }),
    rings: { x: 0.6, y: -0.2, s: 1.2, o: 0.4 },
  },
  faq: {
    card: o({ x: -1.5, y: -0.5, rz: 0.6, s: 0.8 }),
    usd: o({ x: 1.02, y: 0.36, ry: TAU * 2 + 0.4, s: 0.85 }),
    php: o({ x: 1.07, y: -0.02, z: -0.5, ry: TAU * 2 - 0.4, s: 0.55 }),
    rings: { x: 0.95, y: 0.2, s: 0.9, o: 0.5 },
  },
  cta: {
    pair: o({ x: 0, y: 0.04, z: 0.5, rx: 0.12, ry: 0.3, s: 1.75 }),
    card: o({ x: -0.14, y: -0.56, z: 0.2, rx: -1.05, ry: 0.15, rz: 0.55, s: 0.9 }),
    php: o({ x: 0.2, y: -0.52, z: 1, rx: -0.8, ry: TAU * 2, s: 0.45 }),
    usd: o({ x: -0.3, y: 0.5, z: -1, s: 0 }),
    rings: { x: 0, y: 0, s: 1.5, o: 1 },
    k: { fx: 1 },
  },
  // everything drifts up and out so the footer reads clean; y is high enough to leave a phone screen too
  footer: {
    pair: o({ x: 0.25, y: 4.2, z: 0.5, rx: 0.4, ry: 0.3, s: 1.4 }),
    card: o({ x: -0.8, y: 3.9, z: 0.2, rx: -0.6, ry: 0.6, rz: 0.55, s: 0.9 }),
    php: o({ x: 0.55, y: 3.6, z: 1, rx: -0.8, ry: TAU * 2, s: 0.45 }),
    rings: { x: 0, y: 1.2, s: 1.5, o: 0.6 },
    mid: { card: { x: -0.8, y: -0.3 } }, // out to the left first, then up past the coin
  },
};

// Share of each pose move an object waits before starting: the card leads, the coins follow.
export const LAG = { card: 0, usd: 0.08, php: 0.16, pair: 0.08 };

export function createScene(canvas, { reduced = false } = {}) {
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  camera.position.set(0, 0, 12);
  const key = new THREE.DirectionalLight(0xffffff, 1.8);
  key.position.set(3, 4, 6);
  scene.add(key, new THREE.AmbientLight(0xffffff, 0.25));

  /* ---- coins ---- */
  const coinGeo = new THREE.CylinderGeometry(0.62, 0.62, 0.085, 128, 1);
  coinGeo.rotateX(Math.PI / 2).rotateZ(Math.PI / 2); // caps face ±Z, front texture upright
  const faceMat = (t) => new THREE.MeshPhysicalMaterial({
    map: t.map, metalnessMap: t.mr, roughnessMap: t.mr, metalness: 1, roughness: 1,
    bumpMap: t.bump, bumpScale: 3, clearcoat: 0.6, clearcoatRoughness: 0.18,
  });
  const rimMat = (kind) => new THREE.MeshPhysicalMaterial({ map: T.coinRim(kind), metalness: 1, roughness: 0.35 });
  const rimGold = rimMat('usd'), rimSilver = rimMat('php');
  const usdFront = faceMat(T.coinFace('usd', 'front'));
  const phpFront = faceMat(T.coinFace('php', 'front'));

  const usd = new THREE.Mesh(coinGeo, [rimGold, usdFront, faceMat(T.coinFace('usd', 'back', { back: true }))]);
  const php = new THREE.Mesh(coinGeo, [rimSilver, phpFront, faceMat(T.coinFace('php', 'back', { back: true }))]);
  // the toss coin: dollars on heads, pesos on tails
  const pair = new THREE.Mesh(coinGeo, [rimGold, usdFront, faceMat(T.coinFace('php', 'front', { back: true }))]);
  usd.name = 'usd'; php.name = 'php'; pair.name = 'pair';

  const glowTex = T.glow();
  const halo = (color, size) => {
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex, color, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 }));
    s.scale.setScalar(size); s.userData.size = size;
    return s;
  };
  // world-space, not coin children: a child halo swings in front of the face when the coin tilts
  const halos = [[usd, halo(0xffc865, 3.2)], [php, halo(0x6f7cff, 3.2)], [pair, halo(0xffc865, 3.6)]];
  scene.add(...halos.map(([, h]) => h));

  /* ---- card ---- */
  const cardGeo = new RoundedBoxGeometry(1.62, 2.57, 0.035, 6, 0.1);
  const cardFront = new THREE.MeshPhysicalMaterial();
  const cardBack = new THREE.MeshPhysicalMaterial();
  const cardEdge = new THREE.MeshPhysicalMaterial({ metalness: 1, roughness: 0.3 });
  const card = new THREE.Mesh(cardGeo, [cardEdge, cardEdge, cardEdge, cardEdge, cardFront, cardBack]);
  card.name = 'card';
  function setFinish(name) {
    const f = T.FINISHES[name], tx = T.cardTextures(name);
    for (const m of [cardFront, cardBack]) {
      m.map = m === cardFront ? tx.front : tx.back;
      m.metalness = f.metalness; m.roughness = f.roughness; m.clearcoat = f.clearcoat; m.clearcoatRoughness = 0.25;
      m.needsUpdate = true;
    }
    cardEdge.color.set(f.base); cardEdge.metalness = f.metalness;
  }
  setFinish('graphite');

  /* ---- light beam (card seen edge-on in the dark section) ---- */
  const beamTex = T.beam();
  const beamMat = new THREE.MeshBasicMaterial({ map: beamTex, color: 0x9aa6ff, blending: THREE.AdditiveBlending, transparent: true, depthWrite: false, opacity: 0 });
  const beam = new THREE.Group();
  beam.add(new THREE.Mesh(new THREE.PlaneGeometry(0.1, 4.2), beamMat));
  const beamHaloMat = beamMat.clone();
  beam.add(new THREE.Mesh(new THREE.PlaneGeometry(1.1, 4.6), beamHaloMat));

  /* ---- rings (guilloche rosette behind everything) ---- */
  const rings = new THREE.Group();
  const ringA = new THREE.LineBasicMaterial({ transparent: true, depthWrite: false });
  const ringB = ringA.clone();
  for (let i = 0; i < 30; i++) {
    const pts = [];
    const R = 1.25 + i * 0.075, amp = 0.04 + 0.035 * Math.sin(i * 0.7), petals = i % 2 ? 18 : 24;
    for (let t = 0; t < 720; t++) {
      const th = (t / 720) * TAU;
      const r = R + amp * Math.sin(petals * th + i * 0.4);
      pts.push(new THREE.Vector3(Math.cos(th) * r, Math.sin(th) * r, 0));
    }
    rings.add(new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(pts), i % 2 ? ringB : ringA));
  }
  rings.rotation.x = -0.25;

  /* ---- particles: dark dust on light sections, sparks on dark ones ---- */
  const dotTex = T.dot();
  const cloud = (n, seed) => {
    const p = new Float32Array(n * 3);
    let s = seed;
    const r = () => ((s = (s * 16807) % 2147483647) / 2147483647);
    for (let i = 0; i < n; i++) {
      const th = r() * TAU, ph = Math.acos(2 * r() - 1), rad = 1.4 + r() * 2.4;
      p.set([Math.sin(ph) * Math.cos(th) * rad, Math.sin(ph) * Math.sin(th) * rad * 0.8, Math.cos(ph) * rad * 0.6], i * 3);
    }
    return new THREE.BufferGeometry().setAttribute('position', new THREE.BufferAttribute(p, 3));
  };
  const dustMat = new THREE.PointsMaterial({ map: dotTex, size: 0.035, color: 0x2a2833, transparent: true, depthWrite: false, opacity: 0.5 });
  const sparkMat = new THREE.PointsMaterial({ map: dotTex, size: 0.07, color: 0xffe2a8, transparent: true, depthWrite: false, opacity: 0, blending: THREE.AdditiveBlending });
  const dust = new THREE.Points(cloud(500, 42), dustMat);
  const sparks = new THREE.Points(cloud(420, 7), sparkMat);
  rings.add(dust, sparks);

  /* ---- comet trails: the tail fades and narrows behind a moving head, in the shader ---- */
  const trails = [];
  const trailSpec = [
    { color: 0xffc865, rot: [0.5, 0.2, 0.3], R: 2.2, speed: 0.22 },
    { color: 0x7d88ff, rot: [-0.6, 0.4, -0.5], R: 2.6, speed: 0.17 },
    { color: 0xffffff, rot: [1.2, -0.3, 0.9], R: 1.9, speed: 0.27 },
  ];
  const trailMat = (color) => new THREE.ShaderMaterial({
    uniforms: { uColor: { value: new THREE.Color(color) }, uHead: { value: 0 }, uOpacity: { value: 0 } },
    vertexShader: /* glsl */ `
      uniform float uHead;
      varying float vA;
      void main() {
        // uv.x runs along the loop; fract() keeps the tail whole where the loop closes
        vA = clamp(1.0 - fract(uHead - uv.x) / 0.42, 0.0, 1.0);
        vec3 p = position - normal * 0.016 * (1.0 - vA);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(p, 1.0);
      }`,
    fragmentShader: /* glsl */ `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vA;
      void main() {
        gl_FragColor = vec4(uColor, uOpacity * vA * vA);
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
  });
  for (const t of trailSpec) {
    const pts = Array.from({ length: 64 }, (_, i) => {
      const a = (i / 63) * TAU;
      return new THREE.Vector3(Math.cos(a) * t.R, Math.sin(a) * t.R * 0.42, 0);
    });
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const mesh = new THREE.Mesh(new THREE.TubeGeometry(curve, 300, 0.016, 6, true), trailMat(t.color));
    const head = halo(t.color, 0.7);
    const g = new THREE.Group();
    g.add(mesh, head); g.rotation.set(...t.rot);
    rings.add(g);
    trails.push({ mesh, head, curve, speed: t.speed });
  }

  /* ---- coin streaks: a fading ribbon behind each coin while it travels ---- */
  const N = 24;
  // [coin, ink on light sections, glow on dark ones]
  const streaks = [[usd, 0x94701f, 0xffc865], [php, 0x2b35e0, 0x7d88ff], [pair, 0x94701f, 0xffc865]].map(([coin, ink, glow]) => {
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(N * 6), 3));
    geo.setAttribute('color', new THREE.BufferAttribute(new Float32Array(N * 8).fill(1), 4)); // white; alpha set per frame
    geo.setIndex(Array.from({ length: N - 1 }, (_, i) => [2 * i, 2 * i + 1, 2 * i + 2, 2 * i + 1, 2 * i + 3, 2 * i + 2]).flat());
    const mesh = new THREE.Mesh(geo, new THREE.MeshBasicMaterial({ vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide }));
    mesh.frustumCulled = false;
    scene.add(mesh);
    const hist = Array.from({ length: N }, () => new THREE.Vector3());
    return { coin, mesh, hist, ink: new THREE.Color(ink), glow: new THREE.Color(glow), amt: 0, primed: false };
  });
  function updateStreak(st, fx) {
    const { coin, mesh, hist } = st;
    if (!st.primed) { for (const v of hist) v.copy(coin.position); st.primed = true; }
    hist.unshift(hist.pop().copy(coin.position));
    st.amt += (Math.min(1, hist[0].distanceTo(hist[1]) * 14) - st.amt) * 0.12;
    mesh.visible = !reduced && coin.visible && st.amt > 0.02;
    if (!mesh.visible) return;
    mesh.material.color.copy(st.ink).lerp(st.glow, fx);
    const { position: pos, color: col } = mesh.geometry.attributes;
    const r = 0.31 * coin.scale.x;
    for (let i = 0; i < N; i++) {
      const p = hist[i], a = hist[Math.max(0, i - 1)], b = hist[Math.min(N - 1, i + 1)];
      const l = Math.hypot(a.x - b.x, a.y - b.y) || 1;
      const nx = -(a.y - b.y) / l, ny = (a.x - b.x) / l; // across the direction of travel
      const f = 1 - i / (N - 1), w = r * f, alpha = f * f * st.amt * 0.55;
      pos.setXYZ(2 * i, p.x + nx * w, p.y + ny * w, p.z - 0.1);
      pos.setXYZ(2 * i + 1, p.x - nx * w, p.y - ny * w, p.z - 0.1);
      col.setW(2 * i, alpha); col.setW(2 * i + 1, alpha);
    }
    pos.needsUpdate = col.needsUpdate = true;
  }

  /* ---- coin stacks (earn) ---- */
  const stackGeo = new THREE.CylinderGeometry(0.26, 0.26, 0.05, 48);
  const stackFace = faceMat(T.coinFace('usd', 'front'));
  const STACKS = 12, PER = 10;
  const stacks = new THREE.InstancedMesh(stackGeo, [rimGold, stackFace, stackFace], STACKS * PER);
  const heights = Array.from({ length: STACKS }, (_, i) => 4 + ((i * 5) % 7));
  const stackGroup = new THREE.Group();
  stackGroup.add(stacks);
  stackGroup.rotation.x = 0.45;
  const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), v = new THREE.Vector3(), sc = new THREE.Vector3();
  let lastStacks = -1;
  function updateStacks(p) {
    if (Math.abs(p - lastStacks) < 0.002) return;
    lastStacks = p;
    for (let i = 0; i < STACKS; i++) {
      const a = (i / STACKS) * TAU;
      const local = Math.min(1, Math.max(0, p * 1.7 - (i / STACKS) * 0.7));
      const shown = Math.round(heights[i] * local);
      for (let j = 0; j < PER; j++) {
        const on = j < shown;
        v.set(Math.cos(a) * 1.6 + Math.sin(j * 3.1) * 0.015, j * 0.052, Math.sin(a) * 1.6 + Math.cos(j * 2.3) * 0.015);
        e.set(0, j * 0.7 + i, 0); q.setFromEuler(e);
        sc.setScalar(on ? 1 : 0);
        stacks.setMatrixAt(i * PER + j, m4.compose(v, q, sc));
      }
    }
    stacks.instanceMatrix.needsUpdate = true;
  }
  updateStacks(0);

  scene.add(rings, beam, card, usd, php, pair, stackGroup);

  /* ---- state that GSAP tweens ---- */
  const S = {
    card: o(), usd: o(), php: o(), pair: o({ s: 0 }),
    rings: { x: 0.45, y: 0, s: 1, o: 1 },
    k: { stacks: 0, fx: 0, beam: 0 },
  };
  const F = { usd: 0, php: 0, card: 0, pairX: 0, pairZ: 0, lift: 0 }; // user-driven spin offsets
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };
  // entrance still to play, 1 → 0; added on top of the scroll pose so the two never fight
  const I = { card: reduced ? 0 : 1, usd: reduced ? 0 : 1, php: reduced ? 0 : 1 };
  if (!reduced) ['card', 'usd', 'php'].forEach((n, i) => gsap.to(I, { [n]: 0, duration: 1.4, delay: 0.1 + i * 0.12, ease: 'power3.out' }));

  let halfW = 1, halfH = 1, mobile = false, k = 1;
  function resize() {
    // the canvas box, not innerHeight: mobile URL bars change one without the other
    const w = canvas.clientWidth || innerWidth, h = canvas.clientHeight || innerHeight;
    mobile = w <= 900; // same breakpoint as the CSS
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, mobile ? 1.5 : 2));
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    // positions are fractions of the width, so narrower desktops shrink the objects with them (poses are tuned at 16:10)
    k = mobile ? Math.min(0.8, halfW / 2.4) : Math.min(1, camera.aspect / 1.6);
    for (const s of streaks) s.primed = false; // positions jump on resize, so no streak
  }
  resize();
  window.addEventListener('resize', resize);

  function X(px) { return mobile ? (px - S.rings.x) * halfW * 1.25 : px * halfW; }
  function Y(py) { return mobile ? py * halfH * 0.62 - halfH * 0.48 : py * halfH; }

  function place(mesh, p, t, phase, extra = {}, intro = 0) {
    const bob = reduced ? 0 : Math.sin(t * 0.9 + phase) * 0.04;
    mesh.position.set(X(p.x), Y(p.y) + bob + (extra.y || 0) - intro * 1.4, p.z);
    mesh.rotation.set(p.rx + (extra.rx || 0), p.ry + (extra.ry || 0) - intro * 2.4, p.rz + (extra.rz || 0));
    mesh.scale.setScalar(Math.max(1e-4, p.s * k * (1 - intro * 0.5)));
    mesh.visible = p.s > 0.01;
  }

  const lightRing = new THREE.Color(0x8a86a0), darkA = new THREE.Color(0x8a7dff), darkB = new THREE.Color(0xe0b24f);
  const t0 = performance.now();

  function frame() {
    const t = reduced ? 0 : (performance.now() - t0) / 1000;
    const fx = S.k.fx;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    place(card, S.card, t, 0, { ry: F.card + pointer.x * 0.18, rx: -pointer.y * 0.12 }, I.card);
    place(usd, S.usd, t, 1.3, { ry: F.usd }, I.usd);
    place(php, S.php, t, 2.1, { ry: F.php }, I.php);
    place(pair, S.pair, t, 0.4, { rx: F.pairX, rz: F.pairZ, y: F.lift });
    for (const st of streaks) updateStreak(st, fx);

    rings.position.set(X(S.rings.x), Y(S.rings.y), -1.5);
    rings.scale.setScalar(S.rings.s * k * 1.15);
    rings.rotation.z = t * 0.02;
    ringA.color.copy(lightRing).lerp(darkA, fx); ringA.opacity = (0.2 + fx * 0.16) * S.rings.o;
    ringB.color.copy(lightRing).lerp(darkB, fx); ringB.opacity = (0.16 + fx * 0.14) * S.rings.o;
    dustMat.opacity = 0.45 * (1 - fx) * S.rings.o;
    sparkMat.opacity = 0.9 * fx;
    dust.rotation.y = sparks.rotation.y = t * 0.03;

    for (const [coin, h] of halos) {
      h.position.copy(coin.position);
      h.position.z -= coin.scale.x * 0.8; // past the coin's radius, so it stays behind at any tilt
      h.scale.setScalar(h.userData.size * coin.scale.x);
      h.material.opacity = fx * 0.85;
      h.visible = coin.visible && fx > 0.01;
    }
    for (const tr of trails) {
      tr.mesh.material.uniforms.uOpacity.value = fx;
      tr.head.material.opacity = fx;
      tr.mesh.visible = tr.head.visible = fx > 0.01;
      if (!tr.mesh.visible) continue;
      const p = reduced ? 0.6 : (t * tr.speed) % 1;
      tr.mesh.material.uniforms.uHead.value = p;
      tr.head.position.copy(tr.curve.getPointAt(p));
    }

    beam.position.set(card.position.x, card.position.y, card.position.z + 0.05);
    beam.scale.setScalar(k * Math.max(0.6, S.card.s / 1.3));
    beamMat.opacity = S.k.beam;
    beamHaloMat.opacity = S.k.beam * 0.35;
    beam.visible = S.k.beam > 0.01;

    stackGroup.position.set(X(S.rings.x), Y(S.rings.y) - 0.6, 0);
    stackGroup.scale.setScalar(k);
    stackGroup.rotation.y = t * 0.08;
    stackGroup.visible = S.k.stacks > 0.01;
    updateStacks(S.k.stacks);

    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(frame);

  /* ---- interaction: flip coins, drag the card ---- */
  const ray = new THREE.Raycaster(), ndc = new THREE.Vector2();
  const hit = (e) => {
    if (e.target.closest?.('a, button, input, select, label, summary, .panel, .chip, .plan')) return null;
    ndc.set((e.clientX / canvas.clientWidth) * 2 - 1, -(e.clientY / canvas.clientHeight) * 2 + 1);
    ray.setFromCamera(ndc, camera);
    return ray.intersectObjects([usd, php, pair, card], false).find((h) => h.object.visible)?.object || null;
  };
  function flip(name, turns = 1) {
    gsap.to(F, { [name]: `+=${Math.PI * turns}`, duration: reduced ? 0 : 0.9, ease: 'power3.out' });
  }
  let drag = null;
  window.addEventListener('pointermove', (e) => {
    pointer.tx = (e.clientX / innerWidth) * 2 - 1;
    pointer.ty = (e.clientY / innerHeight) * 2 - 1;
    if (drag) { F.card = drag.start + (e.clientX - drag.x) * 0.012; return; }
    if (e.pointerType === 'mouse') {
      const h = hit(e);
      document.body.style.cursor = h ? (h === card ? 'grab' : 'pointer') : '';
    }
  });
  window.addEventListener('pointerdown', (e) => {
    const h = hit(e);
    if (!h) return;
    if (h === card) { drag = { x: e.clientX, start: F.card }; document.body.style.cursor = 'grabbing'; }
    else if (h !== pair) flip(h.name);
  });
  window.addEventListener('pointerup', () => {
    if (!drag) return;
    drag = null; document.body.style.cursor = '';
    gsap.to(F, { card: Math.round(F.card / TAU) * TAU, duration: 0.8, ease: 'power3.out' });
  });

  /** Toss the pair coin end over end. Resolves with 'heads' (dollars) or 'tails' (pesos). */
  function toss() {
    const tails = Math.random() < 0.5;
    const side = tails ? Math.PI : 0;
    const x = Math.ceil((F.pairX + 0.001) / TAU) * TAU + TAU * 4 + side;
    // half a turn about X plus half about Z equals half about Y, the turn the peso face is drawn upright for
    const z = F.pairZ + (((side - F.pairZ) % TAU) + TAU) % TAU;
    const result = tails ? 'tails' : 'heads';
    if (reduced) { Object.assign(F, { pairX: x, pairZ: z }); return Promise.resolve(result); }
    return new Promise((resolve) => {
      gsap.timeline({ onComplete: () => resolve(result) })
        .to(F, { pairX: x, duration: 1.25, ease: 'power2.out' }, 0)
        .to(F, { pairZ: z, duration: 1.25, ease: 'sine.inOut' }, 0)
        .to(F, { lift: 1.2, duration: 0.55, ease: 'power2.out' }, 0)
        .to(F, { lift: 0, duration: 0.6, ease: 'power2.in' }, 0.55);
    });
  }

  return { S, setFinish, flip, toss };
}
