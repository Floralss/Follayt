(function () {
  'use strict';

  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    try { tg.ready(); tg.expand(); tg.setHeaderColor('#08080d'); tg.setBackgroundColor('#08080d'); } catch (e) {}
  }

  var PROJECT = 'custom-graphics-36c50';
  var ADMIN_IDS = [8133917568, 5198310704];
  var LS = 'iz_v5_';
  var user = null, db = null, uref = null, opening = false, selCase = null, selItem = null;

  function $(id) { return document.getElementById(id); }

  /* ===== Sounds (Web Audio, no files needed) ===== */
  var _actx = null;
  function audioCtx() {
    if (!_actx) {
      try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; }
    }
    if (_actx.state === 'suspended') _actx.resume();
    return _actx;
  }
  function beep(freq, dur, type, vol, delay) {
    try {
      var ctx = audioCtx(); if (!ctx) return;
      var t0 = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator();
      var g = ctx.createGain();
      o.type = type || 'sine';
      o.frequency.value = freq;
      g.gain.setValueAtTime((vol || 0.08), t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.1));
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + (dur || 0.1) + 0.02);
    } catch (e) {}
  }
  function sfx(name) {
    if (name === 'click') beep(600, 0.04, 'square', 0.04);
    else if (name === 'open') { beep(300, 0.08, 'triangle', 0.06); beep(450, 0.1, 'triangle', 0.05, 0.08); }
    else if (name === 'spin') beep(200 + Math.random() * 400, 0.05, 'sawtooth', 0.03);
    else if (name === 'win') { beep(523, 0.12, 'sine', 0.1); beep(659, 0.12, 'sine', 0.1, 0.12); beep(784, 0.2, 'sine', 0.12, 0.24); }
    else if (name === 'lose') { beep(200, 0.15, 'sawtooth', 0.06); beep(150, 0.2, 'sawtooth', 0.05, 0.12); }
    else if (name === 'dig') beep(80 + Math.random() * 40, 0.06, 'triangle', 0.08);
    else if (name === 'tab') beep(500, 0.03, 'sine', 0.03);
  }


  function toast(m, t) {
    var el = $('toast'); if (!el) return;
    el.textContent = m; el.className = 'toast on ' + (t === 'error' ? 'err' : t === 'success' ? 'ok' : '');
    setTimeout(function () { el.classList.remove('on'); }, 2800);
  }
  function tgUser() {
    try { if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user; } catch (e) {}
    return { id: 999001, first_name: 'Test', username: 'test', photo_url: null };
  }

  /* ===== Prize icons (emoji) + Russian names ===== */
  var EMOJI = {
    '1 ★': '⭐', '2 ★': '⭐', '5 ★': '🌟', 'Звезда': '🌟',
    'Сердце': '❤️', 'Роза': '🌹', 'Мишка': '🧸', 'Торт': '🎂', 'Подарок': '🎁',
    'Алмаз': '💎', 'Кольцо': '💍',
    'Мороженое': '🍦', 'Статуя Свободы': '🗽', 'Крутой пёс': '🐶',
    'Лапша': '🍜', 'Юла': '🪀', 'Леденец': '🍭', 'Фонарь': '🏮',
    'Фламинго': '🦩', 'Рюкзак': '🎒', 'Носок': '🧦', 'Снеговик': '⛄',
    'Капкейк': '🧁', 'Мешок конфет': '🍬', 'Какашка': '💩', 'Клевер': '🍀',
    'Леденец-трость': '🍬', 'Коробка': '🎀', 'Торт с вишней': '🍰',
    'Змея': '🐍', 'Пряничное сердце': '🍪', 'Кролик': '🐰',
    'Полумесяц': '🌙', 'День рождения': '🎂', 'Шут': '🃏',
    'Медаль': '🏅', 'Бенгальский огонь': '✨', 'Букет денег': '💸',
    'Световой меч': '⚔️', 'Книга магии': '📖', 'Клавиша любви': '💜',
    'Облигация': '📜', 'Пряник': '🍪', 'Ракета': '🚀', 'Шпион-обезьяна': '🐵',
    'Плюшевый Пепе': '🐸', 'Кепка Дурова': '🧢', 'Шампанское': '🍾',
    'Деревянная кирка': '⛏', 'Каменная кирка': '⛏', 'Железная кирка': '⛏',
    'Золотая кирка': '⛏', 'Алмазная кирка': '⛏'
  };
  function em(n) { return EMOJI[n] || '🎁'; }

  /* ===== Cases ===== */
  var CASES = {
    free: {
      id: 'free', name: 'Фри', price: 0, desc: 'Раз в 24 часа', cls: 'free', art: '🎁',
      prizes: [
        { name: '1 ★', value: 1, chance: 55, nft: false },
        { name: '2 ★', value: 2, chance: 35, nft: false },
        { name: '5 ★', value: 5, chance: 6, nft: false },
        { name: 'Сердце', value: 15, chance: 1.5, nft: false },
        { name: 'Капкейк', value: 460, chance: 0.8, nft: true },
        { name: 'Снеговик', value: 490, chance: 0.6, nft: true },
        { name: 'Носок', value: 500, chance: 0.5, nft: true },
        { name: 'Фламинго', value: 510, chance: 0.4, nft: true },
        { name: 'Мороженое', value: 505, chance: 0.2, nft: true }
      ]
    },
    cheap: {
      id: 'cheap', name: 'Дешёвый', price: 15, desc: 'Обычные + маркет NFT', cls: 'cheap', art: '📦',
      prizes: [
        { name: 'Сердце', value: 10, chance: 26, nft: false },
        { name: 'Роза', value: 15, chance: 22, nft: false },
        { name: 'Мишка', value: 25, chance: 16, nft: false },
        { name: 'Торт', value: 40, chance: 10, nft: false },
        { name: 'Звезда', value: 50, chance: 8, nft: false },
        { name: 'Капкейк', value: 460, chance: 4, nft: true },
        { name: 'Снеговик', value: 490, chance: 3.5, nft: true },
        { name: 'Носок', value: 500, chance: 3, nft: true },
        { name: 'Коробка', value: 500, chance: 2.5, nft: true },
        { name: 'Фламинго', value: 510, chance: 2, nft: true },
        { name: 'Леденец-трость', value: 510, chance: 1.5, nft: true },
        { name: 'Лапша', value: 513, chance: 1, nft: true },
        { name: 'Юла', value: 530, chance: 0.5, nft: true }
      ]
    },
    selected: {
      id: 'selected', name: 'Избранный', price: 100, desc: 'Маркет NFT 500–700 ★', cls: 'sel', art: '👑',
      prizes: [
        { name: 'Капкейк', value: 460, chance: 12, nft: true },
        { name: 'Снеговик', value: 490, chance: 11, nft: true },
        { name: 'Носок', value: 500, chance: 10, nft: true },
        { name: 'Фламинго', value: 510, chance: 9, nft: true },
        { name: 'Леденец', value: 544, chance: 8, nft: true },
        { name: 'Змея', value: 549, chance: 7, nft: true },
        { name: 'Шут', value: 550, chance: 6, nft: true },
        { name: 'Бенгальский огонь', value: 587, chance: 6, nft: true },
        { name: 'Облигация', value: 590, chance: 5, nft: true },
        { name: 'Какашка', value: 599, chance: 4, nft: true },
        { name: 'Рюкзак', value: 600, chance: 4, nft: true },
        { name: 'Пряник', value: 610, chance: 3, nft: true },
        { name: 'Пряничное сердце', value: 626, chance: 3, nft: true },
        { name: 'Ракета', value: 650, chance: 2.5, nft: true },
        { name: 'Медаль', value: 655, chance: 2, nft: true },
        { name: 'Фонарь', value: 666, chance: 1.5, nft: true },
        { name: 'Статуя Свободы', value: 690, chance: 1, nft: true }
      ]
    },
    vip: {
      id: 'vip', name: 'VIP', price: 250, desc: 'Редкие маркет NFT', cls: 'vip', art: '💎',
      prizes: [
        { name: 'Торт с вишней', value: 700, chance: 14, nft: true },
        { name: 'Крутой пёс', value: 709, chance: 12, nft: true },
        { name: 'Букет денег', value: 710, chance: 11, nft: true },
        { name: 'Клевер', value: 721, chance: 10, nft: true },
        { name: 'Кролик', value: 721, chance: 9, nft: true },
        { name: 'Полумесяц', value: 721, chance: 8, nft: true },
        { name: 'День рождения', value: 721, chance: 8, nft: true },
        { name: 'Клавиша любви', value: 721, chance: 7, nft: true },
        { name: 'Световой меч', value: 721, chance: 6, nft: true },
        { name: 'Шпион-обезьяна', value: 814, chance: 5, nft: true },
        { name: 'Плюшевый Пепе', value: 900, chance: 4, nft: true },
        { name: 'Кепка Дурова', value: 1000, chance: 3, nft: true },
        { name: 'Книга магии', value: 600, chance: 2, nft: true },
        { name: 'Шампанское', value: 1200, chance: 1, nft: true }
      ]
    }
  };

  function roll(prizes) {
    var t = 0, i;
    for (i = 0; i < prizes.length; i++) t += prizes[i].chance;
    var r = Math.random() * t;
    for (i = 0; i < prizes.length; i++) { r -= prizes[i].chance; if (r <= 0) return prizes[i]; }
    return prizes[prizes.length - 1];
  }

  /* ===== Storage ===== */
  function saveLocal() {
    if (!user) return;
    try {
      localStorage.setItem(LS + user.id, JSON.stringify({
        balance: user.balance || 0, inventory: user.inventory || [],
        last_free: user.last_free || 0, total_deposited: user.total_deposited || 0,
        total_spent: user.total_spent || 0
      }));
    } catch (e) {}
  }
  function loadLocal(id) {
    try { var r = localStorage.getItem(LS + id); return r ? JSON.parse(r) : null; } catch (e) { return null; }
  }
  function save() {
    saveLocal();
    if (!uref) return;
    uref.set({
      id: user.id, first_name: user.first_name || '', username: user.username || '',
      photo_url: user.photo_url || null, balance: user.balance || 0,
      inventory: user.inventory || [], last_free: user.last_free || 0,
      total_deposited: user.total_deposited || 0, total_spent: user.total_spent || 0,
      last_active: Date.now(), online: true
    }, { merge: true }).catch(function () {});
  }

  function applyServer(d) {
    if (!d || !user) return;
    var old = user.balance || 0;
    if (typeof d.balance === 'number') user.balance = d.balance;
    if (typeof d.pending_credit === 'number' && d.pending_credit !== 0) {
      var add = d.pending_credit;
      user.balance = (user.balance || 0) + add;
      uref.update({ pending_credit: 0, balance: user.balance }).catch(function () {});
      toast('Начислено +' + add + ' ★', 'success');
    } else if (user.balance !== old && user.balance > old) {
      toast('Баланс: ' + user.balance + ' ★', 'success');
    }
    if (Array.isArray(d.inventory)) user.inventory = d.inventory;
    if (typeof d.last_free === 'number') user.last_free = d.last_free;
    if (typeof d.total_deposited === 'number') user.total_deposited = d.total_deposited;
    if (typeof d.total_spent === 'number') user.total_spent = d.total_spent;
    saveLocal();
    renderUser();
    try { renderCases(); } catch (e) {}
  }

  function renderUser() {
    if (!user) return;
    $('username').textContent = user.first_name || 'Игрок';
    $('balanceStars').textContent = (user.balance || 0).toLocaleString();
    var av = $('avatar');
    if (user.photo_url) av.innerHTML = '<img src="' + user.photo_url + '" alt="">';
    else av.textContent = ((user.first_name || '?')[0] || '?').toUpperCase();
  }

  /* ===== Tabs ===== */
  function tab(name) {
    document.querySelectorAll('.nb').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === name); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('on', t.id === 'tab-' + name); });
    if (name === 'inventory') renderInv();
    if (name === 'top') renderLb();
    if (name === 'profile') renderProf();
  }

  /* ===== Cases ===== */
  function renderCases() {
    var g = $('casesGrid'); if (!g || !user) return;
    g.innerHTML = '';
    var now = Date.now();
    Object.keys(CASES).forEach(function (k) {
      var c = CASES[k], ph;
      if (c.id === 'free') {
        var left = (user.last_free || 0) + 86400000 - now;
        if (left > 0) {
          var h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
          ph = '<div class="cp w">' + h + 'ч ' + m + 'м</div>';
        } else ph = '<div class="cp f">Бесплатно</div>';
      } else ph = '<div class="cp">' + c.price + ' ★</div>';
      var el = document.createElement('div');
      el.className = 'cc';
      el.innerHTML = '<div class="cart ' + c.cls + '">' + c.art + '</div><div class="cn">' + c.name + '</div><div class="cd">' + c.desc + '</div>' + ph;
      el.onclick = function () { openPrev(c.id); };
      g.appendChild(el);
    });
  }

  function openPrev(id) {
    var c = CASES[id]; if (!c) return;
    selCase = id;
    $('cpN').textContent = c.name;
    $('cpD').textContent = c.desc;
    $('cpArt').textContent = c.art;
    var now = Date.now(), pr = $('cpPr'), btn = $('btnOpen'), ok = true;
    if (c.id === 'free') {
      var left = (user.last_free || 0) + 86400000 - now;
      if (left > 0) {
        ok = false;
        var h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
        pr.className = 'cp-pr w'; pr.textContent = 'Через ' + h + 'ч ' + m + 'м';
        btn.textContent = 'Недоступно';
      } else { pr.className = 'cp-pr f'; pr.textContent = 'Бесплатно'; btn.textContent = 'Открыть бесплатно'; }
    } else {
      pr.className = 'cp-pr'; pr.textContent = c.price + ' ★';
      if ((user.balance || 0) < c.price) { ok = false; btn.textContent = 'Недостаточно ★'; }
      else btn.textContent = 'Открыть за ' + c.price + ' ★';
    }
    btn.disabled = !ok;
    var list = $('cpList'); list.innerHTML = '';
    c.prizes.slice().sort(function (a, b) { return b.chance - a.chance; }).forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'pr' + (p.nft ? ' nft' : '');
      row.innerHTML = '<div class="pp">' + em(p.name) + '</div><div class="pi"><div class="pn2">' + p.name + (p.nft ? ' · NFT' : '') + '</div><div class="pc">' + p.chance + '%</div></div><div class="pv2">' + p.value + ' ★</div>';
      list.appendChild(row);
    });
    $('shCase').classList.add('on');
  }

  function doOpen(id) {
    if (opening) return;
    var c = CASES[id]; if (!c) return;
    if (id === 'free') {
      if (Date.now() < (user.last_free || 0) + 86400000) { toast('Фри ещё не готов', 'error'); return; }
    } else {
      if ((user.balance || 0) < c.price) { toast('Недостаточно ★', 'error'); return; }
      user.balance -= c.price;
      user.total_spent = (user.total_spent || 0) + c.price;
    }
    opening = true;
    var prize = roll(c.prizes);
    var row = $('spinRow');
    row.innerHTML = ''; row.style.transition = 'none'; row.style.transform = 'translateX(0)';
    var N = 40, W = 32;
    for (var i = 0; i < N; i++) {
      var p = i === W ? prize : c.prizes[Math.floor(Math.random() * c.prizes.length)];
      var el = document.createElement('div');
      el.className = 'si';
      el.innerHTML = '<div class="e">' + em(p.name) + '</div><span>' + p.name + '</span>';
      row.appendChild(el);
    }
    sfx('open'); $('spin').classList.add('on');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var iw = 80, mid = Math.min(window.innerWidth, 480) / 2;
        var tx = -(W * iw - mid + iw / 2 + (Math.random() - 0.5) * 20);
        row.style.transition = 'transform 4s cubic-bezier(0.12,0.75,0.12,1)';
        row.style.transform = 'translateX(' + tx + 'px)';
        setTimeout(function () {
          if (row.children[W]) row.children[W].classList.add('win');
          setTimeout(function () {
            if (id === 'free') user.last_free = Date.now();
            if (prize.name.indexOf('★') !== -1) user.balance = (user.balance || 0) + prize.value;
            else {
              if (!user.inventory) user.inventory = [];
              user.inventory.unshift({ id: Date.now() + Math.random(), name: prize.name, value: prize.value, nft: !!prize.nft });
            }
            if (db) db.collection('drops').add({ uid: user.id, name: user.first_name || 'Игрок', prize: prize.name, value: prize.value, ts: Date.now() }).catch(function () {});
            save(); renderUser(); renderCases();
            $('spin').classList.remove('on'); opening = false;
            $('resI').textContent = em(prize.name);
            $('resN').textContent = prize.name + (prize.nft ? ' · NFT' : '');
            $('resV').textContent = '+' + prize.value + ' ★';
            sfx('win'); $('modRes').classList.add('on');
          }, 500);
        }, 4100);
      });
    });
  }

  /* ===== Inventory ===== */
  function renderInv() {
    var g = $('inv'); if (!g) return;
    var inv = (user && user.inventory) || [];
    if (!inv.length) { g.innerHTML = '<div class="empty">Пока пусто</div>'; return; }
    g.innerHTML = '';
    inv.forEach(function (item, idx) {
      var r = document.createElement('div');
      r.className = 'ir' + (item.nft ? ' nft' : '');
      r.innerHTML = '<div class="ip">' + em(item.name) + '</div><div class="ii"><div class="in">' + item.name + '</div><div class="is">' + (item.nft ? 'NFT' : 'Подарок') + '</div></div><div class="iv">' + item.value + ' ★</div>';
      r.onclick = function () {
        selItem = { item: item, idx: idx };
        $('itI').textContent = em(item.name);
        $('itN').textContent = item.name;
        $('itV').textContent = item.value + ' ★';
        $('btnSell').textContent = 'Продать за ' + item.value + ' ★';
        $('modItem').classList.add('on');
      };
      g.appendChild(r);
    });
  }

  function renderLb() {
    var box = $('lb'); if (!box) return;
    box.innerHTML = '<div class="empty">Загрузка...</div>';
    if (!db) { box.innerHTML = '<div class="empty">Нет связи</div>'; return; }
    db.collection('users').limit(50).get().then(function (snap) {
      var arr = [];
      snap.forEach(function (doc) { var d = doc.data(); arr.push({ name: d.first_name || 'Игрок', photo: d.photo_url, spent: d.total_spent || 0 }); });
      arr.sort(function (a, b) { return b.spent - a.spent; });
      arr = arr.filter(function (x) { return x.spent > 0; }).slice(0, 20);
      if (!arr.length) { box.innerHTML = '<div class="empty">Пока пусто</div>'; return; }
      box.innerHTML = '';
      arr.forEach(function (d, i) {
        var r = document.createElement('div');
        r.className = 'lr' + (i < 3 ? ' t' + (i + 1) : '');
        var av = d.photo ? '<img src="' + d.photo + '" alt="">' : (d.name[0] || '?').toUpperCase();
        r.innerHTML = '<div class="lrank">' + (i + 1) + '</div><div class="lav">' + av + '</div><div class="linfo"><div class="ln">' + d.name + '</div><div class="ls">слито ★</div></div><div class="lv">' + d.spent.toLocaleString() + '</div>';
        box.appendChild(r);
      });
    }).catch(function () { box.innerHTML = '<div class="empty">Ошибка</div>'; });
  }

  function renderProf() {
    var c = $('prof'); if (!c || !user) return;
    var av = user.photo_url ? '<img src="' + user.photo_url + '" alt="">' : ((user.first_name || '?')[0] || '?').toUpperCase();
    var adminBtn = ADMIN_IDS.indexOf(user.id) !== -1
      ? '<button type="button" class="btn" id="btnOpenAdmin" style="margin-top:14px">Админ-панель</button>'
      : '';
    c.innerHTML = '<div class="bav">' + av + '</div><div class="pn">' + (user.first_name || 'Игрок') + '</div><div class="pid">ID: ' + user.id + (user.username ? ' · @' + user.username : '') + '</div><div class="ps"><div class="pst"><div class="pv">' + (user.balance || 0) + '</div><div class="pl">Баланс ★</div></div><div class="pst"><div class="pv">' + ((user.inventory || []).length) + '</div><div class="pl">Предметов</div></div><div class="pst"><div class="pv">' + (user.total_deposited || 0) + '</div><div class="pl">Пополнено</div></div><div class="pst"><div class="pv">' + (user.total_spent || 0) + '</div><div class="pl">Слито ★</div></div></div>' + adminBtn;
    var ba = $('btnOpenAdmin');
    if (ba) ba.onclick = function () { $('modAdmin').classList.add('on'); };
  }

  /* ===== Games ===== */
  function openGame(type) {
    if (type === 'pickaxe') { openPickaxe(); return; }
    var titles = { roulette: 'Рулетка', upgrade: 'Апгрейд', crash: 'Краш' };
    $('gTitle').textContent = titles[type] || 'Игра';
    var body = $('gBody');
    if (type === 'roulette') {
      body.innerHTML = '<div class="fs"><label>Ставка (★)</label><input type="number" id="betA" value="10" min="1"/><label>Цвет</label><select id="betC"><option value="red">Красное ×2</option><option value="black">Чёрное ×2</option><option value="green">Зелёное ×14</option></select><button type="button" class="btn" id="btnBet">Поставить</button><div id="gRes"></div></div>';
    } else if (type === 'upgrade') {
      body.innerHTML = '<div class="fs"><label>Ставка (★)</label><input type="number" id="betA" value="10" min="1"/><label>Множитель</label><input type="number" id="betT" value="2" min="1.1" max="10" step="0.1"/><button type="button" class="btn" id="btnBet">Апгрейд</button><div id="gRes"></div></div>';
    } else {
      body.innerHTML = '<div class="fs"><label>Ставка (★)</label><input type="number" id="betA" value="10" min="1"/><label>Цель (×)</label><input type="number" id="betT" value="1.5" min="1.01" max="50" step="0.01"/><button type="button" class="btn" id="btnBet">Играть</button><div id="gRes"></div></div>';
    }
    $('btnBet').onclick = function () { playGame(type); };
    $('modGame').classList.add('on');
  }

  function playGame(type) {
    var amount = parseInt($('betA').value, 10) || 0;
    if (amount < 1) { toast('Минимум 1 ★', 'error'); return; }
    if ((user.balance || 0) < amount) { toast('Недостаточно ★', 'error'); return; }
    user.balance -= amount;
    user.total_spent = (user.total_spent || 0) + amount;
    var win = 0, result = '';
    if (type === 'roulette') {
      var ch = $('betC').value, r = Math.random();
      var out = r < 0.027 ? 'green' : r < 0.5135 ? 'red' : 'black';
      var nm = { red: 'Красное', black: 'Чёрное', green: 'Зелёное' };
      if (ch === out) { win = Math.floor(amount * (out === 'green' ? 14 : 2)); result = nm[out] + ' — WIN'; }
      else result = nm[out] + ' — LOSE';
    } else if (type === 'upgrade') {
      var mult = Math.max(1.1, Math.min(10, parseFloat($('betT').value) || 2));
      if (Math.random() < 1 / mult) { win = Math.floor(amount * mult); result = '×' + mult + ' WIN'; }
      else result = '×' + mult + ' LOSE';
    } else {
      var rr = Math.random();
      var crash = rr < 0.04 ? 1.0 : Math.min(50, Math.max(1.01, +(0.99 / (1 - rr)).toFixed(2)));
      var cash = parseFloat($('betT').value) || 1.5;
      if (cash <= crash) { win = Math.floor(amount * cash); result = 'Crash @' + crash + 'x WIN'; }
      else result = 'Crash @' + crash + 'x LOSE';
    }
    user.balance += win; save(); renderUser();
    var el = $('gRes'); el.className = 'gr ' + (win > 0 ? 'w' : 'l');
    el.textContent = result + (win > 0 ? ' (+' + win + ' ★)' : '');
  }

  /* ===== PICKAXE GAME ===== */
  var PICKS = [
    { name: 'Деревянная кирка', emoji: '🪵', mult: 0.5, color: '#8B6914' },
    { name: 'Каменная кирка', emoji: '🪨', mult: 1.0, color: '#888' },
    { name: 'Железная кирка', emoji: '⚙️', mult: 1.5, color: '#a0b0c0' },
    { name: 'Золотая кирка', emoji: '🟡', mult: 2.5, color: '#f0c14b' },
    { name: 'Алмазная кирка', emoji: '💎', mult: 4.0, color: '#7fdbff' }
  ];
  var LAYERS = [
    { name: 'Земля', cls: 'dirt', reward: 0.3 },
    { name: 'Камень', cls: 'stone', reward: 0.5 },
    { name: 'Уголь', cls: 'coal', reward: 0.8 },
    { name: 'Железо', cls: 'iron', reward: 1.2 },
    { name: 'Золото', cls: 'gold', reward: 2.0 },
    { name: 'Алмаз', cls: 'diamond', reward: 3.5 }
  ];
  var pickState = { bet: 25, pick: null, depth: 0, timer: null, stopped: false };

  function pickChance(bet) {
    // higher bet = better pickaxe odds
    var boost = Math.min(0.4, (bet - 10) / 500);
    return [
      { p: PICKS[0], chance: 35 - boost * 30 },
      { p: PICKS[1], chance: 30 - boost * 10 },
      { p: PICKS[2], chance: 20 + boost * 10 },
      { p: PICKS[3], chance: 10 + boost * 15 },
      { p: PICKS[4], chance: 5 + boost * 15 }
    ];
  }

  function openPickaxe() {
    pickState = { bet: 25, pick: null, depth: 0, timer: null, stopped: false };
    $('pickBet').value = 25;
    document.querySelectorAll('.pbet').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-a') === '25'); });
    showPickPhase(1);
    $('pickGame').classList.add('on');
  }

  function showPickPhase(n) {
    for (var i = 1; i <= 4; i++) {
      var el = $('pickPhase' + i);
      if (el) el.classList.toggle('hide', i !== n);
    }
  }

  function startPickSpin() {
    var bet = parseInt($('pickBet').value, 10) || 0;
    if (bet < 10) { toast('Минимум 10 ★', 'error'); return; }
    if ((user.balance || 0) < bet) { toast('Недостаточно ★', 'error'); return; }
    user.balance -= bet;
    user.total_spent = (user.total_spent || 0) + bet;
    pickState.bet = bet;
    save(); renderUser();

    var chances = pickChance(bet);
    var total = 0;
    chances.forEach(function (c) { total += c.chance; });
    var r = Math.random() * total, chosen = chances[0].p;
    for (var i = 0; i < chances.length; i++) {
      r -= chances[i].chance;
      if (r <= 0) { chosen = chances[i].p; break; }
    }
    pickState.pick = chosen;

    showPickPhase(2);
    var row = $('pickSpinRow');
    row.innerHTML = ''; row.style.transition = 'none'; row.style.transform = 'translateX(0)';
    var N = 36, W = 28;
    for (var j = 0; j < N; j++) {
      var pk = j === W ? chosen : PICKS[Math.floor(Math.random() * PICKS.length)];
      var el = document.createElement('div');
      el.className = 'pki';
      el.innerHTML = pk.emoji + '<span>' + pk.name.replace(' кирка', '') + '</span>';
      row.appendChild(el);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var iw = 84, mid = Math.min(window.innerWidth, 480) / 2;
        var tx = -(W * iw - mid + iw / 2);
        row.style.transition = 'transform 3.2s cubic-bezier(0.12,0.75,0.12,1)';
        row.style.transform = 'translateX(' + tx + 'px)';
        setTimeout(function () {
          if (row.children[W]) row.children[W].classList.add('win');
          setTimeout(startMining, 700);
        }, 3300);
      });
    });
  }

  function startMining() {
    showPickPhase(3);
    pickState.depth = 0;
    pickState.stopped = false;
    $('pickMineTitle').textContent = pickState.pick.name;
    $('minePick').textContent = '⛏';
    $('minePick').style.top = '20px';
    $('mineHint').textContent = 'Жми СТОП вовремя, чтобы забрать лут!';
    $('mineStop').disabled = false;
    $('mineStop').style.display = '';

    var layers = $('mineLayers');
    layers.innerHTML = '';
    // build layers from bottom (deepest first in DOM for bottom stack)
    for (var i = LAYERS.length - 1; i >= 0; i--) {
      var L = LAYERS[i];
      var div = document.createElement('div');
      div.className = 'ml ' + L.cls;
      div.id = 'ml' + i;
      div.textContent = L.name;
      layers.appendChild(div);
    }
    $('mineDepth').textContent = 'Глубина: 0м';

    var maxDepth = LAYERS.length;
    // better pickaxe digs faster and can go deeper safely
    var speed = 700 - pickState.pick.mult * 80;
    if (speed < 350) speed = 350;

    function dig() {
      if (pickState.stopped) return;
      if (pickState.depth >= maxDepth) {
        finishMine(true);
        return;
      }
      var layerEl = $('ml' + pickState.depth);
      if (layerEl) {
        sfx('dig'); $('minePick').classList.add('hit');
        setTimeout(function () { $('minePick').classList.remove('hit'); }, 200);
        layerEl.classList.add('broken');
        pickState.depth++;
        $('minePick').style.top = (20 + pickState.depth * 28) + 'px';
        $('mineDepth').textContent = 'Глубина: ' + (pickState.depth * 10) + 'м · ' + (LAYERS[pickState.depth - 1] ? LAYERS[pickState.depth - 1].name : '');
      }
      // risk of break increases with depth, reduced by pick quality
      var breakChance = (pickState.depth * 0.08) / pickState.pick.mult;
      if (Math.random() < breakChance && pickState.depth > 1) {
        finishMine(false);
        return;
      }
      pickState.timer = setTimeout(dig, speed);
    }
    pickState.timer = setTimeout(dig, 400);
  }

  function stopMine() {
    if (pickState.stopped) return;
    pickState.stopped = true;
    if (pickState.timer) clearTimeout(pickState.timer);
    finishMine(true);
  }

  function finishMine(success) {
    pickState.stopped = true;
    if (pickState.timer) clearTimeout(pickState.timer);
    $('mineStop').disabled = true;

    var depth = pickState.depth;
    var win = 0;
    if (success && depth > 0) {
      var layerReward = 0;
      for (var i = 0; i < depth; i++) layerReward += LAYERS[i].reward;
      win = Math.floor(pickState.bet * pickState.pick.mult * layerReward * (0.7 + Math.random() * 0.5));
    }

    user.balance += win;
    save(); renderUser();

    setTimeout(function () {
      showPickPhase(4);
      if (win > 0) {
        $('pickResTitle').textContent = 'Успех!';
        $('pickResVal').textContent = '+' + win + ' ★';
        $('pickResVal').style.color = 'var(--ok)';
      } else {
        $('pickResTitle').textContent = 'Кирка сломалась';
        $('pickResVal').textContent = '0 ★';
        $('pickResVal').style.color = 'var(--no)';
      }
    }, 600);
  }

  /* ===== Bind ===== */
  function bind() {
    document.body.addEventListener('touchstart', function () { audioCtx(); }, { once: true });
    document.body.addEventListener('click', function () { audioCtx(); }, { once: true });
    $('nav').onclick = function (e) {
      var b = e.target.closest('.nb'); if (!b) return;
      e.preventDefault();
      sfx('tab');
      tab(b.getAttribute('data-t'));
    };
    document.querySelectorAll('.gcard').forEach(function (c) {
      c.onclick = function () { openGame(c.getAttribute('data-g')); };
    });
    $('shCaseBg').onclick = function () { $('shCase').classList.remove('on'); };
    $('btnOpen').onclick = function () {
      if (!selCase || this.disabled || opening) return;
      $('shCase').classList.remove('on');
      doOpen(selCase);
    };
    $('btnResOk').onclick = function () { $('modRes').classList.remove('on'); };
    $('btnItemX').onclick = function () { $('modItem').classList.remove('on'); };
    $('btnGameX').onclick = function () { $('modGame').classList.remove('on'); };
    $('btnSell').onclick = function () {
      if (!selItem) return;
      user.balance = (user.balance || 0) + selItem.item.value;
      user.inventory.splice(selItem.idx, 1);
      save(); renderUser(); renderInv();
      $('modItem').classList.remove('on');
      toast('Продано +' + selItem.item.value + ' ★', 'success');
    };
    $('btnWd').onclick = function () {
      if (!selItem || !db) { toast('Нет связи', 'error'); return; }
      db.collection('withdraws').add({
        uid: user.id, username: user.username || '', first_name: user.first_name || '',
        item_name: selItem.item.name, item_value: selItem.item.value, status: 'pending', ts: Date.now()
      }).then(function () {
        user.inventory.splice(selItem.idx, 1); save(); renderInv();
        $('modItem').classList.remove('on');
        toast('Заявка на вывод отправлена', 'success');
      }).catch(function () { toast('Ошибка', 'error'); });
    };

    // deposit
    $('btnDeposit').onclick = function () { $('modPay').classList.add('on'); };
    $('btnPayX').onclick = function () { $('modPay').classList.remove('on'); };
    document.querySelectorAll('.pre').forEach(function (b) {
      b.onclick = function () {
        $('payAmt').value = b.getAttribute('data-a');
        document.querySelectorAll('.pre').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      };
    });
    $('btnPayGo').onclick = function () {
      var a = parseInt($('payAmt').value, 10) || 0;
      if (a < 50) { toast('Минимум 50', 'error'); return; }
      var bot = 'IzbrannikStar_bot';
      if (tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/' + bot + '?start=pay_' + a);
      else window.open('https://t.me/' + bot + '?start=pay_' + a, '_blank');
      $('modPay').classList.remove('on');
      toast('Откройте счёт в боте', 'success');
    };

    // pickaxe
    document.querySelectorAll('.pbet').forEach(function (b) {
      b.onclick = function () {
        $('pickBet').value = b.getAttribute('data-a');
        document.querySelectorAll('.pbet').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      };
    });
    $('pickSpin').onclick = startPickSpin;
    $('mineStop').onclick = stopMine;
    $('pickAgain').onclick = function () { openPickaxe(); };
    $('pickClose').onclick = function () { $('pickGame').classList.remove('on'); };

    // Admin panel (writes via Firebase client — reliable)
    var ax = $('btnAdminX');
    if (ax) ax.onclick = function () { $('modAdmin').classList.remove('on'); };
    var bg = $('btnAdmGive');
    if (bg) bg.onclick = function () {
      if (ADMIN_IDS.indexOf(user.id) === -1) { toast('Нет доступа', 'error'); return; }
      if (!db) { toast('Нет Firebase', 'error'); return; }
      var tid = parseInt($('admId').value, 10);
      var amt = parseInt($('admAmt').value, 10);
      if (!tid || isNaN(amt)) { toast('ID и сумма', 'error'); return; }
      var ref = db.collection('users').doc(String(tid));
      ref.get().then(function (snap) {
        var cur = 0;
        if (snap.exists && typeof snap.data().balance === 'number') cur = snap.data().balance;
        var next = cur + amt;
        return ref.set({
          id: tid,
          balance: next,
          last_active: Date.now()
        }, { merge: true }).then(function () {
          $('admRes').textContent = 'OK: ID ' + tid + ' → баланс ' + next + ' ★';
          sfx('win'); toast('Выдано ' + (amt >= 0 ? '+' : '') + amt + ' ★', 'success');
          if (tid === user.id) { user.balance = next; saveLocal(); renderUser(); }
        });
      }).catch(function (e) {
        $('admRes').textContent = 'Ошибка: ' + e.message;
        toast('Ошибка записи', 'error');
      });
    };
    var bf = $('btnAdmFree');
    if (bf) bf.onclick = function () {
      if (ADMIN_IDS.indexOf(user.id) === -1) return;
      if (!db) { toast('Нет Firebase', 'error'); return; }
      var tid = parseInt($('admId').value, 10);
      if (!tid) { toast('Укажи ID', 'error'); return; }
      db.collection('users').doc(String(tid)).set({ last_free: 0, id: tid }, { merge: true }).then(function () {
        $('admRes').textContent = 'Фри-кейс сброшен для ' + tid;
        toast('Фри сброшен', 'success');
      }).catch(function () { toast('Ошибка', 'error'); });
    };

    $('pickX').onclick = function () {
      if (pickState.timer) clearTimeout(pickState.timer);
      pickState.stopped = true;
      $('pickGame').classList.remove('on');
    };
  }

  /* ===== Init ===== */
  function init() {
    var fill = $('ldFill'), txt = $('ldTxt');
    function prog(p, t) { if (fill) fill.style.width = p + '%'; if (txt) txt.textContent = t; }

    prog(20, 'Telegram...');
    var tu = tgUser();
    var loc = loadLocal(tu.id);
    user = {
      id: tu.id, first_name: tu.first_name || 'Игрок', username: tu.username || '',
      photo_url: tu.photo_url || null,
      balance: loc ? (loc.balance || 0) : 0,
      inventory: loc ? (loc.inventory || []) : [],
      last_free: loc ? (loc.last_free || 0) : 0,
      total_deposited: loc ? (loc.total_deposited || 0) : 0,
      total_spent: loc ? (loc.total_spent || 0) : 0
    };

    prog(50, 'Интерфейс...');
    renderUser(); renderCases(); bind();

    prog(70, 'Сервер...');
    function done() {
      prog(100, 'Готово');
      setTimeout(function () {
        $('loader').classList.add('hide');
        $('app').classList.remove('hide');
      }, 250);
    }

    function fb() {
      if (typeof firebase === 'undefined') { setTimeout(fb, 120); return; }
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp({
            apiKey: 'AIzaSyAPTTDTPzDpKQjpPvze1IBsJQJw74_ua34',
            authDomain: 'custom-graphics-36c50.firebaseapp.com',
            projectId: PROJECT,
            storageBucket: 'custom-graphics-36c50.firebasestorage.app',
            messagingSenderId: '130011001835',
            appId: '1:130011001835:web:1ba6e4e4b3c7a6f0b7dfae'
          });
        }
        db = firebase.firestore();
        uref = db.collection('users').doc(String(tu.id));
        uref.get().then(function (s) {
          if (s.exists) applyServer(s.data()); else save();
          done();
        }).catch(done);
        uref.onSnapshot(function (s) { if (s.exists) applyServer(s.data()); }, function () {});
        uref.set({ last_active: Date.now(), online: true }, { merge: true }).catch(function () {});
        setInterval(function () { if (uref) uref.set({ last_active: Date.now(), online: true }, { merge: true }).catch(function () {}); }, 25000);
        setInterval(function () {
          if (!db) return;
          db.collection('users').where('last_active', '>', Date.now() - 120000).get().then(function (s) {
            var n = $('onlineNum'); if (n) n.textContent = String(Math.max(1, s.size));
          }).catch(function () {});
        }, 20000);
        try {
          db.collection('drops').orderBy('ts', 'desc').limit(12).onSnapshot(function (snap) {
            var items = []; snap.forEach(function (d) { items.push(d.data()); });
            var tr = $('liveTrack'); if (!tr) return;
            if (!items.length) { tr.textContent = 'Дропы появятся здесь...'; return; }
            var h = items.map(function (d) {
              return '<span><b>' + (d.name || 'Игрок') + '</b> → ' + (d.prize || '?') + ' <span class="lv">' + (d.value || 0) + '★</span> · </span>';
            }).join('');
            tr.innerHTML = h + h;
          }, function () {});
        } catch (e) {}
      } catch (e) { done(); }
    }
    fb();
    setTimeout(function () { if (!$('loader').classList.contains('hide')) done(); }, 4000);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
