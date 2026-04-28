<template>
  <div class="min-h-screen">
    <!-- Sidebar overlay (mobile) -->
    <div v-if="sidebarOpen" class="fixed inset-0 bg-black/30 z-[99] md:hidden" @click="sidebarOpen = false"></div>

    <div class="flex min-h-screen">
      <Sidebar :open="sidebarOpen" @close="sidebarOpen = false" />

      <!-- Main -->
      <div class="flex-1 flex flex-col min-h-screen md:ml-60">
        <!-- Mobile header -->
        <div class="flex md:hidden items-center justify-between px-4 py-3.5 bg-primary text-white sticky top-0 z-[99]">
          <span class="text-[15px] font-bold">Elliot Admin</span>
          <button class="bg-transparent border-none text-white text-2xl cursor-pointer leading-none" @click="sidebarOpen = true">☰</button>
        </div>

        <StatusBar />

        <!-- Sections -->
        <BrandingSection v-if="currentSection === 'branding'" />
        <LinksSection v-else-if="currentSection === 'links'" />
        <WidgetsSection v-else-if="currentSection === 'widgets'" />
        <NotificationsSection v-else-if="currentSection === 'notifications'" />
        <TeamSection v-else-if="currentSection === 'team'" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed } from 'vue';
import { useStore } from 'vuex';
import Sidebar from '@/components/Sidebar.vue';
import StatusBar from '@/components/ui/StatusBar.vue';
import BrandingSection from '@/components/sections/BrandingSection.vue';
import LinksSection from '@/components/sections/LinksSection.vue';
import NotificationsSection from '@/components/sections/NotificationsSection.vue';
import TeamSection from '@/components/sections/TeamSection.vue';
import WidgetsSection from '@/components/sections/WidgetsSection.vue';

const store = useStore();
const currentSection = computed(() => store.state.currentSection);
const sidebarOpen = ref(false);
</script>
