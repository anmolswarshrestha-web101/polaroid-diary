// ===== Polaroid Diary — CIS046-3 Week 8 prototype =====
const $ = s => document.querySelector(s);
const WEATHER_COORDS = [27.7, 85.3];            // change to your own latitude/longitude
const K = { users: 'pd_users', entries: u => 'pd_entries_' + u };
const POS = 'happy,love,great,good,fun,excited,proud,grateful,thankful,amazing,beautiful,enjoyed,enjoy,smile,laughed,laugh,won,calm,peace,best,wonderful,friends,friend,celebrate,success,finished,learned,progress'.split(',');
const NEG = 'sad,tired,angry,stress,stressed,hard,worried,bad,anxious,lonely,upset,exhausted'.split(',');
const STOP = new Set('that with have this from were they what when then than just very today about would there their been really because while still'.split(' '));

let user = sessionStorage.getItem('pd_user'), photo = null, stream = null;

// ---------- helpers ----------
const load = k => JSON.parse(localStorage.getItem(k) || 'null');
const save = (k, v) => localStorage.setItem(k, JSON.stringify(v));
const entries = () => load(K.entries(user)) || [];
const pad = n => String(n).padStart(2, '0');
const mk = d => d.getFullYear() + '-' + pad(d.getMonth() + 1);
const esc = s => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const say = t => $('#status').textContent = t;
const wordsOf = t => t.toLowerCase().match(/[a-z']+/g) || [];

// ---------- virtual identity: register / login with salted PBKDF2 hash ----------
async function hash(pw, salt) {
  const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw), 'PBKDF2', false, ['deriveBits']);
  const bits = await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(salt), iterations: 100000, hash: 'SHA-256' }, key, 256);
  return [...new Uint8Array(bits)].map(b => b.toString(16).padStart(2, '0')).join('');
}
async function auth(register) {
  const n = $('#user').value.trim().toLowerCase(), p = $('#pass').value, users = load(K.users) || {};
  const msg = t => $('#msg').textContent = t;
  if (!n || p.length < 6) return msg('Enter a username and a password of 6+ characters');
  if (register) {
    if (users[n]) return msg('That username is taken');
    const salt = crypto.randomUUID();
    users[n] = { salt, hash: await hash(p, salt) };
    save(K.users, users);
  } else {
    const u = users[n];
    if (!u || u.hash !== await hash(p, u.salt)) return msg('Wrong username or password');
  }
  sessionStorage.setItem('pd_user', n);   // session identity
  user = n;
  start();
}

// ---------- camera ----------
async function openCam() {
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' } });
    $('#cam').srcObject = stream;
    $('#cam').hidden = false; $('#snap').hidden = false; $('#closeCam').hidden = false; $('#framed').hidden = true;
  } catch (err) {                          // no camera / permission denied → tell the user why
    say('Camera error: ' + err.name + ' — use "Upload / take photo" instead');
  }
}
function stopCam() {
  if (stream) stream.getTracks().forEach(t => t.stop());
  $('#cam').hidden = true; $('#snap').hidden = true; $('#closeCam').hidden = true;
  $('#framed').hidden = !photo;            // closing the camera brings back the photo you already took
}
function toSquare(el, w, h) {             // centre-crop to a square, shrink to save storage
  const s = Math.min(w, h), c = document.createElement('canvas');
  c.width = c.height = 500;
  c.getContext('2d').drawImage(el, (w - s) / 2, (h - s) / 2, s, s, 0, 0, 500, 500);
  return c.toDataURL('image/jpeg', 0.7);
}
function setPhoto(url) {
  photo = url; stopCam();
  const d = new Date(), pol = $('#framed .polaroid');
  $('#preview').src = url; $('#framed').hidden = false;
  $('#liveDate').textContent = mk(d) + '-' + pad(d.getDate());
  pol.classList.remove('develop'); void pol.offsetWidth; pol.classList.add('develop');   // restart "developing" effect
}

// ---------- interoperability: Open-Meteo REST API (JSON over HTTPS, no key) ----------
async function weather() {
  try {
    const [la, lo] = WEATHER_COORDS;
    const r = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${la}&longitude=${lo}&current=temperature_2m,weather_code`);
    const c = (await r.json()).current, code = c.weather_code;
    const icon = code === 0 ? '☀️' : code < 4 ? '⛅' : code < 50 ? '🌫️' : code < 70 ? '🌧️' : code < 80 ? '❄️' : code < 90 ? '🌦️' : '⛈️';
    return `${icon} ${Math.round(c.temperature_2m)}°C`;
  } catch { return ''; }                  // offline → entry still saves
}

// ---------- pages ----------
function show(page) {
  document.body.dataset.page = page;          // lets CSS pick a background per page
  $('#writePage').hidden = page !== 'write';
  $('#galleryPage').hidden = page !== 'gallery';
  $('#navWrite').classList.toggle('on', page === 'write');
  $('#navGallery').classList.toggle('on', page === 'gallery');
  if (page === 'gallery') render();
}

// ---------- polaroid + frames ----------
const polaroid = e => `
  <figure class="polaroid" data-id="${e.id}" style="--r:${(e.ts % 7) - 3}deg">
    <img src="${e.img}" alt="">
    <figcaption><p>${esc(e.text)}</p><small>${e.day} ${e.weather || ''}</small></figcaption>
  </figure>`;
const QUOTES = ['Look how far you’ve come', 'Every day counts, and you showed up', 'You turn ordinary days into memories', 'Proud of you, always', 'Small moments, big heart'];
const NOTES = ['I know good days exist because I wrote them down.', 'Every page proves you kept going.', 'This month was yours — keep shining.', 'Little moments are the best ones.'];
const monthName = m => new Date(m + '-01').toLocaleString('en', { month: 'long', year: 'numeric' });
const snip = (t, n) => esc(t.length > n ? t.slice(0, n).replace(/\s+\S*$/, '') + '…' : t);   // cut at a word boundary
const keyword = e => {                     // one word from the note, shown like marker pen on the polaroid
  const w = wordsOf(e.text).filter(x => x.length > 3 && !STOP.has(x)).sort((a, b) => b.length - a.length)[0];
  return (w || e.day.slice(8)).toUpperCase();
};
const snap = e => `<figure class="polaroid" data-id="${e.id}" style="--r:${(e.ts % 5) - 2}deg">
  <img src="${e.img}" alt=""><div class="lbl">${esc(keyword(e))}</div></figure>`;
function paragraph(g) {                    // generated text with positive feedback
  const bits = g.map(e => `“${snip(e.text, 20)}”`).join(', ');
  const pos = g.flatMap(e => wordsOf(e.text)).filter(w => POS.includes(w)).length;
  const tail = pos ? 'Your words were full of light.' : 'You kept showing up — that is real strength.';
  return `${bits}. ${tail} Be proud of every page you wrote.`;
}
function scrap(g, i) {                     // moon scrapbook frame (3 photos)
  return `<div class="frame ms"><div class="sheet">
    ${g.map((e, k) => `<div class="mp mp${k + 1}">${snap(e)}</div>`).join('')}
    <div class="mtitle"><b>${monthName(g[0].day.slice(0, 7))}</b>${QUOTES[i % QUOTES.length]}</div>
    <div class="mnote">${paragraph(g)}</div>
  </div></div>`;
}
const stripFrame = g => `<div class="frame tall"><div class="photostrip"><div class="wstrip">${
  g.map(e => `<img class="shot" src="${e.img}" data-id="${e.id}" alt="">`).join('')}</div></div></div>`;
function collage(g, i) {                   // vintage collage frame (5 photos); photos sit BEHIND the artwork so clips, flowers and layered polaroids overlap them
  const l = k => g[k] ? `<div class="vl vl${k + 1}">${esc(keyword(g[k]))}</div>` : '';
  return `<div class="frame vf"><div class="vsheet">
    ${g.map((e, k) => `<img class="vph vw${k + 1}" src="${e.img}" data-id="${e.id}" alt="">`).join('')}
    <img class="vcover" src="frame-vintage-cutout.webp" alt="">
    ${l(0)}${l(3)}
  </div>
  <div class="vcap"><b>${monthName(g[0].day.slice(0, 7))}</b><i>${QUOTES[i % QUOTES.length]}</i>
    <p>${paragraph(g)}</p></div></div>`;
}
function framesHTML(list, strip) {
  const n = strip ? 5 : 3, out = [];
  for (let i = 0; i < list.length; i += n) out.push(strip ? collage(list.slice(i, i + n), i / n) : scrap(list.slice(i, i + n), i / n));
  return out.join('');
}
function render() {
  const m = $('#month').value, strip = $('#layout').value === 'strip';
  $('#gallery').innerHTML = framesHTML(entries().filter(e => e.day.startsWith(m)), strip)
    || '<div class="empty"><h3>No memories yet</h3><p class="muted">Open the Write page to add your first one for this month.</p></div>';
}

// ---------- monthly recap with positive feedback ----------
function showRecap(m) {
  const es = entries().filter(e => e.day.startsWith(m)), d = $('#recap');
  const label = new Date(m + '-01').toLocaleString('en', { month: 'long', year: 'numeric' });
  if (!es.length) { d.innerHTML = `<h2>${label}</h2><p>No memories yet. Your next page is waiting.</p><button data-close>Close</button>`; return d.showModal(); }
  const words = es.flatMap(e => wordsOf(e.text)), freq = {};
  words.filter(w => w.length > 3 && !STOP.has(w)).forEach(w => freq[w] = (freq[w] || 0) + 1);
  const top = Object.entries(freq).sort((a, b) => b[1] - a[1]).slice(0, 3).map(x => x[0]);
  const pos = words.filter(w => POS.includes(w)).length, neg = words.filter(w => NEG.includes(w)).length;
  const score = e => wordsOf(e.text).filter(w => POS.includes(w)).length;
  const best = [...es].sort((a, b) => score(b) - score(a) || b.text.length - a.text.length)[0];
  const days = new Set(es.map(e => e.day)).size, s = n => n === 1 ? '' : 's';
  const mood = pos >= neg ? 'Your words this month were full of light — keep noticing the good things.'
                          : 'Some days felt heavy, yet you kept showing up to write. That quiet consistency is real strength.';
  d.innerHTML = `
    <h2>Your ${label} recap</h2>
    <p>You captured <b>${es.length}</b> moment${s(es.length)} on <b>${days}</b> day${s(days)} and wrote <b>${words.length}</b> words.
       ${top.length ? `Your month kept coming back to “${top.join('”, “')}”.` : ''}</p>
    <p>${mood} Be proud of yourself — see you next month! 🌟</p>
    <h3>Your memory frames</h3>
    <div class="recapframes">${framesHTML(es, false)}</div>
    <button data-close>Close</button>`;
  d.showModal();
}
function autoRecap() {                    // last day of month → this month; otherwise → last month
  const t = new Date(), last = new Date(t.getFullYear(), t.getMonth() + 1, 0).getDate() === t.getDate();
  const m = last ? mk(t) : mk(new Date(t.getFullYear(), t.getMonth() - 1, 1)), seen = 'pd_seen_' + user + m;
  if (!localStorage.getItem(seen) && entries().some(e => e.day.startsWith(m))) { localStorage.setItem(seen, 1); showRecap(m); }
}

// ---------- start ----------
function start() {
  $('#auth').hidden = true; $('#app').hidden = false;
  $('#month').value = mk(new Date());
  show(entries().length ? 'gallery' : 'write'); autoRecap();
}

// ---------- event listeners (event-driven architecture) ----------
$('#login').onclick = () => auth(false);
$('#register').onclick = () => auth(true);
$('#pass').onkeydown = e => { if (e.key === 'Enter') auth(false); };
$('#logout').onclick = () => { sessionStorage.removeItem('pd_user'); location.reload(); };
$('#open').onclick = openCam;
$('#closeCam').onclick = stopCam;
$('#snap').onclick = () => setPhoto(toSquare($('#cam'), $('#cam').videoWidth, $('#cam').videoHeight));
$('#file').onchange = e => {
  const f = e.target.files[0]; if (!f) return;
  const i = new Image();
  i.onload = () => { setPhoto(toSquare(i, i.width, i.height)); URL.revokeObjectURL(i.src); };
  i.src = URL.createObjectURL(f);
};
$('#entry').onsubmit = async e => {
  e.preventDefault();
  const text = $('#text').value.trim();
  if (!photo || !text) return say('Add a photo and a note first.');
  say('Developing your photo…');
  const d = new Date(), w = await weather(), list = entries();
  list.unshift({ id: d.getTime(), ts: d.getTime(), day: mk(d) + '-' + pad(d.getDate()), img: photo, text, weather: w });
  try { save(K.entries(user), list); } catch { return say('Storage full — delete some old memories'); }
  photo = null; $('#framed').hidden = true; $('#text').value = ''; $('#live').textContent = 'Your note appears here…';
  say('Saved'); setTimeout(() => say(''), 2000);   // timeout event
  $('#month').value = mk(d); setTimeout(() => show('gallery'), 900);
};
$('#month').onchange = render;
$('#recapBtn').onclick = () => showRecap($('#month').value || mk(new Date()));
$('#text').oninput = () => $('#live').textContent = $('#text').value || 'Your note appears here…';
$('#navWrite').onclick = () => show('write');
$('#navGallery').onclick = () => show('gallery');
$('#layout').onchange = render;
$('#gallery').onclick = e => {             // click a photo → big view with full note
  const t = e.target.closest('[data-id]'); if (!t) return;
  const en = entries().find(x => x.id == t.dataset.id), d = $('#recap');
  d.innerHTML = `<div class="big">${polaroid(en)}</div><p class="full">${esc(en.text)}</p>
    <button data-del="${en.id}" class="alt">Delete</button> <button data-close>Close</button>`;
  d.showModal();
};
$('#recap').onclick = e => {
  const d = $('#recap'), del = e.target.dataset.del;
  if (e.target.dataset.close !== undefined) d.close();
  if (del && confirm('Delete this memory?')) { save(K.entries(user), entries().filter(x => x.id != del)); d.close(); render(); }
};

if (user) start();
