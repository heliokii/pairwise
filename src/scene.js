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
 * `path` replaces a straight move with keyframes across the whole section.
 */
export const POSES = {
  hero: {
    card: o({ x: 0.42, y: 0.06, rx: 0.06, ry: -0.38, rz: 0.05, s: 1.2 }),
    usd: o({ x: 0.27, y: -0.42, z: 1, rx: 0.12, ry: 0.45, rz: -0.05, s: 1.15 }),
    php: o({ x: 0.74, y: -0.12, z: 0.6, rx: 0.08, ry: -0.5, s: 1.05 }),
    pair: o({ x: 0.45, y: -1.6, s: 0 }),
    rings: { x: 0.45, y: 0, s: 1, o: 1 },
    k: { stacks: 0, fx: 0, beam: 0 },
  },
  card: {
    card: o({ x: 0.5, y: -0.02, z: 0.4, ry: -0.15, rz: -0.03, s: 1.32 }),
    usd: o({ x: 0.2, y: 0.08, z: -0.6, ry: 1.5, rz: 0.15, s: 1 }),
    php: o({ x: 0.82, y: 0.05, z: -0.4, ry: -1.45, rz: -0.1, s: 0.9 }),
    rings: { x: 0.5, y: 0, s: 1.1, o: 1 },
  },
  swap: {
    card: OFF({ ry: -1, rz: 0.2 }),
    usd: o({ x: 0.32, y: 0.12, z: 0.4, rx: 0.05, ry: Math.PI + 0.28, s: 1.45 }),
    php: o({ x: 0.66, y: 0.06, rx: 0.05, ry: Math.PI - 0.32, s: 1.3 }),
    rings: { x: 0.5, y: 0.08, s: 1.15, o: 1 },
  },
  settle: {
    usd: o({ x: 0.68, y: 0.1, ry: TAU + 0.3, s: 1.3 }),
    php: o({ x: 0.34, y: 0.14, z: 0.4, ry: TAU - 0.3, s: 1.45 }),
  },
  earn: {
    usd: o({ x: 0.56, y: 0.04, z: 1.2, rx: 0.35, ry: TAU + 0.2, s: 0.75 }),
    php: o({ x: 0.4, y: 0.32, z: -0.5, ry: TAU - 0.2, s: 0.6 }),
    rings: { x: 0.5, y: -0.05, s: 1, o: 0.8 },
    k: { stacks: 1 },
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
  },
  security: {
    card: o({ x: 0.55, y: 0, z: 0, ry: 1.32, s: 1.5 }), // ~edge-on to the camera at this x
    usd: o({ x: 0.64, y: 0.04, z: 0.7, ry: TAU + 0.25, s: 0.85 }),
    php: o({ x: 0.3, y: -0.32, z: 0.8, ry: TAU * 2 - 0.5, s: 0.6 }),
    rings: { x: 0.55, y: 0, s: 1.35, o: 1 },
    k: { fx: 1, beam: 1 },
  },
  plans: {
    card: o({ x: 0.66, y: 0, z: 0.4, ry: TAU - 0.3, rz: 0.04, s: 1.35 }),
    usd: o({ x: 0.47, y: 0.58, z: -0.8, ry: TAU + 1.1, s: 0.5 }),
    php: o({ x: 0.86, y: -0.58, z: 0.6, ry: TAU * 2 - 0.6, s: 0.45 }),
    rings: { x: 0.66, y: 0, s: 1, o: 0.9 },
    k: { fx: 0, beam: 0 },
  },
  app: {
    card: o({ x: 0.62, y: 0.5, z: -0.6, rx: 0.55, ry: TAU + 0.35, rz: 0.5, s: 0.95 }),
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
    card: o({ x: -0.14, y: -0.56, z: 0.2, rx: -1.05, ry: TAU + 0.15, rz: 0.55, s: 0.9 }),
    php: o({ x: 0.2, y: -0.52, z: 1, rx: -0.8, ry: TAU * 2, s: 0.45 }),
    usd: o({ x: -0.3, y: 0.5, z: -1, s: 0 }),
    rings: { x: 0, y: 0, s: 1.5, o: 1 },
    k: { fx: 1 },
  },
  // everything drifts up and out so the footer reads clean
  footer: {
    pair: o({ x: 0, y: 1.9, z: 0.5, rx: 0.4, ry: 0.3, s: 1.4 }),
    card: o({ x: -0.14, y: 1.6, z: 0.2, rx: -0.6, ry: TAU + 0.6, rz: 0.55, s: 0.9 }),
    php: o({ x: 0.2, y: 1.7, z: 1, rx: -0.8, ry: TAU * 2, s: 0.45 }),
    rings: { x: 0, y: 1.2, s: 1.5, o: 0.6 },
  },
};

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
    s.scale.setScalar(size); s.position.z = -0.2;
    return s;
  };
  const halos = [usd.add(halo(0xffc865, 3.2)) && usd.children[0], php.add(halo(0x6f7cff, 3.2)) && php.children[0], pair.add(halo(0xffc865, 3.6)) && pair.children[0]];

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

  /* ---- comet trails ---- */
  const trails = [];
  const trailSpec = [
    { color: 0xffc865, rot: [0.5, 0.2, 0.3], R: 2.2, speed: 0.22 },
    { color: 0x7d88ff, rot: [-0.6, 0.4, -0.5], R: 2.6, speed: 0.17 },
    { color: 0xffffff, rot: [1.2, -0.3, 0.9], R: 1.9, speed: 0.27 },
  ];
  for (const t of trailSpec) {
    const pts = Array.from({ length: 64 }, (_, i) => {
      const a = (i / 63) * TAU;
      return new THREE.Vector3(Math.cos(a) * t.R, Math.sin(a) * t.R * 0.42, 0);
    });
    const curve = new THREE.CatmullRomCurve3(pts, true);
    const geo = new THREE.TubeGeometry(curve, 300, 0.012, 6, true);
    const mat = new THREE.MeshBasicMaterial({ color: t.color, transparent: true, opacity: 0, blending: THREE.AdditiveBlending, depthWrite: false });
    const mesh = new THREE.Mesh(geo, mat);
    const head = halo(t.color, 0.7); head.position.z = 0;
    const g = new THREE.Group();
    g.add(mesh, head); g.rotation.set(...t.rot);
    rings.add(g);
    trails.push({ mesh, head, curve, speed: t.speed, segs: 300, rad: 6 });
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
  const F = { usd: 0, php: 0, pair: 0, card: 0, lift: 0 }; // user-driven spin offsets
  const pointer = { x: 0, y: 0, tx: 0, ty: 0 };

  let halfW = 1, halfH = 1, mobile = false, k = 1;
  function resize() {
    const w = window.innerWidth, h = window.innerHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    halfH = Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    halfW = halfH * camera.aspect;
    mobile = w < 900;
    k = mobile ? Math.min(0.8, halfW / 2.4) : 1;
  }
  resize();
  window.addEventListener('resize', resize);

  function X(px) { return mobile ? (px - S.rings.x) * halfW * 0.9 : px * halfW; }
  function Y(py) { return mobile ? py * halfH * 0.42 - halfH * 0.48 : py * halfH; }

  function place(mesh, p, t, phase, extra = {}) {
    const bob = reduced ? 0 : Math.sin(t * 0.9 + phase) * 0.04;
    mesh.position.set(X(p.x), Y(p.y) + bob + (extra.y || 0), p.z);
    mesh.rotation.set(p.rx + (extra.rx || 0), p.ry + (extra.ry || 0), p.rz);
    mesh.scale.setScalar(Math.max(1e-4, p.s * k));
    mesh.visible = p.s > 0.01;
  }

  const lightRing = new THREE.Color(0x8a86a0), darkA = new THREE.Color(0x8a7dff), darkB = new THREE.Color(0xe0b24f);
  const t0 = performance.now();

  function frame() {
    const t = reduced ? 0 : (performance.now() - t0) / 1000;
    const fx = S.k.fx;
    pointer.x += (pointer.tx - pointer.x) * 0.06;
    pointer.y += (pointer.ty - pointer.y) * 0.06;

    place(card, S.card, t, 0, { ry: F.card + pointer.x * 0.18, rx: -pointer.y * 0.12 });
    place(usd, S.usd, t, 1.3, { ry: F.usd });
    place(php, S.php, t, 2.1, { ry: F.php });
    place(pair, S.pair, t, 0.4, { ry: F.pair, y: F.lift });

    rings.position.set(X(S.rings.x), Y(S.rings.y), -1.5);
    rings.scale.setScalar(S.rings.s * k * 1.15);
    rings.rotation.z = t * 0.02;
    ringA.color.copy(lightRing).lerp(darkA, fx); ringA.opacity = (0.2 + fx * 0.16) * S.rings.o;
    ringB.color.copy(lightRing).lerp(darkB, fx); ringB.opacity = (0.16 + fx * 0.14) * S.rings.o;
    dustMat.opacity = 0.45 * (1 - fx) * S.rings.o;
    sparkMat.opacity = 0.9 * fx;
    dust.rotation.y = sparks.rotation.y = t * 0.03;

    for (const h of halos) h.material.opacity = fx * 0.85;
    for (const tr of trails) {
      tr.mesh.material.opacity = fx;
      tr.head.material.opacity = fx;
      tr.mesh.visible = tr.head.visible = fx > 0.01;
      if (!tr.mesh.visible) continue;
      const p = reduced ? 0.6 : (t * tr.speed) % 1;
      const len = 0.35, from = Math.max(0, p - len);
      const per = tr.rad * 6;
      tr.mesh.geometry.setDrawRange(Math.floor(from * tr.segs) * per, Math.max(per, Math.floor((p - from) * tr.segs) * per));
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
    ndc.set((e.clientX / innerWidth) * 2 - 1, -(e.clientY / innerHeight) * 2 + 1);
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

  /** Toss the pair coin. Resolves with 'heads' (dollars) or 'tails' (pesos). */
  function toss() {
    const tails = Math.random() < 0.5;
    const base = Math.ceil((F.pair + 0.001) / TAU) * TAU;
    const end = base + TAU * 3 + (tails ? Math.PI : 0);
    if (reduced) { F.pair = end; return Promise.resolve(tails ? 'tails' : 'heads'); }
    return new Promise((resolve) => {
      gsap.timeline({ onComplete: () => resolve(tails ? 'tails' : 'heads') })
        .to(F, { pair: end, duration: 1.4, ease: 'power2.out' }, 0)
        .to(F, { lift: 0.9, duration: 0.6, ease: 'power2.out' }, 0)
        .to(F, { lift: 0, duration: 0.8, ease: 'power2.in' }, 0.6);
    });
  }

  return { S, setFinish, flip, toss };
}
