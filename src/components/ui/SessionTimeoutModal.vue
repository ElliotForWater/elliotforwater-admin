<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 text-center">
        <div class="text-4xl mb-3">⏱</div>
        <h2 class="text-[18px] font-bold text-on-surface mb-1">Session expiring soon</h2>
        <p class="text-[13px] text-on-surface-variant mb-5">
          You'll be signed out in <strong class="text-error">{{ formattedTime }}</strong> due to inactivity.
        </p>
        <div class="flex flex-col gap-2">
          <button class="btn-primary w-full" @click="$emit('extend')">Stay signed in</button>
          <button
            class="w-full py-2 px-4 rounded-lg border border-outline text-[13px] text-on-surface-variant cursor-pointer hover:border-error hover:text-error transition-colors"
            @click="$emit('logout')"
          >Sign out now</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue';

const props = defineProps({
  timeRemaining: { type: Number, required: true },
});

defineEmits(['extend', 'logout']);

const localTime = ref(props.timeRemaining);

const formattedTime = computed(() => {
  const totalSeconds = Math.ceil(localTime.value / 1000);
  const m = Math.floor(totalSeconds / 60);
  const s = totalSeconds % 60;
  return m > 0 ? `${m}m ${s}s` : `${s}s`;
});

const countdown = setInterval(() => {
  localTime.value = Math.max(0, localTime.value - 1000);
}, 1000);

onMounted(() => { localTime.value = props.timeRemaining; });
onUnmounted(() => clearInterval(countdown));
</script>
