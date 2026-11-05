import './style.css';
import gsap from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { MotionPathPlugin } from 'gsap/MotionPathPlugin';
import Lenis from 'lenis';
import { RATE, APY, swap, earn, fmt } from './money.js';
import { loadFonts } from './textures.js';
import { createScene, POSES, LAG } from './scene.js';

gsap.registerPlugin(ScrollTrigger, MotionPathPlugin);
const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const num = (s) => Math.max(0, parseFloat(String(s).replace(/[^0-9.]/g, '')) || 0);
const two = (n) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
const clock = () => new Date().toTimeString().slice(0, 5);
const BAL = { USD: 3240.18, PHP: 186402.5 };

/* ---------------- smooth scroll ---------------- */
let lenis = null;
if (!reduced) {
  lenis = new Lenis({ autoRaf: false, anchors: true });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add((t) => lenis.raf(t * 1000));
  gsap.ticker.lagSmoothing(0);
}

/* ---------------- live rate ---------------- */
let rate = RATE;
function seriesFor(range) {
  // shortcut: seeded random walk stands in for a rate feed; swap for real data if this ever goes live
  const n = { '1D': 48, '1W': 56, '1M': 60, '1Y': 72 }[range];
  const vol = { '1D': 0.03, '1W': 0.08, '1M': 0.18, '1Y': 0.45 }[range];
  let s = range.charCodeAt(1) * 977, v = rate - vol * 2;
  return Array.from({ length: n }, (_, i) => {
    s = (s * 16807) % 2147483647;
    v += ((s / 2147483647) - 0.47) * vol;
    return i === n - 1 ? rate : v;
  });
}
function pathFor(vals, w, h, close = false) {
  const lo = Math.min(...vals), hi = Math.max(...vals), span = hi - lo || 1;
  const pts = vals.map((v, i) => `${((i / (vals.length - 1)) * w).toFixed(1)},${(h - 4 - ((v - lo) / span) * (h - 8)).toFixed(1)}`);
  return 'M' + pts.join('L') + (close ? `L${w},${h}L0,${h}Z` : '');
}
let range = '1D';
function drawRate() {
  const s = rate.toFixed(2);
  $('[data-rate-a]').textContent = s.slice(0, -1);
  $('[data-rate-b]').textContent = s.slice(-1);
  const vals = seriesFor(range);
  $('[data-chart]').setAttribute('d', pathFor(vals, 240, 72));
  $('[data-chart-area]').setAttribute('d', pathFor(vals, 240, 72, true));
  $('[data-spark]').setAttribute('d', pathFor(seriesFor('1D').slice(-24), 120, 32));
}
function setRate(r) {
  rate = r;
  $$('[data-rate]').forEach((el) => (el.textContent = r.toFixed(2)));
  drawRate();
}
$('[data-range]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('[data-range] button').forEach((x) => x.setAttribute('aria-selected', x === b));
  range = b.textContent.trim();
  drawRate();
});
setRate(rate);
setInterval(() => setRate(+(RATE + (Math.random() - 0.5) * 0.08).toFixed(2)), 4000);

/* ---------------- earned today (hero chip) ---------------- */
const heroDaily = earn(BAL.PHP, APY.PHP).daily;
const dayFrac = () => { const d = new Date(); return (d - new Date(d).setHours(0, 0, 0, 0)) / 864e5; };
setInterval(() => {
  $('[data-earned-today]').textContent = '+₱' + (heroDaily * dayFrac()).toFixed(4);
}, reduced ? 5000 : 120);

/* ---------------- live transactions ---------------- */
const POOL = [
  ['Bakery Uno', 'Pasig', '−₱96.00', 'PHP'], ['Bodega 24', 'Brooklyn', '−$8.75', 'USD'],
  ['Ferry Terminal', 'Batangas', '−₱560.00', 'PHP'], ['Book Nook', 'Iloilo', '−₱740.00', 'PHP'],
  ['Bay Transit', 'San Francisco', '−$2.75', 'USD'], ['Karinderya Lola', 'Quezon City', '−₱150.00', 'PHP'],
];
let poolI = 0;
if (!reduced) setInterval(() => {
  const list = $('[data-tx]');
  const [name, place, amt, cur] = POOL[poolI++ % POOL.length];
  const li = document.createElement('li');
  li.className = 'new';
  li.innerHTML = `<span class="mono muted">${clock()}</span><span><b>${name}</b><small>${place}</small></span><span class="amt">${amt}</span><span class="cur ${cur.toLowerCase()}">${cur}</span>`;
  list.prepend(li);
  list.lastElementChild.remove();
}, 3600);

/* ---------------- swap + settlement ---------------- */
const amountIn = $('[data-amount]');
let from = 'USD', locked = rate, lockLeft = 30;
function updateSwap() {
  const to = from === 'USD' ? 'PHP' : 'USD';
  const r = from === 'USD' ? locked : 1 / locked;
  const amt = num(amountIn.value);
  const { fee, received } = swap(amt, r);
  $('[data-from-sym]').textContent = from === 'USD' ? '$' : '₱';
  $('[data-from-cur]').textContent = from;
  $('[data-to-cur]').textContent = to;
  $('[data-from-bal]').textContent = fmt(BAL[from], from);
  $('[data-received]').textContent = fmt(received, to);
  $('[data-fee]').textContent = fmt(fee, from);
  $('[data-pair-rate]').textContent = from === 'USD' ? locked.toFixed(2) : (1 / locked).toFixed(5);
  $('[data-rate-line]').textContent = `1 ${from} = ${from === 'USD' ? locked.toFixed(2) : (1 / locked).toFixed(5)} ${to}`;
  $('[data-swap-label]').textContent = `Swap ${fmt(amt, from)} to ${to}`;

  const after = { ...BAL };
  after[from] -= amt; after[to] += received;
  $('[data-after-usd]').textContent = fmt(after.USD, 'USD');
  $('[data-after-php]').textContent = fmt(after.PHP, 'PHP');
  const d = (cur) => (cur === from ? '−' : '+') + fmt(cur === from ? amt : received, cur);
  $('[data-delta-usd]').textContent = d('USD');
  $('[data-delta-php]').textContent = d('PHP');
  $('[data-delta-usd]').className = 'mono xs ' + (from === 'USD' ? 'muted' : 'up');
  $('[data-delta-php]').className = 'mono xs ' + (from === 'PHP' ? 'muted' : 'up');
}
amountIn.addEventListener('input', updateSwap);
amountIn.addEventListener('blur', () => { amountIn.value = two(num(amountIn.value)); });
$('[data-dir]').addEventListener('click', () => {
  from = from === 'USD' ? 'PHP' : 'USD';
  amountIn.value = from === 'USD' ? '500.00' : '25,000.00';
  updateSwap();
});
setInterval(() => {
  lockLeft = lockLeft > 1 ? lockLeft - 1 : 30;
  if (lockLeft === 30) { locked = rate; updateSwap(); }
  $('[data-lock]').textContent = `0:${String(lockLeft).padStart(2, '0')}`;
}, 1000);
$('[data-swap]').addEventListener('submit', (e) => {
  e.preventDefault();
  if (!num(amountIn.value)) return amountIn.focus();
  lenis ? lenis.scrollTo('#settle', { duration: 1.2 }) : $('#settle').scrollIntoView();
});
updateSwap();

/* ---------------- earn ---------------- */
const RANGES = {
  USD: { min: 1000, max: 250000, step: 500, value: 25000 },
  PHP: { min: 50000, max: 10000000, step: 10000, value: 1000000 },
};
const rangeIn = $('[data-earn-range]');
const bars = $('[data-bars]');
bars.innerHTML = '<span></span>'.repeat(12);
let ecur = 'USD', earnP = 0, earnNow = earn(25000, APY.USD);
function paintBars() {
  const n = Math.max(1, Math.min(12, Math.ceil(earnP * 12)));
  [...bars.children].forEach((b, i) => {
    b.classList.toggle('on', i < n - 1);
    b.classList.toggle('cur-m', i === n - 1);
  });
  $('[data-month-lbl]').textContent = `Month ${n} +${fmt(earnNow.months[n - 1], ecur)}`;
}
function updateEarn() {
  const bal = +rangeIn.value;
  earnNow = earn(bal, APY[ecur]);
  $('[data-earn-bal]').textContent = fmt(bal, ecur, 0);
  $('[data-earn-total]').textContent = fmt(earnNow.total, ecur);
  $('[data-earn-year]').textContent = '+' + fmt(earnNow.year, ecur);
  $('[data-earn-avg]').textContent = '+' + fmt(earnNow.year / 12, ecur);
  $('[data-apy-txt]').textContent = (APY[ecur] * 100).toFixed(2) + '%';
  $('[data-apy-ring]').setAttribute('stroke-dasharray', `${APY[ecur] * 1000} 100`);
  $('[data-earn-dot]').className = 'coin-dot ' + (ecur === 'USD' ? 'gold' : 'blue');
  const lo = Math.min(...earnNow.months), hi = Math.max(...earnNow.months);
  [...bars.children].forEach((b, i) => b.style.setProperty('--h', `${55 + (45 * (earnNow.months[i] - lo)) / (hi - lo || 1)}%`));
  paintBars();
}
rangeIn.addEventListener('input', updateEarn);
$('[data-earn-cur]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b || b.dataset.cur === ecur) return;
  ecur = b.dataset.cur;
  $$('[data-earn-cur] button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  Object.assign(rangeIn, RANGES[ecur]);
  updateEarn();
});
setInterval(() => {
  $('[data-earn-today]').textContent = fmt(earnNow.daily * dayFrac(), ecur, 5);
}, reduced ? 5000 : 120);
updateEarn();

/* ---------------- send ---------------- */
const sendIn = $('[data-send-amt]');
let scur = 'PHP';
const person = () => $('[data-people] [aria-pressed="true"]');
function updateSend() {
  const p = person();
  const amt = num(sendIn.value);
  $('[data-send-sym]').textContent = scur === 'USD' ? '$' : '₱';
  $('[data-send-bal]').textContent = fmt(BAL[scur], scur);
  $('[data-send] .person small').textContent = scur === 'USD' ? 'Dollar balance' : 'Peso balance';
  $('[data-send-to]').textContent = `${p.dataset.name} · ${p.dataset.place}`;
  $('[data-send-label]').textContent = `Send ${fmt(amt, scur)} to ${p.dataset.name.split(' ')[0]}`;
}
$('[data-people]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  $$('[data-people] button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  updateSend();
});
$('[data-send-cur]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  scur = b.dataset.cur;
  $$('[data-send-cur] button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  sendIn.value = scur === 'USD' ? '40.00' : '2,000.00';
  updateSend();
});
sendIn.addEventListener('input', updateSend);
sendIn.addEventListener('blur', () => { sendIn.value = two(num(sendIn.value)); });
$('[data-send]').addEventListener('submit', (e) => {
  e.preventDefault();
  const btn = e.submitter || $('[data-send] .btn');
  if (!num(sendIn.value)) return sendIn.focus();
  btn.classList.add('sent');
  $('[data-send-label]').textContent = `Sent to ${person().dataset.name.split(' ')[0]} · 1.9 s`;
  setTimeout(() => { btn.classList.remove('sent'); updateSend(); }, 2400);
});
updateSend();

/* ---------------- security ---------------- */
$('[data-freeze]').addEventListener('click', (e) => {
  const sw = e.currentTarget;
  const on = sw.getAttribute('aria-checked') !== 'true';
  sw.setAttribute('aria-checked', on);
  const li = document.createElement('li');
  li.className = 'new';
  li.innerHTML = `<span class="mono muted">${clock()}</span><span>${on ? 'Card frozen' : 'Card unfrozen'}<small>By you · every purchase ${on ? 'blocked' : 'allowed'}</small></span><span class="tag ${on ? 'hold' : 'ok'} mono">${on ? 'Frozen' : 'Active'}</span>`;
  const log = $('[data-log]');
  log.prepend(li);
  if (log.children.length > 4) log.lastElementChild.remove();
});

/* ---------------- plans ---------------- */
let billing = 'm';
let scene = null;
function paintPrices() {
  $$('[data-plans] .plan').forEach((p) => {
    const v = +p.dataset[billing];
    p.querySelector('[data-price]').textContent = v ? '₱' + v.toLocaleString('en-US') : 'Free';
  });
}
function choosePlan(p) {
  $$('[data-plans] .plan').forEach((x) => { x.setAttribute('aria-checked', x === p); x.tabIndex = x === p ? 0 : -1; });
  $('[data-plan-cta]').textContent = `Get ${p.dataset.plan}`;
  $('[data-join-plan]').selectedIndex = $$('[data-plans] .plan').indexOf(p);
  scene?.setFinish(p.dataset.finish);
}
$('[data-plans]').addEventListener('click', (e) => { const p = e.target.closest('.plan'); if (p) choosePlan(p); });
$('[data-plans]').addEventListener('keydown', (e) => {
  const all = $$('[data-plans] .plan');
  const i = all.indexOf(document.activeElement);
  const d = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[e.key];
  if (i < 0 || !d) return;
  e.preventDefault();
  const next = all[(i + d + all.length) % all.length];
  choosePlan(next); next.focus();
});
$('[data-billing]').addEventListener('click', (e) => {
  const b = e.target.closest('button');
  if (!b) return;
  billing = b.dataset.b;
  $$('[data-billing] button').forEach((x) => x.setAttribute('aria-pressed', x === b));
  paintPrices();
});
$('[data-join-plan]').addEventListener('change', (e) => choosePlan($$('[data-plans] .plan')[e.target.selectedIndex]));
choosePlan($('[data-plans] [aria-checked="true"]'));

/* ---------------- faq ---------------- */
$$('[data-faq] details').forEach((d, i) => d.addEventListener('toggle', () => {
  if (d.open) $('[data-faq-no]').textContent = String(i + 1).padStart(2, '0');
}));

/* ---------------- toss + join ---------------- */
const tally = { heads: 0, tails: 0 };
$('[data-toss]').addEventListener('click', async (e) => {
  const btn = e.currentTarget;
  btn.disabled = true;
  $('[data-toss-label]').textContent = 'In the air';
  const side = scene ? await scene.toss() : Math.random() < 0.5 ? 'heads' : 'tails';
  tally[side]++;
  const total = tally.heads + tally.tails;
  $('[data-heads]').textContent = tally.heads;
  $('[data-tails]').textContent = tally.tails;
  $('[data-tosses]').textContent = total;
  $('[data-tally-bar]').style.width = `${(tally.heads / total) * 100}%`;
  $('[data-toss-label]').textContent = side === 'heads' ? 'Heads, dollars. Toss again' : 'Tails, pesos. Toss again';
  btn.disabled = false;
});
$('[data-join]').addEventListener('submit', (e) => {
  e.preventDefault();
  $('[data-join-label]').textContent = "You're on the list";
  $('[data-join-note]').textContent = 'Noted. This is a concept, so nothing was sent anywhere.';
});

$('[data-flip-all]').addEventListener('click', () => { scene?.flip('usd'); scene?.flip('php'); });

/* ---------------- marquees: repeat until they cover the screen, loop by one copy ---------------- */
function fillMarquees() {
  $$('.marquee-track').forEach((t) => {
    t.dataset.unit ??= t.innerHTML;
    t.innerHTML = t.dataset.unit;
    const w = t.scrollWidth;
    t.innerHTML = t.dataset.unit.repeat(Math.ceil(innerWidth / w) + 1);
    t.style.setProperty('--unit', `${w}px`);
    t.style.animationDuration = `${w / 40}s`;
  });
  $$('[data-rate]').forEach((el) => (el.textContent = rate.toFixed(2)));
}

/* ---------------- scroll choreography ---------------- */
const sections = $$('[data-pose]');
let tl = null;
function setPose(P) { for (const k in P) if (k in scene.S) Object.assign(scene.S[k], P[k]); }
function buildTimeline() {
  tl?.scrollTrigger?.kill();
  tl?.kill();
  setPose(POSES.hero);
  const gl = $('#gl');
  gsap.set(gl, { opacity: 1 });
  const vh = innerHeight, max = ScrollTrigger.maxScroll(window);
  const mobile = innerWidth <= 900;
  const top = (el) => el.getBoundingClientRect().top + scrollY; // footer sits inside a section, so not offsetTop
  tl = gsap.timeline({ defaults: { ease: 'sine.inOut' }, paused: true });
  sections.forEach((el, i) => {
    if (!i) return;
    const name = el.dataset.pose, P = POSES[name];
    // on phones the coins sit low on the screen, so they change while the gap between sections passes them
    const start = Math.max(0, Math.min(top(el) - vh * (mobile ? 1.25 : 0.9), max - vh * 0.3));
    const dur = Math.max(1, Math.min(vh * (mobile ? 0.6 : 0.75), max - start));
    for (const k in P) {
      if (k === 'mid') continue;
      if (k === 'path') {
        // runs from mid-entry until the next section starts pulling objects away
        const from = top(el) - vh * 0.5, to = top(el) + el.offsetHeight - vh * 0.9;
        const { x, y, ...rest } = Object.assign({}, ...P.path.frames);
        tl.to(scene.S[P.path.target], { motionPath: { path: P.path.frames.map(({ x, y }) => ({ x, y })), curviness: 1.2 }, ...rest, duration: Math.max(1, to - from) }, from);
        continue;
      }
      const lag = (LAG[k] || 0) * dur, d = k in LAG ? dur * 0.84 : dur;
      const mid = P.mid?.[k];
      tl.to(scene.S[k], { ...(mid ? { keyframes: { '50%': mid, '100%': P[k], easeEach: 'sine.inOut' }, ease: 'none' } : P[k]), duration: d }, start + lag);
    }
    // phones: dim the coins while this section's text scrolls over them, bring them back for the next gap
    if (mobile && name !== 'cta' && name !== 'footer') {
      tl.to(gl, { opacity: 0.25, duration: vh * 0.15 }, start + dur)
        .to(gl, { opacity: 1, duration: vh * 0.15 }, Math.max(start + dur + vh * 0.15, top(el) + el.offsetHeight - vh * 1.4));
    }
  });
  tl.set({}, {}, max);
  ScrollTrigger.create({ animation: tl, start: 0, end: 'max', scrub: reduced ? true : 0.8 });
}

function sectionTriggers() {
  ScrollTrigger.create({
    trigger: '#earn', start: 'top 70%', end: 'bottom 70%',
    onUpdate: (st) => { earnP = st.progress; paintBars(); },
  });
  ScrollTrigger.create({
    trigger: '#settle', start: 'top 70%', end: 'top 20%', scrub: true,
    onUpdate: (st) => $('.settle-bar').style.setProperty('--p', `${st.progress * 100}%`),
  });
}

async function init() {
  fillMarquees();
  sectionTriggers();
  if (!reduced) gsap.from('.hero .col > *, .stats .stat', { y: 10, opacity: 0, duration: 0.5, stagger: 0.05, ease: 'power3.out' });
  await loadFonts();
  fillMarquees();
  try {
    scene = createScene($('#gl'), { reduced });
    choosePlan($('[data-plans] [aria-checked="true"]'));
    buildTimeline();
  } catch (err) {
    console.warn('3D scene unavailable, page stays static', err);
    $('#gl').remove();
  }
  ScrollTrigger.refresh();
  let rt, lastW = innerWidth, lastH = innerHeight;
  window.addEventListener('resize', () => {
    // phone URL bars fire height-only resizes while scrolling; rebuilding then makes the coins jump
    if (innerWidth === lastW && Math.abs(innerHeight - lastH) < 160) return;
    lastW = innerWidth; lastH = innerHeight;
    clearTimeout(rt);
    rt = setTimeout(() => { fillMarquees(); if (scene) buildTimeline(); ScrollTrigger.refresh(); }, 200);
  });
}
init();
