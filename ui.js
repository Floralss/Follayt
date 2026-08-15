// UI rendering helpers for Follayt

function renderHeader() {
  const isLogged = !!currentUser;
  const roleBadge = currentUserData ? getRoleBadge(currentUserData.role) : '';
  return `
    <header class="bg-dark-900/90 border-b border-primary-900/40 sticky top-0 z-40 backdrop-blur">
      <div class="container mx-auto px-4 max-w-7xl flex items-center justify-between h-16">
        <a href="#home" class="flex items-center gap-2 font-bold text-xl text-primary-300 hover:text-primary-200 transition">
          <img src="assets/favicon.svg" alt="Follayt" class="w-8 h-8 rounded-lg" width="32" height="32" />
          <span>Follayt</span>
        </a>
        <nav class="hidden md:flex items-center gap-1">
          <a href="#home" class="px-3 py-2 rounded-lg hover:bg-primary-900/40 text-sm font-medium flex items-center gap-1.5">🏠 Главная</a>
          <a href="#chats" class="px-3 py-2 rounded-lg hover:bg-primary-900/40 text-sm font-medium flex items-center gap-1.5">💬 Чаты</a>
          <a href="#guarantor-app" class="px-3 py-2 rounded-lg hover:bg-primary-900/40 text-sm font-medium flex items-center gap-1.5">🛡️ Стать гарантом</a>
          ${hasPermission(currentUserData, 'admin') ? `<a href="#admin" class="px-3 py-2 rounded-lg hover:bg-primary-900/40 text-sm font-medium text-amber-400 flex items-center gap-1.5">⚙️ Админ</a>` : ''}
        </nav>
        <div class="flex items-center gap-2">
          ${isLogged ? `
            <a href="#profile" class="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-primary-900/40">
              <span class="w-8 h-8 rounded-full bg-primary-700 flex items-center justify-center text-sm font-bold">${escapeHtml((currentUserData?.nickname || 'U')[0].toUpperCase())}</span>
              <span class="font-medium text-sm hidden sm:inline">${escapeHtml(currentUserData?.nickname || 'Профиль')}</span>
              ${roleBadge}
            </a>
            <button onclick="logout()" class="text-sm text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-red-900/30 flex items-center gap-1">🚪 Выйти</button>
          ` : `
            <a href="#login" class="px-4 py-2 text-sm font-medium rounded-lg hover:bg-primary-900/40 flex items-center gap-1">🔑 Войти</a>
            <a href="#register" class="px-4 py-2 text-sm font-medium bg-primary-600 hover:bg-primary-500 rounded-lg flex items-center gap-1">✨ Регистрация</a>
          `}
        </div>
      </div>
    </header>
  `;
}

function renderAuthForm(mode = 'login') {
  const isLogin = mode === 'login';
  return `
    <div class="max-w-md mx-auto mt-10">
      <div class="bg-dark-800 rounded-2xl p-8 border border-primary-900/40 shadow-xl">
        <h1 class="text-2xl font-bold text-center mb-6">${isLogin ? 'Вход' : 'Регистрация'}</h1>
        <form id="auth-form" class="space-y-4">
          ${!isLogin ? `
            <div>
              <label class="block text-sm text-gray-400 mb-1">Никнейм</label>
              <input type="text" id="auth-nickname" required minlength="3" class="w-full px-4 py-2.5 rounded-lg border" placeholder="Ваш ник" />
            </div>
          ` : ''}
          <div>
            <label class="block text-sm text-gray-400 mb-1">Email</label>
            <input type="email" id="auth-email" required class="w-full px-4 py-2.5 rounded-lg border" placeholder="email@example.com" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Пароль</label>
            <input type="password" id="auth-password" required minlength="6" class="w-full px-4 py-2.5 rounded-lg border" placeholder="••••••••" />
          </div>
          <button type="submit" class="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-lg font-semibold transition">
            ${isLogin ? '🔑 Войти' : '✨ Зарегистрироваться'}
          </button>
        </form>
        <p class="text-center text-sm text-gray-400 mt-4">
          ${isLogin ? 'Нет аккаунта? <a href="#register" class="text-primary-400 hover:underline">Регистрация</a>' : 'Уже есть аккаунт? <a href="#login" class="text-primary-400 hover:underline">Войти</a>'}
        </p>
      </div>
    </div>
  `;
}

function renderHome(products, activeCategory = 'all') {
  const cats = CATEGORIES.map(c => `
    <button onclick="Router.go('home', {cat: '${c.id}'})" 
      class="category-pill px-4 py-2 rounded-full text-sm font-medium border border-primary-800/50 hover:border-primary-500 transition whitespace-nowrap ${activeCategory === c.id ? 'active' : 'bg-dark-800'}">
      ${c.icon} ${c.name}
    </button>
  `).join('');

  const cards = products.length ? products.map(p => `
    <a href="#product?id=${p.id}" class="product-card bg-dark-800 rounded-xl overflow-hidden border border-primary-900/30 block">
      <div class="aspect-square bg-dark-900 relative">
        ${p.imageUrl 
          ? `<img src="${escapeHtml(p.imageUrl)}" alt="" class="w-full h-full object-cover" />`
          : `<div class="w-full h-full flex items-center justify-center text-4xl text-gray-600">📦</div>`}
        <span class="absolute top-2 left-2 px-2 py-0.5 bg-dark-900/80 rounded text-xs">${CATEGORIES.find(c => c.id === p.category)?.name || p.category}</span>
      </div>
      <div class="p-3">
        <h3 class="font-semibold text-sm line-clamp-2 mb-1">${escapeHtml(p.title)}</h3>
        <p class="text-xs text-gray-400 mb-2">${escapeHtml(p.ownerNickname || '')}</p>
        <div class="flex justify-between items-center">
          <span class="text-primary-300 font-medium text-sm">${p.price ? escapeHtml(p.price) : (p.tradeFor ? 'Трейд' : '—')}</span>
        </div>
      </div>
    </a>
  `).join('') : `
    <div class="col-span-full text-center py-16 text-gray-500">
      <p class="text-4xl mb-3">📭</p>
      <p>Пока нет объявлений в этой категории</p>
      ${currentUser ? `<button onclick="Router.go('add-product')" class="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">➕ Добавить товар</button>` : ''}
    </div>
  `;

  return `
    <div class="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <h1 class="text-2xl font-bold">Торговая площадка</h1>
      ${currentUser ? `
        <button onclick="Router.go('add-product')" class="px-4 py-2.5 bg-primary-600 hover:bg-primary-500 rounded-lg font-medium flex items-center gap-2">
          <span>➕</span> Добавить товар
        </button>
      ` : ''}
    </div>
    <div class="flex gap-2 overflow-x-auto pb-4 mb-6">${cats}</div>
    <div class="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      ${cards}
    </div>
  `;
}

function renderAddProduct() {
  const options = CATEGORIES.filter(c => c.id !== 'all').map(c => 
    `<option value="${c.id}">${c.icon} ${c.name}</option>`
  ).join('');
  return `
    <div class="max-w-xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Добавить товар</h1>
      <form id="product-form" class="bg-dark-800 rounded-2xl p-6 border border-primary-900/40 space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Название *</label>
          <input type="text" id="prod-title" required class="w-full px-4 py-2.5 rounded-lg border" placeholder="Например: Roblox Adopt Me Legendary pet" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Категория *</label>
          <select id="prod-category" required class="w-full px-4 py-2.5 rounded-lg border">${options}</select>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Описание</label>
          <textarea id="prod-desc" rows="3" class="w-full px-4 py-2.5 rounded-lg border" placeholder="Подробности, что отдаёте..."></textarea>
        </div>
        <div class="grid grid-cols-2 gap-4">
          <div>
            <label class="block text-sm text-gray-400 mb-1">Цена / стоимость</label>
            <input type="text" id="prod-price" class="w-full px-4 py-2.5 rounded-lg border" placeholder="1000₽ / 5$" />
          </div>
          <div>
            <label class="block text-sm text-gray-400 mb-1">Ищу в трейд</label>
            <input type="text" id="prod-trade" class="w-full px-4 py-2.5 rounded-lg border" placeholder="Что хотите взамен" />
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Фото товара</label>
          <input type="file" id="prod-image" accept="image/*" class="w-full text-sm text-gray-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-primary-700 file:text-white" />
        </div>
        <button type="submit" class="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-lg font-semibold">📤 Опубликовать</button>
      </form>
    </div>
  `;
}

function renderProductDetail(product) {
  if (!product) return `<div class="text-center py-20">Товар не найден</div>`;
  const isOwner = currentUser && product.ownerId === currentUser.uid;
  return `
    <div class="max-w-4xl mx-auto">
      <div class="grid md:grid-cols-2 gap-8">
        <div class="bg-dark-800 rounded-2xl overflow-hidden border border-primary-900/30 aspect-square">
          ${product.imageUrl 
            ? `<img src="${escapeHtml(product.imageUrl)}" class="w-full h-full object-cover" alt="" />`
            : `<div class="w-full h-full flex items-center justify-center text-6xl text-gray-600">📦</div>`}
        </div>
        <div>
          <span class="text-sm text-primary-400">${CATEGORIES.find(c => c.id === product.category)?.name || product.category}</span>
          <h1 class="text-2xl font-bold mt-1 mb-3">${escapeHtml(product.title)}</h1>
          <p class="text-gray-300 mb-4 whitespace-pre-wrap">${escapeHtml(product.description || 'Без описания')}</p>
          <div class="space-y-2 mb-6">
            ${product.price ? `<p><span class="text-gray-400">Цена:</span> <span class="text-primary-300 font-semibold">${escapeHtml(product.price)}</span></p>` : ''}
            ${product.tradeFor ? `<p><span class="text-gray-400">Ищу в трейд:</span> ${escapeHtml(product.tradeFor)}</p>` : ''}
            <p><span class="text-gray-400">Продавец:</span> ${escapeHtml(product.ownerNickname || '—')}</p>
          </div>
          ${!isOwner && currentUser ? `
            <button onclick="startChat('${product.id}', '${product.ownerId}')"
              class="w-full py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-semibold text-lg flex items-center justify-center gap-2">
              💬 Создать чат с продавцом
            </button>
          ` : isOwner ? `<p class="text-gray-400 text-sm">Это ваше объявление</p>` : `
            <p class="text-amber-400 text-sm">Войдите, чтобы создать чат</p>
          `}
        </div>
      </div>
    </div>
  `;
}

function renderChatsList(chats) {
  if (!currentUser) return `<div class="text-center py-20">Войдите, чтобы видеть чаты</div>`;
  if (!chats.length) {
    return `
      <div class="text-center py-20 text-gray-500">
        <p class="text-4xl mb-3">💬</p>
        <p>У вас пока нет чатов</p>
        <a href="#home" class="text-primary-400 hover:underline mt-2 inline-block">Перейти к товарам</a>
      </div>
    `;
  }
  const list = chats.map(c => {
    const otherId = c.participants.find(p => p !== currentUser.uid && p !== c.guarantorId) || c.participants.find(p => p !== currentUser.uid);
    const name = c.participantNames?.[otherId] || 'Пользователь';
    return `
      <a href="#chat?id=${c.id}" class="flex items-center gap-3 p-4 bg-dark-800 hover:bg-dark-800/80 rounded-xl border border-primary-900/20 transition">
        <div class="w-12 h-12 rounded-full bg-primary-900/50 flex items-center justify-center text-xl">💬</div>
        <div class="flex-1 min-w-0">
          <div class="font-medium truncate">${escapeHtml(name)}</div>
          <div class="text-sm text-gray-400 truncate">${escapeHtml(c.productTitle || 'Трейд')}</div>
        </div>
        ${c.guarantorId ? '<span class="text-xs px-2 py-0.5 bg-emerald-900/50 text-emerald-300 rounded">Гарант</span>' : ''}
      </a>
    `;
  }).join('');
  return `
    <h1 class="text-2xl font-bold mb-6">Мои чаты</h1>
    <div class="space-y-2 max-w-2xl">${list}</div>
  `;
}

function renderChatView(chat, messages) {
  if (!chat) return `<div class="text-center py-20">Чат не найден</div>`;
  const msgs = (messages || []).map(m => {
    if (m.type === 'system') {
      return `<div class="message-system py-1">${escapeHtml(m.text)}</div>`;
    }
    if (m.type === 'bot') {
      return `
        <div class="message-bubble message-bot rounded-xl px-4 py-3 my-2">
          <div class="text-xs text-primary-400 font-semibold mb-1">🤖 FollaytBot</div>
          <div class="whitespace-pre-wrap text-gray-300">${escapeHtml(m.text)}</div>
        </div>
      `;
    }
    const own = m.senderId === currentUser?.uid;
    return `
      <div class="message-bubble ${own ? 'message-own' : 'message-other'} rounded-2xl px-4 py-2.5 my-1 ${own ? 'rounded-br-md' : 'rounded-bl-md'}">
        ${!own ? `<div class="text-xs text-primary-300 mb-0.5">${escapeHtml(m.senderName || '')}</div>` : ''}
        <div class="whitespace-pre-wrap">${escapeHtml(m.text)}</div>
      </div>
    `;
  }).join('');

  return `
    <div class="max-w-3xl mx-auto flex flex-col h-[calc(100vh-8rem)]">
      <div class="flex items-center justify-between mb-4 pb-3 border-b border-primary-900/40">
        <div>
          <h2 class="font-semibold">${escapeHtml(chat.productTitle || 'Чат')}</h2>
          <p class="text-xs text-gray-400">ID: ${chat.id.slice(0, 8)}…</p>
        </div>
        <div class="flex gap-2">
          ${!chat.guarantorId ? `
            <button onclick="showFindGuarantor('${chat.id}')" 
              class="px-3 py-1.5 bg-emerald-700 hover:bg-emerald-600 rounded-lg text-sm font-medium">
              🛡️ 🛡️ Найти гаранта
            </button>
          ` : `<span class="text-sm text-emerald-400">Гарант в чате</span>`}
          <a href="#chats" class="px-3 py-1.5 bg-dark-800 rounded-lg text-sm">← Назад</a>
        </div>
      </div>
      <div id="messages-container" class="flex-1 overflow-y-auto space-y-1 pr-2 mb-4">
        ${msgs || '<p class="text-center text-gray-500 py-10">Нет сообщений</p>'}
      </div>
      <form id="msg-form" class="flex gap-2">
        <input type="text" id="msg-input" placeholder="Напишите сообщение..." class="flex-1 px-4 py-3 rounded-xl border" autocomplete="off" />
        <button type="submit" class="px-5 py-3 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium">📨 Отправить</button>
      </form>
    </div>
  `;
}

function renderGuarantorAppForm() {
  if (!currentUser) return `<div class="text-center py-20">Войдите, чтобы подать заявку</div>`;
  return `
    <div class="max-w-lg mx-auto">
      <h1 class="text-2xl font-bold mb-2">Заявка на роль гаранта</h1>
      <p class="text-gray-400 text-sm mb-6">Заполните форму. Админы рассмотрят заявку. Обязательно укажите Telegram-канал с пруфами сделок.</p>
      <form id="guarantor-form" class="bg-dark-800 rounded-2xl p-6 border border-primary-900/40 space-y-4">
        <div>
          <label class="block text-sm text-gray-400 mb-1">Ник *</label>
          <input type="text" id="g-nick" required value="${escapeHtml(currentUserData?.nickname || '')}" class="w-full px-4 py-2.5 rounded-lg border" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Юзернейм Telegram * (с пруфами в профиле/канале)</label>
          <input type="text" id="g-tg" required placeholder="@username" class="w-full px-4 py-2.5 rounded-lg border" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Ссылка на ТГ-канал / пост с пруфами *</label>
          <input type="url" id="g-channel" required placeholder="https://t.me/..." class="w-full px-4 py-2.5 rounded-lg border" />
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Сколько часов готовы быть в сети в день *</label>
          <input type="number" id="g-hours" required min="1" max="24" placeholder="4" class="w-full px-4 py-2.5 rounded-lg border" />
        </div>
        <button type="submit" class="w-full py-3 bg-emerald-600 hover:bg-emerald-500 rounded-lg font-semibold">📋 Отправить заявку</button>
      </form>
    </div>
  `;
}

function renderProfile() {
  if (!currentUser) {
    return `<div class="text-center py-20">
      <p class="text-lg mb-4">Войдите в аккаунт</p>
      <a href="#login" class="px-4 py-2 bg-primary-600 rounded-lg inline-block">🔑 Войти</a>
    </div>`;
  }
  if (!currentUserData) {
    return `<div class="text-center py-20">
      <div class="spinner mx-auto mb-4"></div>
      <p class="text-gray-400">Загрузка профиля...</p>
      <button onclick="renderApp()" class="mt-4 px-4 py-2 bg-primary-600 rounded-lg text-sm">🔄 Обновить</button>
    </div>`;
  }
  return `
    <div class="max-w-lg mx-auto">
      <h1 class="text-2xl font-bold mb-6">⚙️ Настройки профиля</h1>
      <div class="bg-dark-800 rounded-2xl p-6 border border-primary-900/40 space-y-5">
        <div class="flex items-center gap-4 pb-4 border-b border-primary-900/30">
          <div class="w-16 h-16 rounded-full bg-primary-700 flex items-center justify-center text-2xl font-bold">
            ${escapeHtml((currentUserData.nickname || 'U')[0].toUpperCase())}
          </div>
          <div>
            <p class="font-semibold text-lg">${escapeHtml(currentUserData.nickname || 'User')}</p>
            <p class="text-sm text-gray-400">${escapeHtml(currentUserData.email || currentUser.email || '')}</p>
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Никнейм</label>
          <div class="flex gap-2">
            <input type="text" id="prof-nick" value="${escapeHtml(currentUserData.nickname || '')}" class="flex-1 px-4 py-2.5 rounded-lg border" />
            <button onclick="saveNickname()" class="px-4 py-2 bg-primary-700 hover:bg-primary-600 rounded-lg text-sm">💾 Сохранить</button>
          </div>
        </div>
        <div>
          <label class="block text-sm text-gray-400 mb-1">Telegram username</label>
          <div class="flex gap-2">
            <input type="text" id="prof-tg" value="${escapeHtml(currentUserData.tgUsername || '')}" placeholder="@username" class="flex-1 px-4 py-2.5 rounded-lg border" />
            <button onclick="saveTelegram()" class="px-4 py-2 bg-primary-700 hover:bg-primary-600 rounded-lg text-sm">🔗 Привязать</button>
          </div>
          <p class="text-xs text-gray-500 mt-1">Один Telegram можно привязать только к одному аккаунту</p>
        </div>
        <div class="pt-2 border-t border-primary-900/30">
          <p class="text-sm text-gray-400">Роль: ${getRoleBadge(currentUserData.role) || '<span class="text-gray-300">Пользователь</span>'}</p>
          <p class="text-sm text-gray-500 mt-1">UID: <code class="text-xs bg-dark-900 px-1 rounded">${currentUser.uid}</code></p>
        </div>
      </div>
    </div>
  `;
}

function showFindGuarantorModal(chatId, guarantors) {
  const list = guarantors.length ? guarantors.map(g => `
    <div class="flex items-center justify-between p-3 bg-dark-900 rounded-lg mb-2">
      <div class="flex items-center gap-2">
        <span class="online-dot"></span>
        <span class="font-medium">${escapeHtml(g.nickname)}</span>
        ${getRoleBadge(g.role)}
        ${g.tgUsername ? `<span class="text-xs text-gray-400">@${escapeHtml(g.tgUsername)}</span>` : ''}
      </div>
      <button onclick="doInviteGuarantor('${chatId}', '${g.id}')" 
        class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm">
        ➕ Пригласить в чат
      </button>
    </div>
  `).join('') : `<p class="text-gray-400 text-center py-4">Сейчас нет гарантов в сети. Попробуйте позже.</p>`;

  const existing = document.getElementById('guarantor-modal');
  if (existing) existing.remove();

  const modal = document.createElement('div');
  modal.id = 'guarantor-modal';
  modal.className = 'fixed inset-0 z-50 flex items-center justify-center modal-overlay p-4';
  modal.innerHTML = `
    <div class="bg-dark-800 rounded-2xl max-w-md w-full p-6 border border-primary-800 shadow-2xl">
      <div class="flex justify-between items-center mb-4">
        <h3 class="text-lg font-bold">🛡️ Гаранты в сети</h3>
        <button onclick="document.getElementById('guarantor-modal').remove()" class="text-gray-400 hover:text-white text-xl">&times;</button>
      </div>
      <div class="max-h-80 overflow-y-auto">${list}</div>
    </div>
  `;
  document.getElementById('modals').appendChild(modal);
  modal.addEventListener('click', (e) => { if (e.target === modal) modal.remove(); });
}
