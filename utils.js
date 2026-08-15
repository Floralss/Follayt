// Utility functions for Follayt

function showToast(message, type = 'info') {
  const toasts = document.getElementById('toasts');
  const colors = {
    info: 'bg-primary-700',
    success: 'bg-emerald-600',
    error: 'bg-red-600',
    warning: 'bg-amber-600'
  };
  const toast = document.createElement('div');
  toast.className = `toast ${colors[type] || colors.info} text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 min-w-[260px]`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  toasts.appendChild(toast);
  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transition = 'opacity 0.3s';
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function formatDate(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleString('ru-RU', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

function timeAgo(timestamp) {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'только что';
  if (seconds < 3600) return `${Math.floor(seconds / 60)} мин. назад`;
  if (seconds < 86400) return `${Math.floor(seconds / 3600)} ч. назад`;
  return formatDate(timestamp);
}

function generateId() {
  return Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
}

function truncate(str, len = 60) {
  if (!str) return '';
  return str.length > len ? str.substring(0, len) + '…' : str;
}

// Simple router
const Router = {
  current: 'home',
  params: {},
  go(page, params = {}) {
    this.current = page;
    this.params = params;
    window.location.hash = page + (Object.keys(params).length ? '?' + new URLSearchParams(params).toString() : '');
    if (window.renderApp) window.renderApp();
  },
  parse() {
    const hash = window.location.hash.slice(1) || 'home';
    const [page, query] = hash.split('?');
    this.current = page || 'home';
    this.params = {};
    if (query) {
      new URLSearchParams(query).forEach((v, k) => this.params[k] = v);
    }
  }
};

window.addEventListener('hashchange', () => {
  Router.parse();
  if (window.renderApp) window.renderApp();
});

// Role helpers
function getRoleBadge(role) {
  const map = {
    owner: { text: 'Владелец', class: 'badge-owner' },
    admin: { text: 'Админ', class: 'badge-admin' },
    helper: { text: 'Хелпер', class: 'badge-helper' },
    guarantor: { text: 'Гарант', class: 'badge-guarantor' }
  };
  const r = map[role];
  if (!r) return '';
  return `<span class="inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold text-white ${r.class}">${r.text}</span>`;
}

function hasPermission(user, required) {
  if (!user) return false;
  const hierarchy = { user: 0, guarantor: 1, helper: 2, admin: 3, owner: 4 };
  return (hierarchy[user.role] || 0) >= (hierarchy[required] || 0);
}
