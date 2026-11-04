/* IQ Panel — موتور منطق (بدون وابستگی): امتیاز، سطح، نشان‌ها، سؤال‌های هوش، تولید معمای تصویری | A3M TEAM */
(function (root) {
  'use strict';

  /* ---------- ابزارها ---------- */
  function mulberry32(a) {
    return function () {
      a |= 0; a = a + 0x6D2B79F5 | 0;
      let t = Math.imul(a ^ a >>> 15, 1 | a);
      t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
  }
  function shuffle(arr, r) {
    r = r || Math.random;
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
    return a;
  }
  const faDigits = n => String(n).replace(/\d/g, d => '۰۱۲۳۴۵۶۷۸۹'[d]);

  /* ---------- سطح و امتیاز ---------- */
  const TITLES = ['تازه‌وارد', 'کنجکاو', 'کاوشگر', 'تحلیل‌گر', 'مبتکر', 'استاد', 'نابغه', 'افسانه‌ی IQ'];
  const levelOf = xp => 1 + Math.floor(Math.sqrt(Math.max(0, xp) / 40));
  const levelStart = l => 40 * (l - 1) * (l - 1);
  const levelNext = l => 40 * l * l;
  const titleOf = l => TITLES[Math.min(Math.floor((l - 1) / 2), TITLES.length - 1)];
  function levelProgress(xp) {
    const l = levelOf(xp), a = levelStart(l), b = levelNext(l);
    return { level: l, title: titleOf(l), pct: Math.round((xp - a) / (b - a) * 100), need: b - xp };
  }
  /* امتیاز یک پاسخ درست در کوییز */
  function answerXP(opts) {
    const base = 10;
    const speed = opts.timed ? Math.round(5 * Math.max(0, Math.min(1, opts.timeLeftRatio))) : 0;
    const combo = opts.streak >= 3 ? Math.min(opts.streak - 2, 5) * 2 : 0;
    return { base, speed, combo, total: base + speed + combo };
  }

  /* ---------- نشان‌ها ---------- */
  const BADGES = [
    { id: 'first', ic: '🚀', name: 'شروع قدرتمند', desc: 'اولین کوییزت را کامل کن', ok: s => s.quizzes >= 1 },
    { id: 'quiz10', ic: '🎯', name: 'کوییزباز', desc: '۱۰ کوییز کامل کن', ok: s => s.quizzes >= 10 },
    { id: 'ok100', ic: '💯', name: 'صد درست', desc: '۱۰۰ پاسخ درست بده', ok: s => s.correct >= 100 },
    { id: 'streak5', ic: '🔥', name: 'زنجیره‌ی آتشین', desc: '۵ پاسخ درست پشت‌سرهم', ok: s => s.bestStreak >= 5 },
    { id: 'perfect', ic: '🏅', name: 'بی‌نقص', desc: 'یک کوییز را بدون خطا تمام کن (حداقل ۵ سؤال)', ok: s => s.perfect >= 1 },
    { id: 'explorer', ic: '🧭', name: 'کاوشگر دروس', desc: 'در ۵ درس مختلف کوییز بده', ok: s => (s.lessonsTried || []).length >= 5 },
    { id: 'iq', ic: '🧠', name: 'ذهن کنجکاو', desc: 'تست هوش را کامل کن', ok: s => s.iqDone >= 1 },
    { id: 'iq120', ic: '⚡', name: 'ذهن تیز', desc: 'شاخص هوش نمایشی ۱۲۰ یا بیشتر', ok: s => s.iqBest >= 120 },
    { id: 'iq140', ic: '👑', name: 'نابغه‌ی نمایشی', desc: 'شاخص هوش نمایشی ۱۴۰ یا بیشتر', ok: s => s.iqBest >= 140 },
    { id: 'day3', ic: '📅', name: 'سه روز پیاپی', desc: '۳ روز پشت‌سرهم وارد شو', ok: s => s.streakDays >= 3 },
    { id: 'day7', ic: '🌟', name: 'هفته‌ی طلایی', desc: '۷ روز پشت‌سرهم وارد شو', ok: s => s.streakDays >= 7 },
    { id: 'lvl5', ic: '🏆', name: 'سطح ۵', desc: 'به سطح ۵ برس', ok: s => levelOf(s.xp) >= 5 },
  ];
  function newBadges(state) {
    const have = new Set(state.badges || []);
    return BADGES.filter(b => !have.has(b.id) && b.ok(state));
  }

  /* ---------- سؤال‌های هوش (متنی) ----------
     گزینه‌ی اول همیشه درست است؛ هنگام استفاده بُر می‌خورد. d = سختی (۱ تا ۳) */
  const L = s => '<span class="ltr">' + s + '</span>';
  const T = (cat, d, q, opts, why) => ({ cat, d, q, opts, why });
  const IQ_POOL = [
    /* --- عددی --- */
    T('num', 2, 'عدد بعدی دنباله کدام است؟<br>' + L('2, 6, 12, 20, 30, ?'), ['42', '40', '44', '36'], 'تفاضل‌ها ۴، ۶، ۸، ۱۰ هستند؛ پس تفاضل بعدی ۱۲ است: ۳۰ + ۱۲ = ۴۲.'),
    T('num', 2, 'عدد بعدی دنباله کدام است؟<br>' + L('3, 7, 15, 31, 63, ?'), ['127', '125', '126', '129'], 'هر جمله = ۲ × جمله‌ی قبل + ۱ ⇒ ۶۳×۲+۱ = ۱۲۷.'),
    T('num', 3, 'عدد بعدی دنباله کدام است؟<br>' + L('2, 3, 5, 9, 17, 33, ?'), ['65', '64', '67', '66'], 'تفاضل‌ها ۱، ۲، ۴، ۸، ۱۶ هستند (دو برابر می‌شوند)؛ تفاضل بعدی ۳۲ ⇒ ۳۳ + ۳۲ = ۶۵.'),
    T('num', 3, 'عدد بعدی دنباله کدام است؟<br>' + L('2, 100, 4, 50, 8, 25, 16, ?'), ['12.5', '10', '8', '6.25'], 'دو دنباله‌ی درهم: ۲، ۴، ۸، ۱۶ (×۲) و ۱۰۰، ۵۰، ۲۵ (÷۲) ⇒ ۲۵ ÷ ۲ = ۱۲٫۵.'),
    T('num', 3, 'عدد بعدی دنباله کدام است؟<br>' + L('4, 9, 25, 49, 121, ?'), ['169', '144', '196', '225'], 'مربع اعداد اول: ۲²، ۳²، ۵²، ۷²، ۱۱² و بعدی ۱۳² = ۱۶۹.'),
    T('num', 3, 'عدد بعدی دنباله کدام است؟<br>' + L('0, 1, 1, 2, 4, 7, 13, 24, ?'), ['44', '40', '48', '46'], 'هر جمله مجموع سه جمله‌ی قبلی است: ۷ + ۱۳ + ۲۴ = ۴۴.'),
    T('num', 3, 'عدد بعدی دنباله کدام است؟<br>' + L('2, 12, 36, 80, 150, ?'), ['252', '240', '264', '225'], 'جمله‌ی n ام = n² × (n+1) ⇒ ۶² × ۷ = ۲۵۲.'),
    T('num', 2, 'حرف بعدی دنباله کدام است؟<br>' + L('A, C, F, J, O, ?'), ['U', 'T', 'S', 'V'], 'فاصله‌ی حرف‌ها ۲، ۳، ۴، ۵، ۶ است؛ O (حرف ۱۵) + ۶ = حرف ۲۱ یعنی U.'),
    T('num', 3, 'عدد بعدی دنباله کدام است؟<br>' + L('7, 10, 8, 11, 9, 12, ?'), ['10', '13', '11', '9'], 'دو دنباله‌ی درهم: ۷، ۸، ۹، ۱۰ و ۱۰، ۱۱، ۱۲ ⇒ بعدی ۱۰.'),
    T('num', 2, 'عدد بعدی دنباله کدام است؟<br>' + L('1, 2, 6, 24, 120, ?'), ['720', '600', '840', '480'], 'فاکتوریل: ۱!، ۲!، ۳!، ۴!، ۵! و بعدی ۶! = ۷۲۰.'),
    T('num', 3, 'اگر ' + L('4 = 20') + ' و ' + L('5 = 30') + ' و ' + L('6 = 42') + ' باشد، ' + L('7') + ' برابر است با؟', ['56', '49', '48', '63'], 'قاعده: n × (n+1)؛ پس ۷ × ۸ = ۵۶.'),
    T('num', 3, 'عدد بعدی دنباله کدام است؟<br>' + L('1, 4, 10, 22, 46, ?'), ['94', '92', '96', '90'], 'تفاضل‌ها ۳، ۶، ۱۲، ۲۴ دو برابر می‌شوند؛ بعدی ۴۸ ⇒ ۴۶ + ۴۸ = ۹۴.'),
    T('num', 3, 'کدام عدد با بقیه فرق دارد؟<br>' + L('144, 121, 169, 225, 200'), ['200', '144', '225', '121'], 'همه مربع کامل‌اند (۱۲²، ۱۱²، ۱۳²، ۱۵²) به‌جز ۲۰۰.'),
    T('num', 2, 'عدد بعدی دنباله کدام است؟<br>' + L('1, 2, 4, 7, 11, 16, 22, ?'), ['29', '28', '30', '31'], 'تفاضل‌ها ۱، ۲، ۳، ۴، ۵، ۶ ⇒ تفاضل بعدی ۷: ۲۲ + ۷ = ۲۹.'),
    /* --- منطق و استدلال --- */
    T('logic', 3, 'همه‌ی A ها B هستند و بعضی B ها C هستند. کدام نتیجه «قطعاً» درست است؟',
      ['هیچ‌کدام از نتیجه‌های دیگر قطعی نیست', 'همه‌ی A ها C هستند', 'بعضی A ها C هستند', 'هیچ A ای C نیست'],
      'بعضی از B ها که C هستند ممکن است اصلاً از A ها نباشند؛ پس درباره‌ی رابطه‌ی A و C نتیجه‌ی قطعی نداریم.'),
    T('logic', 3, 'پدری ۳ برابر سن پسرش است. ۱۲ سال بعد سن پدر ۲ برابر سن پسر می‌شود. سن فعلی پسر؟', ['12', '10', '8', '15'], '۳x + ۱۲ = ۲(x + ۱۲) ⇒ x = ۱۲.'),
    T('logic', 2, '۳ ماشین، ۳ قطعه را در ۳ دقیقه می‌سازند. ۱۰۰ ماشین ۱۰۰ قطعه را در چند دقیقه می‌سازند؟', ['۳ دقیقه', '۱۰۰ دقیقه', '۳۳ دقیقه', '۱ دقیقه'], 'هر ماشین در ۳ دقیقه ۱ قطعه می‌سازد؛ پس ۱۰۰ ماشین ۱۰۰ قطعه را هم در ۳ دقیقه می‌سازند.'),
    T('logic', 3, 'یک کتاب و یک خودکار روی‌هم ۱۱٬۰۰۰ تومان‌اند و کتاب ۱۰٬۰۰۰ تومان گران‌تر از خودکار است. قیمت خودکار؟', ['۵۰۰ تومان', '۱٬۰۰۰ تومان', '۱۰۰ تومان', '۱٬۵۰۰ تومان'], 'x + (x + ۱۰۰۰۰) = ۱۱۰۰۰ ⇒ x = ۵۰۰.'),
    T('logic', 3, 'پوشش جلبک روی یک دریاچه هر روز دو برابر می‌شود و ۴۸ روز طول می‌کشد کل دریاچه پوشیده شود. پوشاندن نصف دریاچه چند روز طول می‌کشد؟', ['۴۷ روز', '۲۴ روز', '۴۶ روز', '۳۶ روز'], 'چون هر روز دو برابر می‌شود، یک روز قبل از پر شدن، دریاچه نصفه بوده است: روز ۴۷.'),
    T('logic', 3, 'سه نفر هرکدام یا همیشه راست می‌گویند یا همیشه دروغ. A: «B دروغگوست». B: «C دروغگوست». C: «A و B هر دو دروغگو هستند». چند نفر راستگو هستند؟', ['۱ نفر', '۰ نفر', '۲ نفر', '۳ نفر'], 'فقط حالت «A دروغگو، B راستگو، C دروغگو» با همه‌ی گفته‌ها سازگار است.'),
    T('logic', 3, 'علی از رضا بلندتر است. سارا از علی کوتاه‌تر اما از رضا بلندتر است. نیما از سارا بلندتر ولی بلندترین نیست. ترتیب از بلند به کوتاه؟',
      ['علی، نیما، سارا، رضا', 'نیما، علی، سارا، رضا', 'علی، سارا، نیما، رضا', 'علی، نیما، رضا، سارا'], 'نیما بلندترین نیست و از سارا بلندتر است، پس علی از او بلندتر است: علی > نیما > سارا > رضا.'),
    T('logic', 3, 'دو تاس سالم می‌اندازیم. احتمال اینکه مجموع دو عدد ۸ شود چقدر است؟', ['۵/۳۶', '۱/۶', '۱/۹', '۷/۳۶'], 'حالت‌های مطلوب: (۲،۶)، (۳،۵)، (۴،۴)، (۵،۳)، (۶،۲) = ۵ حالت از ۳۶.'),
    T('logic', 3, 'به چند طریق می‌توان ۵ نفر را دور یک میز گرد نشاند (چرخش‌ها یکسان حساب می‌شوند)؟', ['۲۴', '۱۲۰', '۱۲', '۶۰'], 'تعداد حالت‌ها (۵ − ۱)! = ۲۴.'),
    T('logic', 3, 'زاویه‌ی بین عقربه‌های ساعت در ساعت ۳:۴۰ چند درجه است؟', ['۱۳۰°', '۱۲۰°', '۱۵۰°', '۱۴۰°'], 'عقربه‌ی ساعت‌شمار: ۳×۳۰ + ۴۰×۰٫۵ = ۱۱۰°، دقیقه‌شمار: ۴۰×۶ = ۲۴۰° ⇒ اختلاف ۱۳۰°.'),
    T('logic', 3, 'قطاری مسیر ۱۲۰ کیلومتری را با سرعت ۶۰ می‌رود و همان مسیر را با سرعت ۴۰ برمی‌گردد. سرعت متوسط کل سفر چند کیلومتر بر ساعت است؟', ['۴۸', '۵۰', '۵۲', '۴۵'], 'زمان رفت ۲ ساعت و برگشت ۳ ساعت؛ مسافت کل ۲۴۰ کیلومتر در ۵ ساعت ⇒ ۴۸.'),
    T('logic', 3, 'باقی‌مانده‌ی تقسیم ' + L('7^100') + ' بر ۵ چند است؟', ['۱', '۲', '۳', '۴'], '۷ ≡ ۲ (mod ۵) و توان‌های ۲ با دوره‌ی ۴ تکرار می‌شوند (۲،۴،۳،۱). چون ۱۰۰ بر ۴ بخش‌پذیر است، باقی‌مانده ۱ است.'),
    T('logic', 2, 'در یک مهمانی ۱۰ نفر هستند و هر دو نفر دقیقاً یک بار با هم دست می‌دهند. تعداد دست دادن‌ها؟', ['۴۵', '۹۰', '۱۰۰', '۵۵'], 'C(۱۰،۲) = ۱۰×۹÷۲ = ۴۵.'),
    T('logic', 3, '۸ سکه‌ی ظاهراً یکسان داریم که یکی کمی سنگین‌تر است. با ترازوی دو کفه‌ای حداقل چند بار وزن‌کشی لازم است تا «حتماً» سکه‌ی سنگین پیدا شود؟', ['۲ بار', '۳ بار', '۴ بار', '۱ بار'], 'سه دسته‌ی ۳ و ۳ و ۲ می‌سازیم؛ با ۱ وزن‌کشی دسته‌ی سنگین مشخص می‌شود و با وزن‌کشی دوم سکه پیدا می‌شود.'),
    T('logic', 2, 'حداقل چند نفر لازم است تا «حتماً» دو نفر از آن‌ها در یک ماه از سال به دنیا آمده باشند؟', ['۱۳ نفر', '۱۲ نفر', '۲۴ نفر', '۳۶۶ نفر'], 'اصل لانه‌ی کبوتری: با ۱۲ ماه، نفر سیزدهم حتماً با یکی هم‌ماه می‌شود.'),
    T('logic', 3, 'از ۳۰ نفر، ۱۸ نفر فوتبال و ۱۵ نفر والیبال بازی می‌کنند و ۵ نفر هیچ‌کدام. چند نفر هر دو ورزش را بازی می‌کنند؟', ['۸ نفر', '۷ نفر', '۱۰ نفر', '۱۲ نفر'], 'اجتماع = ۳۰ − ۵ = ۲۵ ⇒ اشتراک = ۱۸ + ۱۵ − ۲۵ = ۸.'),
    T('logic', 2, 'در یک مسابقه‌ی دو، شما نفر دوم را سبقت می‌گیرید. حالا در چه رتبه‌ای هستید؟', ['دوم', 'اول', 'سوم', 'چهارم'], 'با سبقت از نفر دوم، جای او را می‌گیرید یعنی رتبه‌ی دوم (نه اول).'),
  ];

  /* ---------- معمای ماتریسی تصویری (تولید خودکار + پاسخ یکتا) ---------- */
  const SHAPES = ['circle', 'square', 'triangle'];
  const FILLS = ['empty', 'stripe', 'solid'];
  function latin(r) { return { t: 'latin', a: 1 + Math.floor(r() * 2), b: 1 + Math.floor(r() * 2), k: Math.floor(r() * 3) }; }
  function permRule(r, t) { return { t, perm: shuffle([0, 1, 2], r) }; }
  function evalRule(rule, row, col) {
    if (rule.t === 'latin') return (rule.a * row + rule.b * col + rule.k) % 3;
    if (rule.t === 'row') return rule.perm[row];
    return rule.perm[col];
  }
  function ruleText(rule, label) {
    if (rule.t === 'latin') return label + ': در هر ردیف و هر ستون، هر سه حالت دقیقاً یک بار می‌آید.';
    if (rule.t === 'row') return label + ': در هر ردیف ثابت است.';
    return label + ': در هر ستون ثابت است.';
  }
  /* level 2: ترکیب قانون‌های ساده | level 3: هر سه ویژگی لاتین (سخت) */
  function genMatrix(seed, level) {
    const r = mulberry32(seed);
    let rules;
    do {
      rules = level >= 3 ? [latin(r), latin(r), latin(r)] : shuffle([latin(r), permRule(r, 'row'), permRule(r, 'col')], r);
    } while (level >= 3 && (rules[0].a === rules[1].a && rules[0].b === rules[1].b ||
                              rules[1].a === rules[2].a && rules[1].b === rules[2].b ||
                              rules[0].a === rules[2].a && rules[0].b === rules[2].b));
    const cellAt = (row, col) => ({ shape: evalRule(rules[0], row, col), count: evalRule(rules[1], row, col), fill: evalRule(rules[2], row, col) });
    const cells = [];
    for (let row = 0; row < 3; row++) for (let col = 0; col < 3; col++) cells.push(cellAt(row, col));
    const answer = cells[8];
    const key = c => c.shape + '-' + c.count + '-' + c.fill;
    const opts = new Map(); opts.set(key(answer), answer);
    const attrs = ['shape', 'count', 'fill'];
    for (const at of shuffle(attrs, r)) for (const v of [0, 1, 2]) {            // تغییر یک ویژگی
      if (v !== answer[at]) { const c = { ...answer, [at]: v }; opts.set(key(c), c); }
    }
    let guard = 0;
    while (opts.size < 8 && guard++ < 200) {                                       // تغییر دو ویژگی
      const c = { ...answer }; const two = shuffle(attrs, r).slice(0, 2);
      two.forEach(at => { c[at] = (answer[at] + 1 + Math.floor(r() * 2)) % 3; });
      opts.set(key(c), c);
    }
    const list = shuffle(Array.from(opts.values()), r).slice(0, 8);
    if (!list.some(c => key(c) === key(answer))) list[0] = answer;
    const options = shuffle(list, r);
    return {
      cat: 'visual', d: level >= 3 ? 3 : 2, kind: 'matrix', cells: cells.slice(0, 8), options,
      answerIdx: options.findIndex(c => key(c) === key(answer)),
      why: [ruleText(rules[0], 'شکل'), ruleText(rules[1], 'تعداد'), ruleText(rules[2], 'طرح داخل شکل')].join(' ')
    };
  }

  /* ---------- ساخت آزمون هوش (۲۰ سؤال) ---------- */
  function buildIQTest(seed) {
    const r = mulberry32(seed || (Date.now() & 0x7fffffff));
    const pick = (cat, n) => shuffle(IQ_POOL.filter(q => q.cat === cat), r).slice(0, n).map(q => {
      const idx = shuffle([0, 1, 2, 3], r);
      return { cat: q.cat, d: q.d, kind: 'text', q: q.q, options: idx.map(i => q.opts[i]), answerIdx: idx.indexOf(0), why: q.why };
    });
    const visual = [2, 2, 3, 3, 3, 3].map((lv, i) => genMatrix(Math.floor(r() * 1e9) + i, lv));
    const all = [].concat(pick('num', 7), pick('logic', 7), visual);
    // ترتیب: از آسان به سخت با کمی تصادف
    return all.map(q => ({ q, k: q.d + r() * 1.4 })).sort((a, b) => a.k - b.k).map(x => x.q);
  }
  const IQ_TIME = { text: 90, matrix: 120 };

  /* نتیجه‌ی تست هوش: results = [{cat,d,ok,ratio}] */
  function scoreIQ(results) {
    const w = r => r.d;
    const tot = results.reduce((s, r) => s + w(r), 0) || 1;
    const got = results.reduce((s, r) => s + (r.ok ? w(r) : 0), 0);
    const p = got / tot;
    const okR = results.filter(r => r.ok);
    const speed = okR.length ? okR.reduce((s, r) => s + r.ratio, 0) / okR.length : 0;
    const iq = Math.max(70, Math.min(150, Math.round(70 + 72 * p + 8 * p * speed)));
    const cats = {};
    ['num', 'logic', 'visual'].forEach(c => {
      const rs = results.filter(r => r.cat === c); const t = rs.reduce((s, r) => s + w(r), 0) || 1;
      cats[c] = Math.round(rs.reduce((s, r) => s + (r.ok ? w(r) : 0), 0) / t * 100);
    });
    return { iq, p, speed, cats, correct: okR.length, total: results.length, band: iqBand(iq) };
  }
  function iqBand(iq) {
    if (iq >= 145) return 'نابغه (نمایشی!) 🤯';
    if (iq >= 130) return 'بسیار باهوش 🚀';
    if (iq >= 115) return 'باهوش ⚡';
    if (iq >= 100) return 'بالاتر از میانگین ✨';
    if (iq >= 85) return 'میانگین 🙂';
    return 'در حال رشد 🌱';
  }

  const api = { mulberry32, shuffle, faDigits, levelOf, levelStart, levelNext, titleOf, levelProgress, answerXP, BADGES, newBadges,
    IQ_POOL, genMatrix, buildIQTest, IQ_TIME, scoreIQ, iqBand, SHAPES, FILLS };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.IQE = api;
})(typeof window !== 'undefined' ? window : globalThis);
