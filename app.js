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

  /* ---------- Параметры от бота ---------- */
  const params = new URLSearchParams(location.search);
  const CFG = {
    nextAt: (Number(params.get('next')) || 0) * 1000,
    admin: params.get('admin') === '1',
    max: clamp(Number(params.get('max')) || 5000, 10, 100000),
    support: params.get('support') || 'https://staticgram.top/BotHelper',
    link: params.get('link') || '',
    src: params.get('src') || '',
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
  if (DEMO) SNAP = { b: 1250, dy: 'demo', bn: 640, cs: 3, iv: [[1, 0], [2, 4], [3, 6]], in: 3, p: [], c: { p: 0, d: 0, r: 0 } };

  // sendData работает только из кнопки клавиатуры. Из меню бота мини-апп открывается без неё.
  const inTg = !!(tg && tg.platform && tg.platform !== 'unknown');
  const hasQuery = !!(tg && tg.initDataUnsafe && tg.initDataUnsafe.query_id);
  const needKb = inTg && (CFG.src ? CFG.src !== 'kb' : hasQuery);

  const DESC_MIN = 20, DESC_MAX = 800, DON_MIN = 1, DON_MAX = 100000;
  const DON_PRESETS = [10, 50, 100, 250, 500, 1000];
  const STAR_CHIPS = [10, 50, 100, 500, 1000, 5000].filter(v => v <= CFG.max);

  const S = { screen: 'home', stars: 100, desc: '', donate: 50, custom: '', wmode: 'topup', wamt: '' };

  const haptic = (kind = 'light') => {
    try {
      const h = tg && tg.HapticFeedback;
      if (!h) return;
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
    for (const s of stars) {
      ctx.globalAlpha = reduce ? .6 : .35 + .55 * (.5 + .5 * Math.sin(t / 1000 * s.sp + s.ph));
      ctx.fillStyle = s.gold ? '#ffc94a' : '#dfe3ff';
      ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 6.283); ctx.fill();
    }
    for (const p of sparks) {
      ctx.globalAlpha = Math.max(0, p.life);
      ctx.fillStyle = '#ffc94a';
      ctx.beginPath(); ctx.arc(p.x, p.y, 2.4 * p.life + .6, 0, 6.283); ctx.fill();
      p.x += p.vx; p.y += p.vy; p.vy += .12; p.life -= .022;
    }
    sparks = sparks.filter(p => p.life > 0);
    ctx.globalAlpha = 1;
  }
  function loop(t) { if (!document.hidden) draw(t); requestAnimationFrame(loop); }
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

  /* ---------- Общее: приветствие, баланс, статус ---------- */
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  $('#hello').textContent = user && user.first_name ? `Привет, ${user.first_name}!` : 'Привет!';
  $$('[data-max]').forEach(e => { e.textContent = fmt(CFG.max); });

  const balance = () => Number(SNAP.b) || 0;
  const renderBalance = () => $$('[data-bal]').forEach(e => { e.textContent = fmt(balance()); });

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
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.go === name));
    updateCta();
    scrollTo(0, 0);
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
      const valid = () => !inp || sheetInput.value.trim().length >= (inp.min || 1);
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

  function send(payload) {
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

  $$('.open-kb').forEach(b => b.addEventListener('click', () => openBot('app')));
  $$('.need-kb').forEach(b => { b.hidden = !needKb; });

  cta.addEventListener('click', async () => {
    if (S.screen === 'request') {
      if (needKb) return send({ action: 'request' });
      if (!requestOk()) return;
      const text = S.desc.trim();
      if (await ask('Отправить заявку?', [['Сумма', `${fmt(S.stars)} ⭐`], ['Причина', text]], 'Отправить'))
        send({ action: 'request', stars: S.stars, description: text });
    } else if (S.screen === 'donate' && donateOk()) {
      const v = donateAmount();
      if (await ask('Поддержать проект?', [['Сумма', `${fmt(v)} ⭐`], ['Дальше', 'Бот пришлёт счёт на оплату']], 'Продолжить'))
        send({ action: 'donate', amount: v });
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
    rvClaim.onclick = () => send({ action: 'claim_bonus', day: SNAP.dy });
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
    rvClaim.onclick = () => send({ action: 'claim_case', day: SNAP.dy });
  }

  $('#bonus-btn').addEventListener('click', () => { haptic('medium'); playBonus(); });
  $('#case-btn').addEventListener('click', () => { haptic('medium'); playCase(); });

  /* ---------- Кошелёк ---------- */
  const wAmt = $('#w-amt'), wBtn = $('#w-btn'), wChips = $('#w-chips'), wLabel = $('#w-label');
  function setMode(mode) {
    S.wmode = mode === 'withdraw' ? 'withdraw' : 'topup';
    $$('#wseg button').forEach(b => b.classList.toggle('is-on', b.dataset.mode === S.wmode));
    wLabel.textContent = S.wmode === 'topup' ? 'Сумма пополнения' : 'Сумма вывода';
    $('#wallet-kb').hidden = !(needKb && S.wmode === 'withdraw');
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
    if (S.wmode === 'withdraw') {
      const b = document.createElement('button');
      b.type = 'button'; b.className = 'chip'; b.dataset.v = 'all'; b.textContent = 'Всё';
      wChips.appendChild(b);
    }
  }
  const wValue = () => Number(S.wamt) || 0;
  function wOk() {
    const v = wValue();
    return S.wmode === 'topup' ? v >= DON_MIN && v <= DON_MAX : v >= 1 && v <= balance();
  }
  function updateWallet() {
    const v = wValue();
    wBtn.textContent = S.wmode === 'topup' ? `Пополнить на ${fmt(v)} ⭐` : `Вывести ${fmt(v)} ⭐`;
    wBtn.disabled = !wOk();
  }
  $('#wseg').addEventListener('click', e => {
    const b = e.target.closest('button'); if (!b) return;
    setMode(b.dataset.mode); haptic('select');
  });
  wChips.addEventListener('click', e => {
    const c = e.target.closest('.chip'); if (!c) return;
    S.wamt = String(c.dataset.v === 'all' ? balance() : c.dataset.v);
    wAmt.value = S.wamt; updateWallet(); haptic(); burstAt(c);
  });
  wAmt.addEventListener('input', () => {
    wAmt.value = wAmt.value.replace(/\D/g, '').slice(0, 8);
    S.wamt = wAmt.value; updateWallet();
  });
  wBtn.addEventListener('click', async () => {
    if (!wOk()) return;
    const v = wValue();
    if (S.wmode === 'topup') {
      if (await ask('Пополнить баланс?', [['Сумма', `${fmt(v)} ⭐`], ['Дальше', 'Бот пришлёт счёт на оплату']], 'Продолжить'))
        send({ action: 'topup', amount: v });
    } else {
      if (await ask('Вывести звёзды?', [['Сумма', `${fmt(v)} ⭐`], ['Куда', 'На твой аккаунт']], 'Вывести'))
        send({ action: 'withdraw', amount: v });
    }
  });

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
    list.forEach(([id, i]) => {
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
          send({ action: 'sell', id });
      });
      card.append(ico, name, val, btn);
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
          send({ action: 'sell_all' });
      };
    } else {
      sellAll.hidden = true;
    }
  }

  /* ---------- Админ-меню ---------- */
  function renderAdmin() {
    if (!CFG.admin) { $('#admin').remove(); $('#admin-entry').remove(); return; }
    const c = SNAP.c || {};
    $('#st-p').textContent = fmt(c.p || 0);
    $('#st-d').textContent = fmt(c.d || 0);
    $('#st-r').textContent = fmt(c.r || 0);
    $('#admin-pending').textContent = fmt(c.p || 0);
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
          send({ action: 'admin_pay', id: a.i });
      });
      no.addEventListener('click', async () => {
        const reason = await ask('Отклонить заявку?', [['Заявка', `#${a.i} · ${a.n}`]], 'Отклонить',
          { input: { placeholder: 'Причина отказа: её увидит пользователь', min: 3, max: 300 } });
        if (reason) send({ action: 'admin_reject', id: a.i, reason });
      });
      btns.append(no, ok);
      card.append(head, p, btns);
      box.appendChild(card);
    });
    const note = $('#adm-note');
    note.hidden = !((c.p || 0) > list.length);
    note.textContent = `Показаны первые ${list.length} из ${c.p}. Остальные появятся после обработки, полный текст заявок есть в уведомлениях бота.`;

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
        send({ action: 'admin_withdraw', target, amount, rid });
      }
    });
  }

  /* ---------- Старт ---------- */
  setStars(100);
  markPresets();
  renderBalance();
  renderFree();
  renderInv();
  renderAdmin();
  renderStatus();
  setMode('topup');
  setInterval(renderStatus, 30000);
})();
