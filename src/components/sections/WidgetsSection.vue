<template>
  <div>
    <div class="px-9 pt-7">
      <div class="text-[22px] font-bold text-primary">Widgets</div>
      <div class="text-[13px] text-on-surface-variant mt-0.5">Close widgets on your team's dashboard. Employees can re-add them from the widget menu.</div>
    </div>

    <div class="px-9 py-6 pb-16">
      <Card title="Widget visibility">
        <p class="field-hint mb-4">Toggling a widget off closes it on everyone's dashboard. They can still re-open it from their widget menu.</p>
        <div class="flex flex-col divide-y divide-outline">
          <div v-for="widget in widgets" :key="widget.component" class="flex items-center justify-between py-3.5 first:pt-0 last:pb-0">
            <div>
              <div class="text-[13px] font-medium text-on-surface">{{ widget.label }}</div>
              <div class="text-[12px] text-on-surface-variant mt-0.5">{{ widget.description }}</div>
            </div>
            <button
              :class="['relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200', enabled(widget.component) ? 'bg-primary' : 'bg-outline']"
              @click="toggle(widget.component)"
            >
              <span :class="['pointer-events-none inline-block h-5 w-5 rounded-full bg-white shadow transform transition-transform duration-200', enabled(widget.component) ? 'translate-x-5' : 'translate-x-0']" />
            </button>
          </div>
        </div>
      </Card>

      <div class="mt-6 flex justify-end">
        <button class="btn-primary" :disabled="saving" @click="saveWidgets">
          {{ saving ? 'Saving…' : 'Save widgets' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import Card from '@/components/ui/Card.vue';
import { useSaveOperation } from '@/composables/useSaveOperation';

const ALL_WIDGETS = [
  { component: 'FocusOfDay', label: 'Focus of the day', description: 'A daily focus note employees can set for themselves.' },
  { component: 'ToDoList', label: 'To-Do List', description: 'A personal task list for each team member.' },
  { component: 'Weather', label: 'Clock & Weather', description: 'Live clock and local weather conditions.' },
  { component: 'Quotes', label: 'Quotes', description: 'Inspirational quotes shown on the dashboard.' },
  { component: 'Links', label: 'Links', description: 'Quick-access links widget (includes your default links).' },
  { component: 'SponsorOfDay', label: 'Sponsor of the day', description: 'Highlights a sponsor or partner on the dashboard.' },
];

const store = useStore();
const company = computed(() => store.state.company);
const { saving, save } = useSaveOperation();

const disabled = ref(new Set(company.value?.disabled_widgets || []));

const widgets = ALL_WIDGETS;
const enabled = (component) => !disabled.value.has(component);

const toggle = (component) => {
  const next = new Set(disabled.value);
  if (next.has(component)) {
    next.delete(component);
  } else {
    next.add(component);
  }
  disabled.value = next;
};

const saveWidgets = async () => {
  await save(async () => {
    const disabledList = [...disabled.value];
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('company_configs')
      .upsert({ company_id: company.value.id, disabled_widgets: disabledList }, { onConflict: 'company_id' });
    if (error) throw error;
    store.commit('SET_COMPANY', { ...company.value, disabled_widgets: disabledList });
    store.dispatch('showStatus', { type: 'success', message: 'Widget settings saved.' });
  });
};
</script>
