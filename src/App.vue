<template>
  <!-- Loading -->
  <div
    v-if="authState === 'loading'"
    class="min-h-screen flex flex-col items-center justify-center gap-3 text-on-surface-variant"
  >
    <div class="spinner w-5 h-5"></div>
    <span>Loading…</span>
  </div>

  <!-- Login / Not registered / Not authorized -->
  <LoginView
    v-else-if="
      authState === 'login' ||
      authState === 'not-registered' ||
      authState === 'not-authorized'
    "
  />

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
import { ref, computed, provide, watch, onMounted } from "vue";
import { useStore } from "vuex";
import LoginView from "@/views/LoginView.vue";
import AdminView from "@/views/AdminView.vue";
import SessionTimeoutModal from "@/components/ui/SessionTimeoutModal.vue";
import { supabase } from "@/lib/supabase";
import {
  useSessionManager,
  clearLocalSession,
  signOutWithTimeout,
} from "@/services/sessionService";
import {
  recordSessionStart,
  recordSessionEnd,
} from "@/services/sessionAnalytics";
import { auditLog, AUDIT_EVENTS } from "@/services/auditService";

const store = useStore();
const authState = computed(() => store.state.authState);

const showSessionWarning = ref(false);
const sessionTimeRemaining = ref(0);

const { extendSession, performLogout, timeRemaining, loggingOut } =
  useSessionManager({
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
provide("sessionManager", { performLogout, extendSession, loggingOut });

// Start session tracking when user logs in
watch(authState, (state, prev) => {
  if (state === "admin" && prev !== "admin") {
    store.dispatch("startSession");
    const fingerprint = store.state.session?.fingerprint;
    recordSessionStart(store.state.user?.id, fingerprint);
  }
});

const onExtendSession = async () => {
  showSessionWarning.value = false;
  await extendSession();
};

const onSessionLogout = async () => {
  await performLogout("manual");
};

onMounted(async () => {
  const handoffParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(
    window.location.hash.replace(/^#/, "")
  );
  const cameFromExtension = handoffParams.get("ref") === "extension";
  const loginHint = hashParams.get("email") || handoffParams.get("email");

  if (cameFromExtension || loginHint) {
    // Immediately scrub PII and handoff indicators from the URL to prevent leakage via
    // browser history, server logs, or Referer headers.
    const url = new URL(window.location.href);
    let urlChanged = false;

    ["email", "ref"].forEach((key) => {
      if (url.searchParams.has(key)) {
        url.searchParams.delete(key);
        urlChanged = true;
      }
    });

    if (url.hash.includes("email=")) {
      const hParams = new URLSearchParams(url.hash.replace(/^#/, ""));
      if (hParams.has("email")) {
        hParams.delete("email");
        const newHash = hParams.toString();
        url.hash = newHash ? `#${newHash}` : "";
        urlChanged = true;
      }
    }

    if (urlChanged) {
      window.history.replaceState({}, "", url.pathname + url.search + url.hash);
    }
  }

  try {
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();
    if (error) throw error;
    if (session?.user) {
      await store.dispatch("loadAdmin", session.user);
      // Start session tracking on page reload if already authenticated
      if (store.state.authState === "admin") {
        store.dispatch("startSession");
        const fingerprint = store.state.session?.fingerprint;
        recordSessionStart(store.state.user?.id, fingerprint);
      }
    } else if (cameFromExtension) {
      try {
        const { error: oauthError } = await supabase.auth.signInWithOAuth({
          provider: "google",
          options: {
            redirectTo: window.location.origin,
            queryParams: {
              prompt: "none",
              ...(loginHint ? { login_hint: loginHint } : {}),
            },
          },
        });
        if (oauthError) throw oauthError;
        return;
      } catch (e) {
        console.error("[silent reauth]", e);
        store.commit("SET_AUTH_STATE", "login");
      }
    } else {
      store.commit("SET_AUTH_STATE", "login");
    }
  } catch (e) {
    console.error("[getSession]", e);
    store.commit("SET_STATUS", {
      type: "error",
      message:
        "Could not connect to authentication. Please refresh and try again.",
    });
    store.commit("SET_AUTH_STATE", "login");
  }

  supabase.auth.onAuthStateChange(async (event, session) => {
    if (
      event === "SIGNED_IN" &&
      session?.user &&
      store.state.authState !== "admin"
    ) {
      await store.dispatch("loadAdmin", session.user);
      if (localStorage.getItem("efw-remember-me") === "false") {
        window.addEventListener(
          "beforeunload",
          () => {
            clearLocalSession();
            signOutWithTimeout("global").then((error) => {
              if (error)
                auditLog(AUDIT_EVENTS.SIGN_OUT_FAILED, {
                  reason: error.message,
                  context: "beforeunload",
                });
            });
          },
          { once: true }
        );
      }
    } else if (event === "SIGNED_OUT") {
      await recordSessionEnd("server-signout");
      store.commit("SET_AUTH_STATE", "login");
    }
  });
});
</script>
