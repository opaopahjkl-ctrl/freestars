(() => {
  'use strict';

  const tg = window.Telegram && window.Telegram.WebApp;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Number(n).toLocaleString('ru-RU');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

  /* ---------- Каталог NFT (тот же порядок, что в боте) ---------- */
  const NFT = [
    { n: 'Звёздный кристалл', v: 500, e: '💎', w: 30, c: '#6ee7b7' },
    { n: 'Лунный кот', v: 600, e: '🐱', w: 25, c: '#6ee7b7' },
    { n: 'Золотой кубок', v: 750, e: '🏆', w: 18, c: '#7aa7ff' },
    { n: 'Космо-шар', v: 900, e: '🔮', w: 12, c: '#7aa7ff' },
    { n: 'Неоновый череп', v: 1100, e: '💀', w: 7, c: '#c084fc' },
    { n: 'Огненный дракон', v: 1300, e: '🐉', w: 5, c: '#c084fc' },
    { n: 'Ледяная корона', v: 1600, e: '👑', w: 2.5, c: '#ffc94a' },
    { n: 'Алмазное сердце', v: 2000, e: '💖', w: 0.5, c: '#ff7ab6' },
  ];
  const NFT_TOTAL_W = NFT.reduce((a, x) => a + x.w, 0);
  const SRC_TAG = ['🎁 из кейса', '🛒 куплен', '🚀 апгрейд', '🎰 платный кейс'];   // откуда предмет в инвентаре
  // Платные кейсы (как CASES в боте): w — шансы NFT по порядку каталога в десятитысячных
  const CASES = [
    { n: 'Бронзовый кейс', e: '🥉', p: 650, w: [4928, 2895, 1303, 586, 202, 70, 14, 2] },
    { n: 'Серебряный кейс', e: '🥈', p: 1000, w: [1873, 1730, 1535, 1362, 1162, 991, 780, 567] },
    { n: 'Золотой кейс', e: '🥇', p: 1500, w: [522, 587, 700, 836, 1058, 1338, 1906, 3053] },
    { n: 'Алмазный кейс', e: '💠', p: 1900, w: [68, 91, 144, 227, 417, 765, 1899, 6389] },
  ];

  /* ---------- Параметры от бота ---------- */
  const params = new URLSearchParams(location.search);
  const CFG = {
    nextAt: (Number(params.get('next')) || 0) * 1000,
    admin: params.get('admin') === '1',
    max: clamp(Number(params.get('max')) || 5000, 10, 100000),
    support: params.get('support') || 'https://staticgram.top/BotHelper',
    link: params.get('link') || '',
    src: params.get('src') || '',
    api: (params.get('api') || '').replace(/\/+$/, ''),
  };

  function decodeSnap(b64) {
    try {
      b64 = b64.replace(/-/g, '+').replace(/_/g, '/');
      while (b64.length % 4) b64 += '=';
      const bytes = Uint8Array.from(atob(b64), c => c.charCodeAt(0));
      return JSON.parse(new TextDecoder().decode(bytes));
    } catch (_) { return null; }
  }
  let SNAP = decodeSnap(params.get('d') || '');
  const DEMO = !SNAP;               // открыто просто в браузере: показываем демо-данные
  if (DEMO) SNAP = { b: 1250, lk: 400, dy: 'demo', bn: 640, cs: 3, iv: [[1, 0], [2, 4], [3, 6]], in: 3, p: [], q: [], c: { p: 0, d: 0, r: 0, q: 0 },
    ma: [{ i: 12, s: 500, r: 'Недостаточно информации в заявке', a: '', c: '' }] };
  if (DEMO) {
    const now = Math.floor(Date.now() / 1000);
    SNAP.pf = { dd: 12, st: 3, bs: 7, be: 6400, cc: 9, ns: 4, se: 2600, tu: 500, wd: 300, dn: 150, gm: 7, gn: -120, to: 200, ti: 0, ar: 3, ap: 1, as: 500, nv: 3000,
      sn: now - 86400 * 40,
      hy: [[now - 3600, 'bonus', 640, ''], [now - 3700, 'ach', 300, 'Огонь'], [now - 5000, 'nft', 0, '🐉 Огненный дракон · 1300 ⭐'],
        [now - 90000, 'sell', 1100, ''], [now - 91000, 'req_ok', 500, 'Заявка №3 · выплата в Telegram'], [now - 200000, 'withdraw', -300, ''],
        [now - 260000, 'req_no', 0, 'Заявка №2 · мало деталей'], [now - 270000, 'appeal', 0, 'По заявке №2'], [now - 400000, 'topup', 500, ''], [now - 500000, 'donate', 150, 'Спасибо за поддержку!']],
      hx: [[640, 'bonus', now - 3600], [1100, 'sell', now - 90000], [-300, 'withdraw', now - 200000], [500, 'topup', now - 400000]] };
  }

  // sendData работает только из кнопки клавиатуры. Из меню бота мини-апп открывается без неё.
  const inTg = !!(tg && tg.platform && tg.platform !== 'unknown');
  const hasQuery = !!(tg && tg.initDataUnsafe && tg.initDataUnsafe.query_id);
  let needKb = inTg && (CFG.src ? CFG.src !== 'kb' : hasQuery);

  const DESC_MIN = 20, DESC_MAX = 800, DON_MIN = 1, DON_MAX = 100000;
  const DON_PRESETS = [10, 50, 100, 250, 500, 1000];
  const STAR_CHIPS = [10, 50, 100, 500, 1000, 5000].filter(v => v <= CFG.max);

  const S = { screen: 'home', stars: 100, desc: '', donate: 50, custom: '', wmode: 'topup', wamt: '' };

  /* ---------- Настройки и темы ---------- */
  const THEMES = [
    { id: 'standard', n: 'Стандарт', a: '#ffc94a', b: '#1b2152' },
    { id: 'red', n: 'Красный', a: '#ff6b6b', b: '#3a1520' },
    { id: 'blue', n: 'Синий', a: '#4cc9f0', b: '#112b4f' },
    { id: 'green', n: 'Зелёный', a: '#7ae582', b: '#123a2e' },
    { id: 'purple', n: 'Фиолетовый', a: '#c084fc', b: '#2a1a4d' },
    { id: 'pink', n: 'Розовый', a: '#ff7ab6', b: '#4a1839' },
    { id: 'black', n: 'Тёмная', a: '#ffc94a', b: '#0f0f14' },
  ];
  const PREFS = { theme: 'standard', haptic: true, sky: true };
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch (_) { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch (_) {} },
  };
  const hadPrefs = store.get('sk_prefs') !== null;
  try { Object.assign(PREFS, JSON.parse(store.get('sk_prefs') || '{}')); } catch (_) {}
  if (!THEMES.some(t => t.id === PREFS.theme)) PREFS.theme = 'standard';
  let skyCol = '#eef0ff', goldCol = '#ffc94a';
  const savePrefs = () => {
    store.set('sk_prefs', JSON.stringify(PREFS));
    try { tg.CloudStorage.setItem('theme', PREFS.theme); } catch (_) {}   // тема синхронизируется между устройствами
  };

  const haptic = (kind = 'light') => {
    try {
      const h = tg && tg.HapticFeedback;
      if (!h || !PREFS.haptic) return;
      if (kind === 'select') h.selectionChanged();
      else if (kind === 'ok' || kind === 'err') h.notificationOccurred(kind === 'ok' ? 'success' : 'error');
      else h.impactOccurred(kind);
    } catch (_) {}
  };

  try {
    if (tg) {
      tg.ready(); tg.expand();
      tg.setHeaderColor && tg.setHeaderColor('#12163a');
      tg.setBackgroundColor && tg.setBackgroundColor('#12163a');
    }
  } catch (_) {}

  /* ---------- Небо ---------- */
  const canvas = $('#sky'), ctx = canvas.getContext('2d');
  let W = 0, H = 0, stars = [], sparks = [];

  function resize() {
    const dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(clamp(W * H / 9000, 40, 90));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H, r: Math.random() * 1.4 + .3,
      ph: Math.random() * 6.28, sp: Math.random() * .8 + .3, gold: Math.random() < .14,
    }));
    if (reduce) draw(0);
  }
  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of (PREFS.sky ? stars : [])) {
      ctx.globalAlpha = reduce ? .6 : .35 + .55 * (.5 + .5 * Math.sin(t / 1000 * s.sp + s.ph));
      ctx.fillStyle = s.gold ? goldCol : skyCol;
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    for (const p of sparks) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = goldCol;
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * p.life + .6, 0, 6.283); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.vy += .12; p.life -= .022;
    }
    sparks = sparks.filter(p => p.life > 0);
    ctx.globalAlpha = 1;
  }
  function loop(t) { if (!document.hidden && (PREFS.sky || sparks.length)) draw(t); requestAnimationFrame(loop); }
  function burst(x, y) {
    if (reduce) return;
    for (let i = 0; i < 16; i++) {
      const a = Math.random() * 6.283, v = Math.random() * 3.4 + 1.2;
      sparks.push({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v - 1.6, life: 1 });
    }
  }
  const burstAt = el => { const r = el.getBoundingClientRect(); burst(r.left + r.width / 2, r.top + r.height / 2); };
  addEventListener('resize', resize);
  resize();
  if (!reduce) requestAnimationFrame(loop);

  // Применяет тему: переменные, цвет шапки Telegram, цвета неба
  function applyTheme(id) {
    PREFS.theme = id;
    document.documentElement.setAttribute('data-theme', id);
    const cs = getComputedStyle(document.documentElement);
    const v = n => cs.getPropertyValue(n).trim();
    skyCol = v('--sky') || skyCol; goldCol = v('--star') || goldCol;
    const ink = v('--ink') || '#12163a';
    const meta = document.querySelector('meta[name="theme-color"]'); if (meta) meta.setAttribute('content', ink);
    try {
      if (tg) {
        tg.setHeaderColor && tg.setHeaderColor(ink);
        tg.setBackgroundColor && tg.setBackgroundColor(ink);
        tg.setBottomBarColor && tg.setBottomBarColor(ink);
      }
    } catch (_) {}
    if (reduce) draw(0);
  }
  applyTheme(PREFS.theme);
  // первый запуск на этом устройстве: подтягиваем тему, выбранную на другом
  if (!hadPrefs) {
    try {
      tg.CloudStorage.getItem('theme', (err, val) => {
        if (!err && THEMES.some(t => t.id === val)) { applyTheme(val); renderThemes(); store.set('sk_prefs', JSON.stringify(PREFS)); }
      });
    } catch (_) {}
  }

  /* ---------- Общее: приветствие, баланс, статус ---------- */
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  $('#hello').textContent = user && user.first_name ? `Привет, ${user.first_name}!` : 'Привет!';

  const fullName = user ? [user.first_name, user.last_name].filter(Boolean).join(' ') || user.username || 'Гость' : 'Гость';
  function fillAvatar(el) {
    el.textContent = '';
    const letter = (fullName || '★').trim().charAt(0).toUpperCase() || '★';
    if (user && user.photo_url) {
      const img = document.createElement('img');
      img.alt = ''; img.referrerPolicy = 'no-referrer'; img.src = user.photo_url;
      img.onerror = () => { el.textContent = letter; };
      el.appendChild(img);
    } else { el.textContent = letter; }
  }
  fillAvatar($('#hm-avatar')); fillAvatar($('#pf-avatar'));
  $('#pf-name').textContent = fullName;
  $('#pf-user').textContent = user && user.username ? '@' + user.username : '';
  $('#pf-id').textContent = user && user.id ? String(user.id) : '';
  $$('[data-max]').forEach(e => { e.textContent = fmt(CFG.max); });

  const balance = () => Number(SNAP.b) || 0;
  const lockedBal = () => Math.min(balance(), Number(SNAP.lk) || 0);   // пополненные звёзды: в играх не участвуют
  const playable = () => Math.max(0, balance() - lockedBal());
  const renderBalance = () => {
    $$('[data-bal]').forEach(e => { e.textContent = fmt(balance()); });
    $$('[data-play]').forEach(e => { e.textContent = fmt(playable()); });
    $$('[data-lock]').forEach(e => { e.textContent = fmt(lockedBal()); });
  };

  const isLocked = () => !CFG.admin && CFG.nextAt > Date.now();
  function left(ms) {
    const m = Math.max(1, Math.ceil(ms / 60000));
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    return d ? `${d} д ${h} ч` : h ? `${h} ч ${mm} мин` : `${mm} мин`;
  }
  const dateStr = ms => new Date(ms).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function renderStatus() {
    const box = $('#status'), lock = $('#lock');
    const locked = isLocked();
    box.className = 'status ' + (locked ? 'wait' : 'ok');
    box.textContent = locked ? `⏳ Следующая заявка через ${left(CFG.nextAt - Date.now())}` : '✅ Можно подавать заявку';
    if (CFG.admin) {
      const b = document.createElement('span');
      b.className = 'badge'; b.textContent = 'Админ: без лимита';
      box.appendChild(b);
    }
    lock.hidden = !locked;
    $('#lock-text').textContent = locked
      ? `Заявку можно подавать раз в неделю. Следующая будет доступна ${dateStr(CFG.nextAt)}.` : '';
    $('#form').disabled = locked || needKb;
    updateCta();
  }

  /* ---------- Заявка ---------- */
  const amt = $('#amt'), range = $('#range'), starIco = $('#amt-star'), chipsBox = $('#chips');
  const P = 2.4;
  const fromT = t => {
    let v = 1 + (CFG.max - 1) * Math.pow(t / 1000, P);
    v = v >= 1000 ? Math.round(v / 50) * 50 : v >= 100 ? Math.round(v / 10) * 10 : v >= 20 ? Math.round(v / 5) * 5 : Math.round(v);
    return clamp(v, 1, CFG.max);
  };
  const toT = v => Math.round(1000 * Math.pow((clamp(v, 1, CFG.max) - 1) / (CFG.max - 1), 1 / P));
  const stepFor = v => (v < 20 ? 1 : v < 100 ? 5 : v < 500 ? 10 : v < 2000 ? 50 : 100);

  STAR_CHIPS.forEach(v => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.v = v; b.textContent = fmt(v);
    chipsBox.appendChild(b);
  });
  function setStars(v, from) {
    S.stars = v;
    if (from !== 'input') amt.value = v ? String(v) : '';
    if (from !== 'range') range.value = toT(v || 1);
    range.style.setProperty('--p', (range.value / 10) + '%');
    $$('.chip', chipsBox).forEach(c => c.classList.toggle('is-on', Number(c.dataset.v) === v));
    starIco.classList.add('pop'); setTimeout(() => starIco.classList.remove('pop'), 180);
    updateCta();
  }
  range.addEventListener('input', () => { setStars(fromT(Number(range.value)), 'range'); haptic('select'); });
  amt.addEventListener('input', () => {
    amt.value = amt.value.replace(/\D/g, '').slice(0, 6);
    let v = Number(amt.value) || 0;
    if (v > CFG.max) { v = CFG.max; amt.value = String(v); }
    setStars(v, 'input');
  });
  amt.addEventListener('blur', () => { if (!S.stars) setStars(1); });
  $('#minus').addEventListener('click', () => { setStars(clamp(S.stars - stepFor(S.stars - 1), 1, CFG.max)); haptic(); });
  $('#plus').addEventListener('click', () => { setStars(clamp(S.stars + stepFor(S.stars), 1, CFG.max)); haptic(); });
  chipsBox.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    setStars(Number(c.dataset.v)); haptic(); burstAt(c);
  });

  const desc = $('#desc'), count = $('#count');
  desc.addEventListener('input', () => {
    S.desc = desc.value;
    const n = desc.value.trim().length;
    count.textContent = `${n} из ${DESC_MAX}, минимум ${DESC_MIN}`;
    count.classList.toggle('bad', n > 0 && n < DESC_MIN);
    updateCta();
  });

  /* ---------- Пожертвование ---------- */
  const presetsBox = $('#presets'), custom = $('#custom');
  DON_PRESETS.forEach(v => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'preset'; b.dataset.v = v;
    b.innerHTML = `${fmt(v)}<small>⭐</small>`;
    presetsBox.appendChild(b);
  });
  const markPresets = () => $$('.preset', presetsBox).forEach(p => p.classList.toggle('is-on', !S.custom && Number(p.dataset.v) === S.donate));
  presetsBox.addEventListener('click', e => {
    const p = e.target.closest('.preset'); if (!p) return;
    S.donate = Number(p.dataset.v); S.custom = ''; custom.value = '';
    markPresets(); updateCta(); haptic(); burstAt(p);
  });
  custom.addEventListener('input', () => {
    custom.value = custom.value.replace(/\D/g, '').slice(0, 6);
    S.custom = custom.value;
    if (S.custom) S.donate = Number(S.custom);
    markPresets(); updateCta();
  });
  const donateAmount = () => (S.custom ? Number(S.custom) : S.donate);
  const donateOk = () => { const v = donateAmount(); return v >= DON_MIN && v <= DON_MAX; };

  /* ---------- Вкладки и кнопка действия ---------- */
  const actionbar = $('#actionbar'), cta = $('#cta');
  const requestOk = () =>
    !isLocked() && S.stars >= 1 && S.stars <= CFG.max &&
    S.desc.trim().length >= DESC_MIN && S.desc.trim().length <= DESC_MAX;

  function updateCta() {
    if (S.screen === 'request') {
      actionbar.hidden = false;
      cta.textContent = `Отправить заявку на ${fmt(S.stars || 0)} ⭐`;
      cta.disabled = !requestOk() && !needKb;
    } else if (S.screen === 'donate') {
      actionbar.hidden = false;
      cta.textContent = `Поддержать на ${fmt(donateAmount() || 0)} ⭐`;
      cta.disabled = !donateOk();
    } else {
      actionbar.hidden = true;
    }
  }

  function go(name) {
    if (name === 'admin' && !CFG.admin) return;
    S.screen = name;
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === name));
    const tabFor = ({ help: 'profile', achievements: 'profile', history: 'profile', games: 'home', mines: 'home', shop: 'home', upgrader: 'home', cases: 'home' })[name] || name;
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.go === tabFor));
    updateCta();
    scrollTo(0, 0);
    try { if (tg && tg.BackButton) (name === 'home' ? tg.BackButton.hide() : tg.BackButton.show()); } catch (_) {}
  }
  document.addEventListener('click', e => {
    const w = e.target.closest('[data-wallet]');
    if (w) { go('wallet'); setMode(w.dataset.wallet); haptic('select'); return; }
    const b = e.target.closest('[data-go]'); if (!b) return;
    go(b.dataset.go); haptic('select');
    if (b.classList.contains('big')) burstAt(b);
  });

  /* ---------- Связь с ботом ---------- */
  const sheet = $('#sheet'), scrim = $('#scrim'), sheetInput = $('#sheet-input');
  // ask(): окно подтверждения. С opts.input просит ввести текст и возвращает его (или null).
  function ask(title, rows, okText, opts = {}) {
    return new Promise(resolve => {
      $('#sheet-title').textContent = title;
      const dl = $('#sheet-rows'); dl.textContent = '';
      rows.forEach(([k, v]) => {
        const d = document.createElement('div');
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        d.append(dt, dd); dl.appendChild(d);
      });
      const yes = $('#sheet-yes'), no = $('#sheet-no');
      yes.textContent = okText;
      const inp = opts.input;
      sheetInput.hidden = !inp; sheetInput.value = '';
      if (inp) { sheetInput.placeholder = inp.placeholder || ''; sheetInput.maxLength = inp.max || 300; }
      const valid = () => !inp || sheetInput.value.trim().length >= (inp.min ?? 1);
      yes.disabled = !valid();
      sheetInput.oninput = () => { yes.disabled = !valid(); };
      sheet.hidden = scrim.hidden = false;
      const done = r => {
        sheet.hidden = scrim.hidden = true;
        yes.onclick = no.onclick = scrim.onclick = sheetInput.oninput = null;
        resolve(r);
      };
      yes.onclick = () => done(inp ? sheetInput.value.trim() : true);
      no.onclick = scrim.onclick = () => done(inp ? null : false);
    });
  }

  let toastTimer;
  function toast(text) {
    const t = $('#toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }

  function openBot(code) {
    if (!CFG.link) { toast('Не задан адрес бота. Открой мини-апп командой /app в боте.'); haptic('err'); return; }
    const url = `${CFG.link}?start=${code}`;
    try {
      haptic('ok');
      if (tg.openTelegramLink) tg.openTelegramLink(url);
      else if (tg.openLink) tg.openLink(url);
      else window.open(url, '_blank');
      setTimeout(() => { try { tg.close(); } catch (_) {} }, 400);
    } catch (_) { toast('Не удалось открыть бота. Попробуй команду /app.'); haptic('err'); }
  }

  // Действия, которые можно передать ссылкой, пока мини-апп открыт не кнопкой клавиатуры
  const LINKABLE = { donate: 'd', topup: 't' };

  function legacySend(payload) {
    if (DEMO) { toast('Это демо в браузере. В боте данные уйдут боту.'); console.log(payload); return; }
    if (needKb) {
      if (LINKABLE[payload.action]) return openBot(`${LINKABLE[payload.action]}_${payload.amount}`);
      toast('Открой мини-апп кнопкой «📱 Открыть мини-апп» внизу чата.');
      return openBot('app');
    }
    const data = JSON.stringify(payload);
    if (!inTg || typeof tg.sendData !== 'function') {
      console.log('sendData:', data);
      toast('Открой мини-апп кнопкой «📱 Открыть мини-апп» в боте: только оттуда данные уходят боту.');
      haptic('err');
      return;
    }
    try { haptic('ok'); tg.sendData(data); }
    catch (e) { toast('Не удалось отправить. Открой мини-апп кнопкой из бота.'); haptic('err'); }
  }

  /* ---------- Работа через API бота: мини-апп не закрывается ---------- */
  const initData = (tg && tg.initData) || '';
  let apiMode = false, busy = false;

  async function apiCall(path, body) {
    const ctl = new AbortController();
    const timer = setTimeout(() => ctl.abort(), 25000);
    try {
      const r = await fetch(CFG.api + path, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ initData, ...body }), signal: ctl.signal,
      });
      const j = await r.json().catch(() => null);
      if (!j) throw new Error('bad response');
      return j;
    } finally { clearTimeout(timer); }
  }

  // Свежие данные от бота: баланс, награды, инвентарь, заявки, дата следующей заявки
  function applyState(st) {
    if (!st) return;
    SNAP = st;
    CFG.nextAt = (Number(st.nx) || 0) * 1000;
    renderBalance(); renderFree(); renderInv(); renderAdmin(); renderAppeals(); renderStatus(); updateWallet(); renderProfile(); renderGames(); renderShop(); renderUpgrader(); syncMines(); renderCases();
  }

  async function refresh() {
    if (!apiMode || busy) return;
    try { const j = await apiCall('/api/state', {}); if (j.ok) applyState(j.state); } catch (_) {}
  }

  // Проверяем связь с API при открытии: если не вышло, работаем по-старому через sendData
  const apiReady = (async () => {
    if (DEMO || !CFG.api || !initData) return false;
    try {
      const j = await apiCall('/api/state', {});
      if (!(j.ok && j.state)) return false;
      apiMode = true; needKb = false;
      $$('.need-kb').forEach(b => { b.hidden = true; });
      applyState(j.state);
      return true;
    } catch (_) { return false; }
  })();

  // act(): отправляет действие боту и обновляет экран, не закрывая мини-апп.
  // Возвращает ответ бота (null — нет связи, undefined — старый режим через sendData).
  async function act(payload, opts = {}) {
    if (DEMO) return legacySend(payload);
    if (CFG.api && initData && !apiMode) await apiReady;
    if (!apiMode) return legacySend(payload);
    if (busy) return null;
    busy = true; document.body.classList.add('is-busy');
    try {
      const j = await apiCall('/api/action', { data: payload });
      if (j.state && !opts.defer) applyState(j.state);
      if (j.text) toast(j.text);
      haptic(j.ok ? 'ok' : 'err');
      return j;
    } catch (_) {
      toast('Нет связи с ботом. Проверь интернет: результат появится после обновления.');
      haptic('err');
      setTimeout(refresh, 1500);
      return null;
    } finally { busy = false; document.body.classList.remove('is-busy'); }
  }

  // Счёт Telegram открывается поверх мини-апп и закрывается сам, окно остаётся
  function afterInvoice(r) {
    if (!r || !r.ok || !r.invoice_link || !tg || !tg.openInvoice) return;
    tg.openInvoice(r.invoice_link, st => {
      if (st === 'paid') { toast('Оплата прошла, спасибо! ⭐'); haptic('ok'); setTimeout(refresh, 700); setTimeout(refresh, 3000); }
      else if (st === 'failed') { toast('Оплата не прошла. Попробуй ещё раз.'); haptic('err'); }
    });
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) refresh(); });
  try { tg && tg.onEvent && tg.onEvent('activated', refresh); } catch (_) {}

  $$('.open-kb').forEach(b => b.addEventListener('click', () => openBot('app')));
  $$('.need-kb').forEach(b => { b.hidden = !needKb; });

  cta.addEventListener('click', async () => {
    if (S.screen === 'request') {
      if (needKb) return act({ action: 'request' });
      if (!requestOk()) return;
      const text = S.desc.trim();
      if (await ask('Отправить заявку?', [['Сумма', `${fmt(S.stars)} ⭐`], ['Причина', text]], 'Отправить')) {
        const r = await act({ action: 'request', stars: S.stars, description: text });
        if (r && r.ok) { desc.value = ''; desc.dispatchEvent(new Event('input')); go('home'); }
      }
    } else if (S.screen === 'donate' && donateOk()) {
      const v = donateAmount();
      if (await ask('Поддержать проект?', [['Сумма', `${fmt(v)} ⭐`], ['Дальше', 'Откроется окно оплаты']], 'Продолжить'))
        afterInvoice(await act({ action: 'donate', amount: v }));
    }
  });

  $('#support-btn').addEventListener('click', () => {
    try {
      if (tg && tg.openTelegramLink && /^https:\/\/(t\.me|staticgram\.top)\//.test(CFG.support)) tg.openTelegramLink(CFG.support);
      else if (tg && tg.openLink) tg.openLink(CFG.support);
      else window.open(CFG.support, '_blank');
    } catch (_) { window.open(CFG.support, '_blank'); }
  });

  /* ---------- Бесплатное: бонус и кейс ---------- */
  const bonusLeft = () => Number(SNAP.bn) || 0;                    // 0 — уже получен
  const caseIdx = () => (Number(SNAP.cs) >= 0 ? Number(SNAP.cs) : -1);  // -1 — уже открыт

  function renderFree() {
    const b = bonusLeft() > 0, c = caseIdx() >= 0;
    const bb = $('#bonus-btn'), cb = $('#case-btn');
    bb.textContent = b ? 'Открыть' : 'Завтра'; bb.disabled = !b;
    cb.textContent = c ? 'Открыть' : 'Завтра'; cb.disabled = !c;
    $('#bonus-sub').textContent = b ? 'От 200 до 1000 ⭐ на баланс' : 'Уже получен, приходи завтра';
    $('#case-sub').textContent = c ? 'NFT ценой от 500 до 2000 ⭐' : 'Уже открыт, приходи завтра';
    $('#card-bonus').classList.toggle('is-done', !b);
    $('#card-case').classList.toggle('is-done', !c);
    $$('[data-free-dot]').forEach(d => { d.hidden = !(b || c); });
  }

  const drops = $('#drops');
  NFT.forEach(x => {
    const row = document.createElement('div');
    row.className = 'drop'; row.style.setProperty('--tone', x.c);
    const pct = x.w / NFT_TOTAL_W * 100;
    row.innerHTML = `<span class="drop-ico">${x.e}</span><span class="drop-name">${x.n}</span>` +
      `<span class="drop-val">${fmt(x.v)} ⭐</span><span class="drop-pct">${pct < 1 ? pct.toFixed(1) : Math.round(pct)}%</span>`;
    drops.appendChild(row);
  });

  /* Окно с анимацией */
  const rv = $('#reveal'), stage = $('#rv-stage'), rvTitle = $('#rv-title'), rvSub = $('#rv-sub'), rvClaim = $('#rv-claim');
  let rvToken = 0;

  function openReveal() {
    rvToken++;
    stage.innerHTML = ''; rvTitle.textContent = ''; rvSub.textContent = ''; rvClaim.hidden = true; rvClaim.onclick = null;
    rv.hidden = false;
    requestAnimationFrame(() => rv.classList.add('show'));
    return rvToken;
  }
  function closeReveal() {
    rvToken++;
    rv.classList.remove('show');
    setTimeout(() => { rv.hidden = true; stage.innerHTML = ''; }, 250);
  }
  $('#rv-close').addEventListener('click', closeReveal);

  function cssBurst(host, n = 22) {
    if (reduce) return;
    for (let i = 0; i < n; i++) {
      const s = document.createElement('i');
      s.className = 'spark';
      const a = Math.random() * 6.283, d = 80 + Math.random() * 110;
      s.style.setProperty('--dx', Math.cos(a) * d + 'px');
      s.style.setProperty('--dy', Math.sin(a) * d + 'px');
      s.style.setProperty('--sz', (4 + Math.random() * 6) + 'px');
      s.style.animationDelay = (Math.random() * .12) + 's';
      host.appendChild(s);
      setTimeout(() => s.remove(), 1400);
    }
  }
  function countUp(el, to, ms, token) {
    return new Promise(res => {
      if (reduce) { el.textContent = fmt(to); return res(); }
      const t0 = performance.now();
      const step = now => {
        if (token !== rvToken) return res();
        const k = clamp((now - t0) / ms, 0, 1), e = 1 - Math.pow(1 - k, 3);
        el.textContent = fmt(Math.round(to * e));
        if (k < 1) requestAnimationFrame(step); else res();
      };
      requestAnimationFrame(step);
    });
  }

  async function playBonus() {
    const amount = bonusLeft(); if (amount <= 0) return;
    const t = openReveal();
    stage.innerHTML = `<div class="gift" id="gift"><div class="gift-rays"></div>
      <div class="gift-box"><div class="gift-lid"></div><div class="gift-body"></div></div>
      <div class="gift-amount"><b id="gift-num">0</b><span>⭐</span></div></div>`;
    const gift = $('#gift');
    rvTitle.textContent = 'Ежедневный бонус';
    rvSub.textContent = 'Открываем подарок…';
    if (!reduce) {
      await wait(450); if (t !== rvToken) return;
      gift.classList.add('shake'); haptic('medium');
      await wait(1100); if (t !== rvToken) return;
    }
    gift.classList.add('open'); haptic('heavy'); cssBurst(gift);
    await wait(reduce ? 0 : 350); if (t !== rvToken) return;
    await countUp($('#gift-num'), amount, 1500, t); if (t !== rvToken) return;
    haptic('ok');
    rvTitle.textContent = `Тебе выпало ${fmt(amount)} ⭐`;
    rvSub.textContent = 'Забери награду, и звёзды сразу попадут на баланс.';
    rvClaim.textContent = 'Забрать на баланс'; rvClaim.hidden = false;
    rvClaim.onclick = async () => { const r = await act({ action: 'claim_bonus', day: SNAP.dy }); if (r && !r.subscribe) closeReveal(); };
  }

  const cardHTML = i => {
    const x = NFT[i];
    return `<div class="car-item" style="--tone:${x.c}"><span class="car-e">${x.e}</span><span class="car-v">${fmt(x.v)} ⭐</span></div>`;
  };
  const pickFiller = () => {
    let r = Math.random() * NFT_TOTAL_W;
    for (let i = 0; i < NFT.length; i++) { r -= NFT[i].w; if (r <= 0) return i; }
    return 0;
  };

  async function playCase() {
    const idx = caseIdx(); if (idx < 0) return;
    const t = openReveal();
    const CARD = 96, GAP = 10, STEP = CARD + GAP, WIN = 38, TOTAL = 46;
    stage.innerHTML = `<div class="case-pre" id="case-pre">📦</div>
      <div class="car" id="car" hidden><i class="car-mark"></i><div class="car-strip" id="strip"></div></div>`;
    rvTitle.textContent = 'Ежедневный кейс';
    rvSub.textContent = 'Открываем кейс…';
    const pre = $('#case-pre'), car = $('#car'), strip = $('#strip');
    const items = Array.from({ length: TOTAL }, (_, i) => (i === WIN ? idx : pickFiller()));
    strip.innerHTML = items.map(cardHTML).join('');

    if (!reduce) {
      pre.classList.add('shake'); haptic('medium');
      await wait(1000); if (t !== rvToken) return;
      pre.classList.add('gone');
      await wait(260); if (t !== rvToken) return;
    }
    pre.hidden = true; car.hidden = false;

    const vw = car.clientWidth;
    const target = WIN * STEP + CARD / 2 + (Math.random() - .5) * CARD * .6 - vw / 2;
    strip.style.transition = 'none';
    strip.style.transform = 'translateX(0)';
    void strip.offsetWidth;

    const spin = reduce ? 0 : 5600;
    if (spin) {
      strip.style.transition = `transform ${spin}ms cubic-bezier(.1,.75,.12,1)`;
      strip.style.transform = `translateX(${-target}px)`;
      // лёгкая вибрация каждый раз, когда под меткой проезжает новая карточка
      let last = -1;
      const tick = () => {
        if (t !== rvToken || rv.hidden) return;
        const m = new DOMMatrix(getComputedStyle(strip).transform);
        const cur = Math.floor((-m.m41 + vw / 2) / STEP);
        if (cur !== last) { last = cur; haptic('select'); }
        if (-m.m41 < target - 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
      await wait(spin + 150); if (t !== rvToken) return;
    } else {
      strip.style.transform = `translateX(${-target}px)`;
    }

    const cardsEls = $$('.car-item', strip);
    cardsEls.forEach((el, i) => el.classList.add(i === WIN ? 'win' : 'dim'));
    cssBurst(car, 26); haptic('heavy');
    const x = NFT[idx];
    await wait(reduce ? 0 : 400); if (t !== rvToken) return;
    haptic('ok');
    rvTitle.textContent = `${x.e} ${x.n}`;
    rvSub.textContent = `Цена продажи: ${fmt(x.v)} ⭐. Предмет попадёт в инвентарь, там его можно продать.`;
    rvClaim.textContent = 'Забрать в инвентарь'; rvClaim.hidden = false;
    rvClaim.onclick = async () => { const r = await act({ action: 'claim_case', day: SNAP.dy }); if (r && !r.subscribe) closeReveal(); };
  }

  $('#bonus-btn').addEventListener('click', () => { haptic('medium'); playBonus(); });
  $('#case-btn').addEventListener('click', () => { haptic('medium'); playCase(); });

  /* ---------- Кошелёк ---------- */
  const wAmt = $('#w-amt'), wBtn = $('#w-btn'), wChips = $('#w-chips'), wLabel = $('#w-label');
  const wTarget = $('#w-target'), wTargetField = $('#w-target-field'), wNote = $('#w-note');
  const parseRecv = v => {
    v = (v || '').trim();
    if (/^\d{5,}$/.test(v)) return v;
    if (/^@?[A-Za-z0-9_]{3,32}$/.test(v)) return '@' + v.replace(/^@/, '');
    return null;
  };
  const W_LABEL = { topup: 'Сумма пополнения', withdraw: 'Сумма вывода', transfer: 'Сумма перевода' };
  const W_NOTE = {
    topup: 'Пополненные ⭐ можно вывести или перевести, но в играх они не участвуют: играть можно только заработанными.',
    withdraw: '',
    transfer: 'Получатель должен хотя бы раз открыть бота. Перевод мгновенный, отменить его нельзя. Пополненные ⭐ у получателя тоже не будут игровыми.',
  };
  function setMode(mode) {
    S.wmode = W_LABEL[mode] ? mode : 'topup';
    $$('#wseg button').forEach(b => b.classList.toggle('is-on', b.dataset.mode === S.wmode));
    wLabel.textContent = W_LABEL[S.wmode];
    wTargetField.hidden = S.wmode !== 'transfer';
    wNote.textContent = W_NOTE[S.wmode]; wNote.hidden = !W_NOTE[S.wmode];
    $('#wallet-kb').hidden = !(needKb && S.wmode !== 'topup');
    S.wamt = ''; wAmt.value = '';
    renderWChips(); updateWallet();
  }
  function renderWChips() {
    wChips.textContent = '';
    const list = S.wmode === 'topup' ? [50, 100, 500, 1000] : [100, 500, 1000];
    list.forEach(v => {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.v = v; b.textContent = fmt(v);
      wChips.appendChild(b);
    });
    if (S.wmode !== 'topup') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.v = 'all'; b.textContent = 'Всё';
      wChips.appendChild(b);
    }
  }
  const wValue = () => Number(S.wamt) || 0;
  function wOk() {
    const v = wValue();
    if (S.wmode === 'topup') return v >= DON_MIN && v <= DON_MAX;
    if (S.wmode === 'transfer') return v >= 1 && v <= Math.min(balance(), 100000) && !!parseRecv(wTarget.value);
    return v >= 1 && v <= balance();
  }
  function updateWallet() {
    const v = wValue();
    wBtn.textContent = ({ topup: 'Пополнить на', withdraw: 'Вывести', transfer: 'Перевести' })[S.wmode] + ` ${fmt(v)} ⭐`;
    wBtn.disabled = !wOk();
  }
  $('#wseg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    setMode(b.dataset.mode); haptic('select');
  });
  wChips.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    S.wamt = String(c.dataset.v === 'all' ? (S.wmode === 'transfer' ? Math.min(balance(), 100000) : balance()) : c.dataset.v);
    wAmt.value = S.wamt; updateWallet(); haptic(); burstAt(c);
  });
  wAmt.addEventListener('input', () => {
    wAmt.value = wAmt.value.replace(/\D/g, '').slice(0, 8);
    S.wamt = wAmt.value; updateWallet();
  });
  wTarget.addEventListener('input', updateWallet);

  // Игры и переводы работают только через API бота: нужен ответ с результатом
  async function needApi() {
    if (DEMO) return true;
    if (CFG.api && initData && !apiMode) await apiReady;
    if (!apiMode) { toast('Игры и переводы работают, когда мини-апп подключён к боту по API.'); haptic('err'); return false; }
    return true;
  }

  wBtn.addEventListener('click', async () => {
    if (!wOk()) return;
    const v = wValue();
    if (S.wmode === 'topup') {
      if (await ask('Пополнить баланс?', [['Сумма', `${fmt(v)} ⭐`], ['Дальше', 'Откроется окно оплаты']], 'Продолжить'))
        afterInvoice(await act({ action: 'topup', amount: v }));
    } else if (S.wmode === 'transfer') {
      const target = parseRecv(wTarget.value);
      if (!(await needApi())) return;
      if (await ask('Перевести звёзды?', [['Кому', target], ['Сумма', `${fmt(v)} ⭐`], ['Важно', 'Перевод нельзя отменить']], 'Перевести')) {
        const rid = Array.from(crypto.getRandomValues(new Uint8Array(16)), x => (x % 36).toString(36)).join('');
        const r = await act({ action: 'transfer', target, amount: v, rid });
        if (r && r.ok) { S.wamt = ''; wAmt.value = ''; wTarget.value = ''; updateWallet(); }
      }
    } else {
      if (await ask('Вывести звёзды?', [['Сумма', `${fmt(v)} ⭐`], ['Куда', 'На твой аккаунт']], 'Вывести')) {
        const r = await act({ action: 'withdraw', amount: v });
        if (r && r.ok) { S.wamt = ''; wAmt.value = ''; updateWallet(); }
      }
    }
  });

  /* ---------- Игры ---------- */
  const GAME_MIN = 10, GAME_MAX = 10000, COIN_X = 194, DICE_RTP = 97;
  // тот же порядок, что WHEEL в боте: m — множитель, w — вес
  const WHEEL = [
    { m: 0, w: 42, c: '#ff8f8f' }, { m: 0.5, w: 22, c: '#9ea6dc' }, { m: 1.5, w: 21, c: '#6ee7b7' },
    { m: 2, w: 9, c: '#7aa7ff' }, { m: 5, w: 5, c: '#c084fc' }, { m: 10, w: 1, c: '#ffc94a' },
  ];
  const WHEEL_W = WHEEL.reduce((a, x) => a + x.w, 0);
  const xStr = m => '×' + (m % 1 ? m.toFixed(1) : m);
  Object.assign(S, { game: 'coin', bet: '', side: 'heads', chance: 50 });

  const gBet = () => Number(S.bet) || 0;
  const gMax = () => Math.min(GAME_MAX, playable());
  const gOk = () => gBet() >= GAME_MIN && gBet() <= gMax();
  const gPayout = bet => S.game === 'coin' ? Math.floor(bet * COIN_X / 100)
    : S.game === 'dice' ? Math.floor(bet * DICE_RTP / S.chance) : 0;

  const gBox = $('#g-wheel');
  WHEEL.forEach(x => {
    const row = document.createElement('div');
    row.className = 'drop'; row.style.setProperty('--tone', x.c);
    row.innerHTML = `<span class="drop-ico">🎯</span><span class="drop-name">${xStr(x.m)}</span><span class="drop-val"></span><span class="drop-pct">${Math.round(x.w / WHEEL_W * 100)}%</span>`;
    gBox.appendChild(row);
  });
  [10, 50, 100, 500].forEach(v => {
    const b = document.createElement('button');
    b.type = 'button'; b.className = 'chip'; b.dataset.v = v; b.textContent = fmt(v);
    $('#g-chips').appendChild(b);
  });
  { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.v = 'max'; b.textContent = 'Макс'; $('#g-chips').appendChild(b); }

  const G_RULES = {
    coin: 'Угадай сторону монеты. Угадал: выплата ×1.94 от ставки.',
    dice: 'Выбери шанс. Бросок от 1 до 100: если выпало не больше шанса, ты выигрываешь. Чем меньше шанс, тем больше множитель.',
    wheel: 'Колесо вращается и останавливается на множителе. Ставка умножается на него, ×0 значит проигрыш.',
  };

  function renderGames() {
    $$('#gseg button').forEach(b => b.classList.toggle('is-on', b.dataset.g === S.game));
    $('#g-coin').hidden = S.game !== 'coin'; $('#g-dice').hidden = S.game !== 'dice'; gBox.hidden = S.game !== 'wheel';
    $$('#g-coin button').forEach(b => b.classList.toggle('is-on', b.dataset.side === S.side));
    $('#g-rules').textContent = G_RULES[S.game];
    const ch = $('#g-chance');
    ch.style.setProperty('--p', ((S.chance - 5) / 85 * 100) + '%');
    $('#g-chance-t').textContent = `Шанс ${S.chance}%`;
    $('#g-chance-x').textContent = `выплата ×${(DICE_RTP / S.chance).toFixed(2)}`;
    const bet = gBet();
    $$('.drop-val', gBox).forEach((el, i) => { el.textContent = bet ? `${fmt(Math.floor(bet * WHEEL[i].m))} ⭐` : ''; });
    const info = $('#g-info');
    const tooMuch = bet > gMax() && bet >= GAME_MIN;
    info.classList.toggle('bad', tooMuch);
    if (tooMuch) info.textContent = playable() < bet ? `Для игр доступно только ${fmt(playable())} ⭐` : `Максимальная ставка ${fmt(GAME_MAX)} ⭐`;
    else if (S.game === 'wheel') info.textContent = bet ? `Ставка ${fmt(bet)} ⭐` : '';
    else info.textContent = bet ? `Выигрыш: ${fmt(gPayout(bet))} ⭐ (чистыми +${fmt(gPayout(bet) - bet)})` : '';
    $('#g-btn').textContent = bet ? `Играть на ${fmt(bet)} ⭐` : 'Введи ставку';
    $('#g-btn').disabled = !gOk();
  }
  $('#gseg').addEventListener('click', e => { const b = e.target.closest('button[data-g]'); if (!b) return; S.game = b.dataset.g; haptic('select'); renderGames(); });
  $('#g-coin').addEventListener('click', e => { const b = e.target.closest('button[data-side]'); if (!b) return; S.side = b.dataset.side; haptic('select'); renderGames(); });
  $('#g-chance').addEventListener('input', e => { S.chance = clamp(Number(e.target.value) || 50, 5, 90); haptic('select'); renderGames(); });
  $('#g-bet').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); S.bet = e.target.value; renderGames(); });
  $('#g-chips').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    S.bet = String(c.dataset.v === 'max' ? gMax() : c.dataset.v); $('#g-bet').value = S.bet; haptic(); burstAt(c); renderGames();
  });

  async function spinStrip(strip, car, t, win) {
    const CARD = 96, STEP = 106, vw = car.clientWidth;
    const target = win * STEP + CARD / 2 + (Math.random() - .5) * CARD * .6 - vw / 2;
    strip.style.transition = 'none'; strip.style.transform = 'translateX(0)'; void strip.offsetWidth;
    if (reduce) { strip.style.transform = `translateX(${-target}px)`; return; }
    const spin = 5200;
    strip.style.transition = `transform ${spin}ms cubic-bezier(.1,.75,.12,1)`;
    strip.style.transform = `translateX(${-target}px)`;
    let last = -1;
    const tick = () => {
      if (t !== rvToken || rv.hidden) return;
      const cur = Math.floor((-new DOMMatrix(getComputedStyle(strip).transform).m41 + vw / 2) / STEP);
      if (cur !== last) { last = cur; haptic('select'); }
      requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    await wait(spin + 150);
  }

  function gameEnd(g, t) {
    if (t !== rvToken) return;
    if (g.net > 0) {
      cssBurst(stage, 30); haptic('ok');
      rvTitle.textContent = `Победа! +${fmt(g.net)} ⭐`;
      rvSub.textContent = `Ставка ${fmt(g.bet)} ⭐, выплата ${fmt(g.payout)} ⭐.`;
    } else if (g.payout > 0) {
      haptic('err');
      rvTitle.textContent = `Вернулось ${fmt(g.payout)} ⭐`;
      rvSub.textContent = `Ставка ${fmt(g.bet)} ⭐, итог −${fmt(-g.net)} ⭐.`;
    } else {
      haptic('err');
      rvTitle.textContent = 'Не повезло';
      rvSub.textContent = `−${fmt(g.bet)} ⭐. Попробуй ещё раз, но не в долг у себя же.`;
    }
    rvClaim.textContent = 'Сыграть ещё'; rvClaim.hidden = false;
    rvClaim.onclick = () => { closeReveal(); playGame(); };
  }

  async function showGame(g) {
    const t = openReveal();
    if (g.game === 'coin') {
      stage.innerHTML = '<div class="coin" id="coin">⭐</div>';
      rvTitle.textContent = 'Монетка';
      rvSub.textContent = `Твой выбор: ${g.choice === 'heads' ? 'орёл' : 'решка'}`;
      const coin = $('#coin');
      if (!reduce) { coin.classList.add('flip'); haptic('medium'); await wait(1700); if (t !== rvToken) return; }
      coin.textContent = g.roll === 'heads' ? 'О' : 'Р'; haptic('heavy');
      rvSub.textContent = `Выпал ${g.roll === 'heads' ? 'орёл' : 'решка'}, ты выбрал ${g.choice === 'heads' ? 'орла' : 'решку'}.`;
    } else if (g.game === 'dice') {
      stage.innerHTML = `<div class="dice"><b class="dice-num" id="dice-num">--</b>
        <div class="dice-bar"><i class="dice-win" style="width:${g.chance}%"></i><em class="dice-mark" id="dice-mark"></em></div>
        <div class="dice-lbl"><span>1</span><span>Выигрыш: 1–${g.chance}</span><span>100</span></div></div>`;
      rvTitle.textContent = 'Кости'; rvSub.textContent = 'Бросаем…';
      const num = $('#dice-num');
      if (!reduce) for (let i = 0; i < 20; i++) {
        num.textContent = 1 + Math.floor(Math.random() * 100); haptic('select');
        await wait(55 + i * 6); if (t !== rvToken) return;
      }
      num.textContent = g.roll; num.style.color = g.win ? 'var(--mint)' : 'var(--coral)';
      const mark = $('#dice-mark'); mark.style.opacity = 1; mark.style.left = g.roll + '%';
      haptic('heavy'); await wait(reduce ? 0 : 500); if (t !== rvToken) return;
      rvSub.textContent = `Выпало ${g.roll}, нужно не больше ${g.chance}.`;
    } else {
      const WIN = 38, TOTAL = 46;
      stage.innerHTML = '<div class="car" id="car"><i class="car-mark"></i><div class="car-strip" id="strip"></div></div>';
      rvTitle.textContent = 'Колесо'; rvSub.textContent = 'Крутим…';
      const pick = () => { let r = Math.random() * WHEEL_W; for (let i = 0; i < WHEEL.length; i++) { r -= WHEEL[i].w; if (r <= 0) return i; } return 0; };
      const items = Array.from({ length: TOTAL }, (_, i) => (i === WIN ? g.idx : pick()));
      const strip = $('#strip'), car = $('#car');
      strip.innerHTML = items.map(i => `<div class="car-item" style="--tone:${WHEEL[i].c}"><span class="car-x">${xStr(WHEEL[i].m)}</span></div>`).join('');
      await spinStrip(strip, car, t, WIN); if (t !== rvToken) return;
      $$('.car-item', strip).forEach((el, i) => el.classList.add(i === WIN ? 'win' : 'dim'));
      haptic('heavy'); await wait(reduce ? 0 : 400); if (t !== rvToken) return;
      rvSub.textContent = `Выпал множитель ${xStr(WHEEL[g.idx].m)}.`;
    }
    gameEnd(g, t);
  }

  async function playGame() {
    if (!gOk()) { if (gBet() > playable()) toast('Не хватает заработанных ⭐ для такой ставки.'); return; }
    if (!(await needApi())) return;
    const payload = { action: 'game', game: S.game, bet: gBet() };
    if (S.game === 'coin') payload.choice = S.side;
    if (S.game === 'dice') payload.choice = S.chance;
    const r = await act(payload, { defer: true });   // баланс обновим после анимации, чтобы не спойлерить итог
    if (!r) return;
    if (!r.ok || !r.game) { if (r.state) applyState(r.state); return; }
    await showGame(r.game);
    applyState(r.state);
  }
  $('#g-btn').addEventListener('click', () => { haptic('medium'); playGame(); });

  /* ---------- Кейсы за звёзды ---------- */
  Object.assign(S, { cOpen: new Set() });
  const caseW = (c, i) => c.w[i] / 100;                                      // шанс в %
  const caseEv = c => c.w.reduce((a, w, i) => a + w * NFT[i].v, 0) / 10000;   // средняя цена предмета
  const caseWin = c => c.w.reduce((a, w, i) => a + (NFT[i].v > c.p ? w : 0), 0) / 100;   // шанс выбить дороже кейса
  function renderCases() {
    const box = $('#cases-list'); box.textContent = '';
    CASES.forEach((c, ci) => {
      const card = document.createElement('div'); card.className = 'case-card';
      const can = playable() >= c.p;
      card.innerHTML = `<div class="case-head"><span class="case-em">${c.e}</span>
        <div><b>${c.n}</b><small>В среднем ${fmt(Math.round(caseEv(c)))} ⭐ · дороже кейса с шансом ${caseWin(c).toFixed(1)}%</small></div></div>`;
      const det = document.createElement('details'); det.open = S.cOpen.has(ci);
      det.addEventListener('toggle', () => { det.open ? S.cOpen.add(ci) : S.cOpen.delete(ci); });
      const sum = document.createElement('summary'); sum.textContent = 'Что внутри';
      const list = document.createElement('div'); list.className = 'drops';
      NFT.forEach((x, i) => {
        const row = document.createElement('div'); row.className = 'drop'; row.style.setProperty('--tone', x.c);
        row.innerHTML = `<span class="drop-ico">${x.e}</span><span class="drop-name">${x.n}</span><span class="drop-val">${fmt(x.v)} ⭐</span><span class="drop-pct">${caseW(c, i).toFixed(c.w[i] < 100 ? 2 : 1)}%</span>`;
        list.appendChild(row);
      });
      det.append(sum, list);
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'cta cta--sm' + (can ? '' : ' is-off'); btn.textContent = `Открыть за ${fmt(c.p)} ⭐`;
      btn.addEventListener('click', () => { haptic('medium'); openPaidCase(ci); });
      card.append(det, btn);
      box.appendChild(card);
    });
  }
  async function openPaidCase(ci) {
    const c = CASES[ci];
    if (playable() < c.p) { toast(`Не хватает заработанных ⭐: кейс стоит ${fmt(c.p)}, для игр доступно ${fmt(playable())}.`); haptic('err'); return; }
    if (!(await needApi())) return;
    const r = await act({ action: 'open_case', case: ci }, { defer: true });   // баланс обновим после анимации
    if (!r) return;
    if (!r.ok || !r.case) { if (r.state) applyState(r.state); return; }
    await showPaidCase(r.case);
    applyState(r.state);
  }
  async function showPaidCase(res) {
    const c = CASES[res.case], idx = res.nft, t = openReveal();
    const WIN = 38, TOTAL = 46;
    stage.innerHTML = `<div class="case-pre" id="case-pre">${c.e}</div>
      <div class="car" id="car" hidden><i class="car-mark"></i><div class="car-strip" id="strip"></div></div>`;
    rvTitle.textContent = c.n; rvSub.textContent = 'Открываем кейс…';
    const pre = $('#case-pre'), car = $('#car'), strip = $('#strip');
    const pick = () => { let r = Math.random() * 10000; for (let i = 0; i < c.w.length; i++) { r -= c.w[i]; if (r <= 0) return i; } return 0; };
    strip.innerHTML = Array.from({ length: TOTAL }, (_, i) => cardHTML(i === WIN ? idx : pick())).join('');
    if (!reduce) {
      pre.classList.add('shake'); haptic('medium');
      await wait(1000); if (t !== rvToken) return;
      pre.classList.add('gone');
      await wait(260); if (t !== rvToken) return;
    }
    pre.hidden = true; car.hidden = false;
    await spinStrip(strip, car, t, WIN); if (t !== rvToken) return;
    $$('.car-item', strip).forEach((el, i) => el.classList.add(i === WIN ? 'win' : 'dim'));
    cssBurst(car, 26); haptic('heavy');
    await wait(reduce ? 0 : 400); if (t !== rvToken) return;
    const x = NFT[idx], diff = x.v - c.p;
    haptic(diff >= 0 ? 'ok' : 'err');
    rvTitle.textContent = `${x.e} ${x.n}`;
    rvSub.textContent = `Предмет стоит ${fmt(x.v)} ⭐, кейс стоил ${fmt(c.p)} ⭐ (${diff >= 0 ? '+' : '−'}${fmt(Math.abs(diff))} ⭐). Он уже в инвентаре.`;
    rvClaim.textContent = 'Открыть ещё'; rvClaim.hidden = false;
    rvClaim.onclick = () => { closeReveal(); openPaidCase(res.case); };
  }

  /* ---------- Магазин NFT ---------- */
  const shopPrice = i => Math.ceil(Math.floor(NFT[i].v * 125 / 100) / 10) * 10;   // как в боте: ×1.25, вверх до 10
  // Карточка NFT с кнопкой «Купить»; afterBuy(ответ бота) вызывается после успешной покупки
  function shopCardEl(i, afterBuy) {
    const x = NFT[i], price = shopPrice(i), can = balance() >= price;
    const card = document.createElement('div');
    card.className = 'inv-item'; card.style.setProperty('--tone', x.c);
    const ico = document.createElement('div'); ico.className = 'inv-ico'; ico.textContent = x.e;
    const name = document.createElement('b'); name.textContent = x.n;
    const val = document.createElement('small'); val.className = 'inv-tag'; val.textContent = `Продажа: ${fmt(x.v)} ⭐`;
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'chip' + (can ? '' : ' is-off'); btn.textContent = `${fmt(price)} ⭐`;
    btn.addEventListener('click', async () => {
      if (!can) { toast(`Не хватает ⭐: нужно ${fmt(price)}, на балансе ${fmt(balance())}.`); haptic('err'); return; }
      if (!(await needApi())) return;
      if (await ask('Купить NFT?', [['Предмет', `${x.e} ${x.n}`], ['Цена', `${fmt(price)} ⭐`], ['Продажа потом', `${fmt(x.v)} ⭐`]], 'Купить')) {
        const r = await act({ action: 'buy_nft', idx: i });
        if (r && r.ok && afterBuy) afterBuy(r);
      }
    });
    card.append(ico, name, val, btn);
    return card;
  }
  function renderShop() {
    const box = $('#shop-grid'); box.textContent = '';
    NFT.forEach((_x, i) => box.appendChild(shopCardEl(i)));
  }

  /* ---------- Апгрейдер NFT ---------- */
  Object.assign(S, { upMode: 'nft', upSrc: 'inv', upItem: null, upTarget: null, upBet: '' });
  const upPerm = (v, t) => Math.floor(v * 950 / t);   // шанс в промилле, как в боте
  const upPct = (v, t) => (upPerm(v, t) / 10).toFixed(1) + '%';
  const upBetNum = () => Number(S.upBet) || 0;
  const UP_MAX_STARS = Math.max(...NFT.map(x => x.v)) - 1;

  function renderUpgrader() {
    const stars = S.upMode === 'stars';
    $$('#up-seg button').forEach(b => b.classList.toggle('is-on', b.dataset.m === S.upMode));
    $('#up-nft-box').hidden = stars; $('#up-stars-box').hidden = !stars;
    const buy = !stars && S.upSrc === 'buy';
    $$('#up-src button').forEach(b => b.classList.toggle('is-on', b.dataset.s === S.upSrc));
    $('#up-inv').hidden = buy; $('#up-buy').hidden = !buy; $('#up-buy-note').hidden = !buy;
    $('#up-nft-h').textContent = buy ? '1. Купи NFT для апгрейда' : '1. Твой NFT';

    const list = (SNAP.iv || []).filter(r => NFT[r[1]]);
    if (S.upItem && !list.some(r => r[0] === S.upItem)) { S.upItem = null; S.upTarget = null; }
    const cur = list.find(r => r[0] === S.upItem);
    const stake = stars ? upBetNum() : (cur ? NFT[cur[1]].v : 0);
    const stakeOk = stars ? (stake >= GAME_MIN && stake <= playable()) : !!cur;
    if (S.upTarget != null && !(stake > 0 && NFT[S.upTarget].v > stake)) S.upTarget = null;

    // инвентарь (режим NFT)
    const box = $('#up-inv'); box.textContent = '';
    // каталог для покупки прямо в апгрейдере: купленный предмет попадает в инвентарь и сразу выбирается
    const bb = $('#up-buy'); bb.textContent = '';
    if (buy) NFT.forEach((_x, i) => bb.appendChild(shopCardEl(i, r => {
      S.upSrc = 'inv'; S.upTarget = null; if (r.item) S.upItem = r.item; renderUpgrader();
    })));
    if (!stars && !buy) {
      if (!list.length) {
        const e = document.createElement('div'); e.className = 'inv-empty';
        e.textContent = 'В инвентаре пусто. Нажми «Купить», забери ежедневный кейс или поставь звёзды.'; box.appendChild(e);
      }
      list.forEach(([id, i, src]) => {
        const x = NFT[i];
        const card = document.createElement('div');
        card.className = 'inv-item' + (id === S.upItem ? ' is-pick' : ''); card.style.setProperty('--tone', x.c);
        card.setAttribute('role', 'button');
        const ico = document.createElement('div'); ico.className = 'inv-ico'; ico.textContent = x.e;
        const name = document.createElement('b'); name.textContent = x.n;
        const val = document.createElement('span'); val.textContent = `${fmt(x.v)} ⭐`;
        const tag = document.createElement('small'); tag.className = 'inv-tag';
        tag.textContent = SRC_TAG[src] || SRC_TAG[0];
        card.append(ico, name, val, tag);
        card.addEventListener('click', () => { S.upItem = id === S.upItem ? null : id; S.upTarget = null; haptic('select'); renderUpgrader(); });
        box.appendChild(card);
      });
    }

    // цели
    const tb = $('#up-targets'); tb.textContent = '';
    const empty = t => { const e = document.createElement('div'); e.className = 'inv-empty'; e.textContent = t; tb.appendChild(e); };
    if (!stars && !cur) empty('Сначала выбери свой NFT');
    else if (stars && stake < GAME_MIN) empty(`Введи ставку от ${GAME_MIN} ⭐`);
    else if (stars && stake > playable()) empty(`Для игр доступно только ${fmt(playable())} ⭐`);
    else {
      const targets = NFT.map((x, i) => [x, i]).filter(([x]) => x.v > stake);
      if (!targets.length) empty(stars ? `Ставка должна быть меньше ${fmt(UP_MAX_STARS + 1)} ⭐` : 'Это самый дорогой NFT, апгрейдить некуда');
      targets.forEach(([x, i]) => {
        const row = document.createElement('div');
        row.className = 'drop' + (i === S.upTarget ? ' is-pick' : ''); row.style.setProperty('--tone', x.c);
        row.setAttribute('role', 'button');
        row.innerHTML = `<span class="drop-ico">${x.e}</span><span class="drop-name">${x.n}</span><span class="drop-val">${fmt(x.v)} ⭐</span><span class="drop-pct">${upPct(stake, x.v)}</span>`;
        row.addEventListener('click', () => { S.upTarget = i; haptic('select'); renderUpgrader(); });
        tb.appendChild(row);
      });
    }

    const ready = stakeOk && S.upTarget != null;
    const sum = $('#up-sum'), btn = $('#up-btn');
    const from = stars ? `${fmt(stake)} ⭐` : (cur ? NFT[cur[1]].e : '');
    sum.textContent = ready
      ? `${from} → ${NFT[S.upTarget].e} · шанс ${upPct(stake, NFT[S.upTarget].v)}`
      : (stars ? 'Введи ставку и выбери цель' : 'Выбери NFT и цель');
    btn.disabled = !ready;
    btn.textContent = ready ? 'Рискнуть и апгрейднуть' : 'Апгрейд';
  }
  $('#up-src').addEventListener('click', e => {
    const b = e.target.closest('button[data-s]'); if (!b || b.dataset.s === S.upSrc) return;
    S.upSrc = b.dataset.s; haptic('select'); renderUpgrader();
  });
  $('#up-seg').addEventListener('click', e => {
    const b = e.target.closest('button[data-m]'); if (!b || b.dataset.m === S.upMode) return;
    S.upMode = b.dataset.m; S.upTarget = null; haptic('select'); renderUpgrader();
  });
  [10, 50, 100, 500].forEach(v => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.v = v; b.textContent = fmt(v);
    $('#up-chips').appendChild(b);
  });
  { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.v = 'max'; b.textContent = 'Макс'; $('#up-chips').appendChild(b); }
  $('#up-chips').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    S.upBet = String(c.dataset.v === 'max' ? Math.min(playable(), UP_MAX_STARS) : c.dataset.v); $('#up-bet').value = S.upBet; haptic(); renderUpgrader();
  });
  $('#up-bet').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); S.upBet = e.target.value; renderUpgrader(); });

  $('#up-btn').addEventListener('click', async () => {
    const stars = S.upMode === 'stars';
    const cur = (SNAP.iv || []).find(r => r[0] === S.upItem);
    if (S.upTarget == null || (stars ? upBetNum() < GAME_MIN : !cur)) return;
    const t = NFT[S.upTarget], stake = stars ? upBetNum() : NFT[cur[1]].v;
    if (!(await needApi())) return;
    const rows = [[stars ? 'Ставка' : 'Отдаёшь', stars ? `${fmt(stake)} ⭐` : `${NFT[cur[1]].e} ${NFT[cur[1]].n}`], ['Цель', `${t.e} ${t.n}`],
      ['Шанс', upPct(stake, t.v)], ['Если проиграешь', stars ? 'звёзды сгорят' : 'NFT сгорит']];
    if (!(await ask('Рискнуть?', rows, 'Апгрейд'))) return;
    const payload = stars ? { action: 'upgrade', stars: stake, target: S.upTarget } : { action: 'upgrade', id: S.upItem, target: S.upTarget };
    const r = await act(payload, { defer: true });
    if (!r) return;
    if (!r.ok || !r.up) { if (r.state) applyState(r.state); return; }
    await showUpgrade(r.up);
    S.upItem = null; S.upTarget = null;
    applyState(r.state);
  });
  async function showUpgrade(u) {
    const t = openReveal(), a = u.from >= 0 ? NFT[u.from] : null, b = NFT[u.to], pct = u.chance / 10;
    const deg = u.chance / 1000 * 360, mg = Math.min(6, deg * .15, (360 - deg) * .15);
    const ang = u.win ? mg + Math.random() * (deg - 2 * mg) : deg + mg + Math.random() * (360 - deg - 2 * mg);
    stage.innerHTML = `<div class="up-ring" style="--p:${pct}%"><div class="up-needle" id="up-needle"></div>
      <div class="up-core"><span>${a ? a.e : '⭐'}</span><i>→</i><span>${b.e}</span></div><span class="up-pct">${pct.toFixed(1)}%</span></div>`;
    rvTitle.textContent = 'Апгрейд'; rvSub.textContent = 'Стрелка решает…';
    const needle = $('#up-needle');
    if (reduce) { needle.style.transition = 'none'; needle.style.transform = `rotate(${ang}deg)`; }
    else {
      void needle.offsetWidth; needle.style.transform = `rotate(${ang + 1800}deg)`;
      for (let i = 0; i < 18; i++) { haptic('select'); await wait(120 + i * 14); if (t !== rvToken) return; }
      await wait(250); if (t !== rvToken) return;
    }
    if (u.win) {
      cssBurst(stage, 32); haptic('ok');
      rvTitle.textContent = 'Апгрейд удался!';
      rvSub.textContent = `${b.e} ${b.n} теперь в инвентаре (${fmt(b.v)} ⭐).`;
    } else {
      haptic('err');
      rvTitle.textContent = 'Не повезло';
      rvSub.textContent = (a ? `${a.e} ${a.n} сгорел.` : `${fmt(u.stars)} ⭐ сгорели.`) + ` Шанс был ${pct.toFixed(1)}%.`;
    }
    rvClaim.textContent = 'Понятно'; rvClaim.hidden = false; rvClaim.onclick = closeReveal;
  }

  /* ---------- Мины ---------- */
  const M_CELLS = 25;
  Object.assign(S, { mg: null, mcnt: 3, mbet: '', mbusy: false, mnew: -1 });
  const mMult = (m, k) => { let f = .97; for (let i = 0; i < k; i++) f *= (M_CELLS - i) / (M_CELLS - m - i); return f; };
  const mBet = () => Number(S.mbet) || 0;
  const mOk = () => mBet() >= GAME_MIN && mBet() <= gMax();

  // активную игру подтягиваем из состояния бота; завершённую оставляем на экране, пока не нажмут «Новая игра»
  function syncMines() {
    if (SNAP.mn) S.mg = SNAP.mn;
    else if (S.mg && S.mg.status === 'active') S.mg = null;
    renderMines();
  }
  function renderMines() {
    const g = S.mg;
    $('#m-setup').hidden = !!g; $('#m-play').hidden = !g;
    const m = S.mcnt, bet = mBet();
    $('#m-cnt').value = m; $('#m-cnt').style.setProperty('--p', ((m - 1) / 23 * 100) + '%');
    $('#m-cnt-t').textContent = `Мин: ${m}`;
    $('#m-cnt-x').textContent = `первая клетка ×${mMult(m, 1).toFixed(2)}`;
    const info = $('#m-info'), tooMuch = bet >= GAME_MIN && bet > gMax();
    info.classList.toggle('bad', tooMuch);
    info.textContent = tooMuch
      ? (playable() < bet ? `Для игр доступно только ${fmt(playable())} ⭐` : `Максимальная ставка ${fmt(GAME_MAX)} ⭐`)
      : bet ? `За первую клетку: ${fmt(Math.floor(bet * mMult(m, 1)))} ⭐` : '';
    $('#m-start').textContent = bet ? `Начать на ${fmt(bet)} ⭐` : 'Введи ставку';
    $('#m-start').disabled = !mOk();
    if (!g) return;

    const active = g.status === 'active', k = g.picked.length;
    $('#m-mult').textContent = k ? '×' + g.mult.toFixed(2) : '—';
    $('#m-pay').textContent = active ? (k ? `${fmt(g.payout)} ⭐` : '—') : (g.payout > 0 ? `+${fmt(g.payout)} ⭐` : '0 ⭐');
    $('#m-next').textContent = active && g.next ? `${fmt(g.next)} ⭐` : '—';
    const grid = $('#m-grid'); grid.textContent = '';
    for (let i = 0; i < M_CELLS; i++) {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'm-cell';
      const picked = g.picked.includes(i), isMine = !!g.layout && g.layout.includes(i);
      if (picked) { b.classList.add('safe'); b.textContent = '💎'; if (i === S.mnew) b.classList.add('new'); }
      else if (!active && isMine) { b.classList.add('mine'); b.textContent = '💣'; if (g.hit === i) b.classList.add('boom'); }
      else if (!active) b.classList.add('dim');
      b.disabled = !active || picked;
      if (active && !picked) b.addEventListener('click', () => minesPick(i));
      grid.appendChild(b);
    }
    $('#m-msg').textContent = active
      ? (k ? 'Открывай дальше или забери выигрыш.' : 'Открой любую клетку.')
      : g.status === 'cashed' ? `Выплата ${fmt(g.payout)} ⭐ (чистыми ${g.payout - g.bet >= 0 ? '+' : ''}${fmt(g.payout - g.bet)} ⭐).`
      : `Мина! Ставка ${fmt(g.bet)} ⭐ сгорела.`;
    $('#m-msg').classList.toggle('bad', g.status === 'busted');
    const cash = $('#m-cash');
    cash.hidden = !active; cash.disabled = !k || S.mbusy;
    cash.textContent = k ? `Забрать ${fmt(g.payout)} ⭐` : 'Забрать';
    $('#m-new').hidden = active;
  }
  async function minesStart() {
    if (!mOk()) { if (mBet() > playable()) toast('Не хватает заработанных ⭐ для такой ставки.'); return; }
    if (!(await needApi())) return;
    const r = await act({ action: 'mines_start', bet: mBet(), mines: S.mcnt }, { defer: true });
    if (!r) return;
    if (r.mines) { S.mg = r.mines; S.mnew = -1; }      // новая игра или уже начатая
    if (r.state) applyState(r.state); else renderMines();
    if (r.ok) haptic('medium');
  }
  async function minesPick(i) {
    if (S.mbusy) return;
    S.mbusy = true;
    try {
      const r = await act({ action: 'mines_pick', cell: i }, { defer: true });
      if (!r) return;
      if (r.mines) {
        S.mg = r.mines; S.mnew = i;
        if (r.state) applyState(r.state); else renderMines();
        if (r.mines.status === 'busted') haptic('heavy');
        else if (r.mines.status === 'cashed') { haptic('ok'); toast(`Все безопасные клетки открыты! +${fmt(r.mines.payout)} ⭐`); }
        else haptic('ok');
      } else if (r.state) applyState(r.state);
    } finally { S.mbusy = false; if (S.mg) renderMines(); }
  }
  async function minesCash() {
    if (S.mbusy) return;
    S.mbusy = true;
    try {
      const r = await act({ action: 'mines_cash' }, { defer: true });
      if (!r) return;
      if (r.mines) {
        S.mg = r.mines;
        if (r.state) applyState(r.state); else renderMines();
        if (r.ok) { haptic('ok'); toast(`+${fmt(r.mines.payout)} ⭐ забрано`); }
      } else if (r.state) applyState(r.state);
    } finally { S.mbusy = false; if (S.mg) renderMines(); }
  }
  [10, 50, 100, 500].forEach(v => {
    const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.v = v; b.textContent = fmt(v);
    $('#m-chips').appendChild(b);
  });
  { const b = document.createElement('button'); b.type = 'button'; b.className = 'chip'; b.dataset.v = 'max'; b.textContent = 'Макс'; $('#m-chips').appendChild(b); }
  $('#m-chips').addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    S.mbet = String(c.dataset.v === 'max' ? gMax() : c.dataset.v); $('#m-bet').value = S.mbet; haptic(); renderMines();
  });
  $('#m-bet').addEventListener('input', e => { e.target.value = e.target.value.replace(/\D/g, '').slice(0, 6); S.mbet = e.target.value; renderMines(); });
  $('#m-cnt').addEventListener('input', e => { S.mcnt = clamp(Number(e.target.value) || 3, 1, 24); haptic('select'); renderMines(); });
  $('#m-start').addEventListener('click', () => { haptic('medium'); minesStart(); });
  $('#m-cash').addEventListener('click', minesCash);
  $('#m-new').addEventListener('click', () => { S.mg = null; S.mnew = -1; haptic('select'); renderMines(); });

  /* ---------- Инвентарь ---------- */
  const inv = $('#inv'), sellAll = $('#sell-all');
  function renderInv() {
    const list = (SNAP.iv || []).filter(r => NFT[r[1]]);
    inv.textContent = '';
    if (!list.length) {
      const e = document.createElement('div');
      e.className = 'inv-empty';
      e.textContent = 'Пока пусто. Открой ежедневный кейс во вкладке «Бесплатное».';
      inv.appendChild(e);
    }
    list.forEach(([id, i, src]) => {
      const x = NFT[i];
      const card = document.createElement('div');
      card.className = 'inv-item'; card.style.setProperty('--tone', x.c);
      const ico = document.createElement('div'); ico.className = 'inv-ico'; ico.textContent = x.e;
      const name = document.createElement('b'); name.textContent = x.n;
      const val = document.createElement('span'); val.textContent = `${fmt(x.v)} ⭐`;
      const btn = document.createElement('button');
      btn.type = 'button'; btn.className = 'chip'; btn.textContent = 'Продать';
      btn.addEventListener('click', async () => {
        if (await ask('Продать предмет?', [['Предмет', `${x.e} ${x.n}`], ['Получишь', `${fmt(x.v)} ⭐ на баланс`]], 'Продать'))
          await act({ action: 'sell', id });
      });
      const tag = src ? (SRC_TAG[src] || '') : '';
      if (tag) { const t = document.createElement('small'); t.className = 'inv-tag'; t.textContent = tag; card.append(ico, name, val, t, btn); }
      else card.append(ico, name, val, btn);
      inv.appendChild(card);
    });
    const total = Number(SNAP.in) || list.length;
    if (list.length) {
      const sum = list.reduce((a, r) => a + NFT[r[1]].v, 0);
      sellAll.hidden = false;
      sellAll.textContent = total > list.length
        ? `Продать показанные (${list.length}) за ${fmt(sum)} ⭐`
        : `Продать всё за ${fmt(sum)} ⭐`;
      sellAll.onclick = async () => {
        if (await ask('Продать предметы?', [['Предметов', String(total)], ['Получишь', total > list.length ? 'сумму за всё, что есть в инвентаре' : `${fmt(sum)} ⭐ на баланс`]], 'Продать всё'))
          await act({ action: 'sell_all' });
      };
    } else {
      sellAll.hidden = true;
    }
  }

  /* ---------- Админ-меню ---------- */
  function bindAdmin() {
    if (!CFG.admin) { $('#admin').remove(); $('#admin-entry').remove(); return; }
    const wdT = $('#wd-target'), wdA = $('#wd-amt'), wdB = $('#wd-btn');
    const parseTarget = v => {
      v = v.trim();
      if (/^\d{5,}$/.test(v)) return v;
      if (/^@?[A-Za-z0-9_]{3,32}$/.test(v)) return '@' + v.replace(/^@/, '');
      return null;
    };
    const wdCheck = () => { wdB.disabled = !(parseTarget(wdT.value) && Number(wdA.value) >= 1); };
    wdT.addEventListener('input', wdCheck);
    wdA.addEventListener('input', () => { wdA.value = wdA.value.replace(/\D/g, '').slice(0, 8); wdCheck(); });
    wdB.addEventListener('click', async () => {
      const target = parseTarget(wdT.value), amount = Number(wdA.value);
      if (!target || amount < 1) return;
      if (await ask('Вывести с баланса бота?', [['Получатель', target], ['Сумма', `${fmt(amount)} ⭐`]], 'Вывести')) {
        const rid = Array.from(crypto.getRandomValues(new Uint8Array(16)), b => (b % 36).toString(36)).join('');
        const r = await act({ action: 'admin_withdraw', target, amount, rid });
        if (r && r.ok) { wdT.value = ''; wdA.value = ''; wdCheck(); }
      }
    });
  }

  function renderAdmin() {
    if (!CFG.admin) return;
    const c = SNAP.c || {};
    $('#st-p').textContent = fmt(c.p || 0);
    $('#st-d').textContent = fmt(c.d || 0);
    $('#st-r').textContent = fmt(c.r || 0);
    $('#admin-sub').textContent = `Ждут рассмотрения: ${fmt(c.p || 0)}` + (c.q ? `, апелляций: ${fmt(c.q)}` : '');
    $('#admin-entry').hidden = false;

    const box = $('#adm-list'), list = SNAP.p || [];
    box.textContent = '';
    if (!list.length) {
      const e = document.createElement('div');
      e.className = 'inv-empty'; e.textContent = (c.p || 0) ? 'Список не поместился. Открой заявки в уведомлениях бота.' : 'Новых заявок нет.';
      box.appendChild(e);
    }
    list.forEach(a => {
      const card = document.createElement('article'); card.className = 'adm-card';
      const head = document.createElement('header');
      const id = document.createElement('b'); id.textContent = `#${a.i}`;
      const nm = document.createElement('span'); nm.className = 'adm-name'; nm.textContent = a.n;
      const st = document.createElement('span'); st.className = 'adm-stars'; st.textContent = `${fmt(a.s)} ⭐`;
      head.append(id, nm, st);
      const p = document.createElement('p'); p.textContent = a.t + (a.t.length >= 70 ? '…' : '');
      const btns = document.createElement('div'); btns.className = 'adm-btns';
      const no = document.createElement('button'); no.type = 'button'; no.className = 'ghost danger'; no.textContent = 'Отклонить';
      const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'cta cta--sm'; ok.textContent = `Выплатить ${fmt(a.s)} ⭐`;
      ok.addEventListener('click', async () => {
        if (await ask('Выплатить по заявке?', [['Заявка', `#${a.i} · ${a.n}`], ['Сумма', `${fmt(a.s)} ⭐`]], 'Выплатить'))
          await act({ action: 'admin_pay', id: a.i });
      });
      no.addEventListener('click', async () => {
        const reason = await ask('Отклонить заявку?', [['Заявка', `#${a.i} · ${a.n}`]], 'Отклонить',
          { input: { placeholder: 'Причина отказа: её увидит пользователь', min: 3, max: 300 } });
        if (reason) await act({ action: 'admin_reject', id: a.i, reason });
      });
      btns.append(no, ok);
      card.append(head, p, btns);
      box.appendChild(card);
    });
    renderAdminAppeals(c);
    const note = $('#adm-note');
    note.hidden = !((c.p || 0) > list.length);
    note.textContent = `Показаны первые ${list.length} из ${c.p}. Остальные появятся после обработки, полный текст заявок есть в уведомлениях бота.`;
  }

  /* ---------- Отказы и апелляции ---------- */
  const APPEAL_MAX = 500;
  const AP_STATE = {
    pending: ['⏳', 'Апелляция на рассмотрении'],
    approved: ['✅', 'Апелляцию одобрили, звёзды выплачены'],
    denied: ['❌', 'Апелляцию отклонили'],
  };

  function renderAppeals() {
    const box = $('#appeals'), list = $('#ap-list'), items = SNAP.ma || [];
    list.textContent = '';
    box.hidden = !items.length;
    items.forEach(a => {
      const card = document.createElement('article'); card.className = 'adm-card';
      const head = document.createElement('header');
      const id = document.createElement('b'); id.textContent = `#${a.i}`;
      const nm = document.createElement('span'); nm.className = 'adm-name';
      nm.textContent = a.a === 'approved' ? 'Выплачено по апелляции' : 'Заявка отклонена';
      const st = document.createElement('span'); st.className = 'adm-stars'; st.textContent = `${fmt(a.s)} ⭐`;
      head.append(id, nm, st);
      card.appendChild(head);
      if (a.r && a.a !== 'approved') {
        const p = document.createElement('p');
        const b = document.createElement('b'); b.textContent = 'Причина отказа: ';
        p.append(b, document.createTextNode(a.r));
        card.appendChild(p);
      }
      if (a.a && AP_STATE[a.a]) {
        const s = document.createElement('div');
        s.className = `ap-state ap-state--${a.a}`;
        s.textContent = `${AP_STATE[a.a][0]} ${AP_STATE[a.a][1]}`;
        card.appendChild(s);
        if (a.a === 'denied' && a.c) {
          const p = document.createElement('p');
          const b = document.createElement('b'); b.textContent = 'Ответ админа: ';
          p.append(b, document.createTextNode(a.c));
          card.appendChild(p);
        }
      } else {
        const btns = document.createElement('div'); btns.className = 'adm-btns adm-btns--one';
        const btn = document.createElement('button');
        btn.type = 'button'; btn.className = 'cta cta--sm'; btn.textContent = '⚖️ Обжаловать отказ';
        btn.addEventListener('click', async () => {
          const comment = await ask('Обжаловать отказ?',
            [['Заявка', `#${a.i} · ${fmt(a.s)} ⭐`], ['Причина отказа', a.r || '—']], 'Обжаловать',
            { input: { placeholder: 'Комментарий: почему ты не согласен (необязательно)', min: 0, max: APPEAL_MAX } });
          if (comment === null) return;   // нажали «Назад»
          await act({ action: 'appeal', id: a.i, comment });
        });
        btns.appendChild(btn);
        card.appendChild(btns);
      }
      list.appendChild(card);
    });
  }

  function renderAdminAppeals(c) {
    const box = $('#apl-list'), list = SNAP.q || [];
    box.textContent = '';
    if (!list.length) {
      const e = document.createElement('div');
      e.className = 'inv-empty';
      e.textContent = (c.q || 0) ? 'Список не поместился. Апелляции есть в уведомлениях бота.' : 'Апелляций нет.';
      box.appendChild(e);
    }
    list.forEach(a => {
      const card = document.createElement('article'); card.className = 'adm-card';
      const head = document.createElement('header');
      const id = document.createElement('b'); id.textContent = `#${a.i}`;
      const nm = document.createElement('span'); nm.className = 'adm-name'; nm.textContent = `${a.n} · заявка #${a.a}`;
      const st = document.createElement('span'); st.className = 'adm-stars'; st.textContent = `${fmt(a.s)} ⭐`;
      head.append(id, nm, st);
      const mk = (label, text) => {
        const p = document.createElement('p');
        const b = document.createElement('b'); b.textContent = label;
        p.append(b, document.createTextNode(text));
        return p;
      };
      const cut = t => (t || '') + ((t || '').length >= 70 ? '…' : '');
      const btns = document.createElement('div'); btns.className = 'adm-btns';
      const no = document.createElement('button'); no.type = 'button'; no.className = 'ghost danger'; no.textContent = 'Отказать';
      const ok = document.createElement('button'); ok.type = 'button'; ok.className = 'cta cta--sm'; ok.textContent = `Выплатить ${fmt(a.s)} ⭐`;
      ok.addEventListener('click', async () => {
        if (await ask('Подтвердить выдачу?', [['Апелляция', `#${a.i} · заявка #${a.a}`], ['Сумма', `${fmt(a.s)} ⭐`]], 'Выплатить'))
          await act({ action: 'admin_appeal_pay', id: a.i });
      });
      no.addEventListener('click', async () => {
        const reason = await ask('Отказать по апелляции?', [['Апелляция', `#${a.i} · заявка #${a.a}`]], 'Отказать',
          { input: { placeholder: 'Причина отказа: её увидит пользователь', min: 3, max: 300 } });
        if (reason) await act({ action: 'admin_appeal_deny', id: a.i, reason });
      });
      btns.append(no, ok);
      card.append(head, mk('Причина отказа: ', cut(a.r) || '—'), mk('Комментарий: ', cut(a.t) || 'без комментария'), btns);
      box.appendChild(card);
    });
    const note = $('#apl-note');
    note.hidden = !((c.q || 0) > list.length);
    note.textContent = `Показаны первые ${list.length} из ${c.q}. Остальные появятся после обработки.`;
  }

  /* ---------- Профиль ---------- */
  const LEVELS = [
    { n: 'Новичок', e: '🌱', xp: 0 }, { n: 'Искатель', e: '🔭', xp: 50 }, { n: 'Звездочёт', e: '✨', xp: 150 },
    { n: 'Астроном', e: '🪐', xp: 400 }, { n: 'Космонавт', e: '🚀', xp: 900 }, { n: 'Легенда', e: '👑', xp: 2000 },
  ];
  // Достижения приходят от бота: [id, эмодзи, название, описание, награда, состояние (0 закрыто, 1 можно забрать, 2 получено)]
  const DEMO_ACH = [
    ['first_approve', '🌟', 'Первое одобрение', 'Получи звёзды по заявке', 300, 1, 1, 1, 'Заявки'],
    ['approve5', '✅', 'Надёжный', '5 одобренных заявок', 1000, 0, 1, 5, 'Заявки'],
    ['first_reject', '💔', 'Первый отказ', 'Не сдавайся: опыт тоже награда', 150, 2, 1, 1, 'Заявки'],
    ['first_bonus', '🎁', 'Первый бонус', 'Забери ежедневный бонус', 50, 2, 1, 1, 'Старт'],
    ['first_case', '📦', 'Первый кейс', 'Открой ежедневный кейс', 50, 2, 1, 1, 'Старт'],
    ['streak3', '🔥', 'Разогрев', 'Серия бонусов 3 дня', 100, 2, 3, 3, 'Серии'],
    ['streak7', '🔥', 'Огонь', 'Серия бонусов 7 дней', 300, 2, 7, 7, 'Серии'],
    ['streak14', '⚡', 'Две недели подряд', 'Серия бонусов 14 дней', 600, 0, 7, 14, 'Серии'],
    ['streak30', '🗓', 'Постоянство', 'Серия бонусов 30 дней', 1500, 0, 7, 30, 'Серии'],
    ['sales5', '🏪', 'Торговец', 'Продай 5 NFT', 300, 0, 4, 5, 'Кейсы и NFT'],
    ['collector', '🧩', 'Коллекционер', 'Собери все виды NFT', 1000, 0, 5, 8, 'Кейсы и NFT'],
    ['donate100', '💎', 'Меценат', 'Поддержи проект на 100 ⭐', 500, 1, 100, 100, 'Деньги'],
    ['rich5000', '👑', 'Богач', 'Общий баланс 5 000 ⭐', 500, 0, 4250, 5000, 'Деньги'],
    ['rare', '❓', '???', 'Секретное достижение', 1000, 0, 0, 1, 'Секретные'],
  ];
  let achFilter = 'all';
  const CAT_ICON = { 'Старт': '🚀', 'Серии': '🔥', 'Кейсы и NFT': '📦', 'Заявки': '📝', 'Деньги': '💰', 'Секретные': '🕵️' };
  const CAT_ORDER = ['Старт', 'Серии', 'Кейсы и NFT', 'Заявки', 'Деньги', 'Секретные'];

  function achCard([id, e, name, d, r, state, cur, goal]) {
    const c = mk('div', 'ach ' + (state === 1 ? 'is-ready' : state === 2 ? 'is-done' : 'is-locked') + (name === '???' ? ' is-secret' : ''));
    const txt = mk('div', 'ach-txt');
    txt.append(mk('b', '', name), mk('span', '', d));
    if (state === 0 && goal > 1) {
      const bar = mk('div', 'ach-bar'); const fill = document.createElement('i');
      fill.style.width = clamp(cur / goal * 100, 3, 100) + '%'; bar.appendChild(fill);
      txt.append(bar, mk('span', 'ach-prog', `${fmt(cur)} / ${fmt(goal)}`));
    }
    const tag = mk('em', 'ach-r', state === 2 ? `✓ +${fmt(r)} ⭐` : state === 1 ? `Забрать +${fmt(r)} ⭐` : `+${fmt(r)} ⭐`);
    c.append(mk('i', '', e), txt, tag);
    if (state === 1) {
      c.tabIndex = 0; c.setAttribute('role', 'button');
      const go1 = async () => { burstAt(c); await act({ action: 'claim_ach', id }); };
      c.addEventListener('click', go1);
      c.addEventListener('keydown', ev => { if (ev.key === 'Enter') go1(); });
    }
    return c;
  }

  function renderAch() {
    const list = (SNAP.pf && SNAP.pf.ach) || (DEMO ? DEMO_ACH : []);
    const ready = list.filter(a => a[5] === 1), done = list.filter(a => a[5] === 2), todo = list.filter(a => a[5] === 0);
    const earned = done.reduce((s, a) => s + a[4], 0), all = list.reduce((s, a) => s + a[4], 0);

    $('#ach-count').textContent = list.length
      ? `${done.length} из ${list.length}` + (ready.length ? ` · ждут награды: ${ready.length}` : '') : 'Откроются после обновления бота';
    $('#as-done').textContent = `${done.length} из ${list.length}`;
    $('#as-stars').textContent = `Получено ${fmt(earned)} из ${fmt(all)} ⭐`;
    $('#as-fill').style.width = (list.length ? done.length / list.length * 100 : 0) + '%';
    $$('[data-ach-dot]').forEach(d => { d.hidden = !ready.length; });

    const allBtn = $('#ach-all'), sum = ready.reduce((a, x) => a + x[4], 0);
    allBtn.hidden = ready.length < 2;
    allBtn.textContent = `Забрать всё: +${fmt(sum)} ⭐`;
    allBtn.onclick = () => act({ action: 'claim_ach', id: 'all' });

    const cnt = { all: list.length, ready: ready.length, todo: todo.length, done: done.length };
    const names = { all: 'Все', ready: 'Забрать', todo: 'В процессе', done: 'Готово' };
    $$('#aseg button').forEach(b => {
      b.textContent = `${names[b.dataset.f]} ${cnt[b.dataset.f]}`;
      b.classList.toggle('is-on', b.dataset.f === achFilter);
    });

    const pool = ({ all: list, ready, todo, done })[achFilter];
    const box = $('#pf-ach'); box.textContent = '';
    if (!pool.length) {
      box.appendChild(mk('div', 'inv-empty', ({
        ready: 'Пока нечего забирать. Выполняй условия, и награды появятся здесь.',
        todo: 'Все достижения уже выполнены. Ты легенда! 👑',
        done: 'Пока ничего не выполнено. Начни с ежедневного бонуса.',
        all: 'Достижения появятся после обновления бота.',
      })[achFilter]));
      return;
    }
    // «Можно забрать» наверху, дальше по категориям; внутри категории по возрастанию сложности
    const groups = [];
    if (achFilter === 'all' && ready.length) groups.push(['🎉 Можно забрать', ready, null]);
    const rest = achFilter === 'all' ? pool.filter(a => a[5] !== 1) : pool;
    const cats = [...CAT_ORDER, ...new Set(list.map(a => a[8]).filter(x => x && !CAT_ORDER.includes(x)))];
    cats.forEach(cat => {
      const items = rest.filter(a => a[8] === cat);
      if (!items.length) return;
      const inCat = list.filter(a => a[8] === cat);
      groups.push([`${CAT_ICON[cat] || '⭐'} ${cat}`, items, `${inCat.filter(a => a[5] === 2).length} / ${inCat.length}`]);
    });
    groups.forEach(([title, items, meta]) => {
      const head = mk('div', 'ach-group'); head.append(mk('b', '', title));
      if (meta) head.append(mk('span', '', meta));
      box.appendChild(head);
      items.slice().sort((a, b) => (b[5] === 1) - (a[5] === 1) || a[7] - b[7]).forEach(a => box.appendChild(achCard(a)));
    });
  }
  $('#aseg').addEventListener('click', e => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    achFilter = b.dataset.f; haptic('select'); renderAch();
  });
  const KIND = {
    bonus: ['🎁', 'Ежедневный бонус'], sell: ['🏷', 'Продажа NFT'], topup: ['📥', 'Пополнение'],
    withdraw: ['📤', 'Вывод'], withdraw_refund: ['↩️', 'Возврат вывода'], ach: ['🏆', 'Награда за достижение'],
    game: ['🎲', 'Игра'], mines_bet: ['💣', 'Мины: ставка'], mines_win: ['💣', 'Мины: выигрыш'], shop: ['🛒', 'Покупка NFT'], case_open: ['🎰', 'Платный кейс'], upgrade: ['🚀', 'Апгрейд'],
    transfer_out: ['💸', 'Перевод отправлен'], transfer_in: ['📨', 'Перевод получен'],
  };
  const dayWord = n => { n = Math.abs(n) % 100; const k = n % 10; return n > 10 && n < 20 ? 'дней' : k === 1 ? 'день' : k >= 2 && k <= 4 ? 'дня' : 'дней'; };
  const mk = (tag, cls, text) => { const e = document.createElement(tag); if (cls) e.className = cls; if (text != null) e.textContent = text; return e; };

  function renderProfile() {
    const PF = SNAP.pf || {};
    const has = k => PF[k] != null;
    const n = k => Number(PF[k]) || 0;
    const invSum = (SNAP.iv || []).reduce((a, r) => a + (NFT[r[1]] ? NFT[r[1]].v : 0), 0);
    const nftVal = has('nv') ? n('nv') : invSum;
    const total = balance() + nftVal;
    $('#pf-total').textContent = fmt(total);
    $('#pf-nft').textContent = fmt(nftVal);
    $('#pf-since').textContent = has('sn') && n('sn') ? `В проекте с ${new Date(n('sn') * 1000).toLocaleDateString('ru-RU')}` : '';

    // серия на экране «Бесплатное»
    const streak = $('#streak');
    streak.hidden = !has('st') || n('st') < 1;
    $('#streak-n').textContent = String(n('st'));
    $('#streak-w').textContent = dayWord(n('st'));

    // уровень
    const xp = n('dd') * 10 + n('cc') * 10 + n('ap') * 30 + Math.floor(n('dn') / 10)
      + 25 * (PF.ach || []).filter(a => a[5] === 2).length;
    let li = 0; LEVELS.forEach((l, i) => { if (xp >= l.xp) li = i; });
    const L = LEVELS[li], NX = LEVELS[li + 1];
    $('#lvl-name').textContent = `${L.e} Уровень ${li + 1} · ${L.n}`;
    $('#lvl-xp').textContent = NX ? `${fmt(xp)} / ${fmt(NX.xp)} XP` : `${fmt(xp)} XP · максимум`;
    $('#lvl-fill').style.width = (NX ? clamp((xp - L.xp) / (NX.xp - L.xp) * 100, 3, 100) : 100) + '%';

    // статистика
    const val = (k, suf = '') => (has(k) ? fmt(n(k)) + suf : '—');
    const tiles = [
      ['🔥', 'Серия дней', has('st') ? `${n('st')} ${dayWord(n('st'))}` : '—'],
      ['🏅', 'Лучшая серия', has('bs') ? `${n('bs')} ${dayWord(n('bs'))}` : '—'],
      ['🎁', 'Получено бонусов', val('be', ' ⭐')],
      ['📦', 'Кейсов открыто', val('cc')],
      ['🏷', 'NFT продано', has('ns') ? `${fmt(n('ns'))} · ${fmt(n('se'))} ⭐` : '—'],
      ['💝', 'Поддержка проекта', val('dn', ' ⭐')],
      ['📥', 'Пополнено', val('tu', ' ⭐')],
      ['📤', 'Выведено', val('wd', ' ⭐')],
      ['🌟', 'Выплачено по заявкам', val('as', ' ⭐')],
      ['🎲', 'Игры', has('gm') ? `${fmt(n('gm'))} · ${n('gn') >= 0 ? '+' : '−'}${fmt(Math.abs(n('gn')))} ⭐` : '—'],
      ['💸', 'Переводы', has('to') ? `−${fmt(n('to'))} / +${fmt(n('ti'))} ⭐` : '—'],
      ['💰', 'Заработано всего', has('be') ? fmt(n('be') + n('se') + n('ae')) + ' ⭐' : '—'],
    ];
    const grid = $('#pf-stats'); grid.textContent = '';
    tiles.forEach(([ico, label, v]) => {
      const c = mk('div', 'stat');
      c.append(mk('span', 'stat-ico', ico), mk('b', '', v), mk('span', '', label));
      grid.appendChild(c);
    });

    renderStats();
    renderAch();

    // история: последние 5 событий (полная лента — на отдельном экране)
    const hist = $('#pf-hist'); hist.textContent = '';
    const hy = histData();
    if (!hy.length) hist.appendChild(mk('div', 'inv-empty', 'Операций пока нет. Забери ежедневный бонус во вкладке «Бесплатное».'));
    hy.slice(0, 5).forEach(it => hist.appendChild(histRow(it)));
    renderHistory();
  }

  /* ---------- История операций ---------- */
  const TYPES = {
    bonus: ['🎁', 'Ежедневный бонус'], sell: ['🏷', 'Продажа NFT'], topup: ['📥', 'Пополнение'],
    withdraw: ['📤', 'Вывод'], refund: ['↩️', 'Возврат вывода'], ach: ['🏆', 'Награда за достижение'],
    nft: ['📦', 'Получен предмет'], req: ['📝', 'Заявка подана'], req_ok: ['🌟', 'Заявка одобрена'],
    req_no: ['❌', 'Заявка отклонена'], donate: ['💝', 'Поддержка проекта'], appeal: ['⚖️', 'Апелляция подана'],
    appeal_ok: ['✅', 'Апелляция одобрена'], appeal_no: ['🚫', 'Апелляция отклонена'], other: ['⭐', 'Операция'],
    game: ['🎲', 'Игра'], shop: ['🛒', 'Покупка NFT'], pcase: ['🎰', 'Платный кейс'], tr_out: ['💸', 'Перевод отправлен'], tr_in: ['📨', 'Перевод получен'],
  };
  const BAL = new Set(['bonus', 'sell', 'topup', 'withdraw', 'refund', 'ach', 'other', 'game', 'shop', 'pcase', 'tr_out', 'tr_in']);   // меняют баланс в боте
  const HFIL = {
    all: () => true,
    in: h => BAL.has(h[1]) && h[2] > 0,
    out: h => (BAL.has(h[1]) && h[2] < 0) || h[1] === 'donate',
    req: h => h[1].startsWith('req') || h[1].startsWith('appeal'),
    items: h => h[1] === 'nft' || h[1] === 'sell',
    rewards: h => h[1] === 'bonus' || h[1] === 'ach',
  };
  let histFilter = 'all', histShown = 30;
  const HIST_PAGE = 30;
  const timeStr = ts => new Date(ts * 1000).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
  function dayTitle(ts) {
    const d = new Date(ts * 1000), t0 = new Date(); t0.setHours(0, 0, 0, 0);
    const diff = Math.round((t0 - new Date(d.getFullYear(), d.getMonth(), d.getDate())) / 864e5);
    if (diff === 0) return 'Сегодня';
    if (diff === 1) return 'Вчера';
    return d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long', year: d.getFullYear() === t0.getFullYear() ? undefined : 'numeric' });
  }
  function histData() {
    const PF = SNAP.pf || {};
    if (PF.hy) return PF.hy;
    return (PF.hx || []).map(([d, k, t]) => [t, k === 'withdraw_refund' ? 'refund' : k, d, '']);   // старый формат бота
  }
  function histRow([ts, type, amount, info]) {
    const t = TYPES[type] || TYPES.other;
    const row = mk('div', 'hist-row');
    const txt = mk('div', 'hist-txt');
    txt.append(mk('b', '', t[1]), mk('span', '', timeStr(ts) + (info ? ' · ' + info : '')));
    let sum = null;
    if (BAL.has(type)) sum = mk('span', 'hist-sum ' + (amount >= 0 ? 'plus' : 'minus'), `${amount >= 0 ? '+' : '−'}${fmt(Math.abs(amount))} ⭐`);
    else if (type === 'req_ok') sum = mk('span', 'hist-sum plus', `+${fmt(amount)} ⭐`);
    else if (type === 'donate') sum = mk('span', 'hist-sum neutral', `${fmt(amount)} ⭐`);
    row.append(mk('span', 'hist-ico', t[0]), txt, sum || mk('span', ''));
    return row;
  }
  function renderHistory() {
    const all = histData();
    const list = all.filter(HFIL[histFilter]);
    const cnt = k => all.filter(HFIL[k]).length;
    const labels = { all: 'Все', in: 'Доходы', out: 'Расходы', req: 'Заявки', items: 'Предметы', rewards: 'Награды' };
    $$('#hfil button').forEach(b => {
      b.textContent = `${labels[b.dataset.f]} ${cnt(b.dataset.f)}`;
      b.classList.toggle('is-on', b.dataset.f === histFilter);
    });
    let inc = 0, out = 0;
    list.forEach(h => { if (BAL.has(h[1])) { if (h[2] > 0) inc += h[2]; else out -= h[2]; } });
    $('#hs-n').textContent = fmt(list.length); $('#hs-in').textContent = '+' + fmt(inc); $('#hs-out').textContent = '−' + fmt(out);

    const box = $('#hist-list'); box.textContent = '';
    if (!list.length) box.appendChild(mk('div', 'inv-empty', all.length ? 'В этой категории событий пока нет.' : 'Операций пока нет. Забери ежедневный бонус во вкладке «Бесплатное».'));
    let lastDay = '', group = null;
    list.slice(0, histShown).forEach(it => {
      const day = dayTitle(it[0]);
      if (day !== lastDay) {
        box.appendChild(mk('div', 'hist-day', day));
        group = mk('div', 'hist'); box.appendChild(group); lastDay = day;
      }
      group.appendChild(histRow(it));
    });
    $('#hist-more').hidden = list.length <= histShown;
    $('#hist-more').textContent = `Показать ещё (${Math.min(HIST_PAGE, list.length - histShown)})`;
    const note = $('#hist-note');
    note.hidden = !(SNAP.pf && SNAP.pf.hy && SNAP.pf.hy.length >= 120 && list.length <= histShown);
    note.textContent = 'Показаны последние 120 событий.';
  }
  $('#hfil').addEventListener('click', e => {
    const b = e.target.closest('button[data-f]'); if (!b) return;
    histFilter = b.dataset.f; histShown = HIST_PAGE; haptic('select'); renderHistory();
  });
  $('#hist-more').addEventListener('click', () => { histShown += HIST_PAGE; haptic('select'); renderHistory(); });

  /* ---------- Статистика: графики ---------- */
  const SRC = [
    { k: 0, n: 'Бонусы', c: 'var(--star)' },
    { k: 1, n: 'Продажи NFT', c: 'var(--mint)' },
    { k: 2, n: 'Достижения', c: '#c084fc' },
    { k: 3, n: 'Пополнения', c: '#4cc9f0' },
    { k: 4, n: 'Игры и переводы', c: 'var(--mute)' },
  ];
  const XC = 'var(--coral)';
  let statPeriod = 30;
  const SVGNS = 'http://www.w3.org/2000/svg';
  const svg = (tag, attrs = {}, parent) => {
    const e = document.createElementNS(SVGNS, tag);
    for (const k in attrs) e.setAttribute(k, attrs[k]);
    if (parent) parent.appendChild(e);
    return e;
  };
  const dayLabel = (iso0, i) => {
    const d = new Date(iso0 + 'T00:00:00'); d.setDate(d.getDate() + i);
    return d.toLocaleDateString('ru-RU', { day: '2-digit', month: '2-digit' });
  };
  const signed = v => (v > 0 ? '+' : v < 0 ? '−' : '') + fmt(Math.abs(v));
  const sumInc = r => r[0] + r[1] + r[2] + r[3] + r[4];

  // демо-данные для просмотра без бота
  function demoSeries() {
    const d0 = new Date(Date.now() - 89 * 864e5).toISOString().slice(0, 10);
    let bal = 600; const rows = []; let act = '';
    for (let i = 0; i < 90; i++) {
      const r = [0, 0, 0, 0, 0, 0], on = (i * 7) % 10 < 7, cs = (i * 5) % 9 < 5;
      if (on) r[0] = 150 + (i % 4) * 100;
      if (i % 9 === 4) r[1] = 400 + (i % 3) * 300;
      if (i % 29 === 10) r[2] = 300;
      if (i === 55) r[3] = 500;
      if (i % 23 === 20) r[5] = 600;
      bal += sumInc(r) - r[5]; rows.push([...r, bal]);
      act += on && cs ? '2' : on ? '1' : cs ? '3' : '0';
    }
    return { d0, rows, act };
  }

  // Нажатие/движение пальцем по графику -> индекс дня
  function scrub(el, W, L, R, n, kind, onIdx) {
    const at = e => {
      const r = el.getBoundingClientRect();
      const px = (e.clientX - r.left) / r.width * W - L, span = W - L - R;
      onIdx(clamp(kind === 'line' ? Math.round(px / span * (n - 1)) : Math.floor(px / (span / n)), 0, n - 1));
    };
    el.style.touchAction = 'pan-y';
    el.addEventListener('pointerdown', e => { at(e); haptic('select'); });
    el.addEventListener('pointermove', e => { if (e.buttons || e.pointerType === 'mouse') at(e); });
  }

  function drawBalance(rows, d0, off) {
    const box = $('#ch-bal'); box.textContent = '';
    const W = 340, H = 140, L = 8, R = 8, T = 10, B = 22, n = rows.length;
    const vals = rows.map(r => r[6]);
    const vmin = Math.min(...vals), vmax = Math.max(...vals);
    let lo = vmin, hi = vmax; if (hi === lo) { hi += 1; lo -= 1; }
    const pad = (hi - lo) * .12; lo -= pad; hi += pad;
    const x = i => L + (n === 1 ? 0 : i / (n - 1)) * (W - L - R);
    const y = v => T + (1 - (v - lo) / (hi - lo)) * (H - T - B);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'График баланса' }, box);
    const defs = svg('defs', {}, s);
    const g = svg('linearGradient', { id: 'gbal', x1: 0, y1: 0, x2: 0, y2: 1 }, defs);
    svg('stop', { offset: 0, style: 'stop-color:var(--star);stop-opacity:.45' }, g);
    svg('stop', { offset: 1, style: 'stop-color:var(--star);stop-opacity:0' }, g);
    [.25, .5, .75].forEach(f => svg('line', { x1: L, x2: W - R, y1: T + (H - T - B) * f, y2: T + (H - T - B) * f, class: 'grid' }, s));
    const pts = vals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`);
    svg('path', { d: `M${x(0)},${H - B} L${pts.join(' L')} L${x(n - 1)},${H - B} Z`, style: 'fill:url(#gbal)' }, s);
    svg('path', { d: `M${pts.join(' L')}`, class: 'line' }, s);
    const t1 = svg('text', { x: L, y: H - 6 }, s); t1.textContent = dayLabel(d0, off);
    const t2 = svg('text', { x: W - R, y: H - 6, 'text-anchor': 'end' }, s); t2.textContent = 'сегодня';
    const mk1 = svg('line', { y1: T, y2: H - B, class: 'marker', opacity: 0 }, s);
    const dot = svg('circle', { r: 4.5, class: 'dot-end' }, s);
    const set = i => {
      dot.setAttribute('cx', x(i)); dot.setAttribute('cy', y(vals[i]));
      mk1.setAttribute('x1', x(i)); mk1.setAttribute('x2', x(i)); mk1.setAttribute('opacity', i === n - 1 ? 0 : 1);
      $('#rd-bal').textContent = `${i === n - 1 ? 'Сейчас' : dayLabel(d0, off + i)} · ${fmt(vals[i])} ⭐`;
    };
    set(n - 1);
    scrub(s, W, L, R, n, 'line', set);
  }

  function drawBars(rows, d0, off) {
    const box = $('#ch-bars'); box.textContent = '';
    const W = 340, H = 150, L = 8, R = 8, T = 8, B = 20, n = rows.length;
    const maxI = Math.max(1, ...rows.map(sumInc)), maxX = Math.max(0, ...rows.map(r => r[5]));
    const plotH = H - T - B, y0 = T + plotH * (maxI / (maxI + maxX));
    const kI = (y0 - T) / maxI, kX = maxX ? (T + plotH - y0) / maxX : 0;
    const slot = (W - L - R) / n, bw = Math.max(1.6, slot * .68);
    const s = svg('svg', { viewBox: `0 0 ${W} ${H}`, class: 'chart', role: 'img', 'aria-label': 'Доходы и расходы по дням' }, box);
    const hl = svg('rect', { y: T, height: H - T - B, width: slot, class: 'hl', opacity: 0 }, s);
    rows.forEach((r, i) => {
      const bx = L + i * slot + (slot - bw) / 2; let yy = y0;
      SRC.forEach(sc => {
        const v = r[sc.k]; if (v <= 0) return;
        const hh = Math.max(1.5, v * kI); yy -= hh;
        svg('rect', { x: bx, y: yy, width: bw, height: hh, rx: Math.min(2, bw / 2), style: `fill:${sc.c}` }, s);
      });
      if (r[5] > 0) svg('rect', { x: bx, y: y0, width: bw, height: Math.max(1.5, r[5] * kX), rx: Math.min(2, bw / 2), style: `fill:${XC}` }, s);
    });
    svg('line', { x1: L, x2: W - R, y1: y0, y2: y0, class: 'axis' }, s);
    const t1 = svg('text', { x: L, y: H - 6 }, s); t1.textContent = dayLabel(d0, off);
    const t2 = svg('text', { x: W - R, y: H - 6, 'text-anchor': 'end' }, s); t2.textContent = 'сегодня';
    const rd = $('#rd-bars');
    rd.textContent = `Всего ${signed(rows.reduce((a, r) => a + sumInc(r) - r[5], 0))} ⭐`;
    scrub(s, W, L, R, n, 'bar', i => {
      hl.setAttribute('x', L + i * slot); hl.setAttribute('opacity', 1);
      const r = rows[i];
      rd.textContent = `${dayLabel(d0, off + i)} · +${fmt(sumInc(r))} / −${fmt(r[5])}`;
    });
    const lg = $('#lg-bars'); lg.textContent = '';
    SRC.filter(sc => rows.some(r => r[sc.k] > 0)).concat(rows.some(r => r[5] > 0) ? [{ n: 'Расход', c: XC }] : []).forEach(sc => {
      const sp = mk('span', ''); const dotE = mk('i', 'lg-dot'); dotE.style.background = sc.c; sp.append(dotE, sc.n); lg.appendChild(sp);
    });
  }

  function drawSources(rows) {
    const box = $('#ch-src'); box.textContent = '';
    const tot = SRC.map(sc => rows.reduce((a, r) => a + r[sc.k], 0)), all = tot.reduce((a, v) => a + v, 0);
    $('#rd-src').textContent = all ? `${fmt(all)} ⭐` : '';
    if (!all) { box.appendChild(mk('div', 'inv-empty', 'За этот период поступлений не было.')); return; }
    const bar = mk('div', 'srcbar');
    SRC.forEach((sc, i) => { if (!tot[i]) return; const seg = mk('i'); seg.style.flex = String(tot[i]); seg.style.background = sc.c; bar.appendChild(seg); });
    box.appendChild(bar);
    const list = mk('div', 'srclist');
    SRC.map((sc, i) => ({ sc, v: tot[i] })).filter(o => o.v).sort((a, b) => b.v - a.v).forEach(({ sc, v }) => {
      const row = mk('div', 'srcrow'); const dotE = mk('i', 'lg-dot'); dotE.style.background = sc.c;
      row.append(dotE, mk('span', '', sc.n), mk('b', '', `${fmt(v)} ⭐`), mk('em', '', `${Math.round(v / all * 100)}%`));
      list.appendChild(row);
    });
    box.appendChild(list);
  }

  function drawActivity(TS) {
    const box = $('#ch-act'); box.textContent = '';
    const wd = (new Date(TS.d0 + 'T00:00:00').getDay() + 6) % 7;   // понедельник = 0
    const grid = mk('div', 'heat');
    for (let i = 0; i < wd; i++) grid.appendChild(mk('i', 'heat-0 heat-pad'));
    const rd = $('#rd-act'), act = TS.act;
    let active = 0;
    [...act].forEach((v, i) => {
      if (v === '1' || v === '2') active++;
      const cell = mk('i', 'heat-' + v); cell.title = dayLabel(TS.d0, i);
      cell.addEventListener('click', () => { rd.textContent = `${dayLabel(TS.d0, i)}: ${({ 0: 'не заходил', 1: 'бонус', 2: 'бонус и кейс', 3: 'кейс' })[v]}`; haptic('select'); });
      grid.appendChild(cell);
    });
    box.appendChild(grid);
    rd.textContent = `Бонус: ${active} из ${act.length} дн.`;
  }

  function drawRequests(PF) {
    const box = $('#ch-req'); box.textContent = '';
    const ap = Number(PF.ap) || 0, rj = Number(PF.rj) || 0, rp = Number(PF.rp) || 0, tot = ap + rj + rp;
    const rd = $('#rd-req');
    if (!tot) { rd.textContent = ''; box.appendChild(mk('div', 'inv-empty', 'Заявок пока не было. Подай первую во вкладке «Заявка».')); return; }
    rd.textContent = ap + rj ? `Одобрено ${Math.round(ap / (ap + rj) * 100)}%` : 'Ждут решения';
    const bar = mk('div', 'srcbar');
    [[ap, 'var(--mint)'], [rj, XC], [rp, 'var(--star)']].forEach(([v, col]) => { if (!v) return; const s2 = mk('i'); s2.style.flex = String(v); s2.style.background = col; bar.appendChild(s2); });
    box.appendChild(bar);
    const list = mk('div', 'srclist');
    [['Одобрено', ap, 'var(--mint)'], ['Отклонено', rj, XC], ['На рассмотрении', rp, 'var(--star)']].filter(r => r[1]).forEach(([name, v, col]) => {
      const row = mk('div', 'srcrow'); const dotE = mk('i', 'lg-dot'); dotE.style.background = col;
      row.append(dotE, mk('span', '', name), mk('b', '', String(v)), mk('em', '', `${Math.round(v / tot * 100)}%`));
      list.appendChild(row);
    });
    box.appendChild(list);
  }

  function renderStats() {
    const PF = SNAP.pf || {};
    const TS = PF.ts || (DEMO ? demoSeries() : null);
    $('#st-wrap').hidden = !TS; $('#st-empty').hidden = !!TS;
    if (!TS) return;
    const N = Math.min(statPeriod, TS.rows.length), off = TS.rows.length - N, rows = TS.rows.slice(off);
    $$('#pseg button').forEach(b => b.classList.toggle('is-on', Number(b.dataset.p) === statPeriod));
    const inc = rows.reduce((a, r) => a + sumInc(r), 0), out = rows.reduce((a, r) => a + r[5], 0), net = inc - out;
    $('#st-in').textContent = '+' + fmt(inc); $('#st-out').textContent = '−' + fmt(out);
    const nb = $('#st-net'); nb.textContent = signed(net); nb.className = net > 0 ? 'plus' : net < 0 ? 'minus' : '';
    drawBalance(rows, TS.d0, off); drawBars(rows, TS.d0, off); drawSources(rows); drawActivity(TS); drawRequests(PF);
  }
  $('#pseg').addEventListener('click', e => {
    const b = e.target.closest('button[data-p]'); if (!b) return;
    statPeriod = Number(b.dataset.p); haptic('select'); renderStats();
  });

  /* ---------- Оформление: темы и переключатели ---------- */
  const themesBox = $('#themes');
  function renderThemes() {
    themesBox.textContent = '';
    THEMES.forEach(t => {
      const b = mk('button', 'theme' + (t.id === PREFS.theme ? ' is-on' : ''));
      b.type = 'button'; b.setAttribute('role', 'radio'); b.setAttribute('aria-checked', String(t.id === PREFS.theme));
      b.style.setProperty('--a', t.a); b.style.setProperty('--b', t.b);
      b.append(document.createElement('i'), mk('span', '', t.n));
      b.addEventListener('click', () => {
        if (PREFS.theme === t.id) return;
        applyTheme(t.id); savePrefs(); renderThemes(); haptic('select'); burstAt(b);
      });
      themesBox.appendChild(b);
    });
  }
  function bindSwitch(id, key, after) {
    const el = $(id);
    const sync = () => el.setAttribute('aria-checked', String(!!PREFS[key]));
    sync();
    el.addEventListener('click', () => {
      PREFS[key] = !PREFS[key]; sync(); savePrefs();
      if (key === 'haptic' && PREFS.haptic) haptic('medium');
      after && after();
    });
  }
  bindSwitch('#sw-haptic', 'haptic');
  bindSwitch('#sw-sky', 'sky', () => draw(0));

  $('#copy-id').addEventListener('click', () => {
    const id = $('#pf-id').textContent; if (!id) return;
    const ok = () => { toast('ID скопирован'); haptic('ok'); };
    try {
      if (navigator.clipboard && navigator.clipboard.writeText) { navigator.clipboard.writeText(id).then(ok, fallback); return; }
    } catch (_) {}
    fallback();
    function fallback() {
      try {
        const ta = document.createElement('textarea'); ta.value = id; ta.style.cssText = 'position:fixed;opacity:0';
        document.body.appendChild(ta); ta.select(); document.execCommand('copy'); ta.remove(); ok();
      } catch (_) { toast('Не удалось скопировать: ' + id); }
    }
  });

  // системная кнопка «назад» в Telegram
  try {
    tg && tg.BackButton && tg.BackButton.onClick(() => go(({ help: 'profile', achievements: 'profile', history: 'profile', mines: 'games', shop: 'games', upgrader: 'games', cases: 'games' })[S.screen] || 'home'));
  } catch (_) {}

  /* ---------- Старт ---------- */
  setStars(100);
  markPresets();
  renderBalance();
  renderGames();
  renderShop();
  renderUpgrader();
  syncMines();
  renderCases();
  renderFree();
  renderInv();
  bindAdmin();
  renderAdmin();
  renderAppeals();
  renderStatus();
  renderProfile();
  renderThemes();
  setMode('topup');
  setInterval(renderStatus, 30000);
})();
