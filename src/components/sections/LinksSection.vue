<template>
  <div>
    <div class="px-9 pt-7">
      <div class="text-[22px] font-bold text-primary">Default Links</div>
      <div class="text-[13px] text-on-surface-variant mt-0.5">These links appear in the Links widget for everyone in your company.</div>
    </div>

    <div class="px-9 py-6 pb-16">
      <div v-if="links.length === 0" class="text-center py-12 text-on-surface-variant">
        <p class="text-[13px] mt-1.5">No links yet. Add your first one below.</p>
      </div>

      <div v-for="(link, index) in links" :key="index" class="bg-white border border-outline rounded-card p-4 flex items-start gap-3 mb-2.5 transition-colors hover:border-[#a0b4bc]">
        <div class="flex-1 flex flex-col gap-2">
          <input
            v-model="links[index].text"
            class="border border-outline rounded-lg px-3 py-2 text-[13px] text-on-surface outline-none transition-colors w-full bg-surface font-medium placeholder:text-[#aab4ba] focus:border-primary focus:bg-white"
            type="text"
            placeholder="Label (e.g. Company Intranet)"
          />
          <input
            v-model="links[index].link"
            class="border border-outline rounded-lg px-3 py-2 text-[13px] text-on-surface outline-none transition-colors w-full bg-surface placeholder:text-[#aab4ba] focus:border-primary focus:bg-white"
            type="url"
            placeholder="URL (e.g. https://intranet.company.com)"
          />
        </div>
        <button
          class="border border-outline rounded-lg px-2.5 py-1.5 text-on-surface-variant cursor-pointer text-base flex-shrink-0 mt-0.5 transition-colors hover:border-error hover:text-error"
          title="Delete"
          @click="removeLink(index)"
        >🗑</button>
      </div>

      <button class="w-full py-3 border-2 border-dashed border-outline rounded-card bg-transparent text-primary text-[13px] font-semibold cursor-pointer transition-colors hover:border-primary hover:bg-primary-light" @click="addLink">
        + Add a link
      </button>

      <div class="mt-6 flex justify-end">
        <button class="btn-primary" :disabled="saving" @click="saveLinks">
          {{ saving ? 'Saving…' : 'Save links' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import { supabase } from '@/lib/supabase';

const store = useStore();
const company = computed(() => store.state.company);
const links = computed({
  get: () => store.state.links,
  set: (val) => store.commit('SET_LINKS', val),
});
const saving = ref(false);

const addLink = () => {
  store.commit('SET_LINKS', [...links.value, { text: '', link: '' }]);
};

const removeLink = (index) => {
  const updated = [...links.value];
  updated.splice(index, 1);
  store.commit('SET_LINKS', updated);
};

const saveLinks = async () => {
  saving.value = true;
  try {
    const payload = {
      email_domain: company.value.email_domain,
      name: company.value.name || company.value.email_domain,
      default_links: links.value.filter((l) => l.text || l.link),
      updated_at: new Date().toISOString(),
    };
    const { error } = await supabase.from('companies').upsert(payload, { onConflict: 'email_domain' });
    if (error) throw error;
    store.commit('SET_LINKS', payload.default_links);
    store.dispatch('showStatus', { type: 'success', message: 'Links saved.' });
  } catch (e) {
    store.dispatch('showStatus', { type: 'error', message: 'Failed: ' + e.message });
  } finally {
    saving.value = false;
  }
};
</script>
