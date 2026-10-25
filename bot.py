import asyncio
import logging
import math
import time
import sqlite3
from pathlib import Path
from aiogram import Bot, Dispatcher, F, Router
from aiogram.filters import CommandStart
from aiogram.types import (
    Message, CallbackQuery, PreCheckoutQuery, LabeledPrice,
    FSInputFile, InlineKeyboardMarkup, InlineKeyboardButton
)
from aiogram.fsm.context import FSMContext
from aiogram.fsm.storage.memory import MemoryStorage
from aiogram.fsm.state import State, StatesGroup
from aiogram.enums import ChatMemberStatus
from aiogram.utils.keyboard import InlineKeyboardBuilder
from aiogram.exceptions import TelegramBadRequest

# ==================== НАСТРОЙКИ ====================
BOT_TOKEN = "8768054266:AAE2TvyzOXyZ7pkgoH_X6rgyshdtxhq-Zuo"
CHANNEL_USERNAME = "nexvenstudio"
CHANNEL_LINK = "https://t.me/nexvenstudio"
MANAGER_USERNAME = "nexvenstudiomanager"
RUB_PER_STAR = 1.5
ADMINS_FILE = Path(__file__).parent / "admin.txt"
LOGO_PATH = Path(__file__).parent / "logo.png"
DB_PATH = Path(__file__).parent / "bot_database.db"

PRODUCTS = {
    "bot": ("Заказать бота", 105),
    "site": ("Заказать сайт", 210),
    "prompt": ("Купить обучение по промпту для ИИ", 25),
}
TOPUP_AMOUNTS = [25, 50, 100, 200, 500, 1000]

# Курсы (1 RUB = X местной валюты) — приблизительные на 2026
CURRENCY_RATES = {
    "UAH": 0.54,   # гривна
    "KZT": 5.5,    # тенге
    "BYN": 0.036,  # бел. рубль
}
CURRENCY_NAMES = {
    "RUB": "₽",
    "UAH": "₴",
    "KZT": "₸",
    "BYN": "Br",
}

def detect_currency(language_code: str | None) -> str:
    if not language_code:
        return "RUB"
    lang = language_code.lower()[:2]
    if lang == "uk":
        return "UAH"
    if lang == "kk":
        return "KZT"
    if lang == "be":
        return "BYN"
    return "RUB"

def format_price(rub: float, currency: str = "RUB") -> str:
    """Показывает цену только в валюте пользователя (по языку)."""
    if currency == "RUB" or currency not in CURRENCY_RATES:
        return f"{rub:.0f} ₽"
    local = rub * CURRENCY_RATES[currency]
    symbol = CURRENCY_NAMES.get(currency, currency)
    if currency == "BYN":
        return f"{local:.2f} {symbol}"
    return f"{local:.0f} {symbol}"

def rub_from_local(local_amount: float, currency: str) -> float:
    """Обратная конвертация из локальной валюты в рубли (если понадобится)."""
    if currency == "RUB" or currency not in CURRENCY_RATES:
        return local_amount
    rate = CURRENCY_RATES[currency]
    if rate <= 0:
        return local_amount
    return local_amount / rate

# ==================== БАЗА ====================
def init_db():
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""CREATE TABLE IF NOT EXISTS users (
        user_id INTEGER PRIMARY KEY, username TEXT, full_name TEXT,
        balance REAL DEFAULT 0, language_code TEXT, created_at REAL)""")
    try:
        c.execute("ALTER TABLE users ADD COLUMN language_code TEXT")
    except Exception:
        pass
    c.execute("""CREATE TABLE IF NOT EXISTS orders (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
        product_id TEXT, product_name TEXT, price REAL, description TEXT,
        status TEXT DEFAULT 'pending', admin_id INTEGER,
        created_at REAL, accepted_at REAL, completed_at REAL)""")
    c.execute("""CREATE TABLE IF NOT EXISTS payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT, user_id INTEGER,
        amount_rub REAL, stars INTEGER, charge_id TEXT, created_at REAL)""")
    conn.commit()
    conn.close()

def load_admins():
    admins = set()
    if ADMINS_FILE.exists():
        for line in ADMINS_FILE.read_text(encoding="utf-8").splitlines():
            line = line.strip()
            if line and not line.startswith("#") and line.isdigit():
                admins.add(int(line))
    return admins

def ensure_user(user_id, username=None, full_name=None, language_code=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO users (user_id, username, full_name, balance, language_code, created_at)
                 VALUES (?, ?, ?, 0, ?, ?) ON CONFLICT(user_id) DO UPDATE SET
                 username=COALESCE(excluded.username, users.username),
                 full_name=COALESCE(excluded.full_name, users.full_name),
                 language_code=COALESCE(excluded.language_code, users.language_code)""",
              (user_id, username, full_name, language_code, time.time()))
    conn.commit()
    conn.close()

def get_user_currency(user_id, fallback_lang=None):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT language_code FROM users WHERE user_id=?", (user_id,))
    row = c.fetchone()
    conn.close()
    lang = (row[0] if row and row[0] else None) or fallback_lang
    return detect_currency(lang)

def get_balance(user_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT balance FROM users WHERE user_id=?", (user_id,))
    row = c.fetchone()
    conn.close()
    return row[0] if row else 0.0

def add_balance(user_id, amount):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("UPDATE users SET balance = balance + ? WHERE user_id=?", (amount, user_id))
    conn.commit()
    conn.close()

def deduct_balance(user_id, amount):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT balance FROM users WHERE user_id=?", (user_id,))
    row = c.fetchone()
    if not row or row[0] < amount:
        conn.close()
        return False
    c.execute("UPDATE users SET balance = balance - ? WHERE user_id=?", (amount, user_id))
    conn.commit()
    conn.close()
    return True

def create_order(user_id, product_id, product_name, price, description):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("""INSERT INTO orders (user_id, product_id, product_name, price, description, status, created_at)
                 VALUES (?, ?, ?, ?, ?, 'pending', ?)""",
              (user_id, product_id, product_name, price, description, time.time()))
    oid = c.lastrowid
    conn.commit()
    conn.close()
    return oid

def get_order(order_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE id=?", (order_id,))
    row = c.fetchone()
    conn.close()
    return dict(row) if row else None

def get_pending_orders():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE status='pending' ORDER BY created_at ASC")
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def get_admin_accepted_orders(admin_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE status='accepted' AND admin_id=? ORDER BY accepted_at DESC", (admin_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def accept_order(order_id, admin_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT status, admin_id FROM orders WHERE id=?", (order_id,))
    row = c.fetchone()
    if not row:
        conn.close()
        return False, "Заказ не найден"
    if row[0] != "pending":
        conn.close()
        return False, "Заказ уже принят" if row[0] == "accepted" else f"Статус: {row[0]}"
    c.execute("UPDATE orders SET status='accepted', admin_id=?, accepted_at=? WHERE id=?",
              (admin_id, time.time(), order_id))
    conn.commit()
    conn.close()
    return True, "Заказ успешно принят"

def complete_order(order_id, admin_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("SELECT status, admin_id FROM orders WHERE id=?", (order_id,))
    row = c.fetchone()
    if not row or row[0] != "accepted" or row[1] != admin_id:
        conn.close()
        return False
    c.execute("UPDATE orders SET status='completed', completed_at=? WHERE id=?", (time.time(), order_id))
    conn.commit()
    conn.close()
    return True

def get_user_orders(user_id):
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute("SELECT * FROM orders WHERE user_id=? ORDER BY created_at DESC LIMIT 20", (user_id,))
    rows = [dict(r) for r in c.fetchall()]
    conn.close()
    return rows

def log_payment(user_id, amount_rub, stars, charge_id):
    conn = sqlite3.connect(DB_PATH)
    c = conn.cursor()
    c.execute("INSERT INTO payments (user_id, amount_rub, stars, charge_id, created_at) VALUES (?,?,?,?,?)",
              (user_id, amount_rub, stars, charge_id, time.time()))
    conn.commit()
    conn.close()

# ==================== FSM ====================
class OrderStates(StatesGroup):
    waiting_description = State()
    confirming_order = State()

class AdminStates(StatesGroup):
    waiting_product_files = State()
    confirming_complete = State()
    give_balance_user = State()
    give_balance_amount = State()

# ==================== КЛАВИАТУРЫ ====================
def check_sub_kb():
    b = InlineKeyboardBuilder()
    b.button(text="📢 Подписаться на канал", url=CHANNEL_LINK)
    b.button(text="✅ Проверить подписку", callback_data="check_sub")
    b.adjust(1)
    return b.as_markup()

def main_menu_kb(is_admin=False):
    b = InlineKeyboardBuilder()
    b.button(text="🛒 Каталог товаров", callback_data="catalog")
    b.button(text="💰 Мой баланс", callback_data="balance")
    b.button(text="➕ Пополнить баланс", callback_data="topup")
    b.button(text="📦 Мои заказы", callback_data="my_orders")
    if is_admin:
        b.button(text="🛠 Админ-панель", callback_data="admin_panel")
    b.adjust(1)
    return b.as_markup()

def catalog_kb(currency: str = "RUB"):
    b = InlineKeyboardBuilder()
    for pid, (name, price) in PRODUCTS.items():
        b.button(text=f"{name} — {format_price(price, currency)}", callback_data=f"product:{pid}")
    b.button(text="◀️ Назад", callback_data="main_menu")
    b.adjust(1)
    return b.as_markup()

def topup_kb(currency: str = "RUB"):
    b = InlineKeyboardBuilder()
    for a in TOPUP_AMOUNTS:
        b.button(text=format_price(a, currency), callback_data=f"topup_amount:{a}")
    b.button(text="◀️ Назад", callback_data="main_menu")
    b.adjust(2)
    return b.as_markup()

def pay_kb(amount_rub, stars):
    b = InlineKeyboardBuilder()
    b.button(text=f"⭐ Оплатить звёздами ({stars} ⭐)", callback_data=f"pay_stars:{amount_rub}:{stars}")
    b.button(text="◀️ Назад", callback_data="topup")
    b.adjust(1)
    return b.as_markup()

def confirm_order_kb():
    b = InlineKeyboardBuilder()
    b.button(text="✅ Подтвердить и оплатить", callback_data="confirm_order")
    b.button(text="❌ Отмена", callback_data="cancel_order")
    b.adjust(1)
    return b.as_markup()

def admin_panel_kb():
    b = InlineKeyboardBuilder()
    b.button(text="📋 Новые заказы", callback_data="admin_pending")
    b.button(text="✅ Мои принятые заказы", callback_data="admin_my_orders")
    b.button(text="💰 Выдать баланс", callback_data="admin_give_balance")
    b.button(text="◀️ В главное меню", callback_data="main_menu")
    b.adjust(1)
    return b.as_markup()

def pending_kb(orders):
    b = InlineKeyboardBuilder()
    for o in orders:
        b.button(text=f"#{o['id']} | {o['product_name'][:18]} | {o['price']}", callback_data=f"admin_view:{o['id']}")
    b.button(text="🔄 Обновить", callback_data="admin_pending")
    b.button(text="◀️ Назад", callback_data="admin_panel")
    b.adjust(1)
    return b.as_markup()

def order_actions_kb(oid):
    b = InlineKeyboardBuilder()
    b.button(text="✅ Принять заказ", callback_data=f"admin_accept:{oid}")
    b.button(text="◀️ Назад", callback_data="admin_pending")
    b.adjust(1)
    return b.as_markup()

def my_accepted_kb(orders):
    b = InlineKeyboardBuilder()
    for o in orders:
        b.button(text=f"#{o['id']} | {o['product_name'][:20]}", callback_data=f"admin_complete:{o['id']}")
    b.button(text="🔄 Обновить", callback_data="admin_my_orders")
    b.button(text="◀️ Назад", callback_data="admin_panel")
    b.adjust(1)
    return b.as_markup()

def finish_files_kb():
    b = InlineKeyboardBuilder()
    b.button(text="✅ Готово, завершить", callback_data="admin_finish_files")
    b.button(text="❌ Отмена", callback_data="admin_panel")
    b.adjust(1)
    return b.as_markup()

def confirm_complete_kb(oid):
    b = InlineKeyboardBuilder()
    b.button(text="✅ Да, отправить покупателю", callback_data=f"admin_send:{oid}")
    b.button(text="❌ Нет", callback_data="admin_panel")
    b.adjust(1)
    return b.as_markup()

def back_kb():
    b = InlineKeyboardBuilder()
    b.button(text="◀️ В главное меню", callback_data="main_menu")
    return b.as_markup()

# ==================== БОТ ====================
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)
bot = Bot(token=BOT_TOKEN)
dp = Dispatcher(storage=MemoryStorage())
router = Router()
dp.include_router(router)
admin_files_cache = {}

def is_admin(uid):
    return uid in load_admins()

async def check_sub(uid):
    """Проверка подписки. Если бот не админ канала — пропускаем (True)."""
    try:
        m = await bot.get_chat_member(f"@{CHANNEL_USERNAME}", uid)
        return m.status in (
            ChatMemberStatus.MEMBER,
            ChatMemberStatus.ADMINISTRATOR,
            ChatMemberStatus.CREATOR,
            ChatMemberStatus.RESTRICTED
        )
    except Exception as e:
        logger.warning(f"Sub check failed (bot must be admin in channel): {e}")
        # Если не можем проверить — пропускаем, чтобы бот работал
        return True

async def safe_edit(callback: CallbackQuery, text: str, reply_markup=None, parse_mode="HTML"):
    """Безопасно редактирует сообщение (текст или фото с caption)."""
    try:
        # Пробуем edit_text
        await callback.message.edit_text(text, reply_markup=reply_markup, parse_mode=parse_mode)
    except TelegramBadRequest:
        try:
            # Если это фото — edit_caption
            await callback.message.edit_caption(caption=text, reply_markup=reply_markup, parse_mode=parse_mode)
        except TelegramBadRequest:
            # Если ничего не вышло — удаляем и шлём новое
            try:
                await callback.message.delete()
            except Exception:
                pass
            await bot.send_message(callback.message.chat.id, text, reply_markup=reply_markup, parse_mode=parse_mode)

async def send_main_menu(chat_id, user_id, text=None):
    if text is None:
        text = "🏠 <b>Главное меню</b>\nВыберите действие:"
    kb = main_menu_kb(is_admin(user_id))
    if LOGO_PATH.exists():
        try:
            await bot.send_photo(chat_id, FSInputFile(LOGO_PATH), caption=text, parse_mode="HTML", reply_markup=kb)
            return
        except Exception:
            pass
    await bot.send_message(chat_id, text, parse_mode="HTML", reply_markup=kb)

async def send_admin_panel(chat_id, text=None):
    if text is None:
        text = "🛠 <b>Админ-панель</b>\n\nВыберите раздел:"
    kb = admin_panel_kb()
    if LOGO_PATH.exists():
        try:
            await bot.send_photo(chat_id, FSInputFile(LOGO_PATH), caption=text, parse_mode="HTML", reply_markup=kb)
            return
        except Exception:
            pass
    await bot.send_message(chat_id, text, parse_mode="HTML", reply_markup=kb)

# ---------- START ----------
@router.message(CommandStart())
async def cmd_start(message: Message, state: FSMContext):
    await state.clear()
    u = message.from_user
    ensure_user(u.id, u.username, u.full_name, u.language_code)
    if await check_sub(u.id):
        await send_main_menu(message.chat.id, u.id,
            f"👋 Привет, {u.first_name}!\n\nДобро пожаловать в <b>NexVen Studio</b>!\nВыберите действие:")
    else:
        await message.answer(
            f"👋 Привет, {u.first_name}!\n\n"
            f"Подпишись на канал студии:\n{CHANNEL_LINK}\n\n"
            f"После подписки нажми «Проверить подписку».",
            reply_markup=check_sub_kb())

@router.callback_query(F.data == "check_sub")
async def cb_check_sub(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    u = callback.from_user
    if await check_sub(u.id):
        try:
            await callback.message.delete()
        except Exception:
            pass
        await send_main_menu(callback.message.chat.id, u.id,
            f"✅ Отлично! Вы подписаны.\n\nДобро пожаловать в <b>NexVen Studio</b>!")
    else:
        await callback.answer("❌ Вы ещё не подписаны.", show_alert=True)
    await callback.answer()

@router.callback_query(F.data == "main_menu")
async def cb_main_menu(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    try:
        await callback.message.delete()
    except Exception:
        pass
    await send_main_menu(callback.message.chat.id, callback.from_user.id)
    await callback.answer()

# ---------- CATALOG ----------
@router.callback_query(F.data == "catalog")
async def cb_catalog(callback: CallbackQuery):
    cur = detect_currency(callback.from_user.language_code)
    text = "🛒 <b>Каталог товаров</b>\n\n"
    for _, (name, price) in PRODUCTS.items():
        text += f"• {name} — <b>{format_price(price, cur)}</b>\n"
    text += "\nВыберите товар:"
    await safe_edit(callback, text, catalog_kb(cur))
    await callback.answer()

@router.callback_query(F.data.startswith("product:"))
async def cb_product(callback: CallbackQuery, state: FSMContext):
    pid = callback.data.split(":")[1]
    if pid not in PRODUCTS:
        await callback.answer("Товар не найден", show_alert=True)
        return
    name, price = PRODUCTS[pid]
    balance = get_balance(callback.from_user.id)
    cur = detect_currency(callback.from_user.language_code)
    if balance < price:
        await safe_edit(callback,
            f"❌ Недостаточно средств.\n\nТовар: <b>{name}</b>\nЦена: <b>{format_price(price, cur)}</b>\n"
            f"Баланс: <b>{format_price(balance, cur)}</b>\n\nПополните баланс.",
            InlineKeyboardMarkup(inline_keyboard=[
                [InlineKeyboardButton(text="➕ Пополнить", callback_data="topup")],
                [InlineKeyboardButton(text="◀️ Назад", callback_data="catalog")]]))
        await callback.answer()
        return
    await state.update_data(product_id=pid, product_name=name, price=price)
    await state.set_state(OrderStates.waiting_description)
    await safe_edit(callback,
        f"📦 <b>{name}</b>\n💰 {format_price(price, cur)}\nБаланс: {format_price(balance, cur)}\n\n"
        f"✍️ Напишите, что именно вы хотите (описание заказа):",
        InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отмена", callback_data="catalog")]]))
    await callback.answer()

@router.message(OrderStates.waiting_description)
async def process_desc(message: Message, state: FSMContext):
    if not message.text or len(message.text) < 5:
        await message.answer("Напишите подробнее (минимум 5 символов).")
        return
    data = await state.get_data()
    await state.update_data(description=message.text)
    await state.set_state(OrderStates.confirming_order)
    await message.answer(
        f"📋 <b>Проверьте заказ:</b>\n\nТовар: <b>{data['product_name']}</b>\n"
        f"Цена: <b>{format_price(data['price'], detect_currency(message.from_user.language_code))}</b>\nОписание:\n{message.text}\n\n"
        f"Списать {format_price(data['price'], detect_currency(message.from_user.language_code))} с баланса?",
        parse_mode="HTML", reply_markup=confirm_order_kb())

@router.callback_query(F.data == "confirm_order", OrderStates.confirming_order)
async def cb_confirm(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    uid = callback.from_user.id
    price = data["price"]
    if not deduct_balance(uid, price):
        await safe_edit(callback, "❌ Недостаточно средств.", back_kb())
        await state.clear()
        await callback.answer()
        return
    oid = create_order(uid, data["product_id"], data["product_name"], price, data["description"])
    await state.clear()
    await safe_edit(callback,
        f"✅ <b>Оплата прошла успешно!</b>\n\nЗаказ #{oid} создан.\n"
        f"Товар: {data['product_name']}\nСписано: {format_price(price, detect_currency(callback.from_user.language_code))}\n\nОжидайте выполнения.",
        back_kb())
    user = callback.from_user
    uname = f"@{user.username}" if user.username else "нет"
    txt = (f"🆕 <b>Новый заказ #{oid}</b>\n\n👤 {user.full_name} ({uname})\n"
           f"🆔 <code>{user.id}</code>\n📦 {data['product_name']}\n💰 {format_price(price, detect_currency(callback.from_user.language_code))}\n"
           f"📝 {data['description']}")
    for aid in load_admins():
        try:
            await bot.send_message(aid, txt, parse_mode="HTML", reply_markup=order_actions_kb(oid))
        except Exception as e:
            logger.error(f"Admin notify fail {aid}: {e}")
    await callback.answer()

@router.callback_query(F.data == "cancel_order")
async def cb_cancel(callback: CallbackQuery, state: FSMContext):
    await state.clear()
    try:
        await callback.message.delete()
    except Exception:
        pass
    await send_main_menu(callback.message.chat.id, callback.from_user.id, "❌ Заказ отменён.")
    await callback.answer()

# ---------- BALANCE / TOPUP ----------
@router.callback_query(F.data == "balance")
async def cb_balance(callback: CallbackQuery):
    bal = get_balance(callback.from_user.id)
    cur = detect_currency(callback.from_user.language_code)
    await safe_edit(callback,
        f"💰 <b>Ваш баланс:</b> {format_price(bal, cur)}",
        InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="➕ Пополнить", callback_data="topup")],
            [InlineKeyboardButton(text="◀️ Назад", callback_data="main_menu")]]))
    await callback.answer()

@router.callback_query(F.data == "topup")
async def cb_topup(callback: CallbackQuery):
    cur = detect_currency(callback.from_user.language_code)
    lines = []
    for a in TOPUP_AMOUNTS:
        lines.append(f"• {format_price(a, cur)}")
    text = (
        f"➕ <b>Пополнение баланса</b>\n\n"
        f"Выберите сумму:\n" + "\n".join(lines) +
        ""
    )
    await safe_edit(callback, text, topup_kb(cur))
    await callback.answer()

@router.callback_query(F.data.startswith("topup_amount:"))
async def cb_topup_amount(callback: CallbackQuery):
    amount = int(callback.data.split(":")[1])
    stars = math.ceil(amount / RUB_PER_STAR)
    cur = detect_currency(callback.from_user.language_code)
    await safe_edit(callback,
        f"💳 <b>Оплата</b>\n\nСумма: <b>{format_price(amount, cur)}</b>\nК оплате: <b>{stars} ⭐</b>",
        pay_kb(amount, stars))
    await callback.answer()

@router.callback_query(F.data.startswith("pay_stars:"))
async def cb_pay_stars(callback: CallbackQuery):
    parts = callback.data.split(":")
    amount_rub, stars = int(parts[1]), int(parts[2])
    await bot.send_invoice(
        chat_id=callback.from_user.id,
        title=f"Пополнение {format_price(amount_rub, detect_currency(callback.from_user.language_code))}",
        description=f"Пополнение баланса NexVen Studio на {format_price(amount_rub, detect_currency(callback.from_user.language_code))}",
        payload=f"topup_{callback.from_user.id}_{amount_rub}_{stars}",
        provider_token="",
        currency="XTR",
        prices=[LabeledPrice(label=format_price(amount_rub, detect_currency(callback.from_user.language_code)), amount=stars)])
    await callback.answer()

@router.pre_checkout_query()
async def pre_checkout(q: PreCheckoutQuery):
    await q.answer(ok=True)

@router.message(F.successful_payment)
async def success_pay(message: Message):
    p = message.successful_payment
    if p.invoice_payload.startswith("topup_"):
        parts = p.invoice_payload.split("_")
        uid, amount_rub, stars = int(parts[1]), float(parts[2]), int(parts[3])
        add_balance(uid, amount_rub)
        log_payment(uid, amount_rub, stars, p.telegram_payment_charge_id)
        bal = get_balance(uid)
        await message.answer(
            f"✅ <b>Оплата успешна!</b>\n\nПополнено: <b>{format_price(amount_rub, detect_currency(message.from_user.language_code))}</b> ({stars} ⭐)\n"
            f"Баланс: <b>{format_price(bal, detect_currency(message.from_user.language_code))}</b>", parse_mode="HTML")
        await send_main_menu(message.chat.id, uid)

# ---------- MY ORDERS ----------
@router.callback_query(F.data == "my_orders")
async def cb_my_orders(callback: CallbackQuery):
    orders = get_user_orders(callback.from_user.id)
    if not orders:
        await safe_edit(callback, "📦 У вас пока нет заказов.", back_kb())
        await callback.answer()
        return
    stmap = {"pending": "⏳", "accepted": "🔧", "completed": "✅", "cancelled": "❌"}
    text = "📦 <b>Ваши заказы:</b>\n\n"
    for o in orders:
        text += f"#{o['id']} | {o['product_name']} | {format_price(o['price'], detect_currency(callback.from_user.language_code))} — {stmap.get(o['status'], o['status'])}\n"
    await safe_edit(callback, text, back_kb())
    await callback.answer()

# ---------- ADMIN ----------
@router.callback_query(F.data == "admin_panel")
async def cb_admin_panel(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    await state.clear()
    try:
        await callback.message.delete()
    except Exception:
        pass
    await send_admin_panel(callback.message.chat.id)
    await callback.answer()

@router.callback_query(F.data == "admin_pending")
async def cb_admin_pending(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    orders = get_pending_orders()
    if not orders:
        await safe_edit(callback, "📋 Нет новых заказов.", admin_panel_kb())
        await callback.answer()
        return
    await safe_edit(callback, f"📋 <b>Новые заказы ({len(orders)}):</b>", pending_kb(orders))
    await callback.answer()

@router.callback_query(F.data.startswith("admin_view:"))
async def cb_admin_view(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    oid = int(callback.data.split(":")[1])
    order = get_order(oid)
    if not order:
        await callback.answer("Не найден", show_alert=True)
        return
    text = (f"📄 <b>Заказ #{order['id']}</b>\n\n"
            f"👤 ID: {order['user_id']}\n📦 {order['product_name']}\n"
            f"💰 {format_price(order['price'], detect_currency(callback.from_user.language_code))}\n📝 {order['description']}\nСтатус: {order['status']}")
    await safe_edit(callback, text, order_actions_kb(oid))
    await callback.answer()

@router.callback_query(F.data.startswith("admin_accept:"))
async def cb_admin_accept(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    oid = int(callback.data.split(":")[1])
    ok, msg = accept_order(oid, callback.from_user.id)
    if ok:
        await safe_edit(callback, f"✅ {msg}\nЗаказ #{oid} принят.", admin_panel_kb())
        order = get_order(oid)
        if order:
            try:
                await bot.send_message(order["user_id"],
                    f"🔧 Ваш заказ #{oid} ({order['product_name']}) принят в работу!")
            except Exception:
                pass
    else:
        await callback.answer(msg, show_alert=True)
        await safe_edit(callback, f"❌ {msg}", admin_panel_kb())
    await callback.answer()

@router.callback_query(F.data == "admin_my_orders")
async def cb_admin_my(callback: CallbackQuery):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    orders = get_admin_accepted_orders(callback.from_user.id)
    if not orders:
        await safe_edit(callback, "✅ Нет принятых заказов.", admin_panel_kb())
        await callback.answer()
        return
    await safe_edit(callback, f"✅ <b>Ваши заказы ({len(orders)}):</b>", my_accepted_kb(orders))
    await callback.answer()

@router.callback_query(F.data.startswith("admin_complete:"))
async def cb_admin_complete(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    oid = int(callback.data.split(":")[1])
    order = get_order(oid)
    if not order or order["status"] != "accepted" or order["admin_id"] != callback.from_user.id:
        await callback.answer("Недоступно", show_alert=True)
        return
    await state.set_state(AdminStates.waiting_product_files)
    await state.update_data(order_id=oid)
    admin_files_cache[callback.from_user.id] = []
    await safe_edit(callback,
        f"📤 Заказ #{oid} — {order['product_name']}\n\n"
        f"Отправьте файл(ы) с готовым товаром.\nКогда закончите — нажмите «Готово».",
        finish_files_kb())
    await callback.answer()

@router.message(AdminStates.waiting_product_files)
async def admin_files(message: Message, state: FSMContext):
    if not is_admin(message.from_user.id):
        return
    if message.from_user.id not in admin_files_cache:
        admin_files_cache[message.from_user.id] = []
    item = None
    cap = message.caption or message.text or ""
    if message.document:
        item = {"type": "document", "file_id": message.document.file_id, "caption": cap}
    elif message.photo:
        item = {"type": "photo", "file_id": message.photo[-1].file_id, "caption": cap}
    elif message.video:
        item = {"type": "video", "file_id": message.video.file_id, "caption": cap}
    elif message.audio:
        item = {"type": "audio", "file_id": message.audio.file_id, "caption": cap}
    elif message.voice:
        item = {"type": "voice", "file_id": message.voice.file_id, "caption": cap}
    elif message.text:
        item = {"type": "text", "file_id": None, "caption": message.text}
    else:
        await message.answer("Отправьте файл / фото / видео / текст.")
        return
    admin_files_cache[message.from_user.id].append(item)
    await message.answer(
        f"📎 Получено: {len(admin_files_cache[message.from_user.id])} шт.\nЕщё или «Готово».",
        reply_markup=finish_files_kb())

@router.callback_query(F.data == "admin_finish_files", AdminStates.waiting_product_files)
async def cb_finish_files(callback: CallbackQuery, state: FSMContext):
    data = await state.get_data()
    oid = data.get("order_id")
    files = admin_files_cache.get(callback.from_user.id, [])
    if not files:
        await callback.answer("Нет файлов!", show_alert=True)
        return
    await state.set_state(AdminStates.confirming_complete)
    await safe_edit(callback,
        f"✅ Файлов: {len(files)}\n\nОтправить покупателю заказ #{oid}?",
        confirm_complete_kb(oid))
    await callback.answer()

@router.callback_query(F.data.startswith("admin_send:"), AdminStates.confirming_complete)
async def cb_admin_send(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    oid = int(callback.data.split(":")[1])
    order = get_order(oid)
    if not order or order["admin_id"] != callback.from_user.id:
        await callback.answer("Ошибка", show_alert=True)
        await state.clear()
        return
    files = admin_files_cache.get(callback.from_user.id, [])
    if not files:
        await callback.answer("Нет файлов", show_alert=True)
        return
    try:
        await bot.send_message(order["user_id"],
            f"✅ <b>Ваш товар готов!</b>\n\nЗаказ #{oid} ({order['product_name']})\n\n"
            f"Если что-то не так — пишите @{MANAGER_USERNAME}", parse_mode="HTML")
        for item in files:
            t, fid, cap = item["type"], item.get("file_id"), item.get("caption") or None
            if t == "document":
                await bot.send_document(order["user_id"], fid, caption=cap)
            elif t == "photo":
                await bot.send_photo(order["user_id"], fid, caption=cap)
            elif t == "video":
                await bot.send_video(order["user_id"], fid, caption=cap)
            elif t == "audio":
                await bot.send_audio(order["user_id"], fid, caption=cap)
            elif t == "voice":
                await bot.send_voice(order["user_id"], fid, caption=cap)
            elif t == "text":
                await bot.send_message(order["user_id"], item["caption"])
    except Exception as e:
        logger.error(f"Send fail: {e}")
        await safe_edit(callback,
            f"❌ Ошибка отправки: {e}\nВозможно пользователь заблокировал бота.",
            admin_panel_kb())
        await state.clear()
        admin_files_cache.pop(callback.from_user.id, None)
        await callback.answer()
        return
    complete_order(oid, callback.from_user.id)
    await safe_edit(callback, f"✅ Заказ #{oid} отправлен покупателю!", admin_panel_kb())
    await state.clear()
    admin_files_cache.pop(callback.from_user.id, None)
    await callback.answer()


# ---------- ADMIN GIVE BALANCE ----------
@router.callback_query(F.data == "admin_give_balance")
async def cb_admin_give(callback: CallbackQuery, state: FSMContext):
    if not is_admin(callback.from_user.id):
        await callback.answer("Нет доступа", show_alert=True)
        return
    await state.set_state(AdminStates.give_balance_user)
    await safe_edit(callback,
        "💰 <b>Выдача баланса</b>\n\n"
        "Отправьте <b>Telegram ID</b> пользователя\n"
        "(узнать ID можно у @userinfobot)",
        InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_panel")]]))
    await callback.answer()

@router.message(AdminStates.give_balance_user)
async def admin_give_user(message: Message, state: FSMContext):
    if not is_admin(message.from_user.id):
        return
    text = (message.text or "").strip()
    if not text.isdigit():
        await message.answer("Нужен числовой ID. Попробуйте ещё раз или /start")
        return
    await state.update_data(give_user_id=int(text))
    await state.set_state(AdminStates.give_balance_amount)
    cur = detect_currency(message.from_user.language_code)
    await message.answer(
        f"ID: <code>{text}</code>\n\n"
        f"Введите сумму для начисления ({CURRENCY_NAMES.get(cur, '₽')}):",
        parse_mode="HTML",
        reply_markup=InlineKeyboardMarkup(inline_keyboard=[
            [InlineKeyboardButton(text="❌ Отмена", callback_data="admin_panel")]]))

@router.message(AdminStates.give_balance_amount)
async def admin_give_amount(message: Message, state: FSMContext):
    if not is_admin(message.from_user.id):
        return
    text = (message.text or "").strip().replace(",", ".")
    try:
        amount_local = float(text)
        if amount_local <= 0:
            raise ValueError
    except ValueError:
        await message.answer("Введите положительное число (например 100)")
        return
    data = await state.get_data()
    uid = data.get("give_user_id")
    if not uid:
        await state.clear()
        await message.answer("Ошибка. Начните заново.")
        return
    admin_cur = detect_currency(message.from_user.language_code)
    amount_rub = rub_from_local(amount_local, admin_cur)
    ensure_user(uid)
    add_balance(uid, amount_rub)
    new_bal = get_balance(uid)
    target_cur = get_user_currency(uid, message.from_user.language_code)
    await state.clear()
    await message.answer(
        f"✅ Начислено <b>{format_price(amount_rub, admin_cur)}</b> пользователю <code>{uid}</code>\n"
        f"Его новый баланс: <b>{format_price(new_bal, admin_cur)}</b>",
        parse_mode="HTML",
        reply_markup=admin_panel_kb())
    try:
        await bot.send_message(uid,
            f"💰 Вам начислено <b>{format_price(amount_rub, target_cur)}</b> на баланс!\n"
            f"Текущий баланс: <b>{format_price(new_bal, target_cur)}</b>",
            parse_mode="HTML")
    except Exception:
        pass


# ---------- RUN ----------
async def main():
    init_db()
    print("=" * 45)
    print("  NexVen Studio Bot — STARTED SUCCESSFULLY")
    print("=" * 45)
    print(f"Admins: {load_admins()}")
    print("Press Ctrl+C to stop")
    print("=" * 45)
    logger.info("DB ready")
    logger.info(f"Admins: {load_admins()}")
    await bot.delete_webhook(drop_pending_updates=True)
    logger.info("Bot started...")
    await dp.start_polling(bot)

if __name__ == "__main__":
    asyncio.run(main())
