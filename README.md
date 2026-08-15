# Follayt — Торговая площадка игровых предметов

Полноценный прототип трейд-площадки с гарантами, чатами, ролями и админ-панелью.

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

## Как запустить

1. Откройте `index.html` через любой локальный сервер (или просто в браузере, но лучше через сервер из-за модулей/политик).

   Самый простой способ:
   ```bash
   cd follayt-app
   npx serve .
   ```
   или Python:
   ```bash
   python -m http.server 8080
   ```

2. Firebase уже настроен на ваш проект `custom-graphics-36c50`.

## Важно: настройка Firebase

### 1. Authentication
В Firebase Console → Authentication → Sign-in method → включите **Email/Password**.

### 2. Firestore Database
Создайте базу (если ещё нет) в режиме production или test.

**Рекомендуемые коллекции** (создадутся автоматически при использовании):
- `users`
- `products`
- `chats`
- `messages`
- `guarantorApps`
- `tgUsernames`
- `notifications`
- `contests`

### 3. Storage
Включите Firebase Storage. Правила для тестов (не для продакшена!):

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
      allow read, write: if request.auth != null && request.auth.uid in resource.data.participants;
      allow create: if request.auth != null;
    }
    match /messages/{id} {
      allow read, create: if request.auth != null;
    }
    match /guarantorApps/{id} {
      allow create: if request.auth != null;
      allow read, update: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role in ['admin', 'owner'];
    }
    match /tgUsernames/{username} {
      allow read: if true;
      allow write: if request.auth != null;
    }
    match /notifications/{id} {
      allow read, write: if request.auth != null;
    }
    match /contests/{id} {
      allow read: if true;
      allow write: if request.auth != null && 
        get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'owner';
    }
  }
}
```

### 5. Индексы Firestore
При ошибках в консоли браузера (Composite index) — переходите по ссылке из ошибки и создавайте индекс.

Нужны индексы примерно на:
- products: status + category + createdAt
- chats: participants (array) + lastMessageAt
- messages: chatId + createdAt
- guarantorApps: status + createdAt
- users: role + online

### 6. Первый владелец
После регистрации зайдите в Firestore → коллекция `users` → ваш документ → поле `role` поставьте значение `owner`.

## Структура файлов

```
follayt-app/
├── index.html
├── css/styles.css
├── js/
│   ├── firebase.js   — конфиг Firebase
│   ├── utils.js      — утилиты, роутер, бейджи
│   ├── auth.js       — регистрация, вход, привязка TG
│   ├── data.js       — товары, категории, заявки, роли
│   ├── chat.js       — чаты, бот, приглашение гаранта
│   ├── admin.js      — админ / владелец панель
│   ├── ui.js         — рендер страниц
│   └── app.js        — главный роутер и бинды
└── README.md
```

## Примечания

- Онлайн-статус обновляется раз в минуту и при активности.
- «СМС» гаранту реализовано как in-app уведомление + сообщение бота в чате (реального SMS нет без Cloud Functions + стороннего сервиса).
- Для продакшена обязательно ужесточите Security Rules и добавьте Cloud Functions для критичных операций.
- Сайт полностью на клиентском JS + Firebase (без бэкенда).

Удачи с Follayt! 🛡️
