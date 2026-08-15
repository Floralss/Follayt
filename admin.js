// Admin & Owner panel

async function renderAdminPanel() {
  if (!hasPermission(currentUserData, 'admin')) {
    return `<div class="text-center py-20 text-gray-400">🔒 Доступ запрещён</div>`;
  }

  const isOwner = hasPermission(currentUserData, 'owner');
  let appsHtml = '';
  try {
    const apps = await getGuarantorApplications('pending');
    if (apps.length === 0) {
      appsHtml = `<p class="text-gray-400 flex items-center gap-2">✅ Нет заявок на рассмотрении</p>`;
    } else {
      appsHtml = apps.map(app => `
        <div class="bg-dark-800 rounded-xl p-4 border border-primary-900/50 mb-3">
          <div class="flex flex-wrap justify-between gap-2 mb-2">
            <div>
              <span class="font-semibold">${escapeHtml(app.nickname)}</span>
              <span class="text-gray-400 text-sm ml-2">@${escapeHtml(app.tgUsername)}</span>
            </div>
            <span class="text-xs text-gray-500">${formatDate(app.createdAt)}</span>
          </div>
          <p class="text-sm text-gray-300 mb-1">🔗 Канал: <a href="${escapeHtml(app.channelLink)}" target="_blank" class="text-primary-400 underline break-all">${escapeHtml(app.channelLink)}</a></p>
          <p class="text-sm text-gray-300 mb-3">⏰ В сети: ${escapeHtml(String(app.onlineHours))} ч/день</p>
          <div class="flex gap-2">
            <button onclick="handleAcceptApp('${app.id}')" class="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-sm font-medium">✅ Принять</button>
            <button onclick="handleRejectApp('${app.id}')" class="px-3 py-1.5 bg-red-600 hover:bg-red-500 rounded-lg text-sm font-medium">❌ Отклонить</button>
          </div>
        </div>
      `).join('');
    }
  } catch (e) {
    appsHtml = `<p class="text-red-400">Ошибка загрузки заявок (нужны индексы Firestore)</p>`;
  }

  return `
    <div class="max-w-4xl mx-auto">
      <h1 class="text-2xl font-bold mb-6 flex items-center gap-2">⚙️ ${isOwner ? 'Панель владельца' : 'Админ-панель'}</h1>
      <div class="grid gap-6">
        <section class="bg-dark-800/50 rounded-2xl p-5 border border-primary-900/30">
          <h2 class="text-lg font-semibold mb-4">📋 Заявки на роль гаранта</h2>
          <div id="apps-list">${appsHtml}</div>
        </section>
        <section class="bg-dark-800/50 rounded-2xl p-5 border border-primary-900/30">
          <h2 class="text-lg font-semibold mb-4">🚫 Блокировка пользователей</h2>
          <div class="flex flex-wrap gap-3">
            <input id="ban-uid" type="text" placeholder="UID пользователя" class="flex-1 min-w-[180px] px-3 py-2 rounded-xl border" />
            <input id="ban-reason" type="text" placeholder="Причина (необяз.)" class="flex-1 min-w-[180px] px-3 py-2 rounded-xl border" />
            <button onclick="handleBan()" class="px-4 py-2 bg-red-600 hover:bg-red-500 rounded-xl font-medium">🚫 Заблокировать</button>
            <button onclick="handleUnban()" class="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 rounded-xl font-medium">✅ Разблокировать</button>
          </div>
        </section>
        ${isOwner ? `
        <section class="bg-dark-800/50 rounded-2xl p-5 border border-amber-900/40">
          <h2 class="text-lg font-semibold mb-4 text-amber-400">👑 Управление ролями</h2>
          <div class="flex flex-wrap gap-3 mb-3">
            <input id="role-uid" type="text" placeholder="UID пользователя" class="flex-1 min-w-[180px] px-3 py-2 rounded-xl border" />
            <select id="role-select" class="px-3 py-2 rounded-xl border">
              <option value="user">User</option>
              <option value="guarantor">Guarantor</option>
              <option value="helper">Helper</option>
              <option value="admin">Admin</option>
              <option value="owner">Owner</option>
            </select>
            <button onclick="handleSetRole()" class="px-4 py-2 bg-amber-600 hover:bg-amber-500 rounded-xl font-medium">Выдать роль</button>
          </div>
        </section>
        <section class="bg-dark-800/50 rounded-2xl p-5 border border-amber-900/40">
          <h2 class="text-lg font-semibold mb-4 text-amber-400">🎉 Создать конкурс</h2>
          <div class="space-y-3">
            <input id="contest-title" type="text" placeholder="Название конкурса" class="w-full px-3 py-2 rounded-xl border" />
            <textarea id="contest-desc" rows="3" placeholder="Описание и условия" class="w-full px-3 py-2 rounded-xl border"></textarea>
            <button onclick="handleCreateContest()" class="px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-xl font-medium">🚀 Опубликовать</button>
          </div>
        </section>
        ` : ''}
      </div>
    </div>
  `;
}

window.handleAcceptApp = async (id) => {
  try {
    await reviewGuarantorApp(id, true);
    showToast('Заявка принята, роль гаранта выдана', 'success');
    renderApp();
  } catch (e) {
    showToast(e.message || 'Ошибка', 'error');
  }
};

window.handleRejectApp = async (id) => {
  try {
    await reviewGuarantorApp(id, false);
    showToast('Заявка отклонена', 'success');
    renderApp();
  } catch (e) {
    showToast(e.message || 'Ошибка', 'error');
  }
};

window.handleBan = async () => {
  const uid = document.getElementById('ban-uid')?.value?.trim();
  const reason = document.getElementById('ban-reason')?.value?.trim() || '';
  if (!uid) return showToast('Укажите UID', 'error');
  try {
    await banUser(uid, reason);
    showToast('Пользователь заблокирован', 'success');
  } catch (e) {
    showToast(e.message || 'Ошибка', 'error');
  }
};

window.handleUnban = async () => {
  const uid = document.getElementById('ban-uid')?.value?.trim();
  if (!uid) return showToast('Укажите UID', 'error');
  try {
    await unbanUser(uid);
    showToast('Пользователь разблокирован', 'success');
  } catch (e) {
    showToast(e.message || 'Ошибка', 'error');
  }
};

window.handleSetRole = async () => {
  const uid = document.getElementById('role-uid')?.value?.trim();
  const role = document.getElementById('role-select')?.value;
  if (!uid) return showToast('Укажите UID', 'error');
  try {
    await setUserRole(uid, role);
    showToast(`Роль ${role} выдана`, 'success');
  } catch (e) {
    showToast(e.message || 'Ошибка', 'error');
  }
};

window.handleCreateContest = async () => {
  const title = document.getElementById('contest-title')?.value?.trim();
  const desc = document.getElementById('contest-desc')?.value?.trim();
  if (!title) return showToast('Укажите название', 'error');
  try {
    await db.collection('contests').add({
      title, description: desc, createdBy: currentUser.uid,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(), active: true
    });
    showToast('Конкурс создан!', 'success');
    document.getElementById('contest-title').value = '';
    document.getElementById('contest-desc').value = '';
  } catch (e) {
    showToast('Ошибка создания конкурса', 'error');
  }
};
