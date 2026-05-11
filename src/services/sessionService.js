import { ref, watch, onUnmounted } from 'vue';
import { useIdle } from '@vueuse/core';
import { supabase } from '@/lib/supabase';

const ABSOLUTE_TIMEOUT = 8 * 60 * 60 * 1000; // 8 hours
const IDLE_TIMEOUT = 30 * 60 * 1000;          // 30 minutes
const WARNING_BEFORE = 5 * 60 * 1000;         // warn 5 min before expiry
const CHECK_INTERVAL = 30_000;                 // check every 30 seconds

export function useSessionManager({ onLogout, onShowWarning, onHideWarning } = {}) {
  const sessionStart = ref(Date.now());
  const warningShown = ref(false);
  const timeRemaining = ref(0);

  const { idle, lastActive } = useIdle(IDLE_TIMEOUT);

  // When VueUse marks user as idle the full IDLE_TIMEOUT has elapsed — force logout
  watch(idle, (isIdle) => {
    if (isIdle) performLogout('idle');
  });

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
      onShowWarning?.();
    }
  };

  const intervalId = setInterval(checkTimeout, CHECK_INTERVAL);

  const extendSession = async () => {
    try {
      await supabase.auth.refreshSession();
    } catch (e) {
      console.warn('[sessionService] refresh failed:', e.message);
    }
    sessionStart.value = Date.now();
    warningShown.value = false;
    onHideWarning?.();
  };

  const performLogout = async (reason = 'manual') => {
    clearInterval(intervalId);
    logSessionEvent('SESSION_ENDED', { reason });
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('[sessionService] signOut error:', e.message);
    }
    sessionStorage.clear();
    localStorage.removeItem('elliotforwater-admin');
    onLogout?.(reason);
  };

  const validateSession = async () => {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) {
      await performLogout('invalid');
      return false;
    }
    return true;
  };

  onUnmounted(() => clearInterval(intervalId));

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

function logSessionEvent(event, meta = {}) {
  console.info(`[session] ${event}`, { ...meta, ts: new Date().toISOString() });
}
