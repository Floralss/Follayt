(function () {
  'use strict';

  var tg = window.Telegram && window.Telegram.WebApp;
  if (tg) {
    try { tg.ready(); tg.expand(); tg.setHeaderColor('#0a0a0f'); tg.setBackgroundColor('#0a0a0f'); } catch (e) {}
  }

  var ADMIN_IDS = [8133917568, 5198310704];
  var BOT_API = ''; // optional backend for invoice; uses Telegram bot via openLink fallback
  var PROJECT = 'custom-graphics-36c50';

  function getTgUser() {
    try {
      if (tg && tg.initDataUnsafe && tg.initDataUnsafe.user) return tg.initDataUnsafe.user;
    } catch (e) {}
    return { id: 999001, first_name: 'Test', username: 'test', photo_url: null };
  }

  // ===== Gift icons (SVG data-URI, TG-style names) =====
  function svgIcon(bg, emojiPath) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="14" fill="' + bg + '"/>' + emojiPath + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }

  var ICONS = {
    star1: svgIcon('#3d3010', '<path fill="#f0c14b" d="M32 12l5 14h15l-12 9 4 14-12-9-12 9 4-14-12-9h15z"/>'),
    star2: svgIcon('#3d3010', '<path fill="#f0c14b" d="M32 12l5 14h15l-12 9 4 14-12-9-12 9 4-14-12-9h15z"/><circle cx="48" cy="16" r="6" fill="#f0c14b"/>'),
    star5: svgIcon('#4a3808', '<path fill="#ffd700" d="M32 10l6 16h17l-14 10 5 16-14-10-14 10 5-16-14-10h17z"/>'),
    heart: svgIcon('#3d1020', '<path fill="#ff6b8a" d="M32 52s-18-11-18-26a11 11 0 0 1 22 0 11 11 0 0 1 22 0c0 15-18 26-18 26z"/>'),
    rose: svgIcon('#2a1020', '<circle cx="32" cy="28" r="12" fill="#e84393"/><path fill="#00b894" d="M30 38v12h4V38"/>'),
    bear: svgIcon('#3d2a18', '<circle cx="22" cy="22" r="8" fill="#d4a574"/><circle cx="42" cy="22" r="8" fill="#d4a574"/><circle cx="32" cy="34" r="16" fill="#d4a574"/><circle cx="26" cy="32" r="3" fill="#2d3436"/><circle cx="38" cy="32" r="3" fill="#2d3436"/>'),
    cake: svgIcon('#3d2030', '<rect x="14" y="28" width="36" height="22" rx="4" fill="#fd79a8"/><rect x="14" y="28" width="36" height="8" fill="#ffeaa7"/><circle cx="32" cy="14" r="4" fill="#ff7675"/>'),
    gift: svgIcon('#2a1a4a', '<rect x="12" y="28" width="40" height="26" rx="4" fill="#6c5ce7"/><rect x="10" y="22" width="44" height="10" rx="3" fill="#a29bfe"/><rect x="28" y="22" width="8" height="32" fill="#f0c14b"/>'),
    diamond: svgIcon('#0a2a2a', '<path fill="#00cec9" d="M32 10l16 18-16 26L16 28z"/>'),
    ring: svgIcon('#2a2a30', '<circle cx="32" cy="34" r="14" fill="none" stroke="#b2bec3" stroke-width="5"/><path fill="#74b9ff" d="M32 12l4 8h-8z"/>'),
    pepe: svgIcon('#1a3d1a', '<ellipse cx="32" cy="34" rx="20" ry="16" fill="#6ab04c"/><circle cx="25" cy="31" r="3" fill="#2d3436"/><circle cx="41" cy="31" r="3" fill="#2d3436"/>'),
    cap: svgIcon('#1a2a3d', '<path fill="#0984e3" d="M12 36h40v8H12z"/><path fill="#74b9ff" d="M16 36c0-12 8-18 16-18s16 6 16 18z"/>'),
    bottle: svgIcon('#1a3d2a', '<rect x="26" y="12" width="12" height="10" rx="2" fill="#00b894"/><rect x="22" y="22" width="20" height="30" rx="4" fill="#55efc4"/>'),
    /* market cheap NFTs */
    ice: svgIcon('#1a2a3d', '<path fill="#81ecec" d="M28 28h8v20c0 4-4 6-4 6s-4-2-4-6z"/><ellipse cx="32" cy="26" rx="12" ry="8" fill="#fff"/><ellipse cx="32" cy="22" rx="10" ry="6" fill="#dfe6e9"/>'),
    liberty: svgIcon('#0d3d2a', '<path fill="#00b894" d="M28 50h8V30h-8z"/><path fill="#55efc4" d="M22 30h20l-2-8H24z"/><path fill="#ffeaa7" d="M30 12h4v10h-4z"/><circle cx="32" cy="10" r="4" fill="#fdcb6e"/>'),
    dog: svgIcon('#3d2a10', '<ellipse cx="32" cy="36" rx="16" ry="14" fill="#e17055"/><circle cx="26" cy="32" r="3" fill="#2d3436"/><circle cx="38" cy="32" r="3" fill="#2d3436"/><path fill="#0984e3" d="M20 22h24l-4 8H24z"/><circle cx="40" cy="18" r="5" fill="#fdcb6e"/>'),
    noodles: svgIcon('#3d2010', '<rect x="14" y="30" width="36" height="18" rx="4" fill="#e17055"/><path fill="#fdcb6e" d="M18 34q8 4 14 0t14 0"/><rect x="40" y="20" width="3" height="16" fill="#dfe6e9"/>'),
    top: svgIcon('#2a1a10', '<path fill="#a0522d" d="M30 12h4v20h-4z"/><ellipse cx="32" cy="40" rx="14" ry="6" fill="#d4a574"/><ellipse cx="32" cy="36" rx="10" ry="4" fill="#c0392b"/>'),
    lolly: svgIcon('#2a1030', '<circle cx="32" cy="24" r="14" fill="#fd79a8"/><circle cx="32" cy="24" r="10" fill="#a29bfe"/><circle cx="32" cy="24" r="6" fill="#ffeaa7"/><rect x="30" y="36" width="4" height="16" fill="#dfe6e9"/>'),
    lantern: svgIcon('#2a1a0a', '<ellipse cx="32" cy="40" rx="12" ry="10" fill="#e17055"/><rect x="26" y="18" width="12" height="14" rx="2" fill="#fdcb6e"/><path fill="#f0c14b" d="M28 18h8l2-6h-12z"/>'),
    flamingo: svgIcon('#3d1020', '<ellipse cx="32" cy="40" rx="18" ry="10" fill="#fd79a8"/><circle cx="44" cy="28" r="8" fill="#fd79a8"/><path fill="#fd79a8" d="M48 24q8-10 4-16"/><circle cx="46" cy="26" r="2" fill="#2d3436"/>'),
    backpack: svgIcon('#1a1a2a', '<rect x="16" y="20" width="32" height="34" rx="6" fill="#2d3436"/><rect x="20" y="28" width="24" height="16" rx="3" fill="#636e72"/><path fill="#74b9ff" d="M28 14h8v8h-8z"/>'),
    stock: svgIcon('#3d1010', '<path fill="#c0392b" d="M22 18c0-6 4-10 10-10s10 4 10 10v28c0 4-4 6-10 6s-10-2-10-6z"/><circle cx="28" cy="24" r="3" fill="#fff"/><circle cx="36" cy="30" r="3" fill="#55efc4"/><path fill="#fff" d="M26 14h12v4H26z"/>'),
    snowman: svgIcon('#1a2a3d', '<circle cx="32" cy="42" r="12" fill="#dfe6e9"/><circle cx="32" cy="26" r="9" fill="#fff"/><circle cx="28" cy="24" r="2" fill="#2d3436"/><circle cx="36" cy="24" r="2" fill="#2d3436"/><path fill="#e17055" d="M32 28l6 2-6 2z"/>'),
    cupcake: svgIcon('#3d2030', '<path fill="#e17055" d="M20 36h24l-2 14H22z"/><ellipse cx="32" cy="34" rx="14" ry="8" fill="#ffeaa7"/><path fill="#fd79a8" d="M26 28q6-12 12 0"/>'),
    bag: svgIcon('#1a2a1a', '<path fill="#b2bec3" d="M18 22h28v28H18z"/><path fill="#636e72" d="M22 18h20v6H22z"/><circle cx="28" cy="36" r="4" fill="#f0c14b"/><circle cx="38" cy="40" r="3" fill="#00b894"/>'),
    poop: svgIcon('#2a1a0a', '<ellipse cx="32" cy="42" rx="16" ry="10" fill="#a0522d"/><ellipse cx="32" cy="32" rx="12" ry="8" fill="#c4783a"/><ellipse cx="32" cy="22" rx="8" ry="6" fill="#d4a574"/><circle cx="28" cy="30" r="2" fill="#2d3436"/><circle cx="36" cy="30" r="2" fill="#2d3436"/>'),
    clover: svgIcon('#1a3d1a', '<circle cx="32" cy="22" r="8" fill="#00b894"/><circle cx="24" cy="30" r="8" fill="#00b894"/><circle cx="40" cy="30" r="8" fill="#00b894"/><circle cx="32" cy="38" r="8" fill="#00b894"/><rect x="30" y="38" width="4" height="14" fill="#00b894"/>'),
    cane: svgIcon('#3d1010', '<path fill="none" stroke="#c0392b" stroke-width="6" stroke-linecap="round" d="M24 50c0-20 0-28 8-28s8 8 8 8"/><path fill="none" stroke="#fff" stroke-width="3" d="M24 44c0-12 2-20 8-20"/>'),
    giftbox: svgIcon('#2a1a3d', '<rect x="14" y="28" width="36" height="24" rx="3" fill="#e17055"/><rect x="12" y="22" width="40" height="10" fill="#fd79a8"/><rect x="28" y="22" width="8" height="30" fill="#fff"/><rect x="40" y="30" width="10" height="8" rx="2" fill="#a29bfe"/>'),
    cherrycake: svgIcon('#3d1020', '<rect x="14" y="32" width="36" height="18" rx="3" fill="#fd79a8"/><ellipse cx="32" cy="32" rx="18" ry="6" fill="#fff"/><circle cx="28" cy="24" r="4" fill="#c0392b"/><circle cx="36" cy="22" r="4" fill="#c0392b"/>'),
    socks: svgIcon('#1a1a2a', '<path fill="#636e72" d="M22 16h10v28c0 6-4 10-8 10s-6-2-6-6V28z"/><path fill="#2d3436" d="M36 16h10v28c0 6-4 10-8 10s-6-2-6-6V28z"/>'),
    snake: svgIcon('#1a3d1a', '<path fill="#00b894" d="M16 40q8-20 16-8t16-8"/><circle cx="44" cy="24" r="8" fill="#55efc4"/><circle cx="46" cy="22" r="2" fill="#2d3436"/><path fill="#c0392b" d="M38 16h14v6H38z"/>'),
    gheart: svgIcon('#3d2010', '<path fill="#e17055" d="M32 52s-16-10-16-24a10 10 0 0 1 20 0 10 10 0 0 1 20 0c0 14-16 24-16 24z"/><path fill="#fff" d="M28 28h8v2h-8zM26 32h12v2H26z"/>'),
    bunny: svgIcon('#2a1a2a', '<ellipse cx="32" cy="42" rx="16" ry="10" fill="#fd79a8"/><circle cx="32" cy="30" r="10" fill="#dfe6e9"/><ellipse cx="24" cy="18" rx="4" ry="10" fill="#dfe6e9"/><ellipse cx="40" cy="18" rx="4" ry="10" fill="#dfe6e9"/><circle cx="28" cy="28" r="2" fill="#2d3436"/><circle cx="36" cy="28" r="2" fill="#2d3436"/>'),
    moon: svgIcon('#1a1a3d', '<path fill="#fdcb6e" d="M40 32a14 14 0 1 1-12-18 12 12 0 0 0 12 18z"/><path fill="#ffeaa7" d="M28 40h8v8h-3v4h-2v-4h-3z"/>'),
    bday: svgIcon('#1a2a3d', '<rect x="10" y="24" width="44" height="24" rx="6" fill="#74b9ff"/><text x="32" y="40" text-anchor="middle" fill="#fff" font-size="9" font-weight="bold">B-DAY</text>'),
    jester: svgIcon('#2a1a3d', '<path fill="#6c5ce7" d="M16 40l8-20 8 12 8-12 8 20z"/><circle cx="20" cy="18" r="5" fill="#00b894"/><circle cx="44" cy="18" r="5" fill="#fd79a8"/><circle cx="32" cy="14" r="5" fill="#f0c14b"/>'),
    medal: svgIcon('#3d3010', '<circle cx="32" cy="36" r="14" fill="#f0c14b"/><circle cx="32" cy="36" r="10" fill="#fdcb6e"/><path fill="#f0c14b" d="M32 28l2 6h6l-5 4 2 6-5-4-5 4 2-6-5-4h6z"/><path fill="#c0392b" d="M24 14h16l-4 10H28z"/>'),
    sparkler: svgIcon('#1a1a2a', '<rect x="30" y="28" width="4" height="26" fill="#b2bec3"/><circle cx="32" cy="20" r="3" fill="#f0c14b"/><path stroke="#ffeaa7" stroke-width="2" d="M32 12v6M24 18l6 4M40 18l-6 4M26 10l4 6M38 10l-4 6"/>'),
    money: svgIcon('#1a3d1a', '<rect x="18" y="20" width="28" height="28" rx="4" fill="#00b894"/><text x="32" y="40" text-anchor="middle" fill="#fff" font-size="16" font-weight="bold">$</text><path fill="#f0c14b" d="M28 14h8v8h-8z"/>'),
    saber: svgIcon('#1a1a3d', '<rect x="28" y="8" width="8" height="36" rx="2" fill="#74b9ff"/><rect x="26" y="44" width="12" height="12" rx="2" fill="#636e72"/>'),
    book: svgIcon('#2a1a10', '<path fill="#e17055" d="M16 14h32v36H16z"/><path fill="#ffeaa7" d="M20 18h24v28H20z"/><path fill="#f0c14b" d="M30 22v16M26 26h12"/>'),
    keycap: svgIcon('#1a1a2a', '<rect x="12" y="18" width="40" height="32" rx="6" fill="#dfe6e9"/><path fill="#c0392b" d="M32 28s-8-5-8-12a8 8 0 0 1 16 0c0 7-8 12-8 12z"/>'),
    bond: svgIcon('#1a1a2a', '<rect x="14" y="16" width="36" height="36" rx="3" fill="#b2bec3"/><rect x="18" y="22" width="28" height="4" fill="#636e72"/><rect x="18" y="30" width="20" height="3" fill="#636e72"/><circle cx="44" cy="44" r="6" fill="#74b9ff"/>'),
    gingerman: svgIcon('#3d2a10', '<circle cx="32" cy="18" r="8" fill="#d4a574"/><rect x="26" y="24" width="12" height="16" rx="3" fill="#d4a574"/><rect x="18" y="26" width="10" height="5" rx="2" fill="#d4a574"/><rect x="36" y="26" width="10" height="5" rx="2" fill="#d4a574"/><circle cx="28" cy="17" r="1.5" fill="#2d3436"/><circle cx="36" cy="17" r="1.5" fill="#2d3436"/>'),
    rocket: svgIcon('#1a1a3d', '<path fill="#dfe6e9" d="M32 8c8 12 8 28 8 36h-16c0-8 0-24 8-36z"/><path fill="#c0392b" d="M24 44l8 12 8-12z"/><circle cx="32" cy="28" r="5" fill="#74b9ff"/>'),
    monkey: svgIcon('#3d2a10', '<circle cx="32" cy="32" r="16" fill="#d4a574"/><circle cx="18" cy="24" r="8" fill="#d4a574"/><circle cx="46" cy="24" r="8" fill="#d4a574"/><circle cx="26" cy="30" r="3" fill="#2d3436"/><circle cx="38" cy="30" r="3" fill="#2d3436"/><ellipse cx="32" cy="38" rx="5" ry="3" fill="#2d3436"/>'),
    nft1: svgIcon('#2a1a4a', '<rect x="14" y="14" width="36" height="36" rx="6" fill="#a29bfe"/>'),
    nftM: svgIcon('#1a1a3d', '<rect x="14" y="14" width="36" height="36" rx="6" fill="#6c5ce7"/>'),
    nftH: svgIcon('#3d1a2a', '<rect x="14" y="14" width="36" height="36" rx="6" fill="#fd79a8"/>'),
    nftT: svgIcon('#3d3010', '<rect x="14" y="14" width="36" height="36" rx="6" fill="#f0c14b"/>')
  };

  function iconFor(name) {
    var map = {
      '1 ★': 'star1', '2 ★': 'star2', '5 ★': 'star5', 'Звезда': 'star5',
      'Heart': 'heart', 'Сердце': 'heart', 'Rose': 'rose', 'Роза': 'rose',
      'Teddy Bear': 'bear', 'Мишка': 'bear', 'Delicious Cake': 'cake', 'Торт': 'cake',
      'Gift Box': 'gift', 'Подарок': 'gift', 'Diamond': 'diamond', 'Алмаз': 'diamond',
      'Ring': 'ring', 'Кольцо': 'ring', 'Plush Pepe': 'pepe', 'Durov Cap': 'cap',
      'Champagne': 'bottle',
      'Ice Cream': 'ice', 'Liberty': 'liberty', 'Cool Dog': 'dog',
      'Noodles': 'noodles', 'Spinning Top': 'top', 'Lollipop': 'lolly',
      'Lantern': 'lantern', 'Flamingo': 'flamingo', 'Backpack': 'backpack',
      'Stocking': 'stock', 'Snowman': 'snowman', 'Cupcake': 'cupcake',
      'Candy Bag': 'bag', 'Poop': 'poop', 'Clover': 'clover',
      'Candy Cane': 'cane', 'Wrapped Gift': 'giftbox', 'Cherry Cake': 'cherrycake',
      'Socks': 'socks', 'Snake': 'snake', 'Ginger Heart': 'gheart',
      'Bunny Basket': 'bunny', 'Crescent': 'moon', 'Happy B-Day': 'bday',
      'Jester': 'jester', 'Medal': 'medal', 'Sparkler': 'sparkler',
      'Money Bouquet': 'money', 'Light Saber': 'saber', 'Magic Book': 'book',
      'Love Keycap': 'keycap', 'Bond': 'bond', 'Gingerbread': 'gingerman',
      'Rocket': 'rocket', 'Spy Monkey': 'monkey',
      'NFT #1': 'nft1', 'NFT Средний': 'nftM', 'NFT Хороший': 'nftH', 'NFT Топ': 'nftT'
    };
    return ICONS[map[name] || 'gift'] || ICONS.gift;
  }

  // ===== Cases =====
  var CASES = {
    free: {
      id: 'free', name: 'Фри', price: 0, desc: 'Раз в 24 часа', iconClass: 'free',
      prizes: [
        { name: '1 ★', value: 1, chance: 55, nft: false },
        { name: '2 ★', value: 2, chance: 35, nft: false },
        { name: '5 ★', value: 5, chance: 6, nft: false },
        { name: 'Heart', value: 15, chance: 1.5, nft: false },
        { name: 'Cupcake', value: 460, chance: 0.8, nft: true },
        { name: 'Snowman', value: 490, chance: 0.6, nft: true },
        { name: 'Stocking', value: 500, chance: 0.5, nft: true },
        { name: 'Flamingo', value: 510, chance: 0.4, nft: true },
        { name: 'Ice Cream', value: 505, chance: 0.2, nft: true }
      ]
    },
    cheap: {
      id: 'cheap', name: 'Дешёвый', price: 15, desc: 'Обычные + маркет NFT', iconClass: 'cheap',
      prizes: [
        { name: 'Heart', value: 10, chance: 26, nft: false },
        { name: 'Rose', value: 15, chance: 22, nft: false },
        { name: 'Teddy Bear', value: 25, chance: 16, nft: false },
        { name: 'Delicious Cake', value: 40, chance: 10, nft: false },
        { name: 'Звезда', value: 50, chance: 8, nft: false },
        { name: 'Cupcake', value: 460, chance: 4, nft: true },
        { name: 'Snowman', value: 490, chance: 3.5, nft: true },
        { name: 'Stocking', value: 500, chance: 3, nft: true },
        { name: 'Wrapped Gift', value: 500, chance: 2.5, nft: true },
        { name: 'Flamingo', value: 510, chance: 2, nft: true },
        { name: 'Candy Cane', value: 510, chance: 1.5, nft: true },
        { name: 'Noodles', value: 513, chance: 1, nft: true },
        { name: 'Spinning Top', value: 530, chance: 0.5, nft: true }
      ]
    },
    selected: {
      id: 'selected', name: 'Избранный', price: 100, desc: 'Маркет NFT 500–700★', iconClass: 'selected',
      prizes: [
        { name: 'Cupcake', value: 460, chance: 12, nft: true },
        { name: 'Snowman', value: 490, chance: 11, nft: true },
        { name: 'Stocking', value: 500, chance: 10, nft: true },
        { name: 'Flamingo', value: 510, chance: 9, nft: true },
        { name: 'Lollipop', value: 544, chance: 8, nft: true },
        { name: 'Snake', value: 549, chance: 7, nft: true },
        { name: 'Jester', value: 550, chance: 6, nft: true },
        { name: 'Sparkler', value: 587, chance: 6, nft: true },
        { name: 'Bond', value: 590, chance: 5, nft: true },
        { name: 'Socks', value: 599, chance: 5, nft: true },
        { name: 'Poop', value: 599, chance: 4, nft: true },
        { name: 'Backpack', value: 600, chance: 4, nft: true },
        { name: 'Gingerbread', value: 610, chance: 3, nft: true },
        { name: 'Ginger Heart', value: 626, chance: 3, nft: true },
        { name: 'Rocket', value: 650, chance: 2.5, nft: true },
        { name: 'Medal', value: 655, chance: 2, nft: true },
        { name: 'Lantern', value: 666, chance: 1.5, nft: true },
        { name: 'Liberty', value: 690, chance: 1, nft: true }
      ]
    },
    vip: {
      id: 'vip', name: 'VIP', price: 250, desc: 'Редкие маркет NFT', iconClass: 'vip',
      prizes: [
        { name: 'Cherry Cake', value: 700, chance: 14, nft: true },
        { name: 'Cool Dog', value: 709, chance: 12, nft: true },
        { name: 'Money Bouquet', value: 710, chance: 11, nft: true },
        { name: 'Clover', value: 721, chance: 10, nft: true },
        { name: 'Bunny Basket', value: 721, chance: 9, nft: true },
        { name: 'Crescent', value: 721, chance: 8, nft: true },
        { name: 'Happy B-Day', value: 721, chance: 8, nft: true },
        { name: 'Love Keycap', value: 721, chance: 7, nft: true },
        { name: 'Light Saber', value: 721, chance: 6, nft: true },
        { name: 'Spy Monkey', value: 814, chance: 5, nft: true },
        { name: 'Plush Pepe', value: 900, chance: 4, nft: true },
        { name: 'Durov Cap', value: 1000, chance: 3, nft: true },
        { name: 'Magic Book', value: 600, chance: 2, nft: true },
        { name: 'NFT Топ', value: 1500, chance: 1, nft: true }
      ]
    }
  };

  function rollPrize(caseId) {
    var prizes = CASES[caseId].prizes;
    var total = 0, i;
    for (i = 0; i < prizes.length; i++) total += prizes[i].chance;
    var r = Math.random() * total;
    for (i = 0; i < prizes.length; i++) {
      r -= prizes[i].chance;
      if (r <= 0) return prizes[i];
    }
    return prizes[prizes.length - 1];
  }

  // ===== State =====
  var currentUser = null;
  var selectedCaseId = null;
  var selectedItem = null;
  var opening = false;
  var db = null;
  var userRef = null;
  var LS = 'iz_v3_';

  function toast(msg, type) {
    var el = document.getElementById('toast');
    el.textContent = msg;
    el.className = 'toast show ' + (type || '');
    setTimeout(function () { el.classList.remove('show'); }, 2800);
  }

  function saveLocal() {
    try {
      localStorage.setItem(LS + currentUser.id, JSON.stringify({
        balance: currentUser.balance || 0,
        inventory: currentUser.inventory || [],
        last_free: currentUser.last_free || 0,
        total_deposited: currentUser.total_deposited || 0,
        total_spent: currentUser.total_spent || 0
      }));
    } catch (e) {}
  }

  function loadLocal(id) {
    try {
      var r = localStorage.getItem(LS + id);
      return r ? JSON.parse(r) : null;
    } catch (e) { return null; }
  }

  function saveUser() {
    if (!currentUser) return;
    saveLocal();
    if (userRef) {
      userRef.set({
        id: currentUser.id,
        first_name: currentUser.first_name || '',
        username: currentUser.username || '',
        photo_url: currentUser.photo_url || null,
        balance: currentUser.balance || 0,
        inventory: currentUser.inventory || [],
        last_free: currentUser.last_free || 0,
        total_deposited: currentUser.total_deposited || 0,
        total_spent: currentUser.total_spent || 0,
        last_active: Date.now()
      }, { merge: true }).catch(function () {});
    }
  }

  function renderUser() {
    if (!currentUser) return;
    document.getElementById('username').textContent = currentUser.first_name || 'Игрок';
    document.getElementById('balanceStars').textContent = (currentUser.balance || 0).toLocaleString();
    var av = document.getElementById('avatar');
    if (currentUser.photo_url) av.innerHTML = '<img src="' + currentUser.photo_url + '" alt="">';
    else av.textContent = ((currentUser.first_name || '?')[0] || '?').toUpperCase();
  }

  // ===== Tabs (fixed) =====
  function switchTab(tab) {
    document.querySelectorAll('.bn-btn').forEach(function (b) {
      b.classList.toggle('active', b.getAttribute('data-tab') === tab);
    });
    document.querySelectorAll('.tab').forEach(function (t) {
      t.classList.toggle('active', t.id === 'tab-' + tab);
    });
    if (tab === 'inventory') renderInventory();
    if (tab === 'top') renderLeaderboard();
    if (tab === 'profile') renderProfile();
  }

  document.getElementById('bottomNav').addEventListener('click', function (e) {
    var btn = e.target.closest('.bn-btn');
    if (!btn) return;
    e.preventDefault();
    switchTab(btn.getAttribute('data-tab'));
  });

  // ===== Init =====
  function init() {
    var tgUser = getTgUser();
    var local = loadLocal(tgUser.id);
    currentUser = {
      id: tgUser.id,
      first_name: tgUser.first_name || 'Игрок',
      username: tgUser.username || '',
      photo_url: tgUser.photo_url || null,
      balance: local ? (local.balance || 0) : 0,
      inventory: local ? (local.inventory || []) : [],
      last_free: local ? (local.last_free || 0) : 0,
      total_deposited: local ? (local.total_deposited || 0) : 0,
      total_spent: local ? (local.total_spent || 0) : 0
    };
    renderUser();
    renderCases();
    bindGames();

    // Firebase
    try {
      if (!firebase.apps.length) {
        firebase.initializeApp({
          apiKey: 'AIzaSyAPTTDTPzDpKQjpPvze1IBsJQJw74_ua34',
          authDomain: 'custom-graphics-36c50.firebaseapp.com',
          projectId: PROJECT,
          storageBucket: 'custom-graphics-36c50.firebasestorage.app',
          messagingSenderId: '130011001835',
          appId: '1:130011001835:web:1ba6e4e4b3c7a6f0b7dfae'
        });
      }
      db = firebase.firestore();
      userRef = db.collection('users').doc(String(tgUser.id));

      userRef.get().then(function (snap) {
        if (snap.exists) {
          var d = snap.data();
          if (typeof d.balance === 'number') currentUser.balance = d.balance;
          if (d.inventory) currentUser.inventory = d.inventory;
          if (d.last_free) currentUser.last_free = d.last_free;
          if (d.total_deposited) currentUser.total_deposited = d.total_deposited;
          if (d.total_spent) currentUser.total_spent = d.total_spent;
          // pending admin credits
          if (d.pending_credit) {
            currentUser.balance = (currentUser.balance || 0) + d.pending_credit;
            userRef.update({ pending_credit: 0, balance: currentUser.balance }).catch(function () {});
            toast('Начислено +' + d.pending_credit + ' ★', 'success');
          }
          // free case grants
          if (d.free_cases && d.free_cases.length) {
            currentUser._freeCases = d.free_cases;
          }
          renderUser();
          renderCases();
          saveLocal();
        } else {
          saveUser();
        }
      }).catch(function () {});

      // presence
      userRef.set({ last_active: Date.now(), online: true }, { merge: true }).catch(function () {});
      setInterval(function () {
        if (userRef) userRef.set({ last_active: Date.now(), online: true }, { merge: true }).catch(function () {});
      }, 30000);

      // online count
      setInterval(updateOnline, 15000);
      updateOnline();

      // live drops
      db.collection('drops').orderBy('ts', 'desc').limit(20).onSnapshot(function (snap) {
        var items = [];
        snap.forEach(function (doc) { items.push(doc.data()); });
        renderLive(items);
      }, function () {});

    } catch (e) { console.warn(e); }
  }

  function updateOnline() {
    if (!db) return;
    var cutoff = Date.now() - 120000;
    db.collection('users').where('last_active', '>', cutoff).get().then(function (snap) {
      document.getElementById('onlineLine').textContent = 'Онлайн: ' + snap.size;
    }).catch(function () {});
  }

  function renderLive(items) {
    var track = document.getElementById('liveTrack');
    if (!items || !items.length) {
      track.innerHTML = '<span class="live-item">Пока нет дропов</span>';
      return;
    }
    var html = items.map(function (d) {
      return '<span class="live-item"><b>' + (d.name || 'Игрок') + '</b> получил ' +
        (d.prize || '?') + ' <span class="lv">' + (d.value || 0) + ' ★</span></span>';
    }).join('');
    track.innerHTML = html + html; // duplicate for seamless scroll
  }

  function pushDrop(prize) {
    if (!db) return;
    db.collection('drops').add({
      uid: currentUser.id,
      name: currentUser.first_name || 'Игрок',
      prize: prize.name,
      value: prize.value,
      ts: Date.now()
    }).catch(function () {});
  }

  // ===== Cases =====
  function renderCases() {
    var grid = document.getElementById('casesGrid');
    grid.innerHTML = '';
    var now = Date.now();
    Object.keys(CASES).forEach(function (key) {
      var c = CASES[key];
      var priceHtml;
      if (c.id === 'free') {
        var left = (currentUser.last_free || 0) + 86400000 - now;
        if (left > 0) {
          var h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
          priceHtml = '<div class="case-price cd">' + h + 'ч ' + m + 'м</div>';
        } else priceHtml = '<div class="case-price free">Бесплатно</div>';
      } else {
        priceHtml = '<div class="case-price">' + c.price + ' ★</div>';
      }
      var card = document.createElement('div');
      card.className = 'case-card';
      card.innerHTML =
        '<div class="case-ico ' + c.iconClass + '"><img src="' + iconFor(c.id === 'free' ? 'Gift Box' : c.id === 'vip' ? 'NFT Топ' : 'Gift Box') + '" alt=""></div>' +
        '<div class="case-meta"><div class="case-name">' + c.name + '</div><div class="case-desc">' + c.desc + '</div>' + priceHtml + '</div>' +
        '<svg class="case-chevron" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 18l6-6-6-6"/></svg>';
      card.onclick = function () { openPreview(c.id); };
      grid.appendChild(card);
    });
  }

  function openPreview(caseId) {
    var c = CASES[caseId];
    if (!c) return;
    selectedCaseId = caseId;
    document.getElementById('cpName').textContent = c.name;
    document.getElementById('cpDesc').textContent = c.desc;
    var icon = document.getElementById('cpIcon');
    icon.className = 'cp-icon case-ico ' + c.iconClass;
    icon.innerHTML = '<img src="' + iconFor('Gift Box') + '" alt="">';

    var now = Date.now(), priceEl = document.getElementById('cpPrice'), btn = document.getElementById('btnDoOpen'), can = true;
    if (c.id === 'free') {
      var left = (currentUser.last_free || 0) + 86400000 - now;
      if (left > 0) {
        can = false;
        var h = Math.floor(left / 3600000), m = Math.floor((left % 3600000) / 60000);
        priceEl.className = 'cp-price cd'; priceEl.textContent = 'Через ' + h + 'ч ' + m + 'м';
        btn.textContent = 'Недоступно';
      } else {
        priceEl.className = 'cp-price free'; priceEl.textContent = 'Бесплатно';
        btn.textContent = 'Открыть бесплатно';
      }
    } else {
      priceEl.className = 'cp-price'; priceEl.textContent = c.price + ' ★';
      if ((currentUser.balance || 0) < c.price) { can = false; btn.textContent = 'Недостаточно ★'; }
      else btn.textContent = 'Открыть за ' + c.price + ' ★';
    }
    btn.disabled = !can;

    var list = document.getElementById('cpPrizes');
    list.innerHTML = '';
    c.prizes.slice().sort(function (a, b) { return b.chance - a.chance; }).forEach(function (p) {
      var row = document.createElement('div');
      row.className = 'prize-row' + (p.nft ? ' nft' : '');
      row.innerHTML =
        '<div class="pr-pic"><img src="' + iconFor(p.name) + '" alt=""></div>' +
        '<div class="pr-info"><div class="pr-name">' + p.name + (p.nft ? ' · NFT' : '') + '</div>' +
        '<div class="pr-chance">' + p.chance + '%</div></div>' +
        '<div class="pr-val">' + p.value + ' ★</div>';
      list.appendChild(row);
    });
    document.getElementById('sheetCase').classList.add('show');
  }

  document.getElementById('sheetCaseBg').onclick = function () {
    document.getElementById('sheetCase').classList.remove('show');
  };
  document.getElementById('btnDoOpen').onclick = function () {
    if (!selectedCaseId || this.disabled || opening) return;
    document.getElementById('sheetCase').classList.remove('show');
    doOpen(selectedCaseId);
  };

  function doOpen(caseId) {
    if (opening) return;
    var c = CASES[caseId];
    if (!c) return;
    if (caseId === 'free') {
      if (Date.now() < (currentUser.last_free || 0) + 86400000) { toast('Фри ещё не готов', 'error'); return; }
    } else {
      if ((currentUser.balance || 0) < c.price) { toast('Недостаточно ★', 'error'); return; }
      currentUser.balance -= c.price;
      currentUser.total_spent = (currentUser.total_spent || 0) + c.price;
    }
    opening = true;
    var prize = rollPrize(caseId);

    var track = document.getElementById('spinTrack');
    track.innerHTML = '';
    track.style.transition = 'none';
    track.style.transform = 'translateX(0)';
    var totalItems = 42, winnerIndex = 34;
    for (var i = 0; i < totalItems; i++) {
      var p = i === winnerIndex ? prize : c.prizes[Math.floor(Math.random() * c.prizes.length)];
      var el = document.createElement('div');
      el.className = 'spin-item';
      el.innerHTML = '<div class="si-pic"><img src="' + iconFor(p.name) + '" alt=""></div><div class="si-name">' + p.name + '</div>';
      track.appendChild(el);
    }
    document.getElementById('spinOverlay').classList.add('show');

    requestAnimationFrame(function () {
      requestAnimationFrame(function () {
        var itemW = 84, center = Math.min(window.innerWidth, 480) / 2;
        var rnd = (Math.random() - 0.5) * 30;
        var tx = -(winnerIndex * itemW - center + itemW / 2 + rnd);
        track.style.transition = 'transform 4s cubic-bezier(0.12, 0.75, 0.12, 1)';
        track.style.transform = 'translateX(' + tx + 'px)';

        setTimeout(function () {
          if (track.children[winnerIndex]) track.children[winnerIndex].classList.add('winner');
          setTimeout(function () {
            if (caseId === 'free') currentUser.last_free = Date.now();
            if (prize.name.indexOf('★') !== -1) {
              currentUser.balance = (currentUser.balance || 0) + prize.value;
            } else {
              if (!currentUser.inventory) currentUser.inventory = [];
              currentUser.inventory.unshift({
                id: Date.now() + Math.random(),
                name: prize.name, value: prize.value, nft: !!prize.nft, from: caseId
              });
            }
            pushDrop(prize);
            saveUser();
            renderUser();
            renderCases();
            document.getElementById('spinOverlay').classList.remove('show');
            opening = false;

            document.getElementById('resultGlow').style.background = '#6c5ce7';
            document.getElementById('resultIcon').innerHTML = '<img src="' + iconFor(prize.name) + '" alt="">';
            document.getElementById('resultName').textContent = prize.name + (prize.nft ? ' · NFT' : '');
            document.getElementById('resultValue').textContent = '+' + prize.value + ' ★';
            document.getElementById('modalResult').classList.add('show');
          }, 500);
        }, 4100);
      });
    });
  }

  document.getElementById('btnCloseResult').onclick = function () {
    document.getElementById('modalResult').classList.remove('show');
  };

  // ===== Inventory =====
  function renderInventory() {
    var grid = document.getElementById('inventoryGrid');
    var inv = currentUser.inventory || [];
    if (!inv.length) {
      grid.innerHTML = '<div class="empty-state">Пока пусто. Открой кейс!</div>';
      return;
    }
    grid.innerHTML = '';
    inv.forEach(function (item, idx) {
      var row = document.createElement('div');
      row.className = 'inv-row' + (item.nft ? ' nft' : '');
      row.innerHTML =
        '<div class="inv-pic"><img src="' + iconFor(item.name) + '" alt=""></div>' +
        '<div class="inv-info"><div class="inv-name">' + item.name + '</div>' +
        '<div class="inv-sub">' + (item.nft ? 'NFT-подарок' : 'Подарок') + '</div></div>' +
        '<div class="inv-val">' + item.value + ' ★</div>';
      row.onclick = function () { openItem(item, idx); };
      grid.appendChild(row);
    });
  }

  function openItem(item, idx) {
    selectedItem = { item: item, idx: idx };
    document.getElementById('itemPreview').innerHTML = '<img src="' + iconFor(item.name) + '" alt="">';
    document.getElementById('itemName').textContent = item.name;
    document.getElementById('itemValue').textContent = item.value + ' ★';
    document.getElementById('btnSellItem').textContent = 'Продать за ' + item.value + ' ★';
    document.getElementById('modalItem').classList.add('show');
  }

  document.getElementById('btnCloseItem').onclick = function () {
    document.getElementById('modalItem').classList.remove('show');
  };

  document.getElementById('btnSellItem').onclick = function () {
    if (!selectedItem) return;
    var item = selectedItem.item;
    currentUser.balance = (currentUser.balance || 0) + item.value;
    currentUser.inventory.splice(selectedItem.idx, 1);
    saveUser();
    renderUser();
    renderInventory();
    document.getElementById('modalItem').classList.remove('show');
    toast('Продано +' + item.value + ' ★', 'success');
  };

  document.getElementById('btnWithdrawItem').onclick = function () {
    if (!selectedItem) return;
    var item = selectedItem.item;
    var minStars = 200;
    // allow withdraw of gift; admin must approve
    if (!db) { toast('Нет связи с сервером', 'error'); return; }
    db.collection('withdraws').add({
      uid: currentUser.id,
      username: currentUser.username || '',
      first_name: currentUser.first_name || '',
      item_name: item.name,
      item_value: item.value,
      item_nft: !!item.nft,
      item_id: item.id,
      status: 'pending',
      ts: Date.now()
    }).then(function () {
      // remove from inventory pending
      currentUser.inventory.splice(selectedItem.idx, 1);
      saveUser();
      renderInventory();
      document.getElementById('modalItem').classList.remove('show');
      toast('Заявка на вывод отправлена', 'success');
    }).catch(function () { toast('Ошибка заявки', 'error'); });
  };

  // ===== Leaderboard =====
  function renderLeaderboard() {
    var box = document.getElementById('leaderboard');
    box.innerHTML = '<div class="empty-state">Загрузка...</div>';
    if (!db) {
      box.innerHTML = '<div class="empty-state">Нет данных</div>';
      return;
    }
    db.collection('users').orderBy('total_spent', 'desc').limit(20).get().then(function (snap) {
      if (snap.empty) {
        box.innerHTML = '<div class="empty-state">Пока пусто</div>';
        return;
      }
      box.innerHTML = '';
      var rank = 0;
      snap.forEach(function (doc) {
        rank++;
        var d = doc.data();
        var spent = d.total_spent || 0;
        if (spent <= 0 && rank > 5) return;
        var row = document.createElement('div');
        row.className = 'lb-row' + (rank === 1 ? ' top1' : rank === 2 ? ' top2' : rank === 3 ? ' top3' : '');
        var av = d.photo_url
          ? '<img src="' + d.photo_url + '" alt="">'
          : ((d.first_name || '?')[0] || '?').toUpperCase();
        row.innerHTML =
          '<div class="lb-rank">' + rank + '</div>' +
          '<div class="lb-av">' + av + '</div>' +
          '<div class="lb-info"><div class="lb-name">' + (d.first_name || 'Игрок') + '</div>' +
          '<div class="lb-spent">слито ★</div></div>' +
          '<div class="lb-val">' + spent.toLocaleString() + '</div>';
        box.appendChild(row);
      });
      if (!box.children.length) box.innerHTML = '<div class="empty-state">Пока пусто</div>';
    }).catch(function () {
      box.innerHTML = '<div class="empty-state">Ошибка загрузки</div>';
    });
  }

  // ===== Profile =====
  function renderProfile() {
    var card = document.getElementById('profileCard');
    var av = currentUser.photo_url
      ? '<img src="' + currentUser.photo_url + '" alt="">'
      : ((currentUser.first_name || '?')[0] || '?').toUpperCase();
    card.innerHTML =
      '<div class="big-av">' + av + '</div>' +
      '<div class="p-name">' + (currentUser.first_name || 'Игрок') + '</div>' +
      '<div class="p-id">ID: ' + currentUser.id + (currentUser.username ? ' · @' + currentUser.username : '') + '</div>' +
      '<div class="profile-stats">' +
      '<div class="p-stat"><div class="ps-val">' + (currentUser.balance || 0) + '</div><div class="ps-label">Баланс ★</div></div>' +
      '<div class="p-stat"><div class="ps-val">' + ((currentUser.inventory || []).length) + '</div><div class="ps-label">Предметов</div></div>' +
      '<div class="p-stat"><div class="ps-val">' + (currentUser.total_deposited || 0) + '</div><div class="ps-label">Пополнено</div></div>' +
      '<div class="p-stat"><div class="ps-val">' + (currentUser.total_spent || 0) + '</div><div class="ps-label">Слито ★</div></div>' +
      '</div>';
  }

  // ===== Games =====
  function bindGames() {
    document.querySelectorAll('.game-banner').forEach(function (card) {
      function open() { openGame(card.getAttribute('data-game')); }
      card.onclick = open;
      var btn = card.querySelector('.gb-play');
      if (btn) btn.onclick = function (e) { e.stopPropagation(); open(); };
    });
  }

  function openGame(type) {
    var titles = { roulette: 'Рулетка', upgrade: 'Апгрейд', crash: 'Краш' };
    document.getElementById('gameTitle').textContent = titles[type] || 'Игра';
    var body = document.getElementById('gameBody');
    if (type === 'roulette') {
      body.innerHTML = '<div class="form-stack"><label>Ставка (★)</label><input type="number" id="betAmount" value="10" min="1"/>' +
        '<label>Цвет</label><select id="betChoice"><option value="red">Красное ×2</option><option value="black">Чёрное ×2</option><option value="green">Зелёное ×14</option></select>' +
        '<button class="btn-main" id="btnBet">Поставить</button><div id="gameResult"></div></div>';
    } else if (type === 'upgrade') {
      body.innerHTML = '<div class="form-stack"><label>Ставка (★)</label><input type="number" id="betAmount" value="10" min="1"/>' +
        '<label>Множитель</label><input type="number" id="betTarget" value="2" min="1.1" max="10" step="0.1"/>' +
        '<button class="btn-main" id="btnBet">Апгрейд</button><div id="gameResult"></div></div>';
    } else {
      body.innerHTML = '<div class="form-stack"><label>Ставка (★)</label><input type="number" id="betAmount" value="10" min="1"/>' +
        '<label>Цель (×)</label><input type="number" id="betTarget" value="1.5" min="1.01" max="50" step="0.01"/>' +
        '<button class="btn-main" id="btnBet">Играть</button><div id="gameResult"></div></div>';
    }
    document.getElementById('btnBet').onclick = function () { playGame(type); };
    document.getElementById('modalGame').classList.add('show');
  }

  document.getElementById('btnCloseGame').onclick = function () {
    document.getElementById('modalGame').classList.remove('show');
  };

  function playGame(type) {
    var amount = parseInt(document.getElementById('betAmount').value, 10) || 0;
    if (amount < 1) { toast('Минимум 1 ★', 'error'); return; }
    if ((currentUser.balance || 0) < amount) { toast('Недостаточно ★', 'error'); return; }
    currentUser.balance -= amount;
    currentUser.total_spent = (currentUser.total_spent || 0) + amount;
    var win = 0, result = '';
    if (type === 'roulette') {
      var choice = document.getElementById('betChoice').value;
      var r = Math.random();
      var outcome = r < 0.027 ? 'green' : r < 0.5135 ? 'red' : 'black';
      var names = { red: 'Красное', black: 'Чёрное', green: 'Зелёное' };
      if (choice === outcome) { win = Math.floor(amount * (outcome === 'green' ? 14 : 2)); result = names[outcome] + ' — WIN'; }
      else result = names[outcome] + ' — LOSE';
    } else if (type === 'upgrade') {
      var mult = Math.max(1.1, Math.min(10, parseFloat(document.getElementById('betTarget').value) || 2));
      if (Math.random() < 1 / mult) { win = Math.floor(amount * mult); result = '×' + mult + ' WIN'; }
      else result = '×' + mult + ' LOSE';
    } else {
      var rr = Math.random();
      var crash = rr < 0.04 ? 1.0 : Math.min(50, Math.max(1.01, +(0.99 / (1 - rr)).toFixed(2)));
      var cashout = parseFloat(document.getElementById('betTarget').value) || 1.5;
      if (cashout <= crash) { win = Math.floor(amount * cashout); result = 'Crash @' + crash + 'x WIN'; }
      else result = 'Crash @' + crash + 'x LOSE';
    }
    currentUser.balance += win;
    saveUser();
    renderUser();
    var el = document.getElementById('gameResult');
    el.className = 'game-result ' + (win > 0 ? 'win' : 'lose');
    el.textContent = result + (win > 0 ? ' (+' + win + ' ★)' : '');
  }

  // ===== Real Stars deposit =====
  document.getElementById('btnDeposit').onclick = function () {
    document.getElementById('modalDeposit').classList.add('show');
  };
  document.getElementById('btnCloseDeposit').onclick = function () {
    document.getElementById('modalDeposit').classList.remove('show');
  };
  document.querySelectorAll('.preset').forEach(function (btn) {
    btn.onclick = function () {
      document.getElementById('depositAmount').value = btn.getAttribute('data-amt');
      document.querySelectorAll('.preset').forEach(function (b) { b.classList.remove('active'); });
      btn.classList.add('active');
    };
  });

  document.getElementById('btnDoDeposit').onclick = function () {
    var amount = parseInt(document.getElementById('depositAmount').value, 10) || 0;
    if (amount < 50) { toast('Минимум 50 Stars', 'error'); return; }

    // Request invoice from bot via Telegram
    // Mini App: sendData to bot OR use openTelegramLink with bot deep link
    // Best: bot createInvoiceLink via our approach - open bot with payload
    if (tg && tg.openInvoice) {
      // Need invoice link from bot - request via switchInline or deep link
      // Fallback: tell user to pay via bot command
      toast('Счёт создаётся...', 'success');
      // Write pending topup request; bot watches or user uses /pay
      if (db) {
        db.collection('topups').add({
          uid: currentUser.id,
          amount: amount,
          status: 'requested',
          ts: Date.now()
        }).catch(function () {});
      }
      // Open bot with start param
      var botUser = 'IzbrannikStar_bot';
      if (tg.openTelegramLink) {
        tg.openTelegramLink('https://t.me/' + botUser + '?start=pay_' + amount);
      } else {
        window.open('https://t.me/' + botUser + '?start=pay_' + amount, '_blank');
      }
      document.getElementById('modalDeposit').classList.remove('show');
    } else {
      // Dev fallback: local credit (not for production)
      if (!tg || !tg.initDataUnsafe || !tg.initDataUnsafe.user) {
        currentUser.balance = (currentUser.balance || 0) + amount;
        currentUser.total_deposited = (currentUser.total_deposited || 0) + amount;
        saveUser();
        renderUser();
        toast('+' + amount + ' ★ (тест)', 'success');
        document.getElementById('modalDeposit').classList.remove('show');
      } else {
        toast('Откройте через Telegram', 'error');
      }
    }
  };

  // Listen for balance updates (after payment)
  // Poll user doc for balance changes after topup
  setInterval(function () {
    if (!userRef) return;
    userRef.get().then(function (snap) {
      if (!snap.exists) return;
      var d = snap.data();
      if (typeof d.balance === 'number' && d.balance !== currentUser.balance) {
        // only update if server is higher from payment / admin
        if (d.balance > currentUser.balance || d.pending_credit) {
          var old = currentUser.balance;
          currentUser.balance = d.balance;
          if (d.pending_credit) {
            currentUser.balance += d.pending_credit;
            userRef.update({ pending_credit: 0, balance: currentUser.balance });
          }
          if (d.inventory) currentUser.inventory = d.inventory;
          if (d.total_deposited) currentUser.total_deposited = d.total_deposited;
          saveLocal();
          renderUser();
          if (currentUser.balance > old) toast('Баланс обновлён: ' + currentUser.balance + ' ★', 'success');
        }
      }
    }).catch(function () {});
  }, 8000);

  init();
})();
