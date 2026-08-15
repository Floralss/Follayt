// Data layer: products, categories, guarantors etc.

const CATEGORIES = [
  { id: 'all', name: 'Все', icon: '🎮' },
  { id: 'roblox', name: 'Roblox', icon: '🧱' },
  { id: 'cs2', name: 'CS2', icon: '🔫' },
  { id: 'valorant', name: 'Valorant', icon: '🎯' },
  { id: 'fortnite', name: 'Fortnite', icon: '🏗️' },
  { id: 'minecraft', name: 'Minecraft', icon: '⛏️' },
  { id: 'dota2', name: 'Dota 2', icon: '⚔️' },
  { id: 'gta', name: 'GTA V / RP', icon: '🚗' },
  { id: 'pubg', name: 'PUBG', icon: '🪖' },
  { id: 'other', name: 'Другое', icon: '📦' }
];

/** Promise timeout helper — prevents infinite spinner */
function withTimeout(promise, ms = 8000, fallback = null) {
  return Promise.race([
    promise,
    new Promise((resolve) => setTimeout(() => resolve(fallback), ms))
  ]);
}

async function getProducts(category = 'all', limit = 50) {
  try {
    // Simple query first (no composite index needed)
    const snap = await withTimeout(
      db.collection('products').where('status', '==', 'active').limit(limit).get(),
      7000,
      null
    );
    if (!snap) {
      console.warn('getProducts timeout — returning empty list');
      return [];
    }
    let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    if (category && category !== 'all') {
      items = items.filter(p => p.category === category);
    }
    items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return items;
  } catch (e) {
    console.error('getProducts', e);
    // Last resort: try without where
    try {
      const snap = await withTimeout(db.collection('products').limit(limit).get(), 5000, null);
      if (!snap) return [];
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() }))
        .filter(p => p.status === 'active' || !p.status);
      if (category && category !== 'all') items = items.filter(p => p.category === category);
      return items;
    } catch (e2) {
      console.error(e2);
      return [];
    }
  }
}

async function getProduct(id) {
  try {
    const doc = await withTimeout(db.collection('products').doc(id).get(), 6000, null);
    if (!doc || !doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.error('getProduct', e);
    return null;
  }
}

async function createProduct(data, imageFile) {
  if (!currentUser) throw new Error('Нужна авторизация');
  let imageUrl = null;
  if (imageFile) {
    const ref = storage.ref(`products/${currentUser.uid}/${Date.now()}_${imageFile.name}`);
    await ref.put(imageFile);
    imageUrl = await ref.getDownloadURL();
  }
  const product = {
    title: data.title,
    description: data.description || '',
    category: data.category,
    price: data.price || '',
    tradeFor: data.tradeFor || '',
    imageUrl,
    ownerId: currentUser.uid,
    ownerNickname: currentUserData?.nickname || 'User',
    status: 'active',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    views: 0
  };
  const docRef = await db.collection('products').add(product);
  return docRef.id;
}

async function deleteProduct(id) {
  if (!currentUser) throw new Error('Нужна авторизация');
  const p = await getProduct(id);
  if (!p) throw new Error('Товар не найден');
  if (p.ownerId !== currentUser.uid && !hasPermission(currentUserData, 'admin')) {
    throw new Error('Нет прав');
  }
  await db.collection('products').doc(id).update({ status: 'deleted' });
}

async function getUserChats() {
  if (!currentUser) return [];
  try {
    const snap = await withTimeout(
      db.collection('chats').where('participants', 'array-contains', currentUser.uid).get(),
      7000,
      null
    );
    if (!snap) return [];
    const chats = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    chats.sort((a, b) => (b.updatedAt?.seconds || 0) - (a.updatedAt?.seconds || 0));
    return chats;
  } catch (e) {
    console.error('getUserChats', e);
    return [];
  }
}

async function getChat(chatId) {
  try {
    const doc = await withTimeout(db.collection('chats').doc(chatId).get(), 5000, null);
    if (!doc || !doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    console.error(e);
    return null;
  }
}

async function createChat(productId, sellerId) {
  if (!currentUser) throw new Error('Войдите в аккаунт');
  if (currentUser.uid === sellerId) throw new Error('Нельзя создать чат с собой');

  // Check existing chat
  const existing = await db.collection('chats')
    .where('productId', '==', productId)
    .where('participants', 'array-contains', currentUser.uid)
    .get();
  for (const d of existing.docs) {
    const c = d.data();
    if (c.participants.includes(sellerId)) return d.id;
  }

  const product = await getProduct(productId);
  const chatRef = await db.collection('chats').add({
    productId,
    productTitle: product?.title || '',
    participants: [currentUser.uid, sellerId],
    participantNames: {
      [currentUser.uid]: currentUserData?.nickname || 'User',
      [sellerId]: product?.ownerNickname || 'Seller'
    },
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessage: ''
  });

  // Bot welcome message
  await db.collection('messages').add({
    chatId: chatRef.id,
    text: '👋 Привет! Я FollaytBot.\n\nПравила сделки:\n1. Привяжите Telegram в профиле\n2. Не уходите в другие соцсети / мессенджеры\n3. При необходимости нажмите «Найти гаранта»\n\nУдачной сделки!',
    senderId: 'bot',
    senderName: 'FollaytBot',
    type: 'bot',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  return chatRef.id;
}

async function sendMessage(chatId, text) {
  if (!currentUser || !text.trim()) return;
  await db.collection('messages').add({
    chatId,
    text: text.trim(),
    senderId: currentUser.uid,
    senderName: currentUserData?.nickname || 'User',
    type: 'user',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('chats').doc(chatId).update({
    lastMessage: text.trim().slice(0, 80),
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function listenMessages(chatId, callback) {
  return db.collection('messages')
    .where('chatId', '==', chatId)
    .orderBy('createdAt', 'asc')
    .onSnapshot(
      (snap) => {
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
        callback(messages);
      },
      (err) => {
        console.error('listenMessages', err);
        // Fallback without orderBy
        db.collection('messages').where('chatId', '==', chatId).get().then(snap => {
          const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
          messages.sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
          callback(messages);
        }).catch(() => callback([]));
      }
    );
}

async function getOnlineGuarantors() {
  try {
    const snap = await withTimeout(
      db.collection('users').where('role', 'in', ['guarantor', 'helper', 'admin', 'owner']).get(),
      6000,
      null
    );
    if (!snap) return [];
    return snap.docs
      .map(d => ({ id: d.id, ...d.data() }))
      .filter(u => u.online !== false && !u.banned);
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function inviteGuarantor(chatId, guarantorId) {
  const chat = await getChat(chatId);
  if (!chat) throw new Error('Чат не найден');
  if (chat.participants.includes(guarantorId)) {
    showToast('Гарант уже в чате', 'info');
    return;
  }
  const guarantor = await getUserById(guarantorId);
  await db.collection('chats').doc(chatId).update({
    participants: firebase.firestore.FieldValue.arrayUnion(guarantorId),
    [`participantNames.${guarantorId}`]: guarantor?.nickname || 'Гарант',
    updatedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('messages').add({
    chatId,
    text: `🛡️ Гарант ${guarantor?.nickname || ''} присоединился к чату`,
    senderId: 'system',
    senderName: 'Система',
    type: 'system',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  // Notify guarantor
  await db.collection('notifications').add({
    userId: guarantorId,
    type: 'guarantor_invite',
    chatId,
    text: 'Вас пригласили в чат как гаранта',
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  showToast('Гарант приглашён!', 'success');
}

async function submitGuarantorApplication(form) {
  if (!currentUser) throw new Error('Войдите в аккаунт');
  const pending = await db.collection('guarantorApps')
    .where('userId', '==', currentUser.uid)
    .where('status', '==', 'pending')
    .get();
  if (!pending.empty) throw new Error('У вас уже есть заявка на рассмотрении');

  await db.collection('guarantorApps').add({
    userId: currentUser.uid,
    nickname: form.nickname,
    tgUsername: form.tgUsername.replace('@', '').toLowerCase(),
    channelLink: form.channelLink,
    onlineHours: form.onlineHours,
    status: 'pending',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function getGuarantorApplications(status = 'pending') {
  try {
    const snap = await withTimeout(
      db.collection('guarantorApps').where('status', '==', status).get(),
      6000,
      null
    );
    if (!snap) return [];
    const apps = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    apps.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    return apps;
  } catch (e) {
    console.error(e);
    return [];
  }
}

async function reviewGuarantorApp(appId, accept) {
  const appDoc = await db.collection('guarantorApps').doc(appId).get();
  if (!appDoc.exists) throw new Error('Заявка не найдена');
  const app = appDoc.data();
  await db.collection('guarantorApps').doc(appId).update({
    status: accept ? 'accepted' : 'rejected',
    reviewedAt: firebase.firestore.FieldValue.serverTimestamp(),
    reviewedBy: currentUser.uid
  });
  if (accept) {
    await db.collection('users').doc(app.userId).update({
      role: 'guarantor',
      tgUsername: app.tgUsername,
      proofsChannel: app.channelLink
    });
    await db.collection('tgUsernames').doc(app.tgUsername).set({ uid: app.userId }).catch(() => {});
  }
}

async function setUserRole(uid, role) {
  if (!hasPermission(currentUserData, 'owner') && !(hasPermission(currentUserData, 'admin') && ['user', 'guarantor', 'helper'].includes(role))) {
    throw new Error('Недостаточно прав');
  }
  await db.collection('users').doc(uid).update({ role });
}

async function banUser(uid, reason = '') {
  if (!hasPermission(currentUserData, 'admin')) throw new Error('Нет прав');
  await db.collection('users').doc(uid).update({
    banned: true,
    banReason: reason,
    bannedAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function unbanUser(uid) {
  if (!hasPermission(currentUserData, 'admin')) throw new Error('Нет прав');
  await db.collection('users').doc(uid).update({
    banned: false,
    banReason: null
  });
}

async function getUserById(uid) {
  try {
    const doc = await withTimeout(db.collection('users').doc(uid).get(), 5000, null);
    if (!doc || !doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  } catch (e) {
    return null;
  }
}

async function updateNickname(nick) {
  if (!currentUser || !nick) return;
  await db.collection('users').doc(currentUser.uid).update({ nickname: nick });
  currentUserData.nickname = nick;
  showToast('Ник сохранён', 'success');
}

async function bindTelegram(tg) {
  if (!currentUser || !tg) return false;
  const clean = tg.replace('@', '').toLowerCase().trim();
  if (!clean) return false;
  // Check uniqueness
  const existing = await db.collection('tgUsernames').doc(clean).get();
  if (existing.exists && existing.data().uid !== currentUser.uid) {
    showToast('Этот Telegram уже привязан к другому аккаунту', 'error');
    return false;
  }
  await db.collection('tgUsernames').doc(clean).set({ uid: currentUser.uid });
  await db.collection('users').doc(currentUser.uid).update({ tgUsername: clean });
  currentUserData.tgUsername = clean;
  showToast('Telegram привязан!', 'success');
  return true;
}
