// API selection:
// - By default, use production API (works on localhost too).
// - Only use local API when explicitly enabled (so localhost doesn't break auth).
const useLocalApi =
  window.location.hostname === 'localhost' &&
  (new URLSearchParams(window.location.search).get('localApi') === '1' ||
    localStorage.getItem('bb_use_local_api') === '1');

const BUILDVOLT_API = useLocalApi
  ? 'http://localhost:3001/api'
  : 'https://buildbot-production-3f70.up.railway.app/api';

window.BB_API = BUILDVOLT_API;
window.BB_ORIGIN = BUILDVOLT_API.replace(/\/api\/?$/, '');
window.BB_SUPPORT_EMAIL = 'workwithneehal@gmail.com';

// Session TTL — must match server JWT expiry (7 days)
window.BB_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000;

window.BB_setTokenSession = function (token, store) {
  localStorage.setItem('bb_token', token);
  if (store) localStorage.setItem('bb_store', JSON.stringify(store));
  localStorage.setItem('bb_token_expires', String(Date.now() + window.BB_TOKEN_TTL_MS));
};

window.BB_refreshTokenExpiry = function () {
  localStorage.setItem('bb_token_expires', String(Date.now() + window.BB_TOKEN_TTL_MS));
};

window.BB_isTokenExpired = function () {
  const expires = localStorage.getItem('bb_token_expires');
  if (!expires) return false;
  return Date.now() > Number(expires);
};

window.BB_clearSession = function () {
  localStorage.removeItem('bb_token');
  localStorage.removeItem('bb_store');
  localStorage.removeItem('bb_token_expires');
};

window.BB_getWidgetScriptUrl = function (storeId) {
  const origin = window.BB_ORIGIN || BUILDVOLT_API.replace(/\/api\/?$/, '');
  return `<script src="${origin}/widget.js" data-store-id="${storeId}"><\/script>`;
};

// Global Loader Interceptor
let fetchCount = 0;
const originalFetch = window.fetch;
window.fetch = async function(...args) {
  fetchCount++;
  let loader = document.getElementById('global-loader');
  if (!loader) {
    loader = document.createElement('div');
    loader.id = 'global-loader';
    loader.innerHTML = '<div style="width:20px;height:20px;border:3px solid var(--primary,#7c6af7);border-top-color:transparent;border-radius:50%;animation:bb-spin 1s linear infinite;"></div><style>@keyframes bb-spin { 100% { transform: rotate(360deg); } }</style>';
    loader.style.cssText = 'position:fixed;top:20px;right:20px;background:var(--surface,#1a1d27);border:1px solid var(--border,#2a2d3e);padding:12px;border-radius:50%;z-index:999999;display:flex;align-items:center;justify-content:center;box-shadow:0 4px 12px rgba(0,0,0,0.5);transition:opacity 0.2s;';
    if(document.body) document.body.appendChild(loader);
  }
  if(loader) {
    loader.style.display = 'flex';
    loader.style.opacity = '1';
  }
  
  try {
    return await originalFetch(...args);
  } finally {
    fetchCount--;
    if (fetchCount <= 0 && loader) {
      fetchCount = 0;
      loader.style.opacity = '0';
      setTimeout(() => { if(fetchCount <= 0) loader.style.display = 'none'; }, 200);
    }
  }
};