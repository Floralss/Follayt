/* Real Telegram gift images via Fragment CDN + changes.tg API */
(function (w) {
  function frag(slug) {
    return 'https://fragment.com/file/gifts/' + slug + '/thumb.webp';
  }
  function apiPng(slug) {
    return 'https://api.changes.tg/original/' + slug + '.png?size=128';
  }
  function starSvg() {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="#2a2410"/><path d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z" fill="#f0c14b"/></svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }

  // slug = fragment folder name (lowercase, no spaces/apostrophe)
  var G = {
    // Stars (currency)
    '1 Star':  { value: 1,   nft: false, img: starSvg() },
    '2 Stars': { value: 2,   nft: false, img: starSvg() },
    '5 Stars': { value: 5,   nft: false, img: starSvg() },

    // Classic-priced + real collectible thumbs
    'Toy Bear':       { value: 15,  nft: false, img: frag('toybear'), slug: 'toybear' },
    'Eternal Rose':   { value: 25,  nft: false, img: frag('eternalrose'), slug: 'eternalrose' },
    'Homemade Cake':  { value: 50,  nft: false, img: frag('homemadecake'), slug: 'homemadecake' },
    'Berry Box':      { value: 50,  nft: false, img: frag('berrybox'), slug: 'berrybox' },
    'Cookie Heart':   { value: 50,  nft: false, img: frag('cookieheart'), slug: 'cookieheart' },
    'B-Day Candle':   { value: 50,  nft: false, img: frag('bdaycandle'), slug: 'bdaycandle' },
    'Love Candle':    { value: 50,  nft: false, img: frag('lovecandle'), slug: 'lovecandle' },
    'Desk Calendar':  { value: 50,  nft: false, img: frag('deskcalendar'), slug: 'deskcalendar' },

    // Market-style NFTs (real TG collections)
    'Ice Cream':      { value: 505, nft: true, img: frag('icecream'), slug: 'icecream' },
    'Top Hat':        { value: 530, nft: true, img: frag('tophat'), slug: 'tophat' },
    'Hypno Lollipop': { value: 544, nft: true, img: frag('hypnolollipop'), slug: 'hypnolollipop' },
    'Lunar Snake':    { value: 549, nft: true, img: frag('lunarsnake'), slug: 'lunarsnake' },
    'Jester Hat':     { value: 550, nft: true, img: frag('jesterhat'), slug: 'jesterhat' },
    'Party Sparkler': { value: 587, nft: true, img: frag('partysparkler'), slug: 'partysparkler' },
    'Snow Mittens':   { value: 500, nft: true, img: frag('snowmittens'), slug: 'snowmittens' },
    'Jack-in-the-Box':{ value: 500, nft: true, img: frag('jackinthebox'), slug: 'jackinthebox' },
    'Spy Agaric':     { value: 814, nft: true, img: frag('spyagaric'), slug: 'spyagaric' },
    'Kissed Frog':    { value: 721, nft: true, img: frag('kissedfrog'), slug: 'kissedfrog' },
    'Jelly Bunny':    { value: 721, nft: true, img: frag('jellybunny'), slug: 'jellybunny' },
    'Trapped Heart':  { value: 690, nft: true, img: frag('trappedheart'), slug: 'trappedheart' },
    'Scared Cat':     { value: 721, nft: true, img: frag('scaredcat'), slug: 'scaredcat' },
    'Magic Potion':   { value: 600, nft: true, img: frag('magicpotion'), slug: 'magicpotion' },
    'Genie Lamp':     { value: 650, nft: true, img: frag('genielamp'), slug: 'genielamp' },
    'Voodoo Doll':    { value: 655, nft: true, img: frag('voodoodoll'), slug: 'voodoodoll' },
    'Crystal Ball':   { value: 666, nft: true, img: frag('crystalball'), slug: 'crystalball' },
    'Flying Broom':   { value: 650, nft: true, img: frag('flyingbroom'), slug: 'flyingbroom' },
    'Witch Hat':      { value: 550, nft: true, img: frag('witchhat'), slug: 'witchhat' },
    'Santa Hat':      { value: 500, nft: true, img: frag('santahat'), slug: 'santahat' },
    'Precious Peach': { value: 900, nft: true, img: frag('preciouspeach'), slug: 'preciouspeach' },
    'Plush Pepe':     { value: 900, nft: true, img: frag('plushpepe'), slug: 'plushpepe' },
    "Durov's Cap":    { value: 1000,nft: true, img: frag('durovscap'), slug: 'durovscap' },
    'Perfume Bottle': { value: 710, nft: true, img: frag('perfumebottle'), slug: 'perfumebottle' },
    'Vintage Cigar':  { value: 700, nft: true, img: frag('vintagecigar'), slug: 'vintagecigar' },
    'Skull Flower':   { value: 600, nft: true, img: frag('skullflower'), slug: 'skullflower' },
    'Evil Eye':       { value: 550, nft: true, img: frag('evileye'), slug: 'evileye' },
    'Hex Pot':        { value: 550, nft: true, img: frag('hexpot'), slug: 'hexpot' },
    'Sharp Tongue':   { value: 600, nft: true, img: frag('sharptongue'), slug: 'sharptongue' },
    'Signet Ring':    { value: 700, nft: true, img: frag('signetring'), slug: 'signetring' },
    'Spiced Wine':    { value: 500, nft: true, img: frag('spicedwine'), slug: 'spicedwine' },
    'Bunny Muffin':   { value: 510, nft: true, img: frag('bunnymuffin'), slug: 'bunnymuffin' },
    'Astral Shard':   { value: 800, nft: true, img: frag('astralshard'), slug: 'astralshard' },
    'Hanging Star':   { value: 505, nft: true, img: frag('hangingstar'), slug: 'hangingstar' }
  };

  function giftIcon(name) {
    var g = G[name];
    if (g && g.img) return g.img;
    return starSvg();
  }
  function giftInfo(name) {
    return G[name] || { value: 10, nft: false, img: starSvg() };
  }

  // Case cover images
  var CASE_IMG = {
    free: frag('bdaycandle'),
    cheap: frag('toybear'),
    selected: frag('icecream'),
    vip: frag('plushpepe')
  };

  // Game mode icons (SVG data-uri, not letters)
  function svgIcon(paths, bg) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64"><rect width="64" height="64" rx="14" fill="' + (bg||'#1a1a26') + '"/>' + paths + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }
  var GAME_IMG = {
    roulette: svgIcon('<circle cx="32" cy="32" r="20" fill="none" stroke="#e74c3c" stroke-width="8" stroke-dasharray="20 12"/><circle cx="32" cy="32" r="20" fill="none" stroke="#222" stroke-width="8" stroke-dasharray="20 12" stroke-dashoffset="16"/><circle cx="32" cy="32" r="6" fill="#f0c14b"/>', '#2a1a28'),
    crash: svgIcon('<path d="M32 8 L40 40 L32 34 L24 40 Z" fill="#e74c3c"/><rect x="28" y="38" width="8" height="10" fill="#c0c0c0"/><path d="M26 50 L22 58 M38 50 L42 58" stroke="#f0c14b" stroke-width="3" stroke-linecap="round"/>', '#1a1018'),
    upgrade: svgIcon('<path d="M32 12 L40 28 H24 Z" fill="#7c6cf0"/><rect x="26" y="28" width="12" height="20" rx="2" fill="#a29bfe"/><path d="M20 52 H44" stroke="#f0c14b" stroke-width="3"/>', '#1a1830'),
    plinko: svgIcon('<circle cx="20" cy="18" r="3" fill="#6c5ce7"/><circle cx="32" cy="18" r="3" fill="#6c5ce7"/><circle cx="44" cy="18" r="3" fill="#6c5ce7"/><circle cx="26" cy="30" r="3" fill="#6c5ce7"/><circle cx="38" cy="30" r="3" fill="#6c5ce7"/><circle cx="32" cy="42" r="5" fill="#f0c14b"/>', '#101828'),
    pickaxe: svgIcon('<path d="M18 20 L32 28 L46 20" stroke="#c0c0c0" stroke-width="4" fill="none"/><rect x="30" y="28" width="4" height="24" fill="#8B6914"/>', '#2a2010')
  };

  w.GIFTS = G;
  w.giftIcon = giftIcon;
  w.giftInfo = giftInfo;
  w.CASE_IMG = CASE_IMG;
  w.GAME_IMG = GAME_IMG;
})(window);
