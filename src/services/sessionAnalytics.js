const STORAGE_KEY = 'efw-session-history';
const MAX_HISTORY = 30;

export function recordSessionStart(userId) {
  const history = getHistory();
  history.push({ userId, startedAt: Date.now(), endedAt: null, duration: null, reason: null });
  saveHistory(history.slice(-MAX_HISTORY));
}

export function recordSessionEnd(reason = 'manual') {
  const history = getHistory();
  const last = history[history.length - 1];
  if (last && !last.endedAt) {
    last.endedAt = Date.now();
    last.duration = last.endedAt - last.startedAt;
    last.reason = reason;
    saveHistory(history);
  }
}

export function getAnalytics() {
  const history = getHistory().filter((s) => s.endedAt);
  if (!history.length) return null;

  const now = Date.now();
  const weekAgo = now - 7 * 24 * 60 * 60 * 1000;
  const recent = history.filter((s) => s.startedAt > weekAgo);

  const avgDuration = recent.length
    ? recent.reduce((sum, s) => sum + s.duration, 0) / recent.length
    : 0;

  return {
    totalSessions: history.length,
    sessionsThisWeek: recent.length,
    avgDurationMs: avgDuration,
    lastSession: history[history.length - 1],
    history,
  };
}

export function formatDuration(ms) {
  if (!ms) return '—';
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]');
  } catch {
    return [];
  }
}

function saveHistory(history) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch { /* storage full — ignore */ }
}
