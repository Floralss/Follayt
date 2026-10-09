#!/usr/bin/env python3
"""
Telegram Gift Stars Bot
Проверка подписки на 3 канала + реферальная система + вывод звёзд
"""

import asyncio
import logging
from datetime import datetime
from typing import Optional

import aiosqlite
from aiogram import Bot, Dispatcher, F, types
from aiogram.filters import Command, CommandStart
from aiogram.fsm.context import FSMContext
from aiogram.fsm.state import State, StatesGroup
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.types import (
    InlineKeyboardButton,
    InlineKeyboardMarkup,
    KeyboardButton,
    LabeledPrice,
    ReplyKeyboardMarkup,
    ReplyKeyboardRemove,
)
from aiogram.utils.keyboard import InlineKeyboardBuilder, ReplyKeyboardBuilder

# ==================== НАСТРОЙКИ ====================
BOT_TOKEN = "8257457028:AAHs-FTryLPanuqvTqaeGz9sumn-z3v1enA"
ADMIN_IDS = [8920532333]  # Админы

# Каналы для обязательной подписки
# ВАЖНО: Бот ДОЛЖЕН быть администратором во ВСЕХ каналах (особенно в приватном)!
# Для приватного канала: добавь бота админом, затем узнай chat_id через @username_to_id_bot или пересылкой сообщения
CHANNELS = [
    {
        "name": "NexVen Drop",
        "url": "https://t.me/nexvendrop",
        "chat_id": "@nexvendrop",  # username или -100xxxxxxxxxx
    },
    {
        "name": "Star Gifts Zov",
        "url": "https://t.me/stargiftszov",
        "chat_id": "@stargiftszov",
    },
    {
        "name": "Закрытый канал",
        "url": "https://t.me/+MqA2Q6gWbKk0ZDlk",
        "chat_id": None,  # <-- ЗАМЕНИТЬ на реальный chat_id приватного канала, например -1001234567890
        # После добавления бота админом в канал, отправь /get_chat_id в боте из канала или используй @getidsbot
    },
]

STARS_PER_REF = 100          # Звёзд за 1 реферала
MIN_STARS_WITHDRAW = 500     # Минимум для вывода (5 рефералов)
MIN_REFS_WITHDRAW = 5
SUPPORT_USERNAME = "@StarGiftMananger"
DB_PATH = "bot_database.db"

# ==================== ЛОГИРОВАНИЕ ====================
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


# ==================== FSM ====================
class DonateStates(StatesGroup):
    waiting_amount = State()


class MiniGameStates(StatesGroup):
    waiting_bet = State()
    waiting_prize = State()
    waiting_give_id = State()
    waiting_give_amount = State()


class BanStates(StatesGroup):
    waiting_target = State()
    waiting_reason = State()
    waiting_unban = State()


# ==================== БАЗА ДАННЫХ ====================
async def init_db():
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute("""
            CREATE TABLE IF NOT EXISTS users (
                user_id INTEGER PRIMARY KEY,
                username TEXT,
                full_name TEXT,
                referrer_id INTEGER,
                stars INTEGER DEFAULT 0,
                referrals_count INTEGER DEFAULT 0,
                is_subscribed INTEGER DEFAULT 0,
                ref_credited INTEGER DEFAULT 0,
                created_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS withdrawals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                stars INTEGER,
                status TEXT DEFAULT 'pending',
                created_at TEXT,
                processed_at TEXT,
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS minigame (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                status TEXT DEFAULT 'active',
                prize_stars INTEGER DEFAULT 0,
                created_at TEXT,
                finished_at TEXT
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS minigame_bets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                game_id INTEGER,
                user_id INTEGER,
                amount INTEGER,
                created_at TEXT,
                FOREIGN KEY (game_id) REFERENCES minigame(id),
                FOREIGN KEY (user_id) REFERENCES users(user_id)
            )
        """)
        await db.execute("""
            CREATE TABLE IF NOT EXISTS bans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                username TEXT,
                reason TEXT,
                banned_by INTEGER,
                created_at TEXT
            )
        """)
        await db.commit()


async def get_user(user_id: int) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM users WHERE user_id = ?", (user_id,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def create_user(user_id: int, username: str, full_name: str, referrer_id: Optional[int] = None):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            """INSERT OR IGNORE INTO users (user_id, username, full_name, referrer_id, created_at)
               VALUES (?, ?, ?, ?, ?)""",
            (user_id, username, full_name, referrer_id, datetime.now().isoformat())
        )
        await db.commit()


async def update_user(user_id: int, **kwargs):
    if not kwargs:
        return
    fields = ", ".join(f"{k} = ?" for k in kwargs)
    values = list(kwargs.values()) + [user_id]
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(f"UPDATE users SET {fields} WHERE user_id = ?", values)
        await db.commit()


async def add_stars_and_ref(referrer_id: int, stars: int = STARS_PER_REF):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE users SET stars = stars + ?, referrals_count = referrals_count + 1 WHERE user_id = ?",
            (stars, referrer_id)
        )
        await db.commit()


async def create_withdrawal(user_id: int, stars: int) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO withdrawals (user_id, stars, status, created_at) VALUES (?, ?, 'pending', ?)",
            (user_id, stars, datetime.now().isoformat())
        )
        await db.commit()
        return cursor.lastrowid


async def get_withdrawal(wid: int) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM withdrawals WHERE id = ?", (wid,)) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def update_withdrawal(wid: int, status: str):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE withdrawals SET status = ?, processed_at = ? WHERE id = ?",
            (status, datetime.now().isoformat(), wid)
        )
        await db.commit()


async def get_pending_withdrawals(offset: int = 0, limit: int = 5):
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT w.*, u.username, u.full_name, u.referrals_count FROM withdrawals w "
            "JOIN users u ON w.user_id = u.user_id WHERE w.status = 'pending' "
            "ORDER BY w.id LIMIT ? OFFSET ?",
            (limit, offset)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


async def get_pending_count() -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COUNT(*) FROM withdrawals WHERE status = 'pending'"
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0


# --- Мини-игра ---
async def get_active_minigame() -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM minigame WHERE status = 'active' ORDER BY id DESC LIMIT 1"
        ) as cursor:
            row = await cursor.fetchone()
            return dict(row) if row else None


async def create_minigame() -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        cursor = await db.execute(
            "INSERT INTO minigame (status, prize_stars, created_at) VALUES ('active', 0, ?)",
            (datetime.now().isoformat(),)
        )
        await db.commit()
        return cursor.lastrowid


async def set_minigame_prize(game_id: int, prize: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE minigame SET prize_stars = ? WHERE id = ?",
            (prize, game_id)
        )
        await db.commit()


async def finish_minigame(game_id: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "UPDATE minigame SET status = 'finished', finished_at = ? WHERE id = ?",
            (datetime.now().isoformat(), game_id)
        )
        await db.commit()


async def add_minigame_bet(game_id: int, user_id: int, amount: int):
    async with aiosqlite.connect(DB_PATH) as db:
        await db.execute(
            "INSERT INTO minigame_bets (game_id, user_id, amount, created_at) VALUES (?, ?, ?, ?)",
            (game_id, user_id, amount, datetime.now().isoformat())
        )
        await db.commit()


async def get_minigame_leaderboard(game_id: int, limit: int = 10) -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            """SELECT b.user_id, u.username, u.full_name, SUM(b.amount) as total
               FROM minigame_bets b
               JOIN users u ON b.user_id = u.user_id
               WHERE b.game_id = ?
               GROUP BY b.user_id
               ORDER BY total DESC
               LIMIT ?""",
            (game_id, limit)
        ) as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


async def get_user_bet_total(game_id: int, user_id: int) -> int:
    async with aiosqlite.connect(DB_PATH) as db:
        async with db.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM minigame_bets WHERE game_id = ? AND user_id = ?",
            (game_id, user_id)
        ) as cursor:
            row = await cursor.fetchone()
            return row[0] if row else 0


# --- Баны ---
async def is_banned(user_id: int, username: str = None) -> Optional[dict]:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute(
            "SELECT * FROM bans WHERE user_id = ? LIMIT 1", (user_id,)
        ) as cursor:
            row = await cursor.fetchone()
            if row:
                return dict(row)
        if username:
            uname = username.lstrip("@").lower()
            async with db.execute(
                "SELECT * FROM bans WHERE LOWER(REPLACE(username, '@', '')) = ? LIMIT 1",
                (uname,)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    return dict(row)
    return None


async def ban_user(user_id: int, username: str, reason: str, banned_by: int):
    async with aiosqlite.connect(DB_PATH) as db:
        # Удаляем старый бан если был
        await db.execute("DELETE FROM bans WHERE user_id = ?", (user_id,))
        if username:
            uname = username.lstrip("@").lower()
            await db.execute(
                "DELETE FROM bans WHERE LOWER(REPLACE(username, '@', '')) = ?", (uname,)
            )
        await db.execute(
            "INSERT INTO bans (user_id, username, reason, banned_by, created_at) VALUES (?, ?, ?, ?, ?)",
            (user_id, username or "", reason or "", banned_by, datetime.now().isoformat())
        )
        await db.commit()


async def unban_user(user_id: int = None, username: str = None):
    async with aiosqlite.connect(DB_PATH) as db:
        if user_id:
            await db.execute("DELETE FROM bans WHERE user_id = ?", (user_id,))
        if username:
            uname = username.lstrip("@").lower()
            await db.execute(
                "DELETE FROM bans WHERE LOWER(REPLACE(username, '@', '')) = ?", (uname,)
            )
        await db.commit()


async def get_all_bans() -> list:
    async with aiosqlite.connect(DB_PATH) as db:
        db.row_factory = aiosqlite.Row
        async with db.execute("SELECT * FROM bans ORDER BY id DESC") as cursor:
            rows = await cursor.fetchall()
            return [dict(r) for r in rows]


# ==================== ПРОВЕРКА ПОДПИСОК ====================
async def check_subscriptions(bot: Bot, user_id: int) -> tuple[bool, list[str]]:
    """Возвращает (все_подписаны, список_неподписанных)"""
    not_subscribed = []
    for ch in CHANNELS:
        chat_id = ch["chat_id"]
        if chat_id is None:
            # Приватный канал без ID — пропускаем проверку (нужно заполнить)
            logger.warning(f"Канал {ch['name']} не имеет chat_id — пропуск проверки")
            continue
        try:
            member = await bot.get_chat_member(chat_id=chat_id, user_id=user_id)
            if member.status in ("left", "kicked"):
                not_subscribed.append(ch["name"])
        except Exception as e:
            logger.error(f"Ошибка проверки {ch['name']} ({chat_id}): {e}")
            not_subscribed.append(ch["name"])
    return len(not_subscribed) == 0, not_subscribed


# ==================== КЛАВИАТУРЫ ====================
def get_subscribe_keyboard() -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    for i, ch in enumerate(CHANNELS, 1):
        builder.row(
            InlineKeyboardButton(text=f"{i}. {ch['name']}", url=ch["url"])
        )
    builder.row(
        InlineKeyboardButton(text="✅ Проверить подписки", callback_data="check_subs")
    )
    return builder.as_markup()


async def get_main_keyboard() -> ReplyKeyboardMarkup:
    builder = ReplyKeyboardBuilder()
    builder.row(KeyboardButton(text="🔗 Поделиться ссылкой"))
    builder.row(KeyboardButton(text="⭐ Вывести звёзды"))
    builder.row(KeyboardButton(text="💫 Пожертвовать звёзды"))
    # Кнопка мини-игры если активна
    game = await get_active_minigame()
    if game:
        builder.row(KeyboardButton(text="🎮 Мини-игра"))
    builder.row(KeyboardButton(text="🔄 Обновить"), KeyboardButton(text="❓ Помощь"))
    return builder.as_markup(resize_keyboard=True)


def get_admin_withdraw_keyboard(wid: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="✅ Выдано", callback_data=f"issue_{wid}"),
        InlineKeyboardButton(text="❌ Отказано", callback_data=f"reject_{wid}")
    )
    return builder.as_markup()


# ==================== ТЕКСТЫ ====================
def get_main_text(user: dict, bot_username: str) -> str:
    ref_link = f"https://t.me/{bot_username}?start=ref_{user['user_id']}"
    invited = user.get("referrals_count", 0)
    stars = user.get("stars", 0)
    to_withdraw = "К выводу пока ничего." if stars < MIN_STARS_WITHDRAW else f"Доступно к выводу: {stars}⭐"

    return (
        f"<b>Твоя ссылка:</b>\n"
        f"<code>{ref_link}</code>\n\n"
        f"За каждого друга, который зайдёт и подпишется — <b>100⭐</b>\n"
        f"<b>Приглашено:</b> {invited} из {MIN_REFS_WITHDRAW}\n\n"
        f"{to_withdraw}"
    )


WELCOME_TEXT = (
    "👋 <b>Добро пожаловать в Telegram Gift Stars!</b>\n\n"
    "Чтобы пользоваться ботом, подпишись на все каналы ниже и нажми «Проверить подписки»."
)

HELP_TEXT = (
    "❓ <b>Помощь</b>\n\n"
    "1. Подпишись на все обязательные каналы\n"
    "2. Приглашай друзей по своей ссылке\n"
    "3. За каждого друга, который подпишется — ты получаешь <b>100⭐</b>\n"
    "4. Когда наберёшь <b>5 друзей / 500⭐</b> — можешь вывести звёзды\n"
    "5. После заявки на вывод приз выдаётся в течение дня\n"
    "6. Можешь пожертвовать звёзды на ускорение выводов\n\n"
    f"Техподдержка: {SUPPORT_USERNAME}"
)


# ==================== ОБРАБОТЧИКИ ====================
async def check_ban_and_reply(message: types.Message) -> bool:
    """True если пользователь забанен (и уже ответили)."""
    ban = await is_banned(message.from_user.id, message.from_user.username)
    if ban:
        reason = ban.get("reason") or "без указания причины"
        await message.answer(
            f"🚫 <b>Ваш аккаунт заблокирован</b>\n\n"
            f"Причина: {reason}\n\n"
            f"По вопросам: {SUPPORT_USERNAME}",
            parse_mode="HTML"
        )
        return True
    return False


async def cmd_start(message: types.Message, bot: Bot, state: FSMContext):
    user_id = message.from_user.id
    username = message.from_user.username or ""
    full_name = message.from_user.full_name or ""

    # Проверка бана
    ban = await is_banned(user_id, username)
    if ban:
        reason = ban.get("reason") or "без указания причины"
        await message.answer(
            f"🚫 <b>Ваш аккаунт заблокирован</b>\n\n"
            f"Причина: {reason}\n\n"
            f"По вопросам: {SUPPORT_USERNAME}",
            parse_mode="HTML"
        )
        return

    # Парсим реферала
    referrer_id = None
    args = message.text.split(maxsplit=1)
    if len(args) > 1 and args[1].startswith("ref_"):
        try:
            referrer_id = int(args[1].replace("ref_", ""))
            if referrer_id == user_id:
                referrer_id = None  # нельзя самого себя
        except ValueError:
            referrer_id = None

    existing = await get_user(user_id)
    if not existing:
        await create_user(user_id, username, full_name, referrer_id)
        user = await get_user(user_id)
    else:
        # Обновляем username/name
        await update_user(user_id, username=username, full_name=full_name)
        user = await get_user(user_id)
        # Если уже есть, реферер не меняем

    # Проверяем подписки
    all_ok, missing = await check_subscriptions(bot, user_id)

    if not all_ok or not user.get("is_subscribed"):
        await message.answer(
            WELCOME_TEXT,
            reply_markup=get_subscribe_keyboard(),
            parse_mode="HTML"
        )
        return

    # Уже подписан — показываем главное меню
    me = await bot.get_me()
    await message.answer(
        get_main_text(user, me.username),
        reply_markup=await get_main_keyboard(),
        parse_mode="HTML"
    )


async def callback_check_subs(callback: types.CallbackQuery, bot: Bot):
    user_id = callback.from_user.id
    all_ok, missing = await check_subscriptions(bot, user_id)

    if not all_ok:
        missing_text = "\n".join(f"• {m}" for m in missing)
        await callback.answer(
            f"Ты ещё не подписан на:\n{missing_text}",
            show_alert=True
        )
        return

    # Подписки ок
    user = await get_user(user_id)
    if not user:
        await callback.answer("Ошибка. Нажми /start", show_alert=True)
        return

    await update_user(user_id, is_subscribed=1)

    # Начисляем рефералу, если ещё не начисляли
    if user.get("referrer_id") and not user.get("ref_credited"):
        referrer_id = user["referrer_id"]
        referrer = await get_user(referrer_id)
        if referrer:
            await add_stars_and_ref(referrer_id)
            await update_user(user_id, ref_credited=1)

            # Уведомляем реферера
            try:
                await bot.send_message(
                    referrer_id,
                    f"🎉 <b>+{STARS_PER_REF}⭐ с вашего друга!</b>\n\n"
                    f"Пользователь @{callback.from_user.username or callback.from_user.id} "
                    f"подписался по вашей ссылке.",
                    parse_mode="HTML"
                )
            except Exception as e:
                logger.error(f"Не удалось уведомить реферера {referrer_id}: {e}")

    me = await bot.get_me()
    user = await get_user(user_id)  # обновлённые данные
    await callback.message.edit_text(
        "✅ <b>Подписки проверены!</b>\n\n" + get_main_text(user, me.username),
        parse_mode="HTML"
    )
    await callback.message.answer(
        "Главное меню:",
        reply_markup=await get_main_keyboard()
    )
    await callback.answer("Успешно!")


async def cmd_update(message: types.Message, bot: Bot):
    if await check_ban_and_reply(message):
        return
    user = await get_user(message.from_user.id)
    if not user or not user.get("is_subscribed"):
        await message.answer("Сначала пройди проверку подписок — /start")
        return
    me = await bot.get_me()
    await message.answer(
        get_main_text(user, me.username),
        reply_markup=await get_main_keyboard(),
        parse_mode="HTML"
    )


async def cmd_help(message: types.Message):
    if await check_ban_and_reply(message):
        return
    await message.answer(HELP_TEXT, parse_mode="HTML")


async def cmd_share(message: types.Message, bot: Bot):
    if await check_ban_and_reply(message):
        return
    user = await get_user(message.from_user.id)
    if not user or not user.get("is_subscribed"):
        await message.answer("Сначала пройди проверку подписок — /start")
        return
    me = await bot.get_me()
    ref_link = f"https://t.me/{me.username}?start=ref_{user['user_id']}"
    await message.answer(
        f"🔗 <b>Твоя реферальная ссылка:</b>\n\n<code>{ref_link}</code>\n\n"
        f"Отправь её друзьям! За каждого, кто подпишется — <b>+100⭐</b>",
        parse_mode="HTML"
    )


async def cmd_withdraw(message: types.Message, bot: Bot):
    if await check_ban_and_reply(message):
        return
    user_id = message.from_user.id
    user = await get_user(user_id)
    if not user or not user.get("is_subscribed"):
        await message.answer("Сначала пройди проверку подписок — /start")
        return

    stars = user.get("stars", 0)
    refs = user.get("referrals_count", 0)

    if stars < MIN_STARS_WITHDRAW and refs < MIN_REFS_WITHDRAW:
        await message.answer(
            f"❌ Вывод доступен от <b>{MIN_REFS_WITHDRAW} рефералов / {MIN_STARS_WITHDRAW}⭐</b>\n\n"
            f"Сейчас у тебя: {refs} реф. / {stars}⭐",
            parse_mode="HTML"
        )
        return

    # Создаём заявку
    wid = await create_withdrawal(user_id, stars)
    # Обнуляем звёзды (или можно оставить, но обычно списываем)
    await update_user(user_id, stars=0)

    await message.answer(
        f"✅ <b>Заявка #{wid} создана!</b>\n\n"
        f"Количество звёзд: <b>{stars}⭐</b>\n\n"
        f"В течение дня выдадим ваш приз.\n"
        f"Если не пришло — пишите в техподдержку: {SUPPORT_USERNAME}",
        parse_mode="HTML"
    )

    # Уведомляем админов
    username = user.get("username") or "нет"
    text = (
        f"<b>Номер #{wid}</b>\n"
        f"Юзернейм и айди: @{username} / <code>{user_id}</code>\n"
        f"Количество звёзд: <b>{stars}⭐</b>\n"
        f"Сколько пригласил людей всего: <b>{refs}</b>"
    )
    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(
                admin_id,
                text,
                reply_markup=get_admin_withdraw_keyboard(wid),
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error(f"Не удалось отправить админу {admin_id}: {e}")


# ==================== ПОЖЕРТВОВАНИЕ ====================
async def cmd_donate(message: types.Message, state: FSMContext):
    if await check_ban_and_reply(message):
        return
    user = await get_user(message.from_user.id)
    if not user or not user.get("is_subscribed"):
        await message.answer("Сначала пройди проверку подписок — /start")
        return

    await message.answer(
        "💫 <b>Пожертвовать звёзды на ещё более быстрые выводы</b>\n\n"
        "Напиши сумму звёзд, которую хочешь пожертвовать (только число, например: <code>50</code>)\n\n"
        "Минимум: 1⭐\n"
        "После ввода суммы появится кнопка оплаты.",
        parse_mode="HTML"
    )
    await state.set_state(DonateStates.waiting_amount)


async def process_donate_amount(message: types.Message, state: FSMContext, bot: Bot):
    text = message.text.strip()
    if not text.isdigit():
        await message.answer("❌ Введи только число (например: 50)")
        return

    amount = int(text)
    if amount < 1:
        await message.answer("❌ Минимальная сумма — 1⭐")
        return
    if amount > 100000:
        await message.answer("❌ Слишком большая сумма")
        return

    await state.clear()

    # Отправляем инвойс на оплату звёздами (XTR)
    prices = [LabeledPrice(label=f"Пожертвование {amount}⭐", amount=amount)]

    try:
        await bot.send_invoice(
            chat_id=message.chat.id,
            title="Пожертвование на быстрые выводы",
            description=f"Вы жертвуете {amount} Telegram Stars на ускорение выводов.",
            payload=f"donate_{message.from_user.id}_{amount}",
            currency="XTR",  # Telegram Stars
            prices=prices,
            provider_token="",  # пустой для Stars
        )
    except Exception as e:
        logger.error(f"Ошибка создания инвойса: {e}")
        await message.answer("❌ Не удалось создать платёж. Попробуй позже.")


async def pre_checkout_handler(pre_checkout_query: types.PreCheckoutQuery, bot: Bot):
    # Обязательно отвечаем на pre_checkout
    await bot.answer_pre_checkout_query(pre_checkout_query.id, ok=True)


async def successful_payment_handler(message: types.Message, bot: Bot):
    payment = message.successful_payment
    if not payment:
        return

    # payload = donate_USERID_AMOUNT
    try:
        parts = payment.invoice_payload.split("_")
        if parts[0] != "donate":
            return
        user_id = int(parts[1])
        amount = int(parts[2])
    except Exception:
        amount = payment.total_amount
        user_id = message.from_user.id

    username = message.from_user.username or "нет"
    full_name = message.from_user.full_name or ""

    # Благодарим пользователя
    await message.answer(
        f"✅ <b>Спасибо за пожертвование {amount}⭐!</b>\n\n"
        f"Твои звёзды пойдут на ускорение выводов.\n"
        f"Мы очень ценим твою поддержку! 💫",
        parse_mode="HTML"
    )

    # Уведомляем админов
    admin_text = (
        f"💫 <b>Пожертвование!</b>\n\n"
        f"Юз <b>@{username}</b> ({full_name})\n"
        f"ID: <code>{user_id}</code>\n"
        f"Пожертвовал <b>{amount}⭐</b> на быстрые выводы"
    )
    for admin_id in ADMIN_IDS:
        try:
            await bot.send_message(admin_id, admin_text, parse_mode="HTML")
        except Exception as e:
            logger.error(f"Не удалось отправить админу {admin_id}: {e}")


async def callback_issue(callback: types.CallbackQuery, bot: Bot):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    wid = int(callback.data.split("_")[1])
    w = await get_withdrawal(wid)
    if not w:
        await callback.answer("Заявка не найдена", show_alert=True)
        return
    if w["status"] != "pending":
        await callback.answer("Уже обработана", show_alert=True)
        return

    await update_withdrawal(wid, "issued")

    # Уведомляем пользователя
    try:
        await bot.send_message(
            w["user_id"],
            f"✅ <b>Звёзды по заявке #{wid} отправлены!</b>\n\n"
            f"Если не пришло — пишите в техподдержку: {SUPPORT_USERNAME}",
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Не удалось уведомить пользователя {w['user_id']}: {e}")

    await callback.message.edit_text(
        callback.message.text + "\n\n✅ <b>ВЫДАНО</b>",
        parse_mode="HTML"
    )
    await callback.answer("Отмечено как выдано")
    # Возвращаем к списку через 1 сек не нужно — админ сам нажмёт «К списку»


async def callback_reject(callback: types.CallbackQuery, bot: Bot):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    wid = int(callback.data.split("_")[1])
    w = await get_withdrawal(wid)
    if not w:
        await callback.answer("Заявка не найдена", show_alert=True)
        return
    if w["status"] != "pending":
        await callback.answer("Уже обработана", show_alert=True)
        return

    await update_withdrawal(wid, "rejected")
    # Звёзды уже списаны при создании заявки — не возвращаем, оставляем 0
    await update_user(w["user_id"], stars=0)

    # Уведомляем пользователя
    try:
        await bot.send_message(
            w["user_id"],
            f"❌ <b>Заявка #{wid} закрыта</b>\n\n"
            f"Вы подозреваетесь в мульти аккаунтах, заявка закрывается.",
            parse_mode="HTML"
        )
    except Exception as e:
        logger.error(f"Не удалось уведомить пользователя {w['user_id']}: {e}")

    await callback.message.edit_text(
        callback.message.text + "\n\n❌ <b>ОТКАЗАНО</b>",
        parse_mode="HTML"
    )
    await callback.answer("Заявка отклонена")


# ==================== АДМИН-ПАНЕЛЬ ====================
ADMIN_PAGE_SIZE = 5


async def get_admin_panel_keyboard(page: int, total: int, items: list) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    # Кнопки заявок
    for w in items:
        username = w.get("username") or "нет"
        builder.row(
            InlineKeyboardButton(
                text=f"#{w['id']} | @{username} | {w['stars']}⭐",
                callback_data=f"admin_view_{w['id']}"
            )
        )
    # Навигация
    nav = []
    if page > 0:
        nav.append(InlineKeyboardButton(text="⬅️ Назад", callback_data=f"admin_page_{page - 1}"))
    if (page + 1) * ADMIN_PAGE_SIZE < total:
        nav.append(InlineKeyboardButton(text="Вперёд ➡️", callback_data=f"admin_page_{page + 1}"))
    if nav:
        builder.row(*nav)
    builder.row(InlineKeyboardButton(text="🔄 Обновить", callback_data=f"admin_page_{page}"))
    # Мини-игра
    game = await get_active_minigame()
    if game:
        builder.row(InlineKeyboardButton(text="🎮 Управление мини-игрой", callback_data="admin_mg_manage"))
    else:
        builder.row(InlineKeyboardButton(text="🎮 Создать мини-игру", callback_data="admin_mg_create"))
    # Баны
    builder.row(
        InlineKeyboardButton(text="🚫 Забанить", callback_data="admin_ban"),
        InlineKeyboardButton(text="✅ Разбанить", callback_data="admin_unban")
    )
    builder.row(InlineKeyboardButton(text="📋 Список банов", callback_data="admin_banlist"))
    return builder.as_markup()


def get_admin_view_keyboard(wid: int) -> InlineKeyboardMarkup:
    builder = InlineKeyboardBuilder()
    builder.row(
        InlineKeyboardButton(text="✅ Принять", callback_data=f"issue_{wid}"),
        InlineKeyboardButton(text="❌ Отказать", callback_data=f"reject_{wid}")
    )
    builder.row(InlineKeyboardButton(text="◀️ К списку", callback_data="admin_page_0"))
    return builder.as_markup()


async def show_admin_panel(message_or_callback, page: int = 0, edit: bool = False):
    total = await get_pending_count()
    items = await get_pending_withdrawals(offset=page * ADMIN_PAGE_SIZE, limit=ADMIN_PAGE_SIZE)

    game = await get_active_minigame()
    mg_status = "🟢 Активна" if game else "🔴 Нет активной"

    if total == 0:
        text = (
            f"📋 <b>Админ-панель</b>\n\n"
            f"Нет ожидающих заявок.\n"
            f"Мини-игра: {mg_status}"
        )
        kb = await get_admin_panel_keyboard(page, total, items)
    else:
        pages = (total + ADMIN_PAGE_SIZE - 1) // ADMIN_PAGE_SIZE
        text = (
            f"📋 <b>Админ-панель</b>\n"
            f"Ожидающих заявок: <b>{total}</b>\n"
            f"Страница {page + 1} из {pages}\n"
            f"Мини-игра: {mg_status}\n\n"
            f"Нажми на заявку, чтобы открыть:"
        )
        kb = await get_admin_panel_keyboard(page, total, items)

    if edit and hasattr(message_or_callback, "message"):
        await message_or_callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
        await message_or_callback.answer()
    else:
        await message_or_callback.answer(text, reply_markup=kb, parse_mode="HTML")


async def cmd_admin(message: types.Message):
    if message.from_user.id not in ADMIN_IDS:
        return
    await show_admin_panel(message, page=0)


async def callback_admin_page(callback: types.CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    page = int(callback.data.split("_")[2])
    await show_admin_panel(callback, page=page, edit=True)


async def callback_admin_view(callback: types.CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    wid = int(callback.data.split("_")[2])
    w = await get_withdrawal(wid)
    if not w:
        await callback.answer("Заявка не найдена", show_alert=True)
        return

    user = await get_user(w["user_id"])
    username = (user.get("username") if user else None) or "нет"
    full_name = (user.get("full_name") if user else None) or ""
    refs = (user.get("referrals_count") if user else 0) or 0
    status_text = {"pending": "⏳ Ожидает", "issued": "✅ Выдано", "rejected": "❌ Отказано"}.get(w["status"], w["status"])

    text = (
        f"<b>Заявка #{w['id']}</b>\n\n"
        f"Статус: {status_text}\n"
        f"Юзернейм: @{username}\n"
        f"Имя: {full_name}\n"
        f"ID: <code>{w['user_id']}</code>\n"
        f"Количество звёзд: <b>{w['stars']}⭐</b>\n"
        f"Пригласил людей: <b>{refs}</b>\n"
        f"Создана: {w.get('created_at', '—')[:19] if w.get('created_at') else '—'}"
    )

    if w["status"] == "pending":
        kb = get_admin_view_keyboard(wid)
    else:
        kb = InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="◀️ К списку", callback_data="admin_page_0")]
        ])

    await callback.message.edit_text(text, reply_markup=kb, parse_mode="HTML")
    await callback.answer()


# ==================== МИНИ-ИГРА ====================
def format_leaderboard(leaderboard: list, prize: int = 0) -> str:
    if not leaderboard:
        return "Пока никто не закинул звёзды."
    lines = []
    medals = ["🥇", "🥈", "🥉"]
    for i, row in enumerate(leaderboard):
        medal = medals[i] if i < 3 else f"{i + 1}."
        uname = f"@{row['username']}" if row.get("username") else row.get("full_name") or str(row["user_id"])
        lines.append(f"{medal} {uname} — <b>{row['total']}⭐</b>")
    text = "🏆 <b>Лидерборд</b>\n\n" + "\n".join(lines)
    if prize > 0:
        text += f"\n\n🎁 Приз топ-1: <b>{prize}⭐</b>"
    return text


async def cmd_minigame(message: types.Message):
    if await check_ban_and_reply(message):
        return
    user = await get_user(message.from_user.id)
    if not user or not user.get("is_subscribed"):
        await message.answer("Сначала пройди проверку подписок — /start")
        return

    game = await get_active_minigame()
    if not game:
        await message.answer("Сейчас нет активной мини-игры.")
        return

    leaderboard = await get_minigame_leaderboard(game["id"])
    my_total = await get_user_bet_total(game["id"], message.from_user.id)
    text = format_leaderboard(leaderboard, game.get("prize_stars", 0))
    text += f"\n\nТы закинул: <b>{my_total}⭐</b>"

    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="⭐ Закинуть звёзды", callback_data="mg_bet"))
    if message.from_user.id in ADMIN_IDS:
        builder.row(InlineKeyboardButton(text="⚙️ Управление мини-игрой", callback_data="admin_mg_manage"))
    builder.row(InlineKeyboardButton(text="🔄 Обновить", callback_data="mg_refresh"))

    await message.answer(text, reply_markup=builder.as_markup(), parse_mode="HTML")


async def callback_mg_refresh(callback: types.CallbackQuery):
    game = await get_active_minigame()
    if not game:
        await callback.message.edit_text("Мини-игра завершена.")
        await callback.answer()
        return

    leaderboard = await get_minigame_leaderboard(game["id"])
    my_total = await get_user_bet_total(game["id"], callback.from_user.id)
    text = format_leaderboard(leaderboard, game.get("prize_stars", 0))
    text += f"\n\nТы закинул: <b>{my_total}⭐</b>"

    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="⭐ Закинуть звёзды", callback_data="mg_bet"))
    if callback.from_user.id in ADMIN_IDS:
        builder.row(InlineKeyboardButton(text="⚙️ Управление мини-игрой", callback_data="admin_mg_manage"))
    builder.row(InlineKeyboardButton(text="🔄 Обновить", callback_data="mg_refresh"))

    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")
    await callback.answer()


async def callback_mg_bet(callback: types.CallbackQuery, state: FSMContext):
    game = await get_active_minigame()
    if not game:
        await callback.answer("Мини-игра не активна", show_alert=True)
        return

    user = await get_user(callback.from_user.id)
    stars = user.get("stars", 0) if user else 0
    if stars < 1:
        await callback.answer("У тебя нет звёзд для ставки", show_alert=True)
        return

    await callback.message.answer(
        f"⭐ <b>Закинуть звёзды</b>\n\n"
        f"У тебя на балансе: <b>{stars}⭐</b>\n"
        f"Напиши сумму, которую хочешь закинуть (только число):",
        parse_mode="HTML"
    )
    await state.set_state(MiniGameStates.waiting_bet)
    await callback.answer()


async def process_mg_bet(message: types.Message, state: FSMContext):
    text = message.text.strip()
    if not text.isdigit():
        await message.answer("❌ Введи только число")
        return

    amount = int(text)
    if amount < 1:
        await message.answer("❌ Минимум 1⭐")
        return

    game = await get_active_minigame()
    if not game:
        await state.clear()
        await message.answer("Мини-игра уже завершена.")
        return

    user = await get_user(message.from_user.id)
    stars = user.get("stars", 0) if user else 0
    if amount > stars:
        await message.answer(f"❌ Недостаточно звёзд. У тебя: {stars}⭐")
        return

    # Списываем и добавляем ставку
    await update_user(message.from_user.id, stars=stars - amount)
    await add_minigame_bet(game["id"], message.from_user.id, amount)
    await state.clear()

    my_total = await get_user_bet_total(game["id"], message.from_user.id)
    await message.answer(
        f"✅ Ты закинул <b>{amount}⭐</b>!\n"
        f"Всего в мини-игре у тебя: <b>{my_total}⭐</b>\n\n"
        f"Нажми «🎮 Мини-игра» чтобы увидеть лидерборд.",
        parse_mode="HTML",
        reply_markup=await get_main_keyboard()
    )


# --- Админ: создать ---
async def callback_admin_mg_create(callback: types.CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    existing = await get_active_minigame()
    if existing:
        await callback.answer("Уже есть активная мини-игра", show_alert=True)
        return

    game_id = await create_minigame()
    await callback.answer("Мини-игра создана!", show_alert=True)
    await show_admin_panel(callback, page=0, edit=True)


# --- Админ: управление ---
async def callback_admin_mg_manage(callback: types.CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    game = await get_active_minigame()
    if not game:
        await callback.answer("Нет активной мини-игры", show_alert=True)
        return

    leaderboard = await get_minigame_leaderboard(game["id"])
    text = (
        f"⚙️ <b>Управление мини-игрой #{game['id']}</b>\n\n"
        f"Приз топ-1: <b>{game.get('prize_stars', 0)}⭐</b>\n\n"
        + format_leaderboard(leaderboard, game.get("prize_stars", 0))
    )

    builder = InlineKeyboardBuilder()
    builder.row(InlineKeyboardButton(text="🎁 Установить приз топ-1", callback_data="admin_mg_setprize"))
    builder.row(InlineKeyboardButton(text="➕ Выдать звёзды в топ (по ID)", callback_data="admin_mg_give"))
    builder.row(InlineKeyboardButton(text="🏁 Завершить мини-игру", callback_data="admin_mg_finish"))
    builder.row(InlineKeyboardButton(text="◀️ Назад", callback_data="admin_page_0"))

    await callback.message.edit_text(text, reply_markup=builder.as_markup(), parse_mode="HTML")
    await callback.answer()


async def callback_admin_mg_setprize(callback: types.CallbackQuery, state: FSMContext):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    await callback.message.answer(
        "🎁 Напиши сумму приза для топ-1 (только число, в звёздах бота):"
    )
    await state.set_state(MiniGameStates.waiting_prize)
    await callback.answer()


async def process_mg_prize(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS:
        await state.clear()
        return
    text = message.text.strip()
    if not text.isdigit():
        await message.answer("❌ Введи только число")
        return
    prize = int(text)
    if prize < 0:
        await message.answer("❌ Сумма не может быть отрицательной")
        return

    game = await get_active_minigame()
    if not game:
        await state.clear()
        await message.answer("Нет активной мини-игры.")
        return

    await set_minigame_prize(game["id"], prize)
    await state.clear()
    await message.answer(f"✅ Приз топ-1 установлен: <b>{prize}⭐</b>", parse_mode="HTML")


async def callback_admin_mg_finish(callback: types.CallbackQuery, bot: Bot):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return

    game = await get_active_minigame()
    if not game:
        await callback.answer("Нет активной мини-игры", show_alert=True)
        return

    leaderboard = await get_minigame_leaderboard(game["id"], limit=1)
    prize = game.get("prize_stars", 0)

    await finish_minigame(game["id"])

    if leaderboard and prize > 0:
        winner = leaderboard[0]
        winner_id = winner["user_id"]
        # Начисляем приз
        wuser = await get_user(winner_id)
        current = wuser.get("stars", 0) if wuser else 0
        await update_user(winner_id, stars=current + prize)

        uname = f"@{winner['username']}" if winner.get("username") else str(winner_id)
        try:
            await bot.send_message(
                winner_id,
                f"🏆 <b>Поздравляем!</b>\n\n"
                f"Ты занял 1 место в мини-игре!\n"
                f"Тебе начислено <b>{prize}⭐</b> на баланс.",
                parse_mode="HTML"
            )
        except Exception as e:
            logger.error(f"Не удалось уведомить победителя: {e}")

        await callback.message.edit_text(
            f"🏁 <b>Мини-игра завершена!</b>\n\n"
            f"Победитель: {uname}\n"
            f"Закинул: <b>{winner['total']}⭐</b>\n"
            f"Приз: <b>{prize}⭐</b> начислен.",
            parse_mode="HTML"
        )
    else:
        await callback.message.edit_text(
            "🏁 <b>Мини-игра завершена!</b>\n\n"
            "Победителя нет или приз = 0.",
            parse_mode="HTML"
        )
    await callback.answer("Мини-игра завершена")


# --- Админ: выдать звёзды в топ по ID ---
async def callback_admin_mg_give(callback: types.CallbackQuery, state: FSMContext):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    game = await get_active_minigame()
    if not game:
        await callback.answer("Нет активной мини-игры", show_alert=True)
        return

    await callback.message.answer(
        "➕ <b>Выдать звёзды в топ</b>\n\n"
        "Напиши <b>ID пользователя</b>, которому хочешь выдать звёзды в лидерборд:",
        parse_mode="HTML"
    )
    await state.set_state(MiniGameStates.waiting_give_id)
    await callback.answer()


async def process_mg_give_id(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS:
        await state.clear()
        return
    text = message.text.strip()
    if not text.isdigit():
        await message.answer("❌ Введи числовой ID")
        return
    target_id = int(text)
    await state.update_data(give_target_id=target_id)
    await message.answer(
        f"ID: <code>{target_id}</code>\n\n"
        f"Теперь напиши <b>сколько звёзд</b> добавить ему в топ (только число):",
        parse_mode="HTML"
    )
    await state.set_state(MiniGameStates.waiting_give_amount)


async def process_mg_give_amount(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS:
        await state.clear()
        return
    text = message.text.strip()
    if not text.isdigit():
        await message.answer("❌ Введи только число")
        return
    amount = int(text)
    if amount < 1:
        await message.answer("❌ Минимум 1⭐")
        return

    data = await state.get_data()
    target_id = data.get("give_target_id")
    await state.clear()

    game = await get_active_minigame()
    if not game:
        await message.answer("Мини-игра уже завершена.")
        return

    # Убедимся что пользователь есть в базе
    target = await get_user(target_id)
    if not target:
        await create_user(target_id, "", f"User {target_id}", None)

    await add_minigame_bet(game["id"], target_id, amount)
    total = await get_user_bet_total(game["id"], target_id)

    await message.answer(
        f"✅ Выдано <b>{amount}⭐</b> пользователю <code>{target_id}</code>\n"
        f"Теперь у него в топе: <b>{total}⭐</b>",
        parse_mode="HTML"
    )

    # Уведомляем пользователя
    try:
        await message.bot.send_message(
            target_id,
            f"⭐ Тебе добавили <b>{amount}⭐</b> в мини-игру!\n"
            f"Всего в лидерборде: <b>{total}⭐</b>",
            parse_mode="HTML"
        )
    except Exception:
        pass


# ==================== БАНЫ (АДМИН) ====================
async def callback_admin_ban(callback: types.CallbackQuery, state: FSMContext):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    await callback.message.answer(
        "🚫 <b>Забанить пользователя</b>\n\n"
        "Отправь <b>ID</b> или <b>@username</b>:",
        parse_mode="HTML"
    )
    await state.set_state(BanStates.waiting_target)
    await callback.answer()


async def process_ban_target(message: types.Message, state: FSMContext):
    if message.from_user.id not in ADMIN_IDS:
        await state.clear()
        return
    text = message.text.strip()
    target_id = None
    target_username = ""

    if text.startswith("@") or (not text.isdigit() and text.replace("_", "").isalnum()):
        target_username = text.lstrip("@")
        # Ищем в базе по username
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT user_id, username FROM users WHERE LOWER(username) = ? LIMIT 1",
                (target_username.lower(),)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    target_id = row["user_id"]
                    target_username = row["username"] or target_username
        if not target_id:
            # Баним только по username (ещё не заходил в бота)
            target_id = 0
    elif text.isdigit():
        target_id = int(text)
        user = await get_user(target_id)
        if user:
            target_username = user.get("username") or ""
    else:
        await message.answer("❌ Отправь ID (число) или @username")
        return

    if target_id and target_id in ADMIN_IDS:
        await message.answer("❌ Нельзя забанить админа")
        await state.clear()
        return

    await state.update_data(ban_target_id=target_id, ban_target_username=target_username)
    await message.answer(
        f"Цель: <code>{target_id or '—'}</code> @{target_username or 'нет'}\n\n"
        f"Напиши <b>причину бана</b> (или «-» без причины):",
        parse_mode="HTML"
    )
    await state.set_state(BanStates.waiting_reason)


async def process_ban_reason(message: types.Message, state: FSMContext, bot: Bot):
    if message.from_user.id not in ADMIN_IDS:
        await state.clear()
        return
    reason = message.text.strip()
    if reason == "-":
        reason = ""

    data = await state.get_data()
    target_id = data.get("ban_target_id") or 0
    target_username = data.get("ban_target_username") or ""
    await state.clear()

    await ban_user(target_id, target_username, reason, message.from_user.id)

    await message.answer(
        f"✅ Пользователь заблокирован\n"
        f"ID: <code>{target_id or '—'}</code>\n"
        f"Username: @{target_username or 'нет'}\n"
        f"Причина: {reason or 'не указана'}",
        parse_mode="HTML"
    )

    if target_id:
        try:
            await bot.send_message(
                target_id,
                f"🚫 <b>Ваш аккаунт заблокирован</b>\n\n"
                f"Причина: {reason or 'без указания причины'}\n\n"
                f"По вопросам: {SUPPORT_USERNAME}",
                parse_mode="HTML"
            )
        except Exception:
            pass


async def callback_admin_unban(callback: types.CallbackQuery, state: FSMContext):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    await callback.message.answer(
        "✅ <b>Разбанить пользователя</b>\n\n"
        "Отправь <b>ID</b> или <b>@username</b>:",
        parse_mode="HTML"
    )
    await state.set_state(BanStates.waiting_unban)
    await callback.answer()


async def process_unban(message: types.Message, state: FSMContext, bot: Bot):
    if message.from_user.id not in ADMIN_IDS:
        await state.clear()
        return
    text = message.text.strip()
    target_id = None
    target_username = None

    if text.startswith("@") or (not text.isdigit() and text.replace("_", "").isalnum()):
        target_username = text.lstrip("@")
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT user_id FROM users WHERE LOWER(username) = ? LIMIT 1",
                (target_username.lower(),)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    target_id = row["user_id"]
    elif text.isdigit():
        target_id = int(text)
    else:
        await message.answer("❌ Отправь ID или @username")
        return

    await unban_user(user_id=target_id, username=target_username)
    await state.clear()
    await message.answer(
        f"✅ Разбанен: <code>{target_id or '—'}</code> @{target_username or '—'}",
        parse_mode="HTML"
    )
    if target_id:
        try:
            await bot.send_message(
                target_id,
                "✅ Ваш аккаунт разблокирован. Можете пользоваться ботом — /start",
                parse_mode="HTML"
            )
        except Exception:
            pass


async def callback_admin_banlist(callback: types.CallbackQuery):
    if callback.from_user.id not in ADMIN_IDS:
        await callback.answer("Нет доступа", show_alert=True)
        return
    bans = await get_all_bans()
    if not bans:
        await callback.message.answer("📋 Список банов пуст.")
        await callback.answer()
        return
    lines = []
    for b in bans[:30]:
        lines.append(
            f"• ID <code>{b.get('user_id') or '—'}</code> "
            f"@{b.get('username') or 'нет'} — {b.get('reason') or 'без причины'}"
        )
    text = "📋 <b>Список банов</b> (" + str(len(bans)) + "):\n\n" + "\n".join(lines)
    if len(bans) > 30:
        text += f"\n\n… и ещё {len(bans) - 30}"
    await callback.message.answer(text, parse_mode="HTML")
    await callback.answer()


async def _resolve_target(text: str) -> tuple:
    """Возвращает (user_id, username) из ID или @username."""
    text = text.strip().lstrip("@")
    target_id = 0
    target_username = ""
    if text.isdigit():
        target_id = int(text)
        user = await get_user(target_id)
        if user:
            target_username = user.get("username") or ""
    else:
        target_username = text
        async with aiosqlite.connect(DB_PATH) as db:
            db.row_factory = aiosqlite.Row
            async with db.execute(
                "SELECT user_id, username FROM users WHERE LOWER(username) = ? LIMIT 1",
                (text.lower(),)
            ) as cursor:
                row = await cursor.fetchone()
                if row:
                    target_id = row["user_id"]
                    target_username = row["username"] or text
    return target_id, target_username


async def cmd_ban(message: types.Message, state: FSMContext, bot: Bot):
    if message.from_user.id not in ADMIN_IDS:
        return
    # /ban @user причина   или   /ban 123456 причина
    parts = message.text.split(maxsplit=2)
    if len(parts) >= 2:
        target_raw = parts[1]
        reason = parts[2] if len(parts) >= 3 else ""
        target_id, target_username = await _resolve_target(target_raw)
        if target_id and target_id in ADMIN_IDS:
            await message.answer("❌ Нельзя забанить админа")
            return
        await ban_user(target_id, target_username, reason, message.from_user.id)
        await message.answer(
            f"✅ Заблокирован\n"
            f"ID: <code>{target_id or '—'}</code>\n"
            f"Username: @{target_username or 'нет'}\n"
            f"Причина: {reason or 'не указана'}",
            parse_mode="HTML"
        )
        if target_id:
            try:
                await bot.send_message(
                    target_id,
                    f"🚫 <b>Ваш аккаунт заблокирован</b>\n\n"
                    f"Причина: {reason or 'без указания причины'}\n\n"
                    f"По вопросам: {SUPPORT_USERNAME}",
                    parse_mode="HTML"
                )
            except Exception:
                pass
        await state.clear()
        return

    await message.answer(
        "🚫 Отправь <b>ID</b> или <b>@username</b> для бана:\n"
        "Или сразу: <code>/ban @user причина</code>",
        parse_mode="HTML"
    )
    await state.set_state(BanStates.waiting_target)


async def cmd_unban(message: types.Message, state: FSMContext, bot: Bot):
    if message.from_user.id not in ADMIN_IDS:
        return
    parts = message.text.split(maxsplit=1)
    if len(parts) >= 2:
        target_id, target_username = await _resolve_target(parts[1])
        await unban_user(user_id=target_id or None, username=target_username or None)
        await message.answer(
            f"✅ Разбанен: <code>{target_id or '—'}</code> @{target_username or '—'}",
            parse_mode="HTML"
        )
        if target_id:
            try:
                await bot.send_message(
                    target_id,
                    "✅ Ваш аккаунт разблокирован. Можете пользоваться ботом — /start",
                    parse_mode="HTML"
                )
            except Exception:
                pass
        await state.clear()
        return

    await message.answer(
        "✅ Отправь <b>ID</b> или <b>@username</b> для разбана:\n"
        "Или сразу: <code>/unban @user</code>",
        parse_mode="HTML"
    )
    await state.set_state(BanStates.waiting_unban)


# ==================== MAIN ====================
async def main():
    await init_db()

    bot = Bot(token=BOT_TOKEN)
    storage = MemoryStorage()
    dp = Dispatcher(storage=storage)

    # Роутеры
    dp.message.register(cmd_start, CommandStart())
    dp.callback_query.register(callback_check_subs, F.data == "check_subs")
    dp.message.register(cmd_update, F.text == "🔄 Обновить")
    dp.message.register(cmd_help, F.text == "❓ Помощь")
    dp.message.register(cmd_share, F.text == "🔗 Поделиться ссылкой")
    dp.message.register(cmd_withdraw, F.text == "⭐ Вывести звёзды")
    dp.message.register(cmd_donate, F.text == "💫 Пожертвовать звёзды")
    dp.message.register(process_donate_amount, DonateStates.waiting_amount)
    dp.pre_checkout_query.register(pre_checkout_handler)
    dp.message.register(successful_payment_handler, F.successful_payment)
    dp.callback_query.register(callback_issue, F.data.startswith("issue_"))
    dp.callback_query.register(callback_reject, F.data.startswith("reject_"))
    dp.message.register(cmd_admin, Command("admin"))
    dp.message.register(cmd_admin, Command("pending"))
    dp.callback_query.register(callback_admin_page, F.data.startswith("admin_page_"))
    dp.callback_query.register(callback_admin_view, F.data.startswith("admin_view_"))

    # Мини-игра
    dp.message.register(cmd_minigame, F.text == "🎮 Мини-игра")
    dp.callback_query.register(callback_mg_refresh, F.data == "mg_refresh")
    dp.callback_query.register(callback_mg_bet, F.data == "mg_bet")
    dp.message.register(process_mg_bet, MiniGameStates.waiting_bet)
    dp.callback_query.register(callback_admin_mg_create, F.data == "admin_mg_create")
    dp.callback_query.register(callback_admin_mg_manage, F.data == "admin_mg_manage")
    dp.callback_query.register(callback_admin_mg_setprize, F.data == "admin_mg_setprize")
    dp.message.register(process_mg_prize, MiniGameStates.waiting_prize)
    dp.callback_query.register(callback_admin_mg_finish, F.data == "admin_mg_finish")
    dp.callback_query.register(callback_admin_mg_give, F.data == "admin_mg_give")
    dp.message.register(process_mg_give_id, MiniGameStates.waiting_give_id)
    dp.message.register(process_mg_give_amount, MiniGameStates.waiting_give_amount)

    # Баны
    dp.callback_query.register(callback_admin_ban, F.data == "admin_ban")
    dp.callback_query.register(callback_admin_unban, F.data == "admin_unban")
    dp.callback_query.register(callback_admin_banlist, F.data == "admin_banlist")
    dp.message.register(process_ban_target, BanStates.waiting_target)
    dp.message.register(process_ban_reason, BanStates.waiting_reason)
    dp.message.register(process_unban, BanStates.waiting_unban)
    dp.message.register(cmd_ban, Command("ban"))
    dp.message.register(cmd_unban, Command("unban"))

    # Команда для получения chat_id (полезно для приватного канала)
    @dp.message(Command("get_chat_id"))
    async def get_chat_id_handler(message: types.Message):
        if message.chat.type in ("group", "supergroup", "channel"):
            await message.answer(f"Chat ID: <code>{message.chat.id}</code>", parse_mode="HTML")
        else:
            await message.answer(f"Твой user_id: <code>{message.from_user.id}</code>", parse_mode="HTML")

    try:
        await bot.delete_webhook(drop_pending_updates=False)
    except Exception as e:
        logger.warning(f"delete_webhook: {e}")

    logger.info("Бот запущен...")
    await dp.start_polling(bot)


if __name__ == "__main__":
    asyncio.run(main())
