// Main application

let unsubMessages = null;

async function renderApp() {
  Router.parse();
  document.getElementById('header').innerHTML = renderHeader();
  const mainEl = document.getElementById('main');

  if (unsubMessages) {
    unsubMessages();
    unsubMessages = null;
  }

  mainEl.innerHTML = `<div class="flex justify-center py-20"><div class="spinner"></div></div>`;

  try {
    const page = Router.current;

    if (page === 'login') {
      mainEl.innerHTML = renderAuthForm('login');
      bindAuthForm('login');
    } else if (page === 'register') {
      mainEl.innerHTML = renderAuthForm('register');
      bindAuthForm('register');
    } else if (page === 'home') {
      const cat = Router.params.cat || 'all';
      const products = await getProducts(cat);
      mainEl.innerHTML = renderHome(products, cat);
    } else if (page === 'add-product') {
      if (!currentUser) { Router.go('login'); return; }
      mainEl.innerHTML = renderAddProduct();
      bindProductForm();
    } else if (page === 'product') {
      const product = await getProduct(Router.params.id);
      mainEl.innerHTML = renderProductDetail(product);
    } else if (page === 'chats') {
      const chats = await getUserChats();
      mainEl.innerHTML = renderChatsList(chats);
    } else if (page === 'chat') {
      if (!currentUser) { Router.go('login'); return; }
      const chatId = Router.params.id;
      const chat = await getChat(chatId);
      if (!chat || !chat.participants.includes(currentUser.uid)) {
        mainEl.innerHTML = `<div class="text-center py-20 text-red-400">Нет доступа к этому чату</div>`;
        return;
      }
      mainEl.innerHTML = renderChatView(chat, []);
      unsubMessages = listenMessages(chatId, (messages) => {
        const container = document.getElementById('messages-container');
        if (container) {
          const temp = document.createElement('div');
          temp.innerHTML = renderChatView(chat, messages);
          const newMsgs = temp.querySelector('#messages-container');
          if (newMsgs) {
            container.innerHTML = newMsgs.innerHTML;
            container.scrollTop = container.scrollHeight;
          }
        }
      });
      bindChatForm(chatId);
    } else if (page === 'guarantor-app') {
      mainEl.innerHTML = renderGuarantorAppForm();
      bindGuarantorForm();
    } else if (page === 'profile') {
      mainEl.innerHTML = renderProfile();
    } else if (page === 'admin') {
      mainEl.innerHTML = await renderAdminPanel();
    } else {
      const products = await getProducts('all');
      mainEl.innerHTML = renderHome(products, 'all');
    }
  } catch (e) {
    console.error(e);
    mainEl.innerHTML = `<div class="text-center py-20 text-red-400">Ошибка загрузки. Откройте консоль (F12).</div>`;
  }
}

function bindAuthForm(mode) {
  const form = document.getElementById('auth-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('auth-email').value.trim();
    const password = document.getElementById('auth-password').value;
    if (mode === 'login') {
      await login(email, password);
    } else {
      const nickname = document.getElementById('auth-nickname').value.trim();
      await register(email, password, nickname);
    }
  });
}

function bindProductForm() {
  const form = document.getElementById('product-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      title: document.getElementById('prod-title').value.trim(),
      category: document.getElementById('prod-category').value,
      description: document.getElementById('prod-desc').value.trim(),
      price: document.getElementById('prod-price').value.trim(),
      tradeFor: document.getElementById('prod-trade').value.trim()
    };
    const imageFile = document.getElementById('prod-image').files[0] || null;
    try {
      showToast('Публикация...', 'info');
      const id = await createProduct(data, imageFile);
      showToast('Товар опубликован!', 'success');
      Router.go('product', { id });
    } catch (err) {
      console.error(err);
      showToast(err.message || 'Ошибка публикации', 'error');
    }
  });
}

function bindChatForm(chatId) {
  const form = document.getElementById('msg-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const input = document.getElementById('msg-input');
    const text = input.value;
    if (!text.trim()) return;
    input.value = '';
    await sendMessage(chatId, text);
  });
}

function bindGuarantorForm() {
  const form = document.getElementById('guarantor-form');
  if (!form) return;
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const data = {
      nickname: document.getElementById('g-nick').value.trim(),
      tgUsername: document.getElementById('g-tg').value.trim(),
      channelLink: document.getElementById('g-channel').value.trim(),
      onlineHours: document.getElementById('g-hours').value
    };
    try {
      await submitGuarantorApplication(data);
      showToast('Заявка отправлена! Ожидайте решения админов.', 'success');
      Router.go('home');
    } catch (err) {
      showToast(err.message || 'Ошибка', 'error');
    }
  });
}

window.startChat = async (productId, sellerId) => {
  const chatId = await createChat(productId, sellerId);
  if (chatId) Router.go('chat', { id: chatId });
};

window.showFindGuarantor = async (chatId) => {
  showToast('Ищем гарантов в сети...', 'info');
  const list = await getOnlineGuarantors();
  showFindGuarantorModal(chatId, list.filter(g => g.id !== currentUser.uid));
};

window.doInviteGuarantor = async (chatId, guarantorId) => {
  const modal = document.getElementById('guarantor-modal');
  if (modal) modal.remove();
  await inviteGuarantor(chatId, guarantorId);
  renderApp();
};

window.saveNickname = async () => {
  const nick = document.getElementById('prof-nick')?.value?.trim();
  await updateNickname(nick);
  renderApp();
};

window.saveTelegram = async () => {
  const tg = document.getElementById('prof-tg')?.value?.trim();
  const ok = await bindTelegram(tg);
  if (ok) renderApp();
};

window.logout = logout;

Router.parse();
window.renderApp = renderApp;
renderApp();

setInterval(() => {
  if (currentUser) {
    db.collection('users').doc(currentUser.uid).update({
      lastSeen: firebase.firestore.FieldValue.serverTimestamp(),
      online: true
    }).catch(() => {});
  }
}, 60000);
