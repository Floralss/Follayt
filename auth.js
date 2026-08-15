// Authentication & User profile management

let currentUser = null;
let currentUserData = null;

auth.onAuthStateChanged(async (user) => {
  currentUser = user;
  if (user) {
    await loadUserData(user.uid);
    // Update online status
    await db.collection('users').doc(user.uid).update({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true
    }).catch(() => {});
    // Set offline on unload
    window.addEventListener('beforeunload', () => {
      db.collection('users').doc(user.uid).update({ online: false }).catch(() => {});
    });
  } else {
    currentUserData = null;
  }
  if (window.renderApp) window.renderApp();
});

async function loadUserData(uid) {
  try {
    const doc = await db.collection('users').doc(uid).get();
    if (doc.exists) {
      currentUserData = { id: doc.id, ...doc.data() };
    } else {
      // Create default profile
      currentUserData = {
        id: uid,
        nickname: currentUser.displayName || currentUser.email?.split('@')[0] || 'User' + uid.slice(0, 5),
        email: currentUser.email || '',
        role: 'user',
        tgUsername: null,
        avatar: null,
        createdAt: firebase.firestore.FieldValue.serverTimestamp(),
        online: true,
        lastSeen: firebase.firestore.FieldValue.serverTimestamp()
      };
      await db.collection('users').doc(uid).set(currentUserData);
    }
  } catch (e) {
    console.error('loadUserData error', e);
    showToast('Ошибка загрузки профиля', 'error');
  }
}

async function register(email, password, nickname) {
  try {
    const cred = await auth.createUserWithEmailAndPassword(email, password);
    await cred.user.updateProfile({ displayName: nickname });
    await db.collection('users').doc(cred.user.uid).set({
      nickname,
      email,
      role: 'user',
      tgUsername: null,
      avatar: null,
      createdAt: firebase.firestore.FieldValue.serverTimestamp(),
      online: true,
      lastSeen: firebase.firestore.FieldValue.serverTimestamp()
    });
    showToast('Регистрация успешна!', 'success');
    Router.go('home');
  } catch (e) {
    console.error(e);
    showToast(mapAuthError(e.code), 'error');
  }
}

async function login(email, password) {
  try {
    await auth.signInWithEmailAndPassword(email, password);
    showToast('Вход выполнен!', 'success');
    Router.go('home');
  } catch (e) {
    showToast(mapAuthError(e.code), 'error');
  }
}

async function logout() {
  if (currentUser) {
    await db.collection('users').doc(currentUser.uid).update({ online: false }).catch(() => {});
  }
  await auth.signOut();
  currentUserData = null;
  showToast('Вы вышли из аккаунта');
  Router.go('home');
}

function mapAuthError(code) {
  const map = {
    'auth/email-already-in-use': 'Этот email уже зарегистрирован',
    'auth/invalid-email': 'Неверный email',
    'auth/weak-password': 'Пароль слишком слабый (минимум 6 символов)',
    'auth/user-not-found': 'Пользователь не найден',
    'auth/wrong-password': 'Неверный пароль',
    'auth/too-many-requests': 'Слишком много попыток. Попробуйте позже'
  };
  return map[code] || 'Ошибка авторизации';
}

// Bind Telegram username (unique)
async function bindTelegram(username) {
  if (!currentUser || !username) return;
  username = username.replace('@', '').trim().toLowerCase();
  if (!/^[a-zA-Z0-9_]{5,32}$/.test(username)) {
    showToast('Неверный формат username Telegram', 'error');
    return false;
  }
  try {
    // Check uniqueness
    const existing = await db.collection('tgUsernames').doc(username).get();
    if (existing.exists && existing.data().uid !== currentUser.uid) {
      showToast('Этот Telegram уже привязан к другому аккаунту', 'error');
      return false;
    }
    // Remove old binding if any
    if (currentUserData.tgUsername) {
      await db.collection('tgUsernames').doc(currentUserData.tgUsername).delete().catch(() => {});
    }
    await db.collection('tgUsernames').doc(username).set({ uid: currentUser.uid });
    await db.collection('users').doc(currentUser.uid).update({ tgUsername: username });
    currentUserData.tgUsername = username;
    showToast('Telegram успешно привязан!', 'success');
    return true;
  } catch (e) {
    console.error(e);
    showToast('Ошибка привязки Telegram', 'error');
    return false;
  }
}

async function updateNickname(newNick) {
  if (!currentUser || !newNick || newNick.length < 3) {
    showToast('Ник должен быть не короче 3 символов', 'error');
    return;
  }
  await db.collection('users').doc(currentUser.uid).update({ nickname: newNick });
  currentUserData.nickname = newNick;
  showToast('Ник обновлён', 'success');
}
