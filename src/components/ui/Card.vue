<template>
  <div class="bg-white border border-outline rounded-card p-5 mb-4">
    <div v-if="title" class="text-sm font-semibold text-on-surface mb-4 pb-3 border-b border-outline">
      {{ title }}
    </div>
    <slot />
  </div>
</template>

<script setup>
defineProps({ title: String });
</script>
