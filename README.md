# Follayt — Торговая площадка игровых предметов

Полноценный прототип трейд-площадки с гарантами, чатами, ролями и админ-панелью.

## 🚀 Как запустить (ВАЖНО)

Ошибки **404** в консоли появляются, если открывать `index.html` не из правильной папки или без локального сервера.

### Способ 1 (самый простой на Windows)
1. Распакуйте архив.
2. Зайдите в папку **`follayt-app`**.
3. Дважды кликните файл **`start.bat`**.
4. Откроется браузер на `http://localhost:8080`.

### Способ 2 (через терминал)
```bash
cd follayt-app
python -m http.server 8080
```
или
```bash
cd follayt-app
npx serve .
```

**Не открывайте index.html двойным кликом** (протокол `file://`) — браузер часто блокирует скрипты и даёт 404.

### Структура папки (должна быть именно такой)
```
follayt-app/
├── index.html
├── start.bat
├── css/
│   └── styles.css
├── js/
│   ├── firebase.js
│   ├── utils.js
│   ├── auth.js
│   ├── data.js
│   ├── ui.js
│   ├── chat.js
│   ├── admin.js
│   └── app.js
└── assets/
```

Если в консоли (F12) видите 404 на `styles.css`, `auth.js` и т.д. — вы запустили сервер **не из папки follayt-app**.

---

## Возможности

- **Категории игр**: Roblox, CS2, Valorant, Fortnite, Minecraft, Dota 2, GTA, PUBG и др.
- **Товары**: добавление с фото (Firebase Storage), описание, цена / трейд
- **Чаты**: создание чата по товару, переписка в реальном времени
- **FollaytBot**: автоматически пишет правила (привязать TG, запрет ухода в другие соцсети)
- **Система гарантов**:
  1. В чате кнопка «Найти гаранта»
  2. Список онлайн-гарантов + кнопка «Пригласить в чат»
  3. Гаранту приходит уведомление
  4. Гарант добавляется в чат и помогает провести сделку
- **Заявка на роль гаранта**: форма (ник, TG, канал с пруфами, часы онлайн) → админы принимают/отклоняют → выдаётся роль + тег
- **Привязка Telegram**: уникальная (один TG = один аккаунт)
- **Роли**: user → guarantor → helper → admin → owner
- **Админ-панель**: заявки гарантов, бан/разбан
- **Панель владельца**: выдача ролей, создание конкурсов + всё админское

## Настройка Firebase

Firebase уже настроен на проект `custom-graphics-36c50`.

### 1. Authentication
Firebase Console → Authentication → Sign-in method → включите **Email/Password**.

### 2. Firestore Database
Создайте базу (если ещё нет).

Рекомендуемые коллекции (создадутся автоматически):
- `users`, `products`, `chats`, `messages`, `guarantorApps`, `tgUsernames`, `notifications`, `contests`

### 3. Storage
Включите Firebase Storage. Пример правил для тестов:

```
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /products/{userId}/{allPaths=**} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId;
    }
  }
}
```

### 4. Firestore Security Rules (пример для старта)

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read: if true;
      allow write: if request.auth != null && (request.auth.uid == userId ||
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'owner']);
    }
    match /products/{id} {
      allow read: if true;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (resource.data.ownerId == request.auth.uid ||
         get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'owner']);
    }
    match /chats/{id} {
      allow read, write: if request.auth != null &&
        request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
    }
    match /messages/{id} {
      allow read, create: if request.auth != null;
    }
    match /guarantorApps/{id} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'owner'];
    }
    match /tgUsernames/{id} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /notifications/{id} {
      allow read, write: if request.auth != null;
    }
    match /contests/{id} {
      allow read: if true;
      allow write: if request.auth != null &&
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'owner'];
    }
  }
}
```

> Для продакшена сделайте правила строже.

## Проблемы и решения

| Проблема | Решение |
|----------|---------|
| 404 на css/js файлы | Запускайте сервер **из папки follayt-app** |
| CSP блокирует eval | Tailwind CDN использует eval. На хостинге с жёстким CSP добавьте `'unsafe-eval'` или соберите Tailwind локально |
| Firebase permission denied | Проверьте правила Firestore / Storage и что Email/Password включён |
| Чёрный экран | Откройте F12 → Console, смотрите ошибки |

Удачной торговли! 🛡️
