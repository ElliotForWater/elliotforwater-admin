<template>
  <div>
    <div class="px-9 pt-7">
      <div class="text-[22px] font-bold text-primary">Team Members</div>
      <div class="text-[13px] text-on-surface-variant mt-0.5">Everyone from your organisation who has signed in to Elliot for Water.</div>
    </div>

    <div class="px-9 py-6 pb-16">
      <Card>
        <div v-if="loading" class="flex items-center gap-2.5 py-6 text-on-surface-variant text-[13px]">
          <div class="spinner w-[18px] h-[18px]"></div>
          Loading team…
        </div>

        <div v-else-if="error" class="text-center py-12 text-on-surface-variant">
          <p class="text-[13px]">The <strong>profiles</strong> table doesn't exist yet.</p>
          <p class="text-[13px] mt-2">Create it in Supabase and the extension will populate it when users sign in.</p>
        </div>

        <div v-else-if="members.length === 0" class="text-center py-12 text-on-surface-variant">
          <p class="text-[13px]">No team members have signed in yet.</p>
        </div>

        <div v-else>
          <div v-for="member in members" :key="member.id" class="flex items-center gap-3.5 py-3.5 border-b border-outline last:border-b-0">
            <div class="w-[38px] h-[38px] rounded-full bg-primary text-white flex items-center justify-center text-sm font-semibold flex-shrink-0">
              {{ getInitials(member.full_name || member.email) }}
            </div>
            <div>
              <div class="text-sm font-medium">{{ member.full_name || member.email }}</div>
              <div class="text-xs text-on-surface-variant">{{ member.email }}</div>
            </div>
            <div class="text-[11px] text-on-surface-variant ml-auto whitespace-nowrap">{{ formatDate(member.created_at) }}</div>
          </div>
        </div>
      </Card>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue';
import { useStore } from 'vuex';
import Card from '@/components/ui/Card.vue';
import { supabase } from '@/lib/supabase';
import { formatDate, getInitials, getDomain } from '@/helpers';

const store = useStore();
const user = computed(() => store.state.user);

const members = ref([]);
const loading = ref(true);
const error = ref(false);

onMounted(async () => {
  const domain = getDomain(user.value?.email);
  const { data, error: err } = await supabase
    .from('profiles')
    .select('*')
    .ilike('email', `%@${domain}`)
    .order('created_at', { ascending: false });

  if (err) {
    error.value = true;
  } else {
    members.value = data || [];
  }
  loading.value = false;
});
</script>
