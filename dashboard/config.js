// API selection:
// - By default, use production API (works on localhost too).
// - Only use local API when explicitly enabled (so localhost doesn't break auth).
const useLocalApi =
  window.location.hostname === 'localhost' &&
  (new URLSearchParams(window.location.search).get('localApi') === '1' ||
    localStorage.getItem('bb_use_local_api') === '1');

const BUILDBOT_API = useLocalApi
  ? 'http://localhost:3001/api'
  : 'https://buildbot-production.up.railway.app/api';

window.BB_API = BUILDBOT_API;

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