<template>
  <Transition name="fade">
    <div v-if="status" :class="statusClass" class="mx-9 mt-4 px-4 py-2.5 rounded-card text-sm font-medium border">
      {{ status.message }}
    </div>
  </Transition>
</template>

<script setup>
import { computed } from 'vue';
import { useStore } from 'vuex';

const store = useStore();
const status = computed(() => store.state.status);

const statusClass = computed(() => {
  if (!status.value) return '';
  return status.value.type === 'success'
    ? 'bg-success-bg text-success-color border-[#b2dfbc]'
    : 'bg-[#fdecea] text-error border-[#f5c6c8]';
});
</script>

<style scoped>
.fade-enter-active, .fade-leave-active { transition: opacity 0.3s; }
.fade-enter-from, .fade-leave-to { opacity: 0; }
</style>
