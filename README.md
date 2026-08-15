# Follayt — Торговая площадка

## Структура проекта

```
follayt-final/
├── index.html          ← главная страница
├── css/
│   └── styles.css
├── js/
│   ├── firebase.js
│   ├── utils.js
│   ├── auth.js
│   ├── data.js
│   ├── chat.js
│   ├── ui.js
│   ├── admin.js
│   └── app.js
├── assets/
└── README.md
```

## Как запустить (важно!)

1. Распакуй архив.
2. Открой терминал **внутри** папки `follayt-final`.
3. Запусти сервер:

```bash
npx serve .
```

или

```bash
python -m http.server 8080
```

4. Открой в браузере адрес, который покажет команда (например http://localhost:3000).

**Не открывай index.html двойным кликом** — будут ошибки 404.

## Настройка Firebase

1. Authentication → включи Email/Password
2. Firestore — создай базу
3. Storage — включи
4. После регистрации поставь себе роль `owner` в Firestore (коллекция users → твой документ → поле role)

Подробные Security Rules и индексы — смотри предыдущие инструкции.
