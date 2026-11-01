// party.js — Party mode: create a party (get a code) or join one, then play a GeoGuessr-style game.
// Each round everyone is dropped into the same mystery 3D landscape (journey.js, with the name and
// flags hidden) and guesses where it is on a world map. Closer guesses score more (up to 5,000).
// Uses the Supabase tables/functions from party-setup.sql, polled every 1.5 seconds.
(() => {
'use strict';
const G = window.ChefGame;
const $ = id => document.getElementById(id);
const esc = s => G.esc(s);
const POLL_MS = 1500;
const LAST_PARTY_KEY = 'chefsPassport.party';
const MAX_POINTS = 5000;
let P = null;   // the party you're in

const rpc = (fn, args) => G.sb(`/rest/v1/rpc/${fn}`, { method: 'POST', body: JSON.stringify(args) })
  .then(r => r.text()).then(t => t ? JSON.parse(t) : null);
const errMsg = e => {
  try { return JSON.parse(String(e.message).replace(/^\d+ /, '')).message; }
  catch (x) { return 'Couldn\'t reach the party server — check your internet and try again.'; }
};
const remember = code => { try { code ? localStorage.setItem(LAST_PARTY_KEY, code) : localStorage.removeItem(LAST_PARTY_KEY); } catch (e) { /* storage unavailable */ } };
const lastParty = () => { try { return localStorage.getItem(LAST_PARTY_KEY); } catch (e) { return null; } };
const fmt = n => Math.round(n).toLocaleString('en-GB');
const km = d => d < 1 ? '< 1 km' : `${fmt(d)} km`;
const scoreFor = distKm => Math.round(MAX_POINTS * Math.exp(-distKm / 2000));
const me = () => P && P.players.find(p => p.player_id === P.me.id);
const hostName = () => { const h = P.players.find(p => p.player_id === P.party.host); return h ? h.name : 'the host'; };

// =====================================================================
// MENU: create or join
// =====================================================================
function openMenu() {
  if (!G.cloudOn) {
    G.showModal(`<h2>🧑‍🤝‍🧑 Party</h2><p>Party mode needs the online database switched on (see “Turning on the World Leaderboard” in README.md).</p>
      <div class="btn-row"><button class="btn gold" id="pmClose">OK</button></div>`);
    $('pmClose').onclick = G.hideModal;
    return;
  }
  if (P) return showLobby(true);
  const last = lastParty();
  G.showModal(`
    <h2>🧑‍🤝‍🧑 Party</h2>
    <p>Play with friends! Everyone lands in the same mystery place — look around, then pin where in the world you think it is. The closer you are, the more points you score.</p>
    <div class="party-choices">
      <button class="party-card" id="pmCreate"><span>🎉</span><b>Create a party</b><small>You'll get a code to share</small></button>
      <div class="party-card join"><span>🔑</span><b>Join a party</b>
        <input id="pmCode" maxlength="5" placeholder="CODE" autocomplete="off" autocapitalize="characters" spellcheck="false">
        <button class="btn blue" id="pmJoin">Join</button></div>
    </div>
    ${last ? `<p class="muted center">Last party: <button class="linkish" id="pmRejoin">rejoin ${esc(last)}</button></p>` : ''}
    <p class="muted center" id="pmMsg"></p>
    <div class="btn-row"><button class="btn ghost" id="pmClose">Close</button></div>`);
  const msg = t => { if ($('pmMsg')) $('pmMsg').textContent = t; };
  const code = $('pmCode');
  code.oninput = () => { code.value = code.value.toUpperCase().replace(/[^A-Z0-9]/g, ''); };
  code.onkeydown = e => { if (e.key === 'Enter') join(code.value, msg); };
  $('pmJoin').onclick = () => join(code.value, msg);
  $('pmCreate').onclick = () => create(msg);
  $('pmClose').onclick = G.hideModal;
  if (last) $('pmRejoin').onclick = () => join(last, msg);
}

async function create(msg) {
  msg('Creating your party…');
  const m = G.chef();
  try { enter(await rpc('create_party', { p_player: m.id, p_name: m.name, p_avatar: m.avatar })); }
  catch (e) { msg('⚠️ ' + errMsg(e)); }
}
async function join(code, msg) {
  code = (code || '').trim().toUpperCase();
  if (code.length !== 5) { msg('Party codes are 5 letters/numbers.'); return; }
  msg('Joining…');
  const m = G.chef();
  try { enter(await rpc('join_party', { p_code: code, p_player: m.id, p_name: m.name, p_avatar: m.avatar })); }
  catch (e) { msg('⚠️ ' + errMsg(e)); }
}

function enter(code) {
  P = { code, me: G.chef(), party: null, players: [], round: 0, phase: 'lobby', fails: 0, rounds: 5, seconds: 90 };
  remember(code);
  $('partyBtn').classList.add('in');
  $('partyBtn').querySelector('b').textContent = code;
  showLobby(true);
  P.timer = setInterval(poll, POLL_MS);
  poll();
}

async function leave() {
  if (!P) return;
  const { code, me: m } = P;
  end();
  remember(null);
  try { await rpc('leave_party', { p_code: code, p_player: m.id }); } catch (e) { /* already gone */ }
  G.toast('You left the party.');
}

function end(message) {
  if (!P) return;
  clearInterval(P.timer); clearInterval(P.tick);
  stopScene();
  P = null;
  hideHud();
  $('partyBtn').classList.remove('in');
  $('partyBtn').querySelector('b').textContent = 'Party';
  G.hideModal();
  G.showScreen('globe');
  if (message) G.toast(message, 'bad');
}

// =====================================================================
// SYNC: read the party + players, then decide what to show
// =====================================================================
async function poll() {
  if (!P || P.polling) return;
  P.polling = true;
  const code = P.code;
  try {
    const [pa, pl] = await Promise.all([
      G.sb(`/rest/v1/parties?code=eq.${code}&select=*`).then(r => r.json()),
      G.sb(`/rest/v1/party_players?party_code=eq.${code}&select=*&order=joined_at.asc`).then(r => r.json()),
    ]);
    if (!P || P.code !== code) return;
    P.fails = 0;
    if (!pa[0] || !pl.some(p => p.player_id === P.me.id)) { remember(null); end('That party has ended.'); return; }
    P.party = pa[0]; P.players = pl;
    update();
  } catch (e) {
    if (P && ++P.fails === 4) G.toast('⚠️ Having trouble reaching the party — still trying…', 'bad');
  } finally { if (P) P.polling = false; }
}

function update() {
  const pa = P.party;
  P.isHost = pa.host === P.me.id;
  if (pa.state === 'lobby') {
    if (P.phase !== 'lobby') { stopScene(); hideHud(); G.showScreen('globe'); P.phase = 'lobby'; P.round = 0; showLobby(true); }
    return showLobby(false);
  }
  if (pa.state === 'finished') { if (P.phase !== 'final') showFinal(); else renderFinal(); return; }
  // playing
  if (P.round !== pa.round) return startRound(pa.round);
  const mine = me() && me().guesses[pa.round];
  const all = P.players.every(p => p.guesses[pa.round]);
  const now = Date.now();
  if (P.phase === 'guessing' && now >= P.roundEnds && !mine) submitGuess(true);
  if (P.phase !== 'results' && (all || now >= P.roundEnds + 4000)) return showResults();
  if (P.phase === 'waiting') renderWaiting();
  if (P.phase === 'results') renderResults();
}

// =====================================================================
// LOBBY
// =====================================================================
function showLobby(build) {
  if (!P) return;
  if (build) {
    G.showModal(`
      <h2>🧑‍🤝‍🧑 Party lobby</h2>
      <div class="party-code"><small>Party code</small><b id="plCode">${esc(P.code)}</b>
        <button class="btn ghost" id="plCopy">📋 Copy</button></div>
      <p class="muted center">Friends join with <b>🧑‍🤝‍🧑 Party → Join a party</b> and this code.</p>
      <div class="plist" id="plPlayers"></div>
      <div id="plHost"></div>
      <div class="btn-row"><button class="btn ghost" id="plLeave" style="margin-right:auto">🚪 Leave party</button>
        <button class="btn ghost" id="plHide">Minimise</button><span id="plStartWrap"></span></div>`);
    $('plCopy').onclick = async () => {
      try { await navigator.clipboard.writeText(P.code); $('plCopy').textContent = '✓ Copied'; } catch (e) { $('plCopy').textContent = P.code; }
    };
    $('plLeave').onclick = leave;
    $('plHide').onclick = G.hideModal;
  }
  if (!$('plPlayers')) return;   // another window is open; the party button brings the lobby back
  if (!P.party) { $('plPlayers').innerHTML = '<div class="empty">Loading…</div>'; return; }
  $('plPlayers').innerHTML = P.players.map(p => `
    <div class="prow ${p.player_id === P.me.id ? 'cur' : ''}">
      <div class="avatar">${G.avatarHTML(p.avatar)}</div>
      <div class="pinfo"><b>${esc(p.name)}${p.player_id === P.party.host ? ' 👑' : ''}</b>
        <span class="muted">${p.player_id === P.party.host ? 'Host' : 'Ready'}${p.player_id === P.me.id ? ' · you' : ''}</span></div>
    </div>`).join('');
  const hostBox = $('plHost'), startWrap = $('plStartWrap');
  if (P.isHost) {
    if (!$('plRounds')) {
      hostBox.innerHTML = `<div class="party-settings">
        <label>Rounds <select id="plRounds">${[3, 5, 10].map(n => `<option ${n === P.rounds ? 'selected' : ''}>${n}</option>`).join('')}</select></label>
        <label>Time per round <select id="plSecs">${[[60, '1 min'], [90, '1½ min'], [120, '2 min'], [180, '3 min']].map(([v, t]) => `<option value="${v}" ${v === P.seconds ? 'selected' : ''}>${t}</option>`).join('')}</select></label>
      </div>`;
      startWrap.innerHTML = '<button class="btn gold" id="plStart">▶ Start game</button>';
      $('plRounds').onchange = e => { P.rounds = +e.target.value; };
      $('plSecs').onchange = e => { P.seconds = +e.target.value; };
      $('plStart').onclick = () => startGame();
    }
  } else {
    hostBox.innerHTML = `<p class="center muted">⏳ Waiting for ${esc(hostName())} to start the game…</p>`;
    startWrap.innerHTML = '';
  }
}

async function startGame() {
  const pool = d3.shuffle(G.COUNTRIES.slice()).slice(0, P.rounds).map(c => c.id);
  const btn = $('plStart') || $('pfAgain');
  if (btn) { btn.disabled = true; btn.textContent = 'Starting…'; }
  try { await rpc('start_party', { p_code: P.code, p_player: P.me.id, p_rounds: pool, p_seconds: P.seconds }); poll(); }
  catch (e) { G.toast('⚠️ ' + errMsg(e), 'bad'); if (btn) { btn.disabled = false; btn.textContent = '▶ Start game'; } }
}

// =====================================================================
// A ROUND: mystery scene + guessing map
// =====================================================================
async function startRound(n) {
  P.round = n; P.phase = 'guessing'; P.pin = null; P.sent = false;
  P.roundEnds = Date.now() + P.party.round_seconds * 1000;
  P.country = G.byId[P.party.rounds[n - 1]];
  P.view = null;
  G.hideModal();
  showHud();
  await stopScene();
  if (!P || P.round !== n) return;
  const c = P.country;
  // the clue card: a photo of a local dish (no name), plus nature emojis if there's no 3D
  $('phClue').innerHTML = `<small>📸 A dish from here</small><div class="ph-photo" id="phPhoto">🍽️</div>`;
  G.dishPhoto(c).then(ph => { if (ph && P && P.country === c && $('phPhoto')) $('phPhoto').innerHTML = `<img src="${esc(ph.src)}" alt="">`; });
  const args = G.journeyArgs(c, { mystery: true, stages: ['arrival'], onReady: () => G.showScreen('journey') });
  if (window.Journey && Journey.supported()) {
    P.scene = Journey.run(args).catch(() => noScene(c));
  } else noScene(c);
}
function noScene(c) {
  G.showScreen('journey');
  $('phClue').insertAdjacentHTML('beforeend', `<small style="margin-top:8px">🌿 Nature here</small><div class="ph-nature">${esc(G.journeyArgs(c).floraEmoji)} ${esc(G.journeyArgs(c).faunaEmoji)}</div>`);
}
async function stopScene() {
  if (P && P.scene) { const s = P.scene; P.scene = null; Journey.cancel(); await s; }
  else if (!P && window.Journey) Journey.cancel();
}

function showHud() {
  $('partyHud').classList.remove('hidden', 'results', 'waiting');
  $('phWait').classList.add('hidden'); $('phResults').classList.add('hidden');
  $('phMap').classList.remove('big', 'hidden');
  $('phGuess').disabled = true; $('phGuess').textContent = '📍 Tap the map to place your pin';
  clearInterval(P.tick);
  P.tick = setInterval(renderTop, 250);
  renderTop(); drawGuessMap();
}
function hideHud() { $('partyHud').classList.add('hidden'); }
function renderTop() {
  if (!P || !P.party) return;
  const left = Math.max(0, Math.ceil((P.roundEnds - Date.now()) / 1000));
  const total = P.party.rounds.length, m = me();
  $('phRound').textContent = `Round ${P.round} / ${total}`;
  $('phTimer').textContent = P.phase === 'results' ? '⏱ —' : `⏱ ${Math.floor(left / 60)}:${String(left % 60).padStart(2, '0')}`;
  $('phTimer').classList.toggle('low', P.phase === 'guessing' && left <= 10);
  $('phScore').textContent = `⭐ ${fmt(m ? m.score : 0)}`;
  if (P.phase === 'guessing' && left <= 0 && !P.sent) submitGuess(true);
}

async function submitGuess(timedOut) {
  if (!P || P.sent) return;
  P.sent = true;
  const c = P.country;
  let points = 0, lat = null, lon = null;
  if (P.pin && !timedOut) {
    [lon, lat] = P.pin;
    points = scoreFor(d3.geoDistance(P.pin, [c.lon, c.lat]) * 6371);
  } else if (P.pin) {   // time ran out but a pin was placed: count it
    [lon, lat] = P.pin;
    points = scoreFor(d3.geoDistance(P.pin, [c.lon, c.lat]) * 6371);
  }
  P.phase = 'waiting';
  $('partyHud').classList.add('waiting');
  $('phMap').classList.remove('big');
  $('phGuess').disabled = true;
  $('phGuess').textContent = timedOut && !P.pin ? '⏰ Time\'s up!' : '✅ Guess locked in';
  renderWaiting();
  try { await rpc('submit_guess', { p_code: P.code, p_player: P.me.id, p_round: P.round, p_lat: lat, p_lon: lon, p_points: points }); }
  catch (e) { P.sent = false; G.toast('⚠️ ' + errMsg(e), 'bad'); }
  poll();
}
function renderWaiting() {
  if (!P || P.phase !== 'waiting') return;
  const done = P.players.filter(p => p.guesses[P.round]).length;
  $('phWait').classList.remove('hidden');
  $('phWait').innerHTML = `<b>⏳ Waiting for everyone… ${done} / ${P.players.length} guessed</b>
    <div class="ph-dots">${P.players.map(p => `<span class="${p.guesses[P.round] ? 'in' : ''}" title="${esc(p.name)}">${G.avatarHTML(p.avatar)}</span>`).join('')}</div>`;
}

// ---- the world map you guess on (drag to move, scroll / buttons to zoom, tap to pin) ----
function mapCanvas(canvas) {
  const r = canvas.getBoundingClientRect(), dpr = Math.min(window.devicePixelRatio || 1, 2);
  if (canvas.width !== Math.round(r.width * dpr) || canvas.height !== Math.round(r.height * dpr)) {
    canvas.width = Math.round(r.width * dpr); canvas.height = Math.round(r.height * dpr);
  }
  const ctx = canvas.getContext('2d'); ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  return { ctx, w: r.width, h: r.height };
}
function baseView(w, h) {
  const pr = d3.geoEquirectangular().fitSize([w, h], { type: 'Sphere' });
  return { k: pr.scale(), x: pr.translate()[0], y: pr.translate()[1], w, h };
}
const projOf = v => d3.geoEquirectangular().scale(v.k).translate([v.x, v.y]);
function drawMap(canvas, v, pins, lines) {
  const { ctx, w, h } = mapCanvas(canvas);
  const pr = projOf(v), path = d3.geoPath(pr, ctx);
  ctx.fillStyle = '#7fb8e6'; ctx.fillRect(0, 0, w, h);
  ctx.beginPath(); path(d3.geoGraticule10()); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 0.5; ctx.stroke();
  const world = G.world();
  if (world) {
    ctx.fillStyle = '#f2ead7'; ctx.beginPath();
    for (const f of world.features) path(f);
    ctx.fill();
    ctx.beginPath(); path(world.mesh); ctx.strokeStyle = 'rgba(120,100,70,0.5)'; ctx.lineWidth = 0.5; ctx.stroke();
  }
  for (const [a, b] of lines || []) {
    ctx.beginPath(); path({ type: 'LineString', coordinates: [a, b] });
    ctx.setLineDash([5, 4]); ctx.strokeStyle = '#2b2420'; ctx.lineWidth = 1.5; ctx.stroke(); ctx.setLineDash([]);
  }
  for (const p of pins || []) {
    const [x, y] = pr(p.at);
    if (p.flag) {
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x, y, 13, 0, 7); ctx.fill();
      ctx.font = '18px "Segoe UI Emoji","Apple Color Emoji",sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      ctx.fillText('🏁', x, y + 1);
      continue;
    }
    ctx.fillStyle = p.color || '#e74c3c'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(x, y); ctx.arc(x, y - 16, 8, Math.PI * 0.75, Math.PI * 2.25); ctx.closePath(); ctx.fill(); ctx.stroke();
    if (p.label) {
      ctx.font = '600 11px Fredoka, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'alphabetic';
      ctx.lineWidth = 3; ctx.strokeStyle = '#fff'; ctx.strokeText(p.label, x, y - 28); ctx.fillStyle = '#2b2420'; ctx.fillText(p.label, x, y - 28);
    }
  }
}
function drawGuessMap() {
  if (!P) return;
  const cv = $('phCanvas'), r = cv.getBoundingClientRect();
  if (!P.view || P.view.w !== r.width || P.view.h !== r.height) {
    const old = P.view, nv = baseView(r.width, r.height);
    if (old) { const f = nv.k / baseView(old.w, old.h).k; nv.k = old.k * f; nv.x = old.x * (r.width / old.w); nv.y = old.y * (r.height / old.h); }
    P.view = nv;
  }
  drawMap(cv, P.view, P.pin ? [{ at: P.pin, color: '#e74c3c' }] : []);
}
function zoomAt(f, cx, cy) {
  const v = P.view, b = baseView(v.w, v.h);
  const k = Math.max(b.k, Math.min(b.k * 14, v.k * f));
  f = k / v.k;
  v.x = cx - (cx - v.x) * f; v.y = cy - (cy - v.y) * f; v.k = k;
  clampView(); drawGuessMap();
}
function clampView() {   // keep the world on screen
  const v = P.view, ww = v.k * 2 * Math.PI, hh = v.k * Math.PI;
  v.x = ww <= v.w ? v.w / 2 : Math.min(ww / 2, Math.max(v.w - ww / 2, v.x));
  v.y = hh <= v.h ? v.h / 2 : Math.min(hh / 2, Math.max(v.h - hh / 2, v.y));
}
function wireMap() {
  const cv = $('phCanvas');
  let drag = null;
  cv.addEventListener('pointerdown', e => {
    if (!P || P.phase !== 'guessing') return;
    try { cv.setPointerCapture(e.pointerId); } catch (x) { /* not a live pointer */ }
    drag = { x: e.clientX, y: e.clientY, vx: P.view.x, vy: P.view.y, moved: false };
  });
  cv.addEventListener('pointermove', e => {
    if (!drag || !P) return;
    const dx = e.clientX - drag.x, dy = e.clientY - drag.y;
    if (Math.hypot(dx, dy) > 5) drag.moved = true;
    if (drag.moved) { P.view.x = drag.vx + dx; P.view.y = drag.vy + dy; clampView(); drawGuessMap(); }
  });
  cv.addEventListener('pointerup', e => {
    const d = drag; drag = null;
    if (!d || d.moved || !P || P.phase !== 'guessing') return;
    drawGuessMap();   // make sure the view matches the map's current size before reading the click
    const r = cv.getBoundingClientRect();
    const ll = projOf(P.view).invert([e.clientX - r.left, e.clientY - r.top]);
    if (!ll || Math.abs(ll[1]) > 90) return;
    P.pin = ll;
    $('phGuess').disabled = false; $('phGuess').textContent = '✅ Guess!';
    drawGuessMap();
  });
  cv.addEventListener('wheel', e => {
    if (!P || P.phase !== 'guessing') return;
    e.preventDefault();
    const r = cv.getBoundingClientRect();
    zoomAt(Math.exp(-e.deltaY * 0.0015), e.clientX - r.left, e.clientY - r.top);
  }, { passive: false });
  $('phZin').onclick = () => zoomAt(1.6, P.view.w / 2, P.view.h / 2);
  $('phZout').onclick = () => zoomAt(1 / 1.6, P.view.w / 2, P.view.h / 2);
  $('phBig').onclick = () => { $('phMap').classList.toggle('big'); setTimeout(drawGuessMap, 220); };
  $('phGuess').onclick = () => { if (P && P.pin && P.phase === 'guessing') submitGuess(false); };
  $('phLeave').onclick = () => {
    G.showModal(`<h2>Leave the party?</h2><p>You'll drop out of this game. You can rejoin with the code <b>${esc(P.code)}</b> while it's still in the lobby.</p>
      <div class="btn-row"><button class="btn ghost" id="lvNo">Keep playing</button><button class="btn" style="background:#a8322e" id="lvYes">Leave</button></div>`);
    $('lvNo').onclick = G.hideModal; $('lvYes').onclick = leave;
  };
  // redraw while the map grows/shrinks (hover, ⤢ button, window resize)
  new ResizeObserver(() => { if (P && (P.phase === 'guessing' || P.phase === 'waiting')) drawGuessMap(); }).observe(cv);
}

// =====================================================================
// RESULTS + FINAL PODIUM
// =====================================================================
const PIN_COLORS = ['#e74c3c', '#3498db', '#2ecc71', '#9b59b6', '#f39c12', '#1abc9c', '#e84393', '#34495e', '#d35400', '#16a085', '#8e44ad', '#c0392b'];
function showResults() {
  P.phase = 'results';
  $('partyHud').classList.remove('waiting'); $('partyHud').classList.add('results');
  $('phWait').classList.add('hidden'); $('phMap').classList.add('hidden');
  $('phResults').classList.remove('hidden');
  const c = P.country;
  $('phResults').innerHTML = `
    <div class="pr-head"><div class="pr-flag">${G.flagImg(c.iso, 160)}</div>
      <div><small>Round ${P.round} — you were in…</small><h2>${esc(c.name)}</h2><span class="muted">🏛️ ${esc(c.capital)} · 🍽️ ${esc(c.dish)}</span></div></div>
    <canvas id="prMap"></canvas>
    <div class="pr-list" id="prList"></div>
    <div class="btn-row" id="prBtns"></div>`;
  renderResults();
}
function renderResults() {
  if (!P || P.phase !== 'results' || !$('prList')) return;
  const c = P.country, ans = [c.lon, c.lat], n = String(P.round);
  const rows = P.players.map((p, i) => {
    const g = p.guesses[n];
    const at = g && g.lat !== null && g.lat !== undefined ? [g.lon, g.lat] : null;
    return { p, at, pts: g ? g.points : 0, dist: at ? d3.geoDistance(at, ans) * 6371 : null, color: PIN_COLORS[i % PIN_COLORS.length] };
  }).sort((a, b) => b.pts - a.pts);
  // map framed around the answer and everyone's pins
  const cv = $('prMap'), r = cv.getBoundingClientRect();
  const pts = [ans].concat(rows.filter(x => x.at).map(x => x.at));
  const pr = d3.geoEquirectangular().fitExtent([[30, 40], [r.width - 30, r.height - 20]], { type: 'MultiPoint', coordinates: pts });
  const base = baseView(r.width, r.height);
  let k = Math.min(Math.max(pr.scale(), base.k), base.k * 10);
  if (!isFinite(k)) k = base.k * 4;
  const view = { k, x: 0, y: 0, w: r.width, h: r.height };
  const ctr = d3.geoEquirectangular().scale(k).translate([0, 0])(d3.geoCentroid({ type: 'MultiPoint', coordinates: pts }));
  view.x = r.width / 2 - ctr[0]; view.y = r.height / 2 - ctr[1];
  drawMap(cv, view, rows.filter(x => x.at).map(x => ({ at: x.at, color: x.color, label: x.p.name })).concat([{ at: ans, flag: true }]),
    rows.filter(x => x.at).map(x => [x.at, ans]));
  $('prList').innerHTML = rows.map((x, i) => `
    <div class="lb-row ${x.p.player_id === P.me.id ? 'me' : ''}">
      <span class="lb-rk"><i class="pin-dot" style="background:${x.color}"></i></span>
      <div class="avatar">${G.avatarHTML(x.p.avatar)}</div>
      <div class="lb-main"><b>${esc(x.p.name)}</b><span class="muted">${x.at ? km(x.dist) + ' away' : 'No guess'}</span></div>
      <span class="pr-pts">+${fmt(x.pts)}</span><span class="lb-n">${fmt(x.p.score)}</span></div>`).join('');
  const last = P.round >= P.party.rounds.length;
  $('prBtns').innerHTML = P.isHost
    ? `<button class="btn gold" id="prNext">${last ? '🏆 See final results' : '▶ Next round'}</button>`
    : `<p class="muted">⏳ Waiting for ${esc(hostName())} to ${last ? 'show the final results' : 'start the next round'}…</p>`;
  if (P.isHost) $('prNext').onclick = async () => {
    $('prNext').disabled = true;
    try { await rpc('next_round', { p_code: P.code, p_player: P.me.id, p_from_round: P.round }); poll(); }
    catch (e) { $('prNext').disabled = false; G.toast('⚠️ ' + errMsg(e), 'bad'); }
  };
}

function showFinal() {
  P.phase = 'final';
  clearInterval(P.tick);
  stopScene(); hideHud();
  G.showScreen('globe');
  renderFinal(true);
}
function renderFinal(build) {
  if (!P) return;
  const ranked = P.players.slice().sort((a, b) => b.score - a.score);
  const podium = [1, 0, 2].map(i => ranked[i]).filter(Boolean);
  const html = `
    <h2 class="center">🏆 Final results</h2>
    <div class="podium">${podium.map(p => {
      const place = ranked.indexOf(p);
      return `<div class="pod p${place + 1}"><div class="avatar">${G.avatarHTML(p.avatar)}</div><b>${esc(p.name)}</b>
        <span>${fmt(p.score)}</span><div class="step">${['🥇', '🥈', '🥉'][place]}</div></div>`;
    }).join('')}</div>
    <div class="lb" style="max-height:200px">${ranked.map((p, i) => `<div class="lb-row ${p.player_id === P.me.id ? 'me' : ''}">
      <span class="lb-rk">${['🥇', '🥈', '🥉'][i] || '#' + (i + 1)}</span><div class="avatar">${G.avatarHTML(p.avatar)}</div>
      <div class="lb-main"><b>${esc(p.name)}</b></div><span class="lb-n">${fmt(p.score)}</span></div>`).join('')}</div>
    <div class="btn-row"><button class="btn ghost" id="pfLeave" style="margin-right:auto">🚪 Leave party</button>
      ${P.isHost ? '<button class="btn ghost" id="pfLobby">Back to lobby</button><button class="btn gold" id="pfAgain">🔁 Play again</button>'
        : `<span class="muted">⏳ ${esc(hostName())} can start another game</span>`}</div>`;
  if (build || !$('pfLeave')) G.showModal(html);
  else return;   // already showing
  if (ranked[0] && ranked[0].player_id === P.me.id) setTimeout(() => G.toast('🏆 You win!', 'good'), 400);
  $('pfLeave').onclick = leave;
  if (P.isHost) {
    $('pfAgain').onclick = () => startGame();
    $('pfLobby').onclick = async () => { try { await rpc('back_to_lobby', { p_code: P.code, p_player: P.me.id }); poll(); } catch (e) { G.toast('⚠️ ' + errMsg(e), 'bad'); } };
  }
}

// =====================================================================
// BOOT
// =====================================================================
$('partyBtn').onclick = openMenu;
wireMap();
window.Party = { open: openMenu, active: () => !!P };
})();
