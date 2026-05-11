<template>
  <Teleport to="body">
    <div class="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div class="bg-white rounded-2xl shadow-xl p-8 w-full max-w-sm mx-4 text-center">
        <h2 class="text-[18px] font-bold text-on-surface mb-1">Sign out?</h2>
        <p class="text-[13px] text-on-surface-variant mb-6">Your session will be cleared and you'll be returned to the login screen.</p>
        <div class="flex gap-2">
          <button
            class="flex-1 py-2 px-4 rounded-lg border border-outline text-[13px] text-on-surface-variant cursor-pointer hover:bg-surface transition-colors"
            @click="$emit('cancel')"
          >Cancel</button>
          <button class="flex-1 btn-primary" @click="$emit('confirm')">Sign out</button>
        </div>
      </div>
    </div>
  </Teleport>
</template>

<script setup>
defineEmits(['confirm', 'cancel']);
</script>
