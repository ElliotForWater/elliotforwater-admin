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

      <div
        v-for="(link, index) in links"
        :key="index"
        class="bg-white border border-outline rounded-card p-4 flex items-start gap-3 mb-2.5 transition-colors hover:border-[#a0b4bc]"
      >
        <div class="flex-1 flex flex-col gap-2">
          <!-- Label field -->
          <div>
            <input
              v-model="links[index].text"
              class="border rounded-lg px-3 py-2 text-[13px] text-on-surface outline-none transition-colors w-full bg-surface font-medium placeholder:text-[#aab4ba] focus:bg-white"
              :class="fieldClass(fieldErrors[index]?.text)"
              type="text"
              placeholder="Label (e.g. Company Intranet)"
              @input="onLabelInput(index)"
            />
            <p v-if="fieldErrors[index]?.text" class="text-[11px] text-error mt-0.5">{{ fieldErrors[index].text }}</p>
          </div>

          <!-- URL field -->
          <div>
            <div class="relative">
              <input
                v-model="links[index].link"
                class="border rounded-lg px-3 py-2 text-[13px] text-on-surface outline-none transition-colors w-full bg-surface placeholder:text-[#aab4ba] focus:bg-white"
                :class="fieldClass(fieldErrors[index]?.link)"
                type="url"
                placeholder="URL (e.g. https://intranet.company.com)"
                @input="onUrlInput(index)"
              />
              <!-- Category badge -->
              <span
                v-if="links[index].category && !fieldErrors[index]?.link"
                class="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] font-semibold uppercase tracking-wide px-1.5 py-0.5 rounded bg-primary-light text-primary"
              >{{ links[index].category }}</span>
            </div>
            <p v-if="fieldErrors[index]?.link" class="text-[11px] mt-0.5" :class="fieldErrors[index].linkWarning ? 'text-amber-500' : 'text-error'">
              {{ fieldErrors[index].link }}
            </p>
            <!-- HTTP → HTTPS upgrade notice -->
            <p v-if="links[index].upgraded" class="text-[11px] text-primary mt-0.5">↑ Upgraded to HTTPS automatically.</p>
          </div>
        </div>

        <button
          class="border border-outline rounded-lg px-2.5 py-1.5 text-on-surface-variant cursor-pointer text-base flex-shrink-0 mt-0.5 transition-colors hover:border-error hover:text-error"
          title="Delete"
          @click="removeLink(index)"
        >🗑</button>
      </div>

      <button
        class="w-full py-3 border-2 border-dashed border-outline rounded-card bg-transparent text-primary text-[13px] font-semibold cursor-pointer transition-colors hover:border-primary hover:bg-primary-light"
        @click="addLink"
      >
        + Add a link
      </button>

      <div class="mt-6 flex justify-end">
        <button class="btn-primary" :disabled="saving || hasErrors" @click="saveLinks">
          {{ saving ? 'Saving…' : 'Save links' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, reactive } from 'vue';
import { useStore } from 'vuex';
import DOMPurify from 'dompurify';
import validator from 'validator';
import { supabase } from '@/lib/supabase';
import { auditLog, AUDIT_EVENTS } from '@/services/auditService';
import { ErrorHandler } from '@/services/errorHandler';

// ─── Constants ────────────────────────────────────────────────────────────────

const URL_MAX_LENGTH = 2048;
const LABEL_MAX_LENGTH = 100;

const MALICIOUS_PATTERNS = [
  /javascript\s*:/i,
  /data\s*:/i,
  /vbscript\s*:/i,
  /<script/i,
  /on\w+\s*=/i,
  /%6A%61%76%61%73%63%72%69%70%74/i,
  /%64%61%74%61/i,
];

const VALIDATOR_OPTIONS = {
  protocols: ['http', 'https'],
  require_protocol: true,
  require_host: true,
  allow_underscores: false,
  allow_trailing_dot: false,
  allow_protocol_relative_urls: false,
};

// ─── Sanitization ─────────────────────────────────────────────────────────────

const sanitizeLabel = (text) =>
  DOMPurify.sanitize(text, { ALLOWED_TAGS: [] }).trim();

// ─── URL validation ───────────────────────────────────────────────────────────

function validateURL(raw) {
  const trimmed = (raw ?? '').trim();
  if (!trimmed) return { valid: false, error: 'URL is required.' };
  if (trimmed.length > URL_MAX_LENGTH) return { valid: false, error: `URL must be under ${URL_MAX_LENGTH} characters.` };

  // Decode to catch encoding bypasses
  let decoded = trimmed;
  try { decoded = decodeURIComponent(trimmed); } catch (e) { /* keep raw */ }

  for (const pattern of MALICIOUS_PATTERNS) {
    if (pattern.test(trimmed) || pattern.test(decoded)) {
      return { valid: false, error: 'URL contains unsafe content.' };
    }
  }

  // Auto-upgrade HTTP → HTTPS
  const upgraded = trimmed.startsWith('http://');
  const normalized = upgraded ? trimmed.replace('http://', 'https://') : trimmed;
  const withProtocol = normalized.startsWith('https://') ? normalized : `https://${normalized}`;

  if (!validator.isURL(withProtocol, VALIDATOR_OPTIONS)) {
    return { valid: false, error: `"${trimmed}" is not a valid URL.` };
  }

  return { valid: true, url: withProtocol, upgraded };
}

// ─── Link categorization ──────────────────────────────────────────────────────

function categorizeLink(url) {
  try {
    const hostname = new URL(url).hostname.toLowerCase();
    if (/docs?\.|wiki\.|confluence/i.test(hostname)) return 'docs';
    if (/slack|teams|discord|meet\.|zoom/i.test(hostname)) return 'comms';
    if (/github|gitlab|bitbucket|jira|linear/i.test(hostname)) return 'dev';
    if (/drive\.google|sharepoint|notion|dropbox/i.test(hostname)) return 'files';
    if (/mail\.|outlook|gmail/i.test(hostname)) return 'email';
    return 'general';
  } catch {
    return 'general';
  }
}

// ─── Domain reputation (stub — wire up to external API if needed) ─────────────

// eslint-disable-next-line no-unused-vars
async function checkDomainReputation(_url) {
  // Placeholder: integrate with Google Safe Browsing API or similar.
  // For now returns null (unknown). A real implementation would call:
  // https://safebrowsing.googleapis.com/v4/threatMatches:find
  return null;
}

// ─── Store & state ────────────────────────────────────────────────────────────

const store = useStore();
const company = computed(() => store.state.company);

const links = computed({
  get: () => store.state.links,
  set: (val) => store.commit('SET_LINKS', val),
});

const saving = ref(false);
const fieldErrors = reactive({});

const hasErrors = computed(() =>
  Object.values(fieldErrors).some((e) => e?.text || (e?.link && !e?.linkWarning)),
);

// ─── Field CSS helper ─────────────────────────────────────────────────────────

function fieldClass(error) {
  if (!error) return 'border-outline focus:border-primary';
  return 'border-error focus:border-error';
}

// ─── Debounce helper ──────────────────────────────────────────────────────────

const debounceTimers = {};
function debounce(key, fn, delay = 400) {
  clearTimeout(debounceTimers[key]);
  debounceTimers[key] = setTimeout(fn, delay);
}

// ─── Real-time validation ─────────────────────────────────────────────────────

function onLabelInput(index) {
  debounce(`label-${index}`, () => {
    const raw = links.value[index]?.text ?? '';
    const clean = sanitizeLabel(raw);

    if (!fieldErrors[index]) fieldErrors[index] = {};

    if (!clean) {
      fieldErrors[index].text = 'Label is required.';
    } else if (clean.length > LABEL_MAX_LENGTH) {
      fieldErrors[index].text = `Label must be under ${LABEL_MAX_LENGTH} characters.`;
    } else if (clean !== raw) {
      fieldErrors[index].text = 'Label contains unsafe characters and will be sanitized on save.';
    } else {
      fieldErrors[index].text = '';
    }
  });
}

function onUrlInput(index) {
  debounce(`url-${index}`, async () => {
    const raw = links.value[index]?.link ?? '';
    if (!fieldErrors[index]) fieldErrors[index] = {};

    if (!raw.trim()) {
      fieldErrors[index].link = '';
      links.value[index].category = '';
      links.value[index].upgraded = false;
      return;
    }

    const result = validateURL(raw);
    if (!result.valid) {
      fieldErrors[index].link = result.error;
      fieldErrors[index].linkWarning = false;
      links.value[index].category = '';
      links.value[index].upgraded = false;
      return;
    }

    // Auto-upgrade URL in field
    if (result.upgraded) {
      const updated = [...links.value];
      updated[index] = { ...updated[index], link: result.url, upgraded: true };
      store.commit('SET_LINKS', updated);
    } else {
      links.value[index].upgraded = false;
    }

    fieldErrors[index].link = '';
    links.value[index].category = categorizeLink(result.url);

    // Domain reputation check (async, non-blocking)
    const reputation = await checkDomainReputation(result.url);
    if (reputation === 'unsafe') {
      fieldErrors[index].link = 'This domain may be unsafe. Proceed with caution.';
      fieldErrors[index].linkWarning = true;
    }
  });
}

// ─── Link management ──────────────────────────────────────────────────────────

const addLink = () => {
  store.commit('SET_LINKS', [...links.value, { text: '', link: '', category: '', upgraded: false }]);
};

const removeLink = (index) => {
  const updated = [...links.value];
  updated.splice(index, 1);
  store.commit('SET_LINKS', updated);
  delete fieldErrors[index];
};

// ─── Save via Edge Function ───────────────────────────────────────────────────

const saveLinks = async () => {
  const nonEmpty = links.value.filter((l) => l.text || l.link);

  // Final client-side validation pass before sending
  for (let i = 0; i < nonEmpty.length; i++) {
    const label = sanitizeLabel(nonEmpty[i].text ?? '');
    if (!label) {
      store.dispatch('showStatus', { type: 'error', message: `Link #${i + 1}: label is required.` });
      return;
    }
    const urlResult = validateURL(nonEmpty[i].link ?? '');
    if (!urlResult.valid) {
      store.dispatch('showStatus', { type: 'error', message: `Link #${i + 1}: ${urlResult.error}` });
      return;
    }
  }

  saving.value = true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) throw new Error('Not authenticated.');

    const edgeFunctionUrl = `${process.env.VUE_APP_SUPABASE_URL}/functions/v1/validate-links`;

    const res = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${session.access_token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ links: nonEmpty.map((l) => ({ text: l.text, link: l.link })) }),
    });

    const body = await res.json();
    if (!res.ok) throw new Error(body.error ?? `Validation failed (${res.status})`);

    // Use sanitized + categorized links returned by server
    const cleanLinks = body.links;

    const { error } = await supabase
      .from('company_configs')
      .upsert({ company_id: company.value.id, default_links: cleanLinks }, { onConflict: 'company_id' });
    if (error) throw error;

    store.commit('SET_LINKS', cleanLinks);
    await auditLog(AUDIT_EVENTS.DATA_UPDATED, { section: 'links', count: cleanLinks.length });
    store.dispatch('showStatus', { type: 'success', message: 'Links saved.' });
  } catch (e) {
    const { userMessage } = ErrorHandler.handle(e, { section: 'links' });
    store.dispatch('showStatus', { type: 'error', message: userMessage });
  } finally {
    saving.value = false;
  }
};
</script>
