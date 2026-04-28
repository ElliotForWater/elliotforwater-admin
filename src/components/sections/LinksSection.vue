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

const URL_MAX_LENGTH = 2048;
const LABEL_MAX_LENGTH = 100;
const UNSAFE_URL = /javascript:|data:|vbscript:|<script/i;

const sanitizeText = (text) => text.replace(/<[^>]*>/g, '').trim();

const validateLink = ({ text, link }) => {
  const label = sanitizeText(text || '');
  const url = (link || '').trim();
  if (!label) return 'Label is required for each link.';
  if (label.length > LABEL_MAX_LENGTH) return `Label must be under ${LABEL_MAX_LENGTH} characters.`;
  if (!url) return 'URL is required for each link.';
  if (url.length > URL_MAX_LENGTH) return `URL must be under ${URL_MAX_LENGTH} characters.`;
  if (UNSAFE_URL.test(url)) return `"${url}" contains unsafe content.`;
  try {
    const parsed = new URL(url.startsWith('http') ? url : `https://${url}`);
    if (!['http:', 'https:'].includes(parsed.protocol)) return `"${url}" must use http or https.`;
  } catch {
    return `"${url}" is not a valid URL.`;
  }
  return null;
};

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
  const nonEmpty = links.value.filter((l) => l.text || l.link);
  for (const link of nonEmpty) {
    const err = validateLink(link);
    if (err) {
      store.dispatch('showStatus', { type: 'error', message: err });
      return;
    }
  }

  saving.value = true;
  try {
    const cleanLinks = nonEmpty.map((l) => ({ text: sanitizeText(l.text), link: l.link.trim() }));
    const { error } = await supabase
      .from('company_configs')
      .upsert({ company_id: company.value.id, default_links: cleanLinks }, { onConflict: 'company_id' });
    if (error) throw error;
    store.commit('SET_LINKS', cleanLinks);
    store.dispatch('showStatus', { type: 'success', message: 'Links saved.' });
  } catch (e) {
    store.dispatch('showStatus', { type: 'error', message: 'Failed: ' + e.message });
  } finally {
    saving.value = false;
  }
};
</script>
