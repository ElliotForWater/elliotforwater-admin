<template>
  <div>
    <div class="px-9 pt-7">
      <div class="text-[22px] font-bold text-primary">Branding</div>
      <div class="text-[13px] text-on-surface-variant mt-0.5">Customise how Elliot for Water looks for your team.</div>
    </div>

    <div class="px-9 py-6 pb-16">
      <Card title="Company Name">
        <div class="flex flex-col gap-1.5">
          <label class="field-label">Name</label>
          <input v-model="name" type="text" class="field-input" placeholder="Acme Corp" />
          <span class="field-hint">Shown in the extension to your team members.</span>
        </div>
      </Card>

      <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card title="Company Logo">
          <UploadArea
            :preview-url="logoPreview"
            icon="🖼️"
            hint="PNG, SVG with transparent background"
            label="Logo"
            :uploading="uploadingLogo"
            @file-selected="onLogoSelected"
            @clear="clearLogo"
          />
          <p class="field-hint mt-2.5">Replaces the Elliot for Water logo. Use a square image, minimum <strong>200×200px</strong>, with a transparent background (PNG or SVG recommended).</p>
        </Card>

        <Card title="Background Image">
          <UploadArea
            :preview-url="bgPreview"
            icon="🌄"
            hint="JPG, WebP"
            label="Background"
            :cover="true"
            :uploading="uploadingBg"
            @file-selected="onBgSelected"
            @clear="clearBg"
          />
          <p class="field-hint mt-2.5">Replaces the default background. Use a landscape image, minimum <strong>1920×1080px</strong>. Keep file size under <strong>2MB</strong> — JPG or WebP recommended.</p>
        </Card>
      </div>

      <div class="mt-6 flex justify-end">
        <button class="btn-primary" :disabled="saving" @click="saveBranding">
          {{ saving ? 'Saving…' : 'Save branding' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import Card from '@/components/ui/Card.vue';
import UploadArea from '@/components/ui/UploadArea.vue';
import { supabase, BUCKET } from '@/lib/supabase';

const store = useStore();
const company = computed(() => store.state.company);

const name = ref(company.value?.name || '');
const logoPreview = ref(company.value?.logo_url || '');
const bgPreview = ref(company.value?.bg_image || '');
const logoFile = ref(null);
const bgFile = ref(null);
const saving = ref(false);
const uploadingLogo = ref(false);
const uploadingBg = ref(false);

const onLogoSelected = (file) => {
  logoFile.value = file;
  logoPreview.value = URL.createObjectURL(file);
};

const onBgSelected = (file) => {
  bgFile.value = file;
  bgPreview.value = URL.createObjectURL(file);
};

const clearLogo = () => {
  logoFile.value = null;
  logoPreview.value = '';
  store.commit('SET_COMPANY', { ...company.value, logo_url: null });
};

const clearBg = () => {
  bgFile.value = null;
  bgPreview.value = '';
  store.commit('SET_COMPANY', { ...company.value, bg_image: null });
};

const uploadFile = async (file, path) => {
  const { error } = await supabase.storage.from(BUCKET).upload(path, file, { upsert: true, contentType: file.type });
  if (error) throw error;
  return supabase.storage.from(BUCKET).getPublicUrl(path).data.publicUrl;
};

const saveBranding = async () => {
  saving.value = true;
  try {
    let logoUrl = company.value?.logo_url || null;
    let bgUrl = company.value?.bg_image || null;
    const domain = company.value.email_domain;
    const companyId = company.value.id;

    if (logoFile.value) {
      uploadingLogo.value = true;
      const ext = logoFile.value.name.split('.').pop();
      logoUrl = await uploadFile(logoFile.value, `${domain}/logo.${ext}`);
      logoFile.value = null;
      uploadingLogo.value = false;
    }
    if (bgFile.value) {
      uploadingBg.value = true;
      const ext = bgFile.value.name.split('.').pop();
      bgUrl = await uploadFile(bgFile.value, `${domain}/background.${ext}`);
      bgFile.value = null;
      uploadingBg.value = false;
    }

    const trimmedName = name.value.trim() || company.value.name || domain;

    const [profileRes, configRes] = await Promise.all([
      supabase.from('company_profiles').update({ name: trimmedName }).eq('id', companyId),
      supabase.from('company_configs').upsert(
        { company_id: companyId, logo_url: logoUrl, bg_image: bgUrl },
        { onConflict: 'company_id' }
      ),
    ]);

    if (profileRes.error) throw profileRes.error;
    if (configRes.error) throw configRes.error;

    store.commit('SET_COMPANY', { ...company.value, name: trimmedName, logo_url: logoUrl, bg_image: bgUrl });
    store.dispatch('showStatus', { type: 'success', message: 'Branding saved.' });
  } catch (e) {
    store.dispatch('showStatus', { type: 'error', message: 'Failed: ' + e.message });
  } finally {
    saving.value = false;
    uploadingLogo.value = false;
    uploadingBg.value = false;
  }
};
</script>
