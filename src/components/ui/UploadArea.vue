<template>
  <div>
    <div v-if="previewUrl" class="relative">
      <img :src="previewUrl" :class="['w-full h-36 rounded-card border border-outline bg-surface', cover ? 'object-cover' : 'object-contain']" :alt="label" />
      <button
        class="absolute top-2 right-2 bg-black/55 text-white border-none rounded-full w-6 h-6 text-base cursor-pointer flex items-center justify-center"
        @click.prevent="$emit('clear')"
      >×</button>
    </div>
    <label v-else class="block border-2 border-dashed border-outline rounded-card p-6 text-center cursor-pointer transition-colors hover:border-primary hover:bg-primary-light">
      <input type="file" :accept="accept" class="hidden" @change="onFileChange" />
      <div class="text-3xl mb-1.5">{{ icon }}</div>
      <div class="text-xs text-on-surface-variant">
        <strong class="text-primary">Click to upload</strong><br />{{ hint }}
      </div>
    </label>
    <p v-if="uploading" class="text-xs text-primary text-center mt-1.5">Uploading…</p>
  </div>
</template>

<script setup>
defineProps({
  previewUrl: String,
  accept: { type: String, default: 'image/*' },
  icon: { type: String, default: '🖼️' },
  hint: String,
  label: String,
  cover: Boolean,
  uploading: Boolean,
});

const emit = defineEmits(['file-selected', 'clear']);

const onFileChange = (e) => {
  const file = e.target.files[0];
  if (file) emit('file-selected', file);
};
</script>
