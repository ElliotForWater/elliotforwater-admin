<template>
  <!-- Loading -->
  <div v-if="authState === 'loading'" class="min-h-screen flex flex-col items-center justify-center gap-3 text-on-surface-variant">
    <div class="spinner w-5 h-5"></div>
    <span>Loading…</span>
  </div>

  <!-- Login / Not registered / Not authorized -->
  <LoginView v-else-if="authState === 'login' || authState === 'not-registered' || authState === 'not-authorized'" />

  <!-- Admin -->
  <AdminView v-else-if="authState === 'admin'" />

  <!-- Session timeout warning -->
  <SessionTimeoutModal
    v-if="showSessionWarning && authState === 'admin'"
    :time-remaining="sessionTimeRemaining"
    @extend="onExtendSession"
    @logout="onSessionLogout"
  />
</template>

<script setup>
import { ref, computed, provide, watch, onMounted } from 'vue';
import { useStore } from 'vuex';
import LoginView from '@/views/LoginView.vue';
import AdminView from '@/views/AdminView.vue';
import SessionTimeoutModal from '@/components/ui/SessionTimeoutModal.vue';
import { supabase } from '@/lib/supabase';
import { useSessionManager } from '@/services/sessionService';
import { recordSessionStart } from '@/services/sessionAnalytics';

const store = useStore();
const authState = computed(() => store.state.authState);

const showSessionWarning = ref(false);
const sessionTimeRemaining = ref(0);

const { extendSession, performLogout, timeRemaining } = useSessionManager({
  store,
  onShowWarning: () => {
    sessionTimeRemaining.value = timeRemaining.value;
    showSessionWarning.value = true;
  },
  onHideWarning: () => {
    showSessionWarning.value = false;
  },
  onLogout: (reason) => {
    showSessionWarning.value = false;
    store.commit('SET_AUTH_STATE', 'login');
    if (reason !== 'manual') {
      store.commit('SET_STATUS', { type: 'error', message: 'You were signed out due to inactivity.' });
    }
  },
});

// Make session manager available to child components (e.g. Sidebar)
provide('sessionManager', { performLogout, extendSession });

// Start session tracking when user logs in
watch(authState, (state, prev) => {
  if (state === 'admin' && prev !== 'admin') {
    store.dispatch('startSession');
    recordSessionStart(store.state.user?.id);
  }
});

const onExtendSession = async () => {
  showSessionWarning.value = false;
  await extendSession();
};

const onSessionLogout = async () => {
  await performLogout('manual');
};

onMounted(async () => {
  try {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error) throw error;
    if (session?.user) {
      await store.dispatch('loadAdmin', session.user);
    } else {
      store.commit('SET_AUTH_STATE', 'login');
    }
  } catch (e) {
    console.error('[getSession]', e);
    store.commit('SET_STATUS', { type: 'error', message: 'Could not connect to authentication. Please refresh and try again.' });
    store.commit('SET_AUTH_STATE', 'login');
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (event === 'SIGNED_IN' && session?.user && store.state.authState !== 'admin') {
      await store.dispatch('loadAdmin', session.user);
      // If "Remember me" is off, sign out when the tab closes
      if (localStorage.getItem('efw-remember-me') === 'false') {
        window.addEventListener('beforeunload', () => supabase.auth.signOut(), { once: true });
      }
    } else if (event === 'SIGNED_OUT') {
      store.commit('SET_AUTH_STATE', 'login');
    }
  });
});
</script>
