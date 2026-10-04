const tg = window.Telegram?.WebApp;
if (tg) { tg.ready(); tg.expand(); tg.setHeaderColor('#0f0f13'); tg.setBackgroundColor('#0f0f13'); }

// ===== CONFIG =====
// Change this to your public backend URL (Railway/Render/VPS)
// Leave empty to use same origin, or localhost for local test
const API_URL = localStorage.getItem('API_URL') || 'http://localhost:8000';
// ==================

const API = API_URL;

let initData = tg?.initData || '';
let currentUser = null;

function toast(msg, type='') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = 'toast show ' + type;
  setTimeout(() => el.classList.remove('show'), 3000);
}

async function api(path, options={}) {
  const res = await fetch(API + path, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.detail || 'Error ' + res.status);
  return data;
}

async function auth() {
  try {
    if (!initData) {
      initData = 'user=' + encodeURIComponent(JSON.stringify({
        id: 8133917568, first_name: 'Admin', username: 'admin', photo_url: null
      }));
    }
    const data = await api('/api/auth', { method:'POST', body: JSON.stringify({ initData }) });
    currentUser = data.user;
    renderUser();
    loadCases();
    loadInventory();
    if (currentUser.is_admin) {
      document.getElementById('btnAdmin').style.display = 'flex';
    }
  } catch(e) {
    toast(e.message || 'Auth error', 'error');
    console.error(e);
  }
}

function renderUser() {
  if (!currentUser) return;
  const name = currentUser.first_name || currentUser.username || 'Player';
  document.getElementById('username').textContent = name;
  document.getElementById('balanceStars').textContent = currentUser.balance_stars.toLocaleString();
  const avatarEl = document.getElementById('avatar');
  if (currentUser.photo_url) {
    avatarEl.innerHTML = '<img src="' + currentUser.photo_url + '" alt="">';
  } else {
    avatarEl.textContent = name.charAt(0).toUpperCase();
  }
}

function updateBalance(n) {
  if (currentUser) {
    currentUser.balance_stars = n;
    document.getElementById('balanceStars').textContent = n.toLocaleString();
  }
}

document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'inventory') loadInventory();
  });
});
document.getElementById('btnInventory').addEventListener('click', () => document.querySelector('[data-tab="inventory"]').click());

const CASE_ICONS = { free:'FREE', cheap:'BOX', selected:'VIP' };

async function loadCases() {
  try {
    const data = await api('/api/cases');
    const grid = document.getElementById('casesGrid');
    grid.innerHTML = '';
    data.cases.forEach(c => {
      const canFree = c.id !== 'free' || (currentUser && currentUser.can_free_case);
      let priceHtml;
      if (c.id === 'free') {
        if (canFree) priceHtml = '<div class="case-price free">FREE</div>';
        else {
          const sec = currentUser?.free_cooldown_sec || 0;
          const h = Math.floor(sec/3600), m = Math.floor((sec%3600)/60);
          priceHtml = '<div class="case-price cooldown">in ' + h + 'h ' + m + 'm</div>';
        }
      } else {
        priceHtml = '<div class="case-price">' + c.price_stars + ' * </div>';
      }
      const card = document.createElement('div');
      card.className = 'case-card';
      card.innerHTML =
        '<div class="case-icon">' + (CASE_ICONS[c.id]||'GIFT') + '</div>' +
        '<div class="case-info">' +
          '<div class="case-name">' + c.name + '</div>' +
          '<div class="case-desc">' + c.description + '</div>' +
          priceHtml +
        '</div>' +
        '<button class="btn-open" data-case="' + c.id + '"' + (!canFree && c.id==='free' ? ' disabled' : '') + '>Open</button>';
      grid.appendChild(card);
    });
    grid.querySelectorAll('.btn-open').forEach(btn => {
      btn.addEventListener('click', e => { e.stopPropagation(); openCase(btn.dataset.case, btn); });
    });
  } catch(e) { toast(e.message, 'error'); }
}

async function openCase(caseId, btn) {
  if (btn.disabled) return;
  btn.disabled = true;
  const overlay = document.getElementById('openOverlay');
  overlay.classList.add('show');
  try {
    const data = await api('/api/open-case', {
      method:'POST', body: JSON.stringify({ initData, case_id: caseId })
    });
    await new Promise(r => setTimeout(r, 1200));
    overlay.classList.remove('show');
    updateBalance(data.new_balance);
    if (data.can_free_case !== undefined) {
      currentUser.can_free_case = data.can_free_case;
      currentUser.free_cooldown_sec = data.free_cooldown_sec;
    }
    showPrize(data.prize);
    loadCases();
    loadInventory();
  } catch(e) {
    overlay.classList.remove('show');
    toast(e.message, 'error');
  } finally {
    btn.disabled = false;
  }
}

function showPrize(prize) {
  document.getElementById('prizeImage').textContent = prize.image || 'GIFT';
  document.getElementById('prizeName').textContent = prize.name;
  document.getElementById('prizeValue').textContent = prize.value + ' *' + (prize.is_nft ? ' NFT' : '');
  document.getElementById('modalResult').classList.add('show');
}
document.getElementById('btnCloseResult').addEventListener('click', () => {
  document.getElementById('modalResult').classList.remove('show');
});

async function loadInventory() {
  try {
    const data = await api('/api/inventory?initData=' + encodeURIComponent(initData));
    const grid = document.getElementById('inventoryGrid');
    if (!data.items.length) {
      grid.innerHTML = '<div class="empty-state">Empty. Open a case!</div>';
      return;
    }
    grid.innerHTML = '';
    data.items.forEach(item => {
      const el = document.createElement('div');
      el.className = 'inv-item' + (item.is_nft ? ' nft' : '');
      el.innerHTML = '<div class="icon">' + (item.image||'GIFT') + '</div><div class="name">' + item.name + '</div><div class="value">' + item.value + ' *</div>';
      grid.appendChild(el);
    });
  } catch(e) {}
}

document.querySelectorAll('.game-card').forEach(card => {
  card.querySelector('.btn-play').addEventListener('click', () => openGame(card.dataset.game));
});

function openGame(type) {
  const modal = document.getElementById('modalGame');
  const title = document.getElementById('gameTitle');
  const body = document.getElementById('gameBody');
  const titles = { roulette:'Roulette', upgrade:'Upgrade', crash:'Crash' };
  title.textContent = titles[type] || 'Game';
  if (type === 'roulette') {
    body.innerHTML = '<div class="game-form"><label>Bet (*)</label><input type="number" id="betAmount" value="10" min="1"/><label>Color</label><select id="betChoice"><option value="red">Red (x2)</option><option value="black">Black (x2)</option><option value="green">Green (x14)</option></select><button class="btn-primary" id="btnBet">Bet</button><div id="gameResult"></div></div>';
  } else if (type === 'upgrade') {
    body.innerHTML = '<div class="game-form"><label>Bet (*)</label><input type="number" id="betAmount" value="20" min="1"/><label>Target</label><input type="number" id="betTarget" value="50" min="1"/><button class="btn-primary" id="btnBet">Upgrade</button><div id="gameResult"></div></div>';
  } else {
    body.innerHTML = '<div class="game-form"><label>Bet (*)</label><input type="number" id="betAmount" value="15" min="1"/><label>Auto cashout</label><input type="number" id="betTarget" value="1.50" min="1.01" step="0.01"/><button class="btn-primary" id="btnBet">Play</button><div id="gameResult"></div></div>';
  }
  document.getElementById('btnBet').addEventListener('click', () => placeBet(type));
  modal.classList.add('show');
}
document.getElementById('btnCloseGame').addEventListener('click', () => document.getElementById('modalGame').classList.remove('show'));

async function placeBet(gameType) {
  const amount = parseInt(document.getElementById('betAmount').value) || 0;
  const choice = document.getElementById('betChoice')?.value;
  const target = parseFloat(document.getElementById('betTarget')?.value);
  if (amount <= 0) { toast('Enter bet','error'); return; }
  const btn = document.getElementById('btnBet');
  btn.disabled = true; btn.textContent = '...';
  try {
    const payload = { initData, game_type: gameType, bet_amount: amount };
    if (choice) payload.choice = choice;
    if (target) payload.target = target;
    const data = await api('/api/game/bet', { method:'POST', body: JSON.stringify(payload) });
    updateBalance(data.new_balance);
    const resultEl = document.getElementById('gameResult');
    resultEl.className = 'game-result ' + (data.win_amount > 0 ? 'win' : 'lose');
    resultEl.textContent = data.result + (data.win_amount > 0 ? ' (+' + data.win_amount + ')' : '');
  } catch(e) { toast(e.message,'error'); }
  finally {
    btn.disabled = false;
    btn.textContent = gameType === 'upgrade' ? 'Upgrade' : (gameType === 'crash' ? 'Play' : 'Bet');
  }
}

document.getElementById('btnDeposit').addEventListener('click', () => {
  document.getElementById('modalDeposit').classList.add('show');
});
document.getElementById('btnCloseDeposit').addEventListener('click', () => {
  document.getElementById('modalDeposit').classList.remove('show');
});
document.getElementById('btnDoDeposit').addEventListener('click', async () => {
  const amount = parseInt(document.getElementById('depositAmount').value) || 0;
  const method = document.getElementById('depositMethod').value;
  if (amount < 10) { toast('Min 10','error'); return; }
  try {
    const data = await api('/api/deposit', {
      method:'POST', body: JSON.stringify({ initData, amount, method })
    });
    if (data.new_balance !== undefined) updateBalance(data.new_balance);
    toast(data.message, 'success');
    document.getElementById('modalDeposit').classList.remove('show');
  } catch(e) { toast(e.message,'error'); }
});

document.getElementById('btnAdmin').addEventListener('click', async () => {
  const modal = document.getElementById('modalAdmin');
  const body = document.getElementById('adminBody');
  body.innerHTML = '<div style="color:var(--text-secondary)">Loading...</div>';
  modal.classList.add('show');
  try {
    const stats = await api('/api/admin', {
      method:'POST', body: JSON.stringify({ initData, action:'stats' })
    });
    const pending = await api('/api/admin/pending-withdraws?initData=' + encodeURIComponent(initData));
    let html =
      '<div class="admin-stat">Users: <b>' + stats.stats.users + '</b></div>' +
      '<div class="admin-stat">Balance total: <b>' + stats.stats.total_balance_stars + '</b></div>' +
      '<div class="admin-stat">Case opens: <b>' + stats.stats.case_opens + '</b></div>' +
      '<div class="admin-stat">Pending withdraws: <b>' + stats.stats.pending_withdraws + '</b></div>' +
      '<div class="game-form" style="margin-top:16px">' +
        '<label>Give Stars</label>' +
        '<input type="number" id="adminTgId" placeholder="Telegram ID"/>' +
        '<input type="number" id="adminAmount" placeholder="Amount" value="100"/>' +
        '<button class="btn-primary" id="btnGiveStars">Give</button>' +
      '</div>';
    if (pending.pending.length) {
      html += '<div style="margin-top:16px;text-align:left;font-size:13px"><b>Withdraw requests:</b></div>';
      pending.pending.forEach(p => {
        html += '<div class="admin-stat" style="font-size:12px">#' + p.tx_id + ' @' + (p.username||p.telegram_id) + ' <b>' + p.amount + '</b> ' +
          '<button class="btn-play" style="margin-top:6px;padding:4px 10px;font-size:11px" data-txid="' + p.tx_id + '">Approve</button></div>';
      });
    }
    body.innerHTML = html;
    document.getElementById('btnGiveStars')?.addEventListener('click', async () => {
      const tid = parseInt(document.getElementById('adminTgId').value);
      const amt = parseInt(document.getElementById('adminAmount').value);
      if (!tid || !amt) { toast('Fill fields','error'); return; }
      try {
        const r = await api('/api/admin', {
          method:'POST', body: JSON.stringify({ initData, action:'give_stars', target_telegram_id:tid, amount:amt })
        });
        toast(r.message, 'success');
      } catch(e) { toast(e.message,'error'); }
    });
    body.querySelectorAll('[data-txid]').forEach(btn => {
      btn.addEventListener('click', async () => {
        try {
          const r = await api('/api/admin', {
            method:'POST', body: JSON.stringify({ initData, action:'approve_withdraw', tx_id: parseInt(btn.dataset.txid) })
          });
          toast(r.message, 'success');
          document.getElementById('btnAdmin').click();
        } catch(e) { toast(e.message,'error'); }
      });
    });
  } catch(e) { body.innerHTML = '<div style="color:var(--danger)">' + e.message + '</div>'; }
});
document.getElementById('btnCloseAdmin').addEventListener('click', () => {
  document.getElementById('modalAdmin').classList.remove('show');
});

auth();
