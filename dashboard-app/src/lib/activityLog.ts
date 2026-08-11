// Client-only admin activity log — never touches the server, matches the
// original admin.html's logActivity()/renderActivityLog()/clearActivityLog()
// which read/wrote localStorage['bb_admin_log'] directly. Capped at 100
// entries, same as the original.
export interface ActivityEntry {
  action: string;
  detail: string;
  at: string;
}

const KEY = "bb_admin_log";
const MAX = 100;

export function getActivityLog(): ActivityEntry[] {
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}

export function logActivity(action: string, detail: string) {
  const log = getActivityLog();
  log.unshift({ action, detail, at: new Date().toISOString() });
  localStorage.setItem(KEY, JSON.stringify(log.slice(0, MAX)));
}

export function clearActivityLog() {
  localStorage.removeItem(KEY);
}
