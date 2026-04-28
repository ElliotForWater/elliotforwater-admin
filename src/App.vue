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
</template>

<script setup>
import { computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import LoginView from '@/views/LoginView.vue';
import AdminView from '@/views/AdminView.vue';
import { supabase } from '@/lib/supabase';

const store = useStore();
const authState = computed(() => store.state.authState);

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
    } else if (event === 'SIGNED_OUT') {
      store.commit('SET_USER', null);
      store.commit('SET_COMPANY', null);
      store.commit('SET_LINKS', []);
      store.commit('SET_ACTIVE_NOTIF', null);
      store.commit('SET_AUTH_STATE', 'login');
    }
  });
});
</script>
