/* Gift catalog — English names, TG-like prices, SVG icons (no emoji) */
(function (w) {
  function svg(body, bg) {
    var s = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">' +
      '<rect width="64" height="64" rx="14" fill="' + (bg || '#1a1a26') + '"/>' + body + '</svg>';
    return 'data:image/svg+xml,' + encodeURIComponent(s);
  }

  var G = {
    // Classic TG gifts
    'Teddy Bear':   { value: 15,  nft: false, icon: svg('<circle cx="32" cy="28" r="12" fill="#c4a574"/><circle cx="26" cy="18" r="7" fill="#c4a574"/><circle cx="38" cy="18" r="7" fill="#c4a574"/><circle cx="28" cy="26" r="2" fill="#333"/><circle cx="36" cy="26" r="2" fill="#333"/>', '#2a2218') },
    'Heart':        { value: 15,  nft: false, icon: svg('<path d="M32 48 L18 34 Q12 28 18 22 Q24 16 32 24 Q40 16 46 22 Q52 28 46 34 Z" fill="#ff4d6d"/>', '#2a1520') },
    'Rose':         { value: 25,  nft: false, icon: svg('<circle cx="32" cy="24" r="10" fill="#e74c3c"/><rect x="30" y="32" width="4" height="18" fill="#27ae60"/><path d="M30 40 Q20 36 22 30" stroke="#27ae60" fill="none" stroke-width="2"/>', '#1a2818') },
    'Gift Box':     { value: 25,  nft: false, icon: svg('<rect x="14" y="28" width="36" height="24" rx="3" fill="#6c5ce7"/><rect x="12" y="22" width="40" height="10" rx="2" fill="#a29bfe"/><rect x="30" y="22" width="4" height="30" fill="#fd79a8"/>', '#1a1830') },
    'Cake':         { value: 50,  nft: false, icon: svg('<rect x="16" y="28" width="32" height="20" rx="3" fill="#f5d0a9"/><rect x="18" y="22" width="28" height="10" rx="2" fill="#ff9ff3"/><circle cx="26" cy="18" r="3" fill="#ff6b6b"/><circle cx="32" cy="16" r="3" fill="#ff6b6b"/><circle cx="38" cy="18" r="3" fill="#ff6b6b"/>', '#2a2018') },
    'Bouquet':      { value: 50,  nft: false, icon: svg('<circle cx="24" cy="22" r="8" fill="#e74c3c"/><circle cx="36" cy="20" r="8" fill="#e91e63"/><circle cx="30" cy="28" r="7" fill="#9b59b6"/><rect x="29" y="34" width="6" height="16" fill="#27ae60"/>', '#1a2818') },
    'Diamond':      { value: 100, nft: false, icon: svg('<path d="M32 12 L48 28 L32 52 L16 28 Z" fill="#7fdbff" stroke="#4fc3f7" stroke-width="2"/>', '#0a1a28') },
    'Star':         { value: 50,  nft: false, icon: svg('<path d="M32 10 L38 24 L54 26 L42 36 L46 52 L32 44 L18 52 L22 36 L10 26 L26 24 Z" fill="#f0c14b"/>', '#2a2410') },
    'Champagne':    { value: 50,  nft: false, icon: svg('<rect x="26" y="18" width="12" height="28" rx="2" fill="#f5e6c8"/><rect x="28" y="12" width="8" height="8" fill="#c0c0c0"/><rect x="26" y="40" width="12" height="6" fill="#27ae60"/>', '#1a2018') },

    // Market-style NFTs (cheaper range)
    'Cupcake':      { value: 460, nft: true, icon: svg('<ellipse cx="32" cy="40" rx="14" ry="8" fill="#e8b4a0"/><path d="M18 36 Q32 20 46 36" fill="#ff9ff3"/><circle cx="32" cy="22" r="4" fill="#ff6b6b"/>', '#2a1820') },
    'Snowman':      { value: 490, nft: true, icon: svg('<circle cx="32" cy="40" r="12" fill="#e8eef5"/><circle cx="32" cy="22" r="9" fill="#e8eef5"/><circle cx="29" cy="20" r="1.5" fill="#333"/><circle cx="35" cy="20" r="1.5" fill="#333"/><path d="M30 24 L34 24" stroke="#e67e22" stroke-width="2"/>', '#152028') },
    'Socks':        { value: 500, nft: true, icon: svg('<path d="M24 16 h10 v20 l8 10 h-12 l-6-8 z" fill="#3498db"/><path d="M24 16 h10 v6 h-10 z" fill="#e74c3c"/>', '#101828') },
    'Flamingo':     { value: 510, nft: true, icon: svg('<ellipse cx="36" cy="32" rx="12" ry="8" fill="#ff8fab"/><path d="M24 28 Q16 20 20 12" stroke="#ff8fab" fill="none" stroke-width="3"/><circle cx="20" cy="12" r="3" fill="#ff8fab"/><rect x="34" y="38" width="3" height="14" fill="#f0c14b"/>', '#2a1520') },
    'Ice Cream':    { value: 505, nft: true, icon: svg('<path d="M22 30 h20 l-10 22 z" fill="#e8b86d"/><ellipse cx="32" cy="26" rx="12" ry="10" fill="#ff9ff3"/><circle cx="32" cy="18" r="5" fill="#fff"/>', '#2a2018') },
    'Top Hat':      { value: 530, nft: true, icon: svg('<rect x="18" y="28" width="28" height="6" rx="1" fill="#222"/><rect x="24" y="12" width="16" height="18" fill="#111"/><rect x="24" y="24" width="16" height="3" fill="#e74c3c"/>', '#1a1a1a') },
    'Lollipop':     { value: 544, nft: true, icon: svg('<circle cx="32" cy="24" r="12" fill="#ff6b9d"/><circle cx="32" cy="24" r="7" fill="#fff" opacity=".3"/><rect x="30" y="36" width="4" height="16" fill="#f5d0a9"/>', '#2a1520') },
    'Snake':        { value: 549, nft: true, icon: svg('<path d="M12 36 Q24 20 32 32 Q40 44 52 28" stroke="#2ecc71" fill="none" stroke-width="6" stroke-linecap="round"/><circle cx="52" cy="28" r="4" fill="#2ecc71"/>', '#0a2010') },
    'Jester':       { value: 550, nft: true, icon: svg('<path d="M20 28 L32 12 L44 28 L38 28 L38 44 L26 44 L26 28 Z" fill="#9b59b6"/><circle cx="26" cy="14" r="3" fill="#e74c3c"/><circle cx="38" cy="14" r="3" fill="#3498db"/>', '#1a1028') },
    'Sparkler':     { value: 587, nft: true, icon: svg('<rect x="30" y="28" width="4" height="24" fill="#c0c0c0"/><circle cx="32" cy="20" r="8" fill="#f0c14b"/><path d="M32 8 L32 14 M24 16 L28 20 M40 16 L36 20" stroke="#f0c14b" stroke-width="2"/>', '#2a2410') },
    'Bond':         { value: 590, nft: true, icon: svg('<rect x="14" y="18" width="36" height="28" rx="2" fill="#f5f0e0"/><rect x="18" y="24" width="28" height="3" fill="#c0a060"/><rect x="18" y="32" width="20" height="2" fill="#999"/>', '#202018') },
    'Backpack':     { value: 600, nft: true, icon: svg('<rect x="18" y="20" width="28" height="32" rx="4" fill="#e67e22"/><rect x="24" y="28" width="16" height="12" rx="2" fill="#d35400"/><path d="M22 20 Q22 12 32 12 Q42 12 42 20" stroke="#e67e22" fill="none" stroke-width="3"/>', '#2a1a08') },
    'Gingerbread':  { value: 610, nft: true, icon: svg('<circle cx="32" cy="18" r="8" fill="#c4a574"/><rect x="24" y="24" width="16" height="18" rx="3" fill="#c4a574"/><circle cx="28" cy="16" r="1.5" fill="#333"/><circle cx="36" cy="16" r="1.5" fill="#333"/>', '#2a2010') },
    'Rocket':       { value: 650, nft: true, icon: svg('<path d="M32 8 L40 36 L32 32 L24 36 Z" fill="#e74c3c"/><rect x="28" y="32" width="8" height="12" fill="#c0c0c0"/><path d="M28 44 L24 52 M36 44 L40 52" stroke="#f0c14b" stroke-width="3"/>', '#1a1010') },
    'Medal':        { value: 655, nft: true, icon: svg('<circle cx="32" cy="34" r="12" fill="#f0c14b"/><circle cx="32" cy="34" r="8" fill="#d4a017"/><path d="M24 12 L28 28 M40 12 L36 28" stroke="#e74c3c" stroke-width="4"/>', '#2a2410') },
    'Lantern':      { value: 666, nft: true, icon: svg('<rect x="22" y="20" width="20" height="28" rx="3" fill="#e67e22"/><rect x="26" y="26" width="12" height="16" fill="#f0c14b"/><rect x="28" y="12" width="8" height="8" fill="#c0c0c0"/>', '#2a1a08') },
    'Liberty':      { value: 690, nft: true, icon: svg('<rect x="28" y="28" width="8" height="24" fill="#95a5a6"/><path d="M20 28 L32 12 L44 28 Z" fill="#bdc3c7"/><rect x="18" y="48" width="28" height="4" fill="#7f8c8d"/>', '#1a2028') },
    'Cherry Cake':  { value: 700, nft: true, icon: svg('<rect x="16" y="30" width="32" height="18" rx="3" fill="#f5d0a9"/><ellipse cx="32" cy="30" rx="16" ry="6" fill="#ff9ff3"/><circle cx="32" cy="24" r="5" fill="#e74c3c"/>', '#2a1820') },
    'Cool Dog':     { value: 709, nft: true, icon: svg('<ellipse cx="32" cy="34" rx="14" ry="12" fill="#c4a574"/><circle cx="32" cy="20" r="10" fill="#c4a574"/><rect x="24" y="18" width="16" height="4" fill="#111"/><circle cx="28" cy="22" r="1.5" fill="#333"/><circle cx="36" cy="22" r="1.5" fill="#333"/>', '#2a2010') },
    'Money Bouquet':{ value: 710, nft: true, icon: svg('<rect x="20" y="16" width="24" height="14" rx="2" fill="#27ae60"/><rect x="22" y="20" width="20" height="6" fill="#2ecc71"/><rect x="30" y="30" width="4" height="18" fill="#27ae60"/>', '#0a2010') },
    'Clover':       { value: 721, nft: true, icon: svg('<circle cx="32" cy="22" r="7" fill="#2ecc71"/><circle cx="24" cy="30" r="7" fill="#2ecc71"/><circle cx="40" cy="30" r="7" fill="#2ecc71"/><circle cx="32" cy="36" r="7" fill="#2ecc71"/>', '#0a2010') },
    'Bunny':        { value: 721, nft: true, icon: svg('<ellipse cx="32" cy="36" rx="12" ry="14" fill="#f5f0e8"/><ellipse cx="24" cy="16" rx="5" ry="12" fill="#f5f0e8"/><ellipse cx="40" cy="16" rx="5" ry="12" fill="#f5f0e8"/><circle cx="28" cy="34" r="2" fill="#333"/><circle cx="36" cy="34" r="2" fill="#333"/>', '#202018') },
    'Pepe Plush':   { value: 900, nft: true, icon: svg('<ellipse cx="32" cy="34" rx="16" ry="14" fill="#2ecc71"/><circle cx="32" cy="22" r="12" fill="#2ecc71"/><circle cx="26" cy="20" r="3" fill="#fff"/><circle cx="38" cy="20" r="3" fill="#fff"/><circle cx="26" cy="20" r="1.5" fill="#333"/><circle cx="38" cy="20" r="1.5" fill="#333"/>', '#0a2010') },
    'Durov Cap':    { value: 1000,nft: true, icon: svg('<ellipse cx="32" cy="36" rx="20" ry="8" fill="#2980b9"/><path d="M16 36 Q16 18 32 16 Q48 18 48 36" fill="#3498db"/><rect x="14" y="34" width="36" height="5" fill="#1a5276"/>', '#0a1828') },
    'Light Sword':  { value: 721, nft: true, icon: svg('<rect x="30" y="12" width="4" height="32" fill="#7fdbff"/><rect x="26" y="44" width="12" height="8" rx="1" fill="#c0c0c0"/>', '#0a1a28') },
    'Spy Ape':      { value: 814, nft: true, icon: svg('<ellipse cx="32" cy="36" rx="14" ry="12" fill="#8B6914"/><circle cx="32" cy="22" r="11" fill="#8B6914"/><rect x="22" y="18" width="20" height="6" fill="#111"/><circle cx="26" cy="28" r="2" fill="#333"/><circle cx="38" cy="28" r="2" fill="#333"/>', '#2a2010') },
    'Magic Book':   { value: 600, nft: true, icon: svg('<rect x="16" y="14" width="32" height="36" rx="2" fill="#6c5ce7"/><rect x="20" y="18" width="24" height="28" fill="#a29bfe"/><path d="M24 28 h16 M24 34 h12" stroke="#6c5ce7" stroke-width="2"/>', '#1a1830') },

    // Stars as currency drops
    '1 Star':  { value: 1, nft: false, icon: svg('<path d="M32 12 L36 24 L48 26 L38 34 L42 48 L32 40 L22 48 L26 34 L16 26 L28 24 Z" fill="#f0c14b"/>', '#2a2410') },
    '2 Stars': { value: 2, nft: false, icon: svg('<path d="M32 12 L36 24 L48 26 L38 34 L42 48 L32 40 L22 48 L26 34 L16 26 L28 24 Z" fill="#f0c14b"/>', '#2a2410') },
    '5 Stars': { value: 5, nft: false, icon: svg('<path d="M32 12 L36 24 L48 26 L38 34 L42 48 L32 40 L22 48 L26 34 L16 26 L28 24 Z" fill="#f0c14b"/>', '#2a2410') }
  };

  function icon(name) {
    return (G[name] && G[name].icon) || svg('<circle cx="32" cy="32" r="12" fill="#6c5ce7"/>', '#1a1a26');
  }
  function info(name) { return G[name] || { value: 10, nft: false, icon: icon(name) }; }

  w.GIFTS = G;
  w.giftIcon = icon;
  w.giftInfo = info;
})(window);
