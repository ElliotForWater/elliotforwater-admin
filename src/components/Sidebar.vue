<template>
  <aside
    id="sidebar"
    :class="['w-60 bg-white border-r border-outline flex flex-col fixed top-0 left-0 bottom-0 z-[100] transition-transform duration-[250ms]', { '-translate-x-full': !open, 'translate-x-0 shadow-xl': open }]"
    class="md:translate-x-0"
  >
    <!-- Brand -->
    <div class="px-4 pt-5 pb-4 border-b border-outline">
      <img src="@/assets/logo.svg" alt="Elliot for Water" class="h-6 w-auto mb-1" />
      <span class="text-[11px] text-on-surface-variant bg-primary-light rounded-full px-2 py-0.5 inline-block mt-1">
        @{{ domain }}
      </span>
    </div>

    <!-- Nav -->
    <nav class="flex-1 px-2.5 py-3 overflow-y-auto">
      <div class="text-[10px] font-bold uppercase tracking-[0.8px] text-on-surface-variant px-2 pt-2 pb-1">Settings</div>
      <button v-for="item in navItems" :key="item.section" :class="['nav-item', { active: currentSection === item.section }]" @click="navigate(item.section)">
        <span class="w-5 text-center text-base">{{ item.icon }}</span>
        {{ item.label }}
      </button>
      <div class="text-[10px] font-bold uppercase tracking-[0.8px] text-on-surface-variant px-2 pt-4 pb-1">Team</div>
      <button :class="['nav-item', { active: currentSection === 'team' }]" @click="navigate('team')">
        <span class="w-5 text-center text-base">👥</span> Team Members
      </button>
    </nav>

    <!-- Footer -->
    <div class="border-t border-outline p-3.5">
      <div class="flex items-center gap-2.5 mb-2">
        <div class="w-8 h-8 rounded-full bg-primary text-white flex items-center justify-center text-[13px] font-semibold flex-shrink-0">
          {{ initials }}
        </div>
        <div class="min-w-0">
          <div class="text-[13px] font-medium text-on-surface truncate">{{ userName }}</div>
          <div class="text-[11px] text-on-surface-variant truncate">{{ userEmail }}</div>
        </div>
      </div>

      <!-- Session status indicator -->
      <div class="flex items-center gap-1.5 mb-1 px-0.5">
        <span class="w-1.5 h-1.5 rounded-full bg-green-500 flex-shrink-0"></span>
        <span class="text-[11px] text-on-surface-variant">Session active · {{ sessionAge }}</span>
      </div>
      <!-- Session analytics -->
      <div v-if="analytics" class="text-[10px] text-on-surface-variant px-0.5 mb-2.5 leading-relaxed">
        {{ analytics.sessionsThisWeek }} sessions this week · avg {{ formatDuration(analytics.avgDurationMs) }}
      </div>
      <div v-else class="mb-2.5"></div>

      <button
        class="w-full py-1.5 border border-outline rounded-card text-[13px] text-on-surface-variant cursor-pointer transition-colors hover:border-error hover:text-error"
        @click="showLogoutConfirm = true"
      >
        Sign out
      </button>
    </div>
  </aside>

  <LogoutConfirmModal
    v-if="showLogoutConfirm"
    @confirm="onLogoutConfirmed"
    @cancel="showLogoutConfirm = false"
  />
</template>

<script setup>
import { ref, computed, inject, onMounted, onUnmounted } from 'vue';
import { useStore } from 'vuex';
import { getInitials, getDomain } from '@/helpers';
import LogoutConfirmModal from '@/components/ui/LogoutConfirmModal.vue';
import { getAnalytics, formatDuration } from '@/services/sessionAnalytics';

defineProps({ open: Boolean });
const emit = defineEmits(['close']);

const store = useStore();
const sessionManager = inject('sessionManager', null);

const user = computed(() => store.state.user);
const currentSection = computed(() => store.state.currentSection);

const userName = computed(() => user.value?.user_metadata?.full_name || user.value?.email || '');
const userEmail = computed(() => user.value?.email || '');
const initials = computed(() => getInitials(userName.value));
const domain = computed(() => getDomain(userEmail.value));

const showLogoutConfirm = ref(false);

// Session age display (e.g. "2h 15m")
const sessionAge = ref('');
const updateSessionAge = () => {
  const startedAt = store.state.session?.startedAt;
  if (!startedAt) { sessionAge.value = ''; return; }
  const ms = Date.now() - startedAt;
  const h = Math.floor(ms / 3_600_000);
  const m = Math.floor((ms % 3_600_000) / 60_000);
  sessionAge.value = h > 0 ? `${h}h ${m}m` : `${m}m`;
};

const analytics = ref(null);
const loadAnalytics = async () => {
  analytics.value = await getAnalytics(store.state.user?.id);
};
const ageTick = setInterval(() => { updateSessionAge(); loadAnalytics(); }, 60_000);
onMounted(() => { updateSessionAge(); loadAnalytics(); });
onUnmounted(() => clearInterval(ageTick));

const navItems = [
  { section: 'branding', icon: '🎨', label: 'Branding' },
  { section: 'links', icon: '🔗', label: 'Default Links' },
  { section: 'widgets', icon: '⬡', label: 'Widgets' },
  { section: 'notifications', icon: '📣', label: 'Notifications' },
];

const navigate = (section) => {
  store.commit('SET_SECTION', section);
  store.commit('CLEAR_STATUS');
  emit('close');
};

const onLogoutConfirmed = async () => {
  showLogoutConfirm.value = false;
  if (sessionManager) {
    await sessionManager.performLogout('manual');
  }
};
</script>
