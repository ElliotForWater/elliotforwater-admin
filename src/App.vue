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
import { useSessionManager, clearLocalSession } from '@/services/sessionService';
import { recordSessionStart, recordSessionEnd } from '@/services/sessionAnalytics';

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
});

// Make session manager available to child components (e.g. Sidebar)
provide('sessionManager', { performLogout, extendSession });

// Start session tracking when user logs in
watch(authState, (state, prev) => {
  if (state === 'admin' && prev !== 'admin') {
    store.dispatch('startSession');
    const fingerprint = store.state.session?.fingerprint;
    recordSessionStart(store.state.user?.id, fingerprint);
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
      // Start session tracking on page reload if already authenticated
      if (store.state.authState === 'admin') {
        store.dispatch('startSession');
        const fingerprint = store.state.session?.fingerprint;
        recordSessionStart(store.state.user?.id, fingerprint);
      }
    } else {
      // Opened from the extension's admin handoff — the user just signed in with Google
      // there, so silently re-authenticate instead of making them do it again. `prompt:
      // none` completes with no UI if Google already has an active session + prior
      // consent for this app; otherwise it redirects back here with no session, and we
      // fall through to the normal login screen below.
      const handoffParams = new URLSearchParams(window.location.search);
      const cameFromExtension = handoffParams.get('ref') === 'extension';
      if (cameFromExtension) {
        // Pin the silent re-auth to the exact Google account the extension is signed in as —
        // without login_hint, prompt:none falls back to whichever Google session the browser
        // considers active, which isn't necessarily this one if more than one is signed in.
        const loginHint = handoffParams.get('email');
        try {
          const { error: oauthError } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
              redirectTo: window.location.origin,
              queryParams: { prompt: 'none', ...(loginHint ? { login_hint: loginHint } : {}) },
            },
          });
          if (oauthError) throw oauthError;
          return;
        } catch (e) {
          console.error('[silent reauth]', e);
        }
      }
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
      // If "Remember me" is off, sign out when the tab closes. Browsers don't guarantee async
      // work (the signOut() network call) finishes before the page unloads, so that part is
      // best-effort only — clearLocalSession() is synchronous and is what actually guarantees
      // this browser won't still be signed in next time it's opened, regardless of whether the
      // network call below completes in time.
      if (localStorage.getItem('efw-remember-me') === 'false') {
        window.addEventListener(
          'beforeunload',
          () => {
            clearLocalSession();
            supabase.auth.signOut({ scope: 'global' });
          },
          { once: true },
        );
      }
    } else if (event === 'SIGNED_OUT') {
      await recordSessionEnd('server-signout');
      store.commit('SET_AUTH_STATE', 'login');
    }
  });
});
</script>
