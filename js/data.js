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

async function getProducts(category = 'all', limit = 50) {
  try {
    let query = db.collection('products').where('status', '==', 'active').orderBy('createdAt', 'desc').limit(limit);
    if (category && category !== 'all') {
      query = db.collection('products').where('status', '==', 'active').where('category', '==', category).orderBy('createdAt', 'desc').limit(limit);
    }
    const snap = await query.get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    console.error('getProducts', e);
    // Fallback without composite index
    try {
      const snap = await db.collection('products').where('status', '==', 'active').limit(limit).get();
      let items = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      if (category && category !== 'all') {
        items = items.filter(p => p.category === category);
      }
      return items.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
    } catch (e2) {
      console.error(e2);
      return [];
    }
  }
}

async function getProduct(id) {
  const doc = await db.collection('products').doc(id).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
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
    ownerNickname: currentUserData.nickname,
    status: 'active',
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    views: 0
  };
  const docRef = await db.collection('products').add(product);
  return docRef.id;
}

async function deleteProduct(id) {
  const prod = await getProduct(id);
  if (!prod || (prod.ownerId !== currentUser.uid && !hasPermission(currentUserData, 'admin'))) {
    throw new Error('Нет прав');
  }
  await db.collection('products').doc(id).update({ status: 'deleted' });
}

async function getOnlineGuarantors() {
  try {
    const snap = await db.collection('users')
      .where('role', 'in', ['guarantor', 'helper', 'admin', 'owner'])
      .where('online', '==', true)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    // Fallback
    const snap = await db.collection('users').where('role', 'in', ['guarantor', 'helper', 'admin', 'owner']).get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() })).filter(u => u.online);
  }
}

async function submitGuarantorApplication(form) {
  if (!currentUser) throw new Error('Нужна авторизация');
  if (currentUserData.role === 'guarantor' || hasPermission(currentUserData, 'helper')) {
    throw new Error('Вы уже имеете роль гаранта или выше');
  }
  // Check pending
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
  const snap = await db.collection('guarantorApps')
    .where('status', '==', status)
    .orderBy('createdAt', 'desc')
    .get();
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
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
    // Bind TG if not already
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
  const doc = await db.collection('users').doc(uid).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}
