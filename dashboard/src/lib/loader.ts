// Tiny external store tracking in-flight API calls, so a global loading
// spinner can render without prop-drilling. Replaces the original
// config.js pattern of monkey-patching window.fetch globally to show/hide
// a floating spinner — same visible behavior, but apiFetch() calls into
// this directly instead of every fetch() on the page (avoids affecting
// unrelated fetches like the Google Identity script).
let count = 0;
const listeners = new Set<() => void>();

export function loaderInc() {
  count++;
  listeners.forEach((l) => l());
}

export function loaderDec() {
  count = Math.max(0, count - 1);
  listeners.forEach((l) => l());
}

export function loaderSubscribe(cb: () => void) {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function loaderSnapshot() {
  return count > 0;
}
