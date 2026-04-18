<template>
  <div class="min-h-screen flex items-center justify-center" style="background: linear-gradient(135deg, #0d4f64 0%, #116682 60%, #1a8aad 100%)">
    <div class="bg-white rounded-[20px] p-12 w-full max-w-sm shadow-2xl flex flex-col items-center gap-4">
      <div class="text-[26px] font-bold text-primary">
        elliot<span class="text-[#1a8aad]">forwater</span>
      </div>

      <!-- Not registered -->
      <template v-if="authState === 'not-registered'">
        <h1 class="text-xl font-semibold">Not registered</h1>
        <p class="text-[13px] text-on-surface-variant text-center">
          Your organisation is not set up on Elliot for Water yet. Please contact us at
          <a href="mailto:info@elliotforwater.com" class="text-primary underline">info@elliotforwater.com</a>
          to get started.
        </p>
        <button class="mt-4 w-full py-2.5 border border-outline rounded-full text-sm text-on-surface bg-transparent cursor-pointer hover:bg-surface transition-colors" @click="signOut">
          Sign out
        </button>
      </template>

      <!-- Login -->
      <template v-else>
        <h1 class="text-xl font-semibold">Company Admin</h1>
        <p class="text-[13px] text-on-surface-variant text-center">
          Sign in with your company Google account to manage your organisation's settings.
        </p>
        <button
          class="flex items-center gap-2.5 px-5 py-2.5 border-[1.5px] border-outline rounded-full bg-white cursor-pointer text-sm font-medium w-full justify-center mt-2 transition-colors hover:bg-surface hover:border-primary disabled:opacity-60 disabled:cursor-not-allowed"
          :disabled="signingIn"
          @click="signIn"
        >
          <span v-if="signingIn" class="spinner w-4 h-4 mr-2"></span>
          <GoogleIcon v-else />
          {{ signingIn ? 'Signing in…' : 'Sign in with Google' }}
        </button>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { supabase } from '@/lib/supabase';
import GoogleIcon from '@/components/ui/GoogleIcon.vue';

const store = useStore();
const authState = computed(() => store.state.authState);
const signingIn = ref(false);

const signIn = async () => {
  signingIn.value = true;
  await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: { redirectTo: process.env.VUE_APP_OAUTH_REDIRECT_URL },
  });
};

const signOut = async () => {
  await supabase.auth.signOut();
};
</script>
