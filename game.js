(() => {
'use strict';

// =====================================================================
// DATA
// =====================================================================
const COUNTRIES = COUNTRY_DATA.trim().split('\n').map(line => {
  const [id, iso, name, capital, lat, lon, dish, ings, flora, fauna, kind, wiki] = line.split('|').map(s => s.trim());
  return {
    id, iso, name, capital, lat: +lat, lon: +lon, dish, flora, fauna, kind: kind || '', wiki: wiki || '',
    recipe: ings.split(',').map(s => {
      const [n, p] = s.split(':');
      return { name: n.trim(), proc: (p || '').trim() || null };
    })
  };
});
const byId = Object.fromEntries(COUNTRIES.map(c => [c.id, c]));
const TOTAL = COUNTRIES.length;

const APPLIANCES = {
  w: { label: 'Sink',        verb: 'wash',  past: 'washed',  icon: '🚰', time: 1200 },
  f: { label: 'Frying Pan',  verb: 'fry',   past: 'fried',   icon: '🍳', time: 2200 },
  b: { label: 'Pot',         verb: 'boil',  past: 'boiled',  icon: '🍲', time: 2600 },
  o: { label: 'Oven',        verb: 'bake',  past: 'baked',   icon: '🔥', time: 3000 },
  t: { label: 'Toaster',     verb: 'toast', past: 'toasted', icon: '🍞', time: 1600 },
  r: { label: 'Rice Cooker', verb: 'steam', past: 'steamed', icon: '🍚', time: 2800 },
};

// Ingredient name -> [emoji, where it is stored]. First match wins, so order matters.
const ING_RULES = [
  [/sauce|paste|gravy|mayonnaise|mustard|chutney|ajvar|tahini|sambal|gochujang|kecap|vinegar|cassareep|chimichurri|salsa|wasabi|pikliz|béchamel/, '🥫', 'cupboard'],
  [/spring onion|mint|dill|parsley|cilantro|basil|\bsage\b|rosemary|thyme|bay leaf|curry leaves|lemongrass/, '🌿', 'fridge'],
  [/flour|batter|breadcrumbs/, '🌾', 'cupboard'],
  [/leaves|leaf|greens|callaloo|kale|spinach|chard|rocket|lettuce|cabbage|sauerkraut|bitterleaf|choy|leek/, '🥬', 'fridge'],
  [/noodles|macaroni/, '🍜', 'cupboard'],
  [/wonton/, '🥟', 'fridge'],
  [/conch|mussel/, '🦪', 'fridge'], [/lobster/, '🦞', 'fridge'], [/prawn|shrimp/, '🦐', 'fridge'],
  [/crab/, '🦀', 'fridge'], [/octopus/, '🐙', 'fridge'],
  [/fish|cod|tuna|salmon|herring|carp|tilapia|bass|anchov|snapper/, '🐟', 'fridge'],
  [/chicken/, '🍗', 'fridge'], [/duck/, '🦆', 'fridge'], [/rabbit/, '🐇', 'fridge'],
  [/sausage|bratwurst|rookworst|chorizo/, '🌭', 'fridge'],
  [/bacon|\bham\b|prosciutto|pork/, '🥓', 'fridge'],
  [/beef|steak|veal|patty|reindeer/, '🥩', 'fridge'],
  [/lamb|mutton|goat|haggis/, '🍖', 'fridge'],
  [/eggplant/, '🍆', 'fridge'], [/egg/, '🥚', 'fridge'],
  [/peanut|groundnut|almond|pine nut|chestnut|seeds|cashew/, '🥜', 'cupboard'],
  [/coconut/, '🥥', 'cupboard'],
  [/oil|palm butter/, '🫗', 'cupboard'],
  [/cheese|halloumi|mozzarella|parmesan|ricotta|kajmak|qurut/, '🧀', 'fridge'],
  [/butter|ghee/, '🧈', 'fridge'],
  [/milk|cream|yogurt|kefir/, '🥛', 'fridge'],
  [/rice/, '🍚', 'cupboard'],
  [/breadfruit|ackee|papaya/, '🍈', 'fridge'],
  [/pretzel/, '🥨', 'cupboard'], [/baguette/, '🥖', 'cupboard'], [/pancake/, '🥞', 'cupboard'],
  [/tortilla|naan|pita|lavash|injera|flatbread/, '🫓', 'cupboard'],
  [/bread|\bbun\b/, '🍞', 'cupboard'],
  [/pastry|dough|dumpling/, '🥟', 'cupboard'],
  [/couscous|bulgur|barley|millet|wheat|sago|tapioca/, '🌾', 'cupboard'],
  [/cornmeal|maize|masa/, '🌽', 'cupboard'],
  [/beetroot/, '🟣', 'fridge'],
  [/sweet potato|kumara|yam|cassava|yuca|taro|root|turnip|swede/, '🍠', 'cupboard'],
  [/potato/, '🥔', 'cupboard'],
  [/\bcorn\b/, '🌽', 'fridge'],
  [/bean sprout/, '🌱', 'fridge'],
  [/beans|peas|lentil|dhal/, '🫘', 'cupboard'],
  [/banana|plantain/, '🍌', 'fridge'],
  [/pineapple/, '🍍', 'fridge'], [/orange/, '🍊', 'fridge'], [/lime|lemon/, '🍋', 'fridge'],
  [/\bpear\b/, '🍐', 'fridge'], [/avocado/, '🥑', 'fridge'], [/olive/, '🫒', 'cupboard'],
  [/raisin|date|apricot|cranberr|lingonberr/, '🍇', 'cupboard'],
  [/mushroom/, '🍄', 'fridge'], [/tomato/, '🍅', 'fridge'], [/carrot/, '🥕', 'fridge'],
  [/cucumber|pickle|zucchini|okra/, '🥒', 'fridge'],
  [/bell pepper/, '🫑', 'fridge'],
  [/peppercorn/, '🧂', 'cupboard'],
  [/chili|scotch|piri/, '🌶️', 'fridge'],
  [/pumpkin/, '🎃', 'fridge'],
  [/onion|shallot/, '🧅', 'cupboard'], [/garlic/, '🧄', 'cupboard'], [/ginger/, '🫚', 'cupboard'],
  [/wine/, '🍷', 'cupboard'],
  [/nori|seaweed/, '🟩', 'cupboard'],
  [/salt|spice|paprika|saffron|cumin|curry|cinnamon|cardamom|anise|berbere|turmeric|sumac|fenugreek|vanilla|loomi|tamarind|capers/, '🧂', 'cupboard'],
];
function ingInfo(name) {
  const n = name.toLowerCase();
  for (const [re, em, store] of ING_RULES) if (re.test(n)) return { emoji: em, store };
  return { emoji: '🫙', store: 'cupboard' };
}

const FAUNA_RULES = [
  [/flying fox|\bbat\b/, '🦇'], [/frog|coquí/, '🐸'], [/unicorn/, '🦄'], [/owl/, '🦉'], [/iguana/, '🦎'],
  [/whale/, '🐋'], [/raccoon/, '🦝'], [/macaque/, '🐒'], [/komodo/, '🦎'], [/dragon/, '🐉'],
  [/lion/, '🦁'], [/eagle|condor|vulture|falcon|kestrel|hornero|harpy|harrier/, '🦅'], [/bear/, '🐻'], [/tiger/, '🐅'],
  [/elephant/, '🐘'], [/horse|stallion|lipizzaner|akhal/, '🐎'], [/deer|huemul|moose|okapi/, '🦌'],
  [/gorilla/, '🦍'], [/monkey|lemur/, '🐒'], [/parrot|macaw|lory|amazon/, '🦜'], [/crocodile/, '🐊'],
  [/turtle|tortoise/, '🐢'], [/panda/, '🐼'], [/kangaroo/, '🦘'], [/wolf/, '🐺'], [/fox/, '🦊'],
  [/camel|dromedary/, '🐪'], [/giraffe/, '🦒'], [/leopard|jaguar|panther|cheetah|lynx/, '🐆'],
  [/flamingo/, '🦩'], [/swan/, '🦢'], [/dove|pigeon/, '🕊️'], [/rooster|junglefowl|pheasant|partridge/, '🐓'],
  [/peafowl/, '🦚'], [/sheep|mouflon/, '🐏'], [/goat|markhor|ibex|chamois|takin/, '🐐'],
  [/bison|aurochs|buffalo|cattle|bull|kouprey/, '🐃'], [/dog|hound/, '🐕'], [/dodo/, '🦤'],
  [/hippo/, '🦛'], [/sloth/, '🦥'], [/llama|vicuña/, '🦙'], [/beaver/, '🦫'], [/zebra/, '🦓'],
  [/seal|dugong/, '🦭'], [/dolphin/, '🐬'], [/hare/, '🐇'], [/hyena/, '🐕'], [/komodo/, '🦎'],
  [/tuna|trout|coelacanth/, '🐟'], [/tapir/, '🐗'], [/kiwi|puffin|crane|stork|ibis|bird|swallow|magpie|nightingale|tern|godwit|wagtail|lapwing|hoopoe|quetzal|trogon|motmot|torogoz|guardabarranco|troupial|kiskadee|bellbird|palmchat|monal|kingfisher|sunbird|frigate|tropicbird|lory|cahow|rail|kakerori|kagu|oriole|bananaquit|oystercatcher|spoonbill/, '🐦'],
  [/antelope|gazelle|oryx|addax|gemsbok|springbok|kob|beira/, '🦌'],
];
const FLORA_RULES = [
  [/rose/, '🌹'], [/tulip/, '🌷'], [/lotus|water lily/, '🪷'], [/sunflower/, '🌻'], [/hibiscus|teuila|tagimoucia/, '🌺'],
  [/palm|pandanus/, '🌴'], [/cherry|blossom|plum|apricot|magnolia/, '🌸'], [/fern/, '🌿'], [/maple/, '🍁'],
  [/aloe|welwitschia|cactus/, '🌵'], [/daffodil|marigold|tiare/, '🌼'], [/anthurium|heliconia|balisier|bauhinia/, '🌺'], [/araucaria/, '🌲'], [/shamrock/, '☘️'], [/grape/, '🍇'], [/coffee/, '☕'], [/cocoa/, '🍫'],
  [/pomegranate/, '🍎'], [/cotton|edelweiss|daisy|chamomile|marguerite|jasmine|sampaguita/, '🌼'],
  [/tree|cedar|baobab|pine|wood|log|mahogany|teak|linden|cinchona|ebony|iroko|okoum|kapok|acacia|mopane|ghaf|sidra|myrrh|frankincense|vitae/, '🌳'],
  [/heather|lavender|flax|iris|bluebell|gentian|cornflower/, '💐'],
];
const firstMatch = (rules, s, dflt) => { s = s.toLowerCase(); for (const [re, e] of rules) if (re.test(s)) return e; return dflt; };

const flagUrl = (iso, w = 160) => `https://flagcdn.com/w${w}/${iso}.png`;
const flagImg = (iso, w = 160) =>
  `<img src="${flagUrl(iso, w)}" alt="" onerror="this.replaceWith(Object.assign(document.createElement('b'),{textContent:'${iso.toUpperCase()}'}))">`;
const cap = s => s.charAt(0).toUpperCase() + s.slice(1);

// ---- dish photos, looked up on Wikipedia (CORS-enabled API, no key needed) ----
const photoCache = new Map();
function dishPhoto(c) {
  if (photoCache.has(c.id)) return photoCache.get(c.id);
  const api = 'https://en.wikipedia.org/w/api.php?action=query&format=json&origin=*&prop=pageimages&piprop=thumbnail&pithumbsize=640&redirects=1';
  const search = async q => {
    const r = await fetch(`${api}&generator=search&gsrlimit=5&gsrsearch=${encodeURIComponent(q)}`);
    const pages = Object.values(((await r.json()).query || {}).pages || {}).sort((a, b) => a.index - b.index);
    const hit = pages.find(p => p.thumbnail && !/cuisine|^list of/i.test(p.title));
    return hit ? { src: hit.thumbnail.source, title: hit.title } : null;
  };
  // A search hit only counts if its title shares the start of a word from the dish name,
  // so "Kapana" can't come back as a photo of a city.
  const words = c.dish.toLowerCase().split(/[\s,'-]+/).filter(w => w.length >= 3 && !/^(and|with|the|des|del|tal|mat)$/.test(w));
  const relevant = hit => hit && words.some(w => hit.title.toLowerCase().includes(w.slice(0, 3))) ? hit : null;
  const exact = async title => {
    const r = await fetch(`${api}&titles=${encodeURIComponent(title)}`);
    const pg = Object.values(((await r.json()).query || {}).pages || {})[0];
    return pg && pg.thumbnail ? { src: pg.thumbnail.source, title: pg.title } : null;
  };
  const p = (async () =>
    (c.wiki && await exact(c.wiki)) ||
    relevant(await search(`${c.dish} ${c.name} dish`)) || relevant(await search(`${c.dish} food`)) || relevant(await search(c.dish))
  )().catch(() => null).then(ph => { if (!ph) photoCache.delete(c.id); return ph; });   // retry misses next time
  photoCache.set(c.id, p);
  return p;
}
function photoBox(c, holderId) {
  dishPhoto(c).then(ph => {
    const el = $(holderId);
    if (!el) return;
    if (!ph) { el.innerHTML = '<div class="ph" style="animation:none">🍽️</div>'; return; }
    el.innerHTML = `<img src="${esc(ph.src)}" alt="${esc(c.dish)}">`;
    const cr = $(holderId + 'Credit');
    if (cr) cr.innerHTML = `Photo: <a href="https://en.wikipedia.org/wiki/${encodeURIComponent(ph.title.replace(/ /g, '_'))}" target="_blank" rel="noopener">Wikipedia · ${esc(ph.title)}</a>`;
  });
  return `<div class="dish-photo" id="${holderId}"><div class="ph">🍽️</div></div>`;
}
const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
const $ = id => document.getElementById(id);

// =====================================================================
// SAVE / PROFILE
// =====================================================================
// All profiles live in one record: { current: id, profiles: { id: {name, unlocked, avatar, last} } }.
// `save` always points at the active profile.
const STORE_KEY = 'chefsPassport.v2';
const OLD_STORE_KEY = 'chefsPassport.v1';
const blankProfile = name => ({ name: name || '', unlocked: [], avatar: null, last: null });
const newProfileId = () => 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
let db = loadDb();
let save = db.profiles[db.current];
let unlocked = new Set(save.unlocked);
persist();   // records that old progress was imported, so it is never imported twice

function loadDb() {
  let d = null, old = null;
  try { d = JSON.parse(localStorage.getItem(STORE_KEY)); } catch (e) { /* storage unavailable */ }
  try { old = JSON.parse(localStorage.getItem(OLD_STORE_KEY)); } catch (e) { /* storage unavailable */ }
  if (!(d && d.profiles && d.profiles[d.current])) {
    const id = newProfileId();
    d = { current: id, profiles: { [id]: blankProfile() } };
  }
  // Carry over progress from the single-profile version, once. If the new version was opened
  // before (so a blank chef exists), the old progress replaces that blank chef or is added alongside.
  if (!d.importedV1 && old && Array.isArray(old.unlocked) && old.unlocked.length) {
    const cur = d.profiles[d.current];
    const imported = Object.assign(blankProfile(), old);
    if (!cur.unlocked.length && (!cur.name || cur.name === 'Chef' || cur.name === old.name)) d.profiles[d.current] = imported;
    else { const id = newProfileId(); d.profiles[id] = imported; d.current = id; }
  }
  d.importedV1 = true;
  return d;
}
function persist() {
  save.unlocked = [...unlocked];
  try { localStorage.setItem(STORE_KEY, JSON.stringify(db)); } catch (e) { /* storage unavailable */ }
}
function switchProfile(id) {
  persist();
  db.current = id;
  save = db.profiles[id];
  unlocked = new Set(save.unlocked);
  persist(); renderHud(); selectCountry(null); dirty = true;
  if (save.last && byId[save.last]) setCenter([byId[save.last].lon, byId[save.last].lat]);
}

// ---- backup codes: move every chef's progress to another browser, computer or copy of the game ----
function showBackup() {
  persist();
  const code = 'CHEFS1:' + btoa(unescape(encodeURIComponent(JSON.stringify({ profiles: db.profiles }))));
  showModal(`<h2>📋 Backup code</h2>
    <p>This code holds every chef's progress. Copy it, then open the other copy of the game and choose <b>👥 Switch chef → 📥 Restore</b>.</p>
    <textarea id="bkText" readonly style="width:100%;height:120px;font-size:12px;border-radius:10px;padding:8px">${esc(code)}</textarea>
    <div class="btn-row"><button class="btn ghost" id="bkBack">Back</button><button class="btn gold" id="bkDo">Copy</button></div>`);
  const ta = $('bkText');
  ta.focus(); ta.select();
  $('bkBack').onclick = openProfiles;
  $('bkDo').onclick = async () => {
    ta.select();
    let ok = false;
    try { await navigator.clipboard.writeText(code); ok = true; } catch (e) { ok = document.execCommand && document.execCommand('copy'); }
    $('bkDo').textContent = ok ? '✓ Copied!' : 'Press Ctrl+C';
  };
}

function parseBackup(text) {
  text = text.trim();
  let data;
  if (text.startsWith('CHEFS1:')) data = JSON.parse(decodeURIComponent(escape(atob(text.slice(7)))));
  else data = JSON.parse(text);                       // also accepts raw saved data
  if (data && data.profiles) return Object.values(data.profiles);
  if (data && Array.isArray(data.unlocked)) return [data];   // single-profile (first version) save
  throw new Error('not a backup');
}

function showRestore() {
  showModal(`<h2>📥 Restore progress</h2>
    <p>Paste a backup code. Its chefs are added next to the ones already here — nobody gets overwritten.</p>
    <textarea id="rsText" style="width:100%;height:120px;font-size:12px;border-radius:10px;padding:8px" placeholder="CHEFS1:..."></textarea>
    <p class="muted" id="rsMsg"></p>
    <div class="btn-row"><button class="btn ghost" id="rsBack">Back</button><button class="btn gold" id="rsDo">Restore</button></div>`);
  $('rsText').focus();
  $('rsBack').onclick = openProfiles;
  $('rsDo').onclick = () => {
    let list;
    try { list = parseBackup($('rsText').value); } catch (e) { $('rsMsg').textContent = '⚠️ That code didn\'t work — make sure you copied all of it.'; return; }
    persist();
    let firstId = null, added = 0;
    for (const p of list) {
      const prof = Object.assign(blankProfile(), p);
      prof.unlocked = prof.unlocked.filter(id => byId[id]);
      const key = prof.name + '|' + [...prof.unlocked].sort().join(',');
      const dupe = Object.entries(db.profiles).find(([, q]) => q.name + '|' + [...q.unlocked].sort().join(',') === key);
      if (dupe) { firstId = firstId || dupe[0]; continue; }
      // a chef with the same name and less progress here is replaced instead of duplicated
      const same = Object.entries(db.profiles).find(([, q]) => q.name === prof.name && q.unlocked.length <= prof.unlocked.length);
      const id = same ? same[0] : newProfileId();
      db.profiles[id] = prof; firstId = firstId || id; added++;
    }
    // drop an untouched blank chef left over from first opening the game
    for (const [id, q] of Object.entries(db.profiles))
      if (Object.keys(db.profiles).length > 1 && !q.unlocked.length && (!q.name || q.name === 'Chef')) delete db.profiles[id];
    if (!db.profiles[db.current]) db.current = firstId;
    switchProfile(firstId || db.current);
    hideModal();
    toast(added ? `Restored ${added} chef${added > 1 ? 's' : ''}! 🎉` : 'Those chefs were already here.', 'good');
  };
}

function openProfiles() {
  const ids = Object.keys(db.profiles);
  showModal(`
    <h2>👥 Who's cooking?</h2>
    <p>Each chef keeps their own passport, flags and progress.</p>
    <div class="plist">
      ${ids.map(id => {
        const p = db.profiles[id], cur = id === db.current;
        return `<div class="prow ${cur ? 'cur' : ''}">
          <div class="avatar">${avatarHTML(p.avatar)}</div>
          <div class="pinfo"><b>${esc(p.name || 'Chef')}</b><span class="muted">${p.unlocked.length} / ${TOTAL} places</span></div>
          ${cur ? '<span class="muted">Playing</span>' : `<button class="btn blue" data-switch="${id}">Play</button>`}
          ${ids.length > 1 ? `<button class="linkish" data-del="${id}" title="Delete profile">Delete</button>` : ''}
        </div>`;
      }).join('')}
    </div>
    <label class="muted">New chef</label>
    <div style="display:flex;gap:8px"><input type="text" id="newName" maxlength="20" placeholder="Username" style="margin:0">
      <button class="btn gold" id="addP">Add</button></div>
    <div class="btn-row">
      <button class="btn ghost" id="bkCopy" style="margin-right:auto">📋 Backup code</button>
      <button class="btn ghost" id="bkRestore">📥 Restore</button>
      <button class="btn ghost" id="pClose">Close</button></div>`);
  const box = $('modalBox');
  $('bkCopy').onclick = showBackup;
  $('bkRestore').onclick = showRestore;
  box.querySelectorAll('[data-switch]').forEach(b => b.onclick = () => {
    switchProfile(b.dataset.switch); hideModal();
    toast(`Welcome back, ${save.name || 'Chef'}! 👨‍🍳`, 'good');
  });
  box.querySelectorAll('[data-del]').forEach(b => b.onclick = () => {
    const id = b.dataset.del, p = db.profiles[id];
    showModal(`<h2>Delete ${esc(p.name || 'Chef')}?</h2><p>Their ${p.unlocked.length} unlocked places will be gone for good.</p>
      <div class="btn-row"><button class="btn ghost" id="dNo">Keep</button><button class="btn" style="background:#a8322e" id="dYes">Delete</button></div>`);
    $('dNo').onclick = openProfiles;
    $('dYes').onclick = () => {
      delete db.profiles[id];
      if (id === db.current) switchProfile(Object.keys(db.profiles)[0]); else persist();
      openProfiles();
    };
  });
  const add = () => {
    const name = $('newName').value.trim().slice(0, 20);
    if (!name) { $('newName').focus(); return; }
    const id = newProfileId();
    db.profiles[id] = blankProfile(name);
    switchProfile(id); hideModal();
    toast(`New passport for ${name}! Hit Random Country to start. ✈️`, 'good');
  };
  $('addP').onclick = add;
  $('newName').onkeydown = e => { if (e.key === 'Enter') add(); };
  $('pClose').onclick = hideModal;
}

function avatarHTML(iso) { return iso ? flagImg(iso, 80) : '👨‍🍳'; }

function renderHud() {
  $('hudName').textContent = save.name || 'Chef';
  $('hudCount').textContent = `${unlocked.size} / ${TOTAL} places unlocked`;
  $('hudBar').style.width = (unlocked.size / TOTAL * 100) + '%';
  $('hudAvatar').innerHTML = avatarHTML(save.avatar);
  $('hudBgFlag').style.backgroundImage = save.avatar ? `url(${flagUrl(save.avatar, 320)})` : 'none';
}

function openProfile(welcome) {
  let chosen = save.avatar;
  const opts = [{ iso: null, name: 'Chef' }].concat(
    [...unlocked].map(id => byId[id]).filter(Boolean).sort((a, b) => a.name.localeCompare(b.name)).map(c => ({ iso: c.iso, name: c.name })));
  const html = `
    <h2>${welcome ? '👋 Welcome, chef!' : '🧑‍🍳 Your profile'}</h2>
    <p>${welcome ? 'Fly around the world and cook every country\'s national dish. Pick a username to start your passport.' : 'Change your name, or dress your profile in the flag of any country you have unlocked.'}</p>
    <label class="muted">Username</label>
    <input type="text" id="pName" maxlength="20" placeholder="e.g. ChefDavid" value="${esc(save.name)}">
    ${welcome ? '' : `
      <div class="muted">Profile look · ${unlocked.size} flag${unlocked.size === 1 ? '' : 's'} unlocked</div>
      <div class="avatars" id="pAvatars">
        ${opts.map(o => `<button class="av-opt ${o.iso === chosen ? 'sel' : ''}" data-iso="${o.iso || ''}"><div class="avatar">${avatarHTML(o.iso)}</div>${esc(o.name)}</button>`).join('')}
      </div>
      ${unlocked.size === 0 ? '<p class="muted">Cook a dish to unlock your first flag!</p>' : ''}
    `}
    <div class="btn-row">
      ${welcome ? '' : '<button class="linkish" id="pReset" style="margin-right:auto">Reset progress</button><button class="btn ghost" id="pSwitch">👥 Switch chef</button><button class="btn ghost" id="pCancel">Cancel</button>'}
      <button class="btn gold" id="pSave">${welcome ? 'Start cooking 🍳' : 'Save'}</button>
    </div>`;
  showModal(html);
  const input = $('pName');
  setTimeout(() => input.focus(), 50);
  const box = $('modalBox');
  box.querySelectorAll('.av-opt').forEach(b => b.onclick = () => {
    box.querySelectorAll('.av-opt').forEach(x => x.classList.remove('sel'));
    b.classList.add('sel');
    chosen = b.dataset.iso || null;
  });
  const doSave = () => {
    save.name = input.value.trim().slice(0, 20) || 'Chef';
    save.avatar = chosen;
    persist(); renderHud(); hideModal();
  };
  $('pSave').onclick = doSave;
  input.onkeydown = e => { if (e.key === 'Enter') doSave(); };
  if (!welcome) {
    $('pCancel').onclick = hideModal;
    $('pSwitch').onclick = openProfiles;
    $('pReset').onclick = () => {
      showModal(`<h2>Reset progress?</h2><p>This clears all ${unlocked.size} unlocked countries and your profile look. It can't be undone.</p>
        <div class="btn-row"><button class="btn ghost" id="rNo">Keep my progress</button><button class="btn" style="background:#a8322e" id="rYes">Reset</button></div>`);
      $('rNo').onclick = () => openProfile(false);
      $('rYes').onclick = () => { unlocked.clear(); save.avatar = null; save.last = null; persist(); renderHud(); dirty = true; hideModal(); };
    };
  }
}

// =====================================================================
// UI HELPERS
// =====================================================================
let modalOpen = false;
function showModal(html) { $('modalBox').innerHTML = html; $('modal').classList.remove('hidden'); modalOpen = true; }
function hideModal() { $('modal').classList.add('hidden'); modalOpen = false; }

let toastTimer;
function toast(msg, kind = '') {
  const t = $('toast');
  t.textContent = msg;
  t.className = 'on ' + kind;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => t.className = '', 2600);
}

function confetti() {
  const colors = ['#ffc94a', '#2fbf71', '#3fa2ff', '#ff6a6a', '#b07cff', '#fff'];
  for (let i = 0; i < 90; i++) {
    const d = document.createElement('div');
    d.className = 'confetti';
    d.style.left = Math.random() * 100 + 'vw';
    d.style.background = colors[i % colors.length];
    d.style.animationDuration = (1.8 + Math.random() * 1.8) + 's';
    d.style.animationDelay = (Math.random() * 0.5) + 's';
    d.style.transform = `rotate(${Math.random() * 360}deg)`;
    document.body.appendChild(d);
    setTimeout(() => d.remove(), 4500);
  }
}

let screen = 'globe';
function showScreen(name) {
  screen = name;
  $('globeScreen').classList.toggle('active', name === 'globe');
  $('kitchen').classList.toggle('active', name === 'kitchen');
  $('glove').classList.toggle('on', name === 'kitchen');
  if (name === 'kitchen') fitStage();
  if (name === 'globe') { resize(); }
}

// =====================================================================
// GLOBE
// =====================================================================
const canvas = $('globe');
const ctx = canvas.getContext('2d');
const proj = d3.geoOrthographic().clipAngle(90).precision(0.6);
const path = d3.geoPath(proj, ctx);
const graticule = d3.geoGraticule10();
let W = 0, H = 0, zoom = 1;
let world = { lo: null, hi: null };      // {features, mesh}
let dotCountries = COUNTRIES.slice();     // drawn as dots (tiny or missing from the map)
let featById = {};
let moving = false, dragging = false, spinning = false, dirty = true;
let lastInteract = 0;
let selected = null;
let flight = null;
const stars = Array.from({ length: 180 }, () => [Math.random(), Math.random(), Math.random() * 1.3 + 0.2, Math.random()]);

proj.rotate([-20, -20, 0]);

function resize() {
  const dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  canvas.width = W * dpr; canvas.height = H * dpr;
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px';
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  updateScale(); dirty = true;
}
function baseScale() { return Math.min(W, H) * (W < 700 ? 0.42 : 0.38); }
function updateScale() { proj.scale(baseScale() * zoom).translate([W / 2, H / 2 + (W < 700 ? -30 : 10)]); }
const center = () => { const r = proj.rotate(); return [-r[0], -r[1]]; };
function setCenter(p) { proj.rotate([-p[0], -p[1], 0]); }
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const ease = t => t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2;

function countryColor(id) {
  if (!byId[id]) return '#7d8496';
  return unlocked.has(id) ? '#2fbf71' : '#d9534f';
}

function draw(now = performance.now()) {
  const r = proj.scale(), [cx, cy] = proj.translate();
  ctx.clearRect(0, 0, W, H);

  // stars
  ctx.fillStyle = '#fff';
  for (const [x, y, s, tw] of stars) {
    ctx.globalAlpha = 0.35 + 0.35 * Math.sin(now / 900 + tw * 10);
    ctx.fillRect(x * W, y * H, s, s);
  }
  ctx.globalAlpha = 1;

  // atmosphere glow
  const glow = ctx.createRadialGradient(cx, cy, r * 0.95, cx, cy, r * 1.18);
  glow.addColorStop(0, 'rgba(110,190,255,0.5)'); glow.addColorStop(1, 'rgba(110,190,255,0)');
  ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(cx, cy, r * 1.18, 0, Math.PI * 2); ctx.fill();

  // ocean
  const ocean = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  ocean.addColorStop(0, '#4aa3e8'); ocean.addColorStop(1, '#0f3768');
  ctx.fillStyle = ocean; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill();

  ctx.beginPath(); path(graticule); ctx.strokeStyle = 'rgba(255,255,255,0.08)'; ctx.lineWidth = 1; ctx.stroke();

  const set = (moving || !world.hi) ? (world.lo || world.hi) : world.hi;
  if (set) {
    for (const f of set.features) {
      ctx.beginPath(); path(f); ctx.fillStyle = countryColor(f.id); ctx.fill();
    }
    ctx.beginPath(); path(set.mesh); ctx.strokeStyle = 'rgba(255,255,255,0.55)'; ctx.lineWidth = 0.6; ctx.stroke();
  }

  // dots for tiny countries
  const c0 = center();
  const dotR = clamp(2.6 * Math.sqrt(zoom), 2.5, 7);
  for (const c of dotCountries) {
    if (d3.geoDistance([c.lon, c.lat], c0) > Math.PI / 2 - 0.02) continue;
    const [x, y] = proj([c.lon, c.lat]);
    ctx.beginPath(); ctx.arc(x, y, dotR, 0, Math.PI * 2);
    ctx.fillStyle = countryColor(c.id); ctx.fill();
    ctx.lineWidth = 1.2; ctx.strokeStyle = '#fff'; ctx.stroke();
  }

  // 3D shading
  const shade = ctx.createRadialGradient(cx - r * 0.4, cy - r * 0.45, r * 0.15, cx, cy, r * 1.02);
  shade.addColorStop(0, 'rgba(255,255,255,0.18)'); shade.addColorStop(0.55, 'rgba(255,255,255,0)'); shade.addColorStop(1, 'rgba(0,0,20,0.45)');
  ctx.fillStyle = shade; ctx.beginPath(); path({ type: 'Sphere' }); ctx.fill();

  // selection highlight
  if (selected && !flight) {
    const pulse = 0.5 + 0.5 * Math.sin(now / 250);
    const f = featById[selected.id];
    ctx.lineWidth = 2 + pulse * 1.5; ctx.strokeStyle = `rgba(255,214,90,${0.7 + 0.3 * pulse})`;
    if (f && !dotCountries.includes(selected)) { ctx.beginPath(); path(f); ctx.stroke(); }
    if (d3.geoDistance([selected.lon, selected.lat], c0) < Math.PI / 2) {
      const [x, y] = proj([selected.lon, selected.lat]);
      ctx.beginPath(); ctx.arc(x, y, 7 + pulse * 6, 0, Math.PI * 2); ctx.stroke();
      ctx.font = '600 14px Fredoka, sans-serif'; ctx.textAlign = 'center';
      ctx.fillStyle = '#000a'; ctx.fillText('★ ' + selected.capital, x + 1, y - 15);
      ctx.fillStyle = '#fff'; ctx.fillText('★ ' + selected.capital, x, y - 16);
    }
  }

  // flight path + plane
  if (flight) {
    const done = flight.interp(flight.t);
    ctx.setLineDash([6, 6]); ctx.lineWidth = 2; ctx.strokeStyle = 'rgba(255,255,255,0.6)';
    ctx.beginPath(); path({ type: 'LineString', coordinates: [done, flight.dest] }); ctx.stroke();
    ctx.setLineDash([]); ctx.lineWidth = 3; ctx.strokeStyle = '#ffd65a';
    if (flight.t > 0.001) { ctx.beginPath(); path({ type: 'LineString', coordinates: [flight.origin, done] }); ctx.stroke(); }
    // destination marker
    if (d3.geoDistance(flight.dest, c0) < Math.PI / 2) {
      const [dx, dy] = proj(flight.dest);
      ctx.beginPath(); ctx.arc(dx, dy, 6, 0, Math.PI * 2); ctx.fillStyle = '#ffd65a'; ctx.fill();
    }
    const [px, py] = proj(done);
    const a = proj(flight.interp(Math.max(0, flight.t - 0.01))), b = proj(flight.interp(Math.min(1, flight.t + 0.01)));
    const ang = Math.atan2(b[1] - a[1], b[0] - a[0]) || flight.lastAng || 0;
    flight.lastAng = ang;
    drawPlane(px, py, ang, 1.5 + Math.sin(flight.t * Math.PI) * 0.6);
  }
}

function drawPlane(x, y, a, s) {
  ctx.save();
  // shadow
  ctx.translate(x + 8, y + 10); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = 'rgba(0,0,0,0.25)'; planePath(); ctx.fill();
  ctx.restore();
  ctx.save();
  ctx.translate(x, y); ctx.rotate(a); ctx.scale(s, s);
  ctx.fillStyle = '#fff'; ctx.strokeStyle = '#2b3b55'; ctx.lineWidth = 1.2 / s;
  planePath(); ctx.fill(); ctx.stroke();
  ctx.fillStyle = '#ff5a5a'; ctx.beginPath(); ctx.rect(-15, -1.2, 5, 2.4); ctx.fill();
  ctx.restore();
}
function planePath() {
  const pts = [[16, 0], [12, -2.6], [3, -2.6], [-3, -13], [-7, -13], [-3, -2.6], [-11, -2.6], [-14, -7], [-16.5, -7], [-15, 0]];
  ctx.beginPath();
  pts.forEach(([px, py], i) => i ? ctx.lineTo(px, py) : ctx.moveTo(px, py));
  for (let i = pts.length - 2; i >= 1; i--) ctx.lineTo(pts[i][0], -pts[i][1]);
  ctx.closePath();
}

// ---- interaction ----
d3.select(canvas).call(d3.drag()
  .on('start', () => { if (flight) return; dragging = true; lastInteract = performance.now(); })
  .on('drag', ev => {
    if (flight) return;
    const r = proj.rotate(), k = 70 / proj.scale();
    proj.rotate([r[0] + ev.dx * k, clamp(r[1] - ev.dy * k, -80, 80), 0]);
    moving = true; dirty = true; lastInteract = performance.now();
  })
  .on('end', () => { dragging = false; moving = false; dirty = true; }));

canvas.addEventListener('wheel', e => {
  e.preventDefault();
  if (flight) return;
  zoom = clamp(zoom * Math.exp(-e.deltaY * 0.0012), 0.7, 8);
  updateScale(); dirty = true; lastInteract = performance.now();
}, { passive: false });
$('zIn').onclick = () => { zoom = clamp(zoom * 1.4, 0.7, 8); updateScale(); dirty = true; lastInteract = performance.now(); };
$('zOut').onclick = () => { zoom = clamp(zoom / 1.4, 0.7, 8); updateScale(); dirty = true; lastInteract = performance.now(); };

canvas.addEventListener('click', e => {
  if (flight) return;
  lastInteract = performance.now();
  const x = e.offsetX, y = e.offsetY;
  const [cx, cy] = proj.translate();
  if (Math.hypot(x - cx, y - cy) > proj.scale()) { selectCountry(null); return; }
  const c0 = center();
  // tiny-country dots first
  let best = null, bestD = 14;
  for (const c of dotCountries) {
    if (d3.geoDistance([c.lon, c.lat], c0) > Math.PI / 2) continue;
    const [px, py] = proj([c.lon, c.lat]);
    const d = Math.hypot(px - x, py - y);
    if (d < bestD) { best = c; bestD = d; }
  }
  if (!best) {
    const p = proj.invert([x, y]);
    const set = world.hi || world.lo;
    if (set && p) for (const f of set.features) if (byId[f.id] && d3.geoContains(f, p)) { best = byId[f.id]; break; }
  }
  selectCountry(best);
});

function selectCountry(c, opts = {}) {
  selected = c; dirty = true;
  const card = $('infoCard');
  if (!c) { card.classList.add('hidden'); return; }
  const done = unlocked.has(c.id);
  card.innerHTML = `
    <button class="x-btn" id="infoClose" aria-label="Close">×</button>
    <div class="flag">${flagImg(c.iso, 320)}</div>
    <h2>${esc(c.name)}</h2>
    ${c.kind ? `<div class="kind">${esc(c.kind)}</div>` : ''}
    <span class="status ${done ? 'done' : 'locked'}">${done ? '✅ Unlocked' : '🔒 Not cooked yet'}</span>
    ${done ? photoBox(c, 'infoPhoto') : ''}
    <div class="row"><b>Capital</b><span>🏛️ ${esc(c.capital)}</span></div>
    <div class="row"><b>Dish</b><span>🍽️ ${esc(c.dish)}</span></div>
    <div class="row"><b>Nature</b><span>${firstMatch(FLORA_RULES, c.flora, '🌸')} ${esc(c.flora)} · ${firstMatch(FAUNA_RULES, c.fauna, '🐾')} ${esc(c.fauna)}</span></div>
    <div style="height:10px"></div>
    <button class="fly-btn" id="flyBtn">✈️ Fly to ${esc(c.capital)} &amp; cook</button>`;
  card.classList.remove('hidden');
  $('infoClose').onclick = () => selectCountry(null);
  $('flyBtn').onclick = () => startFlight(c);
  if (opts.rotate) rotateTo([c.lon, c.lat], 1100);
}

let rotAnim = null;
function rotateTo(p, ms, done) {
  const from = center(), interp = d3.geoInterpolate(from, p), z0 = zoom;
  const z1 = Math.max(zoom, 1.4);
  const t0 = performance.now();
  rotAnim = now => {
    const k = clamp((now - t0) / ms, 0, 1), e = ease(k);
    setCenter(interp(e)); zoom = z0 + (z1 - z0) * e; updateScale();
    moving = k < 1; dirty = true;
    if (k >= 1) { rotAnim = null; done && done(); }
  };
}

$('randomBtn').onclick = () => {
  if (flight) return;
  const pool = COUNTRIES.filter(c => !unlocked.has(c.id));
  const list = pool.length ? pool : COUNTRIES;
  let c = list[Math.floor(Math.random() * list.length)];
  if (list.length > 1 && selected && c === selected) c = list[(list.indexOf(c) + 1) % list.length];
  lastInteract = performance.now();
  selectCountry(c, { rotate: true });
  if (!pool.length) toast('You\'ve cooked every country! 🏆 Replaying a random one.', 'good');
};

function startFlight(c) {
  selectCountry(null);
  selected = c;
  const dest = [c.lon, c.lat];
  let origin = save.last && byId[save.last] ? [byId[save.last].lon, byId[save.last].lat] : center();
  if (d3.geoDistance(origin, dest) < 0.08) origin = [dest[0] - 35, clamp(dest[1] + 10, -70, 70)];
  const interp = d3.geoInterpolate(origin, dest);
  const dist = d3.geoDistance(origin, dest);
  const toOrigin = d3.geoInterpolate(center(), origin);
  const z0 = zoom, T1 = 900, T2 = 1600 + dist * 900, T3 = 1200;
  flight = { origin, dest, interp, t: 0 };
  const banner = $('flightBanner');
  banner.innerHTML = `✈️ Flying to <b>${esc(c.capital)}</b>, ${esc(c.name)}…`;
  banner.classList.remove('hidden');
  $('randomBtn').disabled = true;
  const t0 = performance.now();
  flight.step = now => {
    const e = now - t0;
    if (e < T1) {
      const k = ease(e / T1); setCenter(toOrigin(k)); zoom = z0 + (1.25 - z0) * k;
    } else if (e < T1 + T2) {
      const k = ease((e - T1) / T2); flight.t = k; setCenter(interp(k)); zoom = 1.25 - Math.sin(k * Math.PI) * 0.3;
    } else if (e < T1 + T2 + T3) {
      const k = (e - T1 - T2) / T3; flight.t = 1; setCenter(dest); zoom = 1.25 + k * k * 9;
      if (k > 0.45 && !$('fade').classList.contains('on')) {
        $('fadeBig').textContent = '🛬';
        $('fadeT').textContent = `Landing in ${c.capital}…`;
        $('fadeS').textContent = `Heading to the parliament kitchen to cook ${c.dish}`;
        $('fade').classList.add('on');
      }
    } else {
      flight = null; banner.classList.add('hidden'); $('randomBtn').disabled = false;
      zoom = 1.4; updateScale();
      save.last = c.id; persist();
      setTimeout(() => { enterKitchen(c); setTimeout(() => $('fade').classList.remove('on'), 350); }, 600);
      return;
    }
    moving = true; updateScale(); dirty = true;
  };
}

function loop(now) {
  if (screen === 'globe') {
    if (flight && flight.step) flight.step(now);
    else if (rotAnim) rotAnim(now);
    else {
      const idle = !dragging && !selected && !modalOpen && now - lastInteract > 2500;
      if (idle) {
        const r = proj.rotate();
        proj.rotate([r[0] + 0.12, r[1] + (-18 - r[1]) * 0.01, 0]);
        moving = true; spinning = true; dirty = true;
      } else if (spinning) { spinning = false; moving = dragging; dirty = true; }
    }
    if (dirty || selected || flight) { draw(now); dirty = false; }
    else if ((now | 0) % 3 === 0) draw(now);   // keep the stars twinkling, cheaply
  }
  requestAnimationFrame(loop);
}

async function loadWorld() {
  const base = 'https://cdn.jsdelivr.net/npm/world-atlas@2.0.2/';
  const prep = topo => {
    const obj = topo.objects.countries;
    const fc = topojson.feature(topo, obj);
    fc.features.forEach(f => { if (f.id != null) f.id = String(f.id).padStart(3, '0'); });
    return { features: fc.features, mesh: topojson.mesh(topo, obj, (a, b) => a !== b) };
  };
  try {
    world.lo = prep(await (await fetch(base + 'countries-110m.json')).json()); dirty = true;
  } catch (e) { console.warn('110m map failed', e); }
  try {
    world.hi = prep(await (await fetch(base + 'countries-50m.json')).json());
  } catch (e) { console.warn('50m map failed', e); }
  const set = world.hi || world.lo;
  if (!set) { toast('Could not load the world map — countries are shown as dots.', 'bad'); return; }
  featById = {};
  for (const f of set.features) if (byId[f.id]) featById[f.id] = f;
  dotCountries = COUNTRIES.filter(c => !featById[c.id] || d3.geoArea(featById[c.id]) < 0.0007);
  dirty = true;
}

// =====================================================================
// KITCHEN
// =====================================================================
const stage = $('stage');
let K = null;
let uid = 0;

function fitStage() {
  const s = Math.min(window.innerWidth / 1200, window.innerHeight / 720);
  stage.style.transform = `translate(-50%,-50%) scale(${s})`;
}

function enterKitchen(c) {
  const recipeNames = new Set(c.recipe.map(r => r.name));
  const items = c.recipe.map(r => Object.assign({ uid: ++uid, name: r.name, proc: r.proc, decoy: false, state: 'stored', done: false }, ingInfo(r.name)));
  // decoys: ingredients from other countries' dishes, a few in each store
  const pool = [...new Set(COUNTRIES.flatMap(o => o.recipe.map(r => r.name)))].filter(n => !recipeNames.has(n));
  d3.shuffle(pool);
  const need = { fridge: 3, cupboard: 3 };
  for (const n of pool) {
    const info = ingInfo(n);
    if (need[info.store] > 0 && !items.some(i => i.emoji === info.emoji && i.store === info.store && i.name.split(' ')[0] === n.split(' ')[0])) {
      need[info.store]--;
      items.push(Object.assign({ uid: ++uid, name: n, proc: null, decoy: true, state: 'stored', done: false }, info));
    }
    if (!need.fridge && !need.cupboard) break;
  }
  K = { c, items, hand: null, slots: {}, mistakes: 0, finished: false, start: performance.now() };
  dishPhoto(c);   // start fetching the finished-dish photo now so it's ready at the end

  $('kTitle').innerHTML = `🏛️ Parliament Kitchen · ${esc(c.capital)}, ${esc(c.name)}<small>Today's national dish: <b>${esc(c.dish)}</b></small>`;
  $('kFlag').innerHTML = flagImg(c.iso, 320) + '<div class="label">Flag of ' + esc(c.name) + '</div>';
  $('kFlora').innerHTML = `<div class="pic">${firstMatch(FLORA_RULES, c.flora, '🌸')}</div><div class="cap">${esc(c.flora)}</div><div class="label">National flora</div>`;
  $('kFauna').innerHTML = `<div class="pic">${firstMatch(FAUNA_RULES, c.fauna, '🐾')}</div><div class="cap">${esc(c.fauna)}</div><div class="label">National fauna</div>`;
  $('kMagnet').textContent = items[0].emoji;
  $('kPlate').classList.remove('complete');
  stage.querySelectorAll('.station').forEach(s => s.classList.remove('busy', 'ready'));
  closeStorage();
  showScreen('kitchen');
  renderKitchen();
  setTimeout(() => toast(`Welcome to ${c.capital}! Read the recipe card, then grab ingredients from the fridge & cupboards.`), 700);
}

function renderKitchen() {
  if (!K) return;
  // recipe card
  const rows = K.items.filter(i => !i.decoy).map(i => {
    const a = i.proc && APPLIANCES[i.proc];
    const how = a ? (i.done ? `✓ ${a.past}` : `${a.icon} ${cap(a.verb)}`) : '🍽️ Plate';
    return `<li class="${i.state === 'plated' ? 'plated' : ''} ${i.done ? 'prepped' : ''}">
      <span class="e">${i.emoji}</span><span class="n">${esc(cap(i.name))}</span><span class="how">${how}</span>
      <span class="ck">${i.state === 'plated' ? '✔' : ''}</span></li>`;
  }).join('');
  const left = K.items.filter(i => !i.decoy && i.state !== 'plated').length;
  $('kRecipe').innerHTML = `<h3>${esc(K.c.dish)}</h3><div class="sub">${left ? `${left} ingredient${left > 1 ? 's' : ''} to go` : 'Ready to serve!'}</div><ul>${rows}</ul>`;

  // plate
  const plated = K.items.filter(i => i.state === 'plated');
  $('kFood').innerHTML = plated.map((i, n) => {
    const total = Math.max(plated.length, 1), ang = (n / total) * Math.PI * 2 + 0.6;
    const x = 50 + Math.cos(ang) * (total > 1 ? 26 : 0), y = 32 + Math.sin(ang) * (total > 1 ? 8 : 0) - n * 1.5;
    return `<span style="left:${x}%;bottom:${y}px">${i.emoji}</span>`;
  }).join('');

  // appliance slots
  for (const p of Object.keys(APPLIANCES)) {
    const st = stage.querySelector(`[data-act="${p}"]`);
    const slot = st.querySelector('.slot');
    const it = K.slots[p];
    st.classList.toggle('busy', !!it && it.state === 'cooking');
    st.classList.toggle('ready', !!it && it.state === 'ready');
    if (!it) { slot.className = 'slot'; slot.innerHTML = ''; continue; }
    if (!slot.dataset.uid || +slot.dataset.uid !== it.uid || slot.dataset.state !== it.state) {
      slot.dataset.uid = it.uid; slot.dataset.state = it.state;
      slot.className = 'slot show ' + (it.state === 'ready' ? 'ready' : '');
      slot.innerHTML = `<span class="em">${it.emoji}</span><div class="bar"><i></i></div>`;
      if (it.state === 'cooking') {
        const bar = slot.querySelector('.bar i');
        bar.style.transition = `width ${APPLIANCES[p].time}ms linear`;
        requestAnimationFrame(() => requestAnimationFrame(() => bar.style.width = '100%'));
      }
    }
  }
  $('flamePan').classList.toggle('on', K.slots.f && K.slots.f.state === 'cooking');
  $('flamePot').classList.toggle('on', K.slots.b && K.slots.b.state === 'cooking');

  // glove
  const h = K.hand;
  $('gloveHeld').textContent = h ? h.emoji : '';
  $('gloveTag').textContent = h ? cap(h.name) + (h.done ? ` (${APPLIANCES[h.proc].past})` : '') : '';
}

// ---- storage panels ----
function openStorage(store) {
  const list = K.items.filter(i => i.store === store && i.state === 'stored');
  d3.shuffle(list);
  const isFridge = store === 'fridge';
  $('storage').className = isFridge ? 'fridgep' : 'cupp';
  $('storagePanel').innerHTML = `
    <h3>${isFridge ? '🧊 Fridge' : '🚪 Cupboards'}</h3>
    <p>Not everything in here belongs in ${esc(K.c.dish)} — check the recipe card!</p>
    ${list.length ? `<div class="shelf">${list.map(i => `<button class="item" data-uid="${i.uid}"><span class="em">${i.emoji}</span>${esc(cap(i.name))}</button>`).join('')}</div>`
      : '<div class="empty">Nothing left in here.</div>'}
    <div class="close-row"><button class="btn ghost" id="storageClose">Close</button></div>`;
  $('storageClose').onclick = closeStorage;
  $('storagePanel').querySelectorAll('.item').forEach(b => b.onclick = ev => {
    ev.stopPropagation();
    const it = K.items.find(i => i.uid === +b.dataset.uid);
    it.state = 'hand'; K.hand = it;
    closeStorage(); renderKitchen();
    const a = it.proc && APPLIANCES[it.proc];
    if (!it.decoy) toast(`Got the ${it.name}! ${a ? `Recipe says: ${a.verb} it in the ${a.label.toLowerCase()}.` : 'This one goes straight onto the plate.'}`);
    else toast(`Got the ${it.name}.`);
  });
}
function closeStorage() { $('storage').className = 'hidden'; }
$('storage').addEventListener('click', e => { if (e.target.id === 'storage') closeStorage(); });

function putBack(msg) {
  const it = K.hand;
  it.state = 'stored'; K.hand = null;
  toast(msg || `Put the ${it.name} back in the ${it.store === 'fridge' ? 'fridge' : 'cupboard'}.`);
  renderKitchen();
}

// ---- clicks on stations ----
stage.addEventListener('click', e => {
  if (!K || K.finished) return;
  if (e.target.closest('#storage')) return;
  const st = e.target.closest('[data-act]');
  if (!st) return;
  const act = st.dataset.act;
  const h = K.hand;

  if (act === 'globe') return leaveKitchen();
  if (act === 'fridge' || act === 'cupboard') {
    if (h) {
      if (h.store !== act) return toast(`The ${h.name} lives in the ${h.store === 'fridge' ? 'fridge' : 'cupboards'}.`, 'bad');
      return putBack();
    }
    return openStorage(act);
  }
  if (act === 'bin') {
    if (!h) return toast('Hold an ingredient and click here to put it back where it came from.');
    return putBack(`Put the ${h.name} back.`);
  }
  if (act === 'plate') return toPlate();
  if (APPLIANCES[act]) return useAppliance(act);
});

function useAppliance(p) {
  const a = APPLIANCES[p], h = K.hand, slot = K.slots[p];
  if (slot) {
    if (slot.state === 'cooking') return toast(`The ${a.label.toLowerCase()} is busy with the ${slot.name}…`);
    if (h) return toast(`Your glove is full! Put the ${h.name} somewhere first, then collect the ${slot.name}.`, 'bad');
    slot.state = 'hand'; K.hand = slot; K.slots[p] = null;
    toast(`Picked up the ${a.past} ${slot.name}. Now put it on the plate!`);
    return renderKitchen();
  }
  if (!h) return toast(`The ${a.label.toLowerCase()} is empty. Grab something from the fridge or cupboards first.`);
  if (h.decoy) { K.mistakes++; return toast(`Hmm… ${h.name} isn't in ${K.c.dish}. Put it back!`, 'bad'); }
  if (h.done) return toast(`The ${h.name} is already ${APPLIANCES[h.proc].past}. Pop it on the plate!`);
  if (!h.proc) { K.mistakes++; return toast(`The ${h.name} doesn't need cooking — it goes straight on the plate.`, 'bad'); }
  if (h.proc !== p) { K.mistakes++; return toast(`The ${h.name} doesn't go in the ${a.label.toLowerCase()}. Check the recipe card!`, 'bad'); }

  h.state = 'cooking'; K.slots[p] = h; K.hand = null;
  const cookingUid = h.uid;
  renderKitchen();
  setTimeout(() => {
    if (!K || K.slots[p] !== h || h.uid !== cookingUid) return;
    h.state = 'ready'; h.done = true;
    toast(`${a.icon} The ${h.name} is ${a.past}! Click the ${a.label.toLowerCase()} to pick it up.`, 'good');
    renderKitchen();
  }, a.time);
}

function toPlate() {
  const h = K.hand;
  if (!h) return toast(`Bring ingredients here to build your ${K.c.dish}.`);
  if (h.decoy) { K.mistakes++; return toast(`${cap(h.name)} doesn't belong in ${K.c.dish}! Put it back.`, 'bad'); }
  if (h.proc && !h.done) {
    K.mistakes++;
    const a = APPLIANCES[h.proc];
    return toast(`Not yet! The ${h.name} needs to be ${a.past} first.`, 'bad');
  }
  h.state = 'plated'; K.hand = null;
  renderKitchen();
  if (K.items.every(i => i.decoy || i.state === 'plated')) finishDish();
  else toast(`${h.emoji} Added the ${h.name}.`, 'good');
}

function finishDish() {
  K.finished = true;
  const c = K.c;
  const wasNew = !unlocked.has(c.id);
  unlocked.add(c.id); save.last = c.id; persist(); renderHud();
  $('kPlate').classList.add('complete');
  dishPhoto(c).then(ph => { if (ph && K && K.c === c) $('kFood').innerHTML = `<img src="${esc(ph.src)}" alt="">`; });
  confetti();
  const stars = K.mistakes === 0 ? 3 : K.mistakes <= 2 ? 2 : 1;
  const secs = Math.round((performance.now() - K.start) / 1000);
  setTimeout(() => {
    showModal(`
      <div class="center">
        ${photoBox(c, 'donePhoto')}
        <div class="credit" id="donePhotoCredit"></div>
        <h2>${esc(c.dish)} is served!</h2>
        <div class="stars">${'⭐'.repeat(stars)}${'☆'.repeat(3 - stars)}</div>
        <p>${wasNew ? `<b>${esc(c.name)}</b> is now unlocked and glows green on your globe.` : `You cooked ${esc(c.name)}'s dish again!`}</p>
        <p class="muted">${secs}s · ${K.mistakes} mistake${K.mistakes === 1 ? '' : 's'} · ${unlocked.size} / ${TOTAL} places</p>
      </div>
      <div class="btn-row" style="justify-content:center">
        <button class="btn ghost" id="useFlag">${flagImg(c.iso, 40).replace('<img', '<img style="height:14px;vertical-align:-2px;margin-right:6px"')}Use this flag on my profile</button>
        <button class="btn gold" id="backGlobe">🌍 Back to the globe</button>
      </div>`);
    $('useFlag').onclick = () => {
      save.avatar = c.iso; persist(); renderHud();
      $('useFlag').textContent = '✓ Profile updated'; $('useFlag').disabled = true;
    };
    $('backGlobe').onclick = () => { hideModal(); returnToGlobe(); };
  }, 900);
}

function leaveKitchen() {
  const started = K.items.some(i => i.state === 'plated' || i.state === 'cooking' || i.state === 'ready');
  if (!started) return returnToGlobe();
  showModal(`<h2>🌍 Head back to the globe?</h2><p>Your ${esc(K.c.dish)} isn't finished — progress in this kitchen will be lost. You can always come back later.</p>
    <div class="btn-row"><button class="btn ghost" id="stay">Keep cooking</button><button class="btn gold" id="go">Back to globe</button></div>`);
  $('stay').onclick = hideModal;
  $('go').onclick = () => { hideModal(); returnToGlobe(); };
}

function returnToGlobe() {
  const c = K.c;
  K = null;
  $('fadeBig').textContent = '🛫'; $('fadeT').textContent = 'Back to the globe…'; $('fadeS').textContent = '';
  $('fade').classList.add('on');
  setTimeout(() => {
    showScreen('globe');
    setCenter([c.lon, c.lat]); zoom = 1.4; updateScale();
    selectCountry(c);
    lastInteract = performance.now();
    $('fade').classList.remove('on');
  }, 450);
}

// ---- glove cursor ----
const glove = $('glove');
let isTouch = false;
function moveGlove(x, y) { glove.style.transform = `translate(${x - 20}px,${y - 8}px)`; }
window.addEventListener('pointermove', e => {
  if (e.pointerType === 'touch') return;
  if (isTouch) { isTouch = false; $('kitchen').classList.remove('touch'); }
  moveGlove(e.clientX, e.clientY);
});
window.addEventListener('pointerdown', e => {
  if (e.pointerType === 'touch') { isTouch = true; $('kitchen').classList.add('touch'); }
  moveGlove(e.clientX, e.clientY);
});
window.addEventListener('keydown', e => {
  if (e.key !== 'Escape') return;
  if (modalOpen) return;
  if (screen === 'kitchen' && K) {
    if (!$('storage').classList.contains('hidden')) closeStorage();
    else if (K.hand) putBack();
  } else if (screen === 'globe') selectCountry(null);
});

// =====================================================================
// BOOT
// =====================================================================
window.addEventListener('resize', () => { if (screen === 'globe') resize(); else fitStage(); });
$('profileBtn').onclick = () => openProfile(false);
$('switchBtn').onclick = openProfiles;
resize();
renderHud();
requestAnimationFrame(loop);
loadWorld();
if (!save.name) openProfile(true);
})();
