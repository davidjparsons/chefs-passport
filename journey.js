// journey.js — the 3D trip between the globe and the kitchen:
//   airport boarding line → passport scan → jet bridge → flight (attendant brings food) → arrival.
// Built from simple low-poly shapes with three.js, loaded only when a trip starts, so the rest of
// the game stays light. Exposes window.Journey = { supported(), run(options) }.
(() => {
'use strict';

const THREE_URL = 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js';
const $ = id => document.getElementById(id);
const SKIP = { skip: true };
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const pick = a => a[Math.floor(Math.random() * a.length)];
const rand = (a, b) => a + Math.random() * (b - a);
const ease = k => k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2;
const lin = k => k;
const EMOJI_FONT = '"Segoe UI Emoji","Apple Color Emoji","Noto Color Emoji",sans-serif';

let threeLoading = null;
function loadThree() {
  if (window.THREE) return Promise.resolve();
  if (!threeLoading) threeLoading = new Promise((res, rej) => {
    const s = document.createElement('script');
    s.src = THREE_URL;
    s.onload = res;
    s.onerror = () => { threeLoading = null; s.remove(); rej(new Error('three.js failed to load')); };
    document.head.appendChild(s);
  });
  return threeLoading;
}
function supported() {
  try { const c = document.createElement('canvas'); return !!(c.getContext('webgl') || c.getContext('experimental-webgl')); }
  catch (e) { return false; }
}

// ---------- tiny sound effects (no files needed) ----------
let actx = null;
function tone(freq, dur = 0.15, type = 'sine', vol = 0.12, when = 0) {
  try {
    actx = actx || new (window.AudioContext || window.webkitAudioContext)();
    const t0 = actx.currentTime + when, o = actx.createOscillator(), g = actx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(vol, t0); g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    o.connect(g); g.connect(actx.destination); o.start(t0); o.stop(t0 + dur + 0.05);
  } catch (e) { /* audio unavailable */ }
}
const beep = () => { tone(1320, 0.1, 'square', 0.05); tone(1760, 0.16, 'square', 0.05, 0.11); };
const softBeep = () => tone(1100, 0.08, 'square', 0.025);
const chime = () => { tone(784, 0.7, 'sine', 0.1); tone(523, 1, 'sine', 0.1, 0.5); };
const nom = () => tone(180 + Math.random() * 80, 0.09, 'triangle', 0.12);

// =====================================================================
// RUNTIME: renderer, game clock, cancellable waits, look-around controls
// =====================================================================
let R = null;   // the running trip

function start(o) {
  const renderer = new THREE.WebGLRenderer({ antialias: (window.devicePixelRatio || 1) < 2, powerPreference: 'low-power' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.5));
  renderer.setSize(window.innerWidth, window.innerHeight);
  renderer.outputEncoding = THREE.sRGBEncoding;
  $('jStage').appendChild(renderer.domElement);
  const camera = new THREE.PerspectiveCamera(70, window.innerWidth / window.innerHeight, 0.05, 1200);
  camera.rotation.order = 'YXZ';
  R = {
    o, renderer, camera, scene: null, mats: new Map(), geos: new Map(), textures: [],
    time: 0, speed: 1, last: performance.now(), running: true, aborted: false,
    updaters: [], cancels: new Set(), clickables: [],
    look: { baseYaw: 0, basePitch: 0, yaw: 0, pitch: 0 }, drag: null,
  };
  const el = renderer.domElement;
  el.style.touchAction = 'none';
  el.addEventListener('pointerdown', onDown);
  window.addEventListener('pointermove', onMove);
  window.addEventListener('pointerup', onUp);
  window.addEventListener('resize', onResize);
  $('jSkip').onclick = abort;
  $('jFast').onclick = () => { R.speed = R.speed === 1 ? 3 : 1; $('jFast').classList.toggle('on', R.speed > 1); $('jFast').textContent = R.speed > 1 ? '⏩ Speeding up' : '⏩ Speed up'; };
  $('jFast').classList.remove('on'); $('jFast').textContent = '⏩ Speed up';
  setPrompt(''); hideChoices(); $('jAction').innerHTML = '';
  requestAnimationFrame(frame);
}

function stop() {
  if (!R) return;
  R.running = false;
  disposeScene();
  R.renderer.dispose();
  R.renderer.domElement.remove();
  window.removeEventListener('pointermove', onMove);
  window.removeEventListener('pointerup', onUp);
  window.removeEventListener('resize', onResize);
  R = null;
}

function abort() {
  if (!R || R.aborted) return;
  R.aborted = true;
  R.updaters = [];
  for (const c of [...R.cancels]) c();
}

function frame(now) {
  if (!R || !R.running) return;
  const dt = Math.min(0.1, (now - R.last) / 1000);   // cap so a slow frame doesn't jump ahead
  R.last = now;
  const gdt = dt * R.speed;
  R.time += gdt;
  for (const u of R.updaters.slice()) u(gdt, R.time);
  const L = R.look;
  R.camera.rotation.set(L.basePitch + L.pitch, L.baseYaw + L.yaw, 0);
  if (R.scene) R.renderer.render(R.scene, R.camera);
  requestAnimationFrame(frame);
}

function onResize() {
  if (!R) return;
  R.renderer.setSize(window.innerWidth, window.innerHeight);
  R.camera.aspect = window.innerWidth / window.innerHeight;
  R.camera.updateProjectionMatrix();
}

// look around by dragging; a tap (no drag) clicks whatever 3D object is under the pointer
function onDown(e) { R.drag = { x: e.clientX, y: e.clientY, yaw: R.look.yaw, pitch: R.look.pitch, moved: false }; }
function onMove(e) {
  if (!R || !R.drag) return;
  const d = R.drag, dx = e.clientX - d.x, dy = e.clientY - d.y;
  if (Math.hypot(dx, dy) > 6) d.moved = true;
  R.look.yaw = Math.max(-1.9, Math.min(1.9, d.yaw + dx * 0.005));
  R.look.pitch = Math.max(-0.9, Math.min(0.8, d.pitch + dy * 0.005));
}
function onUp(e) {
  if (!R || !R.drag) return;
  const d = R.drag; R.drag = null;
  if (d.moved || !R.clickables.length) return;
  const ndc = new THREE.Vector2(e.clientX / window.innerWidth * 2 - 1, -(e.clientY / window.innerHeight) * 2 + 1);
  const ray = new THREE.Raycaster();
  ray.setFromCamera(ndc, R.camera);
  const hits = ray.intersectObjects(R.clickables.map(c => c.obj), true);
  if (!hits.length) return;
  let o = hits[0].object;
  while (o) { const c = R.clickables.find(k => k.obj === o); if (c) return c.fn(); o = o.parent; }
}

// ---- cancellable timing on the game clock (Speed up makes everything faster; Skip cancels it all) ----
function cancellable(setup) {
  return new Promise((res, rej) => {
    if (!R || R.aborted) return rej(SKIP);
    let cancel = null;
    const done = v => { R && R.cancels.delete(cancel); res(v); };
    cancel = () => { R.cancels.delete(cancel); rej(SKIP); };
    R.cancels.add(cancel);
    setup(done);
  });
}
const off = u => { if (R) R.updaters = R.updaters.filter(x => x !== u); };
const every = fn => { R.updaters.push(fn); return fn; };
const sleep = s => cancellable(done => { const at = R.time + s; every(function u() { if (R.time >= at) { off(u); done(); } }); });
const tween = (dur, fn, ez = ease) => cancellable(done => {
  const t0 = R.time;
  const u = every(() => { const k = Math.min(1, (R.time - t0) / dur); fn(ez(k)); if (k >= 1) { off(u); done(); } });
  fn(0);
});
// background tasks (an NPC wandering off) must not leave unhandled rejections when skipped
const bg = p => { p.catch(() => {}); return p; };

function lookAt(x, y, z, dur = 0.8) {
  const c = R.camera.position, L = R.look;
  const yaw = Math.atan2(-(x - c.x), -(z - c.z)), pitch = Math.atan2(y - c.y, Math.hypot(x - c.x, z - c.z));
  const y0 = L.baseYaw, p0 = L.basePitch, uy = L.yaw, up = L.pitch;
  let dy = yaw - y0; dy = Math.atan2(Math.sin(dy), Math.cos(dy));
  return tween(dur, k => { L.baseYaw = y0 + dy * k; L.basePitch = p0 + (pitch - p0) * k; L.yaw = uy * (1 - k); L.pitch = up * (1 - k); });
}
function setView(x, y, z, yaw, pitch = 0) {
  R.camera.position.set(x, y, z);
  Object.assign(R.look, { baseYaw: yaw, basePitch: pitch, yaw: 0, pitch: 0 });
}
// first-person walk with a gentle head bob
function walkCam(x, z, speed = 2.2, eye = 1.6) {
  const c = R.camera.position, x0 = c.x, z0 = c.z, dist = Math.hypot(x - x0, z - z0);
  return tween(Math.max(0.3, dist / speed), k => {
    c.x = x0 + (x - x0) * k; c.z = z0 + (z - z0) * k;
    c.y = eye + Math.abs(Math.sin(k * dist * 2.2)) * 0.035;
  }, lin);
}

// ---------- overlay UI ----------
function setTitle(t, s) { $('jTitle').innerHTML = t; $('jSub').innerHTML = s || ''; }
function setPrompt(html) { const p = $('jPrompt'); p.innerHTML = html; p.classList.toggle('hidden', !html); }
function hideChoices() { $('jChoices').classList.add('hidden'); $('jChoices').innerHTML = ''; }
function choose(question, options) {
  return cancellable(done => {
    const box = $('jChoices');
    box.innerHTML = `<div class="jq">${question}</div><div class="jopts">${options.map((o, i) =>
      `<button data-i="${i}"><span>${o.emoji}</span>${esc(o.label)}</button>`).join('')}</div>`;
    box.classList.remove('hidden');
    box.querySelectorAll('button').forEach(b => b.onclick = () => { hideChoices(); done(options[+b.dataset.i]); });
  });
}
// wait for a tap on a 3D object or on the big on-screen button
function waitAction(label, objects = []) {
  return cancellable(done => {
    const finish = () => { R.clickables = R.clickables.filter(c => !objects.includes(c.obj)); $('jAction').innerHTML = ''; done(); };
    objects.forEach(obj => R.clickables.push({ obj, fn: finish }));
    $('jAction').innerHTML = `<button class="j-go">${label}</button>`;
    $('jAction').firstChild.onclick = finish;
  });
}
function fade(on) {
  $('jFade').classList.toggle('on', on);
  return new Promise(r => setTimeout(r, 550));
}

// =====================================================================
// BUILDING BLOCKS (shared geometries/materials per scene, freed when the scene ends)
// =====================================================================
function newScene(sky, fogNear, fogFar) {
  disposeScene();
  const s = new THREE.Scene();
  s.background = new THREE.Color(sky);
  if (fogFar) s.fog = new THREE.Fog(sky, fogNear, fogFar);
  R.scene = s; R.clickables = []; R.updaters = [];
  return s;
}
function disposeScene() {
  if (!R || !R.scene) return;
  R.geos.forEach(g => g.dispose()); R.mats.forEach(m => m.dispose()); R.textures.forEach(t => t.dispose());
  R.scene.traverse(o => { if (o.isInstancedMesh || o.userData.ownGeo) o.geometry.dispose(); if (o.material && o.userData.ownMat) o.material.dispose(); });
  R.geos = new Map(); R.mats = new Map(); R.textures = []; R.scene = null;
}
function mat(color, opts) {
  const key = 'L' + color + (opts ? JSON.stringify(opts) : '');
  if (!R.mats.has(key)) R.mats.set(key, new THREE.MeshLambertMaterial(Object.assign({ color }, opts || {})));
  return R.mats.get(key);
}
function geo(key, make) { if (!R.geos.has(key)) R.geos.set(key, make()); return R.geos.get(key); }
function mesh(g, m, x = 0, y = 0, z = 0, parent = R.scene) {
  const o = new THREE.Mesh(g, typeof m === 'object' ? m : mat(m));
  o.position.set(x, y, z); parent.add(o); return o;
}
function box(w, h, d, color, x, y, z, parent) {
  const o = mesh(geo('box', () => new THREE.BoxGeometry(1, 1, 1)), color, x, y, z, parent);
  o.scale.set(w, h, d); return o;
}
const sph = (r, color, x, y, z, parent, ws = 12, hs = 9) => mesh(geo(`s${r}|${ws}|${hs}`, () => new THREE.SphereGeometry(r, ws, hs)), color, x, y, z, parent);
const cyl = (rt, rb, h, color, x, y, z, parent, seg = 12) => mesh(geo(`c${rt}|${rb}|${h}|${seg}`, () => new THREE.CylinderGeometry(rt, rb, h, seg)), color, x, y, z, parent);
const cone = (r, h, color, x, y, z, parent, seg = 10) => mesh(geo(`k${r}|${h}|${seg}`, () => new THREE.ConeGeometry(r, h, seg)), color, x, y, z, parent);
function group(x = 0, y = 0, z = 0, parent = R.scene) { const g = new THREE.Group(); g.position.set(x, y, z); parent.add(g); return g; }

function canvasTex(w, h, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  const tex = new THREE.CanvasTexture(canvas);
  tex.encoding = THREE.sRGBEncoding;
  R.textures.push(tex);
  const t = { canvas, ctx, tex, redraw(fn) { (fn || draw)(ctx, w, h); tex.needsUpdate = true; } };
  t.redraw(draw);
  return t;
}
// a flat picture (sign, screen, board) facing +z
function panel(w, h, tex, x, y, z, parent, lit = false) {
  const m = lit ? new THREE.MeshBasicMaterial({ map: tex }) : new THREE.MeshLambertMaterial({ map: tex });
  const o = mesh(geo(`p${w}|${h}`, () => new THREE.PlaneGeometry(w, h)), m, x, y, z, parent);
  o.userData.ownMat = true; return o;
}
const emojiCache = new Map();
function emojiTex(e) {
  if (emojiCache.has(e) && R.textures.includes(emojiCache.get(e))) return emojiCache.get(e);
  const t = canvasTex(128, 128, (ctx, w, h) => {
    ctx.font = `100px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(e, w / 2, h / 2 + 6);
  }).tex;
  emojiCache.set(e, t); return t;
}
function emojiSprite(e, size, x, y, z, parent = R.scene) {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: emojiTex(e), transparent: true }));
  s.userData.ownMat = true;
  s.scale.set(size, size, 1); s.position.set(x, y, z); parent.add(s); return s;
}
function loadImage(url) {
  return new Promise(res => {
    const img = new Image(); img.crossOrigin = 'anonymous';
    img.onload = () => res(img); img.onerror = () => res(null); img.src = url;
  });
}

// ---------- people ----------
const SKINS = [0xf1c27d, 0xe0ac69, 0xc68642, 0x8d5524, 0xffdbac, 0x6b4423];
const HAIRS = [0x2b1d12, 0x4a2f1b, 0x111111, 0x8a5a2b, 0xd9b26a, 0x777777, 0xa0522d];
const SHIRTS = [0xe74c3c, 0x3498db, 0x2ecc71, 0xf1c40f, 0x9b59b6, 0xe67e22, 0x1abc9c, 0xecf0f1, 0x34495e, 0xff7eb6];
const PANTS = [0x2c3e50, 0x34495e, 0x1f2a44, 0x5d4037, 0x7f8c8d, 0x222222, 0x3b5998];
function person(o = {}) {
  const g = group(o.x || 0, 0, o.z || 0, o.parent);
  const skin = o.skin || pick(SKINS), shirt = o.shirt || pick(SHIRTS), pants = o.pants || pick(PANTS), hair = o.hair || pick(HAIRS);
  const limb = (x, y, w, h, d, color, handColor) => {
    const j = group(x, y, 0, g);
    box(w, h, d, color, 0, -h / 2, 0, j);
    if (handColor) sph(0.055, handColor, 0, -h - 0.03, 0, j, 8, 6);
    return j;
  };
  const legL = limb(-0.1, 0.86, 0.15, 0.86, 0.17, pants), legR = limb(0.1, 0.86, 0.15, 0.86, 0.17, pants);
  box(0.44, 0.62, 0.26, shirt, 0, 1.17, 0, g);
  const armL = limb(-0.29, 1.44, 0.11, 0.58, 0.13, shirt, skin), armR = limb(0.29, 1.44, 0.11, 0.58, 0.13, shirt, skin);
  sph(0.15, skin, 0, 1.64, 0, g);
  const h = mesh(geo('hair', () => new THREE.SphereGeometry(0.158, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), hair, 0, 1.655, 0.01, g);
  h.rotation.x = -0.25;
  if (o.hat) { cyl(0.13, 0.15, 0.09, o.hat, 0, 1.8, 0, g); box(0.2, 0.02, 0.12, o.hat, 0, 1.76, -0.13, g); }
  if (o.scarf) box(0.2, 0.08, 0.05, o.scarf, 0, 1.44, -0.14, g);
  if (o.bag) box(0.32, 0.42, 0.18, o.bag, 0.38, 0.3, 0.12, g);
  g.userData.limbs = { legL, legR, armL, armR };
  g.userData.phase = Math.random() * 6;
  return g;
}
function pose(p, moving, dt) {
  const L = p.userData.limbs; if (!L) return;
  if (moving) p.userData.phase += dt * 9;
  const s = moving ? Math.sin(p.userData.phase) * 0.55 : 0;
  L.legL.rotation.x += (s - L.legL.rotation.x) * 0.3; L.legR.rotation.x += (-s - L.legR.rotation.x) * 0.3;
  L.armL.rotation.x += (-s * 0.8 - L.armL.rotation.x) * 0.3; L.armR.rotation.x += (s * 0.8 - L.armR.rotation.x) * 0.3;
}
// people face -z when rotation.y = 0 (front of the head is -z), so face the direction of travel
function walkTo(p, x, z, speed = 1.4) {
  return cancellable(done => {
    const u = every(dt => {
      const dx = x - p.position.x, dz = z - p.position.z, d = Math.hypot(dx, dz);
      if (d < 0.02) { p.position.x = x; p.position.z = z; pose(p, false, dt); off(u); done(); return; }
      const step = Math.min(d, speed * dt);
      p.position.x += dx / d * step; p.position.z += dz / d * step;
      p.rotation.y = Math.atan2(-dx, -dz);
      pose(p, true, dt);
    });
  });
}
function seatedPerson(x, y, z, parent) {
  const g = group(x, y, z, parent), skin = pick(SKINS);
  box(0.42, 0.5, 0.24, pick(SHIRTS), 0, 0.25, 0, g);
  sph(0.14, skin, 0, 0.64, -0.02, g);
  const h = mesh(geo('hair', () => new THREE.SphereGeometry(0.158, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)), pick(HAIRS), 0, 0.66, 0, g);
  h.rotation.x = -0.25;
  return g;
}

// ---------- the aeroplane (outside view), fuselage along x, nose at +x ----------
function airplane(accent, x, y, z, parent) {
  const g = group(x, y, z, parent), white = 0xf4f6f8;
  const f = cyl(2, 2, 26, white, 0, 0, 0, g, 18); f.rotation.z = Math.PI / 2;
  const nose = sph(2, white, 13, 0, 0, g, 18, 12); nose.scale.set(1.7, 1, 1);
  const tail = cone(2, 8, white, -17, 0.4, 0, g, 18); tail.rotation.z = Math.PI / 2; tail.scale.set(1, 1, 0.85);
  const wing = box(5, 0.35, 28, 0xdfe4ea, -1, -0.9, 0, g); wing.rotation.y = 0.12;
  box(3.4, 4.2, 0.3, accent, -18, 3, 0, g);
  box(2.6, 0.25, 9, 0xdfe4ea, -18.5, 0.9, 0, g);
  for (const s of [-1, 1]) {
    const e = cyl(0.75, 0.75, 3.2, 0x9aa5ae, 0.5, -1.9, s * 6.5, g, 12); e.rotation.z = Math.PI / 2;
    for (let i = 0; i < 14; i++) box(0.4, 0.5, 0.05, 0x26313b, 9 - i * 1.5, 0.6, s * 1.98, g);
    box(22, 0.25, 0.04, accent, 0, -0.1, s * 2.0, g);
  }
  box(1.4, 2.3, 0.08, 0xb9c2ca, 10, 0.2, 2.0, g);     // front door, +z side
  return g;
}

// ---------- the passport the player scans ----------
function passportMesh(chef) {
  const t = canvasTex(160, 224, (ctx, w, h) => {
    const g = ctx.createRadialGradient(w * 0.3, h * 0.2, 10, w / 2, h / 2, h);
    g.addColorStop(0, '#2f5fd0'); g.addColorStop(1, '#0f2a6b');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#f4d27a88'; ctx.lineWidth = 3; ctx.strokeRect(8, 8, w - 16, h - 16);
    ctx.fillStyle = '#f4d27a'; ctx.textAlign = 'center';
    ctx.font = 'bold 24px Fredoka, sans-serif'; ctx.fillText('PASSPORT', w / 2, 52);
    ctx.font = `64px ${EMOJI_FONT}`; ctx.fillText('🌍', w / 2, 140);
    ctx.font = '600 16px Fredoka, sans-serif'; ctx.fillText((chef.name || 'Chef').slice(0, 14), w / 2, 196);
  });
  const g = new THREE.Group();
  box(0.125, 0.17, 0.014, 0x163a8f, 0, 0, 0, g);
  const front = panel(0.12, 0.165, t.tex, 0, 0, 0.0075, g, true);
  front.renderOrder = 1;
  return g;
}

// =====================================================================
// STAGE 1 — AIRPORT: boarding line, passport scan, jet bridge
// =====================================================================
async function airportStage(o) {
  const s = newScene(0xa9d8ff, 60, 260);
  s.add(new THREE.HemisphereLight(0xffffff, 0x9a948a, 0.95));
  const sun = new THREE.DirectionalLight(0xffffff, 0.55); sun.position.set(-10, 25, 12); s.add(sun);
  const from = o.from ? o.from.capital : 'Home', to = o.to.capital;

  // terminal floor, walls, ceiling
  const tiles = canvasTex(256, 256, (ctx, w, h) => {
    ctx.fillStyle = '#ebe6dc'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#d3ccbf'; ctx.lineWidth = 3;
    for (let i = 0; i <= w; i += 64) { ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, h); ctx.moveTo(0, i); ctx.lineTo(w, i); ctx.stroke(); }
  });
  tiles.tex.wrapS = tiles.tex.wrapT = THREE.RepeatWrapping; tiles.tex.repeat.set(16, 8);
  const floor = mesh(geo('floor', () => new THREE.PlaneGeometry(40, 20)), new THREE.MeshLambertMaterial({ map: tiles.tex }), 0, 0, -2);
  floor.rotation.x = -Math.PI / 2; floor.userData.ownMat = true;
  const carpet = box(2.2, 0.01, 11, 0x2d4f8a, 0, 0.006, -3.2);
  box(40, 0.2, 20, 0xf6f5f1, 0, 5.6, -2);                           // ceiling
  for (let z = 4; z > -11; z -= 4) for (const x of [-10, -3.5, 3.5, 10]) box(2.4, 0.05, 0.9, 0xfffbe8, x, 5.48, z, undefined).material = mat(0xfffbe8, { emissive: 0xfff3c4, emissiveIntensity: 0.6 });
  box(0.3, 5.6, 20, 0xdcd6cb, -20, 2.8, -2); box(0.3, 5.6, 20, 0xdcd6cb, 20, 2.8, -2);
  box(40, 5.6, 0.3, 0xd8d1c4, 0, 2.8, 8);
  // back wall: low wall + tall glass, with an opening for the jet bridge
  for (const sx of [-1, 1]) {
    box(18.7, 0.8, 0.3, 0xcfc8bb, sx * 10.65, 0.4, -12);
    const glass = box(18.7, 4.6, 0.06, 0xbfe6ff, sx * 10.65, 3.1, -12);
    glass.material = new THREE.MeshBasicMaterial({ color: 0xcfeeff, transparent: true, opacity: 0.18 }); glass.userData.ownMat = true;
    for (let i = 0; i <= 6; i++) box(0.12, 4.8, 0.14, 0x8f969c, sx * (1.3 + i * 3.1), 3, -12);
  }
  box(2.6, 3, 0.3, 0xcfc8bb, 0, 4.1, -12);
  box(40, 0.25, 0.3, 0x8f969c, 0, 5.45, -12);

  // outside: tarmac a floor below, the plane at the end of the jet bridge, another plane, hills
  const tarmac = box(400, 0.1, 300, 0x6b7076, 0, -3.45, -160);
  for (let x = -60; x <= 60; x += 6) box(3, 0.02, 0.25, 0xf1c40f, x, -3.39, -20);
  box(400, 0.1, 200, 0x7fb069, 0, -3.5, -330);
  for (let i = 0; i < 9; i++) { const h = sph(rand(20, 40), 0x86b56f, rand(-180, 180), -14, rand(-260, -200), undefined, 10, 6); h.scale.y = 0.45; }
  airplane(o.accent, -10, 0.9, -35);
  for (const sx of [-1, 1]) { const st = cyl(0.15, 0.15, 3.3, 0x555b61, sx * 6 - 10, -1.9, -35); }
  const far = airplane(0xe74c3c, 45, 0.9, -80); far.rotation.y = 0.6;
  // jet bridge from the gate (z -12) out to the plane door (z -33)
  box(2.5, 0.12, 21, 0x6e7a86, 0, 0, -22.5);
  box(2.3, 0.02, 21, 0x3c4b63, 0, 0.07, -22.5);
  box(0.12, 2.7, 21, 0xc9ced3, -1.25, 1.35, -22.5); box(0.12, 2.7, 21, 0xc9ced3, 1.25, 1.35, -22.5);
  box(2.62, 0.12, 21, 0xb7bdc3, 0, 2.72, -22.5);
  for (let z = -14; z > -33; z -= 3) box(1.4, 0.04, 0.4, 0xfffbe8, 0, 2.64, z).material = mat(0xfffbe8, { emissive: 0xfff3c4, emissiveIntensity: 0.7 });
  box(1.4, 2.3, 0.1, 0x2b3440, 0, 1.15, -33.05);                     // the open plane door
  for (const sx of [-1, 1]) cyl(0.25, 0.3, 3.4, 0x6e7a86, sx * 1, -1.75, -24);

  // queue lane: posts + belts
  for (let z = 1.5; z >= -8; z -= 2.375) for (const x of [-0.95, 0.95]) {
    cyl(0.04, 0.05, 1, 0x9aa1a8, x, 0.5, z); cyl(0.12, 0.14, 0.04, 0x6d737a, x, 0.02, z);
    if (z > -8) box(0.03, 0.06, 2.3, 0xc0392b, x, 0.92, z - 1.19);
  }
  // gate: kiosk, glass gates, agent desk, gate sign, departures board
  const kioskG = group(-0.85, 0, -9.6);
  box(0.42, 1.05, 0.42, 0x3d4650, 0, 0.52, 0, kioskG);
  const pad = box(0.32, 0.04, 0.26, 0x2ecc71, 0.02, 1.07, 0.04, kioskG);
  pad.material = new THREE.MeshLambertMaterial({ color: 0x1e8449, emissive: 0x27ae60, emissiveIntensity: 0.4 }); pad.userData.ownMat = true;
  const kioskScreen = canvasTex(256, 160, drawKiosk('idle', o));
  const scr = panel(0.42, 0.26, kioskScreen.tex, 0, 1.38, -0.12, kioskG, true);
  box(0.46, 0.3, 0.04, 0x222a33, 0, 1.38, -0.15, kioskG);
  scr.rotation.x = -0.25; scr.position.z = -0.1;
  const gates = [box(0.75, 1, 0.06, 0x9fd7ff, -0.42, 0.6, -10.2), box(0.75, 1, 0.06, 0x9fd7ff, 0.42, 0.6, -10.2)];
  gates.forEach(gt => { gt.material = new THREE.MeshLambertMaterial({ color: 0xaee0ff, transparent: true, opacity: 0.55 }); gt.userData.ownMat = true; });
  box(0.2, 1.1, 0.5, 0x3d4650, -0.9, 0.55, -10.2); box(0.2, 1.1, 0.5, 0x3d4650, 0.9, 0.55, -10.2);
  box(2.4, 1.05, 0.7, 0x5a6d82, 2.6, 0.52, -10.4); box(2.5, 0.06, 0.8, 0xe8e2d6, 2.6, 1.07, -10.4);
  const agent = person({ x: 2.6, z: -11, shirt: 0x1f3a6b, pants: 0x1f3a6b, hat: 0x1f3a6b, scarf: 0xc0392b }); agent.rotation.y = Math.PI;
  const flightNo = o.flightNo;
  const gateSign = canvasTex(512, 128, (ctx, w, h) => {
    ctx.fillStyle = '#10243f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 54px Fredoka, sans-serif'; ctx.fillText('GATE 7', 24, 82);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'right';
    const label = `✈ ${to.toUpperCase()}`;
    let size = 40;
    do { ctx.font = `600 ${size}px Fredoka, sans-serif`; size -= 2; } while (ctx.measureText(label).width > w - 250 && size > 16);
    ctx.fillText(label, w - 24, 78);
  });
  panel(2.6, 0.65, gateSign.tex, 0, 3.3, -11.82, undefined, true);
  const boardRows = [{ t: '10:05', f: flightNo, d: to, s: 'BOARDING', me: true }].concat(
    o.otherCities.map((c, i) => ({ t: `${10 + Math.floor((i + 1) * 0.6)}:${['20', '35', '50', '10', '25'][i % 5]}`, f: 'CP ' + (200 + i * 37), d: c, s: pick(['ON TIME', 'ON TIME', 'DELAYED', 'GATE OPEN']) })));
  let blink = true;
  const drawBoard = (ctx, w, h) => {
    ctx.fillStyle = '#0b0f17'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#f1c40f'; ctx.font = 'bold 34px Fredoka, sans-serif'; ctx.fillText('DEPARTURES', 20, 44);
    ctx.font = '600 22px Consolas, monospace';
    boardRows.forEach((r, i) => {
      const y = 92 + i * 38;
      if (r.me) { ctx.fillStyle = '#1d3b2a'; ctx.fillRect(10, y - 27, w - 20, 36); }
      ctx.fillStyle = '#e8eef5';
      ctx.fillText(r.t, 20, y); ctx.fillText(r.f, 100, y); ctx.fillText(r.d.toUpperCase().slice(0, 13), 200, y);
      ctx.fillStyle = r.s === 'DELAYED' ? '#ff7675' : r.me ? (blink ? '#2ecc71' : '#0b0f17') : '#9ad0ff';
      ctx.fillText(r.s, 380, y);
    });
  };
  const board = canvasTex(512, 330, drawBoard);
  const bg_ = box(3.3, 2.2, 0.15, 0x222831, -4.2, 3.2, -9.2); bg_.rotation.y = 0.35;
  const bp = panel(3.1, 2.0, board.tex, -4.2, 3.2, -9.1, undefined, true); bp.rotation.y = 0.35;
  bp.position.x += Math.sin(0.35) * 0.08; bp.position.z += Math.cos(0.35) * 0.02;
  cyl(0.12, 0.12, 2.2, 0x6d737a, -4.2, 1.1, -9.3);
  let bt = 0;
  every(dt => { bt += dt; if (bt > 0.5) { bt = 0; blink = !blink; board.redraw(drawBoard); } });

  // waiting-area seats with people, plants, windows-side people
  for (const sx of [-1, 1]) for (let r = 0; r < 3; r++) for (let i = 0; i < 6; i++) {
    const x = sx * (5 + i * 0.7), z = -1 - r * 2.6;
    box(0.6, 0.08, 0.55, 0x2c3e50, x, 0.45, z); box(0.6, 0.6, 0.08, 0x2c3e50, x, 0.75, z + 0.26);
    if (Math.random() < 0.35) { const p = seatedPerson(x, 0.49, z + 0.05); p.rotation.y = 0; }
  }
  for (const [x, z] of [[-3, 6], [3, 6], [-18, -10], [18, -10], [-6, -11], [6, -11]]) {
    cyl(0.35, 0.28, 0.6, 0xb5651d, x, 0.3, z); sph(0.6, 0x2e8b57, x, 1.05, z, undefined, 8, 6); sph(0.45, 0x3cb371, x + 0.2, 1.45, z - 0.1, undefined, 8, 6);
  }
  const strollers = [person({ x: -12, z: 3, bag: 0x8e44ad }), person({ x: 12, z: -6, bag: 0x16a085 })];
  strollers.forEach((p, i) => {
    const loop = async () => { try { for (;;) { await walkTo(p, i ? 8 : -8, i ? -2 : -6, 1.1); await sleep(rand(0.5, 2)); await walkTo(p, i ? 14 : -14, i ? -8 : 4, 1.1); await sleep(rand(0.5, 2)); } } catch (e) { /* skipped */ } };
    loop();
  });

  // the boarding line: 5 travellers ahead of you
  const spotZ = i => -8 + i * 1.15;
  const line = [];
  for (let i = 0; i < 5; i++) { const p = person({ z: spotZ(i), bag: Math.random() < 0.6 ? pick([0x34495e, 0xc0392b, 0x8e44ad, 0x16a085, 0xd35400]) : null }); line.push(p); }
  setView(0, 1.6, spotZ(5) + 0.4, 0, -0.05);
  setTitle(`🛫 ${esc(from)} Airport · Gate 7`, `Flight ${esc(flightNo)} to ${esc(to)} · Boarding now`);
  o.onReady && o.onReady();
  await fade(false);
  setPrompt('🧍 You\'re in the boarding line. <b>Drag</b> to look around while you wait!');

  const openGates = () => tween(0.35, k => { gates[0].position.x = -0.42 - k * 0.85; gates[1].position.x = 0.42 + k * 0.85; });
  const closeGates = () => tween(0.35, k => { gates[0].position.x = -1.27 + k * 0.85; gates[1].position.x = 1.27 - k * 0.85; });
  const flashPad = async () => { pad.material.emissiveIntensity = 1.6; softBeep(); await sleep(0.35); pad.material.emissiveIntensity = 0.4; };

  let first = true;
  while (line.length) {
    const p = line.shift();
    await walkTo(p, 0, -9.1, 1.5);
    p.rotation.y = Math.PI / 2;                       // turn to the kiosk
    await sleep(0.5); await flashPad(); await openGates();
    bg(walkTo(p, 0, -14, 1.6).then(() => walkTo(p, 0, -31, 1.8)).then(() => R && R.scene && R.scene.remove(p)));
    await sleep(0.6); bg(closeGates());
    const ahead = line.length ? `${line.length} ${line.length === 1 ? 'person' : 'people'} ahead of you.` : '';
    setPrompt(ahead && (first ? `⏳ The line is moving… ${ahead}` : `⏳ ${ahead}`));
    first = false;
    await Promise.all(line.map((q, i) => walkTo(q, 0, spotZ(i), 1.3)).concat([walkCam(0, spotZ(line.length) + 0.4, 1.3)]));
  }

  // your turn
  setPrompt('🛂 <b>It\'s your turn!</b> Tap the scanner (or the button) to scan your passport.');
  await lookAt(-0.85, 1.1, -9.6, 0.8);
  const pulse = every(() => { pad.material.emissiveIntensity = 0.6 + Math.sin(R.time * 6) * 0.5; });
  await waitAction('🛂 Scan passport', [kioskG]);
  off(pulse); pad.material.emissiveIntensity = 0.4;
  setPrompt('');
  await walkCam(0, -8.95, 1.6);
  await lookAt(-0.85, 1.0, -9.6, 0.4);
  const pp = passportMesh(o.chef);
  s.add(pp);
  const startPos = R.camera.localToWorld(new THREE.Vector3(0.12, -0.28, -0.5));
  const endPos = new THREE.Vector3(-0.83, 1.13, -9.56);
  await tween(0.8, k => {
    pp.position.lerpVectors(startPos, endPos, k);
    pp.rotation.set(-Math.PI / 2 * k, 0.3 * (1 - k), 0);
  });
  pad.material.emissiveIntensity = 2; beep();
  kioskScreen.redraw(drawKiosk('ok', o));
  await sleep(0.9);
  pad.material.emissiveIntensity = 0.4;
  await tween(0.5, k => { pp.position.y = 1.13 - k * 0.6; pp.position.x = -0.83 + k * 0.6; });
  s.remove(pp);
  setPrompt(`✅ Have a great flight, ${esc(o.chef.name || 'Chef')}! Seat <b>23A</b> — window.`);
  await openGates();
  await lookAt(0, 1.55, -20, 0.6);
  await walkCam(0, -12.5, 2);
  setTitle('🚶 Jet bridge', `Boarding ${esc(flightNo)} to ${esc(to)}`);
  setPrompt('');
  await walkCam(0, -31.5, 4.2);
  await fade(true);
}
function drawKiosk(state, o) {
  return (ctx, w, h) => {
    ctx.fillStyle = state === 'ok' ? '#1e8449' : '#10243f'; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = '#fff'; ctx.textAlign = 'center';
    if (state === 'ok') {
      ctx.font = `56px ${EMOJI_FONT}`; ctx.fillText('✅', w / 2, 62);
      ctx.font = 'bold 22px Fredoka, sans-serif'; ctx.fillText((o.chef.name || 'Chef').toUpperCase().slice(0, 16), w / 2, 100);
      ctx.font = '600 18px Fredoka, sans-serif'; ctx.fillText(`${o.flightNo} · SEAT 23A`, w / 2, 130);
    } else {
      ctx.font = 'bold 22px Fredoka, sans-serif'; ctx.fillText('SCAN PASSPORT', w / 2, 52);
      ctx.font = `52px ${EMOJI_FONT}`; ctx.fillText('🛂', w / 2, 112);
      ctx.font = '600 16px Fredoka, sans-serif'; ctx.fillText('place it on the reader ⬇', w / 2, 146);
    }
  };
}

// =====================================================================
// STAGE 2 — THE FLIGHT: window seat, route map, flight attendant + meal
// =====================================================================
async function cabinStage(o) {
  const s = newScene(0x1a1a1a);
  s.add(new THREE.HemisphereLight(0xfff6e6, 0x8c7f70, 1.05));
  const lamp = new THREE.PointLight(0xfff1d6, 0.4, 12); lamp.position.set(0, 2.6, 0); s.add(lamp);

  // cabin shell (inside of a tube), floor, bins, end walls
  const shell = cyl(2.25, 2.25, 34, 0xf1ede4, 0, 1.05, -5.5, undefined, 24);
  shell.geometry = new THREE.CylinderGeometry(2.25, 2.25, 34, 24, 1, true); shell.userData.ownGeo = true;
  shell.material = new THREE.MeshLambertMaterial({ color: 0xf1ede4, side: THREE.BackSide }); shell.userData.ownMat = true;
  shell.rotation.x = Math.PI / 2;
  const floorM = box(4, 0.04, 34, 0x40507a, 0, 0, -5.5);
  box(0.6, 0.02, 34, 0x8a2d3b, 0, 0.03, -5.5);
  for (const sx of [-1, 1]) {
    const bin = box(0.75, 0.5, 34, 0xe9e4d8, sx * 1.55, 2.0, -5.5); bin.rotation.z = sx * -0.25;
    box(0.06, 0.04, 34, 0xd8d1c2, sx * 1.15, 1.74, -5.5);
  }
  box(0.5, 0.03, 34, 0xfffbe8, 0, 3.2, -5.5).material = mat(0xfffbe8, { emissive: 0xfff3c4, emissiveIntensity: 0.5 });
  box(4.6, 3.5, 0.2, 0xd8d1c2, 0, 1.6, -22.5);
  box(4.6, 3.5, 0.2, 0xd8d1c2, 0, 1.6, 11.5);
  const exitSign = canvasTex(128, 48, (ctx, w, h) => { ctx.fillStyle = '#1e8449'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#fff'; ctx.font = 'bold 30px Fredoka'; ctx.textAlign = 'center'; ctx.fillText('EXIT', w / 2, 35); });
  panel(0.5, 0.19, exitSign.tex, 0, 2.7, -22.38, undefined, true);
  const curtain = box(1.2, 2.2, 0.05, 0x1f3a6b, 0, 1.1, -22.35);

  // sky outside the windows (scrolling clouds)
  const sky = canvasTex(512, 256, (ctx, w, h) => {
    const g = ctx.createLinearGradient(0, 0, 0, h);
    g.addColorStop(0, '#3a7bd5'); g.addColorStop(0.65, '#9fd3ff'); g.addColorStop(1, '#e8f6ff');
    ctx.fillStyle = g; ctx.fillRect(0, 0, w, h);
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (let i = 0; i < 18; i++) {
      const x = Math.random() * w, y = h * 0.55 + Math.random() * h * 0.4, r = 14 + Math.random() * 26;
      for (let j = 0; j < 4; j++) { ctx.beginPath(); ctx.ellipse(x + j * r * 0.7, y - (j % 2) * r * 0.3, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill(); }
      ctx.beginPath(); ctx.ellipse((x + w) % w, y, r, r * 0.6, 0, 0, Math.PI * 2); ctx.fill();
    }
  });
  sky.tex.wrapS = THREE.RepeatWrapping;
  const skyMat = new THREE.MeshBasicMaterial({ map: sky.tex });
  const winGeo = geo('win', () => new THREE.PlaneGeometry(0.3, 0.42));
  for (const sx of [-1, 1]) for (let z = 4.2; z > -20; z -= 0.85) {
    const frame = box(0.04, 0.52, 0.4, 0xdcd6c8, sx * 2.19, 1.25, z - 0.1);
    const w = new THREE.Mesh(winGeo, skyMat); w.position.set(sx * 2.16, 1.25, z - 0.1); w.rotation.y = -sx * Math.PI / 2; s.add(w);
  }
  every(dt => { sky.tex.offset.x += dt * 0.04; });

  // seats (instanced, so dozens of them stay cheap)
  const rows = []; for (let z = 4.25; z > -20.5; z -= 0.85) rows.push(z);
  const seatXs = [-1.25, -0.68, 0.68, 1.25];
  const count = rows.length * seatXs.length;
  const mk = (color, sx, sy, sz, oy, oz) => {
    const im = new THREE.InstancedMesh(new THREE.BoxGeometry(sx, sy, sz), mat(color), count);
    const m4 = new THREE.Matrix4(); let i = 0;
    for (const z of rows) for (const x of seatXs) { m4.makeTranslation(x, oy, z + oz); im.setMatrixAt(i++, m4); }
    s.add(im); return im;
  };
  mk(0x24427a, 0.5, 0.14, 0.5, 0.45, 0);
  mk(0x24427a, 0.5, 0.78, 0.12, 0.88, 0.26);
  mk(0xf2f2f2, 0.4, 0.18, 0.13, 1.2, 0.27);
  mk(0x1b2f57, 0.06, 0.1, 0.45, 0.6, 0);

  // other passengers (the seat next to you is free so you can see the aisle; someone across it is asleep)
  const myZ = rows.reduce((a, b) => Math.abs(b) < Math.abs(a) ? b : a);
  for (const z of rows) for (const x of seatXs) {
    if (Math.abs(z - myZ) < 0.1) continue;
    if (Math.random() < 0.45) seatedPerson(x, 0.52, z + 0.04);
  }
  const sleeper = seatedPerson(0.68, 0.52, myZ + 0.04);
  sleeper.rotation.z = -0.25;
  const zzz = emojiSprite('💤', 0.22, 0.55, 1.35, myZ - 0.05);
  every(() => { zzz.position.y = 1.35 + Math.sin(R.time * 2) * 0.05; zzz.material.opacity = 0.6 + Math.sin(R.time * 2) * 0.4; });
  if (Math.random() < 0.5) seatedPerson(1.25, 0.52, myZ + 0.04);

  // the seat-back screen in front of you: live route map
  const frontZ = myZ - 0.85;
  const screen = canvasTex(320, 200, () => {});
  const scrMesh = panel(0.3, 0.19, screen.tex, -1.25, 0.98, frontZ + 0.335, undefined, true);
  scrMesh.rotation.x = -0.1;
  box(0.33, 0.22, 0.02, 0x111111, -1.25, 0.98, frontZ + 0.325);
  const tray = group(-1.25, 0.66, frontZ + 0.33);
  const trayTop = box(0.42, 0.02, 0.3, 0xcfc8ba, 0, 0, 0.15, tray);
  tray.rotation.x = Math.PI / 2;   // folded up against the seat back
  // seatbelt sign
  const belt = canvasTex(192, 64, (ctx, w, h) => { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#555'; ctx.font = `34px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.fillText('💺  🚭', w / 2, 44); });
  panel(0.36, 0.12, belt.tex, -1.25, 1.72, myZ - 0.35, undefined, true).rotation.x = 0.6;

  const FLIGHT = 34;            // seconds of game time from takeoff to landing
  let progress = 0, paused = false;   // the flight clock stops while you're picking food
  const fromName = o.from ? o.from.capital : 'Home', toName = o.to.capital;
  let mapT = 0;
  every(dt => {
    if (!paused) progress = Math.min(1, progress + dt / FLIGHT);
    mapT += dt;
    if (mapT > 0.2) {
      mapT = 0;
      screen.redraw((ctx, w, h) => {
        ctx.fillStyle = '#061226'; ctx.fillRect(0, 0, w, h);
        try { o.drawMap(ctx, w, h, progress); } catch (e) { /* map unavailable */ }
        ctx.fillStyle = 'rgba(6,18,38,0.75)'; ctx.fillRect(0, 0, w, 30); ctx.fillRect(0, h - 30, w, 30);
        ctx.fillStyle = '#fff'; ctx.font = '600 14px Fredoka, sans-serif';
        ctx.fillText(`${fromName} → ${toName}`.slice(0, 34), 10, 20);
        const left = Math.max(0, Math.round((1 - progress) * o.flightMinutes));
        ctx.fillText(left ? `${Math.floor(left / 60)}h ${left % 60}m to go` : 'Landing', 10, h - 10);
        ctx.fillStyle = '#9ad0ff'; ctx.fillRect(150, h - 20, 160, 6);
        ctx.fillStyle = '#ffd65a'; ctx.fillRect(150, h - 20, 160 * progress, 6);
      });
    }
  });

  setView(-1.22, 1.3, myZ + 0.12, 0, -0.2);   // a little taller than real life, to see over the seats
  setTitle(`✈️ Flight ${esc(o.flightNo)} · ${esc(fromName)} → ${esc(toName)}`, 'Seat 23A · window');
  await fade(false);
  setPrompt('🪟 Settle in! <b>Drag</b> to look out of the window or around the cabin.');
  await sleep(2.5);
  await lookAt(-2.2, 1.2, myZ - 0.3, 1.2);
  await sleep(2);
  await lookAt(-1.25, 0.95, frontZ, 1);
  setPrompt('🗺️ Your seat-back screen shows the flight map.');

  // flight attendant walks down the aisle with the trolley
  const fa = person({ x: 0.05, z: -14, shirt: 0x1f3a6b, pants: 0x1f3a6b, skin: pick(SKINS), hat: 0x1f3a6b, scarf: 0xc0392b });
  const trolley = group(0, 0, 0);
  box(0.4, 0.95, 0.75, 0xc0c7ce, 0, 0.5, 0, trolley);
  box(0.42, 0.04, 0.77, 0x8d969e, 0, 0.98, 0, trolley);
  emojiSprite('🥤', 0.14, -0.08, 1.1, 0.15, trolley); emojiSprite('☕', 0.14, 0.08, 1.1, -0.15, trolley);
  const follow = every(() => { trolley.position.set(fa.position.x, 0, fa.position.z + 0.75); });
  await sleep(1);
  setPrompt('👩‍✈️ Here comes the cabin crew with the food trolley…');
  await lookAt(0, 1.4, -6, 1);
  await walkTo(fa, 0.05, myZ - 0.7, 1.3);
  off(follow);
  fa.rotation.y = Math.PI / 2;     // face your row
  await lookAt(0.05, 1.55, myZ - 0.7, 0.6);
  setPrompt('');
  paused = true;
  const meals = [['🍝', 'Pasta'], ['🍛', 'Chicken curry'], ['🥗', 'Garden salad'], ['🍱', 'Bento box'], ['🥪', 'Sandwich'], ['🍜', 'Noodle soup'], ['🌯', 'Wrap'], ['🥘', 'Veggie stew']];
  const options = meals.sort(() => Math.random() - 0.5).slice(0, 3).map(([emoji, label]) => ({ emoji, label }));
  const meal = await choose(`👩‍✈️ “Good day, ${esc(o.chef.name || 'Chef')}! What would you like to eat?”`, options);
  const drink = await choose('👩‍✈️ “And something to drink?”', [{ emoji: '🧃', label: 'Juice' }, { emoji: '🥤', label: 'Soda' }, { emoji: '☕', label: 'Tea' }, { emoji: '💧', label: 'Water' }]);
  paused = false;
  await lookAt(-1.25, 0.8, frontZ + 0.2, 0.7);
  await tween(0.6, k => { tray.rotation.x = Math.PI / 2 * (1 - k); });
  const food = emojiSprite(meal.emoji, 0.16, -1.29, 0.76, frontZ + 0.5);
  const cup = emojiSprite(drink.emoji, 0.1, -1.12, 0.74, frontZ + 0.44);
  setPrompt(`😋 “Enjoy your ${esc(meal.label.toLowerCase())}!” — <b>Tap the food</b> to eat it.`);
  const tf = every(() => { trolley.position.set(fa.position.x, 0, fa.position.z + 0.75); });
  bg(walkTo(fa, 0.05, 12, 1.2).then(() => { off(tf); R && R.scene && R.scene.remove(fa, trolley); }));
  let bites = 0;
  const eaten = cancellable(done => {
    const bite = () => {
      bites++; nom();
      const k = 1 - bites / 3;
      food.scale.set(0.16 * Math.max(k, 0.01), 0.16 * Math.max(k, 0.01), 1);
      if (bites === 1) setPrompt('😋 Yum! Keep going…');
      if (bites >= 3) { s.remove(food); emojiSprite('🍽️', 0.14, -1.29, 0.75, frontZ + 0.5); setPrompt('😌 Delicious. Sit back and enjoy the rest of the flight!'); R.clickables = R.clickables.filter(c => c.obj !== food); done(); }
    };
    R.clickables.push({ obj: food, fn: bite });
    $('jAction').innerHTML = '<button class="j-go small">😋 Take a bite</button>';
    $('jAction').firstChild.onclick = () => { bite(); if (bites >= 3) $('jAction').innerHTML = ''; };
  });
  await Promise.race([bg(eaten), bg(sleep(14))]);
  $('jAction').innerHTML = '';
  await lookAt(-2.2, 1.2, myZ - 0.2, 1.2);
  setPrompt('☁️ Cruising above the clouds…');
  while (progress < 0.82) await sleep(0.3);
  chime();
  setPrompt(`👨‍✈️ <i>“Ladies and gentlemen, we're starting our descent into <b>${esc(toName)}</b>. Please fasten your seatbelt.”</i>`);
  belt.redraw((ctx, w, h) => { ctx.fillStyle = '#222'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#ffd65a'; ctx.font = `34px ${EMOJI_FONT}`; ctx.textAlign = 'center'; ctx.fillText('💺  🚭', w / 2, 44); });
  await tween(0.8, k => { tray.rotation.x = Math.PI / 2 * k; });
  s.remove(food, cup);
  while (progress < 1) await sleep(0.3);
  setPrompt('🛬 Touchdown! Welcome to ' + esc(toName) + '.');
  await sleep(1.5);
  await fade(true);
}

// =====================================================================
// STAGE 3 — ARRIVAL: step off the plane into a landscape built for this country
// =====================================================================
// Landscape type by place. Anything not listed falls back to latitude (tropical / temperate / boreal / arctic).
const DESERT = new Set('818 682 784 634 414 048 512 887 434 012 478 466 562 148 729 400 368 262 232 706 516 795 860 788 504 376 275 760 036 364'.split(' '));
const STEPPE = new Set('496 398'.split(' '));
const MOUNTAIN = new Set('524 064 756 040 020 438 417 762 004 068 426 051 268 604 218 xk 499 070'.split(' '));
const ARCTIC = new Set('304 352'.split(' '));
const LANDMARK = {
  pyramid: '818 729', steppyramid: '484 320 222 340', eiffel: '250', pagoda: '392 156 410 408 158 704', fuji: '392',
  mosque: '682 784 634 414 048 512 887 364 368 792 050 586 004 031 795 860 762 417 458 096 360 504 012 788 434 400 422 760 275 706 262 562 478 686 818 729',
  mudmosque: '466 854', windmill: '528 208', castle: '276 203 040 616 703 348 642 372 440 428 233 246 752 578 438 492 674 724 620 sco wal nir 112 191 705 499 070 807 008 688',
  clocktower: '826 eng', temple: '300 196', colosseum: '380', opera: '036', stupa: '524 064 144 104 764 418 116', redeemer: '076',
  onion: '643 804', moai: '152', basilica: '336', tajmahal: '356', igloo: '304', yurt: '496 398', petra: '400', torii: '392',
};
const landmarkFor = id => Object.keys(LANDMARK).filter(k => LANDMARK[k].split(' ').includes(id));
const BIOMES = {
  tropical:  { sky: 0x86ccff, low: 0x3f9b34, high: 0x2d6f27, amp: 7, trees: ['palm', 'broad', 'palm'], density: 1.2 },
  island:    { sky: 0x79cdff, low: 0xe9d8a6, high: 0x4fa83d, amp: 5, trees: ['palm'], density: 0.8, sea: true },
  desert:    { sky: 0x9fd0f2, low: 0xe6c47e, high: 0xd2a35b, amp: 6, trees: ['cactus', 'palm'], density: 0.25 },
  steppe:    { sky: 0xa6d5f5, low: 0xc4bf6a, high: 0xa69f52, amp: 3, trees: ['broad'], density: 0.12 },
  temperate: { sky: 0x9ad0f5, low: 0x6db24d, high: 0x4b8a38, amp: 6, trees: ['broad', 'conifer'], density: 1 },
  boreal:    { sky: 0xb7d7ee, low: 0x5e8f4c, high: 0x3e6b39, amp: 6, trees: ['conifer'], density: 1.1 },
  mountain:  { sky: 0xa7d5f7, low: 0x76a157, high: 0x8c8f78, amp: 12, trees: ['conifer'], density: 0.8, peaks: true },
  arctic:    { sky: 0xcfe5f5, low: 0xf2f6fa, high: 0xdde8ef, amp: 5, trees: ['snowpine'], density: 0.3, peaks: true },
};
function biomeFor(c, small) {
  if (ARCTIC.has(c.id) || Math.abs(c.lat) > 63) return 'arctic';
  if (DESERT.has(c.id)) return 'desert';
  if (STEPPE.has(c.id)) return 'steppe';
  if (MOUNTAIN.has(c.id)) return 'mountain';
  if (Math.abs(c.lat) < 24) return small ? 'island' : 'tropical';
  return Math.abs(c.lat) > 55 ? 'boreal' : small && Math.abs(c.lat) < 40 ? 'island' : 'temperate';
}

async function arrivalStage(o) {
  const c = o.to, biome = biomeFor(c, o.small), B = BIOMES[biome];
  const s = newScene(B.sky, 70, 330);
  s.add(new THREE.HemisphereLight(0xffffff, 0x77806a, 0.85));
  const sun = new THREE.DirectionalLight(0xfff4dc, 0.75); sun.position.set(40, 80, 30); s.add(sun);

  // terrain: gentle hills, flattened where the plane is parked and along the walk
  const height = (x, z) => {
    let h = B.amp * (Math.sin(x * 0.031) * Math.cos(z * 0.027) + 0.5 * Math.sin(x * 0.071 + 1.3) * Math.sin(z * 0.063 + 0.4) + 0.25 * Math.sin(x * 0.15 + z * 0.11));
    const r = Math.hypot(x - 4, (z - 10) * 0.7);
    const flat = Math.min(1, Math.max(0, (r - 28) / 30));
    h *= flat * flat;
    if (B.sea) { const d = Math.hypot(x, z); if (d > 120) h -= (d - 120) * 0.12; }
    return h;
  };
  const tg = new THREE.PlaneGeometry(520, 520, 90, 90);
  tg.rotateX(-Math.PI / 2);
  const pos = tg.attributes.position, colors = [];
  const lo = new THREE.Color(B.low), hi = new THREE.Color(B.high), sand = new THREE.Color(0xe9d8a6), tmp = new THREE.Color();
  for (let i = 0; i < pos.count; i++) {
    const x = pos.getX(i), z = pos.getZ(i), h = height(x, z);
    pos.setY(i, h);
    tmp.copy(lo).lerp(hi, Math.min(1, Math.max(0, h / (B.amp * 1.4) + 0.35 + Math.sin(x * 0.4) * Math.cos(z * 0.37) * 0.08)));
    if (B.sea && h < 0.8) tmp.lerp(sand, 0.8);
    colors.push(tmp.r, tmp.g, tmp.b);
  }
  tg.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
  tg.computeVertexNormals();
  const terrain = new THREE.Mesh(tg, new THREE.MeshLambertMaterial({ vertexColors: true }));
  terrain.userData.ownGeo = terrain.userData.ownMat = true;
  s.add(terrain);
  if (B.sea) { const sea = box(900, 0.1, 900, 0x2f8fd8, 0, -1.2, 0); sea.material = new THREE.MeshLambertMaterial({ color: 0x2f9be0, transparent: true, opacity: 0.92 }); sea.userData.ownMat = true; }

  // runway + parked plane + stairs
  box(140, 0.06, 14, 0x55595e, 0, 0.03, -8);
  for (let x = -66; x < 70; x += 8) box(4, 0.02, 0.4, 0xffffff, x, 0.07, -8);
  airplane(o.accent, -6, 3.0, -8);
  for (const sx of [-1, 1]) cyl(0.18, 0.18, 1.6, 0x555b61, -6 + sx * 4, 0.8, -8);
  const stairs = group(4, 0, -5.4);
  const steps = 9;
  for (let i = 0; i < steps; i++) box(1.2, 0.08, 0.38, 0xd0d4d8, 0, 3.0 - (i + 1) * (3.0 / steps), 0.35 * i + 0.3, stairs);
  for (const sx of [-0.62, 0.62]) {
    box(0.05, 0.05, 4.2, 0xb0b6bc, sx, 2.45, 1.75, stairs).rotation.x = 0.82;   // handrail
    box(0.05, 0.9, 0.05, 0xb0b6bc, sx, 0.45, 3.1, stairs);
  }

  // welcome arch with the flag + flag poles + red carpet
  const flagImg = await loadImage(o.flagUrl);
  if (!R || R.aborted) throw SKIP;
  const sign = canvasTex(640, 240, (ctx, w, h) => {
    ctx.fillStyle = '#fff8ec'; ctx.fillRect(0, 0, w, h);
    ctx.strokeStyle = '#8a5a32'; ctx.lineWidth = 12; ctx.strokeRect(6, 6, w - 12, h - 12);
    if (flagImg) ctx.drawImage(flagImg, 26, 46, 210, 140);
    ctx.fillStyle = '#2b2420'; ctx.textAlign = 'left';
    ctx.font = '600 34px Fredoka, sans-serif'; ctx.fillText('Welcome to', 260, 86);
    ctx.font = `bold ${c.name.length > 14 ? 34 : 48}px Fredoka, sans-serif`; ctx.fillText(c.name.slice(0, 24), 260, 142);
    ctx.font = '500 26px Fredoka, sans-serif'; ctx.fillStyle = '#7a5a3a'; ctx.fillText('🏛️ ' + c.capital, 260, 190);
  });
  const arch = group(4, 0, 18);
  box(0.3, 4.4, 0.3, 0x8a5a32, -3.3, 2.2, 0, arch); box(0.3, 4.4, 0.3, 0x8a5a32, 3.3, 2.2, 0, arch);
  box(7.2, 2.75, 0.2, 0x8a5a32, 0, 4.1, 0.02, arch);
  const signP = panel(6.9, 2.6, sign.tex, 0, 4.1, -0.1, arch); signP.rotation.y = Math.PI;
  box(1.4, 0.02, 24, 0xb03030, 4, 0.05, 6);
  const flagTex = flagImg ? (() => { const t = new THREE.Texture(flagImg); t.needsUpdate = true; t.encoding = THREE.sRGBEncoding; R.textures.push(t); return t; })() : null;
  const waving = [];
  for (const [x, z] of [[-1.5, 2], [9.5, 2], [-1.5, 10], [9.5, 10]]) {
    cyl(0.05, 0.06, 5, 0xdfe4e8, x, 2.5, z);
    if (flagTex) {
      const fl = new THREE.Mesh(geo('flagp', () => new THREE.PlaneGeometry(1.5, 1)), new THREE.MeshLambertMaterial({ map: flagTex, side: THREE.DoubleSide }));
      fl.userData.ownMat = true; fl.position.set(x + (x < 4 ? 0.78 : -0.78), 4.4, z); s.add(fl); waving.push(fl);
    }
  }
  every(() => waving.forEach((f, i) => { f.rotation.y = Math.sin(R.time * 2.2 + i) * 0.25; }));

  // trees for this landscape, kept out of the walkway and landmark area
  const treeTypes = B.trees;
  const nTrees = Math.round(150 * B.density);
  for (let i = 0; i < nTrees; i++) {
    const x = rand(-150, 160), z = rand(-40, 170);
    if (x > -10 && x < 18 && z > -20 && z < 32) continue;
    if (Math.abs(x - 4) < 26 && z > 50 && z < 95) continue;
    const y = height(x, z);
    if (B.sea && y < 0.3) continue;
    tree(pick(treeTypes), x, y, z, rand(0.8, 1.4));
  }
  // distant mountains
  const peaks = B.peaks ? 14 : biome === 'temperate' || biome === 'boreal' ? 7 : biome === 'desert' ? 4 : 0;
  for (let i = 0; i < peaks; i++) {
    const a = rand(-0.9, 0.9) + Math.PI / 2, d = rand(200, 260), x = 4 + Math.cos(a) * d * 1.2, z = Math.sin(a) * d;
    const hgt = B.peaks ? rand(60, 110) : rand(30, 55), r = hgt * rand(0.9, 1.3);
    const col = biome === 'desert' ? 0xc99b5a : 0x6f7f86;
    cone(r, hgt, col, x, hgt / 2 - 4, z, undefined, 7);
    if (biome !== 'desert') cone(r * 0.33, hgt * 0.33, 0xffffff, x, hgt - 4 - hgt * 0.165, z, undefined, 7);
  }

  // capital skyline far ahead + this country's landmark(s)
  skyline(4, 150, o);
  const marks = landmarkFor(c.id);
  if (marks.includes('fuji')) fuji(4 + 40, 230);
  const mainMark = marks.filter(m => m !== 'fuji')[0];
  if (mainMark) buildLandmark(mainMark, 4, height(4, 72), 72, o);
  else if (biome === 'island' || biome === 'tropical') huts(4, 70, height);

  // national flora + fauna
  for (let i = 0; i < 14; i++) {
    const side = i % 2 ? 1 : -1, x = 4 + side * rand(2.2, 9), z = rand(-2, 26);
    emojiSprite(o.floraEmoji, rand(0.45, 0.8), x, height(x, z) + 0.3, z);
  }
  const critters = [];
  for (let i = 0; i < 4; i++) {
    const side = i % 2 ? 1 : -1, cx = 4 + side * rand(6, 11), cz = rand(8, 26);
    critters.push({ sp: emojiSprite(o.faunaEmoji, rand(1.1, 1.6), cx, 1, cz), cx, cz, r: rand(1, 2.5), a: rand(0, 6), v: rand(0.3, 0.7) * (Math.random() < 0.5 ? 1 : -1) });
  }
  every(dt => critters.forEach(k => {
    k.a += k.v * dt;
    const x = k.cx + Math.cos(k.a) * k.r, z = k.cz + Math.sin(k.a) * k.r;
    k.sp.position.set(x, height(x, z) + k.sp.scale.y / 2 + Math.abs(Math.sin(R.time * 4 + k.a)) * 0.25, z);
  }));

  // step out of the door, down the stairs, walk to the welcome arch
  setView(4, 4.6, -5.7, Math.PI, -0.08);   // standing in the open door at the top of the stairs
  setTitle(`🛬 Welcome to ${esc(c.name)}!`, `${esc(c.capital)} · ${esc(o.floraName)} · ${esc(o.faunaName)}`);
  setPrompt('');
  await fade(false);
  await sleep(1.2);
  setPrompt(`🌍 You've landed in <b>${esc(c.name)}</b>! Drag to look around.`);
  await tween(2.6, k => { R.camera.position.z = -5.7 + k * 3.9; R.camera.position.y = 4.6 - k * 3.0 + Math.abs(Math.sin(k * 28)) * 0.03; }, lin);
  await walkCam(4, 9, 2.4);
  await lookAt(-6, 2, 20, 1.6);
  await lookAt(14, 2, 22, 2.2);
  await lookAt(4, 4, 40, 1.2);
  setPrompt(`${esc(o.faunaEmoji)} Look — the national animal, the <b>${esc(o.faunaName)}</b>, and the ${esc(o.floraEmoji)} <b>${esc(o.floraName)}</b>!`);
  await waitAction('🏛️ Head to the Parliament kitchen');
  setPrompt('');
  await fade(true);
}

// ---------- landscape pieces ----------
function tree(type, x, y, z, k) {
  const g = group(x, y, z); g.scale.setScalar(k);
  if (type === 'palm') {
    const t = cyl(0.15, 0.25, 5, 0x8b6b43, 0, 2.5, 0, g, 6); t.rotation.z = rand(-0.12, 0.12);
    for (let i = 0; i < 6; i++) { const l = box(2.6, 0.08, 0.55, 0x2f8f3a, Math.cos(i) * 1.1, 5.0, Math.sin(i) * 1.1, g); l.rotation.y = -i; l.rotation.z = -0.35; }
  } else if (type === 'conifer' || type === 'snowpine') {
    cyl(0.18, 0.25, 1.4, 0x6b4a2b, 0, 0.7, 0, g, 6);
    for (let i = 0; i < 3; i++) cone(1.6 - i * 0.4, 2, type === 'snowpine' && i === 2 ? 0xf4f8fb : 0x2f6b3a, 0, 1.8 + i * 1.1, 0, g, 7);
    if (type === 'snowpine') cone(1.0, 0.8, 0xf4f8fb, 0, 3.6, 0, g, 7);
  } else if (type === 'cactus') {
    cyl(0.3, 0.32, 3, 0x3e8e41, 0, 1.5, 0, g, 8);
    const a = cyl(0.18, 0.18, 1.2, 0x3e8e41, 0.55, 1.8, 0, g, 8); a.rotation.z = 0.0;
    box(0.5, 0.18, 0.18, 0x3e8e41, 0.3, 1.25, 0, g);
  } else {
    cyl(0.2, 0.28, 1.8, 0x6b4a2b, 0, 0.9, 0, g, 6);
    const col = pick([0x3f8f3a, 0x4ea145, 0x357a33]);
    sph(1.4, col, 0, 2.6, 0, g, 7, 5); sph(1, col, 0.7, 2.2, 0.3, g, 7, 5);
  }
  return g;
}
function skyline(cx, cz, o) {
  const cols = [0xd5d9de, 0xc2c9d1, 0xe8e4dc, 0xb7c3cf, 0xdad2c4];
  const win = canvasTex(64, 128, (ctx, w, h) => {
    ctx.fillStyle = '#c9d1da'; ctx.fillRect(0, 0, w, h); ctx.fillStyle = '#6f8aa8';
    for (let y = 6; y < h; y += 14) for (let x = 6; x < w; x += 14) ctx.fillRect(x, y, 8, 8);
  });
  const wm = new THREE.MeshLambertMaterial({ map: win.tex });
  for (let i = 0; i < 26; i++) {
    const x = cx + rand(-70, 70), z = cz + rand(-15, 25), h = rand(8, 34) * (1 - Math.abs(x - cx) / 120), w = rand(5, 10);
    const b = box(w, h, rand(5, 10), Math.random() < 0.6 ? wm : pick(cols), x, h / 2 - 2, z);
  }
}
function fuji(x, z) { cone(80, 70, 0x6c7a92, x, 31, z, undefined, 9); cone(26, 23, 0xffffff, x, 54.6, z, undefined, 9); }
function huts(cx, cz, height) {
  for (let i = 0; i < 4; i++) {
    const x = cx + (i - 1.5) * 9, z = cz + rand(-3, 3), y = height(x, z);
    box(4, 2.4, 4, 0xc49a6c, x, y + 1.2, z); cone(3.6, 2.4, 0xa8834a, x, y + 3.6, z, undefined, 4).rotation.y = Math.PI / 4;
  }
}
function buildLandmark(type, x, y, z, o) {
  const g = group(x, y, z);
  const stone = 0xd8c9a3, white = 0xf3efe6, gold = 0xe0b84a;
  switch (type) {
    case 'pyramid': for (const [dx, dz, k] of [[0, 0, 1], [-28, 16, 0.7], [26, 22, 0.55]]) { const p = cone(16 * k, 20 * k, 0xd9b26f, dx, 10 * k, dz, g, 4); p.rotation.y = Math.PI / 4; } break;
    case 'steppyramid': for (let i = 0; i < 6; i++) box(22 - i * 3.4, 2.4, 22 - i * 3.4, 0xb9a786, 0, 1.2 + i * 2.4, 0, g); box(4, 3, 4, 0xa89474, 0, 16, 0, g); break;
    case 'eiffel': {
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const l = box(1, 22, 1, 0x7a5b3a, sx * 4, 10, sz * 4, g); l.rotation.z = -sx * 0.17; l.rotation.x = sz * 0.17; }
      box(9, 0.8, 9, 0x7a5b3a, 0, 8, 0, g); box(5, 0.6, 5, 0x7a5b3a, 0, 20, 0, g);
      cyl(0.6, 1.8, 16, 0x7a5b3a, 0, 28, 0, g, 4); cyl(0.15, 0.15, 5, 0x7a5b3a, 0, 38, 0, g, 4); break;
    }
    case 'pagoda': for (let i = 0; i < 5; i++) { box(8 - i * 1.2, 2.4, 8 - i * 1.2, 0xb03a2e, 0, 1.2 + i * 3, 0, g); const r = cone(7.4 - i * 1.1, 1.4, 0x2b2b2b, 0, 3 + i * 3, 0, g, 4); r.rotation.y = Math.PI / 4; } cyl(0.15, 0.15, 4, gold, 0, 17, 0, g, 6); break;
    case 'mosque': case 'tajmahal': case 'basilica': {
      const col = type === 'mosque' ? 0xe9e1cf : white;
      box(16, 8, 16, col, 0, 4, 0, g);
      sph(6, type === 'mosque' ? 0x3d8b7d : type === 'basilica' ? 0x8fa7b5 : white, 0, 10, 0, g, 16, 10).scale.y = type === 'tajmahal' ? 1.25 : 1;
      cyl(0.2, 0.2, 3, gold, 0, 17.5, 0, g, 6);
      if (type !== 'basilica') for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cyl(0.8, 0.9, 20, col, sx * 10, 10, sz * 10, g, 10); cone(1, 2.4, type === 'mosque' ? 0x3d8b7d : white, sx * 10, 21.2, sz * 10, g, 10); }
      if (type === 'basilica') for (let i = -3; i <= 3; i++) cyl(0.5, 0.5, 6, white, i * 2.2, 3, 9, g, 8);
      break;
    }
    case 'mudmosque': box(18, 9, 12, 0xb07a45, 0, 4.5, 0, g); for (let i = -2; i <= 2; i++) { box(2.4, 14, 2.4, 0xa86d3b, i * 4.2, 7, 6.5, g); cone(1.3, 2, 0xa86d3b, i * 4.2, 15, 6.5, g, 4); } break;
    case 'windmill': {
      cyl(2, 3, 9, 0x8a5a32, 0, 4.5, 0, g, 8); cone(2.6, 2.6, 0x5a3a22, 0, 10.2, 0, g, 8);
      const blades = group(0, 8.5, 3, g);
      for (let i = 0; i < 4; i++) { const b = box(0.9, 8, 0.15, 0xf3efe6, 0, 4, 0, group(0, 0, 0, blades)); b.parent.rotation.z = i * Math.PI / 2; }
      every(dt => { blades.rotation.z += dt * 0.6; }); break;
    }
    case 'castle': {
      box(18, 8, 12, 0xbfb6a6, 0, 4, 0, g);
      for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { cyl(2.2, 2.2, 13, 0xb0a796, sx * 9, 6.5, sz * 6, g, 10); cone(2.6, 4, 0x3b5b8a, sx * 9, 15, sz * 6, g, 10); }
      for (let i = -4; i <= 4; i++) box(1, 1.2, 1, 0xbfb6a6, i * 2, 8.6, 6, g);
      box(3, 4, 0.4, 0x5a3a22, 0, 2, 6.1, g); break;
    }
    case 'clocktower': {
      box(4, 26, 4, 0xc9b27a, 0, 13, 0, g); box(4.6, 4.6, 4.6, 0xb59c62, 0, 24, 0, g);
      const face = canvasTex(64, 64, (ctx, w, h) => { ctx.fillStyle = '#fff8e0'; ctx.beginPath(); ctx.arc(32, 32, 28, 0, 7); ctx.fill(); ctx.strokeStyle = '#222'; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(32, 32); ctx.lineTo(32, 10); ctx.moveTo(32, 32); ctx.lineTo(46, 36); ctx.stroke(); });
      const f = panel(3.4, 3.4, face.tex, 0, 24, -2.35, g); f.rotation.y = Math.PI;
      cone(2.6, 7, 0x3e4a3d, 0, 30, 0, g, 4).rotation.y = Math.PI / 4;
      box(22, 9, 6, 0xc9b27a, -13, 4.5, 0, g); break;
    }
    case 'temple': box(20, 1.5, 12, white, 0, 0.75, 0, g); for (let i = 0; i < 8; i++) for (const sz of [-1, 1]) cyl(0.6, 0.7, 8, white, -8.4 + i * 2.4, 5.5, sz * 5, g, 10); box(21, 1.2, 12.5, white, 0, 10, 0, g); { const r = cone(12, 3, white, 0, 12, 0, g, 4); r.rotation.y = Math.PI / 4; r.scale.z = 0.55; } break;
    case 'colosseum': {
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(16, 16, 12, 28, 1, true), new THREE.MeshLambertMaterial({ color: 0xc9a77a, side: THREE.DoubleSide }));
      ring.userData.ownGeo = ring.userData.ownMat = true; ring.position.y = 6; g.add(ring);
      for (let i = 0; i < 28; i++) { const a = i / 28 * Math.PI * 2; box(1.6, 3, 0.4, 0x8a6a45, Math.cos(a) * 16.1, 4 + (i % 2) * 4, Math.sin(a) * 16.1, g).rotation.y = -a + Math.PI / 2; }
      break;
    }
    case 'opera': for (let i = 0; i < 4; i++) { const sh = sph(5 - i * 0.6, white, -6 + i * 4, 1, 0, g, 12, 8); sh.scale.set(0.6, 1.6, 1); sh.rotation.z = -0.5; } box(24, 2, 10, 0xd8c9a3, 0, 1, 0, g); break;
    case 'stupa': box(14, 2, 14, white, 0, 1, 0, g); sph(6, white, 0, 3.5, 0, g, 16, 10); box(3, 2, 3, gold, 0, 9.6, 0, g); cone(1.4, 7, gold, 0, 14, 0, g, 8); break;
    case 'redeemer': { const hill = cone(30, 26, 0x4f8f45, 0, 13, 0, g, 9); box(1.6, 7, 1.4, white, 0, 29.5, 0, g); box(9, 1, 1, white, 0, 31.5, 0, g); sph(0.9, white, 0, 33.6, 0, g); break; }
    case 'onion': {
      box(18, 8, 10, 0xc0392b, 0, 4, 0, g);
      [[0, 14, 0xf1c40f, 2.6], [-6, 11, 0x27ae60, 2], [6, 11, 0x2980b9, 2], [-3, 12, 0x8e44ad, 1.6], [3, 12, 0xe67e22, 1.6]].forEach(([dx, h, col, r]) => {
        cyl(r * 0.6, r * 0.6, h - 4, 0xecf0f1, dx, (h - 4) / 2 + 4, 0, g, 10); const d = sph(r, col, dx, h + r * 0.4, 0, g, 12, 9); d.scale.y = 1.3; cone(r * 0.5, r * 1.4, col, dx, h + r * 1.9, 0, g, 10);
      }); break;
    }
    case 'moai': for (let i = -2; i <= 2; i++) { box(2.4, 1, 2, 0x6b5e52, i * 5, 0.5, 0, g); box(2, 6, 1.8, 0x7d6f61, i * 5, 4, 0, g); box(2.2, 1.4, 2, 0x6b5e52, i * 5, 7.3, 0.2, g); box(0.8, 1.6, 0.6, 0x6b5e52, i * 5, 4.6, -1.1, g); } break;
    case 'igloo': for (const [dx, dz] of [[0, 0], [-12, 6], [11, 8]]) { const d = sph(5, 0xf7fbff, dx, 0, dz, g, 14, 8); d.scale.y = 0.9; box(2.4, 2.4, 3, 0xe6eef5, dx, 1.2, dz - 5, g); } break;
    case 'yurt': for (const [dx, dz] of [[0, 0], [-12, 6], [11, 8]]) { cyl(4.5, 4.5, 3.2, 0xf3efe6, dx, 1.6, dz, g, 14); cone(5, 2.4, 0xc0392b, dx, 4.4, dz, g, 14); } break;
    case 'petra': box(26, 26, 3, 0xc77b58, 0, 13, 0, g); for (let i = -2; i <= 2; i++) cyl(0.8, 0.8, 9, 0xd99a78, i * 3, 4.5, -1.8, g, 10); box(16, 1.2, 1, 0xd99a78, 0, 9.5, -1.9, g); cyl(2, 2, 6, 0xd99a78, 0, 14, -1.9, g, 10); break;
    case 'torii': break;
  }
  return g;
}

// =====================================================================
// PUBLIC API
// =====================================================================
async function run(o) {
  if (!supported()) throw new Error('WebGL not available');
  await loadThree();
  $('jFade').classList.add('on');
  $('journey').classList.add('active');
  o.flightNo = o.flightNo || 'CP ' + (100 + Math.floor(Math.random() * 800));
  start(o);
  try {
    const stages = { airport: airportStage, cabin: cabinStage, arrival: arrivalStage };
    for (const name of o.stages || Object.keys(stages)) await stages[name](o);   // o.stages: e.g. ['arrival'] for testing
  } catch (e) {
    if (e !== SKIP) console.warn('Journey stopped:', e);
    if (o.onReady) o.onReady();
  }
  $('jFade').classList.add('on');
  await new Promise(r => setTimeout(r, 450));
  stop();
  setPrompt(''); hideChoices(); $('jAction').innerHTML = '';
}

window.Journey = { supported, run, preload: () => loadThree().catch(() => {}) };
})();
