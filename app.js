(function () {
  'use strict';

  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    try { tg.ready(); tg.expand(); tg.setHeaderColor('#08080d'); tg.setBackgroundColor('#08080d'); } catch (e) {}
  }

  var ADMIN_IDS = [8133917568, 5198310704];
  var LS = 'iz_v6_';
  var CS_KEY = 'iz_user_v6';
  var user = null, opening = false, selCase = null, selItem = null;
  var mode = 'tg'; // tg | cs2

  function $(id) { return document.getElementById(id); }
  function toast(m, t) {
    var el = $('toast'); if (!el) return;
    el.textContent = m; el.className = 'toast on ' + (t === 'error' ? 'err' : t === 'success' ? 'ok' : '');
    setTimeout(function () { el.classList.remove('on'); }, 2800);
  }
  function tgUser() {
    try { if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user; } catch (e) {}
    return { id: 999001, first_name: 'Test', username: 'test', photo_url: null };
  }

  /* sounds */
  var _actx = null;
  function audioCtx() {
    if (!_actx) { try { _actx = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
    if (_actx.state === 'suspended') _actx.resume();
    return _actx;
  }
  function beep(freq, dur, type, vol, delay) {
    try {
      var ctx = audioCtx(); if (!ctx) return;
      var t0 = ctx.currentTime + (delay || 0);
      var o = ctx.createOscillator(), g = ctx.createGain();
      o.type = type || 'sine'; o.frequency.value = freq;
      g.gain.setValueAtTime(vol || 0.08, t0);
      g.gain.exponentialRampToValueAtTime(0.001, t0 + (dur || 0.1));
      o.connect(g); g.connect(ctx.destination);
      o.start(t0); o.stop(t0 + (dur || 0.1) + 0.02);
    } catch (e) {}
  }
  function sfx(n) {
    if (n === 'click' || n === 'tab') beep(500, 0.03, 'sine', 0.03);
    else if (n === 'open') { beep(300, 0.08, 'triangle', 0.06); beep(450, 0.1, 'triangle', 0.05, 0.08); }
    else if (n === 'win') { beep(523, 0.1, 'sine', 0.1); beep(659, 0.1, 'sine', 0.1, 0.1); beep(784, 0.18, 'sine', 0.12, 0.2); }
    else if (n === 'lose') { beep(200, 0.15, 'sawtooth', 0.05); }
    else if (n === 'dig') beep(90, 0.05, 'triangle', 0.07);
  }

  function icon(name) {
    if (window.giftIcon) return window.giftIcon(name);
    return '';
  }
  function caseImg(id) {
    if (mode === 'cs2') return skinIcon(activeCases()[id] ? activeCases()[id].name : 'CS2');
    return (window.CASE_IMG && window.CASE_IMG[id]) || icon('Toy Bear');
  }
  function gameImg(id) {
    return (window.GAME_IMG && window.GAME_IMG[id]) || '';
  }

  /* ===== CASES (English, TG prices) ===== */
  var CASES = {
    free: {
      id: 'free', name: 'Daily', price: 0, desc: 'Once every 24h', cls: 'free',
      prizes: [
        { name: '1 Star', value: 1, chance: 58 },
        { name: '2 Stars', value: 2, chance: 30 },
        { name: '5 Stars', value: 5, chance: 9 },
        { name: 'Toy Bear', value: 15, chance: 2.2 },
        { name: 'Eternal Rose', value: 25, chance: 0.7 },
        { name: 'Homemade Cake', value: 50, chance: 0.0999 },
        { name: 'Snow Mittens', value: 500, chance: 0.00005, nft: true },
        { name: 'Bunny Muffin', value: 510, chance: 0.00003, nft: true },
        { name: 'Ice Cream', value: 505, chance: 0.00002, nft: true }
        /* NFT total chance in Daily = 0.0001 */
      ]
    },
    cheap: {
      id: 'cheap', name: 'Base', price: 15, desc: 'Classic gifts', cls: 'cheap',
      prizes: [
        { name: 'Toy Bear', value: 15, chance: 35 },
        { name: 'Eternal Rose', value: 25, chance: 28 },
        { name: 'Homemade Cake', value: 50, chance: 18 },
        { name: 'Berry Box', value: 50, chance: 12 },
        { name: 'Cookie Heart', value: 50, chance: 5 },
        { name: 'B-Day Candle', value: 50, chance: 1.896 },
        { name: 'Snow Mittens', value: 500, chance: 0.0004, nft: true },
        { name: 'Jack-in-the-Box', value: 500, chance: 0.0003, nft: true },
        { name: 'Ice Cream', value: 505, chance: 0.0002, nft: true },
        { name: 'Top Hat', value: 530, chance: 0.0001, nft: true }
      ]
    },
    selected: {
      id: 'selected', name: 'Izbrannik', price: 100, desc: 'Market NFT rare', cls: 'sel',
      prizes: [
        { name: 'Homemade Cake', value: 50, chance: 28 },
        { name: 'Berry Box', value: 50, chance: 22 },
        { name: 'Cookie Heart', value: 50, chance: 18 },
        { name: 'B-Day Candle', value: 50, chance: 15 },
        { name: 'Love Candle', value: 50, chance: 10 },
        { name: 'Desk Calendar', value: 50, chance: 6.5 },
        { name: 'Ice Cream', value: 505, chance: 0.00015, nft: true },
        { name: 'Top Hat', value: 530, chance: 0.00012, nft: true },
        { name: 'Hypno Lollipop', value: 544, chance: 0.0001, nft: true },
        { name: 'Lunar Snake', value: 549, chance: 0.00008, nft: true },
        { name: 'Jester Hat', value: 550, chance: 0.00006, nft: true },
        { name: 'Party Sparkler', value: 587, chance: 0.00005, nft: true },
        { name: 'Magic Potion', value: 600, chance: 0.00004, nft: true },
        { name: 'Genie Lamp', value: 650, chance: 0.00003, nft: true },
        { name: 'Trapped Heart', value: 690, chance: 0.00002, nft: true },
        { name: 'Crystal Ball', value: 666, chance: 0.00001, nft: true }
      ]
    },
    vip: {
      id: 'vip', name: 'Pepe', price: 250, desc: 'Ultra rare collectibles', cls: 'vip',
      prizes: [
        { name: 'Homemade Cake', value: 50, chance: 30 },
        { name: 'Berry Box', value: 50, chance: 22 },
        { name: 'Desk Calendar', value: 50, chance: 18 },
        { name: 'Love Candle', value: 50, chance: 15 },
        { name: 'B-Day Candle', value: 50, chance: 12 },
        { name: 'Eternal Rose', value: 25, chance: 2.9 },
        { name: 'Vintage Cigar', value: 700, chance: 0.0002, nft: true },
        { name: 'Perfume Bottle', value: 710, chance: 0.00015, nft: true },
        { name: 'Kissed Frog', value: 721, chance: 0.00012, nft: true },
        { name: 'Jelly Bunny', value: 721, chance: 0.0001, nft: true },
        { name: 'Scared Cat', value: 721, chance: 0.00008, nft: true },
        { name: 'Spy Agaric', value: 814, chance: 0.00006, nft: true },
        { name: 'Astral Shard', value: 800, chance: 0.00005, nft: true },
        { name: 'Precious Peach', value: 900, chance: 0.00004, nft: true },
        { name: 'Plush Pepe', value: 900, chance: 0.00003, nft: true },
        { name: "Durov's Cap", value: 1000, chance: 0.00002, nft: true }
      ]
    }
  };


  /* CS2 cases — skins (admin test) */
  var CS2_CASES = {
    free: {
      id: 'free', name: 'Daily CS2', price: 0, desc: 'Once every 24h', cls: 'free',
      prizes: [
        { name: 'P250 | Sand Dune', value: 1, chance: 40, skin: true },
        { name: 'MP9 | Storm', value: 2, chance: 30, skin: true },
        { name: 'UMP-45 | Indigo', value: 3, chance: 18, skin: true },
        { name: 'Glock-18 | Groundwater', value: 5, chance: 8, skin: true },
        { name: 'AK-47 | Elite Build', value: 25, chance: 3.5, skin: true },
        { name: 'AWP | Safari Mesh', value: 40, chance: 0.499, skin: true },
        { name: 'AK-47 | Redline', value: 200, chance: 0.0007, skin: true, nft: true },
        { name: 'AWP | Asiimov', value: 400, chance: 0.0002, skin: true, nft: true },
        { name: 'Karambit | Doppler', value: 1200, chance: 0.0001, skin: true, nft: true }
      ]
    },
    cheap: {
      id: 'cheap', name: 'Base CS2', price: 15, desc: 'Blue / purple skins', cls: 'cheap',
      prizes: [
        { name: 'P250 | Sand Dune', value: 1, chance: 25, skin: true },
        { name: 'Five-SeveN | Forest Night', value: 2, chance: 22, skin: true },
        { name: 'MP7 | Army Recon', value: 3, chance: 20, skin: true },
        { name: 'USP-S | Forest Leaves', value: 5, chance: 15, skin: true },
        { name: 'M4A4 | Magnesium', value: 15, chance: 10, skin: true },
        { name: 'AK-47 | Elite Build', value: 25, chance: 6, skin: true },
        { name: 'AWP | Worm God', value: 50, chance: 1.998, skin: true },
        { name: 'AK-47 | Redline', value: 200, chance: 0.001, skin: true, nft: true },
        { name: 'M4A1-S | Printstream', value: 350, chance: 0.0007, skin: true, nft: true },
        { name: 'AWP | Asiimov', value: 400, chance: 0.0003, skin: true, nft: true }
      ]
    },
    selected: {
      id: 'selected', name: 'Izbrannik CS2', price: 100, desc: 'High tier skins', cls: 'sel',
      prizes: [
        { name: 'AK-47 | Elite Build', value: 25, chance: 28, skin: true },
        { name: 'M4A4 | Magnesium', value: 15, chance: 24, skin: true },
        { name: 'AWP | Worm God', value: 50, chance: 20, skin: true },
        { name: 'USP-S | Kill Confirmed', value: 80, chance: 15, skin: true },
        { name: 'Glock-18 | Water Elemental', value: 40, chance: 10, skin: true },
        { name: 'AK-47 | Redline', value: 200, chance: 2.5, skin: true },
        { name: 'M4A1-S | Printstream', value: 350, chance: 0.4985, skin: true },
        { name: 'AWP | Asiimov', value: 400, chance: 0.001, skin: true, nft: true },
        { name: 'Butterfly Knife | Slaughter', value: 900, chance: 0.0004, skin: true, nft: true },
        { name: 'Karambit | Doppler', value: 1200, chance: 0.0001, skin: true, nft: true }
      ]
    },
    vip: {
      id: 'vip', name: 'Pepe CS2', price: 250, desc: 'Knives & covers', cls: 'vip',
      prizes: [
        { name: 'AK-47 | Redline', value: 200, chance: 30, skin: true },
        { name: 'AWP | Asiimov', value: 400, chance: 25, skin: true },
        { name: 'M4A1-S | Printstream', value: 350, chance: 22, skin: true },
        { name: 'USP-S | Kill Confirmed', value: 80, chance: 15, skin: true },
        { name: 'Desert Eagle | Blaze', value: 300, chance: 6, skin: true },
        { name: 'Butterfly Knife | Slaughter', value: 900, chance: 1.5, skin: true },
        { name: 'Karambit | Doppler', value: 1200, chance: 0.4985, skin: true },
        { name: 'Karambit | Fade', value: 1500, chance: 0.001, skin: true, nft: true },
        { name: 'Sport Gloves | Pandora', value: 2000, chance: 0.0004, skin: true, nft: true },
        { name: 'Karambit | Case Hardened', value: 2500, chance: 0.0001, skin: true, nft: true }
      ]
    }
  };

  function activeCases() {
    return mode === 'cs2' ? CS2_CASES : CASES;
  }
  function activeInv() {
    if (!user) return [];
    return mode === 'cs2' ? (user.inventory_cs2 || []) : (user.inventory || []);
  }
  function setActiveInv(arr) {
    if (!user) return;
    if (mode === 'cs2') user.inventory_cs2 = arr;
    else user.inventory = arr;
  }
  function isAdminUser() {
    return user && ADMIN_IDS.indexOf(user.id) !== -1;
  }
  function skinIcon(name) {
    // simple colored plate with weapon initials
    var colors = ['#3d5a80','#ee6c4d','#293241','#98c1d9','#e0fbfc','#1b4332','#7f4f24','#5e60ce'];
    var h = 0;
    for (var i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) >>> 0;
    var bg = colors[h % colors.length];
    var label = name.split('|')[0].trim().slice(0, 6);
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="12" fill="' + bg + '"/><text x="32" y="36" text-anchor="middle" fill="#fff" font-size="11" font-family="sans-serif" font-weight="700">' + label.replace(/&/g,'') + '</text></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }
  function itemIcon(name, isSkin) {
    if (isSkin || mode === 'cs2') return skinIcon(name);
    return icon(name);
  }

  function roll(prizes) {
    var t = 0, i;
    for (i = 0; i < prizes.length; i++) t += prizes[i].chance;
    var r = Math.random() * t;
    for (i = 0; i < prizes.length; i++) { r -= prizes[i].chance; if (r <= 0) return prizes[i]; }
    return prizes[prizes.length - 1];
  }

  /* ===== SYNC: CloudStorage (cross-device) + localStorage ===== */
  function pack() {
    return JSON.stringify({
      balance: user.balance || 0,
      inventory: user.inventory || [],
      inventory_cs2: user.inventory_cs2 || [],
      last_free: user.last_free || 0,
      total_deposited: user.total_deposited || 0,
      total_spent: user.total_spent || 0,
      stats: user.stats || {},
      updated_at: Date.now()
    });
  }

  function unpack(raw, into) {
    try {
      var d = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!d || typeof d !== 'object') return into;
      if (typeof d.balance === 'number') into.balance = d.balance;
      if (Array.isArray(d.inventory)) into.inventory = d.inventory;
      if (Array.isArray(d.inventory_cs2)) into.inventory_cs2 = d.inventory_cs2;
      if (typeof d.last_free === 'number') into.last_free = d.last_free;
      if (typeof d.total_deposited === 'number') into.total_deposited = d.total_deposited;
      if (typeof d.total_spent === 'number') into.total_spent = d.total_spent;
      if (d.stats) into.stats = d.stats;
      into._updated = d.updated_at || 0;
      return into;
    } catch (e) { return into; }
  }

  function saveLocal() {
    if (!user) return;
    try { localStorage.setItem(LS + user.id, pack()); } catch (e) {}
  }

  function loadLocal(id) {
    try {
      var r = localStorage.getItem(LS + id);
      return r ? JSON.parse(r) : null;
    } catch (e) { return null; }
  }

  function cloudSave(cb) {
    saveLocal();
    if (!tg || !tg.CloudStorage) { if (cb) cb(false); return; }
    try {
      tg.CloudStorage.setItem(CS_KEY, pack(), function (err) {
        if (cb) cb(!err);
      });
    } catch (e) { if (cb) cb(false); }
  }

  function cloudLoad(cb) {
    if (!tg || !tg.CloudStorage) { cb(null); return; }
    try {
      tg.CloudStorage.getItem(CS_KEY, function (err, val) {
        if (err || !val) { cb(null); return; }
        try { cb(JSON.parse(val)); } catch (e) { cb(null); }
      });
    } catch (e) { cb(null); }
  }

  function save() {
    saveLocal();
    cloudSave();
  }

  function applyDeepLink() {
    var bal = null, free = false;
    try {
      var q = new URLSearchParams(window.location.search || '');
      if (q.get('sync')) bal = parseInt(q.get('sync'), 10);
      if (q.get('free') === '1') free = true;
    } catch (e) {}
    try {
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.start_param) {
        var sp = String(tg.initDataUnsafe.start_param);
        if (sp.indexOf('sync_') === 0) bal = parseInt(sp.slice(5), 10);
        if (sp === 'free_ok') free = true;
      }
    } catch (e) {}
    if (!user) return;
    if (typeof bal === 'number' && !isNaN(bal) && bal >= 0) {
      user.balance = bal;
      toast('Balance synced: ' + bal + ' Stars', 'success');
      sfx('win');
    }
    if (free) {
      user.last_free = 0;
      toast('Free case ready!', 'success');
    }
    // Admin completed withdraw: ?wd_ok=WDID
    try {
      var q2 = new URLSearchParams(window.location.search || '');
      var wdOk = q2.get('wd_ok');
      if (wdOk && user.inventory) {
        var before = user.inventory.length;
        user.inventory = user.inventory.filter(function (it) {
          return !(it.wd_id && (String(it.wd_id) === wdOk || String(it.wd_id).slice(-8) === wdOk));
        });
        if (user.inventory.length < before) {
          toast('Withdraw completed — item removed', 'success');
          sfx('win');
        }
      }
    } catch (e) {}
    save();
  }

  function renderUser() {
    if (!user) return;
    $('username').textContent = user.first_name || 'Player';
    $('balanceStars').textContent = (user.balance || 0).toLocaleString();
    var av = $('avatar');
    if (user.photo_url) av.innerHTML = '<img src="' + user.photo_url + '" alt="">';
    else av.textContent = ((user.first_name || '?')[0] || '?').toUpperCase();
  }


  function renderGames() {
    var box = $('gamesList'); if (!box) return;
    var list = [
      { id: 'roulette', title: 'Roulette', desc: '5s bet · shared wheel' },
      { id: 'crash', title: 'Crash', desc: '5s bet · rocket flight' },
      { id: 'upgrade', title: 'Upgrade', desc: 'NFT · chance % · wheel' },
      { id: 'plinko', title: 'Plinko', desc: 'Drop balls · multipliers' },
      { id: 'pickaxe', title: 'Pickaxe', desc: 'Mine · stop in time' }
    ];
    box.innerHTML = '';
    list.forEach(function (g) {
      var el = document.createElement('div');
      el.className = 'gcard';
      el.setAttribute('data-g', g.id);
      el.innerHTML = '<div class="gico"><img src="' + gameImg(g.id) + '" alt="" width="48" height="48" style="border-radius:12px"></div>' +
        '<div class="ginfo"><div class="gt">' + g.title + '</div><div class="gd">' + g.desc + '</div></div>' +
        '<button type="button" class="gbtn">Play</button>';
      el.onclick = function () {
        if (g.id === 'roulette' || g.id === 'crash') openArena(g.id);
        else if (g.id === 'upgrade') openUpgrade();
        else if (g.id === 'plinko') openPlinko();
        else if (g.id === 'pickaxe') openPickaxe();
      };
      box.appendChild(el);
    });
  }


  function setMode(m) {
    if (m === 'cs2' && !isAdminUser()) {
      mode = 'cs2';
      document.getElementById('app').classList.add('mode-cs2');
      document.getElementById('app').classList.remove('mode-tg');
      document.querySelectorAll('.mode-btn').forEach(function (b) {
        b.classList.toggle('on', b.getAttribute('data-mode') === 'cs2');
      });
      var lock = $('cs2Lock');
      if (lock) lock.classList.remove('hide');
      // hide cases content under lock feel
      var grid = $('casesGrid');
      if (grid) grid.innerHTML = '';
      renderInv();
      renderProf();
      toast('CS2 temporarily unavailable', 'error');
      return;
    }
    mode = m;
    var lock = $('cs2Lock');
    if (lock) lock.classList.toggle('hide', m !== 'cs2' || isAdminUser());
    if (m === 'cs2' && isAdminUser() && lock) lock.classList.add('hide');
    document.getElementById('app').classList.toggle('mode-cs2', m === 'cs2');
    document.getElementById('app').classList.toggle('mode-tg', m === 'tg');
    document.querySelectorAll('.mode-btn').forEach(function (b) {
      b.classList.toggle('on', b.getAttribute('data-mode') === m);
    });
    renderCases();
    renderInv();
    renderProf();
    var h = document.querySelector('#tab-cases .h2');
    if (h) h.textContent = m === 'cs2' ? 'CS2 Cases' : 'Cases';
    var hi = document.querySelector('#tab-inventory .h2');
    if (hi) hi.textContent = m === 'cs2' ? 'CS2 Inventory' : 'Inventory';
  }

  /* tabs */
  function tab(name) {
    document.querySelectorAll('.nb').forEach(function (b) { b.classList.toggle('on', b.getAttribute('data-t') === name); });
    document.querySelectorAll('.tab').forEach(function (t) { t.classList.toggle('on', t.id === 'tab-' + name); });
    if (name === 'inventory') renderInv();
    if (name === 'top') renderLb();
    if (name === 'profile') renderProf();
  }

  /* cases */
  function renderCases() {
    var g = $('casesGrid'); if (!g || !user) return;
    g.innerHTML = '';
    var now = Date.now();
    Object.keys(activeCases()).forEach(function (k) {
      var c = activeCases()[k], ph;
      if (c.id === 'free') {
        var left = (user.last_free || 0) + 86400000 - now;
        if (left > 0) {
          var h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
          ph = '<div class="cp w">' + h + 'h ' + m + 'm</div>';
        } else ph = '<div class="cp f">Free</div>';
      } else ph = '<div class="cp">' + c.price + ' ★</div>';
      var el = document.createElement('div');
      el.className = 'cc';
      el.innerHTML = '<div class="cart ' + c.cls + '"><img src="' + caseImg(c.id) + '" alt="" loading="lazy"></div><div class="cn">' + c.name + '</div><div class="cd">' + c.desc + '</div>' + ph;
      el.onclick = function () { openPrev(c.id); };
      g.appendChild(el);
    });
  }

  function openPrev(id) {
    var c = activeCases()[id]; if (!c) return;
    selCase = id;
    $('cpN').textContent = c.name;
    $('cpD').textContent = c.desc;
    $('cpArt').innerHTML = '<img src="' + caseImg(c.id) + '" width="52" height="52" style="border-radius:12px;object-fit:cover">';
    var now = Date.now(), pr = $('cpPr'), btn = $('btnOpen'), ok = true;
    if (c.id === 'free') {
      var left = (user.last_free || 0) + 86400000 - now;
      if (left > 0) {
        ok = false;
        var h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
        pr.className = 'cp-pr w'; pr.textContent = 'In ' + h + 'h ' + m + 'm';
        btn.textContent = 'Unavailable';
      } else { pr.className = 'cp-pr f'; pr.textContent = 'Free'; btn.textContent = 'Open free'; }
    } else {
      pr.className = 'cp-pr'; pr.textContent = c.price + ' ★';
      if ((user.balance || 0) < c.price) { ok = false; btn.textContent = 'Not enough Stars'; }
      else btn.textContent = 'Open for ' + c.price + ' ★';
    }
    btn.disabled = !ok;
    var list = $('cpList'); list.innerHTML = '';
    c.prizes.slice().sort(function (a, b) { return b.chance - a.chance; }).forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'pr' + (p.nft ? ' nft' : '');
      row.innerHTML = '<div class="pp"><img src="' + itemIcon(p.name, p.skin) + '" width="36" height="36" style="border-radius:8px"></div><div class="pi"><div class="pn2">' + p.name + (p.nft ? ' · Rare' : '') + '</div><div class="pc">' + p.chance + '%</div></div><div class="pv2">' + p.value + ' ★</div>';
      list.appendChild(row);
    });
    $('shCase').classList.add('on');
  }

  function doOpen(id) {
    if (opening) return;
    var c = activeCases()[id]; if (!c) return;
    if (id === 'free') {
      if (Date.now() < (user.last_free || 0) + 86400000) { toast('Free not ready', 'error'); return; }
    } else {
      if ((user.balance || 0) < c.price) { toast('Not enough Stars', 'error'); return; }
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
      el.innerHTML = '<img src="' + itemIcon(p.name, p.skin) + '" width="40" height="40" style="border-radius:8px"><span>' + p.name + '</span>';
      row.appendChild(el);
    }
    sfx('open');
    $('spin').classList.add('on');
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var iw = 80, mid = Math.min(window.innerWidth, 480) / 2;
        var tx = -(W * iw - mid + iw / 2 + (Math.random() - 0.5) * 20);
        row.style.transition = 'transform 3.2s cubic-bezier(0.12,0.75,0.12,1)';
        row.style.transform = 'translateX(' + tx + 'px)';
        setTimeout(function () {
          if (row.children[W]) row.children[W].classList.add('win');
          setTimeout(function () {
            if (id === 'free') user.last_free = Date.now();
            if (prize.name.indexOf('Star') !== -1) user.balance = (user.balance || 0) + prize.value;
            else {
              var entry = { id: Date.now() + Math.random(), name: prize.name, value: prize.value, nft: !!prize.nft, skin: !!prize.skin || mode === 'cs2' };
              if (mode === 'cs2') {
                if (!user.inventory_cs2) user.inventory_cs2 = [];
                user.inventory_cs2.unshift(entry);
              } else {
                if (!user.inventory) user.inventory = [];
                user.inventory.unshift(entry);
              }
            }
            var live = $('liveTrack');
            if (live) {
              var s = '<span><b>' + (user.first_name || 'Player') + '</b> → ' + prize.name + ' <span class="lv">' + prize.value + '★</span> · </span>';
              live.innerHTML = s + (live.innerHTML || '');
            }
            save(); renderUser(); renderCases();
            $('spin').classList.remove('on'); opening = false;
            $('resI').innerHTML = '<img src="' + itemIcon(prize.name, prize.skin) + '" width="64" height="64" style="border-radius:14px">';
            $('resN').textContent = prize.name + (prize.nft ? ' · NFT' : '');
            $('resV').textContent = '+' + prize.value + ' ★';
            sfx('win');
            $('modRes').classList.add('on');
          }, 400);
        }, 3300);
      });
    });
  }

  /* inventory */
  function renderInv() {
    var g = $('inv'); if (!g) return;
    var inv = activeInv();
    if (!inv.length) {
      g.innerHTML = '<div class="empty">' + (mode === 'cs2' ? 'No CS2 skins yet' : 'No gifts yet') + '</div>';
      return;
    }
    g.innerHTML = '';
    inv.forEach(function (item, idx) {
      var r = document.createElement('div');
      var st = item.status === 'withdrawing'
        ? 'On withdraw (up to 7 days)'
        : (item.skin || mode === 'cs2' ? 'CS2 Skin' : (item.nft ? 'NFT' : 'Gift'));
      var rowCls = 'ir' + (item.nft ? ' nft' : '') + (item.status === 'withdrawing' ? ' wd' : '');
      r.className = rowCls;
      r.innerHTML = '<div class="ip"><img src="' + itemIcon(item.name, item.skin || mode === 'cs2') + '" width="46" height="46" style="border-radius:12px"></div><div class="ii"><div class="in">' + item.name + '</div><div class="is">' + st + '</div></div><div class="iv">' + item.value + ' ★</div>';
      r.onclick = function () {
        selItem = { item: item, idx: idx };
        $('itI').innerHTML = '<img src="' + itemIcon(item.name, item.skin || mode === 'cs2') + '" width="64" height="64" style="border-radius:14px">';
        $('itN').textContent = item.name;
        $('itV').textContent = item.value + ' ★';
        if (item.status === 'withdrawing') {
          $('btnSell').style.display = 'none';
          $('btnWd').style.display = 'none';
          $('itV').textContent = item.value + ' ★ · On withdraw (up to 7 days)';
        } else {
          $('btnSell').style.display = '';
          $('btnWd').style.display = '';
          $('btnSell').textContent = 'Sell for ' + item.value + ' ★';
        }
        $('modItem').classList.add('on');
      };
      g.appendChild(r);
    });
  }

  function renderLb() {
    var box = $('lb');
    if (!box) return;
    box.innerHTML = '<div class="empty">Leaderboard needs cloud sync. Your spent: ' + ((user && user.total_spent) || 0) + ' ★</div>';
  }

  function renderProf() {
    var c = $('prof'); if (!c || !user) return;
    var av = user.photo_url ? '<img src="' + user.photo_url + '" alt="">' : ((user.first_name || '?')[0] || '?').toUpperCase();
    var adminBtn = ADMIN_IDS.indexOf(user.id) !== -1 ? '<button type="button" class="btn" id="btnOpenAdmin" style="margin-top:14px">Admin panel</button>' : '';
    c.innerHTML = '<div class="bav">' + av + '</div><div class="pn">' + (user.first_name || 'Player') + '</div><div class="pid">ID: ' + user.id + (user.username ? ' · @' + user.username : '') + '</div><div class="ps"><div class="pst"><div class="pv">' + (user.balance || 0) + '</div><div class="pl">Balance</div></div><div class="pst"><div class="pv">' + (mode === 'cs2' ? (user.inventory_cs2 || []).length : (user.inventory || []).length) + '</div><div class="pl">Items</div></div><div class="pst"><div class="pv">' + (user.total_deposited || 0) + '</div><div class="pl">Deposited</div></div><div class="pst"><div class="pv">' + (user.total_spent || 0) + '</div><div class="pl">Spent</div></div></div>' + adminBtn;
    var ba = $('btnOpenAdmin');
    if (ba) ba.onclick = function () { $('modAdmin').classList.add('on'); };
  }

  /* ===== SHARED ROUND ENGINE (wall-clock sync) ===== */
  function seeded(seed) {
    var x = Math.sin(seed * 127.1 + 311.7) * 43758.5453;
    return x - Math.floor(x);
  }

  /* Roulette: 5s bet + 8s spin = 13s cycle */
  var arenaState = { type: null, choice: null, bet: 0, placed: false, timer: null };

  function openArena(type) {
    arenaState = { type: type, choice: type === 'roulette' ? 'red' : null, bet: 0, placed: false, timer: null };
    $('arenaTitle').textContent = type === 'roulette' ? 'Roulette' : 'Crash';
    $('arenaAmt').value = '10';
    var opts = $('arenaOpts');
    if (type === 'roulette') {
      opts.innerHTML = '<button type="button" class="red on" data-c="red">Red x2</button><button type="button" class="black" data-c="black">Black x2</button><button type="button" class="green" data-c="green">Green x14</button>';
      opts.querySelectorAll('button').forEach(function (b) {
        b.onclick = function () {
          opts.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          arenaState.choice = b.getAttribute('data-c');
        };
      });
    } else {
      opts.innerHTML = '<button type="button" class="on" data-c="auto">Auto cashout</button>';
      arenaState.choice = 1.5;
      opts.innerHTML = '';
      [1.5, 2, 3, 5].forEach(function (m) {
        var b = document.createElement('button');
        b.textContent = 'x' + m;
        if (m === 1.5) b.className = 'on';
        b.onclick = function () {
          opts.querySelectorAll('button').forEach(function (x) { x.classList.remove('on'); });
          b.classList.add('on');
          arenaState.choice = m;
        };
        opts.appendChild(b);
      });
    }
    $('arena').classList.add('on');
    tickArena();
    arenaState.timer = setInterval(tickArena, 100);
  }

  function closeArena() {
    if (arenaState.timer) clearInterval(arenaState.timer);
    $('arena').classList.remove('on');
  }

  function tickArena() {
    if (!$('arena').classList.contains('on')) return;
    var type = arenaState.type;
    var BET = 5000, PLAY = type === 'roulette' ? 8000 : 12000;
    var PERIOD = BET + PLAY;
    var now = Date.now();
    var id = Math.floor(now / PERIOD);
    var el = now % PERIOD;
    var phase = el < BET ? 'bet' : 'play';
    var left = phase === 'bet' ? (BET - el) / 1000 : (PERIOD - el) / 1000;

    $('arenaPhase').textContent = phase === 'bet' ? 'Place your bets' : (type === 'roulette' ? 'Spinning...' : 'Rocket flying...');
    $('arenaTimer').textContent = left.toFixed(1);

    var view = $('arenaView');
    if (phase === 'bet') {
      arenaState._played = false;
      if (type === 'roulette') {
        view.innerHTML = '<div class="rwheel-pin"></div><div class="rwheel" id="rw"></div>';
      } else {
        view.innerHTML = '<div class="crash-scene">' +
          '<div class="crash-stars"></div>' +
          '<div class="crash-mult" id="cm">1.00x</div>' +
          '<div class="crash-rocket" id="cr">' +
          '<svg viewBox="0 0 64 80" width="48" height="60"><path d="M32 2 L44 42 L32 36 L20 42 Z" fill="#ff6b6b"/><rect x="28" y="40" width="8" height="14" rx="1" fill="#ddd"/><path d="M24 54 L18 72 M40 54 L46 72" stroke="#f0c14b" stroke-width="4" stroke-linecap="round"/><circle cx="32" cy="20" r="4" fill="#fff" opacity=".5"/></svg>' +
          '</div></div>';
      }
      $('arenaPlace').disabled = arenaState.placed;
      $('arenaPlace').textContent = arenaState.placed ? 'Bet placed' : 'Place bet';
    } else {
      $('arenaPlace').disabled = true;
      if (!arenaState._played) {
        arenaState._played = true;
        runSharedResult(type, id);
      }
    }
  }

  function runSharedResult(type, roundId) {
    var r = seeded(roundId * 97 + (type === 'roulette' ? 1 : 2));
    if (type === 'roulette') {
      var outcome = r < 0.027 ? 'green' : r < 0.5135 ? 'red' : 'black';
      var deg = outcome === 'green' ? 340 : outcome === 'red' ? 80 : 200;
      deg += 360 * 5;
      var rw = $('rw');
      if (rw) {
        rw.style.transition = 'none';
        rw.style.transform = 'rotate(0deg)';
        requestAnimationFrame(function () {
          rw.style.transition = 'transform 4s cubic-bezier(0.12,0.75,0.12,1)';
          rw.style.transform = 'rotate(' + deg + 'deg)';
        });
      }
      setTimeout(function () {
        var msg = 'Result: ' + outcome.toUpperCase();
        if (arenaState.placed && arenaState.bet > 0) {
          if (arenaState.choice === outcome) {
            var mult = outcome === 'green' ? 14 : 2;
            var win = Math.floor(arenaState.bet * mult);
            user.balance = (user.balance || 0) + win;
            msg += ' · WIN +' + win + ' ★';
            sfx('win');
          } else {
            msg += ' · LOSE';
            sfx('lose');
          }
          arenaState.placed = false;
          arenaState.bet = 0;
          save(); renderUser();
        }
        $('arenaMy').textContent = msg;
      }, 4200);
    } else {
      // crash point from seed
      var crashAt = r < 0.04 ? 1.0 : Math.min(20, Math.max(1.01, +(0.99 / (1 - r * 0.95)).toFixed(2)));
      var start = Date.now();
      var cashed = false;
      function fly() {
        if (!$('arena').classList.contains('on')) return;
        var t = (Date.now() - start) / 1000;
        var mult = Math.min(crashAt, +(Math.pow(1.06, t * 3)).toFixed(2));
        var cm = $('cm'), cr = $('cr');
        if (cm) cm.textContent = mult.toFixed(2) + 'x';
        if (cr) cr.style.transform = 'translateX(-50%) translateY(-' + Math.min(220, mult * 28) + 'px)';
        if (arenaState.placed && !cashed && mult >= (arenaState.choice || 1.5) && mult < crashAt) {
          cashed = true;
          var win = Math.floor(arenaState.bet * arenaState.choice);
          user.balance = (user.balance || 0) + win;
          save(); renderUser();
          $('arenaMy').textContent = 'Cashed x' + arenaState.choice + ' · +' + win + ' ★';
          sfx('win');
          arenaState.placed = false;
        }
        if (mult >= crashAt) {
          if (cm) { cm.textContent = 'CRASH ' + crashAt.toFixed(2) + 'x'; cm.classList.add('dead'); }
          if (arenaState.placed && !cashed) {
            $('arenaMy').textContent = 'Crashed at ' + crashAt.toFixed(2) + 'x · LOSE';
            sfx('lose');
            arenaState.placed = false;
          }
          return;
        }
        requestAnimationFrame(fly);
      }
      requestAnimationFrame(fly);
    }
  }

  /* ===== UPGRADE ===== */
  var upState = { item: null, idx: -1, mult: 2 };

  function openUpgrade() {
    upState = { item: null, idx: -1, mult: 2 };
    renderUpBody();
    $('upArena').classList.add('on');
  }

  function renderUpBody() {
    var inv = (user.inventory || []).filter(function (i) { return i.nft || i.value >= 15; });
    var html = '<div class="hint">Select NFT / gift to upgrade</div><div class="up-inv">';
    if (!inv.length) html += '<div class="empty">No items — open cases first</div>';
    inv.forEach(function (it, i) {
      var realIdx = user.inventory.indexOf(it);
      html += '<div class="up-item" data-i="' + realIdx + '"><img src="' + icon(it.name) + '"><div style="flex:1"><div class="in">' + it.name + '</div><div class="is">' + it.value + ' ★</div></div></div>';
    });
    html += '</div>';
    html += '<div class="hint">Multiplier</div><div class="up-mults">';
    [1.5, 2, 3, 5].forEach(function (m) {
      html += '<button type="button" class="' + (upState.mult === m ? 'on' : '') + '" data-m="' + m + '">x' + m + '</button>';
    });
    html += '</div>';
    var chance = upState.mult ? Math.max(5, Math.floor(100 / upState.mult * 0.92)) : 0;
    html += '<div class="up-chance" id="upChance">Chance: ' + chance + '%</div>';
    html += '<div class="up-wheel-wrap"><div class="up-pin"></div><div class="up-wheel" id="upWheel" style="--pct:' + chance + '%"></div></div>';
    html += '<button type="button" class="btn" id="upGo">Upgrade</button>';
    html += '<div class="hint" style="margin-top:8px">Lose → consolation 2% of item value in Stars</div>';
    $('upBody').innerHTML = html;

    $('upBody').querySelectorAll('.up-item').forEach(function (el) {
      el.onclick = function () {
        $('upBody').querySelectorAll('.up-item').forEach(function (x) { x.classList.remove('on'); });
        el.classList.add('on');
        upState.idx = parseInt(el.getAttribute('data-i'), 10);
        upState.item = user.inventory[upState.idx];
      };
    });
    $('upBody').querySelectorAll('.up-mults button').forEach(function (b) {
      b.onclick = function () {
        upState.mult = parseFloat(b.getAttribute('data-m'));
        renderUpBody();
      };
    });
    var go = $('upGo');
    if (go) go.onclick = doUpgrade;
  }

  function doUpgrade() {
    if (!upState.item || upState.idx < 0) { toast('Select an item', 'error'); return; }
    var item = upState.item;
    var mult = upState.mult || 2;
    var chance = Math.max(5, Math.floor(100 / mult * 0.92));
    var targetVal = Math.floor(item.value * mult);

    // find target gift
    var pool = Object.keys(window.GIFTS || {}).map(function (n) {
      return { name: n, value: window.GIFTS[n].value, nft: window.GIFTS[n].nft };
    }).filter(function (g) { return g.value >= targetVal * 0.85 && g.value <= targetVal * 1.25; });
    if (!pool.length) pool = [{ name: 'Diamond', value: targetVal, nft: true }];
    var target = pool[Math.floor(Math.random() * pool.length)];
    target.value = Math.max(target.value, targetVal);

    var wheel = $('upWheel');
    var win = Math.random() * 100 < chance;
    // spin: win lands in green sector
    var land = win ? (Math.random() * chance * 0.8 + chance * 0.1) : (chance + Math.random() * (100 - chance) * 0.8);
    var deg = 360 * 5 + (360 - land * 3.6);
    if (wheel) {
      wheel.style.transition = 'none';
      wheel.style.transform = 'rotate(0)';
      requestAnimationFrame(function () {
        wheel.style.transition = 'transform 3.5s cubic-bezier(0.12,0.75,0.12,1)';
        wheel.style.transform = 'rotate(' + deg + 'deg)';
      });
    }
    sfx('open');
    setTimeout(function () {
      // remove item
      user.inventory.splice(upState.idx, 1);
      if (win) {
        user.inventory.unshift({ id: Date.now() + Math.random(), name: target.name, value: target.value, nft: true });
        toast('UPGRADE! ' + target.name + ' · ' + target.value + ' ★', 'success');
        sfx('win');
        $('resI').innerHTML = '<img src="' + icon(target.name) + '" width="64" height="64" style="border-radius:14px">';
        $('resN').textContent = target.name + ' · NFT';
        $('resV').textContent = target.value + ' ★';
        $('modRes').classList.add('on');
      } else {
        var cons = Math.max(1, Math.floor(item.value * 0.02));
        user.balance = (user.balance || 0) + cons;
        toast('Failed · consolation +' + cons + ' ★', 'error');
        sfx('lose');
      }
      save(); renderUser();
      upState = { item: null, idx: -1, mult: upState.mult };
      renderUpBody();
    }, 3700);
  }

  /* ===== PLINKO ===== */
  var plinkoRunning = false;
  function openPlinko() {
    $('plArena').classList.add('on');
    $('plRes').textContent = '';
    drawPlinkoBoard();
  }
  function drawPlinkoBoard() {
    var cv = $('plCanvas'); if (!cv) return;
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    ctx.fillStyle = '#13131c';
    ctx.fillRect(0, 0, W, H);
    // pegs
    var rows = 10, gap = 32;
    var startY = 40;
    ctx.fillStyle = '#6c5ce7';
    for (var r = 0; r < rows; r++) {
      var n = r + 3;
      var totalW = (n - 1) * gap;
      var sx = (W - totalW) / 2;
      for (var c = 0; c < n; c++) {
        ctx.beginPath();
        ctx.arc(sx + c * gap, startY + r * gap, 4, 0, Math.PI * 2);
        ctx.fill();
      }
    }
    // bins
    var mults = [0.2, 0.5, 1, 1.5, 3, 1.5, 1, 0.5, 0.2];
    var binW = W / mults.length;
    mults.forEach(function (m, i) {
      ctx.fillStyle = m >= 3 ? '#2ee59d' : m >= 1 ? '#7c6cf0' : '#ff5c5c';
      ctx.fillRect(i * binW + 2, H - 28, binW - 4, 24);
      ctx.fillStyle = '#fff';
      ctx.font = '11px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('x' + m, i * binW + binW / 2, H - 12);
    });
  }

  function dropPlinko() {
    if (plinkoRunning) return;
    var amt = parseInt($('plAmt').value, 10) || 0;
    if (amt < 1) { toast('Min 1 Star', 'error'); return; }
    if ((user.balance || 0) < amt) { toast('Not enough Stars', 'error'); return; }
    user.balance -= amt;
    user.total_spent = (user.total_spent || 0) + amt;
    save(); renderUser();
    plinkoRunning = true;

    var cv = $('plCanvas');
    var ctx = cv.getContext('2d');
    var W = cv.width, H = cv.height;
    var mults = [0.2, 0.5, 1, 1.5, 3, 1.5, 1, 0.5, 0.2];
    var x = W / 2, y = 20;
    var rows = 10, gap = 32, startY = 40;
    var row = 0;
    var path = [];
    // precompute path with randomness
    var px = W / 2;
    for (var r = 0; r < rows; r++) {
      px += (Math.random() < 0.5 ? -1 : 1) * (gap / 2);
      path.push(px);
    }
    var step = 0;
    function anim() {
      drawPlinkoBoard();
      // ball
      var ty = startY + step * gap;
      var tx = step === 0 ? W / 2 : path[Math.min(step - 1, path.length - 1)];
      if (step < path.length) {
        var progress = (step % 1);
      }
      // interpolate
      var fromX = step === 0 ? W / 2 : path[step - 1];
      var toX = path[Math.min(step, path.length - 1)];
      var fromY = startY + (step - 1) * gap;
      var toY = startY + step * gap;
      if (step === 0) { fromY = 20; fromX = W / 2; }

      ctx.fillStyle = '#f0c14b';
      ctx.beginPath();
      ctx.arc(toX, toY, 7, 0, Math.PI * 2);
      ctx.fill();

      if (step < rows) {
        step++;
        sfx('dig');
        setTimeout(anim, 120);
      } else {
        // which bin
        var finalX = path[path.length - 1];
        var bin = Math.min(mults.length - 1, Math.max(0, Math.floor(finalX / (W / mults.length))));
        var m = mults[bin];
        var win = Math.floor(amt * m);
        user.balance += win;
        save(); renderUser();
        $('plRes').textContent = 'x' + m + (win > 0 ? ' · +' + win + ' ★' : ' · 0');
        if (win >= amt) sfx('win'); else sfx('lose');
        plinkoRunning = false;
      }
    }
    anim();
  }

  /* Pickaxe — simplified keep */
  var pickState = { bet: 25, pick: null, depth: 0, timer: null, stopped: false };
  var PICKS = [
    { name: 'Wood', mult: 0.5 }, { name: 'Stone', mult: 1 }, { name: 'Iron', mult: 1.5 },
    { name: 'Gold', mult: 2.5 }, { name: 'Diamond', mult: 4 }
  ];
  var LAYERS = [
    { name: 'Dirt', cls: 'dirt', reward: 0.3 }, { name: 'Stone', cls: 'stone', reward: 0.5 },
    { name: 'Coal', cls: 'coal', reward: 0.8 }, { name: 'Iron', cls: 'iron', reward: 1.2 },
    { name: 'Gold', cls: 'gold', reward: 2 }, { name: 'Diamond', cls: 'diamond', reward: 3.5 }
  ];

  function openPickaxe() {
    pickState = { bet: 25, pick: null, depth: 0, timer: null, stopped: false };
    $('pickBet').value = 25;
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
    if (bet < 10) { toast('Min 10', 'error'); return; }
    if ((user.balance || 0) < bet) { toast('Not enough', 'error'); return; }
    user.balance -= bet; user.total_spent = (user.total_spent || 0) + bet;
    pickState.bet = bet; save(); renderUser();
    var boost = Math.min(0.35, (bet - 10) / 400);
    var chances = [35 - boost * 30, 30 - boost * 10, 20 + boost * 10, 10 + boost * 15, 5 + boost * 15];
    var total = chances.reduce(function (a, b) { return a + b; }, 0);
    var r = Math.random() * total, chosen = PICKS[0];
    for (var i = 0; i < chances.length; i++) { r -= chances[i]; if (r <= 0) { chosen = PICKS[i]; break; } }
    pickState.pick = chosen;
    showPickPhase(2);
    var row = $('pickSpinRow');
    row.innerHTML = ''; row.style.transition = 'none'; row.style.transform = 'translateX(0)';
    var N = 30, W = 24;
    for (var j = 0; j < N; j++) {
      var pk = j === W ? chosen : PICKS[Math.floor(Math.random() * PICKS.length)];
      var el = document.createElement('div');
      el.className = 'pki';
      el.innerHTML = '<span style="font-size:20px;font-weight:800">' + pk.name[0] + '</span><span>' + pk.name + '</span>';
      row.appendChild(el);
    }
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var iw = 84, mid = Math.min(window.innerWidth, 480) / 2;
        row.style.transition = 'transform 2.5s cubic-bezier(0.12,0.75,0.12,1)';
        row.style.transform = 'translateX(' + (-(W * iw - mid + iw / 2)) + 'px)';
        setTimeout(function () {
          if (row.children[W]) row.children[W].classList.add('win');
          setTimeout(startMining, 500);
        }, 2600);
      });
    });
  }
  function startMining() {
    showPickPhase(3);
    pickState.depth = 0; pickState.stopped = false;
    $('pickMineTitle').textContent = pickState.pick.name + ' pickaxe';
    $('minePick').textContent = '*';
    $('minePick').style.top = '20px';
    $('mineStop').disabled = false;
    var layers = $('mineLayers'); layers.innerHTML = '';
    for (var i = LAYERS.length - 1; i >= 0; i--) {
      var d = document.createElement('div');
      d.className = 'ml ' + LAYERS[i].cls; d.id = 'ml' + i; d.textContent = LAYERS[i].name;
      layers.appendChild(d);
    }
    function dig() {
      if (pickState.stopped) return;
      if (pickState.depth >= LAYERS.length) { finishMine(true); return; }
      var layerEl = $('ml' + pickState.depth);
      if (layerEl) {
        sfx('dig'); layerEl.classList.add('broken');
        pickState.depth++;
        $('minePick').style.top = (20 + pickState.depth * 28) + 'px';
        $('mineDepth').textContent = 'Depth: ' + (pickState.depth * 10) + 'm';
      }
      var br = (pickState.depth * 0.08) / pickState.pick.mult;
      if (Math.random() < br && pickState.depth > 1) { finishMine(false); return; }
      pickState.timer = setTimeout(dig, Math.max(350, 700 - pickState.pick.mult * 80));
    }
    pickState.timer = setTimeout(dig, 300);
  }
  function stopMine() {
    if (pickState.stopped) return;
    pickState.stopped = true;
    if (pickState.timer) clearTimeout(pickState.timer);
    finishMine(true);
  }
  function finishMine(ok) {
    pickState.stopped = true;
    if (pickState.timer) clearTimeout(pickState.timer);
    var win = 0;
    if (ok && pickState.depth > 0) {
      var lr = 0;
      for (var i = 0; i < pickState.depth; i++) lr += LAYERS[i].reward;
      win = Math.floor(pickState.bet * pickState.pick.mult * lr * (0.7 + Math.random() * 0.5));
    }
    user.balance += win; save(); renderUser();
    setTimeout(function () {
      showPickPhase(4);
      $('pickResTitle').textContent = win > 0 ? 'Success!' : 'Broken';
      $('pickResVal').textContent = (win > 0 ? '+' : '') + win + ' ★';
      if (win > 0) sfx('win'); else sfx('lose');
    }, 400);
  }

  /* bind */
  function bind() {
    document.body.addEventListener('touchstart', function () { audioCtx(); }, { once: true });
    var ms = $('modeSwitch');
    if (ms) {
      ms.onclick = function (e) {
        var b = e.target.closest('.mode-btn');
        if (!b) return;
        sfx('tab');
        setMode(b.getAttribute('data-mode'));
      };
    }

    document.body.addEventListener('click', function () { audioCtx(); }, { once: true });

    $('nav').onclick = function (e) {
      var b = e.target.closest('.nb'); if (!b) return;
      e.preventDefault(); sfx('tab'); tab(b.getAttribute('data-t'));
    };
    /* games bound in renderGames */
    $('shCaseBg').onclick = function () { $('shCase').classList.remove('on'); };
    $('btnOpen').onclick = function () {
      if (!selCase || this.disabled || opening) return;
      $('shCase').classList.remove('on'); doOpen(selCase);
    };
    $('btnResOk').onclick = function () { $('modRes').classList.remove('on'); };
    $('btnItemX').onclick = function () { $('modItem').classList.remove('on'); };
    $('btnSell').onclick = function () {
      if (!selItem) return;
      user.balance = (user.balance || 0) + selItem.item.value;
      var inv = activeInv();
      inv.splice(selItem.idx, 1);
      setActiveInv(inv);
      save(); renderUser(); renderInv();
      $('modItem').classList.remove('on');
      toast('Sold +' + selItem.item.value + ' ★', 'success');
    };
    $('btnWd').onclick = function () {
      if (!selItem || !selItem.item) return;
      if (selItem.item.status === 'withdrawing') {
        toast('Already on withdraw', 'error');
        return;
      }
      var item = selItem.item;
      var wdId = 'wd_' + Date.now() + '_' + Math.floor(Math.random() * 9999);
      item.status = 'withdrawing';
      item.wd_id = wdId;
      item.wd_at = Date.now();
      // keep in inventory
      save(); renderInv();
      $('modItem').classList.remove('on');
      toast('On withdraw (up to 7 days)', 'success');
      // notify bot so admin sees request
      var bot = 'IzbrannikStar_bot';
      var payload = 'wd_' + user.id + '_' + encodeURIComponent(item.name).replace(/%/g, '') + '_' + item.value + '_' + wdId;
      // keep payload short for start param (max ~64)
      var short = 'wd_' + user.id + '_' + item.value + '_' + wdId.slice(-8);
      try {
        if (tg && tg.openTelegramLink) {
          tg.openTelegramLink('https://t.me/' + bot + '?start=' + short);
        }
      } catch (e) {}
      // also store pending list locally for admin panel in app
      if (!user.wd_requests) user.wd_requests = [];
      user.wd_requests.push({
        wd_id: wdId, name: item.name, value: item.value, nft: !!item.nft,
        uid: user.id, username: user.username || '', first_name: user.first_name || '',
        status: 'pending', ts: Date.now()
      });
      save();
    };

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
      if (a < 50) { toast('Min 50', 'error'); return; }
      var bot = 'IzbrannikStar_bot';
      if (tg && tg.openTelegramLink) tg.openTelegramLink('https://t.me/' + bot + '?start=pay_' + a);
      else window.open('https://t.me/' + bot + '?start=pay_' + a, '_blank');
      $('modPay').classList.remove('on');
    };

    $('arenaX').onclick = closeArena;
    $('arenaPlace').onclick = function () {
      var amt = parseInt($('arenaAmt').value, 10) || 0;
      if (amt < 1) { toast('Min 1', 'error'); return; }
      if ((user.balance || 0) < amt) { toast('Not enough', 'error'); return; }
      if (arenaState.placed) return;
      // only during bet phase
      var BET = 5000, PLAY = arenaState.type === 'roulette' ? 8000 : 12000;
      if ((Date.now() % (BET + PLAY)) >= BET) { toast('Wait for next round', 'error'); return; }
      user.balance -= amt;
      user.total_spent = (user.total_spent || 0) + amt;
      arenaState.bet = amt;
      arenaState.placed = true;
      save(); renderUser();
      $('arenaMy').textContent = 'Bet ' + amt + ' ★ on ' + (arenaState.choice || '');
      toast('Bet placed', 'success');
    };

    $('upX').onclick = function () { $('upArena').classList.remove('on'); };
    $('plX').onclick = function () { $('plArena').classList.remove('on'); };
    $('plDrop').onclick = dropPlinko;

    document.querySelectorAll('.pbet').forEach(function (b) {
      b.onclick = function () {
        $('pickBet').value = b.getAttribute('data-a');
        document.querySelectorAll('.pbet').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
      };
    });
    $('pickSpin').onclick = startPickSpin;
    $('mineStop').onclick = stopMine;
    $('pickAgain').onclick = openPickaxe;
    $('pickClose').onclick = function () { $('pickGame').classList.remove('on'); };
    $('pickX').onclick = function () {
      if (pickState.timer) clearTimeout(pickState.timer);
      pickState.stopped = true;
      $('pickGame').classList.remove('on');
    };

    // Admin local-only (instant)
    var ax = $('btnAdminX');
    if (ax) ax.onclick = function () { $('modAdmin').classList.remove('on'); };
    var bg = $('btnAdmGive');
    if (bg) bg.onclick = function () {
      if (ADMIN_IDS.indexOf(user.id) === -1) return;
      var tid = parseInt($('admId').value, 10);
      var amt = parseInt($('admAmt').value, 10);
      if (!tid || isNaN(amt)) { toast('ID + amount', 'error'); return; }
      if (tid === user.id) {
        user.balance = (user.balance || 0) + amt;
        save(); renderUser();
        $('admRes').textContent = 'OK self → ' + user.balance + ' ★ (synced via CloudStorage)';
        sfx('win'); toast('Balance updated', 'success');
      } else {
        $('admRes').textContent = 'Other user: use bot → they must open the button link';
        toast('Use bot for other users', 'error');
      }
    };
    var bf = $('btnAdmFree');
    if (bf) bf.onclick = function () {
      if (ADMIN_IDS.indexOf(user.id) === -1) return;
      var tid = parseInt($('admId').value, 10);
      if (tid === user.id) {
        user.last_free = 0; save(); renderCases();
        $('admRes').textContent = 'Free case reset';
        toast('Free ready', 'success');
      } else toast('Use bot for other users', 'error');
    };
  }

  /* INIT */
  function init() {
    var fill = $('ldFill'), txt = $('ldTxt');
    function prog(p, t) { if (fill) fill.style.width = p + '%'; if (txt) txt.textContent = t; }

    prog(15, 'Telegram...');
    var tu = tgUser();
    var loc = loadLocal(tu.id);

    user = {
      id: tu.id,
      first_name: tu.first_name || 'Player',
      username: tu.username || '',
      photo_url: tu.photo_url || null,
      balance: 0,
      inventory: [],
      inventory_cs2: [],
      last_free: 0,
      total_deposited: 0,
      total_spent: 0,
      stats: {},
      _updated: 0
    };
    if (loc) unpack(loc, user);
    if (!user.inventory_cs2) user.inventory_cs2 = [];

    prog(40, 'Cloud sync...');
    // CloudStorage = same account on phone + PC
    cloudLoad(function (cloud) {
      if (cloud) {
        var cloudTime = cloud.updated_at || 0;
        var localTime = user._updated || 0;
        // merge: prefer newer
        if (cloudTime >= localTime) {
          unpack(cloud, user);
        } else {
          // local newer → push to cloud
          cloudSave();
        }
      }
      applyDeepLink();
      prog(80, 'UI...');
      renderUser(); renderCases(); renderGames(); bind();
      prog(100, 'Ready');
      setTimeout(function () {
        $('loader').classList.add('hide');
        $('app').classList.remove('hide');
      }, 200);
      // periodic cloud save
      setInterval(function () { cloudSave(); }, 15000);
    });

    setTimeout(function () {
      if (!$('loader').classList.contains('hide')) {
        applyDeepLink();
        renderUser(); renderCases(); bind();
        $('loader').classList.add('hide');
        $('app').classList.remove('hide');
      }
    }, 3500);
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init);
  else init();
})();
