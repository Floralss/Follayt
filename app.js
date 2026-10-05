// ===== FIREBASE =====
const firebaseConfig = {
  apiKey: "AIzaSyAPTTDTPzDpKQjpPvze1IBsJQJw74_ua34",
  authDomain: "custom-graphics-36c50.firebaseapp.com",
  projectId: "custom-graphics-36c50",
  storageBucket: "custom-graphics-36c50.firebasestorage.app",
  messagingSenderId: "130011001835",
  appId: "1:130011001835:web:1ba6e4e4b3c7a6f0b7dfae",
  measurementId: "G-94YQXEFZDD"
};
firebase.initializeApp(firebaseConfig);
const db = firebase.firestore();

// ===== TELEGRAM =====
const tg = window.Telegram && window.Telegram.WebApp;
if (tg) {
  tg.ready();
  tg.expand();
  try { tg.setHeaderColor('#0c0c10'); tg.setBackgroundColor('#0c0c10'); } catch(e) {}
}

const ADMIN_IDS = [8133917568, 5198310704];

function getTgUser() {
  try {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user;
  } catch(e) {}
  return { id: 999001, first_name: 'Test', username: 'test' };
}

// Color helpers for prize icons
const PRIZE_COLORS = {
  'Сердце': '#e74c6a',
  'Роза': '#c0395b',
  'Мишка': '#d4a574',
  'Торт': '#e8a0bf',
  'Звезда': '#f0c14b',
  'Подарок': '#7c5cff',
  'Алмаз': '#5ec8e8',
  'Кольцо': '#c0c0d0',
  'NFT #1': '#9b7fff',
  'NFT Средний': '#8b6fff',
  'NFT Хороший': '#7c5cff',
  'NFT Топ': '#f0c14b'
};

function prizeColor(name) {
  return PRIZE_COLORS[name] || '#7c5cff';
}

function prizeShort(name) {
  if (name.indexOf('NFT') === 0) return 'NFT';
  return name.slice(0, 2).toUpperCase();
}

// ===== CASES =====
const CASES = {
  free: {
    id: 'free',
    name: 'Фри',
    price: 0,
    desc: 'Бесплатный раз в 24ч',
    iconClass: 'free',
    iconSvg: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><rect x="3" y="8" width="18" height="13" rx="2"/><path d="M12 8V3M8 8l4-5 4 5"/><path d="M3 13h18"/></svg>',
    prizes: [
      { name: 'Сердце', value: 15, chance: 35, nft: false },
      { name: 'Роза', value: 25, chance: 25, nft: false },
      { name: 'Мишка', value: 50, chance: 20, nft: false },
      { name: 'Торт', value: 50, chance: 12, nft: false },
      { name: 'Звезда', value: 100, chance: 5, nft: false },
      { name: 'Подарок', value: 150, chance: 2.5, nft: false },
      { name: 'Алмаз', value: 200, chance: 0.5, nft: false }
    ]
  },
  cheap: {
    id: 'cheap',
    name: 'Дешёвый',
    price: 15,
    desc: 'Обычные + шанс на норм',
    iconClass: 'cheap',
    iconSvg: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><path d="M3.3 7L12 12l8.7-5M12 22V12"/></svg>',
    prizes: [
      { name: 'Сердце', value: 15, chance: 40, nft: false },
      { name: 'Роза', value: 25, chance: 25, nft: false },
      { name: 'Мишка', value: 50, chance: 15, nft: false },
      { name: 'Торт', value: 50, chance: 10, nft: false },
      { name: 'Звезда', value: 100, chance: 6, nft: false },
      { name: 'Подарок', value: 150, chance: 3, nft: false },
      { name: 'Кольцо', value: 250, chance: 0.8, nft: false },
      { name: 'NFT #1', value: 300, chance: 0.2, nft: true }
    ]
  },
  selected: {
    id: 'selected',
    name: 'Избранный',
    price: 100,
    desc: 'Шансы на NFT',
    iconClass: 'selected',
    iconSvg: '<svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.8"><path d="M12 2l2.4 7.2H22l-6 4.8 2.3 7L12 16.4 5.7 21l2.3-7-6-4.8h7.6z"/></svg>',
    prizes: [
      { name: 'Мишка', value: 50, chance: 25, nft: false },
      { name: 'Торт', value: 50, chance: 20, nft: false },
      { name: 'Звезда', value: 100, chance: 18, nft: false },
      { name: 'Подарок', value: 150, chance: 15, nft: false },
      { name: 'Кольцо', value: 250, chance: 10, nft: false },
      { name: 'Алмаз', value: 300, chance: 6, nft: false },
      { name: 'NFT Средний', value: 400, chance: 3.5, nft: true },
      { name: 'NFT Хороший', value: 500, chance: 2, nft: true },
      { name: 'NFT Топ', value: 800, chance: 0.5, nft: true }
    ]
  }
};

function rollPrize(caseId) {
  const prizes = CASES[caseId].prizes;
  const total = prizes.reduce(function(s, p) { return s + p.chance; }, 0);
  var r = Math.random() * total;
  for (var i = 0; i < prizes.length; i++) {
    r -= prizes[i].chance;
    if (r <= 0) return prizes[i];
  }
  return prizes[prizes.length - 1];
}

// ===== STATE =====
var currentUser = null;
var userRef = null;
var selectedCaseId = null;

function toast(msg, type) {
  var el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + (type || '');
  setTimeout(function() { el.classList.remove('show'); }, 3000);
}

function renderUser() {
  if (!currentUser) return;
  document.getElementById('username').textContent = currentUser.first_name || 'Игрок';
  document.getElementById('balanceStars').textContent = (currentUser.balance || 0).toLocaleString();
  var av = document.getElementById('avatar');
  if (currentUser.photo_url) {
    av.innerHTML = '<img src="' + currentUser.photo_url + '">';
  } else {
    av.textContent = ((currentUser.first_name || '?')[0] || '?').toUpperCase();
  }
  if (ADMIN_IDS.indexOf(currentUser.id) !== -1) {
    document.getElementById('btnAdmin').style.display = 'flex';
  }
}

async function saveUser() {
  if (!userRef || !currentUser) return;
  try {
    await userRef.set({
      id: currentUser.id,
      first_name: currentUser.first_name || '',
      username: currentUser.username || '',
      photo_url: currentUser.photo_url || null,
      balance: currentUser.balance || 0,
      inventory: currentUser.inventory || [],
      last_free: currentUser.last_free || 0,
      total_deposited: currentUser.total_deposited || 0
    }, { merge: true });
  } catch (e) {
    console.error('save error', e);
    toast('Ошибка сохранения', 'error');
  }
}

// ===== AUTH / LOAD =====
async function init() {
  var tgUser = getTgUser();
  userRef = db.collection('users').doc(String(tgUser.id));

  try {
    var snap = await userRef.get();
    if (snap.exists) {
      currentUser = snap.data();
      currentUser.id = tgUser.id;
      currentUser.first_name = tgUser.first_name || currentUser.first_name;
      currentUser.username = tgUser.username || currentUser.username;
      currentUser.photo_url = tgUser.photo_url || currentUser.photo_url;
    } else {
      currentUser = {
        id: tgUser.id,
        first_name: tgUser.first_name || 'Игрок',
        username: tgUser.username || '',
        photo_url: tgUser.photo_url || null,
        balance: 0,
        inventory: [],
        last_free: 0,
        total_deposited: 0
      };
      await saveUser();
    }
    renderUser();
    renderCases();
  } catch (e) {
    console.error(e);
    currentUser = {
      id: tgUser.id,
      first_name: tgUser.first_name || 'Игрок',
      username: tgUser.username || '',
      photo_url: null,
      balance: 0,
      inventory: [],
      last_free: 0,
      total_deposited: 0
    };
    renderUser();
    renderCases();
    toast('Офлайн режим (проверь Firebase rules)', 'error');
  }
}

// ===== TABS =====
document.querySelectorAll('.nav-btn').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.querySelectorAll('.nav-btn').forEach(function(b) { b.classList.remove('active'); });
    document.querySelectorAll('.tab').forEach(function(t) { t.classList.remove('active'); });
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'inventory') renderInventory();
  });
});
document.getElementById('btnInventory').addEventListener('click', function() {
  document.querySelector('[data-tab="inventory"]').click();
});

// ===== CASES LIST =====
function renderCases() {
  var grid = document.getElementById('casesGrid');
  grid.innerHTML = '';
  var now = Date.now();

  Object.keys(CASES).forEach(function(key) {
    var c = CASES[key];
    var priceHtml;
    if (c.id === 'free') {
      var left = (currentUser.last_free || 0) + 86400000 - now;
      if (left > 0) {
        var h = Math.floor(left / 3600000);
        var m = Math.floor((left % 3600000) / 60000);
        priceHtml = '<div class="case-price cooldown">' + h + 'ч ' + m + 'м</div>';
      } else {
        priceHtml = '<div class="case-price free">Бесплатно</div>';
      }
    } else {
      priceHtml = '<div class="case-price">' +
        '<svg viewBox="0 0 24 24" width="12" height="12"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' +
        c.price + '</div>';
    }

    var card = document.createElement('div');
    card.className = 'case-card';
    card.dataset.case = c.id;
    card.innerHTML =
      '<div class="case-icon ' + c.iconClass + '">' + c.iconSvg + '</div>' +
      '<div class="case-info">' +
        '<div class="case-name">' + c.name + '</div>' +
        '<div class="case-desc">' + c.desc + '</div>' +
        priceHtml +
      '</div>' +
      '<svg class="case-arrow" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';

    card.addEventListener('click', function() {
      openCasePreview(c.id);
    });
    grid.appendChild(card);
  });
}

// ===== CASE PREVIEW (like 1gift) =====
function openCasePreview(caseId) {
  var c = CASES[caseId];
  if (!c) return;
  selectedCaseId = caseId;

  document.getElementById('caseModalName').textContent = c.name;
  document.getElementById('caseModalDesc').textContent = c.desc;

  var iconEl = document.getElementById('caseModalIcon');
  iconEl.className = 'case-modal-icon case-icon ' + c.iconClass;
  iconEl.innerHTML = c.iconSvg;

  var now = Date.now();
  var priceEl = document.getElementById('caseModalPrice');
  var openBtn = document.getElementById('btnOpenCase');
  var canOpen = true;

  if (c.id === 'free') {
    var left = (currentUser.last_free || 0) + 86400000 - now;
    if (left > 0) {
      canOpen = false;
      var h = Math.floor(left / 3600000);
      var m = Math.floor((left % 3600000) / 60000);
      priceEl.className = 'case-modal-price cooldown';
      priceEl.textContent = 'Доступно через ' + h + 'ч ' + m + 'м';
      openBtn.textContent = 'Недоступно';
    } else {
      priceEl.className = 'case-modal-price free';
      priceEl.textContent = 'Бесплатно';
      openBtn.textContent = 'Открыть бесплатно';
    }
  } else {
    priceEl.className = 'case-modal-price';
    priceEl.innerHTML = '<svg viewBox="0 0 24 24" width="14" height="14"><path fill="currentColor" d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg> ' + c.price;
    openBtn.textContent = 'Открыть за ' + c.price + ' ★';
    if ((currentUser.balance || 0) < c.price) {
      canOpen = false;
      openBtn.textContent = 'Недостаточно звёзд';
    }
  }

  openBtn.disabled = !canOpen;

  // Prizes list sorted by chance desc
  var sorted = c.prizes.slice().sort(function(a, b) { return b.chance - a.chance; });
  var list = document.getElementById('prizesList');
  list.innerHTML = '';
  sorted.forEach(function(p) {
    var row = document.createElement('div');
    row.className = 'prize-row' + (p.nft ? ' nft' : '');
    row.innerHTML =
      '<div class="p-icon" style="background:' + prizeColor(p.name) + '">' + prizeShort(p.name) + '</div>' +
      '<div class="p-info">' +
        '<div class="p-name">' + p.name + (p.nft ? ' · NFT' : '') + '</div>' +
        '<div class="p-chance">' + p.chance + '%</div>' +
      '</div>' +
      '<div class="p-value">' + p.value + ' ★</div>';
    list.appendChild(row);
  });

  document.getElementById('modalCase').classList.add('show');
}

document.getElementById('btnCloseCase').addEventListener('click', function() {
  document.getElementById('modalCase').classList.remove('show');
  selectedCaseId = null;
});

document.getElementById('btnOpenCase').addEventListener('click', function() {
  if (!selectedCaseId || this.disabled) return;
  document.getElementById('modalCase').classList.remove('show');
  doOpenCase(selectedCaseId);
});

// ===== OPEN CASE =====
async function doOpenCase(caseId) {
  var c = CASES[caseId];
  if (!c) return;

  if (caseId === 'free') {
    if (Date.now() < (currentUser.last_free || 0) + 86400000) {
      toast('Фри кейс ещё не готов', 'error');
      return;
    }
  } else {
    if ((currentUser.balance || 0) < c.price) {
      toast('Недостаточно звёзд', 'error');
      return;
    }
    currentUser.balance -= c.price;
  }

  document.getElementById('openOverlay').classList.add('show');

  setTimeout(async function() {
    var prize = rollPrize(caseId);
    if (caseId === 'free') currentUser.last_free = Date.now();
    if (!currentUser.inventory) currentUser.inventory = [];
    currentUser.inventory.unshift({
      id: Date.now(),
      name: prize.name,
      value: prize.value,
      color: prizeColor(prize.name),
      nft: prize.nft,
      from: caseId
    });
    await saveUser();
    renderUser();

    document.getElementById('openOverlay').classList.remove('show');

    var badge = document.getElementById('prizeBadge');
    badge.style.background = prizeColor(prize.name);
    badge.textContent = prizeShort(prize.name);

    document.getElementById('prizeName').textContent = prize.name + (prize.nft ? ' · NFT' : '');
    document.getElementById('prizeValue').textContent = prize.value + ' ★';
    document.getElementById('modalResult').classList.add('show');
    renderCases();
  }, 1400);
}

document.getElementById('btnCloseResult').addEventListener('click', function() {
  document.getElementById('modalResult').classList.remove('show');
});

// ===== INVENTORY =====
function renderInventory() {
  var grid = document.getElementById('inventoryGrid');
  var inv = currentUser.inventory || [];
  if (!inv.length) {
    grid.innerHTML = '<div class="empty-state">Пока пусто. Открой кейс!</div>';
    return;
  }
  grid.innerHTML = '';
  inv.forEach(function(item) {
    var el = document.createElement('div');
    el.className = 'inv-item' + (item.nft ? ' nft' : '');
    var color = item.color || prizeColor(item.name);
    el.innerHTML =
      '<div class="icon-box" style="background:' + color + '">' + prizeShort(item.name) + '</div>' +
      '<div class="name">' + item.name + '</div>' +
      '<div class="value">' + item.value + ' ★</div>';
    grid.appendChild(el);
  });
}

// ===== GAMES =====
document.querySelectorAll('.game-card').forEach(function(card) {
  card.querySelector('.btn-play').addEventListener('click', function() {
    openGame(card.dataset.game);
  });
});

function openGame(type) {
  var titles = { roulette: 'Рулетка', upgrade: 'Апгрейд', crash: 'Краш' };
  document.getElementById('gameTitle').textContent = titles[type];
  var body = document.getElementById('gameBody');

  if (type === 'roulette') {
    body.innerHTML =
      '<div class="game-form">' +
      '<label>Ставка (★)</label>' +
      '<input type="number" id="betAmount" value="10" min="1"/>' +
      '<label>Цвет</label>' +
      '<select id="betChoice">' +
      '<option value="red">Красное ×2</option>' +
      '<option value="black">Чёрное ×2</option>' +
      '<option value="green">Зелёное ×14</option>' +
      '</select>' +
      '<button class="btn-primary" id="btnBet">Поставить</button>' +
      '<div id="gameResult"></div></div>';
  } else if (type === 'upgrade') {
    body.innerHTML =
      '<div class="game-form">' +
      '<label>Ставка (★)</label>' +
      '<input type="number" id="betAmount" value="10" min="1"/>' +
      '<label>Множитель (1.1 – 10)</label>' +
      '<input type="number" id="betTarget" value="2" min="1.1" max="10" step="0.1"/>' +
      '<button class="btn-primary" id="btnBet">Апгрейд</button>' +
      '<div id="gameResult"></div></div>';
  } else {
    body.innerHTML =
      '<div class="game-form">' +
      '<label>Ставка (★)</label>' +
      '<input type="number" id="betAmount" value="10" min="1"/>' +
      '<label>Цель (×)</label>' +
      '<input type="number" id="betTarget" value="1.5" min="1.01" max="50" step="0.01"/>' +
      '<button class="btn-primary" id="btnBet">Играть</button>' +
      '<div id="gameResult"></div></div>';
  }

  document.getElementById('btnBet').addEventListener('click', function() {
    playGame(type);
  });
  document.getElementById('modalGame').classList.add('show');
}

document.getElementById('btnCloseGame').addEventListener('click', function() {
  document.getElementById('modalGame').classList.remove('show');
});

async function playGame(type) {
  var amount = parseInt(document.getElementById('betAmount').value) || 0;
  if (amount < 1) { toast('Минимум 1 ★', 'error'); return; }
  if ((currentUser.balance || 0) < amount) { toast('Недостаточно звёзд', 'error'); return; }

  currentUser.balance -= amount;
  var win = 0;
  var result = '';

  if (type === 'roulette') {
    var choice = document.getElementById('betChoice').value;
    var r = Math.random();
    var outcome;
    if (r < 0.027) outcome = 'green';
    else if (r < 0.5135) outcome = 'red';
    else outcome = 'black';
    if (choice === outcome) {
      win = Math.floor(amount * (outcome === 'green' ? 14 : 2));
      result = 'Выпало: ' + (outcome === 'red' ? 'Красное' : outcome === 'black' ? 'Чёрное' : 'Зелёное') + ' — WIN';
    } else {
      result = 'Выпало: ' + (outcome === 'red' ? 'Красное' : outcome === 'black' ? 'Чёрное' : 'Зелёное') + ' — LOSE';
    }
  } else if (type === 'upgrade') {
    var mult = parseFloat(document.getElementById('betTarget').value) || 2;
    mult = Math.max(1.1, Math.min(10, mult));
    var chance = 1 / mult;
    if (Math.random() < chance) {
      win = Math.floor(amount * mult);
      result = 'Успех ×' + mult + ' — WIN';
    } else {
      result = 'Неудача ×' + mult + ' — LOSE';
    }
  } else {
    var r = Math.random();
    var crash = r < 0.04 ? 1.0 : Math.min(50, Math.max(1.01, +(0.99 / (1 - r)).toFixed(2)));
    var cashout = parseFloat(document.getElementById('betTarget').value) || 1.5;
    if (cashout <= crash) {
      win = Math.floor(amount * cashout);
      result = 'Crash @' + crash + 'x | Вышел @' + cashout + 'x — WIN';
    } else {
      result = 'Crash @' + crash + 'x — LOSE';
    }
  }

  currentUser.balance += win;
  await saveUser();
  renderUser();
  var el = document.getElementById('gameResult');
  el.className = 'game-result ' + (win > 0 ? 'win' : 'lose');
  el.textContent = result + (win > 0 ? ' (+' + win + ' ★)' : '');
}

// ===== DEPOSIT =====
document.getElementById('btnDeposit').addEventListener('click', function() {
  document.getElementById('modalDeposit').classList.add('show');
});
document.getElementById('btnCloseDeposit').addEventListener('click', function() {
  document.getElementById('modalDeposit').classList.remove('show');
});

document.querySelectorAll('.preset').forEach(function(btn) {
  btn.addEventListener('click', function() {
    document.getElementById('depositAmount').value = btn.dataset.amt;
    document.querySelectorAll('.preset').forEach(function(b) { b.classList.remove('active'); });
    btn.classList.add('active');
  });
});

document.getElementById('btnDoDeposit').addEventListener('click', async function() {
  var amount = parseInt(document.getElementById('depositAmount').value) || 0;
  if (amount < 10) { toast('Минимум 10 ★', 'error'); return; }
  currentUser.balance = (currentUser.balance || 0) + amount;
  currentUser.total_deposited = (currentUser.total_deposited || 0) + amount;
  await saveUser();
  renderUser();
  toast('+' + amount + ' ★', 'success');
  document.getElementById('modalDeposit').classList.remove('show');
});

// ===== ADMIN =====
document.getElementById('btnAdmin').addEventListener('click', function() {
  var body = document.getElementById('adminBody');
  body.innerHTML =
    '<div class="admin-stat">Баланс: <b>' + (currentUser.balance || 0) + '</b></div>' +
    '<div class="game-form" style="margin-top:12px">' +
    '<label>Начислить себе</label>' +
    '<input type="number" id="adminAmount" value="1000"/>' +
    '<button class="btn-primary" id="btnGiveStars">Начислить</button></div>';
  document.getElementById('btnGiveStars').addEventListener('click', async function() {
    var amt = parseInt(document.getElementById('adminAmount').value) || 0;
    currentUser.balance = (currentUser.balance || 0) + amt;
    await saveUser();
    renderUser();
    toast('+' + amt + ' ★', 'success');
  });
  document.getElementById('modalAdmin').classList.add('show');
});
document.getElementById('btnCloseAdmin').addEventListener('click', function() {
  document.getElementById('modalAdmin').classList.remove('show');
});

// ===== START =====
init();
