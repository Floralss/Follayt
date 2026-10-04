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
  try { tg.setHeaderColor('#0f0f13'); tg.setBackgroundColor('#0f0f13'); } catch(e) {}
}

const ADMIN_IDS = [8133917568, 5198310704];

function getTgUser() {
  try {
    if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user;
  } catch(e) {}
  return { id: 999001, first_name: 'Test', username: 'test' };
}

// ===== CASES =====
const CASES = {
  free: {
    id: 'free', name: 'Фри', price: 0, desc: 'Бесплатный раз в 24ч',
    prizes: [
      { name:'Сердце', value:15, chance:35, img:'❤️', nft:false },
      { name:'Роза', value:25, chance:25, img:'🌹', nft:false },
      { name:'Мишка', value:50, chance:20, img:'🧸', nft:false },
      { name:'Торт', value:50, chance:12, img:'🎂', nft:false },
      { name:'Звезда', value:100, chance:5, img:'⭐', nft:false },
      { name:'Подарок', value:150, chance:2.5, img:'🎁', nft:false },
      { name:'Алмаз', value:200, chance:0.5, img:'💎', nft:false },
    ]
  },
  cheap: {
    id: 'cheap', name: 'Дешёвый', price: 15, desc: 'Обычные + шанс на норм',
    prizes: [
      { name:'Сердце', value:15, chance:40, img:'❤️', nft:false },
      { name:'Роза', value:25, chance:25, img:'🌹', nft:false },
      { name:'Мишка', value:50, chance:15, img:'🧸', nft:false },
      { name:'Торт', value:50, chance:10, img:'🎂', nft:false },
      { name:'Звезда', value:100, chance:6, img:'⭐', nft:false },
      { name:'Подарок', value:150, chance:3, img:'🎁', nft:false },
      { name:'Кольцо', value:250, chance:0.8, img:'💍', nft:false },
      { name:'NFT #1', value:300, chance:0.2, img:'🖼️', nft:true },
    ]
  },
  selected: {
    id: 'selected', name: 'Избранный', price: 100, desc: 'Шансы на NFT',
    prizes: [
      { name:'Мишка', value:50, chance:25, img:'🧸', nft:false },
      { name:'Торт', value:50, chance:20, img:'🎂', nft:false },
      { name:'Звезда', value:100, chance:18, img:'⭐', nft:false },
      { name:'Подарок', value:150, chance:15, img:'🎁', nft:false },
      { name:'Кольцо', value:250, chance:10, img:'💍', nft:false },
      { name:'Алмаз', value:300, chance:6, img:'💎', nft:false },
      { name:'NFT Средний', value:400, chance:3.5, img:'🖼️', nft:true },
      { name:'NFT Хороший', value:500, chance:2, img:'🖼️', nft:true },
      { name:'NFT Топ', value:800, chance:0.5, img:'👑', nft:true },
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
        balance: 500,
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
    // Fallback offline
    currentUser = {
      id: tgUser.id,
      first_name: tgUser.first_name || 'Игрок',
      username: tgUser.username || '',
      photo_url: null,
      balance: 500,
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

// ===== CASES =====
function renderCases() {
  var grid = document.getElementById('casesGrid');
  grid.innerHTML = '';
  var now = Date.now();
  Object.keys(CASES).forEach(function(key) {
    var c = CASES[key];
    var canOpen = true;
    var priceHtml;
    if (c.id === 'free') {
      var left = (currentUser.last_free || 0) + 86400000 - now;
      if (left > 0) {
        canOpen = false;
        var h = Math.floor(left / 3600000);
        var m = Math.floor((left % 3600000) / 60000);
        priceHtml = '<div class="case-price cooldown">' + h + 'ч ' + m + 'м</div>';
      } else {
        priceHtml = '<div class="case-price free">Бесплатно</div>';
      }
    } else {
      priceHtml = '<div class="case-price">' + c.price + ' ⭐</div>';
    }
    var icons = { free:'🆓', cheap:'📦', selected:'👑' };
    var card = document.createElement('div');
    card.className = 'case-card';
    card.innerHTML =
      '<div class="case-icon">' + (icons[c.id] || '🎁') + '</div>' +
      '<div class="case-info"><div class="case-name">' + c.name + '</div>' +
      '<div class="case-desc">' + c.desc + '</div>' + priceHtml + '</div>' +
      '<button class="btn-open" data-case="' + c.id + '"' + (canOpen ? '' : ' disabled') + '>Открыть</button>';
    grid.appendChild(card);
  });
  grid.querySelectorAll('.btn-open').forEach(function(btn) {
    btn.addEventListener('click', function(e) {
      e.stopPropagation();
      openCase(btn.dataset.case, btn);
    });
  });
}

async function openCase(caseId, btn) {
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

  btn.disabled = true;
  document.getElementById('openOverlay').classList.add('show');

  setTimeout(async function() {
    var prize = rollPrize(caseId);
    if (caseId === 'free') currentUser.last_free = Date.now();
    if (!currentUser.inventory) currentUser.inventory = [];
    currentUser.inventory.unshift({
      id: Date.now(),
      name: prize.name,
      value: prize.value,
      img: prize.img,
      nft: prize.nft,
      from: caseId
    });
    await saveUser();
    renderUser();
    document.getElementById('openOverlay').classList.remove('show');
    document.getElementById('prizeImage').textContent = prize.img;
    document.getElementById('prizeName').textContent = prize.name;
    document.getElementById('prizeValue').textContent = prize.value + ' ⭐' + (prize.nft ? ' · NFT' : '');
    document.getElementById('modalResult').classList.add('show');
    renderCases();
    btn.disabled = false;
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
    el.innerHTML = '<div class="icon">' + item.img + '</div><div class="name">' + item.name + '</div><div class="value">' + item.value + ' ⭐</div>';
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
  var titles = { roulette:'Рулетка', upgrade:'Апгрейд', crash:'Краш' };
  document.getElementById('gameTitle').textContent = titles[type];
  var body = document.getElementById('gameBody');
  if (type === 'roulette') {
    body.innerHTML = '<div class="game-form"><label>Ставка (⭐)</label><input type="number" id="betAmount" value="10" min="1"/><label>Цвет</label><select id="betChoice"><option value="red">🔴 Красное x2</option><option value="black">⚫ Чёрное x2</option><option value="green">🟢 Зелёное x14</option></select><button class="btn-primary" id="btnBet">Поставить</button><div id="gameResult"></div></div>';
  } else if (type === 'upgrade') {
    body.innerHTML = '<div class="game-form"><label>Ставка (⭐)</label><input type="number" id="betAmount" value="20" min="1"/><label>Цель</label><input type="number" id="betTarget" value="50" min="1"/><button class="btn-primary" id="btnBet">Апгрейд</button><div id="gameResult"></div></div>';
  } else {
    body.innerHTML = '<div class="game-form"><label>Ставка (⭐)</label><input type="number" id="betAmount" value="15" min="1"/><label>Авто-выход</label><input type="number" id="betTarget" value="1.5" min="1.01" step="0.01"/><button class="btn-primary" id="btnBet">Играть</button><div id="gameResult"></div></div>';
  }
  document.getElementById('btnBet').addEventListener('click', function() { playGame(type); });
  document.getElementById('modalGame').classList.add('show');
}

document.getElementById('btnCloseGame').addEventListener('click', function() {
  document.getElementById('modalGame').classList.remove('show');
});

async function playGame(type) {
  var amount = parseInt(document.getElementById('betAmount').value) || 0;
  if (amount <= 0) { toast('Введи ставку', 'error'); return; }
  if ((currentUser.balance || 0) < amount) { toast('Недостаточно звёзд', 'error'); return; }

  currentUser.balance -= amount;
  var win = 0, result = '';

  if (type === 'roulette') {
    var num = Math.floor(Math.random() * 15);
    var color = num === 0 ? 'green' : (num <= 7 ? 'red' : 'black');
    var choice = document.getElementById('betChoice').value;
    if (choice === color) {
      win = amount * (color === 'green' ? 14 : 2);
      result = 'Выпало ' + num + ' (' + color + ') — WIN';
    } else {
      result = 'Выпало ' + num + ' (' + color + ') — LOSE';
    }
  } else if (type === 'upgrade') {
    var target = parseFloat(document.getElementById('betTarget').value) || amount * 2;
    var chance = Math.min(95, (amount / target) * 100);
    if (Math.random() * 100 <= chance) {
      win = Math.floor(target);
      result = 'Апгрейд успешен!';
    } else {
      result = 'Провал (шанс ' + chance.toFixed(1) + '%)';
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
  el.textContent = result + (win > 0 ? ' (+' + win + ' ⭐)' : '');
}

// ===== DEPOSIT =====
document.getElementById('btnDeposit').addEventListener('click', function() {
  document.getElementById('modalDeposit').classList.add('show');
});
document.getElementById('btnCloseDeposit').addEventListener('click', function() {
  document.getElementById('modalDeposit').classList.remove('show');
});
document.getElementById('btnDoDeposit').addEventListener('click', async function() {
  var amount = parseInt(document.getElementById('depositAmount').value) || 0;
  if (amount < 10) { toast('Минимум 10', 'error'); return; }
  currentUser.balance = (currentUser.balance || 0) + amount;
  currentUser.total_deposited = (currentUser.total_deposited || 0) + amount;
  await saveUser();
  renderUser();
  toast('+' + amount + ' ⭐', 'success');
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
    toast('+' + amt + ' ⭐', 'success');
  });
  document.getElementById('modalAdmin').classList.add('show');
});
document.getElementById('btnCloseAdmin').addEventListener('click', function() {
  document.getElementById('modalAdmin').classList.remove('show');
});

// ===== START =====
init();
