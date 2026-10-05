/* ===== Izbrannik Star — fast client ===== */
(function () {
  'use strict';

  // ---- Telegram ----
  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    try {
      tg.ready();
      tg.expand();
      tg.setHeaderColor('#0a0a0f');
      tg.setBackgroundColor('#0a0a0f');
    } catch (e) {}
  }

  var ADMIN_IDS = [8133917568, 5198310704];

  function getTgUser() {
    try {
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user;
    } catch (e) {}
    return { id: 999001, first_name: 'Test', username: 'test', photo_url: null };
  }

  // ---- Local storage fallback (fast) ----
  var LS_KEY = 'izbrannik_user_v2';

  function loadLocal(id) {
    try {
      var raw = localStorage.getItem(LS_KEY + '_' + id);
      return raw ? JSON.parse(raw) : null;
    } catch (e) { return null; }
  }

  function saveLocal(user) {
    try {
      localStorage.setItem(LS_KEY + '_' + user.id, JSON.stringify({
        id: user.id,
        balance: user.balance || 0,
        inventory: user.inventory || [],
        last_free: user.last_free || 0,
        total_deposited: user.total_deposited || 0,
        total_spent: user.total_spent || 0
      }));
    } catch (e) {}
  }

  // ---- Prize colors / short ----
  var COLORS = {
    '1 ★': '#f0c14b', '2 ★': '#f0c14b', '5 ★': '#f0c14b',
    'Звезда': '#f0c14b', 'Сердце': '#ff6b8a', 'Роза': '#e84393',
    'Мишка': '#d4a574', 'Торт': '#fd79a8', 'Подарок': '#6c5ce7',
    'Алмаз': '#00cec9', 'Кольцо': '#b2bec3',
    'NFT #1': '#a29bfe', 'NFT Средний': '#6c5ce7',
    'NFT Хороший': '#fd79a8', 'NFT Топ': '#f0c14b'
  };
  function pColor(n) { return COLORS[n] || '#6c5ce7'; }
  function pShort(n) {
    if (n.indexOf('NFT') === 0) return 'NFT';
    if (n.indexOf('★') !== -1) return n.replace(' ', '');
    return n.slice(0, 2).toUpperCase();
  }

  // ---- Cases (rebalanced free) ----
  // Free: ~90% stars 1-2, gifts very rare
  var CASES = {
    free: {
      id: 'free', name: 'Фри', price: 0,
      desc: 'Бесплатный раз в 24 часа',
      iconClass: 'free',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8V3M8 8l4-5 4 5"/><path d="M3 13h18"/></svg>',
      prizes: [
        { name: '1 ★', value: 1, chance: 55, nft: false },
        { name: '2 ★', value: 2, chance: 35, nft: false },
        { name: '5 ★', value: 5, chance: 6, nft: false },
        { name: 'Сердце', value: 15, chance: 2, nft: false },
        { name: 'Роза', value: 25, chance: 1.2, nft: false },
        { name: 'Мишка', value: 50, chance: 0.5, nft: false },
        { name: 'Подарок', value: 100, chance: 0.25, nft: false },
        { name: 'Алмаз', value: 200, chance: 0.05, nft: false }
      ]
    },
    cheap: {
      id: 'cheap', name: 'Дешёвый', price: 15,
      desc: 'Обычные призы + шанс на NFT',
      iconClass: 'cheap',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>',
      prizes: [
        { name: 'Сердце', value: 10, chance: 30, nft: false },
        { name: 'Роза', value: 15, chance: 25, nft: false },
        { name: 'Мишка', value: 25, chance: 18, nft: false },
        { name: 'Торт', value: 40, chance: 12, nft: false },
        { name: 'Звезда', value: 50, chance: 8, nft: false },
        { name: 'Подарок', value: 80, chance: 4, nft: false },
        { name: 'Кольцо', value: 150, chance: 2, nft: false },
        { name: 'NFT #1', value: 300, chance: 1, nft: true }
      ]
    },
    selected: {
      id: 'selected', name: 'Избранный', price: 100,
      desc: 'Высокий шанс на NFT',
      iconClass: 'selected',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.4 5.7 21l2.3-7-6-4.8h7.6z"/></svg>',
      prizes: [
        { name: 'Мишка', value: 40, chance: 20, nft: false },
        { name: 'Торт', value: 50, chance: 18, nft: false },
        { name: 'Звезда', value: 80, chance: 15, nft: false },
        { name: 'Подарок', value: 120, chance: 15, nft: false },
        { name: 'Кольцо', value: 200, chance: 12, nft: false },
        { name: 'Алмаз', value: 300, chance: 8, nft: false },
        { name: 'NFT Средний', value: 400, chance: 6, nft: true },
        { name: 'NFT Хороший', value: 600, chance: 4, nft: true },
        { name: 'NFT Топ', value: 1000, chance: 2, nft: true }
      ]
    },
    vip: {
      id: 'vip', name: 'VIP', price: 250,
      desc: 'Только ценные призы и NFT',
      iconClass: 'selected',
      svg: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 3"/></svg>',
      prizes: [
        { name: 'Подарок', value: 100, chance: 25, nft: false },
        { name: 'Кольцо', value: 200, chance: 22, nft: false },
        { name: 'Алмаз', value: 350, chance: 20, nft: false },
        { name: 'NFT Средний', value: 500, chance: 15, nft: true },
        { name: 'NFT Хороший', value: 700, chance: 12, nft: true },
        { name: 'NFT Топ', value: 1500, chance: 6, nft: true }
      ]
    }
  };

  function rollPrize(caseId) {
    var prizes = CASES[caseId].prizes;
    var total = 0;
    for (var i = 0; i < prizes.length; i++) total += prizes[i].chance;
    var r = Math.random() * total;
    for (var j = 0; j < prizes.length; j++) {
      r -= prizes[j].chance;
      if (r <= 0) return prizes[j];
    }
    return prizes[prizes.length - 1];
  }

  // ---- State ----
  var currentUser = null;
  var selectedCaseId = null;
  var db = null;
  var userRef = null;
  var opening = false;

  function toast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    setTimeout(function () { el.classList.remove('show'); }, 2800);
  }

  function renderUser() {
    if (!currentUser) return;
    document.getElementById('username').textContent = currentUser.first_name || 'Игрок';
    document.getElementById('balanceStars').textContent = (currentUser.balance || 0).toLocaleString();

    var av = document.getElementById('avatar');
    if (currentUser.photo_url) {
      av.innerHTML = '<img src="' + currentUser.photo_url + '" alt="">';
    } else {
      av.textContent = ((currentUser.first_name || '?')[0] || '?').toUpperCase();
    }
  }

  function saveUser() {
    if (!currentUser) return;
    saveLocal(currentUser);
    // Firebase async, never block UI
    if (userRef) {
      userRef.set({
        id: currentUser.id,
        first_name: currentUser.first_name || '',
        username: currentUser.username || '',
        photo_url: currentUser.photo_url || null,
        balance: currentUser.balance || 0,
        inventory: currentUser.inventory || [],
        last_free: currentUser.last_free || 0,
        total_deposited: currentUser.total_deposited || 0,
        total_spent: currentUser.total_spent || 0
      }, { merge: true }).catch(function () {});
    }
  }

  // ---- Fast init ----
  function initUser() {
    var tgUser = getTgUser();
    var local = loadLocal(tgUser.id);

    currentUser = {
      id: tgUser.id,
      first_name: tgUser.first_name || (local && local.first_name) || 'Игрок',
      username: tgUser.username || '',
      photo_url: tgUser.photo_url || null,
      balance: local ? (local.balance || 0) : 0,
      inventory: local ? (local.inventory || []) : [],
      last_free: local ? (local.last_free || 0) : 0,
      total_deposited: local ? (local.total_deposited || 0) : 0,
      total_spent: local ? (local.total_spent || 0) : 0
    };

    renderUser();
    renderCases();
    renderProfile();

    // Firebase in background
    initFirebase(tgUser);
  }

  function initFirebase(tgUser) {
    function tryConnect() {
      if (typeof firebase === 'undefined') {
        setTimeout(tryConnect, 200);
        return;
      }
      try {
        if (!firebase.apps.length) {
          firebase.initializeApp({
            apiKey: 'AIzaSyAPTTDTPzDpKQjpPvze1IBsJQJw74_ua34',
            authDomain: 'custom-graphics-36c50.firebaseapp.com',
            projectId: 'custom-graphics-36c50',
            storageBucket: 'custom-graphics-36c50.firebasestorage.app',
            messagingSenderId: '130011001835',
            appId: '1:130011001835:web:1ba6e4e4b3c7a6f0b7dfae'
          });
        }
        db = firebase.firestore();
        userRef = db.collection('users').doc(String(tgUser.id));
        userRef.get().then(function (snap) {
          if (snap.exists) {
            var d = snap.data();
            // Merge: prefer higher balance / longer inventory from server if newer
            if (typeof d.balance === 'number') currentUser.balance = d.balance;
            if (d.inventory && d.inventory.length) currentUser.inventory = d.inventory;
            if (d.last_free) currentUser.last_free = d.last_free;
            if (d.total_deposited) currentUser.total_deposited = d.total_deposited;
            if (d.total_spent) currentUser.total_spent = d.total_spent;
            currentUser.first_name = tgUser.first_name || d.first_name || currentUser.first_name;
            currentUser.photo_url = tgUser.photo_url || d.photo_url || null;
            renderUser();
            renderCases();
            renderProfile();
            saveLocal(currentUser);
          } else {
            saveUser();
          }
        }).catch(function () {});
      } catch (e) {}
    }
    tryConnect();
  }

  // ---- Tabs ----
  document.querySelectorAll('.bn-btn').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.querySelectorAll('.bn-btn').forEach(function (b) { b.classList.remove('active'); });
      document.querySelectorAll('.tab').forEach(function (t) { t.classList.remove('active'); });
      btn.classList.add('active');
      var tab = btn.dataset.tab;
      document.getElementById('tab-' + tab).classList.add('active');
      if (tab === 'inventory') renderInventory();
      if (tab === 'profile') renderProfile();
    });
  });

  // ---- Cases ----
  function renderCases() {
    var grid = document.getElementById('casesGrid');
    grid.innerHTML = '';
    var now = Date.now();

    Object.keys(CASES).forEach(function (key) {
      var c = CASES[key];
      var priceHtml;
      if (c.id === 'free') {
        var left = (currentUser.last_free || 0) + 86400000 - now;
        if (left > 0) {
          var h = Math.floor(left / 3600000);
          var m = Math.floor((left % 3600000) / 60000);
          priceHtml = '<div class="case-price cd">' + h + 'ч ' + m + 'м</div>';
        } else {
          priceHtml = '<div class="case-price free">Бесплатно</div>';
        }
      } else {
        priceHtml = '<div class="case-price"><svg viewBox="0 0 24 24" width="11" height="11"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + c.price + '</div>';
      }

      var card = document.createElement('div');
      card.className = 'case-card';
      card.innerHTML =
        '<div class="case-ico ' + c.iconClass + '">' + c.svg + '</div>' +
        '<div class="case-meta">' +
          '<div class="case-name">' + c.name + '</div>' +
          '<div class="case-desc">' + c.desc + '</div>' +
          priceHtml +
        '</div>' +
        '<svg class="case-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
      card.addEventListener('click', function () { openPreview(c.id); });
      grid.appendChild(card);
    });
  }

  function openPreview(caseId) {
    var c = CASES[caseId];
    if (!c) return;
    selectedCaseId = caseId;

    document.getElementById('cpName').textContent = c.name;
    document.getElementById('cpDesc').textContent = c.desc;
    var icon = document.getElementById('cpIcon');
    icon.className = 'cp-icon case-ico ' + c.iconClass;
    icon.innerHTML = c.svg;

    var now = Date.now();
    var priceEl = document.getElementById('cpPrice');
    var btn = document.getElementById('btnDoOpen');
    var can = true;

    if (c.id === 'free') {
      var left = (currentUser.last_free || 0) + 86400000 - now;
      if (left > 0) {
        can = false;
        var h = Math.floor(left / 3600000);
        var m = Math.floor((left % 3600000) / 60000);
        priceEl.className = 'cp-price cd';
        priceEl.textContent = 'Через ' + h + 'ч ' + m + 'м';
        btn.textContent = 'Недоступно';
      } else {
        priceEl.className = 'cp-price free';
        priceEl.textContent = 'Бесплатно';
        btn.textContent = 'Открыть бесплатно';
      }
    } else {
      priceEl.className = 'cp-price';
      priceEl.innerHTML = '<svg viewBox="0 0 24 24" width="13" height="13"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + c.price;
      if ((currentUser.balance || 0) < c.price) {
        can = false;
        btn.textContent = 'Недостаточно ★';
      } else {
        btn.textContent = 'Открыть за ' + c.price + ' ★';
      }
    }
    btn.disabled = !can;

    var sorted = c.prizes.slice().sort(function (a, b) { return b.chance - a.chance; });
    var list = document.getElementById('cpPrizes');
    list.innerHTML = '';
    sorted.forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'prize-row' + (p.nft ? ' nft' : '');
      row.innerHTML =
        '<div class="pr-ico" style="background:' + pColor(p.name) + '">' + pShort(p.name) + '</div>' +
        '<div class="pr-info"><div class="pr-name">' + p.name + (p.nft ? ' · NFT' : '') + '</div>' +
        '<div class="pr-chance">' + p.chance + '%</div></div>' +
        '<div class="pr-val">' + p.value + ' ★</div>';
      list.appendChild(row);
    });

    document.getElementById('sheetCase').classList.add('show');
  }

  document.querySelector('[data-close="sheetCase"]').addEventListener('click', function () {
    document.getElementById('sheetCase').classList.remove('show');
  });

  document.getElementById('btnDoOpen').addEventListener('click', function () {
    if (!selectedCaseId || this.disabled || opening) return;
    document.getElementById('sheetCase').classList.remove('show');
    doOpen(selectedCaseId);
  });

  // ---- Roulette spin open ----
  function doOpen(caseId) {
    if (opening) return;
    var c = CASES[caseId];
    if (!c) return;

    if (caseId === 'free') {
      if (Date.now() < (currentUser.last_free || 0) + 86400000) {
        toast('Фри ещё не готов', 'error');
        return;
      }
    } else {
      if ((currentUser.balance || 0) < c.price) {
        toast('Недостаточно ★', 'error');
        return;
      }
      currentUser.balance -= c.price;
      currentUser.total_spent = (currentUser.total_spent || 0) + c.price;
    }

    opening = true;
    var prize = rollPrize(caseId);

    // Build track: many items, winner near the end
    var track = document.getElementById('spinTrack');
    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';

    var items = [];
    var totalItems = 40;
    var winnerIndex = 32;

    for (var i = 0; i < totalItems; i++) {
      var p = (i === winnerIndex) ? prize : c.prizes[Math.floor(Math.random() * c.prizes.length)];
      items.push(p);
      var el = document.createElement('div');
      el.className = 'spin-item';
      el.innerHTML =
        '<div class="si-ico" style="background:' + pColor(p.name) + '">' + pShort(p.name) + '</div>' +
        '<div class="si-name">' + p.name + '</div>';
      track.appendChild(el);
    }

    document.getElementById('spinOverlay').classList.add('show');

    // Force reflow then animate
    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var itemW = 80; // 72 + 8 gap
        var centerOffset = window.innerWidth / 2;
        // land winner in center with slight random offset
        var randomOffset = (Math.random() - 0.5) * 40;
        var targetX = -(winnerIndex * itemW - centerOffset + itemW / 2 + randomOffset);

        track.style.transition = 'transform 4.2s cubic-bezier(0.12, 0.8, 0.15, 1)';
        track.style.transform = 'translateX(' + targetX + 'px)';

        setTimeout(function () {
          // highlight winner
          var kids = track.children;
          if (kids[winnerIndex]) kids[winnerIndex].classList.add('winner');

          setTimeout(function () {
            // apply prize
            if (caseId === 'free') currentUser.last_free = Date.now();
            if (!currentUser.inventory) currentUser.inventory = [];

            // Stars prizes add to balance directly
            if (prize.name.indexOf('★') !== -1) {
              currentUser.balance = (currentUser.balance || 0) + prize.value;
            } else {
              currentUser.inventory.unshift({
                id: Date.now(),
                name: prize.name,
                value: prize.value,
                color: pColor(prize.name),
                nft: prize.nft,
                from: caseId
              });
            }

            saveUser();
            renderUser();
            renderCases();

            document.getElementById('spinOverlay').classList.remove('show');
            opening = false;

            var glow = document.getElementById('resultGlow');
            var icon = document.getElementById('resultIcon');
            glow.style.background = pColor(prize.name);
            icon.style.background = pColor(prize.name);
            icon.textContent = pShort(prize.name);
            document.getElementById('resultName').textContent = prize.name + (prize.nft ? ' · NFT' : '');
            document.getElementById('resultValue').textContent = '+' + prize.value + ' ★';
            document.getElementById('modalResult').classList.add('show');
          }, 600);
        }, 4300);
      });
    });
  }

  document.getElementById('btnCloseResult').addEventListener('click', function () {
    document.getElementById('modalResult').classList.remove('show');
  });

  // ---- Inventory ----
  function renderInventory() {
    var grid = document.getElementById('inventoryGrid');
    var inv = currentUser.inventory || [];
    if (!inv.length) {
      grid.innerHTML = '<div class="empty-state">Пока пусто. Открой кейс!</div>';
      return;
    }
    grid.innerHTML = '';
    inv.forEach(function (item) {
      var el = document.createElement('div');
      el.className = 'inv-item' + (item.nft ? ' nft' : '');
      var col = item.color || pColor(item.name);
      el.innerHTML =
        '<div class="inv-ico" style="background:' + col + '">' + pShort(item.name) + '</div>' +
        '<div class="inv-name">' + item.name + '</div>' +
        '<div class="inv-val">' + item.value + ' ★</div>';
      grid.appendChild(el);
    });
  }

  // ---- Profile ----
  function renderProfile() {
    var card = document.getElementById('profileCard');
    if (!currentUser || !card) return;
    var avHtml = currentUser.photo_url
      ? '<img src="' + currentUser.photo_url + '" alt="">'
      : ((currentUser.first_name || '?')[0] || '?').toUpperCase();
    var isAdmin = ADMIN_IDS.indexOf(currentUser.id) !== -1;
    card.innerHTML =
      '<div class="big-av">' + avHtml + '</div>' +
      '<div class="p-name">' + (currentUser.first_name || 'Игрок') + '</div>' +
      '<div class="p-id">ID: ' + currentUser.id + (currentUser.username ? ' · @' + currentUser.username : '') + '</div>' +
      '<div class="profile-stats">' +
        '<div class="p-stat"><div class="ps-val">' + (currentUser.balance || 0) + '</div><div class="ps-label">Баланс ★</div></div>' +
        '<div class="p-stat"><div class="ps-val">' + ((currentUser.inventory || []).length) + '</div><div class="ps-label">Предметов</div></div>' +
        '<div class="p-stat"><div class="ps-val">' + (currentUser.total_deposited || 0) + '</div><div class="ps-label">Пополнено</div></div>' +
        '<div class="p-stat"><div class="ps-val">' + (currentUser.total_spent || 0) + '</div><div class="ps-label">Потрачено</div></div>' +
      '</div>' +
      (isAdmin ? '<button class="btn-main" style="margin-top:16px" id="btnAdminPanel">Админ-панель</button>' : '');

    var adminBtn = document.getElementById('btnAdminPanel');
    if (adminBtn) {
      adminBtn.addEventListener('click', function () {
        toast('Админ-команды в боте: /admin', 'success');
      });
    }
  }

  // ---- Games ----
  document.querySelectorAll('.game-banner').forEach(function (card) {
    card.querySelector('.gb-play').addEventListener('click', function (e) {
      e.stopPropagation();
      openGame(card.dataset.game);
    });
    card.addEventListener('click', function () { openGame(card.dataset.game); });
  });

  function openGame(type) {
    var titles = { roulette: 'Рулетка', upgrade: 'Апгрейд', crash: 'Краш' };
    document.getElementById('gameTitle').textContent = titles[type] || 'Игра';
    var body = document.getElementById('gameBody');

    if (type === 'roulette') {
      body.innerHTML =
        '<div class="form-stack">' +
        '<label>Ставка (★)</label><input type="number" id="betAmount" value="10" min="1"/>' +
        '<label>Цвет</label><select id="betChoice">' +
        '<option value="red">Красное ×2</option><option value="black">Чёрное ×2</option><option value="green">Зелёное ×14</option>' +
        '</select><button class="btn-main" id="btnBet">Поставить</button><div id="gameResult"></div></div>';
    } else if (type === 'upgrade') {
      body.innerHTML =
        '<div class="form-stack">' +
        '<label>Ставка (★)</label><input type="number" id="betAmount" value="10" min="1"/>' +
        '<label>Множитель (1.1–10)</label><input type="number" id="betTarget" value="2" min="1.1" max="10" step="0.1"/>' +
        '<button class="btn-main" id="btnBet">Апгрейд</button><div id="gameResult"></div></div>';
    } else {
      body.innerHTML =
        '<div class="form-stack">' +
        '<label>Ставка (★)</label><input type="number" id="betAmount" value="10" min="1"/>' +
        '<label>Цель (×)</label><input type="number" id="betTarget" value="1.5" min="1.01" max="50" step="0.01"/>' +
        '<button class="btn-main" id="btnBet">Играть</button><div id="gameResult"></div></div>';
    }

    document.getElementById('btnBet').addEventListener('click', function () { playGame(type); });
    document.getElementById('modalGame').classList.add('show');
  }

  document.getElementById('btnCloseGame').addEventListener('click', function () {
    document.getElementById('modalGame').classList.remove('show');
  });

  function playGame(type) {
    var amount = parseInt(document.getElementById('betAmount').value, 10) || 0;
    if (amount < 1) { toast('Минимум 1 ★', 'error'); return; }
    if ((currentUser.balance || 0) < amount) { toast('Недостаточно ★', 'error'); return; }

    currentUser.balance -= amount;
    currentUser.total_spent = (currentUser.total_spent || 0) + amount;
    var win = 0;
    var result = '';

    if (type === 'roulette') {
      var choice = document.getElementById('betChoice').value;
      var r = Math.random();
      var outcome = r < 0.027 ? 'green' : (r < 0.5135 ? 'red' : 'black');
      var names = { red: 'Красное', black: 'Чёрное', green: 'Зелёное' };
      if (choice === outcome) {
        win = Math.floor(amount * (outcome === 'green' ? 14 : 2));
        result = names[outcome] + ' — WIN';
      } else {
        result = names[outcome] + ' — LOSE';
      }
    } else if (type === 'upgrade') {
      var mult = Math.max(1.1, Math.min(10, parseFloat(document.getElementById('betTarget').value) || 2));
      if (Math.random() < 1 / mult) {
        win = Math.floor(amount * mult);
        result = 'Успех ×' + mult + ' — WIN';
      } else {
        result = 'Неудача ×' + mult + ' — LOSE';
      }
    } else {
      var rr = Math.random();
      var crash = rr < 0.04 ? 1.0 : Math.min(50, Math.max(1.01, +(0.99 / (1 - rr)).toFixed(2)));
      var cashout = parseFloat(document.getElementById('betTarget').value) || 1.5;
      if (cashout <= crash) {
        win = Math.floor(amount * cashout);
        result = 'Crash @' + crash + 'x | @' + cashout + 'x — WIN';
      } else {
        result = 'Crash @' + crash + 'x — LOSE';
      }
    }

    currentUser.balance += win;
    saveUser();
    renderUser();
    var el = document.getElementById('gameResult');
    el.className = 'game-result ' + (win > 0 ? 'win' : 'lose');
    el.textContent = result + (win > 0 ? ' (+' + win + ' ★)' : '');
  }

  // ---- Deposit ----
  document.getElementById('btnDeposit').addEventListener('click', function () {
    document.getElementById('modalDeposit').classList.add('show');
  });
  document.getElementById('btnCloseDeposit').addEventListener('click', function () {
    document.getElementById('modalDeposit').classList.remove('show');
  });
  document.querySelectorAll('.preset').forEach(function (btn) {
    btn.addEventListener('click', function () {
      document.getElementById('depositAmount').value = btn.dataset.amt;
      document.querySelectorAll('.preset').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });
  document.getElementById('btnDoDeposit').addEventListener('click', function () {
    var amount = parseInt(document.getElementById('depositAmount').value, 10) || 0;
    if (amount < 10) { toast('Минимум 10 ★', 'error'); return; }
    currentUser.balance = (currentUser.balance || 0) + amount;
    currentUser.total_deposited = (currentUser.total_deposited || 0) + amount;
    saveUser();
    renderUser();
    renderProfile();
    toast('+' + amount + ' ★', 'success');
    document.getElementById('modalDeposit').classList.remove('show');
  });

  // Start immediately
  initUser();
})();
