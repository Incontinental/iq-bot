/* IQ Panel — رابط کاربری | A3M TEAM × IQ */
(function () {
  'use strict';
  const E = window.IQE;
  const _W = window.Telegram && window.Telegram.WebApp;
  const tg = _W && _W.platform && _W.platform !== 'unknown' ? _W : null;   // فقط داخل تلگرام واقعی
  const DATA = window.IQ_DATA || { lessons: [], questions: [] };
  const $ = (s, r) => (r || document).querySelector(s);
  const $$ = (s, r) => Array.from((r || document).querySelectorAll(s));
  const fa = E.faDigits;
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  const LET = ['الف', 'ب', 'ج', 'د'];
  const AVATARS = ['🦊', '🐼', '🦉', '🐯', '🦁', '🐲', '🤖', '👾', '🚀', '🧙', '🦄', '🐺'];
  const app = $('#app'), navEl = $('#nav');

  /* ================= ذخیره‌سازی ================= */
  const KEY = 'iq_panel_v1';
  const blank = () => ({
    v: 1, profile: null, xp: 0, quizzes: 0, correct: 0, answered: 0, bestStreak: 0, perfect: 0, lessonsTried: [],
    iqBest: 0, iqDone: 0, iqLast: null, badges: [], streakDays: 0, lastDay: '', unsynced: 0, hist: [], sound: true, updated: 0
  });
  let S = blank();
  const cloud = tg && tg.CloudStorage && tg.isVersionAtLeast && tg.isVersionAtLeast('6.9') ? tg.CloudStorage : null;
  let cloudT = null;
  function save() {
    S.updated = Date.now();
    try { localStorage.setItem(KEY, JSON.stringify(S)); } catch (e) { }
    if (!cloud) return;
    clearTimeout(cloudT);
    cloudT = setTimeout(() => {
      const c = Object.assign({}, S, { hist: S.hist.slice(-6) });
      let j = JSON.stringify(c);
      if (j.length > 4000) { c.hist = []; j = JSON.stringify(c); }
      if (j.length <= 4096) { try { cloud.setItem('st', j, () => { }); } catch (e) { } }
    }, 700);
  }
  function cloudLoad() {
    return new Promise(res => {
      if (!cloud) return res(null);
      let done = false;
      const t = setTimeout(() => { if (!done) { done = true; res(null); } }, 1500);
      try {
        cloud.getItem('st', (err, v) => {
          if (done) return; done = true; clearTimeout(t);
          try { res(v ? JSON.parse(v) : null); } catch (e) { res(null); }
        });
      } catch (e) { res(null); }
    });
  }
  async function loadState() {
    try { const r = localStorage.getItem(KEY); if (r) S = Object.assign(blank(), JSON.parse(r)); } catch (e) { }
    const c = await cloudLoad();
    if (c && (c.updated || 0) > (S.updated || 0)) S = Object.assign(blank(), c);
  }

  /* ================= ابزارهای رابط ================= */
  const hap = (t) => { try { if (!tg || !tg.HapticFeedback) return; if (t === 'ok' || t === 'bad' || t === 'warn') tg.HapticFeedback.notificationOccurred({ ok: 'success', bad: 'error', warn: 'warning' }[t]); else tg.HapticFeedback.impactOccurred(t || 'light'); } catch (e) { } };
  let actx = null;
  function beep(f, d, type) {
    if (!S.sound) return;
    try {
      actx = actx || new (window.AudioContext || window.webkitAudioContext)();
      const o = actx.createOscillator(), g = actx.createGain();
      o.type = type || 'sine'; o.frequency.value = f; g.gain.value = .06;
      o.connect(g); g.connect(actx.destination); o.start(); g.gain.exponentialRampToValueAtTime(.0001, actx.currentTime + d); o.stop(actx.currentTime + d);
    } catch (e) { }
  }
  const sfx = { ok: () => { beep(660, .12); setTimeout(() => beep(880, .16), 90); }, bad: () => beep(180, .3, 'sawtooth'), click: () => beep(520, .05), win: () => [523, 659, 784, 1047].forEach((f, i) => setTimeout(() => beep(f, .18), i * 110)) };
  function toast(msg) {
    const t = document.createElement('div'); t.className = 'toast'; t.textContent = msg;
    $('#toasts').appendChild(t); setTimeout(() => t.remove(), 3100);
  }
  function floatText(txt, el, cls) {
    const r = el ? el.getBoundingClientRect() : { left: innerWidth / 2, top: innerHeight / 2, width: 0 };
    const d = document.createElement('div'); d.className = cls || 'xpop'; d.textContent = txt;
    d.style.left = (r.left + r.width / 2 - 20) + 'px'; d.style.top = (r.top - 6) + 'px';
    document.body.appendChild(d); setTimeout(() => d.remove(), 1300);
  }
  function confetti() {
    const c = document.createElement('canvas'); c.id = 'cf'; c.width = innerWidth; c.height = innerHeight;
    const x = c.getContext && c.getContext('2d'); if (!x) return; document.body.appendChild(c);
    const  cols = ['#8b5cf6', '#22d3ee', '#f472b6', '#fbbf24', '#34d399'];
    const P = Array.from({ length: 140 }, () => ({ x: Math.random() * c.width, y: -20 - Math.random() * c.height * .5, r: 4 + Math.random() * 6, v: 2 + Math.random() * 4, s: Math.random() * 2 - 1, c: cols[Math.random() * 5 | 0], a: Math.random() * 6 }));
    let f = 0;
    (function tick() {
      x.clearRect(0, 0, c.width, c.height);
      P.forEach(p => { p.y += p.v; p.x += p.s * 2 + Math.sin(p.a += .08); x.fillStyle = p.c; x.fillRect(p.x, p.y, p.r, p.r * 1.6); });
      if (++f < 190) requestAnimationFrame(tick); else c.remove();
    })();
  }
  const lvInfo = () => E.levelProgress(S.xp);

  /* ================= امتیاز / سطح / نشان ================= */
  function addXP(n) {
    const before = E.levelOf(S.xp);
    S.xp += n;
    const after = E.levelOf(S.xp);
    return after > before ? after : 0;
  }
  function checkBadges() {
    const nb = E.newBadges(Object.assign({}, S, { level: E.levelOf(S.xp) }));
    nb.forEach(b => S.badges.push(b.id));
    return nb;
  }
  const dKey = d => d.getFullYear() + '-' + (d.getMonth() + 1) + '-' + d.getDate();
  function touchDay() {
    const now = new Date(), t = dKey(now), y = dKey(new Date(now.getTime() - 864e5));
    if (S.lastDay === t) return 0;
    S.streakDays = S.lastDay === y ? S.streakDays + 1 : 1; S.lastDay = t;
    const b = 5 * Math.min(S.streakDays, 7); addXP(b); return b;
  }

  /* ================= مسیریابی ================= */
  let view = { name: 'splash', p: {} }, stack = [];
  const TABS = [['home', '🏠', 'خانه'], ['qsetup', '⚡', 'کوییز'], ['iqintro', '🧠', 'تست هوش'], ['awards', '🏆', 'دستاوردها'], ['me', '👤', 'من']];
  const TAB_OF = { home: 'home', qsetup: 'qsetup', iqintro: 'iqintro', awards: 'awards', me: 'me', about: 'me', result: 'qsetup', iqresult: 'iqintro' };
  let timer = null;
  function stopTimer() { if (timer) { clearInterval(timer); timer = null; } }
  function go(name, p, push) {
    stopTimer();
    if (push !== false && (name === 'about' || name === 'register')) stack.push(view);
    view = { name, p: p || {} };
    render(); scrollTo(0, 0); updBack();
  }
  function tab(name) { stack = []; go(name, {}, false); }
  function back() {
    if (view.name === 'quiz' || view.name === 'iq') {
      const m = 'آزمون نیمه‌کاره می‌ماند و نتیجه‌ای ثبت نمی‌شود. خارج می‌شوی؟';
      const out = () => { stopTimer(); Q = null; tab(view.name === 'quiz' ? 'qsetup' : 'iqintro'); };
      if (tg && tg.showConfirm) tg.showConfirm(m, ok => ok && out()); else if (confirm(m)) out();
      return;
    }
    const prev = stack.pop();
    if (prev) { view = prev; render(); } else if (view.name !== 'home') tab('home');
    updBack();
  }
  function updBack() {
    if (!tg || !tg.BackButton) return;
    const need = !TABS.some(t => t[0] === view.name) || ['quiz', 'iq'].includes(view.name);
    need ? tg.BackButton.show() : tg.BackButton.hide();
  }
  function navHTML() {
    const cur = TAB_OF[view.name];
    return '<div>' + TABS.map(t => `<button data-a="tab" data-t="${t[0]}" class="${cur === t[0] ? 'on' : ''}"><span>${t[1]}</span>${t[2]}</button>`).join('') + '</div>';
  }
  function render() {
    const V = views[view.name]; if (!V) return;
    app.innerHTML = '<div class="view">' + V(view.p) + '</div>';
    const showNav = !!TAB_OF[view.name] && !['quiz', 'iq', 'register', 'splash'].includes(view.name);
    navEl.className = showNav ? '' : 'hide'; navEl.innerHTML = showNav ? navHTML() : '';
    if (V.after) V.after(view.p);
  }

  /* ================= قطعه‌های مشترک ================= */
  const foot = () => '<div class="foot">ساخته‌شده توسط <b>IQ</b> · <b>A3M</b> TEAM</div>';
  function logoSVG() {
    return '<div class="logo"><div class="ring-spin"></div><svg viewBox="0 0 150 150"><polygon class="hex2" points="75,13 128.7,44 128.7,106 75,137 21.3,106 21.3,44"/><polygon class="hex" points="75,13 128.7,44 128.7,106 75,137 21.3,106 21.3,44" style="animation:none;stroke-dashoffset:0"/><text x="75" y="91" text-anchor="middle">IQ</text></svg></div>';
  }
  function profileHead() {
    const p = S.profile || { n: 'مهمان', a: '🦊' }, L = lvInfo();
    return `<div class="card glow"><div class="hero"><div class="avatar">${p.a}</div><div style="flex:1;min-width:0">
      <h2 style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(p.n)}</h2>
      <div class="row" style="margin:6px 0 9px;gap:6px;flex-wrap:wrap"><span class="chip v">سطح ${fa(L.level)} · ${L.title}</span><span class="chip g">⭐ ${fa(S.xp)} XP</span>${S.streakDays ? `<span class="chip">🔥 ${fa(S.streakDays)} روز</span>` : ''}</div>
      <div class="bar"><i style="width:${L.pct}%"></i></div><div class="mut" style="font-size:11px;margin-top:5px">${fa(L.need)} امتیاز تا سطح بعد</div></div></div></div>`;
  }

  /* ================= صفحه‌ها ================= */
  const views = {};
  views.splash = () => '';
  /* ---- ثبت‌نام ---- */
  const reg = { a: '🦊', e: 'یازدهم', g: '', ok: false };
  views.register = () => `
    <div class="team" style="margin-top:8px">${logoSVG()}<div class="brand"><b>A3M</b> TEAM × IQ</div></div>
    <div class="card"><h2>به پنل IQ خوش آمدی 👋</h2><p class="mut">چند ثانیه برای ساخت پروفایل. با ثبت‌نام، امتیازها و دستاوردهایت ذخیره می‌شود و می‌توانی در جدول برترین‌های ربات حضور داشته باشی.</p></div>
    <div class="card">
      <div class="field"><label>آواتار</label><div class="avs">${AVATARS.map(a => `<button data-a="rav" data-v="${a}" class="${reg.a === a ? 'on' : ''}">${a}</button>`).join('')}</div></div>
      <div class="field"><label>نام نمایشی</label><input id="rn" class="input" maxlength="24" placeholder="مثلاً: علی" value="${esc(((tg && tg.initDataUnsafe && tg.initDataUnsafe.user && tg.initDataUnsafe.user.first_name) || ''))}"><div class="errmsg" id="e-n"></div></div>
      <div class="field"><label>پایه / وضعیت تحصیلی</label><div class="seg" data-g="e">${['دهم', 'یازدهم', 'دوازدهم', 'فارغ‌التحصیل'].map(x => `<button data-a="rseg" data-k="e" data-v="${x}" class="${reg.e === x ? 'on' : ''}">${x}</button>`).join('')}</div></div>
      <div class="field"><label>جنسیت <span class="mut">(برای پیشنهاد دانشکده‌ها)</span></label><div class="seg">${[['d', 'دختر'], ['p', 'پسر'], ['', 'ترجیح می‌دهم نگویم']].map(x => `<button data-a="rseg" data-k="g" data-v="${x[0]}" class="${reg.g === x[0] ? 'on' : ''}">${x[1]}</button>`).join('')}</div></div>
      <div class="field"><label>شهر <span class="mut">(اختیاری)</span></label><input id="rc" class="input" maxlength="20" placeholder="مثلاً: شیراز"></div>
      <div class="field"><div class="chk ${reg.ok ? 'on' : ''}" data-a="rok"><i>${reg.ok ? '✓' : ''}</i><div>موافقم نام نمایشی و امتیازهایم در ربات ذخیره و در جدول برترین‌ها نمایش داده شود.</div></div><div class="errmsg" id="e-c"></div></div>
      <button class="btn pulse" data-a="rsubmit">🚀 شروع کنیم</button>
    </div>${foot()}`;

  /* ---- خانه ---- */
  views.home = () => `
    <div class="row" style="margin-bottom:12px"><div class="brand" style="animation:none;font-size:13px"><b>A3M</b> TEAM · IQ</div><div class="sp"></div><span class="chip">${DATA.questions.length ? fa(DATA.questions.length) + ' سؤال' : 'بدون سؤال'}</span></div>
    ${profileHead()}
    ${S.unsynced > 0 ? `<div class="card" style="border-color:rgba(244,114,182,.5)"><div class="row"><div style="font-size:26px">📡</div><div style="flex:1"><h3>نتیجه‌ی جدید ثبت‌نشده</h3><div class="mut" style="font-size:12px">برای حضور در جدول برترین‌های ربات، ثبت کن.</div></div><button class="btn sm pink" data-a="sync">ثبت</button></div></div>` : ''}
    <div class="grid2">
      <div class="act a1" data-a="quick"><div class="ic">⚡</div><div><h3>کوییز سریع</h3><p>۱۰ سؤال ترکیبی</p></div></div>
      <div class="act a2" data-a="tab" data-t="iqintro"><div class="ic">🧠</div><div><h3>تست هوش</h3><p>۲۰ سؤال بسیار سخت</p></div></div>
      <div class="act a3" data-a="tab" data-t="qsetup"><div class="ic">📚</div><div><h3>کوییز درس‌ها</h3><p>انتخاب درس و تعداد</p></div></div>
      <div class="act a4" data-a="tab" data-t="awards"><div class="ic">🏆</div><div><h3>دستاوردها</h3><p>${fa(S.badges.length)} از ${fa(E.BADGES.length)} نشان</p></div></div>
    </div>
    <div class="grid3" style="margin-top:14px">
      <div class="card tile"><b class="grad-t">${S.answered ? fa(Math.round(S.correct * 100 / S.answered)) + '٪' : '—'}</b><span>دقت پاسخ‌ها</span></div>
      <div class="card tile"><b class="grad-t">${fa(S.quizzes)}</b><span>کوییز کامل</span></div>
      <div class="card tile"><b class="grad-t">${S.iqBest ? fa(S.iqBest) : '—'}</b><span>بهترین شاخص هوش</span></div>
    </div>${foot()}`;
  views.home.after = () => { $$('.bar>i').forEach(i => { const w = i.style.width; i.style.width = '0'; requestAnimationFrame(() => requestAnimationFrame(() => i.style.width = w)); }); };

  /* ---- راه‌اندازی کوییز ---- */
  const ui = { lesson: 'all', n: 10, timed: true };
  const lessonCount = id => DATA.questions.filter(q => id === 'all' || q.lesson === id).length;
  views.qsetup = () => {
    if (!DATA.questions.length) return `<div class="card empty">📭<br>هنوز سؤالی برای پنل بارگذاری نشده.<br><span class="mut">مدیر ربات باید فایل questions.js را از ربات بگیرد و روی هاست آپلود کند.</span></div>`;
    const ls = [{ id: 'all', name: '🎲 ترکیبی' }].concat(DATA.lessons.filter(l => lessonCount(l.id)));
    const max = lessonCount(ui.lesson); if (ui.n > max) ui.n = Math.max(1, max);
    return `<div class="card"><h2>⚡ کوییز</h2><p class="mut">درس و حالت را انتخاب کن. پاسخ درست ۱۰ امتیاز + پاداش سرعت و زنجیره دارد.</p></div>
    <div class="card"><h3 style="margin-bottom:12px">درس</h3><div class="lessonchips">${ls.map(l => `<button data-a="ql" data-v="${l.id}" class="${ui.lesson === l.id ? 'on' : ''}">${esc(l.name)} <small style="opacity:.7">${fa(lessonCount(l.id))}</small></button>`).join('')}</div></div>
    <div class="card"><h3 style="margin-bottom:12px">تعداد سؤال</h3><div class="seg">${[5, 10, 15].map(n => `<button data-a="qn" data-v="${n}" class="${ui.n === n ? 'on' : ''}" ${n > max ? 'disabled style="opacity:.35"' : ''}>${fa(n)}</button>`).join('')}</div>
    <h3 style="margin:16px 0 12px">حالت</h3><div class="seg"><button data-a="qm" data-v="0" class="${!ui.timed ? 'on' : ''}">😌 آرام</button><button data-a="qm" data-v="1" class="${ui.timed ? 'on' : ''}">⏱ زمان‌دار (۳۰ ثانیه)</button></div></div>
    <button class="btn" data-a="qstart">🚀 شروع کوییز</button>`;
  };

  /* ---- کوییز ---- */
  let Q = null;
  function startQuiz(lesson, n, timed) {
    const pool = E.shuffle(DATA.questions.filter(q => lesson === 'all' || q.lesson === lesson));
    const qs = pool.slice(0, Math.min(n, pool.length)).map(q => { const idx = E.shuffle([0, 1, 2, 3]); return { src: q, order: idx, correct: idx.indexOf(q.answer) }; });
    Q = { qs, i: 0, score: 0, streak: 0, best: 0, xp: 0, timed, lesson, log: [], locked: false, t0: 0, T: 30, parts: { base: 0, speed: 0, combo: 0 } };
    go('quiz', {}, false);
  }
  const lessonName = id => (DATA.lessons.find(l => l.id === id) || {}).name || '';
  views.quiz = () => {
    const q = Q.qs[Q.i], n = Q.qs.length;
    return `<div class="qtop"><div class="qprog"><small><span>سؤال ${fa(Q.i + 1)} از ${fa(n)}</span><span>🔥 ${fa(Q.streak)} · ⭐ ${fa(Q.xp)}</span></small><div class="bar"><i style="width:${Q.i / n * 100}%"></i></div></div>
      ${Q.timed ? '<div class="timer" id="tm"><svg viewBox="0 0 54 54"><circle class="bgc" cx="27" cy="27" r="22"/><circle class="fgc" id="tf" cx="27" cy="27" r="22" stroke-dasharray="138.2" stroke-dashoffset="0"/></svg><b id="tt">30</b></div>' : ''}</div>
      <div class="card qcard"><div><span class="cat">${esc(lessonName(q.src.lesson) || 'عمومی')}</span><div>${esc(q.src.q)}</div></div></div>
      <div class="opts" id="opts">${q.order.map((j, k) => `<button class="opt" style="animation-delay:${k * 70}ms" data-a="ans" data-k="${k}"><span class="lt">${LET[k]}</span><span class="tx">${esc(q.src.options[j])}</span></button>`).join('')}</div><div id="fb"></div>`;
  };
  views.quiz.after = () => {
    Q.locked = false; Q.t0 = Date.now();
    if (Q.timed) {
      let left = Q.T; const f = $('#tf'), t = $('#tt'), tm = $('#tm');
      timer = setInterval(() => {
        const el = (Date.now() - Q.t0) / 1000; left = Math.max(0, Q.T - el);
        f.style.strokeDashoffset = (138.2 * (1 - left / Q.T)).toFixed(1); t.textContent = fa(Math.ceil(left));
        tm.classList.toggle('low', left <= 8);
        if (left <= 0) { stopTimer(); answer(-1); }
      }, 100);
    }
  };
  function answer(k, el) {
    if (!Q || Q.locked) return; Q.locked = true; stopTimer();
    const q = Q.qs[Q.i], ok = k === q.correct, ratio = Q.timed ? Math.max(0, 1 - (Date.now() - Q.t0) / 1000 / Q.T) : 0;
    $('#opts').classList.add('lock');
    $$('.opt').forEach((b, i) => { if (i === q.correct) b.classList.add('ok'); else if (i === k) b.classList.add('bad'); else b.classList.add('dim'); });
    let gain = 0;
    if (ok) {
      Q.score++; Q.streak++; Q.best = Math.max(Q.best, Q.streak);
      const x = E.answerXP({ timed: Q.timed, timeLeftRatio: ratio, streak: Q.streak });
      gain = x.total; Q.xp += gain; Q.parts.base += x.base; Q.parts.speed += x.speed; Q.parts.combo += x.combo;
      hap('ok'); sfx.ok(); floatText('+' + fa(gain), el);
      if (Q.streak >= 3) { const c = document.createElement('div'); c.className = 'combo'; c.textContent = '🔥 ' + fa(Q.streak) + ' پشت‌سرهم!'; document.body.appendChild(c); setTimeout(() => c.remove(), 1400); }
    } else { Q.streak = 0; hap('bad'); sfx.bad(); }
    Q.log.push({ q: q.src.q, ok, right: q.src.options[q.src.answer], lesson: q.src.lesson });
    const last = Q.i + 1 >= Q.qs.length;
    $('#fb').innerHTML = (q.src.explain ? `<div class="explain">💡 ${esc(q.src.explain)}</div>` : '') + `<button class="btn" style="margin-top:14px" data-a="qnext">${last ? '🏁 دیدن نتیجه' : 'سؤال بعدی ←'}</button>`;
    const nb = $('#fb .btn'); if (nb && nb.scrollIntoView) nb.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
  function nextQ() { if (Q.i + 1 >= Q.qs.length) return finishQuiz(); Q.i++; render(); }
  function finishQuiz() {
    const n = Q.qs.length, sc = Q.score, pct = Math.round(sc * 100 / n);
    const perfect = sc === n && n >= 5, comp = 10, pb = perfect ? 30 : 0, total = Q.xp + comp + pb;
    const lvBefore = E.levelOf(S.xp);
    const lv = addXP(total);
    S.quizzes++; S.correct += sc; S.answered += n; S.bestStreak = Math.max(S.bestStreak, Q.best); if (perfect) S.perfect++;
    if (Q.lesson !== 'all' && !S.lessonsTried.includes(Q.lesson)) S.lessonsTried.push(Q.lesson);
    else Q.log.forEach(l => { if (l.lesson && !S.lessonsTried.includes(l.lesson)) S.lessonsTried.push(l.lesson); });
    S.unsynced++; S.hist.push({ t: Date.now(), k: 'q', s: sc, n, x: total });
    const nb = checkBadges(); save();
    const res = { n, sc, pct, total, perfect, comp, pb, parts: Q.parts, lv, nb, log: Q.log, from: lvBefore };
    Q = null; go('result', res, false);
  }
  views.result = r => {
    const mistakes = r.log.filter(l => !l.ok);
    return `${r.lv ? `<div class="lvlup">🎉 ارتقا به سطح ${fa(r.lv)} — ${E.titleOf(r.lv)}</div>` : ''}
    <div class="card" style="text-align:center"><div class="scorering"><svg viewBox="0 0 180 180"><circle class="bgc" cx="90" cy="90" r="80"/><circle class="fgc" id="sring" cx="90" cy="90" r="80"/></svg><div><div><b class="grad-t">${fa(r.sc)}<small style="font-size:20px">/${fa(r.n)}</small></b><br><span>${fa(r.pct)}٪ پاسخ درست</span></div></div></div>
      <h2>${r.pct >= 80 ? 'عالی بود! 🌟' : r.pct >= 50 ? 'خوب بود، ادامه بده 💪' : 'نگران نباش، مرور کن 📚'}</h2></div>
    <div class="card"><h3 style="margin-bottom:6px">⭐ امتیاز این دور: ${fa(r.total)}</h3>
      <div class="xpline"><span>پاسخ‌های درست</span><b>${fa(r.parts.base)}</b></div>
      ${r.parts.speed ? `<div class="xpline"><span>پاداش سرعت ⚡</span><b>${fa(r.parts.speed)}</b></div>` : ''}
      ${r.parts.combo ? `<div class="xpline"><span>پاداش زنجیره 🔥</span><b>${fa(r.parts.combo)}</b></div>` : ''}
      <div class="xpline"><span>تکمیل کوییز</span><b>${fa(r.comp)}</b></div>
      ${r.pb ? `<div class="xpline"><span>بی‌نقص 🏅</span><b>${fa(r.pb)}</b></div>` : ''}</div>
    ${r.nb.length ? `<div class="card glow"><h3>🎖 نشان جدید!</h3>${r.nb.map(b => `<div class="row" style="margin-top:10px"><div style="font-size:30px">${b.ic}</div><div><b>${b.name}</b><div class="mut" style="font-size:12px">${b.desc}</div></div></div>`).join('')}</div>` : ''}
    ${mistakes.length ? `<h3 style="margin:16px 4px 10px">📝 مرور اشتباه‌ها</h3>${mistakes.map(m => `<div class="rev"><div class="q">${esc(m.q)}</div><div class="a ok">✓ پاسخ درست: ${esc(m.right)}</div></div>`).join('')}` : ''}
    <div class="grid2" style="margin-top:14px"><button class="btn" data-a="qsync">📤 ثبت در جدول</button><button class="btn ghost" data-a="tab" data-t="qsetup">🔁 دوباره</button></div>
    <button class="btn ghost" style="margin-top:10px" data-a="tab" data-t="home">🏠 خانه</button>`;
  };
  views.result.after = r => {
    setTimeout(() => { const c = $('#sring'); if (c) c.style.strokeDashoffset = 502 * (1 - r.pct / 100); }, 80);
    if (r.pct >= 70 || r.lv) { confetti(); sfx.win(); hap('ok'); }
  };

  /* ---- تست هوش ---- */
  views.iqintro = () => `<div class="card glow" style="text-align:center"><div class="brain">🧠</div><h2 style="margin:8px 0 4px">تست هوش <span class="grad-t">IQ × A3M</span></h2>
    <p class="mut">۲۰ سؤال بسیار سخت: دنباله‌های عددی، استدلال منطقی و معماهای ماتریسی تصویری.</p>
    <ul class="rules" style="text-align:right"><li>⏱ هر سؤال ۹۰ ثانیه (معماهای تصویری ۱۲۰ ثانیه)</li><li>🙈 در طول آزمون جواب درست نشان داده نمی‌شود؛ در پایان تحلیل کامل می‌بینی.</li><li>🎯 سؤال‌ها از آسان به سخت چیده شده‌اند.</li><li>🔁 هر بار با ترتیب و معماهای تازه ساخته می‌شود.</li></ul>
    <div class="disc">⚠️ این آزمون برای سرگرمی و تمرین استدلال است و «شاخص هوش نمایشی» جایگزین آزمون‌های معتبر روان‌سنجی نیست.</div></div>
    ${S.iqLast ? `<div class="card"><div class="row"><div style="font-size:28px">📈</div><div style="flex:1"><h3>آخرین نتیجه: ${fa(S.iqLast.iq)}</h3><div class="mut" style="font-size:12px">بهترین: ${fa(S.iqBest)} · ${fa(S.iqDone)} بار</div></div></div></div>` : ''}
    <button class="btn pulse" data-a="iqstart">🚀 شروع تست هوش</button>`;

  let IQ = null;
  function cellSVG(c) {
    const n = c.count + 1;
    const pos = n === 1 ? [[50, 50]] : n === 2 ? [[29, 50], [71, 50]] : [[50, 27], [27, 69], [73, 69]];
    const r = n === 1 ? 26 : n === 2 ? 19 : 15.5;
    const fill = c.fill === 0 ? 'none' : c.fill === 1 ? 'url(#stripe)' : '#8b5cf6';
    const st = 'stroke="#c4b5fd" stroke-width="3.5" stroke-linejoin="round"';
    const sh = pos.map(([x, y]) => c.shape === 0 ? `<circle cx="${x}" cy="${y}" r="${r}" fill="${fill}" ${st}/>`
      : c.shape === 1 ? `<rect x="${x - r}" y="${y - r}" width="${2 * r}" height="${2 * r}" rx="4" fill="${fill}" ${st}/>`
        : `<polygon points="${x},${y - r * 1.12} ${x - r * 1.08},${y + r * .86} ${x + r * 1.08},${y + r * .86}" fill="${fill}" ${st}/>`).join('');
    return `<svg viewBox="0 0 100 100" aria-hidden="true">${sh}</svg>`;
  }
  function startIQ() { IQ = { qs: E.buildIQTest(), i: 0, res: [], sel: -1, locked: false, t0: 0 }; go('iq', {}, false); }
  const CATN = { num: 'دنباله‌ی عددی', logic: 'استدلال منطقی', visual: 'معمای تصویری' };
  views.iq = () => {
    const q = IQ.qs[IQ.i], n = IQ.qs.length, T = E.IQ_TIME[q.kind];
    let body;
    if (q.kind === 'matrix') {
      body = `<div class="card" style="padding:14px"><div class="mx">${q.cells.map(c => `<div class="c">${cellSVG(c)}</div>`).join('')}<div class="c q">؟</div></div>
        <div class="mut" style="text-align:center;margin-bottom:10px">کدام گزینه جای «؟» می‌نشیند؟</div>
        <div class="mo">${q.options.map((c, k) => `<button data-a="iqsel" data-k="${k}" style="animation-delay:${k * 50}ms"><em>${k + 1}</em>${cellSVG(c)}</button>`).join('')}</div></div>`;
    } else {
      body = `<div class="card qcard"><div><span class="cat">${CATN[q.cat]}</span><div>${q.q}</div></div></div>
        <div class="opts">${q.options.map((o, k) => `<button class="opt" style="animation-delay:${k * 70}ms" data-a="iqsel" data-k="${k}"><span class="lt">${LET[k]}</span><span class="tx">${o}</span></button>`).join('')}</div>`;
    }
    return `<div class="qtop"><div class="qprog"><small><span>سؤال ${fa(IQ.i + 1)} از ${fa(n)}</span><span>${'⭐'.repeat(q.d)}</span></small><div class="bar"><i style="width:${IQ.i / n * 100}%"></i></div></div>
      <div class="timer" id="tm"><svg viewBox="0 0 54 54"><circle class="bgc" cx="27" cy="27" r="22"/><circle class="fgc" id="tf" cx="27" cy="27" r="22" stroke-dasharray="138.2" stroke-dashoffset="0"/></svg><b id="tt">${fa(T)}</b></div></div>
      ${body}<button class="btn" id="iqok" style="margin-top:14px" data-a="iqconfirm" disabled>ثبت پاسخ ✓</button>`;
  };
  views.iq.after = () => {
    IQ.sel = -1; IQ.locked = false; IQ.t0 = Date.now();
    const q = IQ.qs[IQ.i], T = E.IQ_TIME[q.kind], f = $('#tf'), t = $('#tt'), tm = $('#tm');
    timer = setInterval(() => {
      const left = Math.max(0, T - (Date.now() - IQ.t0) / 1000);
      f.style.strokeDashoffset = (138.2 * (1 - left / T)).toFixed(1); t.textContent = fa(Math.ceil(left)); tm.classList.toggle('low', left <= 15);
      if (left <= 0) { stopTimer(); iqCommit(true); }
    }, 200);
  };
  function iqCommit(timeout) {
    if (!IQ || IQ.locked) return; IQ.locked = true; stopTimer();
    const q = IQ.qs[IQ.i], T = E.IQ_TIME[q.kind], ok = !timeout && IQ.sel === q.answerIdx;
    IQ.res.push({ cat: q.cat, d: q.d, ok, ratio: ok ? Math.max(0, 1 - (Date.now() - IQ.t0) / 1000 / T) : 0, sel: timeout ? -1 : IQ.sel, q });
    hap('light');
    if (IQ.i + 1 >= IQ.qs.length) return finishIQ();
    IQ.i++; render();
  }
  function finishIQ() {
    const r = E.scoreIQ(IQ.res), lvBefore = E.levelOf(S.xp);
    const xp = 50 + 8 * r.correct, lv = addXP(xp);
    S.iqDone++; S.iqBest = Math.max(S.iqBest, r.iq); S.iqLast = { iq: r.iq, t: Date.now() }; S.unsynced++;
    S.hist.push({ t: Date.now(), k: 'iq', s: r.iq, n: r.total, x: xp });
    const nb = checkBadges(); save();
    const out = { r, xp, lv, nb, res: IQ.res.map(x => ({ ok: x.ok, sel: x.sel, q: x.q })) };
    IQ = null; go('iqresult', out, false);
  }
  function gaugeSVG(iq) {
    const p = (iq - 70) / 80, a = Math.PI * (1 - p), cx = 120, cy = 120, R = 95;
    const x = cx + R * Math.cos(a), y = cy - R * Math.sin(a);
    return `<svg class="gauge" viewBox="0 0 240 135"><defs><linearGradient id="gg" x1="0" x2="1"><stop offset="0" stop-color="#fb7185"/><stop offset=".5" stop-color="#fbbf24"/><stop offset="1" stop-color="#34d399"/></linearGradient></defs>
      <path d="M25 120 A95 95 0 0 1 215 120" fill="none" stroke="rgba(255,255,255,.1)" stroke-width="16" stroke-linecap="round"/>
      <path d="M25 120 A95 95 0 0 1 215 120" fill="none" stroke="url(#gg)" stroke-width="16" stroke-linecap="round" stroke-dasharray="298" stroke-dashoffset="${(298 * (1 - p)).toFixed(1)}" style="transition:stroke-dashoffset 1.6s cubic-bezier(.2,.8,.2,1)"/>
      <circle cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" r="9" fill="#fff" stroke="#8b5cf6" stroke-width="4"/></svg>`;
  }
  function radarSVG(c) {
    const pts = [['num', -90], ['logic', 30], ['visual', 150]].map(([k, deg]) => { const a = deg * Math.PI / 180, r = 12 + c[k] * .68; return [(100 + r * Math.cos(a)).toFixed(1), (100 + r * Math.sin(a)).toFixed(1)]; });
    const ring = f => [-90, 30, 150].map(d => `${(100 + 80 * f * Math.cos(d * Math.PI / 180)).toFixed(1)},${(100 + 80 * f * Math.sin(d * Math.PI / 180)).toFixed(1)}`).join(' ');
    return `<svg class="radar" viewBox="0 0 200 200"><polygon points="${ring(1)}" fill="none" stroke="rgba(255,255,255,.14)"/><polygon points="${ring(.66)}" fill="none" stroke="rgba(255,255,255,.1)"/><polygon points="${ring(.33)}" fill="none" stroke="rgba(255,255,255,.08)"/>
      <polygon points="${pts.map(p => p.join(',')).join(' ')}" fill="rgba(139,92,246,.35)" stroke="#a78bfa" stroke-width="2.5"/>
      <text x="100" y="12" fill="#a9a9c9" font-size="11" text-anchor="middle">عددی</text><text x="190" y="162" fill="#a9a9c9" font-size="11" text-anchor="end">منطقی</text><text x="10" y="162" fill="#a9a9c9" font-size="11" text-anchor="start">تصویری</text></svg>`;
  }
  views.iqresult = o => {
    const r = o.r;
    return `${o.lv ? `<div class="lvlup">🎉 ارتقا به سطح ${fa(o.lv)} — ${E.titleOf(o.lv)}</div>` : ''}
    <div class="card glow" style="text-align:center"><div class="mut">شاخص هوش نمایشی شما</div>${gaugeSVG(70)}<div class="iqnum grad-t" id="iqn">${fa(70)}</div>
      <h2 style="margin-top:8px">${r.band}</h2><div class="mut">${fa(r.correct)} پاسخ درست از ${fa(r.total)} سؤال · +${fa(o.xp)} امتیاز</div>
      <div class="disc">⚠️ نمایشی و سرگرمی؛ جایگزین آزمون معتبر روان‌سنجی نیست.</div></div>
    <div class="card"><h3>تحلیل مهارت‌ها</h3>${radarSVG(r.cats)}${['num', 'logic', 'visual'].map(k => `<div class="catrow"><span>${CATN[k]}</span><div class="bar"><i style="width:${r.cats[k]}%"></i></div><b>${fa(r.cats[k])}٪</b></div>`).join('')}</div>
    ${o.nb.length ? `<div class="card glow"><h3>🎖 نشان جدید!</h3>${o.nb.map(b => `<div class="row" style="margin-top:10px"><div style="font-size:30px">${b.ic}</div><div><b>${b.name}</b><div class="mut" style="font-size:12px">${b.desc}</div></div></div>`).join('')}</div>` : ''}
    <h3 style="margin:16px 4px 10px">🔍 تحلیل سؤال‌ها</h3>
    ${o.res.map((x, i) => `<div class="rev"><div class="q">${i + 1}. ${x.q.kind === 'matrix' ? 'معمای ماتریسی تصویری' : x.q.q}</div>
      <div class="a ${x.ok ? 'ok' : 'no'}">${x.ok ? '✓ درست جواب دادی' : '✗ نادرست' + (x.sel < 0 ? ' (زمان تمام شد)' : '')}${x.q.kind === 'text' ? ' — پاسخ درست: ' + x.q.options[x.q.answerIdx] : ' — گزینه‌ی درست: ' + (x.q.answerIdx + 1)}</div>
      <div class="a mut">💡 ${x.q.why}</div></div>`).join('')}
    <div class="grid2" style="margin-top:14px"><button class="btn" data-a="qsync">📤 ثبت در جدول</button><button class="btn ghost" data-a="iqstart">🔁 تست جدید</button></div>
    <button class="btn ghost" style="margin-top:10px" data-a="tab" data-t="home">🏠 خانه</button>`;
  };
  views.iqresult.after = o => {
    setTimeout(() => { const g = $('.gauge'); if (g) { g.outerHTML = gaugeSVG(o.r.iq); } let c = 70; const el = $('#iqn'); const id = setInterval(() => { c += Math.max(1, Math.round((o.r.iq - c) / 8)); if (c >= o.r.iq) { c = o.r.iq; clearInterval(id); } if (el) el.textContent = fa(c); }, 45); }, 150);
    $$('.bar>i').forEach(i => { const w = i.style.width; i.style.width = '0'; setTimeout(() => i.style.width = w, 200); });
    if (o.r.iq >= 100) { confetti(); sfx.win(); hap('ok'); }
  };

  /* ---- دستاوردها ---- */
  views.awards = () => `<div class="card"><h2>🏆 دستاوردها</h2><p class="mut">${fa(S.badges.length)} از ${fa(E.BADGES.length)} نشان باز شده</p><div class="bar" style="margin-top:8px"><i style="width:${S.badges.length / E.BADGES.length * 100}%"></i></div></div>
    <div class="bgs">${E.BADGES.map(b => { const un = S.badges.includes(b.id); return `<div class="bdg ${un ? 'un' : 'lock'}"><span class="i">${un ? b.ic : '🔒'}</span><b>${b.name}</b><small>${b.desc}</small></div>`; }).join('')}</div>${foot()}`;

  /* ---- پروفایل ---- */
  views.me = () => {
    const p = S.profile || { n: '—', a: '🦊', e: '', g: '', c: '' }, L = lvInfo();
    return `${profileHead()}
    <div class="card"><h3 style="margin-bottom:6px">📊 آمار من</h3>
      <div class="kv"><span>سطح</span><b>${fa(L.level)} — ${L.title}</b></div><div class="kv"><span>کل امتیاز</span><b>${fa(S.xp)}</b></div>
      <div class="kv"><span>کوییز کامل</span><b>${fa(S.quizzes)}</b></div><div class="kv"><span>پاسخ درست</span><b>${fa(S.correct)} از ${fa(S.answered)}</b></div>
      <div class="kv"><span>بهترین زنجیره</span><b>${fa(S.bestStreak)}</b></div><div class="kv"><span>بهترین شاخص هوش (نمایشی)</span><b>${S.iqBest ? fa(S.iqBest) : '—'}</b></div>
      <div class="kv"><span>روزهای پیاپی</span><b>${fa(S.streakDays)}</b></div></div>
    <div class="card"><h3 style="margin-bottom:6px">👤 پروفایل</h3><div class="kv"><span>پایه</span><b>${esc(p.e || '—')}</b></div><div class="kv"><span>شهر</span><b>${esc(p.c || '—')}</b></div>
      <div class="row" style="margin-top:12px"><button class="btn ghost sm" data-a="editprof" style="flex:1">✏️ ویرایش</button><button class="btn ghost sm" data-a="snd" style="flex:1">${S.sound ? '🔊 صدا: روشن' : '🔇 صدا: خاموش'}</button></div></div>
    <button class="btn pink" data-a="sync">📤 ثبت امتیاز در جدول برترین‌های ربات ${S.unsynced ? '(' + fa(S.unsynced) + ' نتیجه‌ی جدید)' : ''}</button>
    <button class="btn ghost" style="margin-top:10px" data-a="go" data-v="about">ℹ️ درباره‌ی A3M TEAM و IQ</button>
    <button class="btn ghost" style="margin-top:10px;color:var(--bad)" data-a="reset">🗑 پاک کردن داده‌ها</button>`;
  };
  views.about = () => `<div class="card team" style="text-align:center">${logoSVG()}<h2 style="margin-top:6px"><span class="grad-t">A3M</span> TEAM</h2><p class="mut">تیمی که یادگیری را بازی می‌کند.</p>
    <hr class="hr" style="width:100%"><div class="mut">طراحی و توسعه: <b style="color:#fff">IQ</b> · تیم <b style="color:#fff">A3M</b></div>
    <div class="mut" style="margin-top:8px">پنل بازی و آزمون برای ربات مشاور کنکور کاردانی (شبکه و نرم‌افزار)</div>
    <div class="disc">شاخص هوش این پنل «نمایشی» است. امتیازها در گوشی خودت و (پس از ثبت) در ربات ذخیره می‌شوند.</div>
    <div class="mut" style="margin-top:10px;font-size:11px">نسخه ۱٫۰</div></div>`;

  /* ================= همگام‌سازی با ربات ================= */
  function payload() {
    const p = S.profile || {}, L = E.levelOf(S.xp);
    return JSON.stringify({ v: 1, p: { n: p.n, a: p.a, e: p.e, g: p.g, c: p.c }, s: { xp: S.xp, lv: L, q: S.quizzes, ok: S.correct, tot: S.answered, iq: S.iqBest, d: S.streakDays, b: S.badges, t: Math.floor(Date.now() / 1000) } });
  }
  function sync() {
    if (!S.profile) return toast('اول ثبت‌نام کن');
    const data = payload();
    if (!tg) { try { navigator.clipboard && navigator.clipboard.writeText(data); } catch (e) { } return toast('حالت آزمایشی: داده کپی شد (' + data.length + ' بایت)'); }
    if (tg.initDataUnsafe && tg.initDataUnsafe.query_id) {
      const m = 'برای ثبت در جدول، پنل را از دکمه‌ی «🎮 پنل IQ» که ربات در پایین چت می‌گذارد باز کن (دستور /app).';
      return tg.showAlert ? tg.showAlert(m) : alert(m);
    }
    S.unsynced = 0; save();
    tg.sendData(data);                                              // پنل بسته می‌شود و ربات داده را می‌گیرد
  }

  /* ================= رویدادها ================= */
  const A = {
    tab: d => { sfx.click(); hap('light'); tab(d.t); },
    go: d => go(d.v),
    rav: d => { reg.a = d.v; hap('light'); $$('.avs button').forEach(b => b.classList.toggle('on', b.dataset.v === d.v)); },
    rseg: (d, el) => { reg[d.k] = d.v; hap('light'); $$('button', el.parentNode).forEach(b => b.classList.toggle('on', b === el)); },
    rok: (d, el) => { reg.ok = !reg.ok; el.classList.toggle('on', reg.ok); $('i', el).textContent = reg.ok ? '✓' : ''; hap('light'); },
    rsubmit: () => {
      const n = ($('#rn').value || '').trim().replace(/[\u0000-\u001f<>]/g, ''), c = ($('#rc').value || '').trim().replace(/[\u0000-\u001f<>]/g, '');
      let bad = false;
      if (n.length < 2) { $('#rn').classList.add('err'); $('#e-n').textContent = 'نام باید حداقل ۲ حرف باشد'; bad = true; setTimeout(() => $('#rn').classList.remove('err'), 500); } else $('#e-n').textContent = '';
      if (!reg.ok) { $('#e-c').textContent = 'برای ادامه باید موافقت کنی'; bad = true; } else $('#e-c').textContent = '';
      if (bad) return hap('bad');
      S.profile = { n, a: reg.a, e: reg.e, g: reg.g, c }; S.unsynced++;
      const b = touchDay(); checkBadges(); save(); hap('ok'); sfx.win(); confetti();
      tab('home'); toast('🎉 خوش آمدی ' + n + '!' + (b ? ' پاداش روزانه +' + fa(b) : ''));
    },
    editprof: () => { const p = S.profile || {}; Object.assign(reg, { a: p.a || '🦊', e: p.e || 'یازدهم', g: p.g || '', ok: true }); go('register'); setTimeout(() => { if (p.n) $('#rn').value = p.n; if (p.c) $('#rc').value = p.c; }, 0); },
    snd: () => { S.sound = !S.sound; save(); render(); },
    reset: () => { const m = 'همه‌ی امتیازها و پروفایل پاک شود؟'; const go2 = ok => { if (ok) { S = blank(); save(); Object.assign(reg, { a: '🦊', e: 'یازدهم', g: '', ok: false }); go('register', {}, false); } }; tg && tg.showConfirm ? tg.showConfirm(m, go2) : go2(confirm(m)); },
    sync, qsync: sync,
    quick: () => { if (!DATA.questions.length) return toast('سؤالی بارگذاری نشده'); startQuiz('all', 10, true); },
    ql: d => { ui.lesson = d.v; hap('light'); render(); }, qn: d => { ui.n = +d.v; hap('light'); render(); }, qm: d => { ui.timed = d.v === '1'; hap('light'); render(); },
    qstart: () => { if (!lessonCount(ui.lesson)) return toast('برای این درس سؤالی نیست'); startQuiz(ui.lesson, ui.n, ui.timed); },
    ans: (d, el) => answer(+d.k, el), qnext: () => nextQ(),
    iqstart: () => startIQ(),
    iqsel: (d, el) => { if (!IQ || IQ.locked) return; IQ.sel = +d.k; hap('light'); sfx.click(); $$('[data-a="iqsel"]').forEach(b => b.classList.toggle('sel', b === el)); $('#iqok').disabled = false; },
    iqconfirm: () => iqCommit(false),
  };
  document.addEventListener('click', e => {
    const el = e.target.closest('[data-a]'); if (!el || el.disabled) return;
    const f = A[el.dataset.a]; if (f) f(el.dataset, el);
  });
  const views_ = views; window.__IQ = { S: () => S, view: () => view, A, views: views_, DATA };   // برای تست

  /* ================= راه‌اندازی ================= */
  async function boot() {
    if (tg) {
      try { tg.ready(); tg.expand(); tg.setHeaderColor && tg.setHeaderColor('#070713'); tg.setBackgroundColor && tg.setBackgroundColor('#070713'); tg.disableVerticalSwipes && tg.disableVerticalSwipes(); tg.BackButton && tg.BackButton.onClick(back); } catch (e) { }
    } else { const d = document.createElement('div'); d.className = 'dev'; d.textContent = 'DEV'; document.body.appendChild(d); }
    await loadState();
    const bonus = S.profile ? touchDay() : 0; if (bonus) save();
    await new Promise(r => setTimeout(r, 1500));
    $('#splash').classList.add('hide');
    if (!S.profile) { const u = tg && tg.initDataUnsafe && tg.initDataUnsafe.user; go('register', {}, false); }
    else { go('home', {}, false); if (bonus) toast('🔥 پاداش ورود روزانه: +' + fa(bonus) + ' امتیاز'); }
  }
  boot();
})();
