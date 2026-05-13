<template>
  <div>
    <div class="px-9 pt-7">
      <div class="text-[22px] font-bold text-primary">Notifications</div>
      <div class="text-[13px] text-on-surface-variant mt-0.5">Send a notification message to all your team members.</div>
    </div>

    <div class="px-9 py-6 pb-16">
      <!-- Active notification -->
      <div v-if="activeNotif" class="bg-primary-light border border-[#9dd0e5] rounded-card px-4 py-3.5 flex items-start justify-between gap-3 mb-4">
        <div>
          <div class="text-sm text-on-surface mb-1">{{ activeNotif.message }}</div>
          <div class="text-[11px] text-on-surface-variant">Sent {{ formatDate(activeNotif.created_at) }}</div>
        </div>
        <button class="border border-outline bg-white rounded-lg px-3 py-1 text-xs cursor-pointer text-on-surface-variant whitespace-nowrap transition-colors hover:border-error hover:text-error" @click="clearNotification">
          Clear
        </button>
      </div>

      <!-- Compose -->
      <Card :title="activeNotif ? 'Replace with new notification' : 'New notification'">
        <textarea
          v-model="message"
          class="w-full border border-outline rounded-card px-3.5 py-3 text-sm font-[inherit] resize-y min-h-[100px] outline-none transition-colors mb-2.5 focus:border-primary"
          placeholder="e.g. Office closed on Friday — enjoy your long weekend! 🎉"
          maxlength="280"
        ></textarea>
        <div class="flex items-center justify-between">
          <span class="text-xs text-on-surface-variant">{{ message.length }} / 280</span>
          <button class="btn-secondary" :disabled="sending || !message.trim()" @click="sendNotification">
            {{ sending ? 'Sending…' : 'Send to team' }}
          </button>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import Card from '@/components/ui/Card.vue';
import { supabase } from '@/lib/supabase';
import { formatDate } from '@/helpers';
import { auditLog, AUDIT_EVENTS } from '@/services/auditService';
import { ErrorHandler } from '@/services/errorHandler';

const store = useStore();
const company = computed(() => store.state.company);
const activeNotif = computed(() => store.state.activeNotif);
const user = computed(() => store.state.user);

const message = ref('');
const sending = ref(false);

const sendNotification = async () => {
  if (!message.value.trim()) return;
  sending.value = true;
  try {
    const notif = {
      message: message.value.trim(),
      active: true,
      created_at: new Date().toISOString(),
      created_by: user.value.email,
    };
    const { error } = await supabase
      .from('company_configs')
      .upsert({ company_id: company.value.id, notifications: notif }, { onConflict: 'company_id' });
    if (error) throw error;
    store.commit('SET_ACTIVE_NOTIF', notif);
    store.commit('SET_COMPANY', { ...company.value, notifications: notif });
    message.value = '';
    await auditLog(AUDIT_EVENTS.DATA_CREATED, { section: 'notifications', createdBy: user.value.email });
    store.dispatch('showStatus', { type: 'success', message: 'Notification sent to your team.' });
  } catch (e) {
    const { userMessage } = ErrorHandler.handle(e, { section: 'notifications', action: 'send' });
    store.dispatch('showStatus', { type: 'error', message: userMessage });
  } finally {
    sending.value = false;
  }
};

const clearNotification = async () => {
  if (!activeNotif.value) return;
  try {
    const { error } = await supabase
      .from('company_configs')
      .upsert({ company_id: company.value.id, notifications: { active: false } }, { onConflict: 'company_id' });
    if (error) throw error;
    store.commit('SET_ACTIVE_NOTIF', null);
    store.commit('SET_COMPANY', { ...company.value, notifications: { active: false } });
    await auditLog(AUDIT_EVENTS.DATA_DELETED, { section: 'notifications' });
    store.dispatch('showStatus', { type: 'success', message: 'Notification cleared.' });
  } catch (e) {
    const { userMessage } = ErrorHandler.handle(e, { section: 'notifications', action: 'clear' });
    store.dispatch('showStatus', { type: 'error', message: userMessage });
  }
};
</script>
