// Chat & Trade system

async function createChat(productId, sellerId) {
  if (!currentUser) {
    showToast('Войдите в аккаунт', 'error');
    return null;
  }
  if (sellerId === currentUser.uid) {
    showToast('Нельзя создать чат с самим собой', 'error');
    return null;
  }
  // Check existing chat for this product between these users
  const existing = await db.collection('chats')
    .where('productId', '==', productId)
    .where('participants', 'array-contains', currentUser.uid)
    .get();
  for (const doc of existing.docs) {
    const data = doc.data();
    if (data.participants.includes(sellerId) && data.status !== 'closed') {
      return doc.id;
    }
  }

  const product = await getProduct(productId);
  const chatRef = await db.collection('chats').add({
    productId,
    productTitle: product?.title || 'Товар',
    participants: [currentUser.uid, sellerId],
    participantNames: {
      [currentUser.uid]: currentUserData.nickname,
      [sellerId]: product?.ownerNickname || 'Продавец'
    },
    status: 'active',
    guarantorId: null,
    createdAt: firebase.firestore.FieldValue.serverTimestamp(),
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  // Bot welcome message
  await sendBotMessage(chatRef.id, 
    `👋 Привет! Я FollaytBot.\n\n` +
    `⚠️ Важно:\n` +
    `• Привяжите свой Telegram в настройках профиля\n` +
    `• Запрещено договариваться о переходе в другие соцсети (Discord, VK, личный TG и т.д.) для проведения трейда — это приведёт к бану\n` +
    `• Для безопасного трейда используйте кнопку «Найти гаранта»\n` +
    `• Гарант поможет провести сделку честно\n\n` +
    `Удачного трейда! 🛡️`
  );

  return chatRef.id;
}

async function sendMessage(chatId, text) {
  if (!text.trim() || !currentUser) return;
  await db.collection('messages').add({
    chatId,
    senderId: currentUser.uid,
    senderName: currentUserData.nickname,
    text: text.trim(),
    type: 'text',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
  await db.collection('chats').doc(chatId).update({
    lastMessageAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function sendBotMessage(chatId, text) {
  await db.collection('messages').add({
    chatId,
    senderId: 'FollaytBot',
    senderName: 'FollaytBot',
    text,
    type: 'bot',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

async function sendSystemMessage(chatId, text) {
  await db.collection('messages').add({
    chatId,
    senderId: 'system',
    senderName: 'Система',
    text,
    type: 'system',
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });
}

function listenMessages(chatId, callback) {
  return db.collection('messages')
    .where('chatId', '==', chatId)
    .orderBy('createdAt', 'asc')
    .onSnapshot(snap => {
      const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      callback(messages);
    }, err => {
      console.error('listenMessages', err);
      // Fallback without order
      db.collection('messages').where('chatId', '==', chatId).get().then(snap => {
        const messages = snap.docs.map(d => ({ id: d.id, ...d.data() }))
          .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0));
        callback(messages);
      });
    });
}

async function getUserChats() {
  if (!currentUser) return [];
  try {
    const snap = await db.collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .orderBy('lastMessageAt', 'desc')
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }));
  } catch (e) {
    const snap = await db.collection('chats')
      .where('participants', 'array-contains', currentUser.uid)
      .get();
    return snap.docs.map(d => ({ id: d.id, ...d.data() }))
      .sort((a, b) => (b.lastMessageAt?.seconds || 0) - (a.lastMessageAt?.seconds || 0));
  }
}

async function inviteGuarantor(chatId, guarantorId) {
  if (!currentUser) return;
  const chat = (await db.collection('chats').doc(chatId).get()).data();
  if (!chat || !chat.participants.includes(currentUser.uid)) {
    showToast('Нет доступа к чату', 'error');
    return;
  }
  if (chat.guarantorId) {
    showToast('Гарант уже приглашён', 'warning');
    return;
  }

  const guarantor = await getUserById(guarantorId);
  if (!guarantor) {
    showToast('Гарант не найден', 'error');
    return;
  }

  // Add guarantor to participants
  await db.collection('chats').doc(chatId).update({
    guarantorId,
    participants: firebase.firestore.FieldValue.arrayUnion(guarantorId),
    [`participantNames.${guarantorId}`]: guarantor.nickname
  });

  await sendSystemMessage(chatId, `🛡️ Гарант ${guarantor.nickname} приглашён в чат`);

  // Notify guarantor (in-app message + "SMS" simulation via system)
  await sendBotMessage(chatId, 
    `📨 Уведомление гаранту @${guarantor.tgUsername || guarantor.nickname}:\n` +
    `Вас пригласили в трейд-чат по товару «${chat.productTitle}».\n` +
    `Пожалуйста, отправьте ссылку на свой профиль / добавьтесь в друзья и проведите безопасную передачу.`
  );

  // Also create a notification document for the guarantor
  await db.collection('notifications').add({
    userId: guarantorId,
    type: 'guarantor_invite',
    chatId,
    productTitle: chat.productTitle,
    fromUser: currentUserData.nickname,
    read: false,
    createdAt: firebase.firestore.FieldValue.serverTimestamp()
  });

  showToast('Гарант приглашён!', 'success');
}

async function getChat(chatId) {
  const doc = await db.collection('chats').doc(chatId).get();
  if (!doc.exists) return null;
  return { id: doc.id, ...doc.data() };
}
