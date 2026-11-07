(() => {
  'use strict';

  const tg = window.Telegram && window.Telegram.WebApp;
  const $ = (s, r = document) => r.querySelector(s);
  const $$ = (s, r = document) => [...r.querySelectorAll(s)];
  const fmt = n => Number(n).toLocaleString('ru-RU');
  const clamp = (v, a, b) => Math.min(b, Math.max(a, v));

  // Параметры приходят из бота через адрес мини-апп
  const params = new URLSearchParams(location.search);
  const CFG = {
    nextAt: (Number(params.get('next')) || 0) * 1000,
    admin: params.get('admin') === '1',
    max: clamp(Number(params.get('max')) || 5000, 10, 100000),
    support: params.get('support') || 'https://staticgram.top/BotHelper',
    link: params.get('link') || '',
  };
  // Если мини-апп открыт НЕ кнопкой клавиатуры (меню бота, ссылка), sendData не работает:
  // тогда передаём действие боту через ссылку /start, а описание бот спросит в чате.
  const viaLink = !!(tg && tg.initData);
  const DESC_MIN = 10, DESC_MAX = 800, DON_MIN = 1, DON_MAX = 100000;
  const DON_PRESETS = [10, 50, 100, 250, 500, 1000];
  const STAR_CHIPS = [10, 50, 100, 500, 1000, 5000].filter(v => v <= CFG.max);

  const S = { screen: 'home', stars: 100, desc: '', donate: 50, custom: '' };

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
  const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;
  let W = 0, H = 0, dpr = 1, stars = [], sparks = [];

  function resize() {
    dpr = Math.min(devicePixelRatio || 1, 2);
    W = innerWidth; H = innerHeight;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    const n = Math.round(clamp(W * H / 9000, 40, 90));
    stars = Array.from({ length: n }, () => ({
      x: Math.random() * W, y: Math.random() * H,
      r: Math.random() * 1.4 + .3, ph: Math.random() * 6.28, sp: Math.random() * .8 + .3,
      gold: Math.random() < .14,
    }));
    if (reduce) draw(0);
  }

  function draw(t) {
    ctx.clearRect(0, 0, W, H);
    for (const s of stars) {
      const a = reduce ? .6 : .35 + .55 * (.5 + .5 * Math.sin(t / 1000 * s.sp + s.ph));
      ctx.globalAlpha = a;
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

  function loop(t) {
    if (!document.hidden) draw(t);
    requestAnimationFrame(loop);
  }

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

  /* ---------- Приветствие и статус ---------- */
  const user = tg && tg.initDataUnsafe && tg.initDataUnsafe.user;
  $('#hello').textContent = user && user.first_name ? `Привет, ${user.first_name}!` : 'Привет!';
  $$('[data-max]').forEach(e => { e.textContent = fmt(CFG.max); });

  const isLocked = () => !CFG.admin && CFG.nextAt > Date.now();

  function left(ms) {
    const m = Math.max(1, Math.ceil(ms / 60000));
    const d = Math.floor(m / 1440), h = Math.floor((m % 1440) / 60), mm = m % 60;
    if (d) return `${d} д ${h} ч`;
    if (h) return `${h} ч ${mm} мин`;
    return `${mm} мин`;
  }
  const dateStr = ms => new Date(ms).toLocaleString('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' });

  function renderStatus() {
    const box = $('#status'), lock = $('#lock');
    const locked = isLocked();
    box.className = 'status ' + (locked ? 'wait' : 'ok');
    box.textContent = locked
      ? `⏳ Следующая заявка через ${left(CFG.nextAt - Date.now())}`
      : '✅ Можно подавать заявку';
    if (CFG.admin) {
      const b = document.createElement('span');
      b.className = 'badge'; b.textContent = 'Админ: без лимита';
      box.appendChild(b);
    }
    lock.hidden = !locked;
    $('#lock-text').textContent = locked
      ? `Заявку можно подавать раз в неделю. Следующая будет доступна ${dateStr(CFG.nextAt)}.`
      : '';
    $('#form').disabled = locked;
    updateCta();
  }

  /* ---------- Сумма заявки ---------- */
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
  function markPresets() {
    $$('.preset', presetsBox).forEach(p => p.classList.toggle('is-on', !S.custom && Number(p.dataset.v) === S.donate));
  }
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
    (viaLink || (S.desc.trim().length >= DESC_MIN && S.desc.trim().length <= DESC_MAX));

  function updateCta() {
    if (S.screen === 'request') {
      actionbar.hidden = false;
      cta.textContent = viaLink ? `Продолжить с ${fmt(S.stars || 0)} ⭐` : `Отправить заявку на ${fmt(S.stars || 0)} ⭐`;
      cta.disabled = !requestOk();
    } else if (S.screen === 'donate') {
      actionbar.hidden = false;
      cta.textContent = `Поддержать на ${fmt(donateAmount() || 0)} ⭐`;
      cta.disabled = !donateOk();
    } else {
      actionbar.hidden = true;
    }
  }

  function go(name) {
    S.screen = name;
    $$('.screen').forEach(s => s.classList.toggle('is-active', s.id === name));
    $$('.tab').forEach(t => t.classList.toggle('is-active', t.dataset.go === name));
    updateCta();
    scrollTo(0, 0);
  }
  document.addEventListener('click', e => {
    const b = e.target.closest('[data-go]'); if (!b) return;
    go(b.dataset.go); haptic('select');
    if (b.classList.contains('big')) burstAt(b);
  });

  /* ---------- Подтверждение и отправка ---------- */
  const sheet = $('#sheet'), scrim = $('#scrim');
  function ask(title, rows, okText) {
    return new Promise(resolve => {
      $('#sheet-title').textContent = title;
      const dl = $('#sheet-rows'); dl.textContent = '';
      rows.forEach(([k, v]) => {
        const d = document.createElement('div');
        const dt = document.createElement('dt'); dt.textContent = k;
        const dd = document.createElement('dd'); dd.textContent = v;
        d.append(dt, dd); dl.appendChild(d);
      });
      $('#sheet-yes').textContent = okText;
      sheet.hidden = scrim.hidden = false;
      const done = r => {
        sheet.hidden = scrim.hidden = true;
        $('#sheet-yes').onclick = $('#sheet-no').onclick = scrim.onclick = null;
        resolve(r);
      };
      $('#sheet-yes').onclick = () => done(true);
      $('#sheet-no').onclick = scrim.onclick = () => done(false);
    });
  }

  let toastTimer;
  function toast(text) {
    const t = $('#toast'); t.textContent = text; t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(() => { t.hidden = true; }, 4200);
  }

  function openBot(p) {
    const code = p.action === 'donate' ? `d_${p.amount}` : `r_${p.stars}`;
    if (!CFG.link) { toast('Не задан адрес бота. Открой мини-апп командой /app в боте.'); haptic('err'); return; }
    const url = `${CFG.link}?start=${code}`;
    try {
      haptic('ok');
      if (tg.openTelegramLink && /^https:\/\/t\.me\//.test(url)) tg.openTelegramLink(url);
      else if (tg.openLink) tg.openLink(url);
      else window.open(url, '_blank');
      setTimeout(() => { try { tg.close(); } catch (_) {} }, 400);
    } catch (_) { toast('Не удалось открыть бота. Попробуй команду /app.'); haptic('err'); }
  }

  function send(payload) {
    if (viaLink) return openBot(payload);
    const data = JSON.stringify(payload);
    const inTelegram = tg && typeof tg.sendData === 'function' && tg.platform && tg.platform !== 'unknown';
    if (!inTelegram) {
      console.log('sendData:', data);
      toast('Открой мини-апп кнопкой «📱 Открыть мини-апп» в боте: только оттуда данные уходят боту.');
      haptic('err');
      return;
    }
    try { haptic('ok'); tg.sendData(data); }
    catch (e) { toast('Не удалось отправить. Открой мини-апп кнопкой из бота.'); haptic('err'); }
  }

  cta.addEventListener('click', async () => {
    if (S.screen === 'request' && requestOk()) {
      const text = S.desc.trim();
      const rows = viaLink
        ? [['Сумма', `${fmt(S.stars)} ⭐`], ['Дальше', 'Бот попросит описать заявку в чате']]
        : [['Сумма', `${fmt(S.stars)} ⭐`], ['Описание', text]];
      const ok = await ask(viaLink ? 'Продолжить в боте?' : 'Отправить заявку?', rows, viaLink ? 'Продолжить' : 'Отправить');
      if (ok) send({ action: 'request', stars: S.stars, description: text });
    } else if (S.screen === 'donate' && donateOk()) {
      const v = donateAmount();
      const ok = await ask('Поддержать проект?', [['Сумма', `${fmt(v)} ⭐`], ['Дальше', 'Бот пришлёт счёт на оплату']], 'Продолжить');
      if (ok) send({ action: 'donate', amount: v });
    }
  });

  $('#support-btn').addEventListener('click', () => {
    try {
      if (tg && tg.openTelegramLink && /^https:\/\/t\.me\//.test(CFG.support)) tg.openTelegramLink(CFG.support);
      else if (tg && tg.openLink) tg.openLink(CFG.support);
      else window.open(CFG.support, '_blank');
    } catch (_) { window.open(CFG.support, '_blank'); }
  });

  /* ---------- Старт ---------- */
  if (viaLink) $('#desc-field').hidden = true;
  setStars(100);
  markPresets();
  renderStatus();
  setInterval(renderStatus, 30000);
})();
