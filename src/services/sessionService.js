import { ref, watch, onUnmounted } from 'vue';
import { useIdle } from '@vueuse/core';
import { supabase } from '@/lib/supabase';

const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const IDLE_TIMEOUT = 30 * 60 * 1000;          // 30 minutes
const WARNING_BEFORE = 5 * 60 * 1000;         // warn 5 min before expiry
const CHECK_INTERVAL = 30_000;                 // check every 30 seconds

export function useSessionManager({ store, onLogout, onShowWarning, onHideWarning } = {}) {
  const sessionStart = ref(store?.state.session?.startedAt || Date.now());
  const warningShown = ref(false);
  const timeRemaining = ref(0);

  const { idle, lastActive } = useIdle(IDLE_TIMEOUT);

  // Force logout when VueUse confirms idle timeout elapsed
  watch(idle, (isIdle) => {
    if (isIdle) performLogout('idle');
  });

  // Multi-tab sync: if another tab clears localStorage (e.g. signs out), log out here too
  const onStorageChange = (e) => {
    if (e.key === 'elliotforwater-admin' && !e.newValue) {
      performLogout('other-tab');
    }
  };
  window.addEventListener('storage', onStorageChange);

  const checkTimeout = () => {
    const now = Date.now();
    const absoluteRemaining = ABSOLUTE_TIMEOUT - (now - sessionStart.value);
    const idleRemaining = IDLE_TIMEOUT - (now - lastActive.value);
    const remaining = Math.min(absoluteRemaining, idleRemaining);

    timeRemaining.value = Math.max(0, remaining);

    if (remaining <= 0) {
      performLogout('timeout');
      return;
    }

    if (remaining <= WARNING_BEFORE && !warningShown.value) {
      warningShown.value = true;
      store?.dispatch('logSessionEvent', { type: 'SESSION_WARNING', meta: { remaining } });
      onShowWarning?.();
    }

    // Check for session fingerprint mismatch (potential hijack)
    if (store?.state.session?.fingerprint) {
      const current = generateFingerprint();
      if (current !== store.state.session.fingerprint) {
        store?.dispatch('logSessionEvent', { type: 'FINGERPRINT_MISMATCH', meta: { current } });
        console.warn('[session] Fingerprint mismatch — possible session anomaly');
      }
    }
  };

  const intervalId = setInterval(checkTimeout, CHECK_INTERVAL);

  const extendSession = async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (e) {
      console.warn('[session] refresh failed:', e.message);
    }
    sessionStart.value = Date.now();
    store?.commit('SET_SESSION', { startedAt: sessionStart.value });
    store?.dispatch('logSessionEvent', { type: 'SESSION_EXTENDED' });
    warningShown.value = false;
    onHideWarning?.();
  };

  const performLogout = async (reason = 'manual') => {
    clearInterval(intervalId);
    window.removeEventListener('storage', onStorageChange);
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[session] signOut error:', e.message);
    }
    sessionStorage.clear();
    localStorage.removeItem('elliotforwater-admin');
    store?.dispatch('endSession', reason);
    onLogout?.(reason);
  };

  const validateSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      store?.dispatch('logSessionEvent', { type: 'SESSION_INVALID' });
      await performLogout('invalid');
      return false;
    }
    return true;
  };

  onUnmounted(() => {
    clearInterval(intervalId);
    window.removeEventListener('storage', onStorageChange);
  });

  return {
    extendSession,
    performLogout,
    validateSession,
    timeRemaining,
    warningShown,
    sessionStart,
    lastActive,
  };
}

function generateFingerprint() {
  try {
    return btoa([
      navigator.userAgent,
      `${screen.width}x${screen.height}`,
      Intl.DateTimeFormat().resolvedOptions().timeZone,
      navigator.language,
    ].join('|'));
  } catch {
    return 'unknown';
  }
}
