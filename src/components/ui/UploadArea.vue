<template>
  <div>
    <div v-if="previewUrl" class="relative">
      <img
        :src="previewUrl"
        :class="['w-full h-36 rounded-card border border-outline bg-surface', cover ? 'object-cover' : 'object-contain']"
        :alt="label"
      />
      <button
        class="absolute top-2 right-2 bg-black/55 text-white border-none rounded-full w-6 h-6 text-base cursor-pointer flex items-center justify-center"
        @click.prevent="$emit('clear')"
      >×</button>
    </div>
    <label
      v-else
      :class="['block border-2 border-dashed rounded-card p-6 text-center cursor-pointer transition-colors', validationError ? 'border-error bg-red-50' : 'border-outline hover:border-primary hover:bg-primary-light']"
    >
      <input type="file" :accept="acceptAttr" class="hidden" @change="onFileChange" />
      <div class="text-3xl mb-1.5">{{ icon }}</div>
      <div class="text-xs text-on-surface-variant">
        <strong class="text-primary">Click to upload</strong><br />{{ hint }}
      </div>
    </label>
    <p v-if="validationError" class="text-xs text-error mt-1.5">{{ validationError }}</p>
    <p v-else-if="uploading" class="text-xs text-primary text-center mt-1.5">Uploading…</p>
  </div>
</template>

<script setup>
import { ref } from 'vue';

const props = defineProps({
  previewUrl: String,
  icon: { type: String, default: '🖼️' },
  hint: String,
  label: String,
  cover: Boolean,
  uploading: Boolean,
  maxBytes: { type: Number, default: 2 * 1024 * 1024 },
});

const acceptAttr = 'image/png,image/jpeg,image/webp,image/svg+xml,image/gif';

const ALLOWED_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/svg+xml', 'image/gif']);

const emit = defineEmits(['file-selected', 'clear']);
const validationError = ref('');

const onFileChange = (e) => {
  const file = e.target.files[0];
  if (!file) return;

  validationError.value = '';

  if (!ALLOWED_MIME.has(file.type)) {
    validationError.value = 'Unsupported type. Use PNG, JPEG, WebP, SVG or GIF.';
    e.target.value = '';
    return;
  }

  if (file.size > props.maxBytes) {
    const mb = (props.maxBytes / 1024 / 1024).toFixed(0);
    validationError.value = `File too large. Maximum is ${mb}MB.`;
    e.target.value = '';
    return;
  }

  emit('file-selected', file);
};
</script>
